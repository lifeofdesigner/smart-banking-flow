
-- Add 'revenue' to the allowed account types
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_account_type_check;
ALTER TABLE public.accounts ADD CONSTRAINT accounts_account_type_check 
  CHECK (account_type = ANY (ARRAY[
    'savings', 'current', 'fixed_deposit', 'checking', 'system',
    'loan_disbursement', 'loan_repayment', 'revenue'
  ]));
