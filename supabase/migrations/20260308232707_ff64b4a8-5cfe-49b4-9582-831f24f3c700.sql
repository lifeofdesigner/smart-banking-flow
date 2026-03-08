
-- ==========================================
-- CRITICAL INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_account_number ON public.accounts (account_number);

CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions (account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions (created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_account_created ON public.transactions (account_id, created_at);

CREATE INDEX IF NOT EXISTS idx_ledger_debit_created ON public.ledger_entries (debit_account_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_credit_created ON public.ledger_entries (credit_account_id, created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, read);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_user_id ON public.beneficiaries (user_id);

CREATE INDEX IF NOT EXISTS idx_transfer_limits_account_id ON public.transfer_limits (account_id);

CREATE INDEX IF NOT EXISTS idx_wire_transfers_user_id ON public.wire_transfers (user_id);
CREATE INDEX IF NOT EXISTS idx_wire_transfers_status ON public.wire_transfers (status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at);

-- ==========================================
-- MATERIALIZED BALANCE COLUMNS
-- ==========================================

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS available_balance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ledger_balance numeric NOT NULL DEFAULT 0;

-- Initialize from existing data
UPDATE public.accounts a SET
  ledger_balance = a.balance
    + COALESCE((SELECT SUM(amount) FROM ledger_entries WHERE debit_account_id = a.id), 0)
    - COALESCE((SELECT SUM(amount) FROM ledger_entries WHERE credit_account_id = a.id), 0),
  available_balance = a.balance
    + COALESCE((SELECT SUM(amount) FROM ledger_entries WHERE debit_account_id = a.id), 0)
    - COALESCE((SELECT SUM(amount) FROM ledger_entries WHERE credit_account_id = a.id), 0);

-- Trigger to auto-update balances on ledger entry insert
CREATE OR REPLACE FUNCTION public.update_account_balances_on_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Decrease debit account (money leaving)
  UPDATE accounts
  SET ledger_balance = ledger_balance + NEW.amount,
      available_balance = available_balance + NEW.amount,
      updated_at = now()
  WHERE id = NEW.debit_account_id;

  -- Increase credit account (money arriving)
  UPDATE accounts
  SET ledger_balance = ledger_balance - NEW.amount,
      available_balance = available_balance - NEW.amount,
      updated_at = now()
  WHERE id = NEW.credit_account_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_balances_on_ledger ON public.ledger_entries;
CREATE TRIGGER trg_update_balances_on_ledger
  AFTER INSERT ON public.ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_account_balances_on_ledger();
