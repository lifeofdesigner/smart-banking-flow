-- Single source of truth for which country this bank template is skinned
-- for. Lets an admin re-brand the same app for a different country later
-- (e.g. Spain instead of Canada) without any code changes: site_country
-- feeds the {{country}} template placeholder (see src/lib/siteNameTemplate.ts)
-- and site_country_states is an admin-managed list of states/provinces for
-- that country, stored as a JSON array in this text column the same way
-- every other site_settings value is a plain string.
INSERT INTO public.site_settings (key, value) VALUES
  ('site_country', 'Canada'),
  ('site_country_states', '["Ontario","Quebec","British Columbia","Alberta","Manitoba","Saskatchewan","Nova Scotia","New Brunswick","Newfoundland and Labrador","Prince Edward Island"]')
ON CONFLICT (key) DO NOTHING;
