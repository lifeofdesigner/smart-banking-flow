-- Full CMS content seed for the homepage. Every heading, subheading,
-- description, CTA label/link, repeatable card, stat, checklist item,
-- testimonial, and FAQ below is stored as data in homepage_sections, not
-- hardcoded in any component — DynamicHomepageSections.tsx (and
-- LandingWhiteBank.tsx for the hero specifically) render entirely from this
-- table. Two small columns are added first since several sections need a
-- plain paragraph distinct from the short subtitle, and every image-bearing
-- section needs its own alt text rather than a hardcoded empty alt.

ALTER TABLE public.homepage_sections
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS image_alt text;

-- 1. Hero — update the existing row. content carries CTA label+link pairs
-- (the label was already CMS-driven; the link target was previously
-- hardcoded in LandingWhiteBank.tsx and is now editable too).
UPDATE public.homepage_sections
SET
  title = 'Banking That Moves You Forward',
  subtitle = 'Bank with confidence through secure everyday banking, competitive savings, flexible loans, and digital financial solutions designed for individuals, families, and businesses across Canada.',
  image_alt = 'A Unity Microfinance Bank customer confidently managing their finances online',
  display_order = 1,
  is_active = true,
  content = jsonb_build_object(
    'cta_primary_label', 'Open an Account',
    'cta_primary_link', '/auth?tab=signup',
    'cta_secondary_label', 'Explore Banking Products',
    'cta_secondary_link', '/#products'
  )
WHERE section_type = 'hero';

-- 2. Trust Bar — new section, a simple repeatable checklist. No unique
-- constraint exists on section_type, so idempotency is guarded with
-- NOT EXISTS rather than ON CONFLICT (which would be a silent no-op here).
INSERT INTO public.homepage_sections (section_type, title, subtitle, display_order, is_active, content)
SELECT
  'trust_bar',
  'Trusted by Canadians Every Day',
  NULL,
  2,
  true,
  jsonb_build_object('items', jsonb_build_array(
    jsonb_build_object('icon', 'check', 'label', 'CDIC Eligible Deposits*'),
    jsonb_build_object('icon', 'check', 'label', 'Secure Digital Banking'),
    jsonb_build_object('icon', 'check', 'label', 'Trusted Financial Advisors'),
    jsonb_build_object('icon', 'check', 'label', 'Fast Account Opening')
  ))
WHERE NOT EXISTS (SELECT 1 FROM public.homepage_sections WHERE section_type = 'trust_bar');

-- 3. Banking Products — header text only; the product cards themselves
-- already come from product_pages via DynamicProducts. Clears prior
-- placeholder/junk content.
UPDATE public.homepage_sections
SET
  title = 'Banking Solutions Designed Around Your Goals',
  subtitle = 'Whether you''re saving for tomorrow, growing your business, or financing your next milestone, we have solutions built for every stage of your financial journey.',
  display_order = 3,
  is_active = true,
  content = NULL
WHERE section_type = 'products';

-- 4. Why Choose Us — reuses the existing "services" section type/renderer
-- (an icon+title+description card grid), reseeded with new copy.
UPDATE public.homepage_sections
SET
  title = 'Banking Built Around You',
  subtitle = 'We combine modern digital banking with personalized financial guidance to help you achieve your goals confidently.',
  display_order = 4,
  is_active = true,
  content = jsonb_build_object('services', jsonb_build_array(
    jsonb_build_object('icon', 'shield', 'title', 'Secure Banking', 'description', 'Advanced fraud protection, encryption, and account monitoring keep your finances secure.'),
    jsonb_build_object('icon', 'zap', 'title', 'Fast Decisions', 'description', 'Open accounts, apply for loans, and manage your finances with quick approvals and streamlined processes.'),
    jsonb_build_object('icon', 'users', 'title', 'Community Focused', 'description', 'Supporting individuals, entrepreneurs, and local businesses with practical financial solutions.'),
    jsonb_build_object('icon', 'help', 'title', 'Expert Support', 'description', 'Dedicated banking professionals ready to help whenever you need assistance.')
  ))
WHERE section_type = 'services';

