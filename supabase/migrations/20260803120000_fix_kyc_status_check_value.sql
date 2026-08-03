-- transfer_between_accounts and make_loan_repayment both gated on
-- kyc_status = 'approved', a value that has never existed in this schema:
-- profiles.kyc_status's own check constraint only allows
-- 'pending'/'verified'/'rejected', and the admin KYC review dropdown
-- (src/components/admin/AdminUsersTab.tsx) only ever writes one of those
-- three. The result: every transfer and loan repayment unconditionally
-- failed KYC for every user, verified or not. 'verified' is the real
-- terminal "may transact" status.
CREATE OR REPLACE FUNCTION public.transfer_between_accounts(p_from_account uuid, p_to_account uuid, p_amount numeric, p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_owner uuid;
  v_from_status text;
  v_txn_id uuid;
  v_per_tx_limit numeric;
  v_daily_limit numeric;
  v_daily_usage numeric;
  v_reason text;
  v_kyc_status text;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  PERFORM check_rate_limit(v_user_id, 'transfer', 20, 900);

  SELECT kyc_status INTO v_kyc_status FROM profiles WHERE id = v_user_id;
  IF v_kyc_status IS NULL OR v_kyc_status != 'verified' THEN
    v_reason := 'KYC verification required before making transfers. Current status: ' || COALESCE(v_kyc_status, 'not submitted');
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (v_user_id, 'transfer_failed', 'Transfer Failed', v_reason);
    RAISE EXCEPTION '%', v_reason;
  END IF;

  SELECT user_id, status INTO v_owner, v_from_status FROM accounts WHERE id = p_from_account;
  IF v_owner IS NULL OR v_owner != v_user_id THEN
    v_reason := 'You do not own the source account';
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (v_user_id, 'transfer_failed', 'Transfer Failed', v_reason);
    RAISE EXCEPTION '%', v_reason;
  END IF;

  IF v_from_status != 'active' THEN
    v_reason := 'Your account is not active (status: ' || v_from_status || '). Transfers are unavailable.';
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (v_user_id, 'transfer_failed', 'Transfer Failed', v_reason);
    RAISE EXCEPTION '%', v_reason;
  END IF;

  SELECT per_transaction_limit, daily_limit
  INTO v_per_tx_limit, v_daily_limit
  FROM transfer_limits
  WHERE account_id = p_from_account;

  IF FOUND THEN
    IF p_amount > v_per_tx_limit THEN
      v_reason := 'Transfer amount $' || p_amount || ' exceeds per-transaction limit of $' || v_per_tx_limit;
      INSERT INTO notifications (user_id, type, title, message)
      VALUES (v_user_id, 'transfer_failed', 'Transfer Failed', v_reason);
      RAISE EXCEPTION '%', v_reason;
    END IF;

    v_daily_usage := public.get_daily_transfer_usage(p_from_account);
    IF v_daily_usage + p_amount > v_daily_limit THEN
      v_reason := 'Transfer would exceed daily limit. Used: $' || v_daily_usage || ', Limit: $' || v_daily_limit || ', Remaining: $' || (v_daily_limit - v_daily_usage);
      INSERT INTO notifications (user_id, type, title, message)
      VALUES (v_user_id, 'transfer_failed', 'Transfer Failed', v_reason);
      RAISE EXCEPTION '%', v_reason;
    END IF;
  END IF;

  v_txn_id := public.execute_transaction(
    p_from_account,
    p_to_account,
    p_amount,
    'transfer',
    'Internal transfer between accounts',
    v_user_id
  );

  RETURN v_txn_id;
END;
$function$;

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
  IF v_kyc IS NULL OR v_kyc != 'verified' THEN RAISE EXCEPTION 'KYC verification required'; END IF;

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
