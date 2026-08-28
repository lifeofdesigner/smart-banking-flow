-- Allow users to delete their own uncompleted wire transfers
ALTER TABLE public.wire_transfers
  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can delete own wire transfers" ON public.wire_transfers;
CREATE POLICY "Users can delete own wire transfers"
  ON public.wire_transfers
  FOR DELETE
  USING (auth.uid() = user_id AND status != 'completed');

DROP POLICY IF EXISTS "Users can update own wire transfers" ON public.wire_transfers;
CREATE POLICY "Users can update own wire transfers"
  ON public.wire_transfers
  FOR UPDATE
  USING (auth.uid() = user_id AND status != 'completed')
  WITH CHECK (auth.uid() = user_id);

-- Function to safely stop / cancel an in-progress wire transfer
CREATE OR REPLACE FUNCTION public.cancel_user_wire_transfer(
  p_wire_transfer_id uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_wire record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT id, user_id, status, amount, beneficiary_name
  INTO v_wire
  FROM wire_transfers
  WHERE id = p_wire_transfer_id
  FOR UPDATE;

  IF v_wire IS NULL THEN
    RAISE EXCEPTION 'Wire transfer not found';
  END IF;

  IF v_wire.user_id != v_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_wire.status = 'completed' THEN
    RAISE EXCEPTION 'Completed wire transfers cannot be cancelled';
  END IF;

  UPDATE wire_transfers
  SET status = 'cancelled',
      updated_at = now()
  WHERE id = p_wire_transfer_id;

  INSERT INTO notifications (user_id, type, title, message)
  VALUES (
    v_user_id,
    'wire_transfer_cancelled',
    'Wire Transfer Stopped',
    'Your wire transfer of $' || v_wire.amount || ' to ' || v_wire.beneficiary_name || ' has been stopped and marked as cancelled.'
  );

  RETURN true;
END;
$$;

-- Function to safely delete an in-progress wire transfer
CREATE OR REPLACE FUNCTION public.delete_user_wire_transfer(
  p_wire_transfer_id uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_wire record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT id, user_id, status
  INTO v_wire
  FROM wire_transfers
  WHERE id = p_wire_transfer_id
  FOR UPDATE;

  IF v_wire IS NULL THEN
    RAISE EXCEPTION 'Wire transfer not found';
  END IF;

  IF v_wire.user_id != v_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_wire.status = 'completed' THEN
    RAISE EXCEPTION 'Completed wire transfers cannot be deleted';
  END IF;

  DELETE FROM wire_transfers WHERE id = p_wire_transfer_id;

  RETURN true;
END;
$$;

NOTIFY pgrst, 'reload schema';
