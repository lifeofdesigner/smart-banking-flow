INSERT INTO public.site_settings (key, value)
VALUES ('demo_admin_login_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
