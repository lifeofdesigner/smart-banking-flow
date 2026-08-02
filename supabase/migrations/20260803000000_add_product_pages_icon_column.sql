-- product_pages.icon was intended by an earlier migration (CREATE TABLE IF NOT
-- EXISTS ... icon text), but that statement no-oped because the table already
-- existed without the column. The admin CMS and public site have always read
-- and written product_pages.icon, so every product save has been failing with
-- PGRST204 ("Could not find the 'icon' column"). Add it for real.
ALTER TABLE public.product_pages
  ADD COLUMN IF NOT EXISTS icon text;
