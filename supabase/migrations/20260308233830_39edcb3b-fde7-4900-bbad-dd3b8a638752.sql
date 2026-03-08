
-- Add RLS policies to all pre-existing archive partition tables
DO $$
DECLARE
  t text;
  months text[] := ARRAY['01','02','03','04','05','06','07','08','09','10','11','12'];
BEGIN
  FOREACH t IN ARRAY months LOOP
    EXECUTE format(
      'CREATE POLICY "Admins can view archive %s" ON public.ledger_entries_archive_2026_%s FOR SELECT TO authenticated USING (has_role(auth.uid(), ''admin''))',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY "Users can view own archive entries %s" ON public.ledger_entries_archive_2026_%s FOR SELECT TO authenticated USING ((debit_account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())) OR (credit_account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())))',
      t, t
    );
  END LOOP;
END;
$$;
