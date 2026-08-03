-- Single source of truth for account-status enforcement on every customer-
-- initiated money-moving or account-modifying action.
--
-- execute_transaction() already rejects non-active debit/credit accounts,
-- so the actual balance movement was never at risk. This migration closes
-- the remaining upstream gaps: RPCs that let a customer walk through an
-- entire multi-step flow (and create real rows) before finally failing at
-- the last step, and direct table writes (loan applications, card
-- unfreezing, beneficiary management) that had no status check at all.

BEGIN;

-- ============================================================================
-- 1. transfer_between_accounts — fail fast on a restricted source account
-- ============================================================================
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
  IF v_kyc_status IS NULL OR v_kyc_status != 'approved' THEN
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

-- ============================================================================
-- 2. pay_bill — fail fast on a restricted account
-- ============================================================================
CREATE OR REPLACE FUNCTION public.pay_bill(p_account_id uuid, p_category text, p_provider text, p_amount numeric, p_reference text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_status text;
  v_revenue_account_id uuid;
  v_txn_id uuid;
  v_bill_id uuid;
BEGIN
  SELECT user_id, status INTO v_user_id, v_status FROM accounts WHERE id = p_account_id;
  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Account not found or not owned by user';
  END IF;
  IF v_status != 'active' THEN
    RAISE EXCEPTION 'Your account is not active (status: %). Bill payments are unavailable.', v_status;
  END IF;

  SELECT id INTO v_revenue_account_id FROM accounts WHERE account_number = '9990000003' AND status = 'active' LIMIT 1;
  IF v_revenue_account_id IS NULL THEN RAISE EXCEPTION 'Bill payment system account not configured'; END IF;

  v_txn_id := public.execute_transaction(
    p_account_id, v_revenue_account_id, p_amount,
    'bill_payment', 'Bill payment: ' || p_provider || ' (' || p_category || ')',
    auth.uid()
  );

  INSERT INTO bill_payments (user_id, account_id, category, provider, reference_number, amount, status, transaction_id)
  VALUES (auth.uid(), p_account_id, p_category, p_provider, COALESCE(p_reference, 'BP-' || substr(gen_random_uuid()::text, 1, 8)), p_amount, 'completed', v_txn_id)
  RETURNING id INTO v_bill_id;

  RETURN v_bill_id;
END;
$function$;

-- ============================================================================
-- 3. request_atm_withdrawal — fail fast on a restricted account
-- ============================================================================
CREATE OR REPLACE FUNCTION public.request_atm_withdrawal(p_account_id uuid, p_amount numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_status text;
  v_balance numeric;
  v_code text;
  v_withdrawal_id uuid;
  v_bank_account_id uuid;
  v_txn_id uuid;
BEGIN
  SELECT user_id, status INTO v_user_id, v_status FROM accounts WHERE id = p_account_id;
  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Account not found or not owned by user';
  END IF;
  IF v_status != 'active' THEN
    RAISE EXCEPTION 'Your account is not active (status: %). Withdrawals are unavailable.', v_status;
  END IF;

  v_balance := public.get_account_balance(p_account_id);
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Available: $%', v_balance;
  END IF;

  IF p_amount <= 0 OR p_amount > 5000 THEN
    RAISE EXCEPTION 'Withdrawal amount must be between $1 and $5,000';
  END IF;

  v_code := LPAD(floor(random() * 1000000)::text, 6, '0');

  SELECT id INTO v_bank_account_id FROM accounts WHERE account_number = '9990000003' AND status = 'active' LIMIT 1;
  IF v_bank_account_id IS NULL THEN RAISE EXCEPTION 'ATM system account not configured'; END IF;

  v_txn_id := public.execute_transaction(
    p_account_id, v_bank_account_id, p_amount,
    'withdrawal', 'ATM withdrawal request', auth.uid()
  );

  INSERT INTO atm_withdrawals (user_id, account_id, amount, withdrawal_code, transaction_id)
  VALUES (auth.uid(), p_account_id, p_amount, v_code, v_txn_id)
  RETURNING id INTO v_withdrawal_id;

  INSERT INTO notifications (user_id, type, title, message)
  VALUES (auth.uid(), 'info', 'ATM Withdrawal Code', 'Your withdrawal code is: ' || v_code || '. Valid for 30 minutes.');

  RETURN jsonb_build_object('withdrawal_id', v_withdrawal_id, 'code', v_code, 'expires_in_minutes', 30);
END;
$function$;

-- ============================================================================
-- 4. make_loan_repayment — fail fast if the disbursement account is restricted
-- ============================================================================
CREATE OR REPLACE FUNCTION public.make_loan_repayment(p_repayment_id uuid, p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_repayment record;
  v_loan record;
  v_account_status text;
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

  SELECT status INTO v_account_status FROM accounts WHERE id = v_loan.disbursement_account_id;
  IF v_account_status IS NULL OR v_account_status != 'active' THEN
    RAISE EXCEPTION 'Your account is not active (status: %). Loan repayments are unavailable.', COALESCE(v_account_status, 'unknown');
  END IF;

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
$function$;

-- ============================================================================
-- 5. initiate_wire_transfer — fail fast instead of letting a restricted
--    account walk through the entire 5-stage code flow before failing
-- ============================================================================
CREATE OR REPLACE FUNCTION public.initiate_wire_transfer(p_user_id uuid, p_account_id uuid, p_beneficiary_name text, p_beneficiary_account text, p_beneficiary_bank text, p_beneficiary_country text, p_swift_code text, p_amount numeric, p_currency text, p_purpose text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_status text;
  v_wire_id uuid;
  v_code text;
  v_types text[] := ARRAY['COT','IMF','TAX','LEVY','FIN'];
  v_type text;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT status INTO v_status FROM accounts WHERE id = p_account_id AND user_id = v_user_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF v_status != 'active' THEN
    RAISE EXCEPTION 'Your account is not active (status: %). Wire transfers are unavailable.', v_status;
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Transfer amount must be greater than zero';
  END IF;

  INSERT INTO wire_transfers (
    user_id, account_id, beneficiary_name, beneficiary_account, beneficiary_bank,
    beneficiary_country, swift_code, amount, currency, purpose, status, current_stage
  ) VALUES (
    v_user_id, p_account_id, p_beneficiary_name, p_beneficiary_account, p_beneficiary_bank,
    p_beneficiary_country, p_swift_code, p_amount, p_currency, p_purpose, 'awaiting_cot', 1
  ) RETURNING id INTO v_wire_id;

  FOREACH v_type IN ARRAY v_types LOOP
    v_code := v_type || '-' || UPPER(SUBSTRING(MD5(RANDOM()::text), 1, 8));

    INSERT INTO wire_transfer_codes (wire_transfer_id, code_type, code_value, is_verified)
    VALUES (v_wire_id, v_type, v_code, false);
  END LOOP;

  RETURN v_wire_id;
END;
$function$;

-- ============================================================================
-- 6. Loan applications — RLS now requires an active disbursement account
-- ============================================================================
DROP POLICY IF EXISTS "Users can insert own loans" ON public.loans;
CREATE POLICY "Users can insert own loans"
  ON public.loans FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.accounts
      WHERE id = disbursement_account_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

-- ============================================================================
-- 7. Beneficiary management — RLS now requires the user to have at least
--    one active account before adding a new beneficiary
-- ============================================================================
DROP POLICY IF EXISTS "Users can insert own beneficiaries" ON public.beneficiaries;
CREATE POLICY "Users can insert own beneficiaries"
  ON public.beneficiaries FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.accounts WHERE user_id = auth.uid() AND status = 'active')
  );

-- ============================================================================
-- 8. Card unfreeze — RLS now always allows a customer to freeze their own
--    card (a protective action), but requires an active linked account to
--    unfreeze it again
-- ============================================================================
DROP POLICY IF EXISTS "Users can update own cards" ON public.cards;
CREATE POLICY "Users can update own cards"
  ON public.cards FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      status = 'frozen'
      OR EXISTS (SELECT 1 FROM public.accounts WHERE id = account_id AND status = 'active')
    )
  );

COMMIT;
