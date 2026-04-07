-- Fix missing budgets table and RPCs used by frontend pages

-- =====================================================
-- 1) Budgets table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category text NOT NULL,
  monthly_limit numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT budgets_monthly_limit_check CHECK (monthly_limit >= 0),
  CONSTRAINT budgets_user_category_unique UNIQUE (user_id, category)
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budgets"
  ON public.budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets"
  ON public.budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
  ON public.budgets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
  ON public.budgets FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_budgets_updated_at ON public.budgets;
CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_category ON public.budgets(user_id, category);

-- =====================================================
-- 2) Ensure system accounts used by new RPCs exist
-- =====================================================
INSERT INTO public.accounts (
  account_number,
  account_type,
  user_id,
  balance,
  available_balance,
  ledger_balance,
  status,
  currency
)
SELECT
  '9990000011',
  'revenue',
  NULL,
  0,
  0,
  0,
  'active',
  'USD'
WHERE NOT EXISTS (
  SELECT 1 FROM public.accounts WHERE account_number = '9990000011'
);

INSERT INTO public.accounts (
  account_number,
  account_type,
  user_id,
  balance,
  available_balance,
  ledger_balance,
  status,
  currency
)
SELECT
  '9990000012',
  'revenue',
  NULL,
  0,
  0,
  0,
  'active',
  'USD'
WHERE NOT EXISTS (
  SELECT 1 FROM public.accounts WHERE account_number = '9990000012'
);

