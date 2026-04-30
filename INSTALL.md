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
5. Go to Project Settings, then API.
6. Copy the Project URL and anon public key.

## 4. Create The Environment File

Create a file named `.env` in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Use your real Supabase URL and anon key. Do not commit `.env`.

## 5. Install The Database

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

## 6. Add Demo Data

Open `seed-demo.sql` in Supabase SQL Editor and run it after all migrations.

Demo credentials:

```text
Admin: admin@demo.local / DemoAdmin123!
Customer: customer@demo.local / DemoCustomer123!
```

If your Supabase Auth schema rejects direct SQL auth inserts, create these two users in Supabase Authentication first, then rerun the seed file.

## 7. Run The App

```sh
npm run dev
```

Open the local URL shown in the terminal, usually `http://localhost:5173`.

## 8. Verify The Build

```sh
npm run lint
npm run build
```

Both commands should finish without errors.

## 9. Prepare For Sale Or Deployment

1. Add real screenshots to a `screenshots` folder.
2. Replace placeholder domain values in public SEO files if needed.
3. Confirm `.env`, `dist`, `node_modules`, audit files, and archive files are not committed.
4. Deploy to Vercel, Netlify, or your preferred static hosting provider.
