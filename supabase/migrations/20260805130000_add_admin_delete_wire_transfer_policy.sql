-- Allow admins to delete wire transfers through authenticated client sessions.
ALTER TABLE public.wire_transfers
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can delete wire transfers"
  ON public.wire_transfers
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));
