# Smart Banking App — React + TypeScript + Supabase

A full-stack smart banking dashboard and admin portal built with React, TypeScript, Vite, Tailwind CSS, shadcn/ui, and Supabase.

## Features

- Customer authentication with Supabase Auth
- Account dashboard with balances, recent transactions, insights, and notifications
- Internal transfers, beneficiaries, wire transfers, bill payments, cards, investments, savings goals, loans, statements, and ATM withdrawal workflows
- KYC verification and live chat support
- Admin portal for users, accounts, wires, loans, fees, fraud alerts, referrals, audit logs, reports, liquidity, support tickets, cards, investments, bills, ATM withdrawals, savings, scheduled transfers, site settings, and content management
- Supabase migrations, RPCs, RLS policies, and demo seed data

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Supabase Auth, Database, Realtime, Edge Functions
- ESLint

## Requirements

- Node.js 18 or newer
- npm
- A Supabase project
- Supabase CLI, recommended for local migration workflows

## Install

```sh
npm install
cp .env.example .env
npm run dev
```

Fill `.env` with your Supabase project URL and anon key:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Apply the SQL migrations in `supabase/migrations`, then optionally run `seed-demo.sql` in the Supabase SQL editor to load demo data.

## Scripts

```sh
npm run dev
npm run lint
npm run build
npm run preview
```

## Screenshots

Add screenshots here before listing the product:

- `screenshots/customer-dashboard.png`
- `screenshots/admin-dashboard.png`
- `screenshots/transfer-flow.png`
- `screenshots/mobile-dashboard.png`

## License

Commercial license. Replace this section with your final marketplace or buyer license terms before distribution.
