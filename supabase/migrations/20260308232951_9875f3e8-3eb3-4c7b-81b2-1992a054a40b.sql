
-- ==========================================
-- KYC SUBMISSIONS TABLE
-- ==========================================

CREATE TABLE public.kyc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  document_type text NOT NULL DEFAULT 'national_id',
  document_url text,
  selfie_url text,
  address_document_url text,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid
);

CREATE INDEX idx_kyc_user_id ON public.kyc_submissions (user_id);
CREATE INDEX idx_kyc_status ON public.kyc_submissions (status);

ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own submissions
CREATE POLICY "Users can view own kyc submissions"
  ON public.kyc_submissions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own submissions
CREATE POLICY "Users can insert own kyc submissions"
  ON public.kyc_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all kyc submissions"
  ON public.kyc_submissions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update (approve/reject)
CREATE POLICY "Admins can update kyc submissions"
  ON public.kyc_submissions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ==========================================
-- KYC STORAGE BUCKET
-- ==========================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Users can upload to their own folder
CREATE POLICY "Users can upload own kyc docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can view their own files
CREATE POLICY "Users can view own kyc docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can view all kyc docs
CREATE POLICY "Admins can view all kyc docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyc-documents'
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- ==========================================
-- SYNC KYC STATUS TO PROFILES
-- ==========================================

CREATE OR REPLACE FUNCTION public.sync_kyc_status_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('approved', 'rejected', 'pending', 'under_review') THEN
    UPDATE profiles
    SET kyc_status = NEW.status, updated_at = now()
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_kyc_status ON public.kyc_submissions;
CREATE TRIGGER trg_sync_kyc_status
  AFTER INSERT OR UPDATE OF status ON public.kyc_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_kyc_status_to_profile();

-- ==========================================
-- ENFORCE KYC ON TRANSFERS
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
  v_kyc_status text;
BEGIN
  -- Rate limit
  PERFORM check_rate_limit(p_user_id, 'transfer', 20, 900);

  -- KYC check
  SELECT kyc_status INTO v_kyc_status FROM profiles WHERE id = p_user_id;
  IF v_kyc_status IS NULL OR v_kyc_status != 'approved' THEN
    v_reason := 'KYC verification required before making transfers. Current status: ' || COALESCE(v_kyc_status, 'not submitted');
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (p_user_id, 'transfer_failed', 'Transfer Failed', v_reason);
    RAISE EXCEPTION '%', v_reason;
  END IF;

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
