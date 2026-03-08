
-- 1. Create transfer_limits table
CREATE TABLE public.transfer_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  daily_limit numeric NOT NULL DEFAULT 5000,
  per_transaction_limit numeric NOT NULL DEFAULT 2000,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(account_id)
);

-- 2. Enable RLS
ALTER TABLE public.transfer_limits ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own limits
CREATE POLICY "Users can view own transfer limits"
  ON public.transfer_limits FOR SELECT
  TO authenticated
  USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

-- RLS: Admins can view all limits
CREATE POLICY "Admins can view all transfer limits"
  ON public.transfer_limits FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Admins can update limits
CREATE POLICY "Admins can update transfer limits"
  ON public.transfer_limits FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Admins can insert limits
CREATE POLICY "Admins can insert transfer limits"
  ON public.transfer_limits FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Trigger to auto-create default limits when an account is created
CREATE OR REPLACE FUNCTION public.handle_new_account_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.transfer_limits (account_id, daily_limit, per_transaction_limit, currency)
  VALUES (NEW.id, 5000, 2000, COALESCE(NEW.currency, 'USD'))
  ON CONFLICT (account_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_account_created_limits
  AFTER INSERT ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_account_limits();

-- 4. Insert default limits for existing accounts that don't have them
INSERT INTO public.transfer_limits (account_id, daily_limit, per_transaction_limit, currency)
SELECT a.id, 5000, 2000, COALESCE(a.currency, 'USD')
FROM public.accounts a
WHERE NOT EXISTS (SELECT 1 FROM public.transfer_limits tl WHERE tl.account_id = a.id);

-- 5. Helper function to get today's transfer usage for an account
CREATE OR REPLACE FUNCTION public.get_daily_transfer_usage(p_account_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(le.amount), 0)
  FROM ledger_entries le
  JOIN transactions t ON t.id = le.transaction_id
  WHERE le.debit_account_id = p_account_id
    AND t.transaction_type = 'transfer'
    AND t.status = 'completed'
    AND le.created_at >= (CURRENT_DATE AT TIME ZONE 'UTC')
$$;

-- 6. Update transfer_between_accounts to check limits
CREATE OR REPLACE FUNCTION public.transfer_between_accounts(p_from_account uuid, p_to_account uuid, p_amount numeric, p_user_id uuid)
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
BEGIN
  -- Verify caller owns the source account
  SELECT user_id INTO v_owner FROM accounts WHERE id = p_from_account;
  IF v_owner IS NULL OR v_owner != p_user_id THEN
    RAISE EXCEPTION 'You do not own the source account';
  END IF;

  -- Check transfer limits
  SELECT per_transaction_limit, daily_limit
  INTO v_per_tx_limit, v_daily_limit
  FROM transfer_limits
  WHERE account_id = p_from_account;

  IF FOUND THEN
    -- Per-transaction limit
    IF p_amount > v_per_tx_limit THEN
      RAISE EXCEPTION 'Transfer amount $% exceeds per-transaction limit of $%', p_amount, v_per_tx_limit;
    END IF;

    -- Daily limit
    v_daily_usage := public.get_daily_transfer_usage(p_from_account);
    IF v_daily_usage + p_amount > v_daily_limit THEN
      RAISE EXCEPTION 'Transfer would exceed daily limit. Used: $%, Limit: $%, Remaining: $%', v_daily_usage, v_daily_limit, (v_daily_limit - v_daily_usage);
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