-- 5. About Us — no row existed yet. Two paragraphs in `description`
-- (a real column, not a jsonb blob), one CTA.
INSERT INTO public.homepage_sections (section_type, title, description, display_order, is_active, content)
SELECT
  'about',
  'Helping Canadians Build Financial Confidence',
  E'Unity Microfinance Bank exists to make banking simpler, more accessible, and more rewarding. We provide trusted financial solutions that empower individuals, families, entrepreneurs, and businesses to build stronger financial futures.\n\nWhether you''re opening your first account, growing your savings, purchasing a home, or expanding your business, we''re here to help every step of the way.',
  5,
  true,
  jsonb_build_object('cta_primary_label', 'Learn About Us', 'cta_primary_link', '/about')
WHERE NOT EXISTS (SELECT 1 FROM public.homepage_sections WHERE section_type = 'about');

-- 6. Banking Made Simple — new section, reuses the services/cards shape.
INSERT INTO public.homepage_sections (section_type, title, subtitle, display_order, is_active, content)
SELECT
  'banking_made_simple',
  'Banking Made Simple',
  'Everything You Need in One Place',
  6,
  true,
  jsonb_build_object('services', jsonb_build_array(
    jsonb_build_object('icon', 'users', 'title', 'Personal Banking', 'description', 'Everyday banking designed for modern lifestyles.'),
    jsonb_build_object('icon', 'briefcase', 'title', 'Business Banking', 'description', 'Financial tools that help your business grow.'),
    jsonb_build_object('icon', 'trending', 'title', 'Savings & Investments', 'description', 'Grow your wealth with confidence.'),
    jsonb_build_object('icon', 'dollar', 'title', 'Lending Solutions', 'description', 'Flexible financing for life''s biggest moments.')
  ))
WHERE NOT EXISTS (SELECT 1 FROM public.homepage_sections WHERE section_type = 'banking_made_simple');

-- 7. Statistics — new section, repeatable value/label pairs.
INSERT INTO public.homepage_sections (section_type, title, display_order, is_active, content)
SELECT
  'statistics',
  'Banking You Can Trust',
  7,
  true,
  jsonb_build_object('items', jsonb_build_array(
    jsonb_build_object('value', '25+', 'label', 'Years Serving Communities'),
    jsonb_build_object('value', '150,000+', 'label', 'Satisfied Customers'),
    jsonb_build_object('value', '$750M+', 'label', 'Customer Deposits Managed'),
    jsonb_build_object('value', '98%', 'label', 'Customer Satisfaction')
  ))
WHERE NOT EXISTS (SELECT 1 FROM public.homepage_sections WHERE section_type = 'statistics');

-- 8. Financial Tools — checklist + a single CTA.
INSERT INTO public.homepage_sections (section_type, title, display_order, is_active, content)
SELECT
  'financial_tools',
  'Helping You Make Better Financial Decisions',
  8,
  true,
  jsonb_build_object(
    'items', jsonb_build_array(
      jsonb_build_object('icon', 'check', 'label', 'Budget Planning'),
      jsonb_build_object('icon', 'check', 'label', 'Savings Goals'),
      jsonb_build_object('icon', 'check', 'label', 'Mortgage Calculator'),
      jsonb_build_object('icon', 'check', 'label', 'Loan Calculator'),
      jsonb_build_object('icon', 'check', 'label', 'Financial Education')
    ),
    'cta_primary_label', 'Explore Financial Tools',
    'cta_primary_link', '/help'
  )
WHERE NOT EXISTS (SELECT 1 FROM public.homepage_sections WHERE section_type = 'financial_tools');

-- 9. Testimonials — already close to the requested copy; reseeded exactly
-- and activated.
UPDATE public.homepage_sections
SET
  title = 'Trusted by Families and Businesses',
  subtitle = NULL,
  display_order = 9,
  is_active = true,
  content = jsonb_build_object('testimonials', jsonb_build_array(
    jsonb_build_object('name', 'Sarah Thompson', 'role', 'Toronto, Ontario', 'rating', 5, 'content', 'Opening my account was quick and simple. Their customer support guided me through every step.'),
    jsonb_build_object('name', 'Michael Carter', 'role', 'Small Business Owner', 'rating', 5, 'content', 'Their business banking solutions have helped my company grow with confidence.'),
    jsonb_build_object('name', 'Emily Walker', 'role', 'Calgary, Alberta', 'rating', 5, 'content', 'The mobile banking experience is secure, fast, and incredibly easy to use.')
  ))
