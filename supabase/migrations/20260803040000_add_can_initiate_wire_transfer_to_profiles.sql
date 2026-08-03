ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS can_initiate_wire_transfer BOOLEAN DEFAULT TRUE NOT NULL;
