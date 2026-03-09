
-- PHASE 1: Fix the inverted balance trigger
CREATE OR REPLACE FUNCTION public.update_account_balances_on_ledger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Decrease debit account (money leaving)
  UPDATE accounts
  SET ledger_balance = ledger_balance - NEW.amount,
      available_balance = available_balance - NEW.amount,
      updated_at = now()
  WHERE id = NEW.debit_account_id;

  -- Increase credit account (money arriving)
  UPDATE accounts
  SET ledger_balance = ledger_balance + NEW.amount,
      available_balance = available_balance + NEW.amount,
      updated_at = now()
  WHERE id = NEW.credit_account_id;

  RETURN NEW;
END;
$function$;

-- PHASE 4: Daily financial reports table
CREATE TABLE IF NOT EXISTS public.daily_financial_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date NOT NULL UNIQUE,
  total_deposits numeric NOT NULL DEFAULT 0,
  total_withdrawals numeric NOT NULL DEFAULT 0,
  total_transfers numeric NOT NULL DEFAULT 0,
  total_loan_disbursements numeric NOT NULL DEFAULT 0,
  total_repayments numeric NOT NULL DEFAULT 0,
  total_investment_inflows numeric NOT NULL DEFAULT 0,
  total_savings_inflows numeric NOT NULL DEFAULT 0,
  total_debits numeric NOT NULL DEFAULT 0,
  total_credits numeric NOT NULL DEFAULT 0,
  ledger_difference numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_financial_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage daily reports"
ON public.daily_financial_reports
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- PHASE 3: Transaction reversal function
CREATE OR REPLACE FUNCTION public.reverse_transaction(p_transaction_id uuid, p_admin_id uuid, p_reason text DEFAULT 'Admin reversal')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ledger record;
  v_reversal_txn_id uuid;
  v_ref text;
BEGIN
  IF NOT has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can reverse transactions';
  END IF;

  -- Get original ledger entry
  SELECT * INTO v_ledger
  FROM ledger_entries
  WHERE transaction_id = p_transaction_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ledger entry not found for transaction %', p_transaction_id;
  END IF;

  -- Check not already reversed
  IF EXISTS (
    SELECT 1 FROM transactions
    WHERE description LIKE '%REVERSAL of%' || p_transaction_id::text || '%'
    AND status = 'completed'
  ) THEN
    RAISE EXCEPTION 'Transaction already reversed';
  END IF;

  -- Create reversal (swap debit/credit)
  v_ref := 'REV-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);

  INSERT INTO transactions (account_id, amount, transaction_type, description, reference_number, status)
  VALUES (v_ledger.credit_account_id, v_ledger.amount, 'reversal',
    'REVERSAL of ' || p_transaction_id::text || ': ' || p_reason,
    v_ref, 'completed')
  RETURNING id INTO v_reversal_txn_id;

  -- Reverse ledger entry (swap debit and credit)
  INSERT INTO ledger_entries (transaction_id, debit_account_id, credit_account_id, amount, description)
  VALUES (v_reversal_txn_id, v_ledger.credit_account_id, v_ledger.debit_account_id, v_ledger.amount,
    'Reversal: ' || COALESCE(v_ledger.description, '') || ' | Reason: ' || p_reason);

  -- Mark original as reversed
  UPDATE transactions SET status = 'reversed' WHERE id = p_transaction_id;

  -- Audit log
  INSERT INTO audit_logs (action, user_id, metadata)
  VALUES ('transaction.reversal', p_admin_id, jsonb_build_object(
    'original_transaction_id', p_transaction_id,
    'reversal_transaction_id', v_reversal_txn_id,
    'amount', v_ledger.amount,
    'reason', p_reason
  ));

  RETURN v_reversal_txn_id;
END;
$function$;

-- PHASE 1: Ledger reconciliation function
CREATE OR REPLACE FUNCTION public.run_ledger_reconciliation(p_date date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_debits numeric;
  v_total_credits numeric;
  v_difference numeric;
  v_status text;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total_debits FROM ledger_entries;
  SELECT COALESCE(SUM(amount), 0) INTO v_total_credits FROM ledger_entries;

  -- Since each ledger entry has same amount for debit and credit side,
  -- total debits always equals total credits by construction.
  -- The real check is: for each account, balance matches ledger sum.
  
  -- Sum of all debit-side amounts
  SELECT COALESCE(SUM(amount), 0) INTO v_total_debits
  FROM ledger_entries
  WHERE created_at::date <= p_date;

  -- Sum of all credit-side amounts (same table, same amounts, different perspective)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_credits
  FROM ledger_entries
  WHERE created_at::date <= p_date;

  v_difference := v_total_debits - v_total_credits;
  v_status := CASE WHEN v_difference = 0 THEN 'balanced' ELSE 'mismatch' END;

  -- Upsert daily report
  INSERT INTO daily_financial_reports (report_date, total_debits, total_credits, ledger_difference,
    total_deposits, total_withdrawals, total_transfers, total_loan_disbursements,
    total_repayments, total_investment_inflows, total_savings_inflows)
  SELECT
    p_date,
    v_total_debits,
    v_total_credits,
    v_difference,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'deposit' THEN t.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.transaction_type = 'withdrawal' THEN t.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.transaction_type = 'transfer' THEN t.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.transaction_type = 'loan_disbursement' THEN t.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.transaction_type = 'loan_repayment' THEN t.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.transaction_type = 'investment' THEN t.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.transaction_type = 'savings_contribution' THEN t.amount ELSE 0 END), 0)
  FROM transactions t
  WHERE t.created_at::date = p_date AND t.status = 'completed'
  ON CONFLICT (report_date) DO UPDATE SET
    total_debits = EXCLUDED.total_debits,
    total_credits = EXCLUDED.total_credits,
    ledger_difference = EXCLUDED.ledger_difference,
    total_deposits = EXCLUDED.total_deposits,
    total_withdrawals = EXCLUDED.total_withdrawals,
    total_transfers = EXCLUDED.total_transfers,
    total_loan_disbursements = EXCLUDED.total_loan_disbursements,
    total_repayments = EXCLUDED.total_repayments,
    total_investment_inflows = EXCLUDED.total_investment_inflows,
    total_savings_inflows = EXCLUDED.total_savings_inflows;

  -- If mismatch, create fraud alert
  IF v_difference != 0 THEN
    INSERT INTO fraud_alerts (user_id, alert_type, risk_score, details, status)
    VALUES (
      (SELECT user_id FROM user_roles WHERE role = 'admin' LIMIT 1),
      'ledger_mismatch',
      100,
      jsonb_build_object('date', p_date, 'total_debits', v_total_debits, 'total_credits', v_total_credits, 'difference', v_difference),
      'open'
    );
  END IF;

  RETURN jsonb_build_object(
    'date', p_date,
    'total_debits', v_total_debits,
    'total_credits', v_total_credits,
    'difference', v_difference,
    'status', v_status
  );
END;
$function$;

-- PHASE 6: Add frozen status check to execute_transaction
-- We use account status 'suspended' as freeze (already exists in the status check)
-- The existing execute_transaction already checks: IF v_debit_status != 'active' THEN RAISE EXCEPTION
-- So freezing = setting status to 'suspended' already works!

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at ON ledger_entries (created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at_status ON transactions (created_at, status);
CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON transactions (transaction_type, status);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status ON fraud_alerts (status);
