CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

INSERT INTO public.site_settings (key, value) VALUES
  ('site_name', 'MicroFinance Bank'),
  ('site_tagline', 'Your Partner in Financial Growth'),
  ('site_description', 'Empowering individuals and businesses with accessible microfinance solutions.'),
  ('site_keywords', 'microfinance, bank, loans, savings, investments, Nigeria'),
  ('site_logo_url', ''),
  ('site_favicon_url', ''),
  ('site_og_image_url', ''),
  ('site_twitter_handle', ''),
  ('site_google_verification', ''),
  ('site_canonical_url', '')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read site settings" ON public.site_settings;
CREATE POLICY "Public can read site settings"
  ON public.site_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can update site settings" ON public.site_settings;
CREATE POLICY "Admins can update site settings"
  ON public.site_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

