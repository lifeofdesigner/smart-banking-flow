-- Production content seed for Unity Microfinance Bank Canada.
-- Populates CMS-only tables (site_settings, homepage_sections, product_pages,
-- product_sections, faqs, site_pages, page_sections) with realistic copy for a
-- regulated Canadian financial institution. No schema is changed here (the
-- product_pages.icon fix lives in its own migration). Safe to re-run.

BEGIN;

-- ============================================================================
-- 1. SITE SETTINGS — branding, contact, footer, social, hero controls, SEO
-- ============================================================================

INSERT INTO public.site_settings (key, value) VALUES
  ('site_name', 'Unity Microfinance Bank Canada'),
  ('site_tagline', 'Banking Built Around You'),
  ('site_description', 'Unity Microfinance Bank Canada provides accessible personal and business banking, lending, savings, and investment solutions for individuals and small businesses across Canada.'),
  ('site_keywords', 'Unity Microfinance Bank Canada, microfinance bank Canada, personal banking, business banking, small business loans, savings accounts, mortgages, CDIC member bank'),
  ('deposit_insurer_name', 'Canada Deposit Insurance Corporation (CDIC)'),
  ('brand_initials', 'UM'),

  ('support_email', 'support@unitymfbcanada.ca'),
  ('support_phone', '+1 (416) 555-0199'),
  ('support_hours', 'Mon–Fri: 8:00 AM–8:00 PM ET · Sat: 9:00 AM–4:00 PM ET'),

  ('contact_section_title', 'Contact Us'),
  ('contact_section_subtitle', 'Reach our team for account, loan, or online banking support.'),
  ('contact_address_line_1', '100 King Street West, Suite 3200'),
  ('contact_address_line_2', 'Toronto, ON M5X 1A9, Canada'),
  ('contact_phone_primary', '+1 (416) 555-0199'),
  ('contact_phone_secondary', '+1 (800) 555-0142'),
  ('contact_email_primary', 'support@unitymfbcanada.ca'),
  ('contact_email_secondary', 'loans@unitymfbcanada.ca'),
  ('contact_hours_line_1', 'Monday–Friday: 8:00 AM–8:00 PM ET'),
  ('contact_hours_line_2', 'Saturday: 9:00 AM–4:00 PM ET · Sunday: Closed'),

  ('footer_description', 'Unity Microfinance Bank Canada is a CDIC member institution committed to accessible, transparent banking for individuals, entrepreneurs, and small businesses across Canada.'),
  ('footer_disclaimer', 'Unity Microfinance Bank Canada is a member of the Canada Deposit Insurance Corporation (CDIC). Eligible deposits are protected up to applicable CDIC limits.'),
  ('footer_quick_links_title', 'Quick Links'),
  ('footer_services_title', 'Banking'),
  ('footer_legal_title', 'Legal'),
  ('footer_quick_links_json', '[{"label":"Home","href":"/"},{"label":"About Us","href":"/about"},{"label":"Contact Us","href":"/contact"},{"label":"Open an Account","href":"/auth?tab=signup"}]'),
  ('footer_service_links_json', '[{"label":"Personal Banking","href":"/products/personal-banking"},{"label":"Business Banking","href":"/products/business-banking"},{"label":"Savings & GICs","href":"/products/savings-account"},{"label":"Mortgages & Home Loans","href":"/products/home-loans"},{"label":"Credit Cards","href":"/products/cards"},{"label":"Online & Mobile Banking","href":"/products/online-banking"}]'),
  ('footer_legal_links_json', '[{"label":"Privacy Policy","href":"#"},{"label":"Terms of Service","href":"#"},{"label":"Cookie Policy","href":"#"},{"label":"Accessibility","href":"#"}]'),
  ('footer_privacy_url', '#'),
  ('footer_terms_url', '#'),
  ('footer_cookie_url', '#'),
  ('footer_compliance_url', '#'),

  ('social_facebook_url', 'https://facebook.com/unitymfbcanada'),
  ('social_x_url', 'https://x.com/unitymfbcanada'),
  ('social_instagram_url', 'https://instagram.com/unitymfbcanada'),
  ('social_linkedin_url', 'https://linkedin.com/company/unitymfbcanada'),
  ('site_twitter_handle', '@unitymfbcanada'),

  ('announcement_enabled', 'true'),
  ('announcement_title', 'New: Instant Interac e-Transfer'),
  ('announcement_message', 'Send and receive money instantly with Interac e-Transfer, now available on every Unity Microfinance Bank Canada account.'),
  ('announcement_link_label', 'Learn More'),
  ('announcement_link_url', '/products/online-banking'),

  ('hero_badge_text', 'CDIC Member Since 2010'),
  ('hero_primary_cta_label', 'Open an Account'),
  ('hero_secondary_cta_label', 'Explore Banking Products'),
  ('hero_stat_1_value', '150K+'),
  ('hero_stat_1_label', 'Canadians Served'),
  ('hero_stat_2_value', '4.75%'),
  ('hero_stat_2_label', 'Savings APY'),
  ('hero_stat_3_value', 'CDIC'),
  ('hero_stat_3_label', 'Deposit Protection'),
  ('hero_image_alt', 'A Unity Microfinance Bank Canada advisor helping a small business owner review their account online')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = now();

-- site_og_image_url reuses the real, already-uploaded logo asset rather than a fabricated URL.
INSERT INTO public.site_settings (key, value)
SELECT 'site_og_image_url', value FROM public.site_settings WHERE key = 'site_logo_url' AND value IS NOT NULL AND value <> ''
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- ============================================================================
-- 2. HOMEPAGE SECTIONS — hero, services, products grid, about, testimonials,
--    faq, contact (final order: hero, services, products, about, testimonials,
--    faq, contact)
-- ============================================================================

