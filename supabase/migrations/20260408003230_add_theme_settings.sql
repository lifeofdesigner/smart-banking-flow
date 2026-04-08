INSERT INTO public.site_settings (key, value) VALUES
  ('active_theme', 'navy-gold'),
  ('active_landing', 'classic')
ON CONFLICT (key) DO NOTHING;

