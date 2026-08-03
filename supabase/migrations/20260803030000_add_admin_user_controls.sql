ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS can_initiate_wire_transfer BOOLEAN DEFAULT TRUE NOT NULL;

-- Function to update account status for a user
CREATE OR REPLACE FUNCTION public.admin_update_user_account_status(p_user_id UUID, p_status TEXT)
RETURNS void AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'You are not authorized to perform this action.';
  END IF;

  IF p_status NOT IN ('active', 'frozen', 'closed') THEN
    RAISE EXCEPTION 'Invalid account status: %', p_status;
  END IF;

  UPDATE public.accounts
  SET status = p_status
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found for user %', p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO public;

REVOKE ALL ON FUNCTION public.admin_update_user_account_status(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_user_account_status(UUID, TEXT) TO authenticated;

-- Function to toggle wire transfer access
CREATE OR REPLACE FUNCTION public.admin_toggle_wire_transfer_access(p_user_id UUID, p_can_transfer BOOLEAN)
RETURNS void AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'You are not authorized to perform this action.';
  END IF;

  UPDATE public.profiles
  SET can_initiate_wire_transfer = p_can_transfer
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO public;

REVOKE ALL ON FUNCTION public.admin_toggle_wire_transfer_access(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_toggle_wire_transfer_access(UUID, BOOLEAN) TO authenticated;
