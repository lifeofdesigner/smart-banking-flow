CREATE TABLE IF NOT EXISTS public.wire_transfer_verification_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  message_title text,
  message_body text,
  message_background_color text,
  message_border_color text,
  message_icon text,
  requires_code boolean DEFAULT true,
  code_label text,
  placeholder text,
  button_text text,
  icon text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  allow_skip boolean NOT NULL DEFAULT false,
  requires_admin boolean NOT NULL DEFAULT false,
  visible_to_customer boolean NOT NULL DEFAULT true,
  show_icon boolean NOT NULL DEFAULT true,
  auto_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.wire_transfer_verification_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can read active wire transfer steps" ON public.wire_transfer_verification_steps;
CREATE POLICY "Customers can read active wire transfer steps"
  ON public.wire_transfer_verification_steps
  FOR SELECT
  USING (is_active AND visible_to_customer);

DROP POLICY IF EXISTS "Admins manage wire transfer steps" ON public.wire_transfer_verification_steps;
CREATE POLICY "Admins manage wire transfer steps"
  ON public.wire_transfer_verification_steps
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_wire_transfer_verification_steps_updated_at ON public.wire_transfer_verification_steps;
CREATE TRIGGER update_wire_transfer_verification_steps_updated_at
  BEFORE UPDATE ON public.wire_transfer_verification_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.wire_transfer_verification_steps (
  step_code,
  title,
  description,
  message_title,
  message_body,
  message_background_color,
  message_border_color,
  message_icon,
  requires_code,
  code_label,
  placeholder,
  button_text,
  icon,
  display_order,
  is_active,
  allow_skip,
  requires_admin,
  visible_to_customer,
  show_icon,
  auto_complete
) VALUES
  ('COT', 'Cost Of Transfer Code', 'Required for processing international transfers', 'Important', 'Please contact our support team to receive your Cost Of Transfer Code.', '#FFFBEB', '#F59E0B', 'AlertTriangle', true, 'Enter COT Code', 'COT-XXXXXXXX', 'Verify Code', 'ShieldCheck', 1, true, false, false, true, true, false),
  ('IMF', 'International Monitoring Fund Code', 'Required for international compliance checks', 'Notice', 'This verification is required before international transfers can continue.', '#FFF7ED', '#FB923C', 'ShieldAlert', true, 'Enter IMF Code', 'IMF-XXXXXXXX', 'Verify Code', 'ShieldCheck', 2, true, false, false, true, true, false),
  ('TAX', 'Tax Clearance Code', 'Tax compliance verification', 'Attention', 'Please visit your nearest branch or contact your account officer.', '#FEFCE8', '#EAB308', 'BadgeAlert', true, 'Enter TAX Code', 'TAX-XXXXXXXX', 'Verify Code', 'ShieldCheck', 3, true, false, false, true, true, false),
  ('LEVY', 'Transfer Levy Code', 'Government levy clearance', 'Security Notice', 'A transfer levy applies to this transaction.', '#ECFDF5', '#10B981', 'Shield', true, 'Enter LEVY Code', 'LEVY-XXXXXXXX', 'Verify Code', 'ShieldCheck', 4, true, false, false, true, true, false),
  ('FIN', 'Final Authorization Code', 'Final authorization for transfer', 'Important', 'Final authorization is required to complete your transfer.', '#EFF6FF', '#3B82F6', 'CheckCircle2', true, 'Enter FIN Code', 'FIN-XXXXXXXX', 'Verify Code', 'ShieldCheck', 5, true, false, false, true, true, false)
ON CONFLICT (step_code) DO NOTHING;

ALTER TABLE public.wire_transfer_codes
  DROP CONSTRAINT IF EXISTS wire_transfer_codes_code_type_check;

ALTER TABLE public.wire_transfers
  DROP CONSTRAINT IF EXISTS wire_transfers_status_check;

ALTER TABLE public.wire_transfers
  ADD CONSTRAINT wire_transfers_status_check
  CHECK (status IN ('pending', 'verification_pending', 'processing', 'completed', 'failed', 'cancelled', 'awaiting_cot', 'awaiting_imf', 'awaiting_tax', 'awaiting_levy', 'awaiting_fin'));

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
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_status text;
  v_wire_id uuid;
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
    p_beneficiary_country, p_swift_code, p_amount, p_currency, p_purpose, 'verification_pending', 1
  ) RETURNING id INTO v_wire_id;

  INSERT INTO wire_transfer_codes (wire_transfer_id, code_type, code_value, is_verified)
  SELECT
    v_wire_id,
    step_code,
    step_code || '-' || UPPER(SUBSTRING(MD5(RANDOM()::text), 1, 8)),
    false
  FROM public.wire_transfer_verification_steps
  WHERE is_active
  ORDER BY display_order;

  RETURN v_wire_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_wire_transfer_codes_for_admin(
  p_admin_id uuid,
  p_wire_transfer_id uuid
) RETURNS TABLE(code_type text, code_value text, is_verified boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
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
  LEFT JOIN public.wire_transfer_verification_steps steps
    ON steps.step_code = wtc.code_type
  WHERE wtc.wire_transfer_id = p_wire_transfer_id
  ORDER BY COALESCE(steps.display_order, 0), wtc.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_wire_transfer_code(
  p_code text,
  p_code_type text,
  p_wire_transfer_id uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_row record;
  v_submitted_code text;
  v_user_id uuid;
  v_step record;
  v_total_steps integer;
  v_next_step_order integer;
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

  SELECT *
  INTO v_step
  FROM public.wire_transfer_verification_steps
  WHERE step_code = UPPER(p_code_type)
    AND is_active
  LIMIT 1;

  IF v_step IS NULL THEN
    RAISE EXCEPTION 'Invalid wire verification step: %', p_code_type;
  END IF;

  SELECT id, code_value, is_verified, attempts
  INTO v_code_row
  FROM wire_transfer_codes
  WHERE wire_transfer_id = p_wire_transfer_id
    AND code_type = UPPER(p_code_type)
  LIMIT 1
  FOR UPDATE;

  IF v_code_row IS NULL THEN
    RAISE EXCEPTION 'Code not found for this transfer and step';
  END IF;

  IF v_code_row.is_verified = true THEN
    RETURN true;
  END IF;

  IF v_step.requires_code AND UPPER(TRIM(COALESCE(p_code, ''))) <> UPPER(TRIM(v_code_row.code_value)) THEN
    UPDATE wire_transfer_codes
    SET attempts = attempts + 1
    WHERE id = v_code_row.id;
    RAISE EXCEPTION 'Incorrect code';
  END IF;

  UPDATE wire_transfer_codes
  SET is_verified = true,
      verified_at = now()
  WHERE id = v_code_row.id;

  SELECT COUNT(*) INTO v_total_steps
  FROM public.wire_transfer_verification_steps
  WHERE is_active;

  SELECT MIN(display_order)
  INTO v_next_step_order
  FROM public.wire_transfer_verification_steps
  WHERE is_active
    AND display_order > COALESCE(v_step.display_order, 0);

  IF v_next_step_order IS NULL THEN
    UPDATE wire_transfers
    SET status = 'completed',
        current_stage = v_total_steps,
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
  ELSE
    UPDATE wire_transfers
    SET status = 'verification_pending',
        current_stage = v_next_step_order,
        updated_at = now()
    WHERE id = p_wire_transfer_id;
  END IF;

  RETURN true;
END;
$$;
