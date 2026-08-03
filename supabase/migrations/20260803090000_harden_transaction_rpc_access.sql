-- execute_transaction is the shared engine behind nearly every money-moving
-- RPC, but it has never had its own access control: it's directly callable
-- by any authenticated (and even anon) browser client, and it trusts a
-- caller-supplied p_user_id with no ownership check on the accounts
-- involved. A client could call it directly with someone else's account ids
-- and drain the account. It must only be reachable through the SECURITY
-- DEFINER wrapper RPCs (transfer_between_accounts, pay_bill, etc.), which
-- run as the table owner and are therefore unaffected by this revoke.
REVOKE ALL ON FUNCTION public.execute_transaction(uuid, uuid, numeric, text, text, uuid)
  FROM PUBLIC, anon, authenticated;

-- make_loan_repayment has the same shape of bug: it trusts a caller-supplied
-- p_user_id end-to-end (ownership check, KYC check, and the transaction's
-- attributed user all key off the parameter, never auth.uid()), so any
-- authenticated user could repay someone else's loan by passing that
-- person's id. Rewritten to derive the acting user from auth.uid(), the
-- same way transfer_between_accounts already does.
CREATE OR REPLACE FUNCTION public.make_loan_repayment(p_repayment_id uuid, p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_repayment record;
  v_loan record;
  v_account_status text;
  v_collection_account_id uuid;
  v_txn_id uuid;
  v_all_paid boolean;
  v_kyc text;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  PERFORM check_rate_limit(v_user_id, 'loan_repayment', 10, 900);

  SELECT * INTO v_repayment FROM loan_repayments WHERE id = p_repayment_id FOR UPDATE;
  IF v_repayment IS NULL THEN RAISE EXCEPTION 'Repayment not found'; END IF;
  IF v_repayment.status != 'pending' THEN RAISE EXCEPTION 'Repayment is not pending'; END IF;

  SELECT * INTO v_loan FROM loans WHERE id = v_repayment.loan_id;
  IF v_loan.user_id != v_user_id THEN RAISE EXCEPTION 'You do not own this loan'; END IF;

  SELECT kyc_status INTO v_kyc FROM profiles WHERE id = v_user_id;
  IF v_kyc IS NULL OR v_kyc != 'approved' THEN RAISE EXCEPTION 'KYC verification required'; END IF;

  SELECT status INTO v_account_status FROM accounts WHERE id = v_loan.disbursement_account_id;
  IF v_account_status IS NULL OR v_account_status != 'active' THEN
    RAISE EXCEPTION 'Your account is not active (status: %). Loan repayments are unavailable.', COALESCE(v_account_status, 'unknown');
  END IF;

  SELECT id INTO v_collection_account_id FROM accounts WHERE account_number = '9990000002';

  v_txn_id := execute_transaction(
    v_loan.disbursement_account_id, v_collection_account_id, v_repayment.amount_due,
    'loan_repayment', 'Loan repayment #' || v_repayment.installment_number, v_user_id
  );

  UPDATE loan_repayments SET status = 'paid', amount_paid = amount_due, paid_at = now() WHERE id = p_repayment_id;

  SELECT NOT EXISTS (
    SELECT 1 FROM loan_repayments WHERE loan_id = v_loan.id AND status = 'pending'
  ) INTO v_all_paid;

  IF v_all_paid THEN
    UPDATE loans SET status = 'completed' WHERE id = v_loan.id;
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (v_user_id, 'loan_completed', 'Loan Completed', 'Congratulations! Your loan has been fully repaid.');
  END IF;

  RETURN 'Repayment of $' || v_repayment.amount_due || ' processed successfully';
END;
$function$;
