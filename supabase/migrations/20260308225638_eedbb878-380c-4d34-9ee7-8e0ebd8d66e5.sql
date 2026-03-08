
-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow inserts from security definer functions
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Index for fast user lookups
CREATE INDEX idx_notifications_user_id_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id) WHERE read = false;

-- Function to create transfer notifications
CREATE OR REPLACE FUNCTION public.create_transfer_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_debit_account_number text;
  v_credit_account_number text;
  v_debit_user_id uuid;
  v_credit_user_id uuid;
BEGIN
  -- Only for completed transfer transactions
  IF NEW.transaction_type != 'transfer' OR NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Get account info from the ledger entry
  SELECT 
    da.account_number, da.user_id,
    ca.account_number, ca.user_id
  INTO v_debit_account_number, v_debit_user_id, v_credit_account_number, v_credit_user_id
  FROM ledger_entries le
  JOIN accounts da ON da.id = le.debit_account_id
  JOIN accounts ca ON ca.id = le.credit_account_id
  WHERE le.transaction_id = NEW.id
  LIMIT 1;

  -- Notify sender (debit)
  IF v_debit_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (
      v_debit_user_id,
      'debit_alert',
      'Debit Alert',
      '$' || NEW.amount::text || ' transferred to account ' || RIGHT(v_credit_account_number, 4)
    );
  END IF;

  -- Notify receiver (credit)
  IF v_credit_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (
      v_credit_user_id,
      'credit_alert',
      'Credit Alert',
      '$' || NEW.amount::text || ' received from account ' || RIGHT(v_debit_account_number, 4)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on transaction insert
CREATE TRIGGER trg_transfer_notifications
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.create_transfer_notifications();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
