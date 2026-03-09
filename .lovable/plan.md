
## Plan: Modern Fintech UI Upgrade

### What exists today
- `DashboardLayout.tsx` — desktop sidebar-only layout, no mobile bottom nav
- `Dashboard.tsx` — basic welcome + account cards + transactions list
- `AccountsPage.tsx` — grid of cards opening a Sheet with basic info
- `Analytics.tsx` — charts using raw transaction types (no category mapping)
- `ReferralProgram.tsx` added, but `/referral` not in App.tsx routes or sidebar
- No budgets table, no spending-category mapping, no financial health score
- No mobile-optimised experience

---

### What will be built

**Step 1 — Mobile bottom nav**
- `src/components/MobileBottomNav.tsx` — fixed bottom bar (Home / Accounts / Transfers / Analytics / Profile), visible only on `md:hidden`
- `DashboardLayout.tsx` — import `MobileBottomNav`, add `pb-20 md:pb-0` to `<main>` so content clears the bar; hide sidebar trigger on mobile when bottom nav is active

**Step 2 — Modern account cards (carousel on mobile)**
- `src/components/AccountCard.tsx` — rich gradient card: masked account number (`••••` + last 4), balance, currency, type badge, chip-style icon
- `AccountsPage.tsx` — replace grid with `embla-carousel-react` scroll on mobile, normal grid on desktop; keep click-to-detail sheet

**Step 3 — Balance history chart**
- `AccountsPage.tsx` (detail Sheet) — reconstruct balance history from transactions by computing a running balance array; render a Recharts `AreaChart` with 7/30/90-day toggle

**Step 4 — Spending insights page with category mapping**
- `src/lib/categories.ts` — map raw `transaction_type` → user-friendly category (Food, Transport, Shopping, Bills, Transfers, Income, etc.)
- `src/pages/SpendingInsights.tsx` — new page; donut chart (category breakdown), bar chart (monthly), "largest category" highlight card
- Add `/spending-insights` route and sidebar entry under Finance

**Step 5 — Budgeting assistant**
- **DB migration** — `budgets` table: `id, user_id, category, monthly_limit, updated_at` with RLS (`user owns row`)
- `src/pages/Budgets.tsx` — list categories, set monthly limits, progress bars vs actual spend, red warning if exceeded
- Add `/budgets` route and sidebar entry; show budget warning toast when over 90 %

**Step 6 — Smart financial insights widget**
- `src/components/SmartInsightsWidget.tsx` — computes: this-month vs last-month spend per category, income trend, savings rate; renders 2-4 insight chips ("🔺 Food up 22% vs last month", "✅ Savings rate 18%")
- Placed on `Dashboard.tsx` above quick actions

**Step 7 — Enhanced notification system**
- `NotificationBell.tsx` — keep existing popover; add a `sonner` toast on real-time INSERT events so the user sees a popup for new transactions/alerts
- `src/components/NotificationToaster.tsx` — invisible component mounted in `DashboardLayout` that subscribes to notifications channel and fires `toast()` calls

**Step 8 — Financial health widget**
- `src/components/FinancialHealthWidget.tsx` — score (0-100) from: savings rate, balance / monthly-spend ratio, active loan burden; rendered as a circular progress arc + label ("Good / Fair / Excellent"), plus 4 stat chips (total balance, monthly income, monthly spend, savings %)
- Placed prominently at top of `Dashboard.tsx`

**Step 9 — UI polish pass**
- `index.css` — add `.card-banking` utility (white card, `shadow-md`, `rounded-2xl`, `border-0`), smooth hover transitions
- Global tightening of padding, typography scale, soft shadow classes used consistently across Dashboard / Accounts / Analytics
- Account card gradient updated to more vibrant multi-stop gradient
- All page headings: `text-2xl font-bold` on mobile, `text-3xl` on desktop

**Step 10 — Lazy loading**
- `App.tsx` — wrap all page imports in `React.lazy` + `Suspense` with a shared skeleton loader; this eliminates the initial JS parse cost for pages the user hasn't visited

---

### New routes & sidebar additions
```text
Finance group:
  + /spending-insights   → Spending Insights
  + /budgets             → Budgets

(existing referral route already created — wire it into sidebar)
  + /referral            → Referral Program
```

---

### Database migration
```sql
CREATE TABLE public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  monthly_limit numeric NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, category)
);
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own budgets" ON public.budgets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

---

### Files to create
| File | Purpose |
|---|---|
| `src/components/MobileBottomNav.tsx` | Bottom nav bar |
| `src/components/AccountCard.tsx` | Premium card component |
| `src/components/SmartInsightsWidget.tsx` | Insight chips |
| `src/components/FinancialHealthWidget.tsx` | Health score |
| `src/components/NotificationToaster.tsx` | Realtime toast popups |
| `src/lib/categories.ts` | Transaction → category mapping |
| `src/pages/SpendingInsights.tsx` | Spending insights page |
| `src/pages/Budgets.tsx` | Budget management page |
| `supabase/migrations/…_budgets.sql` | DB migration |

### Files to modify
| File | Change |
|---|---|
| `src/components/DashboardLayout.tsx` | Add mobile bottom nav + `NotificationToaster` |
| `src/pages/Dashboard.tsx` | Add health widget + smart insights |
| `src/pages/AccountsPage.tsx` | Card carousel + balance history chart |
| `src/App.tsx` | Lazy loading + new routes |
| `src/index.css` | UI polish utilities |
