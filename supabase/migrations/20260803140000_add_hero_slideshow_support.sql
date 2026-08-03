-- The hero banner now supports one-or-more background images that
-- crossfade automatically (LandingWhiteBank.tsx's HeroSlideshow), admin
-- managed as a repeatable "Hero Background Images" list in
-- ContentManagement.tsx rather than the single Section Image field. No
-- schema change needed — slides live under content.slides, the same jsonb
-- column already used for this section's CTA fields. This just seeds the
-- existing single image/image_alt as slide #1 so the admin editor opens
-- with something already there instead of an empty list.
UPDATE public.homepage_sections
SET content = content || jsonb_build_object(
  'slides', jsonb_build_array(
    jsonb_build_object('image', image, 'image_alt', COALESCE(image_alt, ''))
  )
)
WHERE section_type = 'hero'
  AND image IS NOT NULL
  AND NOT (content ? 'slides');
