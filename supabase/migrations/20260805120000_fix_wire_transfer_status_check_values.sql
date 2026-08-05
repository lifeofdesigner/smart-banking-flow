-- Update wire_transfers status constraint to allow admin status values used by the UI.
ALTER TABLE public.wire_transfers
  DROP CONSTRAINT IF EXISTS wire_transfers_status_check;

ALTER TABLE public.wire_transfers
  ADD CONSTRAINT wire_transfers_status_check
  CHECK (status IN (
    'pending',
    'verification_pending',
    'processing',
    'completed',
    'failed',
    'cancelled',
    'awaiting_cot',
    'awaiting_imf',
    'awaiting_tax',
    'awaiting_levy',
    'awaiting_fin',
    'held',
    'suspended',
    'rejected'
  ));
