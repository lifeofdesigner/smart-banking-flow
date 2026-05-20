# Migration To New Supabase

Old project ref: `kzbpqrsgjduqanlybgyy`
Old project URL: `https://kzbpqrsgjduqanlybgyy.supabase.co`

New project ref: `orykpinqwmvnldyoozll`
New project URL: `https://orykpinqwmvnldyoozll.supabase.co`

## Commands Run

Pre-migration:

```sh
npm run audit:supabase
npm run lint
npm run build
```

Migration:

```sh
npx --yes supabase@latest link --project-ref <new-project-ref>
npx --yes supabase@latest db push --linked --include-seed
```

Post-migration:

```sh
npm run audit:supabase
npm run lint
npm run build
npm run dev
```

## Export Results

Supabase CLI dump failed because Docker Desktop is not available in this Windows environment. Native PostgreSQL tools were available and succeeded.

Created:

```text
migration-backups/old_roles.sql
migration-backups/old_schema.sql
migration-backups/old_data.sql
```

These files are intentionally inside `migration-backups/`, which is gitignored because dumps can contain private data.

## Data Restored

The new project was rebuilt from local migrations plus demo seed data.

The full old data dump was exported but not bulk-restored into the new project because it includes Supabase system schemas such as `auth`, `storage`, `realtime`, and `vault`. Restoring that wholesale over a freshly migrated Supabase project would risk conflicts and broken managed-service state.

Seeded demo users:

```text
Admin: admin@halverixbank.com / DemoAdmin123!
Customer: customer@halverixbank.com / DemoCustomer123!
```

The demo seed was updated so Supabase Auth password login works on the new project.

## Storage Results

Old Storage recovery failed:

```text
List buckets: HTTP 544
List cms-media: HTTP 544
Old logo URL: HTTP 544
Old favicon URL: HTTP 544
```

New buckets verified:

```text
cms-media: public
kyc-documents: private
```

Buckets requested but not used by the codebase:

```text
site-assets
product-images
```

## Policies Added

Public CMS read policies:

```text
site_settings
homepage_sections
product_pages
product_sections
faqs
media_library
```

Admin/authenticated write policies:

```text
site_settings
homepage_sections
product_pages
product_sections
faqs
media_library
```

Storage policies:

```text
Public can read cms media
Admins can upload cms media
Admins can update cms media
Admins can delete cms media
Users can upload own kyc docs
Users can view own kyc docs
Admins can view all kyc docs
```

## Verification Results

Final audit:

```text
site_settings: HTTP 200
homepage_sections: HTTP 200
product_pages: HTTP 200
media_library: HTTP 200
site_logo_url: asset HTTP 200
site_favicon_url: asset HTTP 200
```

Admin smoke test:

```text
Admin sign-in: passed
Admin settings update: passed
Logo upload: passed
Logo public URL: HTTP 200
Favicon upload: passed
Favicon public URL: HTTP 200
```

Build checks:

```text
npm run lint: passed
npm run build: passed
Dev server: HTTP 200 at http://127.0.0.1:8082
```

## Deployment Env

Set these in Vercel/Netlify:

```text
VITE_SUPABASE_PROJECT_ID=orykpinqwmvnldyoozll
VITE_SUPABASE_URL=https://orykpinqwmvnldyoozll.supabase.co
VITE_SUPABASE_ANON_KEY=<new anon key>
VITE_SUPABASE_PUBLISHABLE_KEY=<new publishable key>
```

Do not add a service role key to frontend deployment variables.

## Manual Follow-Up

Old Storage files could not be recovered because the old project returns `HTTP 544 DatabaseTimeout`.

The new project currently has migration smoke-test SVG assets saved as logo/favicon. Re-upload the real production logo, favicon, product images, and any CMS media from the admin UI.

After deploying, hard refresh the public site and confirm:

```text
Frontend requests go to orykpinqwmvnldyoozll.supabase.co
Supabase request count increases on the new project
Header logo displays
Favicon updates
Admin settings persist after refresh
No old runtime Supabase URL remains
```
