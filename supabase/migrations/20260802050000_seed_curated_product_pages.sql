-- Curates the product catalog down to the 6 pages the public nav links to
-- (Checking, Savings & CDs, Credit Cards, Home Loans, Auto Loans, Investing),
-- with real section/FAQ content for each. Existing products outside this set
-- are unpublished (not deleted) so no authored content is lost.

-- Rename/reposition the 3 reused pages to match the new nav.
UPDATE public.product_pages SET product_name = 'Savings & CDs', display_order = 2,
  short_description = 'High-yield savings accounts and certificates of deposit with rates that reward your patience.'
  WHERE slug = 'savings-account';

UPDATE public.product_pages SET product_name = 'Credit Cards', display_order = 3,
  short_description = 'Cards built for everyday spending, with real-time alerts and no hidden fees.'
  WHERE slug = 'cards';

UPDATE public.product_pages SET product_name = 'Investing', display_order = 6,
  short_description = 'Investment plans and guidance to help your money grow over the long term.'
  WHERE slug = 'investments';

-- New pages.
INSERT INTO public.product_pages (slug, product_name, short_description, status, display_order)
VALUES
  ('checking', 'Checking', 'Everyday checking accounts with no monthly fees and instant mobile access.', 'published', 1),
  ('home-loans', 'Home Loans', 'Mortgages and home equity financing with clear terms and dedicated support.', 'published', 4),
  ('auto-loans', 'Auto Loans', 'Competitive rates on new, used, and refinanced vehicle loans.', 'published', 5)
ON CONFLICT (slug) DO UPDATE SET
  product_name = EXCLUDED.product_name,
  short_description = EXCLUDED.short_description,
  status = 'published',
  display_order = EXCLUDED.display_order;

-- Out of scope for the current nav — unpublish rather than delete.
UPDATE public.product_pages SET status = 'draft'
  WHERE slug IN ('personal-loan', 'business-loan', 'transfers', 'education-loan', 'analytics');

-- Clear any previously-seeded sections/FAQs for the 6 curated pages so this
-- migration can be re-run cleanly, then insert real content.
DELETE FROM public.product_sections WHERE product_id IN (
  SELECT id FROM public.product_pages WHERE slug IN ('checking', 'savings-account', 'cards', 'home-loans', 'auto-loans', 'investments')
);
DELETE FROM public.faqs WHERE product_id IN (
  SELECT id FROM public.product_pages WHERE slug IN ('checking', 'savings-account', 'cards', 'home-loans', 'auto-loans', 'investments')
);

DO $$
DECLARE
  v_checking uuid;
  v_savings uuid;
  v_cards uuid;
  v_home_loans uuid;
  v_auto_loans uuid;
  v_investing uuid;
