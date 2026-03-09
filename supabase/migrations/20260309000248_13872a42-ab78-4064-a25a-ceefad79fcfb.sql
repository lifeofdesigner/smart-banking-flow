
-- ================================================
-- BANKING FEE ENGINE
-- ================================================

-- 1. Create fee_rules table
CREATE TABLE IF NOT EXISTS public.fee_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type text NOT NULL,
  fee_type text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  is_active boolean NOT NULL DEFAULT true,
  description text,
  min_fee numeric DEFAULT NULL,
  max_fee numeric DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fee_type_valid CHECK (fee_type IN ('fixed', 'percentage')),
  CONSTRAINT amount_non_negative CHECK (amount >= 0)
);

-- 2. Enable RLS
ALTER TABLE public.fee_rules ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Admins can manage fee rules"
  ON public.fee_rules
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view active fee rules"
  ON public.fee_rules
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- 4. Index for fast lookup by type
CREATE INDEX IF NOT EXISTS idx_fee_rules_type_active
  ON public.fee_rules (transaction_type, is_active);

-- 5. Auto-update timestamp trigger
CREATE TRIGGER update_fee_rules_updated_at
  BEFORE UPDATE ON public.fee_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Seed default fee rules
INSERT INTO public.fee_rules (transaction_type, fee_type, amount, currency, description, min_fee, max_fee, is_active)
VALUES
  ('transfer', 'fixed', 1.50, 'USD', 'Internal transfer processing fee', NULL, NULL, true),
  ('wire_transfer', 'percentage', 1.00, 'USD', 'International wire transfer fee (1%)', 10.00, 100.00, true),
  ('loan_repayment', 'fixed', 2.00, 'USD', 'Loan repayment processing fee', NULL, NULL, true),
  ('maintenance', 'fixed', 5.00, 'USD', 'Monthly account maintenance fee (manual process)', NULL, NULL, false);

-- 7. Update execute_transaction to auto-apply fee rules
CREATE OR REPLACE FUNCTION public.execute_transaction(
  p_debit_account uuid,
  p_credit_account uuid,
  p_amount numeric,
  p_transaction_type text,
  p_description text,
  p_user_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id uuid;
  v_fee_transaction_id uuid;
  v_balance numeric;
  v_debit_status text;
  v_credit_status text;
  v_ref text;
  v_fee_ref text;
  v_fee_rule record;
  v_fee_amount numeric := 0;
  v_revenue_account_id uuid;
BEGIN
  -- Validate inputs
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Transaction amount must be greater than zero';
  END IF;
  IF p_debit_account = p_credit_account THEN
    RAISE EXCEPTION 'Debit and credit accounts cannot be the same';
  END IF;

  -- Lock accounts (ordered by id to prevent deadlocks)
  IF p_debit_account < p_credit_account THEN
    PERFORM 1 FROM accounts WHERE id = p_debit_account FOR UPDATE;
    PERFORM 1 FROM accounts WHERE id = p_credit_account FOR UPDATE;
  ELSE
    PERFORM 1 FROM accounts WHERE id = p_credit_account FOR UPDATE;
    PERFORM 1 FROM accounts WHERE id = p_debit_account FOR UPDATE;
  END IF;

  -- Verify account statuses
  SELECT status INTO v_debit_status FROM accounts WHERE id = p_debit_account;
  SELECT status INTO v_credit_status FROM accounts WHERE id = p_credit_account;

  IF v_debit_status IS NULL THEN RAISE EXCEPTION 'Debit account not found'; END IF;
  IF v_credit_status IS NULL THEN RAISE EXCEPTION 'Credit account not found'; END IF;
  IF v_debit_status != 'active' THEN RAISE EXCEPTION 'Debit account is not active (status: %)', v_debit_status; END IF;
  IF v_credit_status != 'active' THEN RAISE EXCEPTION 'Credit account is not active (status: %)', v_credit_status; END IF;

  -- Look up applicable fee rule (skip for internal system transaction types)
  IF p_transaction_type NOT IN ('fee', 'loan_disbursement', 'system') THEN
    SELECT * INTO v_fee_rule
    FROM public.fee_rules
    WHERE transaction_type = p_transaction_type
      AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND AND v_fee_rule.amount > 0 THEN
      IF v_fee_rule.fee_type = 'fixed' THEN
        v_fee_amount := v_fee_rule.amount;
      ELSIF v_fee_rule.fee_type = 'percentage' THEN
        v_fee_amount := ROUND(p_amount * (v_fee_rule.amount / 100.0), 2);
        IF v_fee_rule.min_fee IS NOT NULL AND v_fee_amount < v_fee_rule.min_fee THEN
          v_fee_amount := v_fee_rule.min_fee;
        END IF;
        IF v_fee_rule.max_fee IS NOT NULL AND v_fee_amount > v_fee_rule.max_fee THEN
          v_fee_amount := v_fee_rule.max_fee;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Check sufficient balance including fee
  v_balance := public.get_account_balance(p_debit_account);
  IF v_balance < (p_amount + v_fee_amount) THEN
    IF v_fee_amount > 0 THEN
      RAISE EXCEPTION 'Insufficient balance. Available: $%, Required: $% (amount $% + fee $%)',
        v_balance, (p_amount + v_fee_amount), p_amount, v_fee_amount;
    ELSE
      RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %', v_balance, p_amount;
    END IF;
  END IF;

  -- Generate reference number
  v_ref := 'TXN-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Insert main transaction record
  INSERT INTO transactions (account_id, amount, transaction_type, description, reference_number, status)
  VALUES (p_debit_account, p_amount, p_transaction_type, p_description, v_ref, 'completed')
  RETURNING id INTO v_transaction_id;

  -- Insert double-entry ledger record
  INSERT INTO ledger_entries (transaction_id, debit_account_id, credit_account_id, amount, description)
  VALUES (v_transaction_id, p_debit_account, p_credit_account, p_amount, p_description);

  -- Process fee if applicable
  IF v_fee_amount > 0 THEN
    SELECT id INTO v_revenue_account_id
    FROM accounts
    WHERE account_number = '9990000003' AND status = 'active'
    LIMIT 1;

    IF v_revenue_account_id IS NOT NULL THEN
      v_fee_ref := 'FEE-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);

      INSERT INTO transactions (account_id, amount, transaction_type, description, reference_number, status)
      VALUES (p_debit_account, v_fee_amount, 'fee',
        'Transaction fee for ' || p_transaction_type || ' (' || v_ref || ')',
        v_fee_ref, 'completed')
      RETURNING id INTO v_fee_transaction_id;

      INSERT INTO ledger_entries (transaction_id, debit_account_id, credit_account_id, amount, description)
      VALUES (v_fee_transaction_id, p_debit_account, v_revenue_account_id, v_fee_amount,
        'Fee: ' || p_transaction_type);
    END IF;
  END IF;

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
      'reference_number', v_ref,
      'fee_amount', v_fee_amount
    )
  );

  RETURN v_transaction_id;
END;
$$;
