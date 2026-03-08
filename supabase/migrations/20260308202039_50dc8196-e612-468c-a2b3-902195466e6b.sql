
-- Performance indexes for ledger explorer queries
CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at ON public.ledger_entries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_transaction_id ON public.ledger_entries (transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_debit_account ON public.ledger_entries (debit_account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_credit_account ON public.ledger_entries (credit_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON public.transactions (reference_number);
