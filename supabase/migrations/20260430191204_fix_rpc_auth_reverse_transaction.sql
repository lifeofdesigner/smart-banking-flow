CREATE OR REPLACE FUNCTION public.reverse_transaction(p_transaction_id uuid, p_admin_id uuid, p_reason text DEFAULT 'Admin reversal')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id uuid;
  v_ledger record;
  v_reversal_txn_id uuid;
  v_ref text;
BEGIN
  v_admin_id := auth.uid();

  IF NOT has_role(v_admin_id, 'admin') THEN
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
  VALUES ('transaction.reversal', v_admin_id, jsonb_build_object(
    'original_transaction_id', p_transaction_id,
    'reversal_transaction_id', v_reversal_txn_id,
    'amount', v_ledger.amount,
    'reason', p_reason
  ));

  RETURN v_reversal_txn_id;
END;
$function$;
