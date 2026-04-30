CREATE OR REPLACE FUNCTION public.admin_manual_deposit(
  p_admin_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_description text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_bank_account_id uuid;
BEGIN
  v_admin_id := auth.uid();

  IF NOT public.has_role(v_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Deposit amount must be greater than zero';
  END IF;

  SELECT id INTO v_bank_account_id
  FROM public.accounts
  WHERE account_number = '9990000001'
  LIMIT 1;

  IF v_bank_account_id IS NULL THEN
    RAISE EXCEPTION 'Bank funding account not found';
  END IF;

  PERFORM public.execute_transaction(
    v_bank_account_id,
    p_account_id,
    p_amount,
    'deposit',
    p_description,
    v_admin_id
  );

  INSERT INTO public.audit_logs (action, user_id, metadata)
  VALUES (
    'admin.manual_deposit',
    v_admin_id,
    jsonb_build_object(
      'account_id', p_account_id,
      'amount', p_amount,
      'description', p_description
    )
  );

  RETURN 'Deposit of $' || p_amount || ' completed successfully';
END;
$$;
