INSERT INTO public.site_settings (key, value)
VALUES
  ('mobile_logo_url', ''),
  ('show_mobile_brand_name_beside_logo', 'true')
ON CONFLICT (key) DO NOTHING;
