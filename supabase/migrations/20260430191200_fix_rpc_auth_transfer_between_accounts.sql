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
  v_user_id uuid;
  v_owner uuid;
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

  -- Rate limit
  PERFORM check_rate_limit(v_user_id, 'transfer', 20, 900);

  -- KYC check
  SELECT kyc_status INTO v_kyc_status FROM profiles WHERE id = v_user_id;
  IF v_kyc_status IS NULL OR v_kyc_status != 'approved' THEN
    v_reason := 'KYC verification required before making transfers. Current status: ' || COALESCE(v_kyc_status, 'not submitted');
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (v_user_id, 'transfer_failed', 'Transfer Failed', v_reason);
    RAISE EXCEPTION '%', v_reason;
  END IF;

  -- Verify authenticated caller owns the source account
  SELECT user_id INTO v_owner FROM accounts WHERE id = p_from_account;
  IF v_owner IS NULL OR v_owner != v_user_id THEN
    v_reason := 'You do not own the source account';
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (v_user_id, 'transfer_failed', 'Transfer Failed', v_reason);
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

  -- Execute via core engine
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
$$;
