-- Seeds default value for the Wire Transfer Important notice banner.
-- Disabled by default ('false') so it is hidden from customers unless an admin opts in.

INSERT INTO public.site_settings (key, value) VALUES
  ('wire_transfer_show_important_notice', 'false')
ON CONFLICT (key) DO NOTHING;
