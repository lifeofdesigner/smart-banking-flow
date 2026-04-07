-- Permanently remove wire transfer code hashing triggers and functions
DROP TRIGGER IF EXISTS trg_hash_wire_code ON public.wire_transfer_codes CASCADE;
DROP TRIGGER IF EXISTS hash_wire_transfer_code_trigger ON public.wire_transfer_codes CASCADE;
DROP FUNCTION IF EXISTS public.hash_wire_transfer_code() CASCADE;
