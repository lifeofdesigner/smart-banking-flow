-- Seed public CMS content inspired by https://unitymfb.icu.
-- This keeps the content editable in Admin > Content and Admin > Site Settings.

INSERT INTO public.site_settings (key, value)
VALUES
  ('site_name', 'Unity Microfinance Bank'),
  ('site_tagline', 'Your partner in growth and financial success.'),
  ('site_description', 'Unity Microfinance Bank provides customer-focused personal banking, business banking, lending, transfers, deposits, investments, and digital banking services.'),
  ('site_keywords', 'Unity Microfinance Bank, microfinance bank, personal banking, business banking, loans, deposits, wire transfers, online banking'),
  ('site_logo_url', 'https://unitymfb.icu/assets/images/logoIcon/logo.png'),
  ('mobile_logo_url', 'https://unitymfb.icu/assets/images/logoIcon/logo.png'),
  ('site_favicon_url', 'https://unitymfb.icu/assets/images/logoIcon/logo.png'),
  ('site_og_image_url', 'https://unitymfb.icu/assets/images/logoIcon/logo.png'),
  ('brand_initials', 'UM'),
  ('support_email', 'help@unitymfb.icu'),
  ('support_phone', '+1 800-0000-TOLL'),
  ('support_hours', 'Customer support: 8am - 4pm'),
  ('contact_section_title', 'Contact Us'),
  ('contact_section_subtitle', 'Reach Unity Microfinance Bank for account, loan, transfer, and online banking support.'),
  ('contact_email_primary', 'help@unitymfb.icu'),
  ('contact_phone_primary', '+1 800-0000-TOLL'),
  ('contact_hours_line_1', 'Customer support: 8am - 4pm'),
  ('footer_description', 'Unity Microfinance Bank is committed to innovative, customer-focused banking solutions for individuals, entrepreneurs, and businesses.'),
  ('footer_disclaimer', 'Copyright © 2026 Unity Microfinance Bank. All rights reserved.'),
  ('footer_quick_links_json', '[{"label":"Register","href":"/auth"},{"label":"Services","href":"#services"},{"label":"Contact","href":"#contact"}]'),
  ('footer_service_links_json', '[{"label":"Personal Banking","href":"/products/personal-banking"},{"label":"Business Banking","href":"/products/business-banking"},{"label":"Wire Transfers","href":"/products/remittances-wire-transfers"},{"label":"Loan Services","href":"/products/loan-services"}]'),
  ('footer_legal_links_json', '[{"label":"Company Policy","href":"#"},{"label":"Privacy Policy","href":"#"},{"label":"Terms of Service","href":"#"}]'),
  ('hero_badge_text', 'Online and mobile banking for everyday growth'),
  ('hero_primary_cta_label', 'Get Started'),
  ('hero_secondary_cta_label', 'Explore Services'),
  ('hero_stat_1_value', '8am-4pm'),
  ('hero_stat_1_label', 'Support Hours'),
  ('hero_stat_2_value', '24/7'),
  ('hero_stat_2_label', 'Online Access'),
  ('hero_stat_3_value', 'Secure'),
  ('hero_stat_3_label', 'Digital Banking'),
  ('hero_image_alt', 'Unity Microfinance Bank digital banking services')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;

