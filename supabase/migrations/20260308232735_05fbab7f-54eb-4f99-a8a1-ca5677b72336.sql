
-- ==========================================
-- PARTITIONED LEDGER ARCHIVE TABLE
-- ==========================================
-- Note: PostgreSQL cannot convert an existing table to partitioned in-place.
-- We create a partitioned archive table for historical ledger queries
-- and a function to migrate old entries periodically.

CREATE TABLE IF NOT EXISTS public.ledger_entries_archive (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL,
  debit_account_id uuid NOT NULL,
  credit_account_id uuid NOT NULL,
  amount numeric NOT NULL,
  description text,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for 2026
CREATE TABLE IF NOT EXISTS public.ledger_entries_archive_2026_01
  PARTITION OF public.ledger_entries_archive
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE IF NOT EXISTS public.ledger_entries_archive_2026_02
  PARTITION OF public.ledger_entries_archive
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE IF NOT EXISTS public.ledger_entries_archive_2026_03
  PARTITION OF public.ledger_entries_archive
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE IF NOT EXISTS public.ledger_entries_archive_2026_04
  PARTITION OF public.ledger_entries_archive
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE IF NOT EXISTS public.ledger_entries_archive_2026_05
  PARTITION OF public.ledger_entries_archive
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE IF NOT EXISTS public.ledger_entries_archive_2026_06
  PARTITION OF public.ledger_entries_archive
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE IF NOT EXISTS public.ledger_entries_archive_2026_07
  PARTITION OF public.ledger_entries_archive
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE IF NOT EXISTS public.ledger_entries_archive_2026_08
  PARTITION OF public.ledger_entries_archive
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE TABLE IF NOT EXISTS public.ledger_entries_archive_2026_09
  PARTITION OF public.ledger_entries_archive
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE TABLE IF NOT EXISTS public.ledger_entries_archive_2026_10
  PARTITION OF public.ledger_entries_archive
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE TABLE IF NOT EXISTS public.ledger_entries_archive_2026_11
  PARTITION OF public.ledger_entries_archive
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

CREATE TABLE IF NOT EXISTS public.ledger_entries_archive_2026_12
  PARTITION OF public.ledger_entries_archive
  FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- Indexes on archive partitions (auto-inherited)
CREATE INDEX IF NOT EXISTS idx_archive_debit_created ON public.ledger_entries_archive (debit_account_id, created_at);
CREATE INDEX IF NOT EXISTS idx_archive_credit_created ON public.ledger_entries_archive (credit_account_id, created_at);
CREATE INDEX IF NOT EXISTS idx_archive_txn_id ON public.ledger_entries_archive (transaction_id);

-- RLS on archive
ALTER TABLE public.ledger_entries_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view archive"
  ON public.ledger_entries_archive FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own archive entries"
  ON public.ledger_entries_archive FOR SELECT
  USING (
    (debit_account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid()))
    OR
    (credit_account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid()))
  );

-- Function to archive old ledger entries (run periodically)
CREATE OR REPLACE FUNCTION public.archive_old_ledger_entries(p_before_date timestamptz DEFAULT (now() - interval '90 days'))
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH moved AS (
    DELETE FROM ledger_entries
    WHERE created_at < p_before_date
    RETURNING *
  )
  INSERT INTO ledger_entries_archive (id, transaction_id, debit_account_id, credit_account_id, amount, description, currency, created_at)
  SELECT id, transaction_id, debit_account_id, credit_account_id, amount, description, currency, created_at
  FROM moved;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
