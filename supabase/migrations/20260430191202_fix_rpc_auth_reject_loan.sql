CREATE OR REPLACE FUNCTION public.reject_loan(p_loan_id uuid, p_admin_id uuid, p_reason text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_loan record;
BEGIN
  v_admin_id := auth.uid();

  IF NOT has_role(v_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can reject loans';
  END IF;

  SELECT * INTO v_loan FROM loans WHERE id = p_loan_id FOR UPDATE;
  IF v_loan IS NULL THEN RAISE EXCEPTION 'Loan not found'; END IF;
  IF v_loan.status != 'pending' THEN RAISE EXCEPTION 'Loan is not in pending status'; END IF;

  UPDATE loans SET status = 'rejected', rejection_reason = p_reason WHERE id = p_loan_id;
  INSERT INTO notifications (user_id, type, title, message)
  VALUES (v_loan.user_id, 'loan_rejected', 'Loan Rejected', 'Your loan was rejected. Reason: ' || p_reason);
  RETURN 'Loan rejected';
END;
$$;
