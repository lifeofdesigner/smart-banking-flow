-- These foreign keys were created with the default NO ACTION delete rule,
-- which silently blocks deleting a user/account whenever any of these
-- tables happen to reference them. Records that belong to an account are
-- cascaded with it; records that merely reference a profile for audit/
-- attribution purposes have that reference nulled out instead.

ALTER TABLE public.atm_withdrawals
  DROP CONSTRAINT atm_withdrawals_account_id_fkey,
  ADD CONSTRAINT atm_withdrawals_account_id_fkey
    FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE public.bill_payments
  DROP CONSTRAINT bill_payments_account_id_fkey,
  ADD CONSTRAINT bill_payments_account_id_fkey
    FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE public.cards
  DROP CONSTRAINT cards_account_id_fkey,
  ADD CONSTRAINT cards_account_id_fkey
    FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE public.investments
  DROP CONSTRAINT investments_account_id_fkey,
  ADD CONSTRAINT investments_account_id_fkey
    FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE public.ledger_entries
  DROP CONSTRAINT ledger_entries_credit_account_id_fkey,
  ADD CONSTRAINT ledger_entries_credit_account_id_fkey
    FOREIGN KEY (credit_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE public.ledger_entries
  DROP CONSTRAINT ledger_entries_debit_account_id_fkey,
  ADD CONSTRAINT ledger_entries_debit_account_id_fkey
    FOREIGN KEY (debit_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE public.savings_accounts
  DROP CONSTRAINT savings_accounts_account_id_fkey,
  ADD CONSTRAINT savings_accounts_account_id_fkey
    FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE public.scheduled_transfers
  DROP CONSTRAINT scheduled_transfers_from_account_id_fkey,
  ADD CONSTRAINT scheduled_transfers_from_account_id_fkey
    FOREIGN KEY (from_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE public.scheduled_transfers
  DROP CONSTRAINT scheduled_transfers_to_account_id_fkey,
  ADD CONSTRAINT scheduled_transfers_to_account_id_fkey
    FOREIGN KEY (to_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE public.loans
  DROP CONSTRAINT loans_disbursement_account_id_fkey,
  ADD CONSTRAINT loans_disbursement_account_id_fkey
    FOREIGN KEY (disbursement_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;

ALTER TABLE public.chat_agent_status
  DROP CONSTRAINT chat_agent_status_agent_id_fkey,
  ADD CONSTRAINT chat_agent_status_agent_id_fkey
    FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.chat_conversations
  DROP CONSTRAINT chat_conversations_agent_id_fkey,
  ADD CONSTRAINT chat_conversations_agent_id_fkey
    FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.chat_conversations
  DROP CONSTRAINT chat_conversations_customer_id_fkey,
  ADD CONSTRAINT chat_conversations_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.chat_messages
  DROP CONSTRAINT chat_messages_sender_id_fkey,
  ADD CONSTRAINT chat_messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.media_library
  DROP CONSTRAINT media_library_uploaded_by_fkey,
  ADD CONSTRAINT media_library_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.site_settings
  DROP CONSTRAINT site_settings_updated_by_fkey,
  ADD CONSTRAINT site_settings_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
