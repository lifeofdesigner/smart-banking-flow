CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_full_name text,
  p_email text,
  p_password text,
  p_role text DEFAULT 'user',
  p_account_type text DEFAULT 'savings',
  p_opening_balance numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_existing_user_id uuid;
  v_user_id uuid := extensions.gen_random_uuid();
  v_identity_id uuid := extensions.gen_random_uuid();
  v_email text := lower(trim(p_email));
  v_role text := lower(trim(coalesce(p_role, 'user')));
  v_account_type text := lower(trim(coalesce(p_account_type, 'savings')));
  v_account_type_name text;
  v_account_type_id uuid;
  v_account_id uuid;
  v_balance numeric := greatest(coalesce(p_opening_balance, 0), 0);
BEGIN
  IF v_admin_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = v_admin_id
      AND role = 'admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'Admin role required'
      USING ERRCODE = '42501';
  END IF;

  IF coalesce(trim(p_full_name), '') = '' THEN
    RAISE EXCEPTION 'Full name is required'
      USING ERRCODE = '22023';
  END IF;

  IF v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'A valid email address is required'
      USING ERRCODE = '22023';
  END IF;

  IF length(coalesce(p_password, '')) < 8 THEN
    RAISE EXCEPTION 'Password must be at least 8 characters'
      USING ERRCODE = '22023';
  END IF;

  IF v_role NOT IN ('user', 'admin') THEN
    v_role := 'user';
  END IF;

  IF v_account_type IN ('checking', 'current') THEN
    v_account_type := 'checking';
    v_account_type_name := 'Checking Account';
  ELSE
    v_account_type := 'savings';
    v_account_type_name := 'Savings Account';
  END IF;

  SELECT id INTO v_existing_user_id
  FROM auth.users
  WHERE lower(email) = v_email
  LIMIT 1;

  IF v_existing_user_id IS NOT NULL THEN
    v_user_id := v_existing_user_id;

    UPDATE auth.users
    SET
      encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = jsonb_build_object('full_name', trim(p_full_name)),
      updated_at = now()
    WHERE id = v_user_id;
  ELSE
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', trim(p_full_name)),
      now(),
      now()
    );
  END IF;

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_identity_id,
    v_user_id,
    v_user_id::text,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    updated_at = now();

  UPDATE auth.users
  SET
    confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change = coalesce(email_change, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    phone_change = coalesce(phone_change, ''),
    phone_change_token = coalesce(phone_change_token, ''),
    reauthentication_token = coalesce(reauthentication_token, ''),
    email_change_confirm_status = coalesce(email_change_confirm_status, 0),
    is_sso_user = coalesce(is_sso_user, false),
    is_anonymous = coalesce(is_anonymous, false)
  WHERE id = v_user_id;

  INSERT INTO public.profiles (id, full_name, email, kyc_status)
  VALUES (v_user_id, trim(p_full_name), v_email, 'verified')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    kyc_status = coalesce(public.profiles.kyc_status, 'verified'),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'user'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF v_role = 'admin' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles
    WHERE user_id = v_user_id
      AND role = 'admin'::public.app_role;
  END IF;

  SELECT id INTO v_account_type_id
  FROM public.account_types
  WHERE name = v_account_type_name
  LIMIT 1;

  SELECT id INTO v_account_id
  FROM public.accounts
  WHERE user_id = v_user_id
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  IF v_account_id IS NULL THEN
    INSERT INTO public.accounts (
      user_id,
      account_number,
      account_type,
      account_type_id,
      balance,
      available_balance,
      ledger_balance,
      currency,
      status
    ) VALUES (
      v_user_id,
      public.generate_account_number(),
      v_account_type,
      v_account_type_id,
      v_balance,
      v_balance,
      v_balance,
      'USD',
      'active'
    );
  ELSE
    UPDATE public.accounts
    SET
      account_type = v_account_type,
      account_type_id = v_account_type_id,
      balance = v_balance,
      available_balance = v_balance,
      ledger_balance = v_balance,
      currency = 'USD',
      status = 'active',
      updated_at = now()
    WHERE id = v_account_id;
  END IF;

  RETURN jsonb_build_object(
    'id', v_user_id,
    'email', v_email,
    'role', v_role,
    'account_type', v_account_type
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_user(text, text, text, text, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text, text, numeric) TO authenticated;