DO $$
BEGIN
  UPDATE public.homepage_sections
  SET
    title = 'Banking Built Around You',
    subtitle = 'Personal and business banking, loans, savings, and investment solutions designed to help Canadians and their businesses grow.',
    content = '{
      "headline": "Banking Built Around You",
      "subheadline": "Personal and business banking, loans, savings, and investment solutions designed to help Canadians and their businesses grow — backed by CDIC-protected deposits.",
      "cta_primary": "Open an Account",
      "cta_secondary": "Explore Banking Products",
      "stats": [
        {"label": "Canadians Served", "value": "150K+"},
        {"label": "Savings APY", "value": "4.75%"},
        {"label": "Deposit Protection", "value": "CDIC"}
      ]
    }'::jsonb,
    display_order = 1,
    is_active = true
  WHERE section_type = 'hero';

  UPDATE public.homepage_sections
  SET
    title = 'What We Offer',
    subtitle = 'Banking products designed for individuals, entrepreneurs, and growing businesses across Canada.',
    content = '{"services": [
      {"icon": "savings", "title": "Savings & GICs", "description": "High-interest savings accounts and guaranteed investment certificates with rates that reward your patience."},
      {"icon": "dollar", "title": "Personal & Business Loans", "description": "Straightforward lending with clear terms, fast decisions, and a dedicated advisor throughout."},
      {"icon": "building", "title": "Mortgages", "description": "Fixed and variable-rate mortgages for first-time buyers, refinancing, and home equity needs."},
      {"icon": "card", "title": "Credit Cards", "description": "Cards built for everyday spending, with real-time alerts and no hidden fees."},
      {"icon": "briefcase", "title": "Business Banking", "description": "Accounts, payment tools, and financing built for small and growing Canadian businesses."},
      {"icon": "investment", "title": "Investing", "description": "Diversified investment plans and guidance aligned to your goals, timeline, and risk tolerance."}
    ]}'::jsonb,
    display_order = 2,
    is_active = true
  WHERE section_type = 'services';

  UPDATE public.homepage_sections
  SET
    title = 'Banking Products',
    subtitle = 'Choose the account or service that matches your personal or business goals.',
    content = NULL,
    display_order = 3,
    is_active = true
  WHERE section_type = 'products';

  IF NOT FOUND THEN
    INSERT INTO public.homepage_sections (section_type, title, subtitle, content, display_order, is_active)
    VALUES ('products', 'Banking Products', 'Choose the account or service that matches your personal or business goals.', NULL, 3, true);
  END IF;

  UPDATE public.homepage_sections
  SET
    title = 'About {{site_name}}',
    subtitle = 'A CDIC member institution committed to accessible, transparent banking for individuals and businesses across Canada.',
    content = '{
      "description": "As a CDIC member institution, {{site_name}} operates under strict regulatory oversight from Canadian financial authorities to keep your money safe and your banking transparent.",
      "mission": "To give Canadians and small businesses honest, accessible financial products backed by real human support — with no hidden fees and no fine print surprises.",
      "vision": "To be the microfinance bank Canadians trust for straightforward, everyday banking and for the moments that matter, like buying a home or growing a business.",
      "values": [
        {"icon": "award", "title": "CDIC Member", "description": "Eligible deposits are protected up to applicable CDIC limits, so your savings are secure."},
        {"icon": "users", "title": "Community Focused", "description": "We reinvest in the communities we serve, from small business lending to financial literacy programs."},
        {"icon": "target", "title": "Customer First", "description": "Every product is designed around clear terms, fair pricing, and support when you need it."}
      ]
    }'::jsonb,
    display_order = 4,
    is_active = true
  WHERE section_type = 'about';

  UPDATE public.homepage_sections
  SET
    title = 'What Our Customers Say',
    subtitle = 'Real feedback from Canadians who bank with us every day.',
    content = '{"testimonials": [
      {"name": "Priya R.", "role": "Personal Banking Customer, Toronto ON", "content": "Switching my chequing account over took less than fifteen minutes online, and the Interac e-Transfer limits are actually high enough to be useful.", "rating": 5},
      {"name": "Marc-Andre T.", "role": "Small Business Owner, Montreal QC", "content": "The business loan process was transparent from the first call. My advisor walked me through every fee before I signed anything.", "rating": 5},
      {"name": "Aisha K.", "role": "Mortgage Customer, Calgary AB", "content": "We got pre-approved in a day and had a dedicated advisor through closing. It made buying our first home a lot less stressful.", "rating": 5},
      {"name": "David L.", "role": "Savings Customer, Vancouver BC", "content": "The GIC rates beat what my old bank offered, and I can see everything in the app without calling anyone.", "rating": 5}
    ]}'::jsonb,
    display_order = 5,
    is_active = true
  WHERE section_type = 'testimonials';

  IF NOT FOUND THEN
    INSERT INTO public.homepage_sections (section_type, title, subtitle, content, display_order, is_active)
    VALUES (
      'testimonials',
      'What Our Customers Say',
      'Real feedback from Canadians who bank with us every day.',
      '{"testimonials": [
        {"name": "Priya R.", "role": "Personal Banking Customer, Toronto ON", "content": "Switching my chequing account over took less than fifteen minutes online, and the Interac e-Transfer limits are actually high enough to be useful.", "rating": 5},
        {"name": "Marc-Andre T.", "role": "Small Business Owner, Montreal QC", "content": "The business loan process was transparent from the first call. My advisor walked me through every fee before I signed anything.", "rating": 5},
        {"name": "Aisha K.", "role": "Mortgage Customer, Calgary AB", "content": "We got pre-approved in a day and had a dedicated advisor through closing. It made buying our first home a lot less stressful.", "rating": 5},
        {"name": "David L.", "role": "Savings Customer, Vancouver BC", "content": "The GIC rates beat what my old bank offered, and I can see everything in the app without calling anyone.", "rating": 5}
      ]}'::jsonb,
      5,
      true
    );
  END IF;

  UPDATE public.homepage_sections
  SET
    title = 'Frequently Asked Questions',
    subtitle = 'Answers to common questions about accounts, online banking, and support.',
    content = '{"faqs": [
      {"question": "Is my money protected if I bank with Unity Microfinance Bank Canada?", "answer": "Yes. We are a member of the Canada Deposit Insurance Corporation (CDIC), which protects eligible deposits up to applicable CDIC limits."},
      {"question": "What do I need to open an account?", "answer": "You will need a valid piece of Canadian government-issued photo ID, your Social Insurance Number, and a Canadian mailing address. Most accounts can be opened online in under fifteen minutes."},
      {"question": "Can I manage my account entirely online?", "answer": "Yes. Online and mobile banking let you check balances, pay bills, send Interac e-Transfers, and deposit cheques from your phone."},
      {"question": "Does Unity Microfinance Bank Canada have physical branches?", "answer": "Yes, we have branches in select cities across Canada in addition to full online and mobile banking access for every customer."},
      {"question": "How do I reach customer support?", "answer": "Call us at +1 (416) 555-0199, email support@unitymfbcanada.ca, or use the live chat available in online banking during support hours."}
    ]}'::jsonb,
    display_order = 6,
    is_active = true
  WHERE section_type IN ('faq', 'faqs');

  IF NOT FOUND THEN
    INSERT INTO public.homepage_sections (section_type, title, subtitle, content, display_order, is_active)
    VALUES (
      'faq',
      'Frequently Asked Questions',
      'Answers to common questions about accounts, online banking, and support.',
      '{"faqs": [
        {"question": "Is my money protected if I bank with Unity Microfinance Bank Canada?", "answer": "Yes. We are a member of the Canada Deposit Insurance Corporation (CDIC), which protects eligible deposits up to applicable CDIC limits."},
        {"question": "What do I need to open an account?", "answer": "You will need a valid piece of Canadian government-issued photo ID, your Social Insurance Number, and a Canadian mailing address. Most accounts can be opened online in under fifteen minutes."},
        {"question": "Can I manage my account entirely online?", "answer": "Yes. Online and mobile banking let you check balances, pay bills, send Interac e-Transfers, and deposit cheques from your phone."},
        {"question": "Does Unity Microfinance Bank Canada have physical branches?", "answer": "Yes, we have branches in select cities across Canada in addition to full online and mobile banking access for every customer."},
        {"question": "How do I reach customer support?", "answer": "Call us at +1 (416) 555-0199, email support@unitymfbcanada.ca, or use the live chat available in online banking during support hours."}
      ]}'::jsonb,
      6,
      true
    );
  END IF;

  UPDATE public.homepage_sections
  SET
    title = 'Contact Us',
    subtitle = 'Reach our team for account, loan, or online banking support.',
    content = '{
      "address": ["100 King Street West, Suite 3200", "Toronto, ON M5X 1A9, Canada"],
      "phone": ["+1 (416) 555-0199", "+1 (800) 555-0142"],
      "email": ["support@unitymfbcanada.ca", "loans@unitymfbcanada.ca"],
      "hours": ["Monday–Friday: 8:00 AM–8:00 PM ET", "Saturday: 9:00 AM–4:00 PM ET · Sunday: Closed"]
    }'::jsonb,
    display_order = 7,
    is_active = true
  WHERE section_type = 'contact';
END $$;

-- ============================================================================
-- 3. PRODUCT PAGES — 15 published pages covering Personal Banking, Business
--    Banking, Loans, Mortgages, Savings, Investments, Credit Cards, Online
--    Banking, Mobile Banking, and the existing curated catalog.
-- ============================================================================

INSERT INTO public.product_pages
  (slug, product_name, short_description, full_description, meta_description, icon, status, display_order)
