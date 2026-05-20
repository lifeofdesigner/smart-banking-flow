-- Seed editable homepage sections used by the dynamic public renderer.
-- Existing admin content is preserved; rows are only added when a section type is missing.

INSERT INTO public.homepage_sections (section_type, title, subtitle, content, display_order, status)
SELECT
  'services',
  'Financial Services',
  'Banking products and services tailored for your customers.',
  '[
    {"icon":"savings","title":"Savings Accounts","description":"Flexible savings products for individuals, families, and businesses."},
    {"icon":"dollar","title":"Personal Loans","description":"Simple loan products with clear terms and quick decisions."},
    {"icon":"briefcase","title":"Business Banking","description":"Accounts, payments, and working capital tools for growing companies."},
    {"icon":"card","title":"Cards","description":"Secure debit and virtual card services for everyday spending."}
  ]',
  2,
  'active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.homepage_sections WHERE section_type = 'services'
);

INSERT INTO public.homepage_sections (section_type, title, subtitle, content, display_order, status)
SELECT
  'about',
  'About Your Bank',
  'A customer-focused financial institution delivering secure, accessible, and modern banking services.',
  '{
    "body":"A customer-focused financial institution delivering secure, accessible, and modern banking services.",
    "cards":[
      {"icon":"target","title":"Mission","description":"Deliver accessible financial services with clarity and care."},
      {"icon":"eye","title":"Vision","description":"Build lasting trust through reliable digital banking experiences."},
      {"icon":"award","title":"Licensed","description":"Operate with disciplined governance and customer-first standards."}
    ]
  }',
  4,
  'active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.homepage_sections WHERE section_type = 'about'
);

INSERT INTO public.homepage_sections (section_type, title, subtitle, content, display_order, status)
SELECT
  'testimonials',
  'Customer Stories',
  'Real feedback from people who use our banking services.',
  '[
    {"name":"Business Customer","role":"Account Holder","content":"The online banking tools make it easier to manage daily payments and business cash flow.","rating":5},
    {"name":"Savings Customer","role":"Personal Banking","content":"The account setup was straightforward, and support has been responsive whenever I need help.","rating":5},
    {"name":"Loan Customer","role":"Small Business","content":"The loan process was clear, practical, and helpful for expanding my business.","rating":5}
  ]',
  5,
  'active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.homepage_sections WHERE section_type = 'testimonials'
);

INSERT INTO public.homepage_sections (section_type, title, subtitle, content, display_order, status)
SELECT
  'faq',
  'Frequently Asked Questions',
  'Answers to common questions about our services.',
  '[
    {"question":"What do I need to open an account?","answer":"You need a valid identity document, contact information, and any extra documents required for the selected account type."},
    {"question":"Can I access my account online?","answer":"Yes. Customers can access eligible accounts through the internet banking portal."},
    {"question":"How do I contact support?","answer":"Use the contact details on this page or the live chat widget when available."}
  ]',
  6,
  'active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.homepage_sections WHERE section_type = 'faq'
);

INSERT INTO public.homepage_sections (section_type, title, subtitle, content, display_order, status)
SELECT
  'contact',
  'Contact Us',
  'Reach our team for account, product, or support questions.',
  '{}',
  7,
  'active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.homepage_sections WHERE section_type = 'contact'
);

UPDATE public.homepage_sections
SET display_order = CASE section_type
  WHEN 'hero' THEN 0
  WHEN 'products' THEN 3
  ELSE display_order
END
WHERE section_type IN ('hero', 'products');
