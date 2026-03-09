
-- =============================================
-- REFERRAL PROGRAM
-- =============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code) WHERE referral_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_unique_referral_code()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_code TEXT; v_exists BOOLEAN := true;
BEGIN
  WHILE v_exists LOOP
    v_code := UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8));
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = v_code) INTO v_exists;
  END LOOP;
  RETURN v_code;
END; $$;

CREATE OR REPLACE FUNCTION public.assign_referral_code_on_profile_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN NEW.referral_code := public.generate_unique_referral_code(); END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_auto_assign_referral_code
BEFORE INSERT ON public.profiles FOR EACH ROW
EXECUTE FUNCTION public.assign_referral_code_on_profile_insert();

DO $$ DECLARE rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM profiles WHERE referral_code IS NULL LOOP
    UPDATE profiles SET referral_code = public.generate_unique_referral_code() WHERE id = rec.id;
  END LOOP;
END; $$;

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL,
  referred_user_id UUID,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reward_issued BOOLEAN NOT NULL DEFAULT false,
  reward_amount NUMERIC NOT NULL DEFAULT 25.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);
CREATE POLICY "Users can insert referrals as referred" ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referred_user_id);
CREATE POLICY "Admins manage all referrals" ON public.referrals FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.apply_referral_code(p_code TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_referrer_id UUID;
BEGIN
  IF EXISTS(SELECT 1 FROM referrals WHERE referred_user_id = auth.uid()) THEN RAISE EXCEPTION 'You have already used a referral code'; END IF;
  SELECT id INTO v_referrer_id FROM profiles WHERE referral_code = UPPER(TRIM(p_code));
  IF v_referrer_id IS NULL THEN RAISE EXCEPTION 'Invalid referral code'; END IF;
  IF v_referrer_id = auth.uid() THEN RAISE EXCEPTION 'You cannot use your own referral code'; END IF;
  INSERT INTO referrals (referrer_user_id, referred_user_id, referral_code, status)
  VALUES (v_referrer_id, auth.uid(), UPPER(TRIM(p_code)), 'pending');
  INSERT INTO notifications (user_id, type, title, message)
  VALUES (v_referrer_id, 'info', 'New Referral!', 'Someone used your referral code! Reward unlocks after their first transaction.');
  RETURN 'Referral applied! Your referrer will earn $25 after your first transaction.';
END; $$;

-- =============================================
-- CASHBACK REWARDS
-- =============================================
CREATE TABLE IF NOT EXISTS public.cashback_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL,
  cashback_percentage NUMERIC NOT NULL DEFAULT 1.0,
  max_cashback NUMERIC DEFAULT 50.00,
  min_transaction_amount NUMERIC NOT NULL DEFAULT 10.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cashback_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view active cashback rules" ON public.cashback_rules FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage cashback rules" ON public.cashback_rules FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.cashback_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  transaction_id UUID,
  cashback_amount NUMERIC NOT NULL DEFAULT 0,
  reward_type TEXT NOT NULL DEFAULT 'cashback',
  status TEXT NOT NULL DEFAULT 'pending',
  credited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cashback_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own cashback rewards" ON public.cashback_rewards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all cashback rewards" ON public.cashback_rewards FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.auto_record_cashback()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID; v_rule RECORD; v_cashback_amount NUMERIC;
BEGIN
  IF NEW.status != 'completed' THEN RETURN NEW; END IF;
  IF NEW.transaction_type IN ('fee','system','cashback','loan_disbursement','loan_repayment') THEN RETURN NEW; END IF;
  SELECT user_id INTO v_user_id FROM accounts WHERE id = NEW.account_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO v_rule FROM cashback_rules WHERE transaction_type = NEW.transaction_type AND is_active = true AND NEW.amount >= min_transaction_amount ORDER BY cashback_percentage DESC LIMIT 1;
  IF NOT FOUND THEN RETURN NEW; END IF;
  v_cashback_amount := ROUND(NEW.amount * (v_rule.cashback_percentage / 100.0), 2);
  IF v_rule.max_cashback IS NOT NULL THEN v_cashback_amount := LEAST(v_cashback_amount, v_rule.max_cashback); END IF;
  IF v_cashback_amount > 0 THEN
    INSERT INTO cashback_rewards (user_id, transaction_id, cashback_amount, reward_type, status) VALUES (v_user_id, NEW.id, v_cashback_amount, 'cashback', 'pending');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_auto_cashback AFTER INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.auto_record_cashback();

CREATE OR REPLACE FUNCTION public.claim_cashback_reward(p_cashback_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cashback RECORD; v_user_account_id UUID; v_rewards_account_id UUID;
BEGIN
  UPDATE cashback_rewards SET status = 'credited', credited_at = now()
  WHERE id = p_cashback_id AND user_id = auth.uid() AND status = 'pending' RETURNING * INTO v_cashback;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cashback reward not found or already claimed'; END IF;
  SELECT id INTO v_user_account_id FROM accounts WHERE user_id = auth.uid() AND status = 'active' ORDER BY created_at LIMIT 1;
  IF v_user_account_id IS NULL THEN RAISE EXCEPTION 'No active account found'; END IF;
  SELECT id INTO v_rewards_account_id FROM accounts WHERE account_number = '9990000004' AND status = 'active' LIMIT 1;
  IF v_rewards_account_id IS NULL THEN RAISE EXCEPTION 'Rewards system account not configured'; END IF;
  PERFORM public.execute_transaction(v_rewards_account_id, v_user_account_id, v_cashback.cashback_amount, 'cashback', 'Cashback reward credit', auth.uid());
  RETURN '$' || v_cashback.cashback_amount || ' cashback credited to your account';
END; $$;

-- =============================================
-- SAVINGS PRODUCTS & ACCOUNTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.savings_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  interest_rate NUMERIC NOT NULL,
  minimum_balance NUMERIC NOT NULL DEFAULT 0,
  interest_frequency TEXT NOT NULL DEFAULT 'monthly',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.savings_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view active savings products" ON public.savings_products FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage savings products" ON public.savings_products FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.savings_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.savings_products(id),
  account_id UUID REFERENCES public.accounts(id),
  balance NUMERIC NOT NULL DEFAULT 0,
  last_interest_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  total_interest_earned NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.savings_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own savings accounts" ON public.savings_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own savings accounts" ON public.savings_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own savings accounts" ON public.savings_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all savings accounts" ON public.savings_accounts FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.calculate_savings_interest(p_savings_account_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_savings RECORD; v_product RECORD; v_interest_amount NUMERIC; v_rewards_account_id UUID;
BEGIN
  SELECT * INTO v_savings FROM savings_accounts WHERE id = p_savings_account_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Savings account not found'; END IF;
  IF v_savings.status != 'active' THEN RAISE EXCEPTION 'Savings account is not active'; END IF;
  IF v_savings.balance < 1 THEN RAISE EXCEPTION 'Balance too low for interest calculation'; END IF;
  IF v_savings.last_interest_date IS NOT NULL AND v_savings.last_interest_date > (now() - interval '28 days') THEN RAISE EXCEPTION 'Interest already credited this month'; END IF;
  IF v_savings.account_id IS NULL THEN RAISE EXCEPTION 'No linked bank account'; END IF;
  SELECT * INTO v_product FROM savings_products WHERE id = v_savings.product_id;
  v_interest_amount := ROUND(v_savings.balance * (v_product.interest_rate / 100.0 / 12.0), 2);
  IF v_interest_amount <= 0 THEN RAISE EXCEPTION 'Interest amount too small'; END IF;
  SELECT id INTO v_rewards_account_id FROM accounts WHERE account_number = '9990000004' AND status = 'active' LIMIT 1;
  IF v_rewards_account_id IS NULL THEN RAISE EXCEPTION 'Interest disbursement account not found'; END IF;
  PERFORM public.execute_transaction(v_rewards_account_id, v_savings.account_id, v_interest_amount, 'system', 'Monthly savings interest - ' || v_product.name, auth.uid());
  UPDATE savings_accounts SET last_interest_date = now(), total_interest_earned = total_interest_earned + v_interest_amount, updated_at = now() WHERE id = p_savings_account_id;
  RETURN '$' || v_interest_amount || ' interest credited to your account';
END; $$;

-- =============================================
-- FRAUD ALERTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  transaction_id UUID,
  alert_type TEXT NOT NULL,
  risk_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID
);
ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage all fraud alerts" ON public.fraud_alerts FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.detect_transaction_fraud()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID; v_rapid_count INTEGER; v_avg_amount NUMERIC;
BEGIN
  IF NEW.status != 'completed' THEN RETURN NEW; END IF;
  IF NEW.transaction_type IN ('fee','system','cashback','loan_disbursement') THEN RETURN NEW; END IF;
  SELECT user_id INTO v_user_id FROM accounts WHERE id = NEW.account_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.amount > 10000 THEN
    INSERT INTO fraud_alerts (user_id, transaction_id, alert_type, risk_score, details) VALUES (v_user_id, NEW.id, 'large_transaction', 70, jsonb_build_object('amount', NEW.amount, 'threshold', 10000, 'type', NEW.transaction_type));
  END IF;
  IF NEW.transaction_type IN ('transfer','wire_transfer') THEN
    SELECT COUNT(*) INTO v_rapid_count FROM transactions t JOIN accounts a ON a.id = t.account_id WHERE a.user_id = v_user_id AND t.transaction_type IN ('transfer','wire_transfer') AND t.status = 'completed' AND t.created_at >= now() - interval '5 minutes' AND t.id != NEW.id;
    IF v_rapid_count >= 3 THEN
      INSERT INTO fraud_alerts (user_id, transaction_id, alert_type, risk_score, details) VALUES (v_user_id, NEW.id, 'rapid_transfers', 85, jsonb_build_object('count', v_rapid_count + 1, 'window_minutes', 5));
    END IF;
  END IF;
  SELECT COALESCE(AVG(t.amount), 0) INTO v_avg_amount FROM transactions t JOIN accounts a ON a.id = t.account_id WHERE a.user_id = v_user_id AND t.status = 'completed' AND t.transaction_type NOT IN ('fee','system','cashback','loan_disbursement') AND t.created_at >= now() - interval '30 days' AND t.id != NEW.id;
  IF v_avg_amount > 50 AND NEW.amount > (v_avg_amount * 3) AND NEW.amount > 500 THEN
    INSERT INTO fraud_alerts (user_id, transaction_id, alert_type, risk_score, details) VALUES (v_user_id, NEW.id, 'unusual_amount', 55, jsonb_build_object('amount', NEW.amount, 'avg_30d', ROUND(v_avg_amount, 2), 'multiplier', ROUND(NEW.amount / v_avg_amount, 1)));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_fraud_detection AFTER INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.detect_transaction_fraud();

-- =============================================
-- REFERRAL REWARD ON FIRST TRANSACTION
-- =============================================
CREATE OR REPLACE FUNCTION public.process_referral_on_first_transaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID; v_txn_count INTEGER; v_referrer_id UUID; v_referral_reward NUMERIC; v_referrer_account_id UUID; v_rewards_account_id UUID;
BEGIN
  IF NEW.status != 'completed' THEN RETURN NEW; END IF;
  IF NEW.transaction_type IN ('fee','system','cashback','loan_disbursement','loan_repayment') THEN RETURN NEW; END IF;
  SELECT user_id INTO v_user_id FROM accounts WHERE id = NEW.account_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO v_txn_count FROM transactions t JOIN accounts a ON a.id = t.account_id WHERE a.user_id = v_user_id AND t.status = 'completed' AND t.transaction_type NOT IN ('fee','system','cashback','loan_disbursement','loan_repayment') AND t.id != NEW.id;
  IF v_txn_count > 0 THEN RETURN NEW; END IF;
  UPDATE referrals SET status = 'completed', reward_issued = true, updated_at = now() WHERE referred_user_id = v_user_id AND reward_issued = false AND status = 'pending' RETURNING referrer_user_id, reward_amount INTO v_referrer_id, v_referral_reward;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT id INTO v_referrer_account_id FROM accounts WHERE user_id = v_referrer_id AND status = 'active' ORDER BY created_at LIMIT 1;
  SELECT id INTO v_rewards_account_id FROM accounts WHERE account_number = '9990000004' AND status = 'active' LIMIT 1;
  IF v_referrer_account_id IS NULL OR v_rewards_account_id IS NULL THEN RETURN NEW; END IF;
  PERFORM public.execute_transaction(v_rewards_account_id, v_referrer_account_id, v_referral_reward, 'system', 'Referral reward earned', v_referrer_id);
  INSERT INTO notifications (user_id, type, title, message) VALUES (v_referrer_id, 'info', 'Referral Reward!', '$' || v_referral_reward || ' referral bonus credited to your account!');
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_referral_reward AFTER INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.process_referral_on_first_transaction();