VALUES
  ('checking', 'Everyday Chequing', 'Everyday chequing with no monthly fees, instant Interac e-Transfer, and full mobile access.', 'Our everyday chequing account is built for how Canadians actually bank: no minimum balance, no monthly maintenance fee, and full access to your money through mobile cheque deposit, bill payments, and a nationwide ATM network.', 'Open a fee-free everyday chequing account with Unity Microfinance Bank Canada. No monthly fees, instant Interac e-Transfer, and mobile banking included.', 'dollar', 'published', 1),
  ('savings-account', 'Savings & GICs', 'High-interest savings accounts and Guaranteed Investment Certificates (GICs) that reward your patience.', 'Choose a flexible high-interest savings account for everyday saving, or lock in a guaranteed rate with a GIC for your medium- and long-term goals. Every eligible deposit is protected by CDIC.', 'Grow your savings with a high-interest savings account or GIC from Unity Microfinance Bank Canada. Competitive rates, CDIC-protected deposits.', 'savings', 'published', 2),
  ('cards', 'Credit Cards', 'Cards built for everyday spending, with real-time alerts and no hidden fees.', 'Earn cash back on everyday purchases, track spending in real time, and manage your card entirely from your phone, including instant freeze if it is ever lost or stolen.', 'Compare Unity Microfinance Bank Canada credit cards. Cash back rewards, no annual fee options, and real-time spending alerts.', 'card', 'published', 3),
  ('home-loans', 'Mortgages & Home Loans', 'Fixed and variable-rate mortgages for first-time buyers, refinancing, and home equity needs.', 'Whether you are buying your first home, renewing, refinancing, or borrowing against your home''s equity, we offer clear terms, competitive rates, and a dedicated mortgage advisor from application to closing.', 'Fixed and variable-rate mortgages from Unity Microfinance Bank Canada. Get pre-approved online with a dedicated mortgage advisor.', 'building', 'published', 4),
  ('auto-loans', 'Auto Loans', 'Competitive rates on new, used, and refinanced vehicle loans, with a decision in minutes.', 'Finance a new or used vehicle, or refinance your current auto loan for a better rate, with a decision in minutes and funds sent directly to the dealer or your account.', 'Finance your next vehicle with an auto loan from Unity Microfinance Bank Canada. Competitive rates and fast approval.', 'dollar', 'published', 5),
  ('investments', 'Investing', 'Diversified investment plans and portfolio guidance aligned to your goals and timeline.', 'Access diversified investment portfolios, RRSPs, and TFSAs designed around your goals, timeline, and risk tolerance, whether you are just starting out or planning for retirement.', 'Start investing with Unity Microfinance Bank Canada. Diversified portfolios, RRSP and TFSA options, and no hidden management fees.', 'investment', 'published', 6),
  ('personal-loan', 'Personal Loans', 'Fixed-rate personal loans for debt consolidation, renovations, or life''s bigger expenses.', 'Borrow what you need with a fixed monthly payment and no surprises. Use a personal loan to consolidate higher-interest debt, cover a major expense, or fund a home renovation.', 'Apply for a fixed-rate personal loan from Unity Microfinance Bank Canada. Simple application, fast decisions, no prepayment penalty.', 'dollar', 'published', 7),
  ('business-loan', 'Business Loans', 'Flexible financing for working capital, equipment, inventory, and business expansion.', 'Access the capital your business needs to grow, with financing options for working capital, equipment purchases, inventory, and expansion, backed by a dedicated business banking advisor.', 'Get flexible business financing from Unity Microfinance Bank Canada. Working capital, equipment, and expansion loans for Canadian small businesses.', 'briefcase', 'published', 8),
  ('education-loan', 'Student Loans', 'Education financing to help cover tuition, books, and living expenses while you study.', 'Student loans designed around a student''s timeline, with flexible repayment options and the ability to defer payments while enrolled in an eligible program.', 'Finance your education with a student loan from Unity Microfinance Bank Canada. Flexible repayment and in-study payment deferral.', 'award', 'published', 9),
  ('transfers', 'Money Transfers', 'Send money within Canada or abroad using Interac e-Transfer, wire transfers, and saved beneficiaries.', 'Move money quickly and securely using Interac e-Transfer for domestic transfers, or wire transfers for larger or international payments, all from online or mobile banking.', 'Send money securely with Unity Microfinance Bank Canada. Interac e-Transfer, wire transfers, and saved beneficiaries.', 'investment', 'published', 10),
  ('analytics', 'Spending Insights & Budgeting Tools', 'Automatic spending categories, budgets, and alerts that help you understand where your money goes.', 'See your spending broken down by category, set monthly budgets, and get alerts before you go over, built directly into online and mobile banking at no extra cost.', 'Track spending and build budgets with Unity Microfinance Bank Canada''s free budgeting tools, built into online and mobile banking.', 'target', 'published', 11),
  ('personal-banking', 'Personal Banking', 'Everyday accounts, cards, loans, and savings built around your life, not the bank''s.', 'From your first chequing account to your first mortgage, personal banking at Unity Microfinance Bank Canada brings together chequing, savings, credit, and lending in one place, with real support when you need it.', 'Explore personal banking products from Unity Microfinance Bank Canada, including chequing, savings, credit cards, and loans.', 'users', 'published', 12),
  ('business-banking', 'Business Banking', 'Accounts, payment tools, and financing built for Canadian small businesses and entrepreneurs.', 'Run your business with banking that keeps up: business chequing accounts, payment processing, payroll-ready tools, and financing options built for small and growing Canadian businesses.', 'Business banking from Unity Microfinance Bank Canada. Business accounts, payment tools, and financing for Canadian entrepreneurs.', 'briefcase', 'published', 13),
  ('online-banking', 'Online Banking', 'Manage every account, payment, and transfer securely from your browser, anytime.', 'Check balances, pay bills, send Interac e-Transfers, deposit cheques, and manage every account from a single secure dashboard, available 24/7 from any device.', 'Bank online with Unity Microfinance Bank Canada. Secure 24/7 access to accounts, bill payments, and Interac e-Transfer.', 'card', 'published', 14),
  ('mobile-banking', 'Mobile Banking', 'Full banking in your pocket, with biometric login and instant transaction alerts.', 'The Unity Microfinance Bank Canada mobile app puts your accounts, cards, and transfers in your pocket, secured with biometric login and instant alerts for every transaction.', 'Download the Unity Microfinance Bank Canada mobile app for secure banking, mobile cheque deposit, and instant transaction alerts.', 'target', 'published', 15)
ON CONFLICT (slug) DO UPDATE
SET
  product_name = EXCLUDED.product_name,
  short_description = EXCLUDED.short_description,
  full_description = EXCLUDED.full_description,
  meta_description = EXCLUDED.meta_description,
  icon = EXCLUDED.icon,
  status = EXCLUDED.status,
  display_order = EXCLUDED.display_order,
  updated_at = now();

-- ============================================================================
-- 4. PRODUCT SECTIONS + FAQS — description/features/benefits/how_it_works
--    plus 3 FAQs for each of the 15 products. Re-runnable: clears prior
--    sections/FAQs for these products, then inserts fresh content.
-- ============================================================================

DELETE FROM public.product_sections WHERE product_id IN (
  SELECT id FROM public.product_pages WHERE slug IN (
    'checking', 'savings-account', 'cards', 'home-loans', 'auto-loans', 'investments',
    'personal-loan', 'business-loan', 'education-loan', 'transfers', 'analytics',
    'personal-banking', 'business-banking', 'online-banking', 'mobile-banking'
  )
);
DELETE FROM public.faqs WHERE product_id IN (
  SELECT id FROM public.product_pages WHERE slug IN (
    'checking', 'savings-account', 'cards', 'home-loans', 'auto-loans', 'investments',
    'personal-loan', 'business-loan', 'education-loan', 'transfers', 'analytics',
    'personal-banking', 'business-banking', 'online-banking', 'mobile-banking'
  )
);

