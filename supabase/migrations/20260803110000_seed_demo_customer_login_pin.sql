-- The "Try as Customer (Demo)" button on the sign-in page signs the demo
-- customer in directly (handleDemoLogin in src/pages/Auth.tsx), bypassing
-- the interactive PIN-entry screen for a frictionless one-click demo. But
-- the DashboardLayout/Beneficiaries/KYCVerification backstop (useRequireLoginPin)
-- still requires a verified PIN for any non-admin session, so without one
-- the demo customer would be signed back out the moment they land on the
-- dashboard. handleDemoLogin silently calls verify_login_pin with this same
-- well-known PIN right after signing in — publicly known is fine here, this
-- is the same demo account whose password is already hardcoded in the
-- frontend bundle.
INSERT INTO public.user_login_pins (user_id, pin_hash, set_at)
SELECT id, extensions.crypt('123456', extensions.gen_salt('bf')), now()
FROM auth.users
WHERE email = 'customer@halverixbank.com'
ON CONFLICT (user_id) DO NOTHING;
