# Local User Manager

This project includes a local-only Supabase user creator for recovery/setup work. It creates or updates Supabase Auth users, profiles, roles, and a primary bank account directly in the configured Supabase database.

Use this only from your local machine. It does not put service role keys in frontend code and it does not require logging in through the app first.

## Requirements

- `psql` must be available in your terminal.
- `.env.migration.local` must contain `NEW_DB_CONNECTION_STRING`, or create `.env.local-user-manager` with:

```env
LOCAL_USER_MANAGER_DB_URL=postgresql://...
```

Both files are ignored by git. Do not commit database URLs or service role keys.

## Interactive Mode

```bash
npm run local:create-user
```

Follow the prompts to create an admin or customer.

## One-Line Admin

```bash
npm run local:create-admin -- --name "Bank Admin" --email "admin@example.com" --password "StrongPassword123!" --balance 0
```

## One-Line Customer

```bash
npm run local:create-customer -- --name "Jane Customer" --email "jane@example.com" --password "StrongPassword123!" --phone "+10000000000" --account-type savings --balance 250 --kyc-status verified
```

## What It Writes

- `auth.users`
- `auth.identities`
- `public.profiles`
- `public.user_roles`
- `public.accounts`

If the email already exists, the tool updates the user password/profile/role/account instead of creating a duplicate.

