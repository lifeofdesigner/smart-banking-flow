DROP TRIGGER IF EXISTS trg_hash_wire_code ON public.wire_transfer_codes CASCADE;
DROP TRIGGER IF EXISTS hash_wire_transfer_code_trigger ON public.wire_transfer_codes CASCADE;
DROP FUNCTION IF EXISTS public.hash_wire_transfer_code() CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wire_transfer_codes'
      AND column_name = 'plain_code'
  ) THEN
    UPDATE public.wire_transfer_codes
    SET code_value = plain_code
    WHERE plain_code IS NOT NULL;
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.get_wire_transfer_codes_for_admin(uuid, uuid);

ALTER TABLE public.wire_transfer_codes
DROP COLUMN IF EXISTS plain_code;

CREATE OR REPLACE FUNCTION public.get_wire_transfer_codes_for_admin(
  p_admin_id uuid,
  p_wire_transfer_id uuid
) RETURNS TABLE(code_type text, code_value text, is_verified boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  v_admin_id := auth.uid();

  IF NOT has_role(v_admin_id, 'admin') THEN
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

CREATE OR REPLACE FUNCTION public.verify_wire_transfer_code(
  p_code text,
  p_code_type text,
  p_wire_transfer_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;
