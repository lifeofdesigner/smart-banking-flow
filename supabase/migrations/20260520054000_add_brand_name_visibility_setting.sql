INSERT INTO public.site_settings (key, value)
VALUES ('show_brand_name_beside_logo', 'true')
ON CONFLICT (key) DO NOTHING;