DO $$
DECLARE
  v_checking uuid;
  v_savings uuid;
  v_cards uuid;
  v_home_loans uuid;
  v_auto_loans uuid;
  v_investing uuid;
  v_personal_loan uuid;
  v_business_loan uuid;
  v_education_loan uuid;
  v_transfers uuid;
  v_analytics uuid;
  v_personal_banking uuid;
  v_business_banking uuid;
  v_online_banking uuid;
  v_mobile_banking uuid;
BEGIN
  SELECT id INTO v_checking FROM public.product_pages WHERE slug = 'checking';
  SELECT id INTO v_savings FROM public.product_pages WHERE slug = 'savings-account';
  SELECT id INTO v_cards FROM public.product_pages WHERE slug = 'cards';
  SELECT id INTO v_home_loans FROM public.product_pages WHERE slug = 'home-loans';
  SELECT id INTO v_auto_loans FROM public.product_pages WHERE slug = 'auto-loans';
  SELECT id INTO v_investing FROM public.product_pages WHERE slug = 'investments';
  SELECT id INTO v_personal_loan FROM public.product_pages WHERE slug = 'personal-loan';
  SELECT id INTO v_business_loan FROM public.product_pages WHERE slug = 'business-loan';
  SELECT id INTO v_education_loan FROM public.product_pages WHERE slug = 'education-loan';
  SELECT id INTO v_transfers FROM public.product_pages WHERE slug = 'transfers';
  SELECT id INTO v_analytics FROM public.product_pages WHERE slug = 'analytics';
  SELECT id INTO v_personal_banking FROM public.product_pages WHERE slug = 'personal-banking';
  SELECT id INTO v_business_banking FROM public.product_pages WHERE slug = 'business-banking';
  SELECT id INTO v_online_banking FROM public.product_pages WHERE slug = 'online-banking';
  SELECT id INTO v_mobile_banking FROM public.product_pages WHERE slug = 'mobile-banking';

  -- EVERYDAY CHEQUING ------------------------------------------------------
  INSERT INTO public.product_sections (product_id, section_type, title, content, display_order) VALUES
    (v_checking, 'description', 'Banking that works around you',
      '"No minimum balance, no monthly maintenance fee, and full access to your money through mobile cheque deposit, bill payments, and a nationwide Interac network."', 1),
    (v_checking, 'features', 'What''s included',
      '["No monthly maintenance fee", "Mobile cheque deposit", "Unlimited Interac e-Transfers", "Real-time transaction alerts", "Fee-free access at partner ATMs across Canada"]', 2),
    (v_checking, 'benefits', 'Why customers choose it',
      '["Open an account online in about ten minutes", "See pending transactions before they post", "Freeze your debit card instantly if it is lost", "24/7 account access from any device"]', 3),
    (v_checking, 'how_it_works', 'Getting started',
      '["Apply online with a valid government-issued ID and SIN", "Fund your account with a transfer or mobile deposit", "Activate your debit card and set up mobile banking", "Start spending, saving, and tracking in one place"]', 4);

  INSERT INTO public.faqs (product_id, question, answer, display_order) VALUES
    (v_checking, 'Is there a minimum balance requirement?', 'No. Everyday chequing has no minimum balance requirement and no monthly maintenance fee.', 1),
    (v_checking, 'How do I deposit cheques?', 'Use the mobile app to photograph and deposit cheques, or visit any branch or partner ATM.', 2),
    (v_checking, 'Can I open a chequing account online?', 'Yes, the entire application takes about ten minutes and can be completed from your phone or computer.', 3);

  -- SAVINGS & GICS ----------------------------------------------------------
  INSERT INTO public.product_sections (product_id, section_type, title, content, display_order) VALUES
    (v_savings, 'description', 'Grow your savings, your way',
      '"Choose a flexible high-interest savings account for everyday saving, or lock in a guaranteed rate with a GIC for your medium- and long-term goals."', 1),
    (v_savings, 'features', 'Account options',
      '["High-interest savings up to 4.75% APY", "GIC terms from 3 to 60 months", "No monthly fees on savings accounts", "Automatic recurring transfers", "CDIC-protected eligible deposits"]', 2),
    (v_savings, 'benefits', 'Why it pays to save with us',
      '["Interest compounds monthly, not just annually", "Set savings goals and track progress in the app", "GIC rates are locked in for the full term", "CDIC protection on every eligible account"]', 3),
    (v_savings, 'how_it_works', 'Opening an account',
      '["Choose between a savings account or a GIC term", "Fund your account with an initial deposit", "Set up automatic transfers to build your balance faster", "Watch your interest add up every month"]', 4);

  INSERT INTO public.faqs (product_id, question, answer, display_order) VALUES
    (v_savings, 'What is the current interest rate?', 'Savings accounts earn up to 4.75% APY, compounded monthly. GIC rates vary by term length.', 1),
    (v_savings, 'What happens if I cash out a GIC early?', 'Non-redeemable GICs cannot be cashed out before maturity; redeemable GICs may apply reduced interest. Ask an advisor for your GIC''s exact terms.', 2),
    (v_savings, 'Is there a minimum deposit?', 'Savings accounts can be opened with as little as $25. GICs typically require a minimum of $500.', 3);

  -- CREDIT CARDS -------------------------------------------------------------
  INSERT INTO public.product_sections (product_id, section_type, title, content, display_order) VALUES
    (v_cards, 'description', 'Cards for how you actually spend',
      '"Earn rewards on everyday purchases, track spending in real time, and manage your card entirely from your phone, including instant freeze if it is ever lost or stolen."', 1),
    (v_cards, 'features', 'Card features',
      '["Cash back on everyday categories", "Real-time purchase alerts", "Instant card freeze/unfreeze", "Virtual card numbers for online shopping", "No foreign transaction fees on select cards"]', 2),
    (v_cards, 'benefits', 'Why it is worth carrying',
      '["No annual fee on standard cards", "Build credit history with responsible use", "Redeem rewards directly in the mobile app", "Zero-liability protection on unauthorized charges"]', 3),
    (v_cards, 'how_it_works', 'Applying for a card',
      '["Check your eligibility with a soft credit check", "Complete the application in a few minutes", "Get a decision, often instantly", "Add your card to a digital wallet as soon as it is approved"]', 4);

  INSERT INTO public.faqs (product_id, question, answer, display_order) VALUES
    (v_cards, 'Will checking my eligibility affect my credit score?', 'No. Checking your eligibility uses a soft credit check, which does not impact your credit score.', 1),
    (v_cards, 'How do I redeem cash back?', 'Redeem rewards anytime from the Cards section of the mobile app, as a statement credit or deposit.', 2),
    (v_cards, 'What should I do if my card is lost or stolen?', 'Freeze your card instantly in the app, then report it lost or stolen to get a replacement issued.', 3);

  -- MORTGAGES & HOME LOANS -----------------------------------------------
  INSERT INTO public.product_sections (product_id, section_type, title, content, display_order) VALUES
    (v_home_loans, 'description', 'Financing for every stage of homeownership',
      '"Whether you are buying your first home, renewing, refinancing, or borrowing against your home''s equity, we offer clear terms and a dedicated mortgage advisor through the whole process."', 1),
    (v_home_loans, 'features', 'Mortgage options',
      '["Fixed and variable-rate mortgages", "Home equity lines of credit (HELOC)", "Mortgage renewals and refinancing", "First-time homebuyer guidance"]', 2),
    (v_home_loans, 'benefits', 'Why borrowers choose us',
      '["Get pre-approved online without affecting your credit", "A dedicated mortgage advisor from application to closing", "Competitive rates with transparent fees", "Track your application status in real time"]', 3),
    (v_home_loans, 'how_it_works', 'The mortgage process',
      '["Get pre-qualified in minutes online", "Submit documentation for full pre-approval", "Shop with confidence using your pre-approval letter", "Close with support from your dedicated advisor"]', 4);

  INSERT INTO public.faqs (product_id, question, answer, display_order) VALUES
    (v_home_loans, 'What credit score do I need to qualify?', 'Requirements vary by mortgage program; pre-qualification will show your specific options based on your credit and income.', 1),
    (v_home_loans, 'How long does the mortgage process take?', 'Most mortgages close within 30-45 days of a complete application, depending on the property and loan type.', 2),
    (v_home_loans, 'Can I use a HELOC for anything?', 'Yes, a home equity line of credit can be used for renovations, debt consolidation, education costs, or other major expenses.', 3);

  -- AUTO LOANS -----------------------------------------------------------
  INSERT INTO public.product_sections (product_id, section_type, title, content, display_order) VALUES
    (v_auto_loans, 'description', 'Drive off with a rate you can count on',
      '"Finance a new or used vehicle, or refinance your current auto loan for a better rate, with a decision in minutes and funds sent straight to the dealer or your account."', 1),
    (v_auto_loans, 'features', 'Loan options',
      '["New and used vehicle financing", "Auto loan refinancing", "Terms from 24 to 84 months", "Same-day funding in most cases"]', 2),
    (v_auto_loans, 'benefits', 'Why finance with us',
      '["Get pre-approved before you visit the dealership", "Fixed rates with no prepayment penalty", "Manage payments and payoff from the mobile app", "Fast decisions, often within minutes"]', 3),
    (v_auto_loans, 'how_it_works', 'How to apply',
      '["Apply online in a few minutes", "Get a decision and rate offer", "Use your pre-approval to negotiate at the dealership", "Sign your documents and drive away"]', 4);

  INSERT INTO public.faqs (product_id, question, answer, display_order) VALUES
    (v_auto_loans, 'Can I get pre-approved before choosing a car?', 'Yes, pre-approval gives you a firm rate and budget to shop with, at the dealership or from a private seller.', 1),
    (v_auto_loans, 'Do you finance used vehicles?', 'Yes, we finance new and used vehicles, including private-party purchases, subject to vehicle age and mileage limits.', 2),
    (v_auto_loans, 'Is there a penalty for paying off my loan early?', 'No, there is no prepayment penalty on auto loans, pay it off early and save on interest.', 3);

  -- INVESTING -----------------------------------------------------------
  INSERT INTO public.product_sections (product_id, section_type, title, content, display_order) VALUES
    (v_investing, 'description', 'Invest with a plan, not just a hunch',
      '"Access diversified investment portfolios, RRSPs, and TFSAs designed around your goals and timeline, whether you are just starting out or planning for retirement."', 1),
    (v_investing, 'features', 'What you get',
      '["Diversified investment portfolios", "RRSP and TFSA account options", "Automatic recurring contributions", "Portfolio performance tracking in the app"]', 2),
    (v_investing, 'benefits', 'Why invest with us',
      '["Start with as little as $50", "No hidden management fees", "Adjust your risk level as your goals change", "Guidance available whenever you need it"]', 3),
    (v_investing, 'how_it_works', 'Getting started',
      '["Answer a few questions about your goals and timeline", "Get a recommended portfolio mix", "Fund your account and set up recurring contributions", "Track performance and rebalance as needed"]', 4);

  INSERT INTO public.faqs (product_id, question, answer, display_order) VALUES
    (v_investing, 'How much do I need to start investing?', 'You can open an investment account and start with as little as $50.', 1),
    (v_investing, 'Are my investments insured like a savings account?', 'No. Investment products are not deposits and are not CDIC-insured; their value can go up or down based on market performance.', 2),
    (v_investing, 'What is the difference between a TFSA and RRSP?', 'A TFSA grows tax-free and withdrawals are not taxed; an RRSP reduces your taxable income now, but withdrawals are taxed later. An advisor can help you choose.', 3);

  -- PERSONAL LOANS ---------------------------------------------------------
  INSERT INTO public.product_sections (product_id, section_type, title, content, display_order) VALUES
    (v_personal_loan, 'description', 'One predictable payment, no surprises',
      '"Borrow what you need with a fixed monthly payment, whether you are consolidating higher-interest debt, covering a major expense, or funding a home renovation."', 1),
    (v_personal_loan, 'features', 'Loan details',
      '["Fixed interest rates", "Loan amounts from $1,000 to $50,000", "Terms from 12 to 60 months", "No prepayment penalty"]', 2),
    (v_personal_loan, 'benefits', 'Why borrowers choose us',
      '["One predictable payment instead of multiple bills", "Funds deposited as soon as the next business day", "No collateral required on most loans", "Track your payoff progress in the app"]', 3),
    (v_personal_loan, 'how_it_works', 'How to apply',
      '["Check your rate with a soft credit check", "Choose your loan amount and term", "Get a decision, often within minutes", "Receive funds directly in your account"]', 4);

  INSERT INTO public.faqs (product_id, question, answer, display_order) VALUES
    (v_personal_loan, 'What can I use a personal loan for?', 'Most customers use personal loans for debt consolidation, home renovations, or unexpected expenses; funds can be used for nearly any personal purpose.', 1),
    (v_personal_loan, 'Will applying affect my credit score?', 'Checking your rate uses a soft credit check and does not affect your score; a hard check only occurs if you proceed with the loan.', 2),
    (v_personal_loan, 'How fast can I get the funds?', 'Many approved loans are funded as soon as the next business day.', 3);

  -- BUSINESS LOANS ---------------------------------------------------------
  INSERT INTO public.product_sections (product_id, section_type, title, content, display_order) VALUES
    (v_business_loan, 'description', 'Capital that keeps pace with your business',
      '"Access financing for working capital, equipment, inventory, and expansion, backed by a dedicated business banking advisor who understands your industry."', 1),
    (v_business_loan, 'features', 'Financing options',
      '["Working capital loans and lines of credit", "Equipment and inventory financing", "Terms tailored to your cash flow", "A dedicated business banking advisor"]', 2),
    (v_business_loan, 'benefits', 'Why businesses choose us',
      '["Financing decisions in as little as 2 business days", "Flexible repayment aligned to your revenue cycle", "No hidden origination fees", "Support from a dedicated relationship manager"]', 3),
    (v_business_loan, 'how_it_works', 'How to apply',
      '["Share your business financials and funding need", "Get matched with the right financing option", "Receive a decision from a business banking advisor", "Access funds and start growing"]', 4);

  INSERT INTO public.faqs (product_id, question, answer, display_order) VALUES
    (v_business_loan, 'How long does my business need to be operating?', 'Most business loan programs require at least 12 months of operating history, though newer businesses may qualify for select products.', 1),
    (v_business_loan, 'What documents do I need to apply?', 'Typically business financial statements, recent bank statements, and basic business registration details.', 2),
    (v_business_loan, 'Can I use financing for equipment purchases?', 'Yes, equipment financing is available with terms matched to the useful life of the equipment.', 3);

  -- STUDENT LOANS -----------------------------------------------------------
  INSERT INTO public.product_sections (product_id, section_type, title, content, display_order) VALUES
    (v_education_loan, 'description', 'Financing built around a student''s timeline',
      '"Cover tuition, books, and living expenses with a student loan that lets you defer payments while you are enrolled and repay once you are working."', 1),
    (v_education_loan, 'features', 'Loan details',
      '["Coverage for tuition, books, and living expenses", "In-study payment deferral", "Fixed and variable rate options", "Repayment terms up to 15 years"]', 2),
    (v_education_loan, 'benefits', 'Why students choose us',
      '["No payments required while enrolled full-time", "Competitive student rates", "A grace period after graduation before repayment begins", "Apply with or without a co-signer"]', 3),
    (v_education_loan, 'how_it_works', 'How to apply',
      '["Confirm enrollment at an eligible institution", "Apply online with your program and funding need", "Get a decision and review your repayment terms", "Funds are disbursed directly for your school costs"]', 4);

  INSERT INTO public.faqs (product_id, question, answer, display_order) VALUES
    (v_education_loan, 'Do I have to make payments while I am in school?', 'No, payments can be deferred while you are enrolled full-time in an eligible program.', 1),
    (v_education_loan, 'Do I need a co-signer?', 'Not always. Students with limited credit history may need a co-signer for better rates, but it is not required for every applicant.', 2),
    (v_education_loan, 'When does repayment begin?', 'Repayment typically begins after a grace period of several months following graduation or when you drop below full-time enrollment.', 3);

  -- MONEY TRANSFERS -----------------------------------------------------------
  INSERT INTO public.product_sections (product_id, section_type, title, content, display_order) VALUES
    (v_transfers, 'description', 'Send money securely, in Canada or abroad',
      '"Move money quickly using Interac e-Transfer for domestic transfers, or wire transfers for larger or international payments, all from online or mobile banking."', 1),
    (v_transfers, 'features', 'Transfer options',
      '["Instant Interac e-Transfer, no fee on personal accounts", "Domestic and international wire transfers", "Saved beneficiaries for repeat transfers", "Transfer tracking and confirmation"]', 2),
    (v_transfers, 'benefits', 'Why customers choose us',
      '["Send money in minutes, day or night", "Set up Autodeposit so recipients do not need security questions", "Higher transfer limits for verified accounts", "Full transfer history in one place"]', 3),
    (v_transfers, 'how_it_works', 'Sending a transfer',
      '["Add a recipient''s email, phone number, or bank details", "Choose Interac e-Transfer or wire transfer", "Confirm the amount and review the fee, if any", "Track the transfer until it is completed"]', 4);

  INSERT INTO public.faqs (product_id, question, answer, display_order) VALUES
    (v_transfers, 'Is Interac e-Transfer free?', 'Yes, Interac e-Transfers are free on personal chequing and savings accounts.', 1),
    (v_transfers, 'How long does a wire transfer take?', 'Domestic wires typically complete within 1 business day; international wires can take 2 to 5 business days.', 2),
    (v_transfers, 'What is the daily transfer limit?', 'Limits vary by account type and verification level; check your limits in online banking or contact support to request an increase.', 3);

  -- SPENDING INSIGHTS & BUDGETING TOOLS ---------------------------------------
  INSERT INTO public.product_sections (product_id, section_type, title, content, display_order) VALUES
    (v_analytics, 'description', 'See exactly where your money goes',
      '"Spending is automatically sorted into categories, so you can set monthly budgets and get alerts before you go over, built directly into online and mobile banking."', 1),
    (v_analytics, 'features', 'What you get',
      '["Automatic spending categorization", "Custom monthly budgets by category", "Low-balance and over-budget alerts", "Month-over-month spending trends"]', 2),
    (v_analytics, 'benefits', 'Why it is useful',
      '["No extra cost, included with every account", "See spending patterns without manual tracking", "Set savings goals alongside your budgets", "Available on both web and mobile"]', 3),
    (v_analytics, 'how_it_works', 'Getting started',
      '["Open the Insights tab in online or mobile banking", "Review your automatically categorized transactions", "Set a monthly budget for any category", "Get notified as you approach your limit"]', 4);

  INSERT INTO public.faqs (product_id, question, answer, display_order) VALUES
    (v_analytics, 'Does this cost extra?', 'No, spending insights and budgeting tools are included at no additional cost with every account.', 1),
    (v_analytics, 'Can I create a budget for a specific category?', 'Yes, you can set custom monthly budgets for any spending category and receive alerts as you approach the limit.', 2),
    (v_analytics, 'Does it include my credit card spending?', 'Yes, spending across your chequing account and Unity credit cards is included in your insights.', 3);

  -- PERSONAL BANKING (hub) -----------------------------------------------
  INSERT INTO public.product_sections (product_id, section_type, title, content, display_order) VALUES
    (v_personal_banking, 'description', 'Banking that grows with your life',
      '"From your first chequing account to your first mortgage, personal banking brings together everyday accounts, credit, and lending in one place, with real support when you need it."', 1),
    (v_personal_banking, 'features', 'What is included',
      '["Everyday chequing with no monthly fees", "High-interest savings and GICs", "Credit cards with cash back rewards", "Personal loans and mortgages"]', 2),
    (v_personal_banking, 'benefits', 'Why customers choose us',
      '["One login for every personal account you hold", "A single advisor who knows your full financial picture", "Products that grow with you, from your first job to retirement", "CDIC protection on every eligible deposit"]', 3),
    (v_personal_banking, 'how_it_works', 'Getting started',
      '["Open your first account online in minutes", "Add savings, credit, or lending products as you need them", "Manage everything from one online and mobile dashboard", "Talk to an advisor whenever your needs change"]', 4);

  INSERT INTO public.faqs (product_id, question, answer, display_order) VALUES
    (v_personal_banking, 'Do I need multiple accounts to get started?', 'No, most customers start with a single chequing account and add products like savings or credit over time.', 1),
    (v_personal_banking, 'Can I manage all my accounts in one app?', 'Yes, chequing, savings, credit cards, and loans are all visible in one online and mobile banking dashboard.', 2),
    (v_personal_banking, 'Is personal banking available if I am new to Canada?', 'Yes, newcomers to Canada can open an account with valid identification; ask an advisor about our newcomer banking package.', 3);

  -- BUSINESS BANKING (hub) -----------------------------------------------
  INSERT INTO public.product_sections (product_id, section_type, title, content, display_order) VALUES
    (v_business_banking, 'description', 'Banking built for how your business runs',
      '"Business chequing accounts, payment processing, payroll-ready tools, and financing options built for small and growing Canadian businesses."', 1),
    (v_business_banking, 'features', 'What is included',
      '["Business chequing with transaction bundles", "Payment processing and invoicing tools", "Payroll-ready account structure", "Working capital and equipment financing"]', 2),
    (v_business_banking, 'benefits', 'Why businesses choose us',
      '["A dedicated business banking advisor", "Scale your account as your transaction volume grows", "Integrated tools for payroll and bookkeeping exports", "Financing options without switching banks"]', 3),
    (v_business_banking, 'how_it_works', 'Getting started',
      '["Open a business chequing account online or with an advisor", "Add payment processing and payroll tools as needed", "Apply for financing when you are ready to grow", "Manage cash flow from one business dashboard"]', 4);

  INSERT INTO public.faqs (product_id, question, answer, display_order) VALUES
    (v_business_banking, 'What documents do I need to open a business account?', 'Typically your business registration or incorporation documents and valid personal identification for account signers.', 1),
    (v_business_banking, 'Can sole proprietors open a business account?', 'Yes, sole proprietors, partnerships, and incorporated businesses can all open Unity business accounts.', 2),
    (v_business_banking, 'Is there a transaction fee on business chequing?', 'Business chequing includes a monthly bundle of free transactions, with a per-transaction fee beyond that bundle depending on your plan.', 3);

  -- ONLINE BANKING ---------------------------------------------------------
  INSERT INTO public.product_sections (product_id, section_type, title, content, display_order) VALUES
    (v_online_banking, 'description', 'Every account, one secure dashboard',
      '"Check balances, pay bills, send Interac e-Transfers, deposit cheques, and manage every account from a single secure dashboard, available 24/7 from any device."', 1),
    (v_online_banking, 'features', 'What you get',
      '["Real-time balances and transaction history", "Bill payments to thousands of Canadian payees", "Interac e-Transfer, send and request money", "Mobile cheque deposit", "Two-factor authentication and login alerts"]', 2),
    (v_online_banking, 'benefits', 'Why customers rely on it',
      '["Bank securely from any device, any time", "See every account, from chequing to investments, in one place", "Set up recurring bill payments and transfers", "Get instant alerts for logins and transactions"]', 3),
    (v_online_banking, 'how_it_works', 'Getting started',
      '["Enroll in online banking when you open your account", "Log in with your secure credentials and two-factor authentication", "Link and manage all your accounts from one dashboard", "Set up alerts, autopay, and recurring transfers"]', 4);

  INSERT INTO public.faqs (product_id, question, answer, display_order) VALUES
    (v_online_banking, 'Is online banking secure?', 'Yes, we use bank-grade encryption, two-factor authentication, and continuous fraud monitoring to protect every session.', 1),
    (v_online_banking, 'Can I pay any bill through online banking?', 'You can pay thousands of Canadian billers directly; if a payee is not listed, you can add them manually.', 2),
    (v_online_banking, 'What if I forget my password?', 'Use the "Forgot password" link on the login page and follow the identity verification steps to reset it securely.', 3);

  -- MOBILE BANKING -----------------------------------------------------------
  INSERT INTO public.product_sections (product_id, section_type, title, content, display_order) VALUES
    (v_mobile_banking, 'description', 'Full banking, right in your pocket',
      '"The Unity Microfinance Bank Canada mobile app puts your accounts, cards, and transfers in your pocket, secured with biometric login and instant alerts for every transaction."', 1),
    (v_mobile_banking, 'features', 'What you get',
      '["Biometric login with Face ID or fingerprint", "Mobile cheque deposit", "Instant transaction alerts", "Card freeze and lock from your phone", "Interac e-Transfer on the go"]', 2),
    (v_mobile_banking, 'benefits', 'Why customers love it',
      '["Deposit cheques without visiting a branch", "Get notified the moment a transaction posts", "Lock your card instantly if it is misplaced", "Available on iOS and Android"]', 3),
    (v_mobile_banking, 'how_it_works', 'Getting started',
      '["Download the app and log in with your online banking credentials", "Enable biometric login for faster, secure access", "Deposit cheques by photographing them in the app", "Turn on alerts for the accounts you want to monitor"]', 4);

  INSERT INTO public.faqs (product_id, question, answer, display_order) VALUES
    (v_mobile_banking, 'Is the mobile app free?', 'Yes, the Unity Microfinance Bank Canada app is free to download for iOS and Android.', 1),
    (v_mobile_banking, 'What is the limit on mobile cheque deposits?', 'Daily and monthly mobile deposit limits vary by account type and history; limits are shown in the app before you deposit.', 2),
    (v_mobile_banking, 'Can I use the app if I lose my phone?', 'Yes, log in to online banking from any browser to freeze your card and manage account access immediately.', 3);
