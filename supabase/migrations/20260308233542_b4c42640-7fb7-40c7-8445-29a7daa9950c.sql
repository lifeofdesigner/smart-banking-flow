
-- Expand account_type check constraint to support loan accounts
ALTER TABLE public.accounts DROP CONSTRAINT accounts_account_type_check;
ALTER TABLE public.accounts ADD CONSTRAINT accounts_account_type_check 
  CHECK (account_type = ANY (ARRAY['savings', 'current', 'fixed_deposit', 'checking', 'system', 'loan_disbursement', 'loan_repayment']));

-- Insert bank loan disbursement account
INSERT INTO public.accounts (account_number, account_type, account_type_id, user_id, balance, available_balance, ledger_balance, status)
SELECT 
  '9990000001', 'loan_disbursement', at.id, NULL, 1000000, 1000000, 1000000, 'active'
FROM public.account_types at
WHERE at.name = 'Loan Disbursement'
AND NOT EXISTS (SELECT 1 FROM public.accounts WHERE account_number = '9990000001');

-- Insert loan repayment collection account
INSERT INTO public.accounts (account_number, account_type, account_type_id, user_id, balance, available_balance, ledger_balance, status)
SELECT 
  '9990000002', 'loan_repayment', at.id, NULL, 0, 0, 0, 'active'
FROM public.account_types at
WHERE at.name = 'Loan Repayment Collection'
AND NOT EXISTS (SELECT 1 FROM public.accounts WHERE account_number = '9990000002');

-- Function: Approve loan and disburse funds
CREATE OR REPLACE FUNCTION public.approve_loan(p_loan_id uuid, p_admin_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_loan record;
  v_bank_account_id uuid;
  v_txn_id uuid;
  v_monthly numeric;
  v_principal_portion numeric;
  v_interest_portion numeric;
  v_balance numeric;
  i integer;
BEGIN
  IF NOT has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve loans';
  END IF;

  SELECT * INTO v_loan FROM loans WHERE id = p_loan_id FOR UPDATE;
  IF v_loan IS NULL THEN RAISE EXCEPTION 'Loan not found'; END IF;
  IF v_loan.status != 'pending' THEN RAISE EXCEPTION 'Loan is not in pending status'; END IF;

  SELECT id INTO v_bank_account_id FROM accounts WHERE account_number = '9990000001';
  IF v_bank_account_id IS NULL THEN RAISE EXCEPTION 'Bank loan disbursement account not found'; END IF;

  v_txn_id := execute_transaction(
    v_bank_account_id, v_loan.disbursement_account_id, v_loan.principal,
    'loan_disbursement', 'Loan disbursement - ' || v_loan.id::text, p_admin_id
  );

  UPDATE loans SET status = 'active', approved_at = now(), approved_by = p_admin_id WHERE id = p_loan_id;

  v_monthly := v_loan.monthly_payment;
  v_balance := v_loan.principal;

  FOR i IN 1..v_loan.term_months LOOP
    v_interest_portion := ROUND(v_balance * (v_loan.interest_rate / 100 / 12), 2);
    v_principal_portion := ROUND(v_monthly - v_interest_portion, 2);
    IF i = v_loan.term_months THEN
      v_principal_portion := v_balance;
      v_monthly := v_principal_portion + v_interest_portion;
    END IF;

    INSERT INTO loan_repayments (loan_id, installment_number, amount_due, principal_portion, interest_portion, due_date, status)
    VALUES (p_loan_id, i, v_monthly, v_principal_portion, v_interest_portion,
      (CURRENT_DATE + (i || ' months')::interval)::date, 'pending');

    v_balance := v_balance - v_principal_portion;
    IF v_balance < 0 THEN v_balance := 0; END IF;
  END LOOP;

  INSERT INTO notifications (user_id, type, title, message)
  VALUES (v_loan.user_id, 'loan_approved', 'Loan Approved', 
    'Your loan of $' || v_loan.principal || ' has been approved and disbursed.');

  RETURN 'Loan approved and $' || v_loan.principal || ' disbursed successfully';
END;
$$;

-- Function: Reject loan
CREATE OR REPLACE FUNCTION public.reject_loan(p_loan_id uuid, p_admin_id uuid, p_reason text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_loan record;
BEGIN
  IF NOT has_role(p_admin_id, 'admin') THEN RAISE EXCEPTION 'Only admins can reject loans'; END IF;
  SELECT * INTO v_loan FROM loans WHERE id = p_loan_id FOR UPDATE;
  IF v_loan IS NULL THEN RAISE EXCEPTION 'Loan not found'; END IF;
  IF v_loan.status != 'pending' THEN RAISE EXCEPTION 'Loan is not in pending status'; END IF;

  UPDATE loans SET status = 'rejected', rejection_reason = p_reason WHERE id = p_loan_id;
  INSERT INTO notifications (user_id, type, title, message)
  VALUES (v_loan.user_id, 'loan_rejected', 'Loan Rejected', 'Your loan was rejected. Reason: ' || p_reason);
  RETURN 'Loan rejected';
END;
$$;

-- Function: Make loan repayment
CREATE OR REPLACE FUNCTION public.make_loan_repayment(p_repayment_id uuid, p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_repayment record;
  v_loan record;
  v_collection_account_id uuid;
  v_txn_id uuid;
  v_all_paid boolean;
  v_kyc text;
BEGIN
  PERFORM check_rate_limit(p_user_id, 'loan_repayment', 10, 900);

  SELECT * INTO v_repayment FROM loan_repayments WHERE id = p_repayment_id FOR UPDATE;
  IF v_repayment IS NULL THEN RAISE EXCEPTION 'Repayment not found'; END IF;
  IF v_repayment.status != 'pending' THEN RAISE EXCEPTION 'Repayment is not pending'; END IF;

  SELECT * INTO v_loan FROM loans WHERE id = v_repayment.loan_id;
  IF v_loan.user_id != p_user_id THEN RAISE EXCEPTION 'You do not own this loan'; END IF;

  SELECT kyc_status INTO v_kyc FROM profiles WHERE id = p_user_id;
  IF v_kyc IS NULL OR v_kyc != 'approved' THEN RAISE EXCEPTION 'KYC verification required'; END IF;

  SELECT id INTO v_collection_account_id FROM accounts WHERE account_number = '9990000002';

  v_txn_id := execute_transaction(
    v_loan.disbursement_account_id, v_collection_account_id, v_repayment.amount_due,
    'loan_repayment', 'Loan repayment #' || v_repayment.installment_number, p_user_id
  );

  UPDATE loan_repayments SET status = 'paid', amount_paid = amount_due, paid_at = now() WHERE id = p_repayment_id;

  SELECT NOT EXISTS (
    SELECT 1 FROM loan_repayments WHERE loan_id = v_loan.id AND status = 'pending'
  ) INTO v_all_paid;

  IF v_all_paid THEN
    UPDATE loans SET status = 'completed' WHERE id = v_loan.id;
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (p_user_id, 'loan_completed', 'Loan Completed', 'Congratulations! Your loan has been fully repaid.');
  END IF;

  RETURN 'Repayment of $' || v_repayment.amount_due || ' processed successfully';
END;
$$;