-- =====================================================
-- 3) RPC: invest_funds
-- Signature expected by src/pages/Investments.tsx
-- =====================================================
CREATE OR REPLACE FUNCTION public.invest_funds(
  p_account_id uuid,
  p_product_name text,
  p_investment_type text,
  p_amount numeric,
  p_months integer
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_account_user_id uuid;
  v_account_status text;
  v_pool_account_id uuid;
  v_interest_rate numeric;
  v_maturity_date date;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Investment amount must be greater than zero';
  END IF;

  IF p_months IS NULL OR p_months <= 0 THEN
    RAISE EXCEPTION 'Investment term must be at least 1 month';
  END IF;

  SELECT user_id, status
  INTO v_account_user_id, v_account_status
  FROM public.accounts
  WHERE id = p_account_id;

  IF v_account_user_id IS NULL OR v_account_user_id <> v_user_id THEN
    RAISE EXCEPTION 'Account not found or not owned by user';
  END IF;

  IF COALESCE(v_account_status, 'inactive') <> 'active' THEN
    RAISE EXCEPTION 'Selected account is not active';
  END IF;

  SELECT id
  INTO v_pool_account_id
  FROM public.accounts
  WHERE account_number = '9990000011' AND status = 'active'
  LIMIT 1;

  IF v_pool_account_id IS NULL THEN
    RAISE EXCEPTION 'Investment pool account is not configured';
  END IF;

  v_interest_rate := CASE p_investment_type
    WHEN 'fixed_deposit' THEN 8.5
    WHEN 'money_market' THEN 6.5
    WHEN 'treasury_bills' THEN 7.0
    ELSE 5.0
  END;

  v_maturity_date := (CURRENT_DATE + (p_months || ' months')::interval)::date;

  PERFORM public.execute_transaction(
    p_account_id,
    v_pool_account_id,
    p_amount,
    'transfer',
    'Investment funding - ' || COALESCE(NULLIF(trim(p_product_name), ''), 'Investment'),
    v_user_id
  );

  INSERT INTO public.investments (
    user_id,
    account_id,
    product_name,
    investment_type,
    principal,
    current_value,
    interest_rate,
    maturity_date,
    status
  )
  VALUES (
    v_user_id,
    p_account_id,
    COALESCE(NULLIF(trim(p_product_name), ''), 'Investment'),
    COALESCE(NULLIF(trim(p_investment_type), ''), 'fixed_deposit'),
    p_amount,
    p_amount,
    v_interest_rate,
    v_maturity_date,
    'active'
  );

  RETURN 'Investment created successfully';
END;
$$;

-- =====================================================
-- 4) RPC: contribute_to_savings_goal
-- Signature expected by src/pages/SavingsGoals.tsx
-- =====================================================
CREATE OR REPLACE FUNCTION public.contribute_to_savings_goal(
  p_goal_id uuid,
  p_account_id uuid,
  p_amount numeric
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_goal record;
  v_account_user_id uuid;
  v_account_status text;
  v_pool_account_id uuid;
  v_new_amount numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Contribution amount must be greater than zero';
  END IF;

  SELECT *
  INTO v_goal
  FROM public.savings_goals
  WHERE id = p_goal_id
  FOR UPDATE;

  IF v_goal IS NULL THEN
    RAISE EXCEPTION 'Savings goal not found';
  END IF;

  IF v_goal.user_id <> v_user_id THEN
    RAISE EXCEPTION 'You do not own this savings goal';
  END IF;

  IF v_goal.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot contribute to a cancelled goal';
  END IF;

  SELECT user_id, status
  INTO v_account_user_id, v_account_status
  FROM public.accounts
  WHERE id = p_account_id;

  IF v_account_user_id IS NULL OR v_account_user_id <> v_user_id THEN
    RAISE EXCEPTION 'Account not found or not owned by user';
  END IF;

  IF COALESCE(v_account_status, 'inactive') <> 'active' THEN
    RAISE EXCEPTION 'Selected account is not active';
  END IF;

  SELECT id
  INTO v_pool_account_id
  FROM public.accounts
  WHERE account_number = '9990000012' AND status = 'active'
  LIMIT 1;

  IF v_pool_account_id IS NULL THEN
    RAISE EXCEPTION 'Savings pool account is not configured';
  END IF;

  PERFORM public.execute_transaction(
    p_account_id,
    v_pool_account_id,
    p_amount,
    'transfer',
    'Savings contribution - ' || v_goal.name,
    v_user_id
  );

  v_new_amount := COALESCE(v_goal.current_amount, 0) + p_amount;

  UPDATE public.savings_goals
  SET
    current_amount = v_new_amount,
    status = CASE
      WHEN v_new_amount >= target_amount THEN 'completed'
      ELSE 'active'
    END,
    updated_at = now()
  WHERE id = p_goal_id;

  RETURN 'Contribution processed successfully';
END;
$$;

-- =====================================================
-- 5) RPC: withdraw_from_savings_goal
-- Signature expected by src/pages/SavingsGoals.tsx
-- =====================================================
CREATE OR REPLACE FUNCTION public.withdraw_from_savings_goal(
  p_goal_id uuid,
  p_account_id uuid,
  p_amount numeric
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_goal record;
  v_account_user_id uuid;
  v_account_status text;
  v_pool_account_id uuid;
  v_new_amount numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Withdrawal amount must be greater than zero';
  END IF;

  SELECT *
  INTO v_goal
  FROM public.savings_goals
  WHERE id = p_goal_id
  FOR UPDATE;

  IF v_goal IS NULL THEN
    RAISE EXCEPTION 'Savings goal not found';
  END IF;

  IF v_goal.user_id <> v_user_id THEN
    RAISE EXCEPTION 'You do not own this savings goal';
  END IF;

  IF COALESCE(v_goal.current_amount, 0) < p_amount THEN
    RAISE EXCEPTION 'Insufficient saved amount in this goal';
  END IF;

  SELECT user_id, status
  INTO v_account_user_id, v_account_status
  FROM public.accounts
  WHERE id = p_account_id;

  IF v_account_user_id IS NULL OR v_account_user_id <> v_user_id THEN
    RAISE EXCEPTION 'Account not found or not owned by user';
  END IF;

  IF COALESCE(v_account_status, 'inactive') <> 'active' THEN
    RAISE EXCEPTION 'Selected account is not active';
  END IF;

  SELECT id
  INTO v_pool_account_id
  FROM public.accounts
  WHERE account_number = '9990000012' AND status = 'active'
  LIMIT 1;

  IF v_pool_account_id IS NULL THEN
    RAISE EXCEPTION 'Savings pool account is not configured';
  END IF;

  PERFORM public.execute_transaction(
    v_pool_account_id,
    p_account_id,
    p_amount,
    'transfer',
    'Savings withdrawal - ' || v_goal.name,
    v_user_id
  );

  v_new_amount := COALESCE(v_goal.current_amount, 0) - p_amount;

  UPDATE public.savings_goals
  SET
    current_amount = v_new_amount,
    status = CASE
      WHEN v_new_amount >= target_amount THEN 'completed'
      ELSE 'active'
    END,
    updated_at = now()
  WHERE id = p_goal_id;

  RETURN 'Withdrawal processed successfully';
END;
$$;