END $$;

-- ============================================================================
-- 5. SITE PAGES + PAGE SECTIONS — Careers, Branches, Privacy Policy, Terms,
--    Cookie Policy, Accessibility, Security, Fraud Prevention, Financial
--    Education. NOTE: these tables exist in the schema but no public route
--    currently reads from them (see summary at the end of this file).
-- ============================================================================

INSERT INTO public.site_pages (slug, title, content, is_published) VALUES
  ('careers', 'Careers at Unity Microfinance Bank Canada', '{"summary": "Join a team building accessible banking for Canadians. Explore current openings and our hiring process."}', true),
  ('branches', 'Branch & ATM Locations', '{"summary": "Find a Unity Microfinance Bank Canada branch or partner ATM near you."}', true),
  ('privacy-policy', 'Privacy Policy', '{"summary": "How Unity Microfinance Bank Canada collects, uses, and protects your personal information under Canadian privacy law."}', true),
  ('terms-of-service', 'Terms of Service', '{"summary": "The terms that govern your use of Unity Microfinance Bank Canada accounts, online banking, and this website."}', true),
  ('cookie-policy', 'Cookie Policy', '{"summary": "How we use cookies and similar technologies on our website and online banking platform."}', true),
  ('accessibility', 'Accessibility Commitment', '{"summary": "Our commitment to accessible banking for all customers, in line with Canadian accessibility standards."}', true),
  ('security', 'Security & Your Protection', '{"summary": "How Unity Microfinance Bank Canada protects your accounts and what you can do to stay safe."}', true),
  ('fraud-prevention', 'Fraud Prevention', '{"summary": "Common scams targeting bank customers and how to protect yourself."}', true),
  ('financial-education', 'Financial Education Centre', '{"summary": "Free resources to help you build stronger financial habits, from budgeting to buying your first home."}', true)
