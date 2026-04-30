CREATE OR REPLACE FUNCTION public.approve_loan(p_loan_id uuid, p_admin_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_loan record;
  v_bank_account_id uuid;
  v_txn_id uuid;
  v_monthly numeric;
  v_principal_portion numeric;
  v_interest_portion numeric;
  v_balance numeric;
  i integer;
BEGIN
  v_admin_id := auth.uid();

  IF NOT has_role(v_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve loans';
  END IF;

  SELECT * INTO v_loan FROM loans WHERE id = p_loan_id FOR UPDATE;
  IF v_loan IS NULL THEN RAISE EXCEPTION 'Loan not found'; END IF;
  IF v_loan.status != 'pending' THEN RAISE EXCEPTION 'Loan is not in pending status'; END IF;

  SELECT id INTO v_bank_account_id FROM accounts WHERE account_number = '9990000001';
  IF v_bank_account_id IS NULL THEN RAISE EXCEPTION 'Bank loan disbursement account not found'; END IF;

  v_txn_id := execute_transaction(
    v_bank_account_id, v_loan.disbursement_account_id, v_loan.principal,
    'loan_disbursement', 'Loan disbursement - ' || v_loan.id::text, v_admin_id
  );

  UPDATE loans SET status = 'active', approved_at = now(), approved_by = v_admin_id WHERE id = p_loan_id;

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
