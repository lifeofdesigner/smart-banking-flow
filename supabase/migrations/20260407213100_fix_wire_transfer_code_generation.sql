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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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

CREATE OR REPLACE FUNCTION public.get_wire_transfer_codes_for_admin(
  p_admin_id uuid,
  p_wire_transfer_id uuid
) RETURNS TABLE(code_type text, code_value text, is_verified boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can view wire transfer codes';
  END IF;

  RETURN QUERY
  SELECT
    wtc.code_type,
    wtc.code_value,
    wtc.is_verified
  FROM wire_transfer_codes wtc
  WHERE wtc.wire_transfer_id = p_wire_transfer_id
  ORDER BY ARRAY_POSITION(ARRAY['COT','IMF','TAX','LEVY','FIN'], wtc.code_type);
END;
$$;
