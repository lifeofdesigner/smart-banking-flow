
-- Loan Products table
CREATE TABLE public.loan_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  interest_rate numeric NOT NULL,
  min_amount numeric NOT NULL DEFAULT 100,
  max_amount numeric NOT NULL,
  term_months integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.loan_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view active loan products" ON public.loan_products FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can manage loan products" ON public.loan_products FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Loans table
CREATE TABLE public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.loan_products(id),
  principal numeric NOT NULL,
  interest_rate numeric NOT NULL,
  total_payable numeric NOT NULL,
  monthly_payment numeric NOT NULL,
  term_months integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  disbursement_account_id uuid REFERENCES public.accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid
);
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own loans" ON public.loans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own loans" ON public.loans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all loans" ON public.loans FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all loans" ON public.loans FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Loan Repayments table
CREATE TABLE public.loan_repayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  installment_number integer NOT NULL,
  amount_due numeric NOT NULL,
  principal_portion numeric NOT NULL,
  interest_portion numeric NOT NULL,
  amount_paid numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  paid_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.loan_repayments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own repayments" ON public.loan_repayments FOR SELECT TO authenticated USING (loan_id IN (SELECT id FROM public.loans WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view all repayments" ON public.loan_repayments FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update repayments" ON public.loan_repayments FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON public.loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_loan_id ON public.loan_repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_due_date ON public.loan_repayments(due_date);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_status ON public.loan_repayments(status);

-- Seed loan products
INSERT INTO public.loan_products (name, description, interest_rate, min_amount, max_amount, term_months) VALUES
('Personal Loan', 'General purpose personal loan with competitive rates', 12.5, 500, 25000, 12),
('Business Loan', 'Grow your business with flexible financing', 10.0, 1000, 50000, 24),
('Emergency Loan', 'Quick access funds for emergencies', 15.0, 100, 5000, 6),
('Education Loan', 'Invest in your future with education financing', 8.0, 500, 30000, 36);

-- Insert bank loan disbursement account (account_type constraint now allows 'loan_disbursement')
INSERT INTO public.accounts (account_number, account_type, user_id, balance, available_balance, ledger_balance, status)
VALUES ('9990000001', 'loan_disbursement', NULL, 1000000, 1000000, 1000000, 'active')
ON CONFLICT DO NOTHING;

-- Insert loan repayment collection account
INSERT INTO public.accounts (account_number, account_type, user_id, balance, available_balance, ledger_balance, status)
VALUES ('9990000002', 'loan_repayment', NULL, 0, 0, 0, 'active')
ON CONFLICT DO NOTHING;