DO $$
BEGIN
  UPDATE public.homepage_sections
  SET
    title = 'Unlock Your Business Potential',
    subtitle = 'We are your partner in growth and financial success.',
    content = '{"headline":"Unlock Your Business Potential","subheadline":"We are your partner in growth and financial success."}',
    image = NULL,
    display_order = 0,
    status = 'active'
  WHERE section_type = 'hero';

  IF NOT FOUND THEN
    INSERT INTO public.homepage_sections (section_type, title, subtitle, content, display_order, status)
    VALUES ('hero', 'Unlock Your Business Potential', 'We are your partner in growth and financial success.', '{"headline":"Unlock Your Business Potential","subheadline":"We are your partner in growth and financial success."}', 0, 'active');
  END IF;

  UPDATE public.homepage_sections
  SET
    title = 'What We Offer',
    subtitle = 'Banking services for individuals, entrepreneurs, families, and businesses.',
    content = '[
      {"icon":"dollar","title":"Online Payment","description":"Secure online and mobile banking services for banking on the go."},
      {"icon":"credit","title":"Take Loan","description":"Flexible loan plans with a straightforward application process."},
      {"icon":"savings","title":"Deposit Schemes","description":"Deposit options including pension-style savings and fixed deposit products."},
      {"icon":"trending","title":"Transfer Money","description":"Move funds within Unity MFB or to supported banks through saved beneficiaries."},
      {"icon":"briefcase","title":"Business Banking","description":"Affordable banking solutions that support small businesses and entrepreneurs."},
      {"icon":"investment","title":"Investment & Asset Management","description":"Investment support designed around your goals, risk tolerance, and time horizon."}
    ]',
    image = NULL,
    display_order = 2,
    status = 'active'
  WHERE section_type = 'services';

  IF NOT FOUND THEN
    INSERT INTO public.homepage_sections (section_type, title, subtitle, content, display_order, status)
    VALUES (
      'services',
      'What We Offer',
      'Banking services for individuals, entrepreneurs, families, and businesses.',
      '[
        {"icon":"dollar","title":"Online Payment","description":"Secure online and mobile banking services for banking on the go."},
        {"icon":"credit","title":"Take Loan","description":"Flexible loan plans with a straightforward application process."},
        {"icon":"savings","title":"Deposit Schemes","description":"Deposit options including pension-style savings and fixed deposit products."},
        {"icon":"trending","title":"Transfer Money","description":"Move funds within Unity MFB or to supported banks through saved beneficiaries."},
        {"icon":"briefcase","title":"Business Banking","description":"Affordable banking solutions that support small businesses and entrepreneurs."},
        {"icon":"investment","title":"Investment & Asset Management","description":"Investment support designed around your goals, risk tolerance, and time horizon."}
      ]',
      2,
      'active'
    );
  END IF;

  UPDATE public.homepage_sections
  SET
    title = 'Banking Products',
    subtitle = 'Choose services that match your personal, business, deposit, transfer, and investment needs.',
    content = NULL,
    image = NULL,
    display_order = 3,
    status = 'active'
  WHERE section_type = 'products';

  IF NOT FOUND THEN
    INSERT INTO public.homepage_sections (section_type, title, subtitle, content, display_order, status)
    VALUES ('products', 'Banking Products', 'Choose services that match your personal, business, deposit, transfer, and investment needs.', NULL, 3, 'active');
  END IF;

  UPDATE public.homepage_sections
  SET
    title = 'Why Choose Unity Microfinance Bank?',
    subtitle = 'We are committed to accessible, inclusive, and customer-focused financial services.',
    content = '{
      "body":"Unity Microfinance Bank is committed to accessible, inclusive, and customer-focused financial services.",
      "cards":[
        {"icon":"target","title":"Financial Literacy & Empowerment","description":"We help clients understand financial products and make informed decisions with confidence."},
        {"icon":"users","title":"Accessible & Inclusive Banking","description":"Our services are designed to support underserved communities, entrepreneurs, and everyday customers."},
        {"icon":"credit","title":"Convenient Online & Mobile Banking","description":"Manage accounts, transfers, and banking services securely from anywhere."},
        {"icon":"award","title":"Expert Financial Guidance","description":"Our team provides practical guidance to help customers navigate important financial decisions."},
        {"icon":"briefcase","title":"Comprehensive Services","description":"From everyday banking to lending, deposits, and wealth solutions, we support a broad range of financial goals."}
      ]
    }',
    image = NULL,
    display_order = 4,
    status = 'active'
  WHERE section_type = 'about';

  IF NOT FOUND THEN
    INSERT INTO public.homepage_sections (section_type, title, subtitle, content, display_order, status)
    VALUES (
      'about',
      'Why Choose Unity Microfinance Bank?',
      'We are committed to accessible, inclusive, and customer-focused financial services.',
      '{
        "body":"Unity Microfinance Bank is committed to accessible, inclusive, and customer-focused financial services.",
        "cards":[
          {"icon":"target","title":"Financial Literacy & Empowerment","description":"We help clients understand financial products and make informed decisions with confidence."},
          {"icon":"users","title":"Accessible & Inclusive Banking","description":"Our services are designed to support underserved communities, entrepreneurs, and everyday customers."},
          {"icon":"credit","title":"Convenient Online & Mobile Banking","description":"Manage accounts, transfers, and banking services securely from anywhere."},
          {"icon":"award","title":"Expert Financial Guidance","description":"Our team provides practical guidance to help customers navigate important financial decisions."},
          {"icon":"briefcase","title":"Comprehensive Services","description":"From everyday banking to lending, deposits, and wealth solutions, we support a broad range of financial goals."}
        ]
      }',
      4,
      'active'
    );
  END IF;

  UPDATE public.homepage_sections
  SET
    title = 'It Is Easy To Join Our Community',
    subtitle = 'Open an account, verify your details, fund your account, and start using Unity MFB services.',
    content = '1. Open an account by completing registration.
