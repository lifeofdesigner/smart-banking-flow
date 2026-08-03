-- Admin-assigned sign-in PIN: after password sign-in, a customer must enter
-- a 6-digit PIN before sign-in completes. The PIN is static and set only by
-- an admin (never chosen by the user); a user with no PIN assigned is fully
-- blocked from signing in. Storage lives in its own locked-down table
-- (public.profiles already has an unrestricted "own profile" update policy,
-- and Supabase's schema-wide default grants mean a column-level REVOKE on
-- profiles wouldn't actually remove that table-level access) with RLS
-- enabled and zero policies, plus a REVOKE ALL from anon/authenticated, so
-- it is reachable only through the SECURITY DEFINER functions below.
CREATE TABLE public.user_login_pins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  set_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz
);

ALTER TABLE public.user_login_pins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_login_pins FROM PUBLIC, anon, authenticated;

-- Single source of truth for "is this user's current sign-in PIN-verified".
-- Admins bypass this (they're never assigned a PIN) so admin-initiated
-- money movement (admin_manual_deposit, etc., which pass the admin's own
-- uid through as the acting user) keeps working, and so an admin can always
-- sign in to assign the very first PIN without a bootstrap deadlock.
CREATE OR REPLACE FUNCTION public.pin_verified(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.has_role(p_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.user_login_pins ulp
      JOIN auth.users u ON u.id = ulp.user_id
      WHERE ulp.user_id = p_user_id
        AND ulp.verified_at IS NOT NULL
        AND ulp.verified_at >= u.last_sign_in_at
    );
$function$;

REVOKE ALL ON FUNCTION public.pin_verified(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pin_verified(uuid) TO authenticated;

-- Admin-only: (re)generate a user's sign-in PIN. Always issues a fresh PIN
-- and clears any prior verification/lockout state, so it doubles as a
-- "revoke and reissue" action if a PIN is ever compromised. Returns the
-- plaintext PIN once — the admin must relay it to the customer now, since
-- only its hash is kept afterward.
CREATE OR REPLACE FUNCTION public.admin_generate_login_pin(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pin text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'You are not authorized to perform this action.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  v_pin := lpad(floor(random() * 1000000)::text, 6, '0');

  INSERT INTO public.user_login_pins (user_id, pin_hash, set_at, verified_at, failed_attempts, locked_until)
  VALUES (p_user_id, extensions.crypt(v_pin, extensions.gen_salt('bf')), now(), NULL, 0, NULL)
  ON CONFLICT (user_id) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash,
        set_at = now(),
        verified_at = NULL,
        failed_attempts = 0,
        locked_until = NULL;

  INSERT INTO public.audit_logs (action, user_id, metadata)
  VALUES ('admin.generate_login_pin', auth.uid(), jsonb_build_object('target_user_id', p_user_id));

  RETURN v_pin;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_generate_login_pin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_generate_login_pin(uuid) TO authenticated;

-- Admin-only: PIN status for every user, for the AdminUsersManagement table.
-- Never exposes the hash — just whether one is set, when, and lockout state.
CREATE OR REPLACE FUNCTION public.admin_list_login_pin_status()
RETURNS TABLE(user_id uuid, pin_set boolean, set_at timestamptz, failed_attempts integer, locked_until timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'You are not authorized to perform this action.';
  END IF;

  RETURN QUERY
  SELECT ulp.user_id, true, ulp.set_at, ulp.failed_attempts, ulp.locked_until
  FROM public.user_login_pins ulp;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_list_login_pin_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_login_pin_status() TO authenticated;

-- Called by the signed-in customer to complete the PIN step. Takes no
-- p_user_id parameter — auth.uid() is captured internally — which is what
-- makes it safe to grant to `authenticated` at all. On a wrong PIN this
-- must NOT raise: PostgREST wraps the call in one transaction, and a raised
-- exception would roll back the failed_attempts increment along with it
-- (the same reason verify_wire_transfer_code's existing 3-attempt lockout
-- has never actually engaged) — so failure is a normal return, not a throw.
CREATE OR REPLACE FUNCTION public.verify_login_pin(p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_hash text;
  v_attempts integer;
  v_locked_until timestamptz;
  v_max_attempts constant integer := 10;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM public.check_rate_limit(v_uid, 'verify_login_pin', 10, 900);

  SELECT pin_hash, failed_attempts, locked_until INTO v_hash, v_attempts, v_locked_until
  FROM public.user_login_pins WHERE user_id = v_uid;

  IF v_hash IS NULL THEN
    RAISE EXCEPTION 'No sign-in PIN has been set up for this account yet. Please contact support.';
  END IF;

  IF v_locked_until IS NOT NULL AND now() < v_locked_until THEN
    RETURN jsonb_build_object('ok', false, 'locked', true, 'locked_until', v_locked_until);
  END IF;

  IF extensions.crypt(p_pin, v_hash) = v_hash THEN
    UPDATE public.user_login_pins
    SET verified_at = now(), failed_attempts = 0, locked_until = NULL
    WHERE user_id = v_uid;
    RETURN jsonb_build_object('ok', true);
  ELSE
    v_attempts := v_attempts + 1;
    UPDATE public.user_login_pins
    SET failed_attempts = v_attempts,
        locked_until = CASE WHEN v_attempts >= v_max_attempts THEN now() + interval '15 minutes' ELSE locked_until END
    WHERE user_id = v_uid;
    RETURN jsonb_build_object(
      'ok', false,
      'locked', v_attempts >= v_max_attempts,
      'remaining', GREATEST(v_max_attempts - v_attempts, 0)
    );
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.verify_login_pin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_login_pin(text) TO authenticated;

-- Called by the frontend right after password sign-in (and by the
-- DashboardLayout/Beneficiaries/KYCVerification backstop) to decide whether
-- to show the PIN step. The "verified for THIS login" comparison happens
-- here, server-side, against auth.users.last_sign_in_at — never computed
-- client-side from a cached session object.
CREATE OR REPLACE FUNCTION public.my_login_pin_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'pin_set', EXISTS (SELECT 1 FROM public.user_login_pins WHERE user_id = auth.uid()),
    'pin_verified', public.pin_verified(auth.uid())
  );
$function$;

REVOKE ALL ON FUNCTION public.my_login_pin_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_login_pin_status() TO authenticated;

-- execute_transaction is the shared engine behind transfer_between_accounts,
-- pay_bill, request_atm_withdrawal, make_loan_repayment, admin_manual_deposit,
-- and the wire-transfer completion path, so gating it here covers all of
-- them in one place. System/admin-initiated credits are exempt — they pass
-- a bank/admin/rewards account as the acting "user" and were never something
-- the customer needs to have PIN-verified their own session for:
--   - process_referral_on_first_transaction pays the *referrer* (a third
--     party, typically not signed in) via a 'system' transaction nested
--     inside the referred customer's own first transfer; without the
--     exemption that customer's transfer would abort on the referrer's
--     behalf.
--   - 'cashback'/'fee'/'loan_disbursement'/'reversal'/'deposit' are all
--     bank-initiated credits, never a customer-initiated debit.
CREATE OR REPLACE FUNCTION public.execute_transaction(p_debit_account uuid, p_credit_account uuid, p_amount numeric, p_transaction_type text, p_description text, p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  IF p_transaction_type NOT IN ('system', 'cashback', 'fee', 'loan_disbursement', 'reversal', 'deposit')
     AND NOT public.pin_verified(p_user_id) THEN
    RAISE EXCEPTION 'PIN verification required before this transaction can be completed. Please sign in again.';
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
$function$;

-- Wires don't route through execute_transaction: initiate_wire_transfer
-- writes wire_transfers directly, and the money only actually moves later
-- inside verify_wire_transfer_code when the final code is confirmed. Both
-- need their own check to fail fast at each stage.
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

  IF NOT public.pin_verified(v_user_id) THEN
    RAISE EXCEPTION 'PIN verification required before this transaction can be completed. Please sign in again.';
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

CREATE OR REPLACE FUNCTION public.verify_wire_transfer_code(p_code text, p_code_type text, p_wire_transfer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_code_row record;
  v_submitted_code text;
  v_user_id uuid;
  v_idx integer;
  v_all_verified boolean;
  v_wire record;
  v_bank_pool_account_id uuid;
  v_wire_txn_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT public.pin_verified(v_user_id) THEN
    RAISE EXCEPTION 'PIN verification required before this transaction can be completed. Please sign in again.';
  END IF;

  SELECT wt.user_id, wt.account_id, wt.amount, wt.beneficiary_name, wt.transaction_id
  INTO v_wire
  FROM wire_transfers wt
  WHERE wt.id = p_wire_transfer_id
  FOR UPDATE;

  IF v_wire IS NULL THEN
    RAISE EXCEPTION 'Wire transfer not found';
  END IF;

  IF v_wire.user_id != v_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_idx := array_position(ARRAY['COT','IMF','TAX','LEVY','FIN']::text[], UPPER(p_code_type));

  IF v_idx IS NULL THEN
    RAISE EXCEPTION 'Invalid wire code type: %', p_code_type;
  END IF;

  -- Rate limit: max 10 verification attempts per 15 minutes
  PERFORM check_rate_limit(v_user_id, 'wire_verify', 10, 900);

  v_submitted_code := UPPER(TRIM(p_code));

  -- Find the matching code record
  SELECT id, code_value, is_verified, attempts
  INTO v_code_row
  FROM wire_transfer_codes
  WHERE wire_transfer_id = p_wire_transfer_id
    AND code_type = UPPER(p_code_type)
  LIMIT 1
  FOR UPDATE;

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

  -- Compare plain codes. Generated codes are stored as CODE-XXXXXXXX.
  IF UPPER(v_code_row.code_value) = v_submitted_code THEN
    UPDATE wire_transfer_codes
    SET is_verified = true, verified_at = now()
    WHERE id = v_code_row.id;

    -- Final code (FIN) verified: complete wire + move money
    IF v_idx = 5 THEN
      SELECT COALESCE(bool_and(is_verified), false)
      INTO v_all_verified
      FROM wire_transfer_codes
      WHERE wire_transfer_id = p_wire_transfer_id;

      IF v_all_verified THEN
        UPDATE wire_transfers
        SET status = 'completed',
            current_stage = 5,
            updated_at = now()
        WHERE id = p_wire_transfer_id;

        IF v_wire.transaction_id IS NULL THEN
          SELECT id
          INTO v_bank_pool_account_id
          FROM accounts
          WHERE account_number = '9990000001'
          LIMIT 1;

          IF v_bank_pool_account_id IS NULL THEN
            RAISE EXCEPTION 'Bank pool account not found (account_number=9990000001)';
          END IF;

          v_wire_txn_id := public.execute_transaction(
            v_wire.account_id,
            v_bank_pool_account_id,
            v_wire.amount,
            'wire_transfer',
            'Wire transfer to ' || v_wire.beneficiary_name,
            v_user_id
          );

          UPDATE wire_transfers
          SET transaction_id = v_wire_txn_id,
              updated_at = now()
          WHERE id = p_wire_transfer_id;

          INSERT INTO notifications (user_id, type, title, message)
          VALUES (
            v_user_id,
            'wire_transfer_completed',
            'Wire Transfer Completed',
            'Your wire transfer of $' || v_wire.amount || ' to ' || v_wire.beneficiary_name || ' has been completed.'
          );
        END IF;
      END IF;
    END IF;

    RETURN true;
  ELSE
    IF v_code_row.attempts + 1 >= 3 THEN
      RAISE EXCEPTION 'Incorrect code. Maximum attempts reached. Code is now locked.';
    END IF;
    RAISE EXCEPTION 'Incorrect code. % attempt(s) remaining.', (3 - v_code_row.attempts - 1);
  END IF;
END;
$function$;
