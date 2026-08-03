-- audit_logs only ever had a SELECT policy (admins can view). The client-side
-- logAdminAction() helper (src/lib/auditLog.ts) inserts a row every time an
-- admin performs a logged action (manual deposits, reversals, fraud alert
-- resolutions, etc.), but with no INSERT policy those writes were silently
-- rejected by RLS — logAdminAction swallows the error, so this was invisible
-- except as missing audit history.

DROP POLICY IF EXISTS "Admins can write audit logs" ON public.audit_logs;
CREATE POLICY "Admins can write audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT INSERT ON public.audit_logs TO authenticated;