2. Verify your email and mobile number.
3. Deposit funds into your account.
4. Start using available banking, deposit, transfer, and lending services.',
    image = NULL,
    display_order = 5,
    status = 'active'
  WHERE section_type = 'how_it_works';

  IF NOT FOUND THEN
    INSERT INTO public.homepage_sections (section_type, title, subtitle, content, display_order, status)
    VALUES (
      'how_it_works',
      'It Is Easy To Join Our Community',
      'Open an account, verify your details, fund your account, and start using Unity MFB services.',
      '1. Open an account by completing registration.
2. Verify your email and mobile number.
3. Deposit funds into your account.
4. Start using available banking, deposit, transfer, and lending services.',
      5,
      'active'
    );
  END IF;

  UPDATE public.homepage_sections
  SET
    title = 'Frequently Asked Questions',
    subtitle = 'Answers to common questions about Unity MFB accounts, online banking, loans, and support.',
    content = '[
      {"question":"What services does Unity MFB offer?","answer":"Unity MFB offers personal banking, business banking, investment support, remittances, wire transfers, deposits, lending, and online banking services."},
      {"question":"How do I open an account with Unity MFB?","answer":"You can begin registration online or contact support for guidance. Valid identification and required account-opening information may be needed."},
      {"question":"How can I access my account online?","answer":"Use the secure internet banking portal to access your account. Contact support if you need login assistance."},
      {"question":"What should I do if I forget my online banking password?","answer":"Use the password reset option on the login page and follow the identity verification steps."},
      {"question":"How do I apply for a loan?","answer":"Start from the online application flow or contact the loan team through customer support. The team will guide you through the process."},
      {"question":"Can I access my account from abroad?","answer":"Yes, online banking can be accessed from abroad when you have a secure internet connection."},
      {"question":"How can I provide feedback or file a complaint?","answer":"Contact customer support through help@unitymfb.icu or +1 800-0000-TOLL."}
    ]',
    image = NULL,
    display_order = 6,
    status = 'active'
  WHERE section_type IN ('faq', 'faqs');

  IF NOT FOUND THEN
    INSERT INTO public.homepage_sections (section_type, title, subtitle, content, display_order, status)
    VALUES (
      'faq',
      'Frequently Asked Questions',
      'Answers to common questions about Unity MFB accounts, online banking, loans, and support.',
      '[
        {"question":"What services does Unity MFB offer?","answer":"Unity MFB offers personal banking, business banking, investment support, remittances, wire transfers, deposits, lending, and online banking services."},
        {"question":"How do I open an account with Unity MFB?","answer":"You can begin registration online or contact support for guidance. Valid identification and required account-opening information may be needed."},
        {"question":"How can I access my account online?","answer":"Use the secure internet banking portal to access your account. Contact support if you need login assistance."},
        {"question":"What should I do if I forget my online banking password?","answer":"Use the password reset option on the login page and follow the identity verification steps."},
        {"question":"How do I apply for a loan?","answer":"Start from the online application flow or contact the loan team through customer support. The team will guide you through the process."},
        {"question":"Can I access my account from abroad?","answer":"Yes, online banking can be accessed from abroad when you have a secure internet connection."},
        {"question":"How can I provide feedback or file a complaint?","answer":"Contact customer support through help@unitymfb.icu or +1 800-0000-TOLL."}
      ]',
      6,
      'active'
    );
  END IF;

  UPDATE public.homepage_sections
  SET
    title = 'Contact Us',
    subtitle = 'Get support for online banking, transfers, loans, deposits, and account questions.',
    content = '{"phone":["+1 800-0000-TOLL"],"email":["help@unitymfb.icu"],"hours":["Customer support: 8am - 4pm"]}',
    image = NULL,
    display_order = 7,
    status = 'active'
  WHERE section_type = 'contact';

  IF NOT FOUND THEN
    INSERT INTO public.homepage_sections (section_type, title, subtitle, content, display_order, status)
    VALUES ('contact', 'Contact Us', 'Get support for online banking, transfers, loans, deposits, and account questions.', '{"phone":["+1 800-0000-TOLL"],"email":["help@unitymfb.icu"],"hours":["Customer support: 8am - 4pm"]}', 7, 'active');
  END IF;
