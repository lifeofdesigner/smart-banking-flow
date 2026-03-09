
-- Bill Payments table
CREATE TABLE public.bill_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id),
  category text NOT NULL DEFAULT 'utilities',
  provider text NOT NULL,
  reference_number text,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  transaction_id uuid REFERENCES public.transactions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bill payments" ON public.bill_payments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bill payments" ON public.bill_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all bill payments" ON public.bill_payments
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Cards table
CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id),
  card_number text NOT NULL DEFAULT ('****-****-****-' || LPAD(floor(random() * 10000)::text, 4, '0')),
  card_type text NOT NULL DEFAULT 'debit',
  status text NOT NULL DEFAULT 'active',
  daily_limit numeric NOT NULL DEFAULT 5000,
  frozen_at timestamptz,
  expires_at date NOT NULL DEFAULT (CURRENT_DATE + interval '3 years'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cards" ON public.cards
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own cards" ON public.cards
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all cards" ON public.cards
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Scheduled Transfers table
CREATE TABLE public.scheduled_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_account_id uuid NOT NULL REFERENCES public.accounts(id),
  to_account_id uuid NOT NULL REFERENCES public.accounts(id),
  amount numeric NOT NULL,
  frequency text NOT NULL DEFAULT 'once',
  next_run_date date NOT NULL,
  last_run_date date,
  status text NOT NULL DEFAULT 'active',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own scheduled transfers" ON public.scheduled_transfers
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all scheduled transfers" ON public.scheduled_transfers
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Investments table
CREATE TABLE public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id),
  product_name text NOT NULL,
  investment_type text NOT NULL DEFAULT 'fixed_deposit',
  principal numeric NOT NULL,
  current_value numeric NOT NULL DEFAULT 0,
  interest_rate numeric NOT NULL DEFAULT 5.0,
  maturity_date date,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own investments" ON public.investments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own investments" ON public.investments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all investments" ON public.investments
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Auto-create a card for new accounts
CREATE OR REPLACE FUNCTION public.handle_new_account_card()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NEW.account_type IN ('savings', 'checking') THEN
    INSERT INTO public.cards (user_id, account_id)
    VALUES (NEW.user_id, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_account_created_card
  AFTER INSERT ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION handle_new_account_card();

-- Bill payment processing function
CREATE OR REPLACE FUNCTION public.pay_bill(
  p_account_id uuid,
  p_category text,
  p_provider text,
  p_amount numeric,
  p_reference text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_revenue_account_id uuid;
  v_txn_id uuid;
  v_bill_id uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM accounts WHERE id = p_account_id;
  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Account not found or not owned by user';
  END IF;

  SELECT id INTO v_revenue_account_id FROM accounts WHERE account_number = '9990000003' AND status = 'active' LIMIT 1;
  IF v_revenue_account_id IS NULL THEN RAISE EXCEPTION 'Bill payment system account not configured'; END IF;

  v_txn_id := public.execute_transaction(
    p_account_id, v_revenue_account_id, p_amount,
    'bill_payment', 'Bill payment: ' || p_provider || ' (' || p_category || ')',
    auth.uid()
  );

  INSERT INTO bill_payments (user_id, account_id, category, provider, reference_number, amount, status, transaction_id)
  VALUES (auth.uid(), p_account_id, p_category, p_provider, COALESCE(p_reference, 'BP-' || substr(gen_random_uuid()::text, 1, 8)), p_amount, 'completed', v_txn_id)
  RETURNING id INTO v_bill_id;

  RETURN v_bill_id;
END;
$$;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_debit ON public.ledger_entries(debit_account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_credit ON public.ledger_entries(credit_account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_transaction ON public.ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON public.loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_bill_payments_user_id ON public.bill_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON public.cards(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON public.investments(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status ON public.fraud_alerts(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