BEGIN
  SELECT id INTO v_checking FROM public.product_pages WHERE slug = 'checking';
  SELECT id INTO v_savings FROM public.product_pages WHERE slug = 'savings-account';
  SELECT id INTO v_cards FROM public.product_pages WHERE slug = 'cards';
  SELECT id INTO v_home_loans FROM public.product_pages WHERE slug = 'home-loans';
  SELECT id INTO v_auto_loans FROM public.product_pages WHERE slug = 'auto-loans';
  SELECT id INTO v_investing FROM public.product_pages WHERE slug = 'investments';

  -- CHECKING -----------------------------------------------------------
  INSERT INTO public.product_sections (product_id, section_type, title, content, display_order) VALUES
    (v_checking, 'description', 'Banking that works around you',
      '"No minimum balance, no monthly maintenance fee, and full access to your money through mobile check deposit, bill pay, and a nationwide ATM network."', 1),
    (v_checking, 'features', 'What''s included',
      '["No monthly maintenance fee", "Mobile check deposit", "Free bill pay", "Real-time transaction alerts", "Fee-free ATM network access"]', 2),
    (v_checking, 'benefits', 'Why customers choose it',
      '["Open an account in minutes online", "See pending transactions before they post", "Freeze your debit card instantly if it''s lost", "24/7 account access from any device"]', 3),
    (v_checking, 'how_it_works', 'Getting started',
      '["Apply online with a valid ID and Social Security number", "Fund your account with a transfer or mobile deposit", "Activate your debit card and set up mobile banking", "Start spending, saving, and tracking in one place"]', 4);

  INSERT INTO public.faqs (product_id, question, answer, display_order) VALUES
    (v_checking, 'Is there a minimum balance requirement?', 'No. Checking accounts have no minimum balance requirement and no monthly maintenance fee.', 1),
    (v_checking, 'How do I deposit checks?', 'Use the mobile app to photograph and deposit checks, or visit any branch or partner ATM.', 2),
    (v_checking, 'Can I open a checking account online?', 'Yes, the entire application takes about 10 minutes and can be completed from your phone or computer.', 3);

  -- SAVINGS & CDS --------------------------------------------------------
  INSERT INTO public.product_sections (product_id, section_type, title, content, display_order) VALUES
    (v_savings, 'description', 'Grow your savings, your way',
      '"Choose a flexible high-yield savings account for everyday saving, or lock in a fixed rate with a certificate of deposit (CD) for long-term goals."', 1),
    (v_savings, 'features', 'Account options',
      '["High-yield savings with up to 4.5% APY", "Certificates of deposit from 3 to 60 months", "No monthly fees on savings accounts", "Automatic recurring transfers"]', 2),
    (v_savings, 'benefits', 'Why it pays to save with us',
      '["Interest compounds monthly, not just annually", "Set savings goals and track progress in the app", "CD rates are locked in for the full term", "FDIC-style deposit protection on every account"]', 3),
    (v_savings, 'how_it_works', 'Opening an account',
      '["Choose between a savings account or a CD term", "Fund your account with an initial deposit", "Set up automatic transfers to build your balance faster", "Watch your interest add up every month"]', 4);

  INSERT INTO public.faqs (product_id, question, answer, display_order) VALUES
    (v_savings, 'What is the current interest rate?', 'Savings accounts earn up to 4.5% APY, compounded monthly. Rates for CDs vary by term length.', 1),
    (v_savings, 'What happens if I withdraw from a CD early?', 'An early withdrawal penalty applies, typically equal to a portion of the interest earned. Ask a banker for the exact terms of your CD.', 2),
    (v_savings, 'Is there a minimum deposit?', 'Savings accounts can be opened with as little as $25. CDs typically require a minimum opening deposit of $500.', 3);

  -- CREDIT CARDS -----------------------------------------------------------
  INSERT INTO public.product_sections (product_id, section_type, title, content, display_order) VALUES
    (v_cards, 'description', 'Cards for how you actually spend',
      '"Earn rewards on everyday purchases, track spending in real time, and manage your card entirely from your phone — including instant freeze if it''s ever lost or stolen."', 1),
    (v_cards, 'features', 'Card features',
      '["Cash back on everyday categories", "Real-time purchase alerts", "Instant card freeze/unfreeze", "Virtual card numbers for online shopping", "No foreign transaction fees"]', 2),
    (v_cards, 'benefits', 'Why it''s worth carrying',
      '["No annual fee on standard cards", "Build credit history with responsible use", "Redeem rewards directly in the mobile app", "Zero-liability protection on unauthorized charges"]', 3),
    (v_cards, 'how_it_works', 'Applying for a card',
      '["Check your eligibility with a soft credit check", "Complete the application in a few minutes", "Get an instant decision in most cases", "Add your card to a digital wallet as soon as it''s approved"]', 4);

  INSERT INTO public.faqs (product_id, question, answer, display_order) VALUES
    (v_cards, 'Will checking my eligibility affect my credit score?', 'No. Checking your eligibility uses a soft credit check, which does not impact your credit score.', 1),
    (v_cards, 'How do I redeem cash back?', 'Redeem rewards anytime from the Cards section of the mobile app — as a statement credit, deposit, or gift card.', 2),
    (v_cards, 'What should I do if my card is lost or stolen?', 'Freeze your card instantly in the app, then report it lost or stolen to get a replacement issued.', 3);

  -- HOME LOANS -----------------------------------------------------------
  INSERT INTO public.product_sections (product_id, section_type, title, content, display_order) VALUES
    (v_home_loans, 'description', 'Financing for every stage of homeownership',
      '"Whether you''re buying your first home, refinancing, or borrowing against your home''s equity, we offer clear terms and a dedicated loan officer to guide you through the process."', 1),
    (v_home_loans, 'features', 'Loan options',
      '["Fixed and adjustable-rate mortgages", "Home equity lines of credit (HELOC)", "Refinancing to lower your rate or monthly payment", "First-time homebuyer programs"]', 2),
    (v_home_loans, 'benefits', 'Why borrowers choose us',
      '["Pre-qualify online without affecting your credit", "A dedicated loan officer from application to closing", "Competitive rates with transparent fees", "Track your application status in real time"]', 3),
    (v_home_loans, 'how_it_works', 'The loan process',
      '["Get pre-qualified in minutes online", "Submit documentation for full pre-approval", "Shop with confidence using your pre-approval letter", "Close with support from your dedicated loan officer"]', 4);

  INSERT INTO public.faqs (product_id, question, answer, display_order) VALUES
    (v_home_loans, 'What credit score do I need to qualify?', 'Requirements vary by loan program; many first-time buyer programs accept scores as low as 620. Pre-qualification will show your specific options.', 1),
    (v_home_loans, 'How long does the mortgage process take?', 'Most mortgages close within 30-45 days of a complete application, though it can vary based on the property and loan type.', 2),
    (v_home_loans, 'Can I use a HELOC for anything?', 'Yes, a home equity line of credit can be used for renovations, debt consolidation, education costs, or other major expenses.', 3);

  -- AUTO LOANS -----------------------------------------------------------
  INSERT INTO public.product_sections (product_id, section_type, title, content, display_order) VALUES
    (v_auto_loans, 'description', 'Drive off with a rate you can count on',
      '"Finance a new or used vehicle, or refinance your current auto loan for a better rate — with a decision in minutes and funds that go straight to the dealer or your account."', 1),
    (v_auto_loans, 'features', 'Loan options',
      '["New and used vehicle financing", "Auto loan refinancing", "Terms from 24 to 72 months", "Same-day funding in most cases"]', 2),
    (v_auto_loans, 'benefits', 'Why finance with us',
      '["Get pre-approved before you visit the dealership", "Fixed rates with no prepayment penalty", "Manage payments and payoff from the mobile app", "Fast decisions, often within minutes"]', 3),
    (v_auto_loans, 'how_it_works', 'How to apply',
      '["Apply online in a few minutes", "Get a decision and rate offer", "Use your pre-approval to negotiate at the dealership", "Sign your documents and drive away"]', 4);

  INSERT INTO public.faqs (product_id, question, answer, display_order) VALUES
    (v_auto_loans, 'Can I get pre-approved before choosing a car?', 'Yes — pre-approval gives you a firm rate and budget to shop with, at the dealership or from a private seller.', 1),
    (v_auto_loans, 'Do you finance used vehicles?', 'Yes, we finance both new and used vehicles, including private-party purchases, subject to vehicle age and mileage limits.', 2),
    (v_auto_loans, 'Is there a penalty for paying off my loan early?', 'No, there is no prepayment penalty on auto loans — pay it off early and save on interest.', 3);

  -- INVESTING -----------------------------------------------------------
  INSERT INTO public.product_sections (product_id, section_type, title, content, display_order) VALUES
    (v_investing, 'description', 'Invest with a plan, not just a hunch',
      '"Access diversified investment plans and portfolio guidance designed around your goals and timeline, whether you''re just starting out or planning for retirement."', 1),
    (v_investing, 'features', 'What you get',
      '["Diversified investment portfolios", "Retirement planning tools", "Automatic recurring investments", "Portfolio performance tracking in the app"]', 2),
    (v_investing, 'benefits', 'Why invest with us',
      '["Start with as little as $50", "No hidden management fees", "Adjust your risk level as your goals change", "Guidance available whenever you need it"]', 3),
    (v_investing, 'how_it_works', 'Getting started',
      '["Answer a few questions about your goals and timeline", "Get a recommended portfolio mix", "Fund your account and set up recurring contributions", "Track performance and rebalance as needed"]', 4);

  INSERT INTO public.faqs (product_id, question, answer, display_order) VALUES
    (v_investing, 'How much do I need to start investing?', 'You can open an investment account and start with as little as $50.', 1),
    (v_investing, 'Are my investments insured like a savings account?', 'No. Investment products are not deposits and are not insured; their value can go up or down based on market performance.', 2),
    (v_investing, 'Can I change my portfolio later?', 'Yes, you can adjust your risk level and portfolio mix at any time as your goals or timeline change.', 3);
END $$;
