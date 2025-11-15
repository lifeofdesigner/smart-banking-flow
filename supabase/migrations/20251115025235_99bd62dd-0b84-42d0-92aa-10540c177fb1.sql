-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create accounts table for bank accounts
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_number TEXT UNIQUE NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('savings', 'current', 'fixed_deposit')),
  balance DECIMAL(15,2) DEFAULT 0.00,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accounts"
  ON public.accounts FOR SELECT
  USING (auth.uid() = user_id);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer', 'wire_transfer', 'airtime', 'bill_payment')),
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  reference_number TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = transactions.account_id
      AND accounts.user_id = auth.uid()
    )
  );

-- Create wire_transfers table for international transfers
CREATE TABLE public.wire_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  beneficiary_name TEXT NOT NULL,
  beneficiary_account TEXT NOT NULL,
  beneficiary_bank TEXT NOT NULL,
  beneficiary_country TEXT NOT NULL,
  swift_code TEXT,
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  purpose TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'awaiting_cot', 'awaiting_imf', 'awaiting_tax', 'awaiting_levy', 'awaiting_fin', 'processing', 'completed', 'failed', 'cancelled')),
  current_stage INTEGER DEFAULT 0,
  transaction_id UUID REFERENCES public.transactions(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.wire_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wire transfers"
  ON public.wire_transfers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create wire transfers"
  ON public.wire_transfers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wire transfers"
  ON public.wire_transfers FOR UPDATE
  USING (auth.uid() = user_id);

-- Create wire_transfer_codes table for security verification
CREATE TABLE public.wire_transfer_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wire_transfer_id UUID NOT NULL REFERENCES public.wire_transfers(id) ON DELETE CASCADE,
  code_type TEXT NOT NULL CHECK (code_type IN ('COT', 'IMF', 'TAX', 'LEVY', 'FIN')),
  code_value TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.wire_transfer_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view codes for own transfers"
  ON public.wire_transfer_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wire_transfers
      WHERE wire_transfers.id = wire_transfer_codes.wire_transfer_id
      AND wire_transfers.user_id = auth.uid()
    )
  );

-- Create function to generate account number
CREATE OR REPLACE FUNCTION generate_account_number()
RETURNS TEXT AS $$
BEGIN
  RETURN '100' || LPAD(floor(random() * 10000000)::text, 7, '0');
END;
$$ LANGUAGE plpgsql;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wire_transfers_updated_at
  BEFORE UPDATE ON public.wire_transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  );
  
  -- Create a default savings account
  INSERT INTO public.accounts (user_id, account_number, account_type, balance)
  VALUES (
    NEW.id,
    generate_account_number(),
    'savings',
    5000.00
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();