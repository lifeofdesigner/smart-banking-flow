
-- ==========================================
-- RATE LIMITING SYSTEM
-- ==========================================

CREATE TABLE public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- One active window per user+action
CREATE UNIQUE INDEX idx_rate_limits_user_action ON public.api_rate_limits (user_id, action);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only backend/admin can read rate limits
CREATE POLICY "Admins can view rate limits"
  ON public.api_rate_limits FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Rate limit check function
-- Returns true if allowed, raises exception if blocked
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid,
  p_action text,
  p_max_requests integer DEFAULT 10,
  p_window_seconds integer DEFAULT 900
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row record;
  v_window_start timestamptz;
BEGIN
  v_window_start := now() - (p_window_seconds || ' seconds')::interval;

  SELECT * INTO v_row
  FROM api_rate_limits
  WHERE user_id = p_user_id AND action = p_action
  FOR UPDATE;

  IF v_row IS NULL THEN
    -- First request for this action
    INSERT INTO api_rate_limits (user_id, action, request_count, window_start)
    VALUES (p_user_id, p_action, 1, now())
    ON CONFLICT (user_id, action) DO UPDATE
      SET request_count = 1, window_start = now();
    RETURN true;
  END IF;

  -- If window has expired, reset
  IF v_row.window_start < v_window_start THEN
    UPDATE api_rate_limits
    SET request_count = 1, window_start = now()
    WHERE id = v_row.id;
    RETURN true;
  END IF;

  -- Check if over limit
  IF v_row.request_count >= p_max_requests THEN
    RAISE EXCEPTION 'Rate limit exceeded for action: %. Please try again later.', p_action;
  END IF;

  -- Increment
  UPDATE api_rate_limits
  SET request_count = request_count + 1
  WHERE id = v_row.id;

  RETURN true;
END;
$$;

-- ==========================================
-- EXTEND AUDIT LOGS
-- ==========================================

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text;

-- ==========================================
-- UPDATE transfer_between_accounts with rate limiting
-- ==========================================

CREATE OR REPLACE FUNCTION public.transfer_between_accounts(
  p_from_account uuid,
  p_to_account uuid,
  p_amount numeric,
  p_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner uuid;
  v_txn_id uuid;
  v_per_tx_limit numeric;
  v_daily_limit numeric;
  v_daily_usage numeric;
  v_reason text;
BEGIN
  -- Rate limit: max 20 transfers per 15 minutes
  PERFORM check_rate_limit(p_user_id, 'transfer', 20, 900);

  -- Verify caller owns the source account
  SELECT user_id INTO v_owner FROM accounts WHERE id = p_from_account;
  IF v_owner IS NULL OR v_owner != p_user_id THEN
    v_reason := 'You do not own the source account';
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (p_user_id, 'transfer_failed', 'Transfer Failed', v_reason);
    RAISE EXCEPTION '%', v_reason;
  END IF;

  -- Check transfer limits
  SELECT per_transaction_limit, daily_limit
  INTO v_per_tx_limit, v_daily_limit
  FROM transfer_limits
  WHERE account_id = p_from_account;

  IF FOUND THEN
    IF p_amount > v_per_tx_limit THEN
      v_reason := 'Transfer amount $' || p_amount || ' exceeds per-transaction limit of $' || v_per_tx_limit;
      INSERT INTO notifications (user_id, type, title, message)
      VALUES (p_user_id, 'transfer_failed', 'Transfer Failed', v_reason);
      RAISE EXCEPTION '%', v_reason;
    END IF;

    v_daily_usage := public.get_daily_transfer_usage(p_from_account);
    IF v_daily_usage + p_amount > v_daily_limit THEN
      v_reason := 'Transfer would exceed daily limit. Used: $' || v_daily_usage || ', Limit: $' || v_daily_limit || ', Remaining: $' || (v_daily_limit - v_daily_usage);
      INSERT INTO notifications (user_id, type, title, message)
      VALUES (p_user_id, 'transfer_failed', 'Transfer Failed', v_reason);
      RAISE EXCEPTION '%', v_reason;
    END IF;
  END IF;

  -- Execute via core engine
  v_txn_id := public.execute_transaction(
    p_from_account,
    p_to_account,
    p_amount,
    'transfer',
    'Internal transfer between accounts',
    p_user_id
  );

  RETURN v_txn_id;
END;
$$;

-- ==========================================
-- UPDATE verify_wire_transfer_code with rate limiting
-- ==========================================

CREATE OR REPLACE FUNCTION public.verify_wire_transfer_code(
  p_wire_transfer_id uuid,
  p_code_type text,
  p_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code_row record;
  v_hashed text;
  v_user_id uuid;
BEGIN
  -- Get user_id from the wire transfer for rate limiting
  SELECT user_id INTO v_user_id
  FROM wire_transfers
  WHERE id = p_wire_transfer_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Wire transfer not found';
  END IF;

  -- Rate limit: max 10 verification attempts per 15 minutes
  PERFORM check_rate_limit(v_user_id, 'wire_verify', 10, 900);

  -- Hash the submitted code
  v_hashed := encode(digest(p_code, 'sha256'), 'hex');

  -- Find the matching code record
  SELECT id, code_value, is_verified, attempts
  INTO v_code_row
  FROM wire_transfer_codes
  WHERE wire_transfer_id = p_wire_transfer_id
    AND code_type = p_code_type
  LIMIT 1;

  IF v_code_row IS NULL THEN
    RAISE EXCEPTION 'Code not found for this transfer and type';
  END IF;

  IF v_code_row.is_verified = true THEN
    RAISE EXCEPTION 'Code already verified';
  END IF;

  IF v_code_row.attempts >= 3 THEN
    RAISE EXCEPTION 'Maximum verification attempts exceeded. Code is locked.';
  END IF;

  -- Increment attempts
  UPDATE wire_transfer_codes
  SET attempts = attempts + 1
  WHERE id = v_code_row.id;

  -- Compare hashes
  IF v_code_row.code_value = v_hashed THEN
    UPDATE wire_transfer_codes
    SET is_verified = true, verified_at = now()
    WHERE id = v_code_row.id;
    RETURN true;
  ELSE
    IF v_code_row.attempts + 1 >= 3 THEN
      RAISE EXCEPTION 'Incorrect code. Maximum attempts reached. Code is now locked.';
    END IF;
    RAISE EXCEPTION 'Incorrect code. % attempt(s) remaining.', (3 - v_code_row.attempts - 1);
  END IF;
END;
$$;
