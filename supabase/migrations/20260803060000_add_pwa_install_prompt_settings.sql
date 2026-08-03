-- Seeds default values for the CMS-driven PWA install prompt (Site Settings
-- > Mobile App). Disabled by default — an admin must opt in.

INSERT INTO public.site_settings (key, value) VALUES
  ('pwa_prompt_enabled', 'false'),
  ('pwa_prompt_style', 'bottom_sheet'),
  ('pwa_prompt_position', 'bottom-right'),
  ('pwa_prompt_trigger', 'first_visit'),
  ('pwa_prompt_visit_threshold', '3'),
  ('pwa_prompt_reappear_days', '7'),
  ('pwa_prompt_icon_url', ''),
  ('pwa_prompt_title', 'Install Our App'),
  ('pwa_prompt_subtitle', 'Bank smarter, faster'),
  ('pwa_prompt_description', 'Add our app to your home screen for instant access to your accounts, with a faster, more secure, native app-like experience.'),
  ('pwa_prompt_benefit_1', 'Faster access to your accounts'),
  ('pwa_prompt_benefit_2', 'Enhanced security with biometric login'),
  ('pwa_prompt_benefit_3', 'Works like a native app, right from your home screen'),
  ('pwa_prompt_primary_label', 'Install App'),
  ('pwa_prompt_secondary_label', 'Not Now'),
  ('pwa_prompt_cta_url', ''),
  ('pwa_prompt_bg_color', '#0A1628'),
  ('pwa_prompt_accent_color', '#C9A84C')
ON CONFLICT (key) DO NOTHING;