END $$;

INSERT INTO public.product_pages (
  product_name,
  slug,
  short_description,
  full_description,
  meta_description,
  icon,
  status,
  display_order
)
VALUES
  ('Online Payment', 'online-payment', 'Secure online and mobile banking services for banking on the go.', 'Access digital banking tools for payments, account activity, and everyday financial management wherever you are.', 'Secure online and mobile banking from Unity Microfinance Bank.', 'dollar', 'active', 0),
  ('Loan Services', 'loan-services', 'Flexible loan plans with a simple application process.', 'Apply for personal or business credit using a straightforward process designed to support financial growth.', 'Unity MFB loan services for individuals and businesses.', 'credit', 'active', 1),
  ('Deposit Schemes', 'deposit-schemes', 'Deposit options including pension-style savings and fixed deposit products.', 'Choose deposit products designed to help customers save consistently and plan for future financial needs.', 'Unity MFB deposit products and fixed deposit options.', 'savings', 'active', 2),
  ('Transfer Money', 'transfer-money', 'Transfer funds within Unity MFB or to supported banks through beneficiaries.', 'Send funds securely using saved beneficiaries and digital banking transfer tools.', 'Unity MFB transfer services for local and supported bank transfers.', 'trending', 'active', 3),
  ('Remittances & Wire Transfers', 'remittances-wire-transfers', 'Send money securely for domestic and international transfer needs.', 'Move funds for family, personal, or business needs through secure remittance and wire transfer services.', 'Unity MFB remittance and wire transfer services.', 'trending', 'active', 4),
  ('Business Banking', 'business-banking', 'Affordable banking solutions for small businesses and entrepreneurs.', 'Support business growth with practical accounts, payment tools, financing access, and digital banking services.', 'Unity MFB business banking for entrepreneurs and companies.', 'briefcase', 'active', 5),
  ('Personal Banking', 'personal-banking', 'Financial products tailored for individual savings, credit, and account needs.', 'Manage personal finances with banking services designed around saving, borrowing, investing, and secure access.', 'Unity MFB personal banking products.', 'savings', 'active', 6),
  ('Investment & Asset Management', 'investment-asset-management', 'Investment support based on goals, time horizon, and risk tolerance.', 'Plan and manage wealth with guidance focused on preserving capital and finding opportunities for growth.', 'Unity MFB investment and asset management services.', 'investment', 'active', 7),
  ('Trust and Estate Planning', 'trust-estate-planning', 'Planning support to help preserve wealth for families and beneficiaries.', 'Create a thoughtful estate and trust planning strategy that helps protect family wealth and prepare for future needs.', 'Unity MFB trust and estate planning support.', 'award', 'active', 8),
  ('Insurance Planning', 'insurance-planning', 'Protection planning for families, homes, businesses, and future goals.', 'Explore planning options that help protect loved ones and assets from unexpected events.', 'Unity MFB insurance planning guidance.', 'shield', 'active', 9)
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
