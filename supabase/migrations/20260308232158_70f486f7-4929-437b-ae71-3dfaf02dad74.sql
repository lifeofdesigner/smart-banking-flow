
-- Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add attempt tracking column
ALTER TABLE public.wire_transfer_codes
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;

-- Drop the user SELECT policy so users can no longer read codes
DROP POLICY IF EXISTS "Users can view codes for own transfers" ON public.wire_transfer_codes;

-- Create the verify RPC
CREATE OR REPLACE FUNCTION public.verify_wire_transfer_code(
  p_wire_transfer_id uuid,
  p_code_type text,
  p_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code_row record;
  v_hashed text;
BEGIN
  -- Hash the submitted code
  v_hashed := encode(digest(p_code, 'sha256'), 'hex');

  -- Find the matching code record
  SELECT id, code_value, is_verified, attempts
  INTO v_code_row
  FROM wire_transfer_codes
  WHERE wire_transfer_id = p_wire_transfer_id
    AND code_type = p_code_type
  LIMIT 1;

  IF v_code_row IS NULL THEN
    RAISE EXCEPTION 'Code not found for this transfer and type';
  END IF;

  -- Already verified
  IF v_code_row.is_verified = true THEN
    RAISE EXCEPTION 'Code already verified';
  END IF;

  -- Check attempt limit (max 3)
  IF v_code_row.attempts >= 3 THEN
    RAISE EXCEPTION 'Maximum verification attempts exceeded. Code is locked.';
  END IF;

  -- Increment attempts
  UPDATE wire_transfer_codes
  SET attempts = attempts + 1
  WHERE id = v_code_row.id;

  -- Compare hashes
  IF v_code_row.code_value = v_hashed THEN
    UPDATE wire_transfer_codes
    SET is_verified = true, verified_at = now()
    WHERE id = v_code_row.id;
    RETURN true;
  ELSE
    -- Check if this was the last attempt
    IF v_code_row.attempts + 1 >= 3 THEN
      RAISE EXCEPTION 'Incorrect code. Maximum attempts reached. Code is now locked.';
    END IF;
    RAISE EXCEPTION 'Incorrect code. % attempt(s) remaining.', (3 - v_code_row.attempts - 1);
  END IF;
END;
$$;

-- Update any existing code insertion logic to hash values.
-- Create a trigger that auto-hashes code_value on INSERT.
CREATE OR REPLACE FUNCTION public.hash_wire_transfer_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.code_value := encode(digest(NEW.code_value, 'sha256'), 'hex');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_wire_code ON public.wire_transfer_codes;
CREATE TRIGGER trg_hash_wire_code
  BEFORE INSERT ON public.wire_transfer_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_wire_transfer_code();