ON CONFLICT (slug) DO UPDATE
SET title = EXCLUDED.title, content = EXCLUDED.content, is_published = EXCLUDED.is_published, updated_at = now();

DELETE FROM public.page_sections WHERE page_id IN (
  SELECT id FROM public.site_pages WHERE slug IN (
    'careers', 'branches', 'privacy-policy', 'terms-of-service', 'cookie-policy',
    'accessibility', 'security', 'fraud-prevention', 'financial-education'
  )
);

DO $$
DECLARE
  v_careers uuid;
  v_branches uuid;
  v_privacy uuid;
  v_terms uuid;
  v_cookies uuid;
  v_accessibility uuid;
  v_security uuid;
  v_fraud uuid;
  v_fin_ed uuid;
BEGIN
  SELECT id INTO v_careers FROM public.site_pages WHERE slug = 'careers';
  SELECT id INTO v_branches FROM public.site_pages WHERE slug = 'branches';
  SELECT id INTO v_privacy FROM public.site_pages WHERE slug = 'privacy-policy';
  SELECT id INTO v_terms FROM public.site_pages WHERE slug = 'terms-of-service';
  SELECT id INTO v_cookies FROM public.site_pages WHERE slug = 'cookie-policy';
  SELECT id INTO v_accessibility FROM public.site_pages WHERE slug = 'accessibility';
  SELECT id INTO v_security FROM public.site_pages WHERE slug = 'security';
  SELECT id INTO v_fraud FROM public.site_pages WHERE slug = 'fraud-prevention';
  SELECT id INTO v_fin_ed FROM public.site_pages WHERE slug = 'financial-education';

  -- CAREERS -----------------------------------------------------------------
  INSERT INTO public.page_sections (page_id, section_type, title, content, display_order) VALUES
    (v_careers, 'intro', 'Why Work With Us',
      '"We are growing across Canada and looking for people who care about doing right by customers. Our teams work across banking operations, technology, risk, and customer experience, from our head office in Toronto to fully remote roles."', 1),
    (v_careers, 'list', 'Current Openings',
      '["Personal Banking Advisor - Toronto, ON", "Business Banking Relationship Manager - Vancouver, BC", "Mortgage Specialist - Calgary, AB", "Fraud & Risk Analyst - Remote (Canada)", "Customer Support Representative - Montreal, QC"]', 2),
    (v_careers, 'content', 'How to Apply',
      '"Send your resume and a short note about the role you are interested in to careers@unitymfbcanada.ca. Our talent team reviews every application and responds within two weeks."', 3);

  -- BRANCHES -----------------------------------------------------------------
  INSERT INTO public.page_sections (page_id, section_type, title, content, display_order) VALUES
    (v_branches, 'intro', NULL,
      '"Bank in person at one of our branches, or manage everything online and through the mobile app. All branches offer full-service banking, including account opening, mortgage consultations, and business banking support."', 1),
    (v_branches, 'list', 'Locations',
      '["Toronto, ON - 100 King Street West, Suite 3200", "Vancouver, BC - 1055 West Georgia Street, Suite 800", "Calgary, AB - 335 8th Avenue SW, Suite 500", "Montreal, QC - 1250 Rene-Levesque Blvd West, Suite 2200", "Ottawa, ON - 150 Elgin Street, Suite 900"]', 2),
    (v_branches, 'content', 'Branch Hours',
      '"Monday-Friday: 9:00 AM-5:00 PM local time. Saturday: 9:00 AM-1:00 PM. Extended hours available by appointment."', 3);

  -- PRIVACY POLICY -----------------------------------------------------------
  INSERT INTO public.page_sections (page_id, section_type, title, content, display_order) VALUES
    (v_privacy, 'content', 'Our Commitment to Your Privacy',
      '"Unity Microfinance Bank Canada is committed to protecting your personal information in accordance with the Personal Information Protection and Electronic Documents Act (PIPEDA) and applicable provincial privacy legislation."', 1),
    (v_privacy, 'content', 'Information We Collect',
      '"We collect personal information you provide when you apply for an account or product, including your name, contact details, date of birth, Social Insurance Number, and financial information, as well as information generated through your use of our services."', 2),
    (v_privacy, 'content', 'How We Use Your Information',
      '"We use your information to open and service your accounts, assess creditworthiness, detect and prevent fraud, meet regulatory obligations, and, where you have consented, to tell you about products that may be relevant to you."', 3),
    (v_privacy, 'content', 'Your Rights',
      '"You have the right to access the personal information we hold about you, request corrections, and withdraw consent for marketing communications at any time. Contact our Privacy Officer to exercise these rights."', 4),
    (v_privacy, 'content', 'Contact Our Privacy Officer',
      '"Questions about this policy can be directed to our Privacy Officer at privacy@unitymfbcanada.ca or by mail to 100 King Street West, Suite 3200, Toronto, ON M5X 1A9."', 5);

  -- TERMS OF SERVICE -----------------------------------------------------------
  INSERT INTO public.page_sections (page_id, section_type, title, content, display_order) VALUES
    (v_terms, 'content', 'Agreement to Terms',
      '"These Terms of Service govern your use of Unity Microfinance Bank Canada accounts, online and mobile banking, and this website. By opening an account or using our services, you agree to these terms."', 1),
    (v_terms, 'content', 'Account Eligibility',
      '"Account holders must be Canadian residents of legal age with valid identification. You are responsible for maintaining the confidentiality of your login credentials and for all activity conducted through your account."', 2),
    (v_terms, 'content', 'Acceptable Use',
      '"You agree not to use our services for any unlawful purpose, including fraud, money laundering, or activity that violates Canadian financial regulations. We may suspend or close accounts used in violation of these terms."', 3),
    (v_terms, 'content', 'Limitation of Liability',
      '"Unity Microfinance Bank Canada is not liable for losses arising from circumstances beyond our reasonable control, including service interruptions, third-party errors, or unauthorized access resulting from a customer failing to protect their credentials."', 4),
    (v_terms, 'content', 'Changes to These Terms',
      '"We may update these terms from time to time. Material changes will be communicated through online banking or email, and continued use of our services constitutes acceptance of the updated terms."', 5);

  -- COOKIE POLICY -----------------------------------------------------------
  INSERT INTO public.page_sections (page_id, section_type, title, content, display_order) VALUES
    (v_cookies, 'content', 'How We Use Cookies',
      '"This website and our online banking platform use cookies to keep you securely logged in, remember your preferences, and understand how our services are used."', 1),
    (v_cookies, 'content', 'Types of Cookies We Use',
      '"We use essential cookies required for login and security, functional cookies that remember your settings, and analytics cookies that help us understand site usage so we can improve our services."', 2),
    (v_cookies, 'content', 'Managing Your Cookie Preferences',
      '"You can manage or disable non-essential cookies through your browser settings. Disabling essential cookies may prevent you from logging in to online banking or using certain website features."', 3);

  -- ACCESSIBILITY -----------------------------------------------------------
  INSERT INTO public.page_sections (page_id, section_type, title, content, display_order) VALUES
    (v_accessibility, 'content', 'Our Commitment',
      '"Unity Microfinance Bank Canada is committed to providing accessible banking services in accordance with the Accessibility for Ontarians with Disabilities Act (AODA) and applicable accessibility legislation across the provinces we serve."', 1),
    (v_accessibility, 'content', 'How We Support Accessibility',
      '"We design our website, mobile app, and in-branch services to be usable by customers of all abilities, including support for screen readers, keyboard navigation, and alternative formats for account documents on request."', 2),
    (v_accessibility, 'content', 'Feedback',
      '"If you encounter an accessibility barrier using our services, contact accessibility@unitymfbcanada.ca or call +1 (416) 555-0199 and we will work with you to resolve it."', 3);

  -- SECURITY -----------------------------------------------------------
  INSERT INTO public.page_sections (page_id, section_type, title, content, display_order) VALUES
    (v_security, 'content', 'Security Is Built In',
      '"Keeping your money and information safe is central to everything we build, from account encryption to real-time fraud monitoring."', 1),
    (v_security, 'content', 'How We Protect You',
      '"We use bank-grade encryption for every online and mobile banking session, two-factor authentication, continuous fraud monitoring, and instant alerts for unusual account activity. Eligible deposits are also protected by CDIC."', 2),
    (v_security, 'content', 'Your Role in Staying Secure',
      '"Protect your accounts by using a unique password, enabling two-factor authentication, never sharing your login details or one-time codes, and verifying any unexpected request for personal or financial information."', 3),
    (v_security, 'content', 'Report a Concern',
      '"If you notice suspicious activity on your account, contact us immediately at +1 (416) 555-0199 or freeze your card instantly through the mobile app."', 4);

  -- FRAUD PREVENTION -----------------------------------------------------------
  INSERT INTO public.page_sections (page_id, section_type, title, content, display_order) VALUES
    (v_fraud, 'content', 'Know the Warning Signs',
      '"Fraudsters increasingly impersonate banks, government agencies, and family members to trick people into sending money or sharing account information. Here is what to watch for."', 1),
    (v_fraud, 'list', 'Common Scams',
      '["Phishing emails or texts asking you to confirm your login or SIN", "Phone calls claiming to be from Unity Microfinance Bank Canada asking for your PIN or one-time code", "Interac e-Transfer scams promising a prize or refund in exchange for a small payment", "Investment offers guaranteeing unusually high returns with no risk"]', 2),
    (v_fraud, 'content', 'How to Protect Yourself',
      '"We will never call, text, or email you asking for your full password, PIN, or one-time verification code. If you receive a request like this, hang up and call us directly at +1 (416) 555-0199 using the number on the back of your card."', 3),
    (v_fraud, 'content', 'Report Fraud',
      '"If you believe you have been a victim of fraud, contact us immediately, then report the incident to the Canadian Anti-Fraud Centre at 1-888-495-8501."', 4);

  -- FINANCIAL EDUCATION -----------------------------------------------------------
  INSERT INTO public.page_sections (page_id, section_type, title, content, display_order) VALUES
    (v_fin_ed, 'content', 'Why Financial Education Matters',
      '"We believe informed customers make better financial decisions. Our Financial Education Centre offers free guides and resources on the topics that matter most."', 1),
    (v_fin_ed, 'list', 'Popular Topics',
      '["Building your first budget", "Understanding your credit score", "Saving for a down payment", "RRSP and TFSA basics", "Preparing for your first mortgage", "Recognizing and avoiding financial scams"]', 2),
    (v_fin_ed, 'content', 'Get Started',
      '"Explore these topics in online banking under Resources, or speak with an advisor at any branch for one-on-one guidance tailored to your goals."', 3);
END $$;

COMMIT;