WHERE section_type = 'testimonials';

-- 10. Security — checklist + a lead description paragraph.
INSERT INTO public.homepage_sections (section_type, title, description, display_order, is_active, content)
SELECT
  'security',
  'Your Security Is Our Priority',
  'We use advanced encryption, fraud monitoring, and secure authentication technologies to protect your accounts and personal information around the clock.',
  10,
  true,
  jsonb_build_object('items', jsonb_build_array(
    jsonb_build_object('icon', 'check', 'label', 'Multi-factor Authentication'),
    jsonb_build_object('icon', 'check', 'label', 'Real-Time Fraud Monitoring'),
    jsonb_build_object('icon', 'check', 'label', 'Encrypted Transactions'),
    jsonb_build_object('icon', 'check', 'label', 'Secure Online Banking')
  ))
WHERE NOT EXISTS (SELECT 1 FROM public.homepage_sections WHERE section_type = 'security');

-- 11. Mobile Banking — description + single CTA. No app-store link exists
-- yet in this project, so the CTA points at Help Center as a safe
-- placeholder — replace with a real store link from Site Settings once
-- the app is published.
INSERT INTO public.homepage_sections (section_type, title, description, display_order, is_active, content)
SELECT
  'mobile_banking',
  'Bank Anytime, Anywhere',
  'Manage your accounts, transfer funds, pay bills, deposit cheques, and stay in control of your finances wherever life takes you.',
  11,
  true,
  jsonb_build_object('cta_primary_label', 'Download the Mobile App', 'cta_primary_link', '/help')
WHERE NOT EXISTS (SELECT 1 FROM public.homepage_sections WHERE section_type = 'mobile_banking');

-- 12. Financial Education — description + single CTA.
INSERT INTO public.homepage_sections (section_type, title, description, display_order, is_active, content)
SELECT
  'financial_education',
  'Learn. Save. Grow.',
  'Explore articles, guides, calculators, and expert financial insights designed to help you make smarter financial decisions.',
  12,
  true,
  jsonb_build_object('cta_primary_label', 'Visit Learning Centre', 'cta_primary_link', '/help')
WHERE NOT EXISTS (SELECT 1 FROM public.homepage_sections WHERE section_type = 'financial_education');

-- 13. FAQ — replace with the requested 4 Q&As and activate (was inactive).
UPDATE public.homepage_sections
SET
  title = 'Frequently Asked Questions',
  subtitle = NULL,
  display_order = 13,
  is_active = true,
  content = jsonb_build_object('faqs', jsonb_build_array(
    jsonb_build_object('question', 'How do I open an account?', 'answer', 'Apply online in just a few minutes or visit one of our branches.'),
    jsonb_build_object('question', 'Are deposits protected?', 'answer', 'Eligible deposits are protected through applicable Canadian deposit insurance regulations.'),
    jsonb_build_object('question', 'Can I bank online?', 'answer', 'Yes. Our secure online and mobile banking platforms are available 24/7.'),
    jsonb_build_object('question', 'How long does loan approval take?', 'answer', 'Approval times vary by product, but many applications receive an initial decision within one business day.')
  ))
WHERE section_type = 'faq';

-- 14. Final CTA — description + two CTAs, no repeatable items.
INSERT INTO public.homepage_sections (section_type, title, description, display_order, is_active, content)
SELECT
  'final_cta',
  'Ready to Start Banking Smarter?',
  'Open your account today and discover secure, flexible financial solutions designed around your goals.',
  14,
  true,
  jsonb_build_object(
    'cta_primary_label', 'Open an Account', 'cta_primary_link', '/auth?tab=signup',
    'cta_secondary_label', 'Contact an Advisor', 'cta_secondary_link', '/contact'
  )
WHERE NOT EXISTS (SELECT 1 FROM public.homepage_sections WHERE section_type = 'final_cta');

-- Not part of the requested 14 sections — left exactly as an admin last set
-- it (including its active/inactive state), just moved to the end of the
-- display order so it doesn't interleave with the sequence above.
UPDATE public.homepage_sections
SET display_order = 15
WHERE section_type = 'contact';
