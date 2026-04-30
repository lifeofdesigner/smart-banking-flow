CREATE OR REPLACE FUNCTION public.initiate_wire_transfer(
  p_user_id uuid,
  p_account_id uuid,
  p_beneficiary_name text,
  p_beneficiary_account text,
  p_beneficiary_bank text,
  p_beneficiary_country text,
  p_swift_code text,
  p_amount numeric,
  p_currency text,
  p_purpose text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_wire_id uuid;
  v_code text;
  v_types text[] := ARRAY['COT','IMF','TAX','LEVY','FIN'];
  v_type text;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM accounts
    WHERE id = p_account_id
    AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Transfer amount must be greater than zero';
  END IF;

  INSERT INTO wire_transfers (
    user_id,
    account_id,
    beneficiary_name,
    beneficiary_account,
    beneficiary_bank,
    beneficiary_country,
    swift_code,
    amount,
    currency,
    purpose,
    status,
    current_stage
  ) VALUES (
    v_user_id,
    p_account_id,
    p_beneficiary_name,
    p_beneficiary_account,
    p_beneficiary_bank,
    p_beneficiary_country,
    p_swift_code,
    p_amount,
    p_currency,
    p_purpose,
    'awaiting_cot',
    1
  ) RETURNING id INTO v_wire_id;

  FOREACH v_type IN ARRAY v_types LOOP
    v_code := v_type || '-' || UPPER(SUBSTRING(MD5(RANDOM()::text), 1, 8));

    INSERT INTO wire_transfer_codes (
      wire_transfer_id,
      code_type,
      code_value,
      is_verified
    ) VALUES (
      v_wire_id,
      v_type,
      v_code,
      false
    );
  END LOOP;

  RETURN v_wire_id;
END;
$$;
