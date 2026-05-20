-- Public CMS connection repair.
-- Ensures the admin-managed public website tables and asset bucket exist
-- in the same Supabase project the frontend reads from.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.homepage_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_type text NOT NULL,
  title text,
  subtitle text,
  content text,
  image text,
  display_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.homepage_sections
  ADD COLUMN IF NOT EXISTS image text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
DECLARE
  homepage_content_type text;
BEGIN
  SELECT data_type
  INTO homepage_content_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'homepage_sections'
    AND column_name = 'content';

  IF homepage_content_type = 'jsonb' THEN
    UPDATE public.homepage_sections
    SET
      title = COALESCE(content ->> 'headline', title),
      subtitle = COALESCE(content ->> 'subheadline', subtitle)
    WHERE section_type = 'hero'
      AND content IS NOT NULL;

    ALTER TABLE public.homepage_sections
      ALTER COLUMN content TYPE text
      USING content::text;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'homepage_sections'
      AND column_name = 'is_active'
  ) THEN
    UPDATE public.homepage_sections
    SET status = CASE WHEN is_active THEN 'active' ELSE 'inactive' END
    WHERE status IS NULL;
  END IF;
END $$;

UPDATE public.homepage_sections
SET status = 'active'
WHERE status IS NULL;

ALTER TABLE public.homepage_sections
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN status SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.product_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name text NOT NULL,
  slug text NOT NULL UNIQUE,
  short_description text,
  full_description text,
  hero_image text,
  meta_description text,
  og_image text,
  icon text,
  status text NOT NULL DEFAULT 'active',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.product_pages(id) ON DELETE CASCADE,
  section_type text NOT NULL,
  section_title text,
  section_content text,
  section_image text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.product_pages(id) ON DELETE CASCADE,
  page_id uuid,
  question text NOT NULL,
  answer text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.media_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'image',
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_homepage_sections_public
  ON public.homepage_sections (section_type, status, display_order);

CREATE INDEX IF NOT EXISTS idx_product_pages_public
  ON public.product_pages (status, display_order);

CREATE INDEX IF NOT EXISTS idx_product_sections_product_order
  ON public.product_sections (product_id, display_order);

CREATE INDEX IF NOT EXISTS idx_faqs_product_order
  ON public.faqs (product_id, display_order);

DROP TRIGGER IF EXISTS update_product_pages_updated_at ON public.product_pages;
CREATE TRIGGER update_product_pages_updated_at
  BEFORE UPDATE ON public.product_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_homepage_sections_updated_at ON public.homepage_sections;
CREATE TRIGGER update_homepage_sections_updated_at
  BEFORE UPDATE ON public.homepage_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.homepage_sections (section_type, title, subtitle, content, display_order, status)
VALUES
  ('hero', 'Your Partner in Financial Growth', 'Empowering individuals and businesses with accessible microfinance solutions. From savings to loans, we''re here to help you achieve your financial dreams.', NULL, 0, 'active'),
  ('products', 'Banking Products', 'Choose the perfect financial product for your needs', NULL, 1, 'active')
ON CONFLICT DO NOTHING;

INSERT INTO public.product_pages (
  product_name,
  slug,
  short_description,
  full_description,
  status,
  display_order
)
VALUES
  ('Savings Account', 'savings-account', 'Build your savings with competitive rates, flexible deposits, and easy digital access.', 'Secure savings with competitive interest rates and flexible deposit options.', 'active', 0),
  ('Business Loan', 'business-loan', 'Flexible financing for working capital, inventory, expansion, and everyday business needs.', 'Fuel your business growth with flexible financing and business advisory support.', 'active', 1),
  ('Term Deposits', 'term-deposits', 'Lock in guaranteed returns with fixed deposit terms that match your financial goals.', 'Secure your future with predictable fixed interest returns.', 'active', 2),
  ('Micro-Credit', 'micro-credit', 'Quick access to small credit facilities designed for individuals and growing entrepreneurs.', 'Flexible small-credit facilities designed for responsible borrowing.', 'active', 3)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active homepage sections" ON public.homepage_sections;
CREATE POLICY "Public can read active homepage sections"
  ON public.homepage_sections
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active' OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage homepage sections" ON public.homepage_sections;
CREATE POLICY "Admins can manage homepage sections"
  ON public.homepage_sections
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Public can read active product pages" ON public.product_pages;
CREATE POLICY "Public can read active product pages"
  ON public.product_pages
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('published', 'active') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage product pages" ON public.product_pages;
CREATE POLICY "Admins can manage product pages"
  ON public.product_pages
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Public can read sections for active products" ON public.product_sections;
CREATE POLICY "Public can read sections for active products"
  ON public.product_sections
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.product_pages product
      WHERE product.id = product_sections.product_id
        AND product.status IN ('published', 'active')
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Admins can manage product sections" ON public.product_sections;
CREATE POLICY "Admins can manage product sections"
  ON public.product_sections
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Public can read faqs for active products" ON public.faqs;
CREATE POLICY "Public can read faqs for active products"
  ON public.faqs
  FOR SELECT
  TO anon, authenticated
  USING (
    product_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.product_pages product
      WHERE product.id = faqs.product_id
        AND product.status IN ('published', 'active')
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Admins can manage faqs" ON public.faqs;
CREATE POLICY "Admins can manage faqs"
  ON public.faqs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Public can read media library" ON public.media_library;
CREATE POLICY "Public can read media library"
  ON public.media_library
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage media library" ON public.media_library;
CREATE POLICY "Admins can manage media library"
  ON public.media_library
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.site_settings TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated, service_role;

GRANT SELECT ON public.homepage_sections TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.homepage_sections TO authenticated, service_role;

GRANT SELECT ON public.product_pages TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.product_pages TO authenticated, service_role;

GRANT SELECT ON public.product_sections TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.product_sections TO authenticated, service_role;

GRANT SELECT ON public.faqs TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.faqs TO authenticated, service_role;

GRANT SELECT ON public.media_library TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.media_library TO authenticated, service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cms-media',
  'cms-media',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can read cms media" ON storage.objects;
CREATE POLICY "Public can read cms media"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'cms-media');

DROP POLICY IF EXISTS "Admins can upload cms media" ON storage.objects;
CREATE POLICY "Admins can upload cms media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'cms-media'
    AND public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Admins can update cms media" ON storage.objects;
CREATE POLICY "Admins can update cms media"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'cms-media'
    AND public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    bucket_id = 'cms-media'
    AND public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete cms media" ON storage.objects;
CREATE POLICY "Admins can delete cms media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'cms-media'
    AND public.has_role(auth.uid(), 'admin')
  );
