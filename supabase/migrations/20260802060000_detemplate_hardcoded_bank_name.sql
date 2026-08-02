-- Replaces hardcoded references to the bank's old name ("Halverix Bank")
-- inside authored CMS content with the {{site_name}} placeholder, which the
-- frontend now substitutes with the live site_settings.site_name at render
-- time (see src/lib/siteNameTemplate.ts). This keeps this content correct
-- automatically across any future rename, instead of going stale again.

UPDATE public.homepage_sections
SET title = 'About {{site_name}}'
WHERE section_type = 'about' AND title = 'About Halverix Bank';

UPDATE public.homepage_sections
SET content = jsonb_set(
  content,
  '{testimonials}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN item->>'content' ILIKE '%halverix%'
          THEN jsonb_set(item, '{content}', to_jsonb(
            regexp_replace(item->>'content', 'Halverix Bank|Halverix', '{{site_name}}', 'gi')
          ))
        ELSE item
      END
    )
    FROM jsonb_array_elements(content->'testimonials') AS item
  )
)
WHERE section_type = 'testimonials';

UPDATE public.product_pages
SET full_description = regexp_replace(full_description, 'Halverix Bank|Halverix', '{{site_name}}', 'gi')
WHERE full_description ILIKE '%halverix%';

UPDATE public.product_pages
SET meta_description = regexp_replace(meta_description, 'Halverix Bank|Halverix', '{{site_name}}', 'gi')
WHERE meta_description ILIKE '%halverix%';

-- The contact card's stored support email still pointed at the old brand's
-- domain (support@halverixbank.com). There's no configured
-- site_settings.support_email to fall back to, so clearing this outright
-- would drop the Email card entirely — set a neutral placeholder instead
-- and leave it for the admin to set their real support address.
UPDATE public.homepage_sections
SET content = jsonb_set(content, '{email}', '"support@example.com"')
WHERE section_type = 'contact' AND content->>'email' = 'support@halverixbank.com';
