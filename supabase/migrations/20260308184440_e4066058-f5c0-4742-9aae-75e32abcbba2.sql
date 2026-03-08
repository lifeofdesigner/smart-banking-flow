
-- ============================================================
-- PHASE 1: Core Banking Ledger Engine (complete)
-- ============================================================

-- 1. Create enum
CREATE TYPE public.account_type_category AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');

-- 2. Create account_types table
CREATE TABLE public.account_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  category account_type_category NOT NULL,
  is_user_facing boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.account_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read account_types"
  ON public.account_types FOR SELECT TO authenticated USING (true);

-- 3. Seed account types
INSERT INTO public.account_types (name, category, is_user_facing) VALUES
  ('Savings Account', 'asset', true),
  ('Checking Account', 'asset', true),
  ('Loan Receivable', 'asset', false),
  ('System Float', 'asset', false),
  ('Fee Revenue', 'revenue', false),
  ('Interest Revenue', 'revenue', false),
  ('Suspense Account', 'liability', false);

-- 4. Modify accounts table
ALTER TABLE public.accounts DROP CONSTRAINT accounts_account_type_check;
ALTER TABLE public.accounts ADD CONSTRAINT accounts_account_type_check 
  CHECK (account_type = ANY (ARRAY['savings', 'current', 'fixed_deposit', 'checking', 'system']));
ALTER TABLE public.accounts ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.accounts ADD COLUMN account_type_id uuid REFERENCES public.account_types(id);

-- 5. Backfill existing accounts
UPDATE public.accounts SET account_type_id = (SELECT id FROM public.account_types WHERE name = 'Savings Account') WHERE account_type = 'savings';
UPDATE public.accounts SET account_type_id = (SELECT id FROM public.account_types WHERE name = 'Checking Account') WHERE account_type = 'checking';
UPDATE public.accounts SET account_type_id = (SELECT id FROM public.account_types WHERE name = 'Savings Account') WHERE account_type_id IS NULL AND user_id IS NOT NULL;

-- 6. Create system accounts
INSERT INTO public.accounts (account_number, account_type, account_type_id, user_id, currency, status)
VALUES
  ('SYS-FLOAT-001', 'system', (SELECT id FROM public.account_types WHERE name = 'System Float'), NULL, 'USD', 'active'),
  ('SYS-FEEREV-001', 'system', (SELECT id FROM public.account_types WHERE name = 'Fee Revenue'), NULL, 'USD', 'active'),
  ('SYS-INTREV-001', 'system', (SELECT id FROM public.account_types WHERE name = 'Interest Revenue'), NULL, 'USD', 'active'),
  ('SYS-SUSPENSE-001', 'system', (SELECT id FROM public.account_types WHERE name = 'Suspense Account'), NULL, 'USD', 'active');

-- 7. Create ledger_entries table (append-only)
CREATE TABLE public.ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.transactions(id) NOT NULL,
  debit_account_id uuid REFERENCES public.accounts(id) NOT NULL,
  credit_account_id uuid REFERENCES public.accounts(id) NOT NULL,
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_debit_account ON public.ledger_entries(debit_account_id);
CREATE INDEX idx_ledger_credit_account ON public.ledger_entries(credit_account_id);
CREATE INDEX idx_ledger_transaction ON public.ledger_entries(transaction_id);
CREATE INDEX idx_ledger_created_at ON public.ledger_entries(created_at);
CREATE INDEX idx_accounts_account_type ON public.accounts(account_type_id);
CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);

ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all ledger entries"
  ON public.ledger_entries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert ledger entries"
  ON public.ledger_entries FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own ledger entries"
  ON public.ledger_entries FOR SELECT TO authenticated
  USING (
    debit_account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid())
    OR credit_account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid())
  );

-- 8. Create get_account_balance function
-- Balance = legacy balance + SUM(debits) - SUM(credits)
-- This allows backward compat with existing balance column while transitioning to ledger
CREATE OR REPLACE FUNCTION public.get_account_balance(p_account_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE((SELECT balance FROM accounts WHERE id = p_account_id), 0)
    + COALESCE((SELECT SUM(amount) FROM ledger_entries WHERE debit_account_id = p_account_id), 0)
    - COALESCE((SELECT SUM(amount) FROM ledger_entries WHERE credit_account_id = p_account_id), 0)
$$;

-- 9. Update handle_new_user to include account_type_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  );
  
  INSERT INTO public.accounts (user_id, account_number, account_type, account_type_id, balance)
  VALUES (
    NEW.id,
    generate_account_number(),
    'savings',
    (SELECT id FROM public.account_types WHERE name = 'Savings Account'),
    5000.00
  );
  
  RETURN NEW;
END;
$$;
