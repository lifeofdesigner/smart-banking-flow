-- Seed historical investments (2020-2025) for existing profiles
DO $$
DECLARE
  v_user RECORD;
  v_account_id uuid;
BEGIN
  FOR v_user IN SELECT id FROM public.profiles LOOP
    -- Only seed if the user has no investments yet
    IF NOT EXISTS (SELECT 1 FROM public.investments WHERE user_id = v_user.id) THEN
      SELECT id INTO v_account_id FROM public.accounts WHERE user_id = v_user.id LIMIT 1;

      INSERT INTO public.investments (user_id, account_id, product_name, investment_type, principal, current_value, interest_rate, maturity_date, status, created_at)
      VALUES
        -- 2020 (Good)
        (v_user.id, v_account_id, 'S&P 500 Global Index Fund', 'money_market', 35000, 58450, 11.8, '2026-04-15', 'active', '2020-04-15 09:00:00+00'),
        (v_user.id, v_account_id, 'U.S. Treasury 5-Year High-Yield Note', 'treasury_bills', 25000, 31875, 5.5, '2025-06-10', 'matured', '2020-06-10 10:30:00+00'),
        (v_user.id, v_account_id, 'Apple & Microsoft Blue-Chip Strategy', 'money_market', 20000, 34200, 14.2, '2025-11-20', 'matured', '2020-11-20 14:15:00+00'),

        -- 2021 (Mixed)
        (v_user.id, v_account_id, 'Clean Energy & Sustainability ETF', 'money_market', 15000, 21450, 8.6, '2026-02-18', 'active', '2021-02-18 11:00:00+00'),
        (v_user.id, v_account_id, 'Commercial Real Estate REIT Fund', 'money_market', 22000, 14300, 3.0, '2026-08-14', 'active', '2021-08-14 13:45:00+00'),
        (v_user.id, v_account_id, 'Emerging Markets Small-Cap Index', 'money_market', 16000, 10880, 2.5, '2024-10-25', 'matured', '2021-10-25 16:20:00+00'),

        -- 2022 (Bad/Underperforming)
        (v_user.id, v_account_id, 'Speculative BioTech Growth Fund', 'money_market', 14000, 7700, 1.8, '2025-03-08', 'matured', '2022-03-08 09:30:00+00'),
        (v_user.id, v_account_id, 'FinTech Disruptors Venture Basket', 'money_market', 12000, 7440, 2.0, '2027-07-19', 'active', '2022-07-19 15:10:00+00'),
        (v_user.id, v_account_id, 'Global Macro Hedge Note (2022 Series)', 'fixed_deposit', 10000, 7200, 2.2, '2025-11-04', 'matured', '2022-11-04 12:00:00+00'),

        -- 2023 (Good)
        (v_user.id, v_account_id, 'Canadian Infrastructure Growth Note', 'fixed_deposit', 18000, 20700, 6.0, '2027-01-10', 'active', '2023-01-10 10:00:00+00'),
        (v_user.id, v_account_id, 'Global Semiconductor & AI Growth Fund', 'money_market', 12500, 19375, 15.4, '2028-05-12', 'active', '2023-05-12 14:40:00+00'),

        -- 2024 - 2025 (Mixed)
        (v_user.id, v_account_id, 'Consumer Discretionary Retail ETF', 'money_market', 8500, 6970, 2.8, '2026-02-15', 'active', '2024-02-15 09:15:00+00'),
        (v_user.id, v_account_id, 'Berkshire Core Equity Strategy', 'money_market', 22000, 25740, 8.5, '2027-03-20', 'active', '2024-03-20 11:30:00+00'),
        (v_user.id, v_account_id, 'North American 2-Year Guaranteed Certificate', 'fixed_deposit', 15000, 16050, 5.2, '2027-01-15', 'active', '2025-01-15 08:45:00+00');
    END IF;
  END LOOP;
END;
$$;
