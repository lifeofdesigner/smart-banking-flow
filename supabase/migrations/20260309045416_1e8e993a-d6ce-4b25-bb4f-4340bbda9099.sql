-- Create system accounts for investment pool and savings vault using valid account types
INSERT INTO accounts (account_number, account_type, user_id, balance, available_balance, ledger_balance, status, currency)
VALUES 
  ('9990000005', 'system', NULL, 0, 0, 0, 'active', 'USD'),
  ('9990000006', 'system', NULL, 0, 0, 0, 'active', 'USD')
ON CONFLICT (account_number) DO NOTHING;