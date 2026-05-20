# Install Guide

This guide assumes you are starting from a fresh computer and a fresh Supabase project.

## 1. Install The Tools

1. Install Node.js 18 or newer from https://nodejs.org.
2. Install Git from https://git-scm.com.
3. Create a Supabase account at https://supabase.com.
4. Optional but recommended: install the Supabase CLI from https://supabase.com/docs/guides/cli.

## 2. Download The Project

Open a terminal, then run:

```sh
git clone <your-repository-url>
cd smart-banking-flow
npm install
```

## 3. Create A Supabase Project

1. Open Supabase.
2. Click New project.
3. Choose a project name, password, and region.
4. Wait for Supabase to finish provisioning.
5. Copy these values for the setup command:
   - Project ref from the project URL: `https://supabase.com/dashboard/project/<project-ref>`
   - Project URL from Project Settings, then API
   - Anon/public key from Project Settings, then API
   - Database password you chose when creating the project
   - Personal access token from Account, then Access Tokens

## 4. Run The Supabase Setup

From the project folder, run:

```sh
npm run setup:supabase
```

Paste the values when prompted. The setup command will:

1. Write `.env`.
2. Update `supabase/config.toml`.
3. Copy `seed-demo.sql` to the CLI seed location.
4. Link the local project to Supabase.
5. Push all migrations.
6. Seed the demo accounts and banking data.
7. Run a frontend build check.

Demo credentials after seeding:

```text
Admin: admin@halverixbank.com / DemoAdmin123!
Customer: customer@halverixbank.com / DemoCustomer123!
```

To sync later after migrations change:

```sh
npm run sync:supabase
```

To sync migrations without seed data:

```sh
npm run sync:supabase:no-seed
```

To verify the frontend connection without printing any secrets:

```sh
npm run audit:supabase
```

This checks the configured Supabase URL, confirms the anon/publishable key is present, calls the public CMS tables, and verifies saved logo/favicon URLs if they exist.

## 5. Manual Environment File Option

Create a file named `.env` in the project root:

```env
VITE_SUPABASE_PROJECT_ID=your-project-ref
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

Use your real Supabase URL and anon key. Do not commit `.env`.

## 6. Manual Database Install Option

Use one of these options.

### Option A: Supabase CLI

Link your project:

```sh
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

### Option B: Supabase SQL Editor

1. Open Supabase SQL Editor.
2. Run the SQL files in `supabase/migrations` from oldest to newest.
3. Wait for each file to finish before running the next one.

## 7. Manual Demo Data Option

Open `seed-demo.sql` in Supabase SQL Editor and run it after all migrations.

Demo credentials:

```text
Admin: admin@halverixbank.com / DemoAdmin123!
Customer: customer@halverixbank.com / DemoCustomer123!
```

If your Supabase Auth schema rejects direct SQL auth inserts, create these two users in Supabase Authentication first, then rerun the seed file.

## 8. Run The App

```sh
npm run dev
```

Open the local URL shown in the terminal, usually `http://localhost:8080`.

## 9. Verify The Build

```sh
npm run lint
npm run build
```

Both commands should finish without errors.

## 10. Prepare For Sale Or Deployment

1. Add real screenshots to a `screenshots` folder.
2. Replace placeholder domain values in public SEO files if needed.
3. Confirm `.env`, `dist`, `node_modules`, audit files, and archive files are not committed.
4. Deploy to Vercel, Netlify, or your preferred static hosting provider.
