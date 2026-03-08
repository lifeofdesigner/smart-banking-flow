
-- =====================================================
-- PHASE 2: TRANSACTION EXECUTION ENGINE
-- =====================================================

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  user_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- No direct inserts from clients - only via security definer functions
-- (no INSERT policy = blocked for everyone via RLS)

-- 2. Remove admin INSERT policy on ledger_entries so only SECURITY DEFINER functions can write
DROP POLICY IF EXISTS "Admins can insert ledger entries" ON public.ledger_entries;

-- 3. Create the core execute_transaction function
CREATE OR REPLACE FUNCTION public.execute_transaction(
  p_debit_account uuid,
  p_credit_account uuid,
  p_amount numeric,
  p_transaction_type text,
  p_description text,
  p_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transaction_id uuid;
  v_balance numeric;
  v_debit_status text;
  v_credit_status text;
  v_ref text;
BEGIN
  -- Safety: amount must be positive
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Transaction amount must be greater than zero';
  END IF;

  -- Safety: cannot transfer to same account
  IF p_debit_account = p_credit_account THEN
    RAISE EXCEPTION 'Debit and credit accounts cannot be the same';
  END IF;

  -- Lock both accounts to prevent race conditions (order by id to avoid deadlocks)
  IF p_debit_account < p_credit_account THEN
    PERFORM 1 FROM accounts WHERE id = p_debit_account FOR UPDATE;
    PERFORM 1 FROM accounts WHERE id = p_credit_account FOR UPDATE;
  ELSE
    PERFORM 1 FROM accounts WHERE id = p_credit_account FOR UPDATE;
    PERFORM 1 FROM accounts WHERE id = p_debit_account FOR UPDATE;
  END IF;

  -- Verify both accounts are active
  SELECT status INTO v_debit_status FROM accounts WHERE id = p_debit_account;
  SELECT status INTO v_credit_status FROM accounts WHERE id = p_credit_account;

  IF v_debit_status IS NULL THEN
    RAISE EXCEPTION 'Debit account not found';
  END IF;
  IF v_credit_status IS NULL THEN
    RAISE EXCEPTION 'Credit account not found';
  END IF;
  IF v_debit_status != 'active' THEN
    RAISE EXCEPTION 'Debit account is not active (status: %)', v_debit_status;
  END IF;
  IF v_credit_status != 'active' THEN
    RAISE EXCEPTION 'Credit account is not active (status: %)', v_credit_status;
  END IF;

  -- Check sufficient balance on debit account
  v_balance := public.get_account_balance(p_debit_account);
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %', v_balance, p_amount;
  END IF;

  -- Generate reference number
  v_ref := 'TXN-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Insert transaction record
  INSERT INTO transactions (account_id, amount, transaction_type, description, reference_number, status)
  VALUES (p_debit_account, p_amount, p_transaction_type, p_description, v_ref, 'completed')
  RETURNING id INTO v_transaction_id;

  -- Insert ledger entry (double-entry)
  INSERT INTO ledger_entries (transaction_id, debit_account_id, credit_account_id, amount, description)
  VALUES (v_transaction_id, p_debit_account, p_credit_account, p_amount, p_description);

  -- Audit log
  INSERT INTO audit_logs (action, user_id, metadata)
  VALUES (
    'transaction.execute',
    p_user_id,
    jsonb_build_object(
      'transaction_id', v_transaction_id,
      'debit_account_id', p_debit_account,
      'credit_account_id', p_credit_account,
      'amount', p_amount,
      'transaction_type', p_transaction_type,
      'reference_number', v_ref
    )
  );

  RETURN v_transaction_id;
END;
$$;

-- 4. Create helper: transfer_between_accounts
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
BEGIN
  -- Verify caller owns the source account
  SELECT user_id INTO v_owner FROM accounts WHERE id = p_from_account;
  IF v_owner IS NULL OR v_owner != p_user_id THEN
    RAISE EXCEPTION 'You do not own the source account';
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
