# AI Tools Hub

Merged platform: AI tools directory + admin dashboard + automated daily newsletter.
Stack: React, Vite, Tailwind, React Router, Supabase, Resend, Vercel.

## Phase 1 setup (database, auth, roles)
1. Create a Supabase project.
2. Run in the SQL editor, in order: `0001_schema.sql`, `0002_rls.sql`, `0003_newsletter.sql`, then `seed.sql`.
3. Sign up once in the app, then promote yourself:
   `update public.users set role='admin' where email='you@example.com';`
4. Auth > URL config: set Site URL and redirect URLs; enable email confirmation.
5. Copy `.env.example` to `.env` and fill in values. Add server vars in Vercel.
6. Vercel Cron: `30 2 * * *` UTC = 8:00 AM IST. It authenticates with `CRON_SECRET`.

## Design notes
- `launch_date` is only set by admins and flagged `launch_date_verified`; `published_at` is when it went live here. UI says "Recently added" for unverified dates, never "newly launched".
- Role/status changes are blocked for non-admins by a DB trigger.
- Digest idempotency: `newsletter_runs.run_date` unique + `newsletter_run_tools.tool_id` unique + `newsletter_deliveries(run_id, subscriber_id)` unique.
- Trending uses real `tool_views` (7-day window). Ratings come from the `tool_ratings` view.

## Phases
1. DB, auth, roles (this commit)
2. Homepage, categories, search, filters
3. Tool detail pages
4. Admin dashboard + tool CRUD
5. Favorites, reviews, profiles
6. Latest tools, submissions, moderation
7. Newsletter (cron, Resend, React Email, webhooks), comparison, recommendations, deploy

## Phase 2a: auth, roles, image upload (this commit)
- Run `0004_logo_constraints.sql`, then `seed_admin.sql` (creates the pre-verified test admin).
- `npm install && npm run dev`, log in at `/login`, open `/admin`.
- Logo field: upload a file (2 MB, PNG/JPG/WebP/SVG, stored in the `tool-assets` bucket, admin-only write), paste a direct image link, or use the website's own icon, which links to it by URL.
- Roles live in `public.users.role`. A trigger stops users changing their own role; RLS enforces admin-only writes on the server side.

## Phase 2b: public pages, Google + email auth (this commit)
Run `0006_google_profile_metadata.sql` (already applied to the `toolshub` project).

### Turn on Google sign-in (one-time, in dashboards)
1. Google Cloud Console > APIs & Services > Credentials > Create OAuth client ID (Web application).
2. Authorized redirect URI: `https://dzuazopkvtanumrojtji.supabase.co/auth/v1/callback`
3. Supabase > Authentication > Sign In / Providers > Google: paste the Client ID and Client Secret, enable it.
4. Supabase > Authentication > URL Configuration: Site URL = your Vercel URL; add `http://localhost:5173` and your Vercel URL under Redirect URLs.

### Email sign-in
- Email confirmation stays on. Signup sends a verification link; login shows "Resend email" if the address is unverified.
- Forgot password sends a link to `/reset-password`.
- Supabase's built-in mailer is rate limited. Before launch, set custom SMTP (Resend) under Authentication > SMTP.

### Data flow
All public pages read from Supabase through `src/lib/api.js` (search, filters, sort, pagination, trending from real views, ratings from real reviews). Nothing is hardcoded.
