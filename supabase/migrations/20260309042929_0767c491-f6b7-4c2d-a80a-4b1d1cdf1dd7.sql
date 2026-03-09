
-- Currency rates table for multi-currency support
CREATE TABLE public.currency_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text NOT NULL DEFAULT 'USD',
  target_currency text NOT NULL,
  rate numeric NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(base_currency, target_currency)
);

ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view currency rates"
  ON public.currency_rates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage currency rates"
  ON public.currency_rates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Support tickets table
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  admin_reply text,
  replied_at timestamptz,
  replied_by uuid,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all tickets"
  ON public.support_tickets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ATM withdrawal codes table
CREATE TABLE public.atm_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES public.accounts(id),
  amount numeric NOT NULL,
  withdrawal_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  used_at timestamptz,
  transaction_id uuid REFERENCES public.transactions(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.atm_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdrawals"
  ON public.atm_withdrawals FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own withdrawals"
  ON public.atm_withdrawals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all withdrawals"
  ON public.atm_withdrawals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ATM withdrawal function
CREATE OR REPLACE FUNCTION public.request_atm_withdrawal(p_account_id uuid, p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_balance numeric;
  v_code text;
  v_withdrawal_id uuid;
  v_bank_account_id uuid;
  v_txn_id uuid;
BEGIN
  -- Verify ownership
  SELECT user_id INTO v_user_id FROM accounts WHERE id = p_account_id;
  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Account not found or not owned by user';
  END IF;

  -- Check balance
  v_balance := public.get_account_balance(p_account_id);
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Available: $%', v_balance;
  END IF;

  IF p_amount <= 0 OR p_amount > 5000 THEN
    RAISE EXCEPTION 'Withdrawal amount must be between $1 and $5,000';
  END IF;

  -- Generate 6-digit code
  v_code := LPAD(floor(random() * 1000000)::text, 6, '0');

  -- Get bank ATM account
  SELECT id INTO v_bank_account_id FROM accounts WHERE account_number = '9990000003' AND status = 'active' LIMIT 1;
  IF v_bank_account_id IS NULL THEN RAISE EXCEPTION 'ATM system account not configured'; END IF;

  -- Execute transaction
  v_txn_id := public.execute_transaction(
    p_account_id, v_bank_account_id, p_amount,
    'withdrawal', 'ATM withdrawal request', auth.uid()
  );

  -- Store withdrawal record
  INSERT INTO atm_withdrawals (user_id, account_id, amount, withdrawal_code, transaction_id)
  VALUES (auth.uid(), p_account_id, p_amount, v_code, v_txn_id)
  RETURNING id INTO v_withdrawal_id;

  -- Notify user
  INSERT INTO notifications (user_id, type, title, message)
  VALUES (auth.uid(), 'info', 'ATM Withdrawal Code', 'Your withdrawal code is: ' || v_code || '. Valid for 30 minutes.');

  RETURN jsonb_build_object('withdrawal_id', v_withdrawal_id, 'code', v_code, 'expires_in_minutes', 30);
END;
$$;

-- Seed default currency rates
INSERT INTO public.currency_rates (base_currency, target_currency, rate) VALUES
  ('USD', 'EUR', 0.92),
  ('USD', 'GBP', 0.79),
  ('USD', 'NGN', 1550.00),
  ('EUR', 'USD', 1.09),
  ('EUR', 'GBP', 0.86),
  ('EUR', 'NGN', 1685.00),
  ('GBP', 'USD', 1.27),
  ('GBP', 'EUR', 1.16),
  ('GBP', 'NGN', 1960.00),
  ('NGN', 'USD', 0.000645),
  ('NGN', 'EUR', 0.000594),
  ('NGN', 'GBP', 0.000510);

-- Add indexes
CREATE INDEX idx_currency_rates_pair ON public.currency_rates(base_currency, target_currency);
CREATE INDEX idx_support_tickets_user ON public.support_tickets(user_id, status);
CREATE INDEX idx_atm_withdrawals_user ON public.atm_withdrawals(user_id, status);
