
-- Create beneficiaries table
CREATE TABLE public.beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nickname text NOT NULL,
  account_number text NOT NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  bank_name text NOT NULL DEFAULT 'MicroFinance Bank',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, account_number)
);

-- Enable RLS
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;

-- Users can view own beneficiaries
CREATE POLICY "Users can view own beneficiaries"
ON public.beneficiaries FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert own beneficiaries
CREATE POLICY "Users can insert own beneficiaries"
ON public.beneficiaries FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update own beneficiaries
CREATE POLICY "Users can update own beneficiaries"
ON public.beneficiaries FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete own beneficiaries
CREATE POLICY "Users can delete own beneficiaries"
ON public.beneficiaries FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all beneficiaries
CREATE POLICY "Admins can view all beneficiaries"
ON public.beneficiaries FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
