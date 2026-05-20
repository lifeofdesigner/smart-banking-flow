-- Demo seed data for Smart Banking App.
-- Run after all Supabase migrations.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_admin_id uuid := '00000000-0000-4000-8000-000000000001';
  v_customer_id uuid := '00000000-0000-4000-8000-000000000002';
  v_customer_savings_id uuid := '00000000-0000-4000-8000-000000001001';
  v_customer_checking_id uuid := '00000000-0000-4000-8000-000000001002';
  v_admin_account_id uuid := '00000000-0000-4000-8000-000000001003';
  v_personal_loan_product_id uuid;
  v_savings_type_id uuid;
  v_checking_type_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES
    (
      '00000000-0000-0000-0000-000000000000',
      v_admin_id,
      'authenticated',
      'authenticated',
      'admin@halverixbank.com',
      crypt('DemoAdmin123!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Demo Admin"}'::jsonb,
      now(),
      now()
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      v_customer_id,
      'authenticated',
      'authenticated',
      'customer@halverixbank.com',
      crypt('DemoCustomer123!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Demo Customer"}'::jsonb,
      now(),
      now()
    )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES
    (
      '00000000-0000-4000-8000-000000005001',
      v_admin_id,
      v_admin_id::text,
      jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@halverixbank.com'),
      'email',
      now(),
      now(),
      now()
    ),
    (
      '00000000-0000-4000-8000-000000005002',
      v_customer_id,
      v_customer_id::text,
      jsonb_build_object('sub', v_customer_id::text, 'email', 'customer@halverixbank.com'),
      'email',
      now(),
      now(),
      now()
    )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    updated_at = now();

  UPDATE auth.users
  SET
    confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change = coalesce(email_change, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    phone_change = coalesce(phone_change, ''),
    phone_change_token = coalesce(phone_change_token, ''),
    reauthentication_token = coalesce(reauthentication_token, ''),
    email_change_confirm_status = coalesce(email_change_confirm_status, 0),
    is_sso_user = coalesce(is_sso_user, false),
    is_anonymous = coalesce(is_anonymous, false)
  WHERE id IN (v_admin_id, v_customer_id);

  INSERT INTO public.profiles (id, full_name, email, phone, address, kyc_status)
  VALUES
    (v_admin_id, 'Demo Admin', 'admin@halverixbank.com', '+1 555 0100', '100 Admin Avenue', 'verified'),
    (v_customer_id, 'Demo Customer', 'customer@halverixbank.com', '+1 555 0200', '200 Customer Street', 'verified')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    kyc_status = EXCLUDED.kyc_status,
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES
    (v_admin_id, 'admin'::public.app_role),
    (v_customer_id, 'user'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  SELECT id INTO v_savings_type_id FROM public.account_types WHERE name = 'Savings Account' LIMIT 1;
  SELECT id INTO v_checking_type_id FROM public.account_types WHERE name = 'Checking Account' LIMIT 1;

  INSERT INTO public.accounts (
    id,
    user_id,
    account_number,
    account_type,
    account_type_id,
    balance,
    available_balance,
    ledger_balance,
    currency,
    status
  ) VALUES
    (v_customer_savings_id, v_customer_id, '1002003001', 'savings', v_savings_type_id, 12500.00, 12500.00, 12500.00, 'USD', 'active'),
    (v_customer_checking_id, v_customer_id, '1002003002', 'checking', v_checking_type_id, 7400.00, 7400.00, 7400.00, 'USD', 'active'),
    (v_admin_account_id, v_admin_id, '1002003999', 'checking', v_checking_type_id, 25000.00, 25000.00, 25000.00, 'USD', 'active')
  ON CONFLICT (id) DO UPDATE SET
    balance = EXCLUDED.balance,
    available_balance = EXCLUDED.available_balance,
    ledger_balance = EXCLUDED.ledger_balance,
    status = EXCLUDED.status,
    updated_at = now();

  INSERT INTO public.transactions (id, account_id, transaction_type, amount, description, reference_number, status, created_at)
  VALUES
    ('00000000-0000-4000-8000-000000002001', v_customer_savings_id, 'deposit', 5000.00, 'Opening deposit', 'DEMO-TXN-001', 'completed', now() - interval '18 days'),
    ('00000000-0000-4000-8000-000000002002', v_customer_savings_id, 'deposit', 2500.00, 'Payroll deposit', 'DEMO-TXN-002', 'completed', now() - interval '14 days'),
    ('00000000-0000-4000-8000-000000002003', v_customer_checking_id, 'transfer', 1200.00, 'Transfer from savings', 'DEMO-TXN-003', 'completed', now() - interval '12 days'),
    ('00000000-0000-4000-8000-000000002004', v_customer_checking_id, 'bill_payment', 185.25, 'Utility bill payment', 'DEMO-TXN-004', 'completed', now() - interval '10 days'),
    ('00000000-0000-4000-8000-000000002005', v_customer_checking_id, 'airtime', 45.00, 'Mobile airtime purchase', 'DEMO-TXN-005', 'completed', now() - interval '9 days'),
    ('00000000-0000-4000-8000-000000002006', v_customer_savings_id, 'withdrawal', 300.00, 'ATM cash withdrawal', 'DEMO-TXN-006', 'completed', now() - interval '7 days'),
    ('00000000-0000-4000-8000-000000002007', v_customer_checking_id, 'deposit', 1800.00, 'Client payment', 'DEMO-TXN-007', 'completed', now() - interval '5 days'),
    ('00000000-0000-4000-8000-000000002008', v_customer_savings_id, 'transfer', 650.00, 'Savings goal contribution', 'DEMO-TXN-008', 'completed', now() - interval '3 days'),
    ('00000000-0000-4000-8000-000000002009', v_customer_checking_id, 'wire_transfer', 950.00, 'International supplier payment', 'DEMO-TXN-009', 'pending', now() - interval '2 days'),
    ('00000000-0000-4000-8000-000000002010', v_customer_savings_id, 'deposit', 2200.00, 'Bonus deposit', 'DEMO-TXN-010', 'completed', now() - interval '1 day')
  ON CONFLICT (id) DO UPDATE SET
    amount = EXCLUDED.amount,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    created_at = EXCLUDED.created_at;

  SELECT id INTO v_personal_loan_product_id
  FROM public.loan_products
  WHERE name = 'Personal Loan'
  LIMIT 1;

  INSERT INTO public.loans (
    id,
    user_id,
    product_id,
    principal,
    interest_rate,
    total_payable,
    monthly_payment,
    term_months,
    status,
    disbursement_account_id
  ) VALUES (
    '00000000-0000-4000-8000-000000003001',
    v_customer_id,
    v_personal_loan_product_id,
    5000.00,
    12.50,
    5625.00,
    468.75,
    12,
    'pending',
    v_customer_checking_id
  )
  ON CONFLICT (id) DO UPDATE SET
    principal = EXCLUDED.principal,
    interest_rate = EXCLUDED.interest_rate,
    total_payable = EXCLUDED.total_payable,
    monthly_payment = EXCLUDED.monthly_payment,
    term_months = EXCLUDED.term_months,
    status = EXCLUDED.status,
    disbursement_account_id = EXCLUDED.disbursement_account_id;

  INSERT INTO public.savings_goals (
    id,
    user_id,
    name,
    description,
    target_amount,
    current_amount,
    deadline,
    color,
    status
  ) VALUES (
    '00000000-0000-4000-8000-000000004001',
    v_customer_id,
    'Emergency Fund',
    'Demo savings goal for three months of expenses',
    10000.00,
    3200.00,
    CURRENT_DATE + interval '6 months',
    '#2563EB',
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    target_amount = EXCLUDED.target_amount,
    current_amount = EXCLUDED.current_amount,
    deadline = EXCLUDED.deadline,
    color = EXCLUDED.color,
    status = EXCLUDED.status,
    updated_at = now();
END $$;
