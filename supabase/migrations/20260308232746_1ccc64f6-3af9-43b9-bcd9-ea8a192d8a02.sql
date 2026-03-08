
-- Enable RLS on all partition sub-tables
ALTER TABLE public.ledger_entries_archive_2026_01 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries_archive_2026_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries_archive_2026_03 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries_archive_2026_04 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries_archive_2026_05 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries_archive_2026_06 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries_archive_2026_07 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries_archive_2026_08 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries_archive_2026_09 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries_archive_2026_10 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries_archive_2026_11 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries_archive_2026_12 ENABLE ROW LEVEL SECURITY;

-- Also enable RLS on api_rate_limits partitions if any, and the rate limits table itself already has it
