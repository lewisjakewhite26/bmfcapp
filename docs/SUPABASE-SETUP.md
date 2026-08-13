# Supabase setup — BMFC Club Hub

Step-by-step guide to deploy the club hub backend. Use a **dedicated Supabase project** (separate from any other apps in this repo).

---

## 1. Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project.
2. Note the **Project URL** and **anon public** key (Settings → API).

---

## 2. Configure the frontend

Copy `.env.example` to `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_CLUB_DATA_SOURCE=supabase
```

Restart `npm run dev` after changing env vars.

---

## 3. Run database migrations

Apply migrations **in order** via the Supabase SQL Editor (Dashboard → SQL → New query), or using the Supabase CLI linked to your project.

| File | Purpose |
|------|---------|
| `supabase-club/migrations/001_club_hub_schema.sql` | Core tables, RLS |
| `supabase-club/migrations/002_push_subscriptions.sql` | Push subscription storage |
| `supabase-club/migrations/003_passcode_auth.sql` | Login, session, availability RPCs |
| `supabase-club/migrations/004_invite_links.sql` | Invite-only signup |
| `supabase-club/migrations/005_admin_tools.sql` | Admin RPCs (users, squad, results) |
| `supabase-club/migrations/006_manual_fixtures.sql` | Manual fixture CRUD + delete |
| `supabase-club/migrations/007_training_edit_delete.sql` | Training edit/delete |
| `supabase-club/migrations/008_manual_fixture_edit.sql` | Manual fixture edit |
| … | `009`–`018` — lineups, fundraisers, events, photos, live matchday (see `supabase-club/migrations/`) |
| `supabase-club/migrations/019_player_names_and_passcode.sql` | Names on invite link; display **ChrisL**; passcode self-service |
| `supabase-club/migrations/020_display_name_no_space.sql` | ChrisL display name backfill |
| `supabase-club/migrations/021_profiles_photo_url_grant.sql` | Squad stats photo_url read grant |
| `supabase-club/migrations/022_finance.sql` | Sponsorships, expenses, finance RPCs |
| `supabase-club/migrations/023_calendar_archive_and_fundraiser_delete.sql` | Archive vs delete for events/fundraisers |
| `supabase-club/migrations/024_goalkeeper_clean_sheets.sql` | GK clean-sheet attribution — manual override + live log snapshot |
| `supabase-club/migrations/025_login_name_display_name_split.sql` | Login name (ChrisL) vs spaced display name (Chris L) |
| `supabase-club/migrations/026_purge_old_fixtures.sql` | Admin purge fixtures before a cutoff date |
| `supabase-club/migrations/027_em_dash_copy.sql` | Em-dash cleanup in RPC error messages |
| `supabase-club/migrations/028_team_invite_link.sql` | Reusable team invite link (`/join/:token`) |
| `supabase-club/migrations/029_admin_audit_log.sql` | Central admin audit log table + list/record RPCs |
| `supabase-club/migrations/030_signing_on_fees.sql` | Signing-on fee checklist per season (Finance admin) |
| `supabase-club/migrations/031_formation_4213.sql` | Allow 4-2-1-3 formation in saved lineups |
| `supabase-club/migrations/032_fines.sql` | Match-day fines — sessions, per-player entries, payment tracking |
| `supabase-club/migrations/033_fine_session_delete.sql` | Delete fines sessions (committee/admin) |
| `supabase-club/migrations/034_fine_late_fees.sql` | Monthly late fees (superseded by 038 — weekly model) |
| `supabase-club/migrations/035_fine_session_auto_title.sql` | Auto-generate fines session title from date |
| `supabase-club/migrations/036_auto_squad_on_approval.sql` | Auto-include every approved player in the squad |
| `supabase-club/migrations/037_fine_due_dates.sql` | Per-fine due dates with penultimate-Sunday grace window |
| `supabase-club/migrations/038_fine_weekly_late_fees.sql` | Weekly £2 late fees (replaces monthly model in 034) |
| `supabase-club/migrations/039_squad_pause.sql` | Player pause — freezes no-vote fines, reminders, late fees |
| `supabase-club/migrations/040_fine_no_vote_and_reminders.sql` | Automated no-vote fines + vote reminder tracking |
| `supabase-club/migrations/041_fine_rpc_updates.sql` | Fines RPC updates — due_date on reads, lateness exclusivity |
| `supabase-club/migrations/042_fines_scheduler_cron.sql` | Historical pg_cron placeholder — superseded by 043 |
| `supabase-club/migrations/043_unschedule_legacy_cron.sql` | Unschedule legacy pg_cron; exclude TBC fixtures from automation |
| `supabase-club/migrations/044_fines_admin_role.sql` | Fines-only admin role (`is_fines_admin`) |
| `supabase-club/migrations/045_admin_create_player.sql` | Admin creates an approved player without the invite flow |
| `supabase-club/migrations/046_lineup_substitutes.sql` | Substitutes bench on saved lineups |
| `supabase-club/migrations/047_lineup_subs_confirmed_none.sql` | "No subs came on" confirmation on lineups |
| `supabase-club/migrations/048_sponsor_logos.sql` | Player-managed sponsor name + logo (self-service Storage upload) |
| `supabase-club/migrations/049_committee_todo.sql` | Committee to-do list — RLS-gated task tracker |

**No pg_cron fines jobs should exist in production** — the canonical scheduler is GitHub Actions (`fines-automation.yml`, every 5 minutes). Migration 042 is a historical placeholder only; 043 unschedules any legacy pg_cron jobs.

**Supabase CLI example** (if `supabase` is installed and linked):

```bash
cd supabase-club
supabase db push
```

---

## 4. Seed the initial admin

Edit `supabase-club/seed.sql` — change the display name and passcode **before** running:

```sql
-- Default: Club Admin / 1234 — change this immediately after first login
```

Run the seed in the SQL Editor. Then log in at `/login` with that name and 4-digit passcode.

From Admin → **Squad members**, create invite links for players. Players enter their first and last name when they open the link, then set a passcode. Login uses the short identifier (e.g. `ChrisL`); the app shows the spaced display name (e.g. `Chris L`) everywhere else.

---

## 5. Load league data (DDSFL)

Migrations create empty `fixtures` and `league_table_cache` tables. Sync live DDSFL data into Supabase:

1. Add your **service role key** to `.env.local` (Dashboard → Settings → API → `service_role`):

   ```env
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

   Never prefix this with `VITE_` — it must not ship to the browser.

2. Run the sync script:

   ```bash
   npm run sync:ddsfl
   ```

This scrapes DDSFL, upserts BMFC fixtures and results, and refreshes the league table for the active season. Manual fixtures (`ddsfl_fixture_id` is null) are left untouched. Results are **not** overwritten when admin has already entered match events (scorers, MOTM, etc.).

Re-run during the season to pick up new results. For mock-only demos without Supabase, `npm run scrape:ddsfl` still updates `src/data/ddsfl-scrape.json`.

### Automated sync (GitHub Actions)

A workflow (`.github/workflows/sync-ddsfl.yml`) runs **`npm run sync:ddsfl` daily at 20:00 UTC** (~8pm GMT / ~9pm BST) and can be triggered manually from **Actions → Sync DDSFL to Supabase → Run workflow**.

There is **no sync button in the app admin panel** — manual options are GitHub Actions (above) or `npm run sync:ddsfl` on your machine with `.env.local` set.

**Same two secrets also gate `.github/workflows/fines-automation.yml`** (runs every 5 minutes — no-vote fines, vote reminders, weekly late fees). Set them once; both workflows read the same values.

Add these **repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Value |
|--------|--------|
| `VITE_SUPABASE_URL` | Club Hub project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (not anon) |
| `FINES_SCHEDULER_SECRET` | Optional — only if set on the `fines-scheduler` Edge Function |

The app reads cached data from Supabase — it does not scrape on each page load. After the workflow runs, players see the updated table on next visit (timestamp shown on `/table`).

---

## 6. Web push notifications (optional)

### Generate VAPID keys

```bash
npm run generate:vapid-keys
```

Add the **public** key to `.env.local`:

```env
VITE_VAPID_PUBLIC_KEY=your-public-key
```

### Deploy the edge function

The function lives at `supabase-club/functions/send-push/`.

Using Supabase CLI:

```bash
supabase secrets set VAPID_PRIVATE_KEY=your-private-key
supabase secrets set VAPID_SUBJECT=mailto:your@email.com
supabase functions deploy send-push
```

Push only works over **HTTPS** (production or tunneled preview). In mock mode, Admin → Send notification shows an error toast.

### Other Edge Functions

Two more functions live under `supabase-club/functions/`, registered in `supabase/config.toml`:

| Function | Purpose | Secrets |
|----------|---------|---------|
| `fines-scheduler` | Runs no-vote fines, vote reminders, weekly late fees — invoked every 5 min by `fines-automation.yml` | Uses `SUPABASE_SERVICE_ROLE_KEY`; optional `FINES_SCHEDULER_SECRET` if you want to lock it down further |
| `canva-autofill` | Triggers a Canva Connect API design from player name/photo/sponsor logo (Admin → Canva templates) | `CANVA_ACCESS_TOKEN` — **not set yet**; the function returns a clearly-labelled mock result until a Canva account is linked and this secret is set |

Deploy either the same way as `send-push`:

```bash
supabase functions deploy fines-scheduler
supabase functions deploy canva-autofill
```

---

## 7. Deploy the frontend

Build and host the static output:

```bash
npm run build
```

Deploy the `dist/` folder to any static host (Vercel, Netlify, Cloudflare Pages, etc.). Set the same `VITE_*` env vars in the host's build settings.

### Vercel (bmfcapp)

Vite bakes env vars in at **build time**. Add these in **Project → Settings → Environment Variables**, then **Redeploy** (a new build is required):

| Variable | Value |
|----------|--------|
| `VITE_SUPABASE_URL` | From Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | `anon` `public` key (not service_role) |
| `VITE_CLUB_DATA_SOURCE` | `supabase` |

Optional: `VITE_VAPID_PUBLIC_KEY` for push notifications.

Do **not** add `SUPABASE_SERVICE_ROLE_KEY` to Vercel.

Ensure HTTPS is enabled for PWA install and push notifications.

---

## 8. Auth model

- **No email/password** — players sign in with **display name + 4-digit passcode**.
- New players receive an **invite link** (`/invite/:token`) from an admin.
- Accounts require **committee approval** before accessing squad features (`/pending` screen).
- Sessions are stored in `localStorage` and verified via RPC on each write.
- A fourth role, **Fines Helper** (`is_fines_admin`, migration 044), grants access to `/admin/fines` only — nothing else in the admin hub. Mutually exclusive with Committee; set from Admin → Squad members.

### Role permissions

| Action | Admin | Committee | Fines Helper | Player |
|--------|-------|-----------|---------------|--------|
| View fixtures, stats, calendar | ✅ | ✅ | ❌ | ✅ (when approved) |
| Mark availability | ✅ | ✅ | ❌ | ✅ |
| Add manual fixtures / results / training | ✅ | ✅ | ❌ | ❌ |
| View availability overview | ✅ | ✅ | ❌ | ❌ |
| Send push notification | ✅ | ✅ | ❌ | ❌ |
| Log fines, mark payments (`/admin/fines`) | ✅ | ✅ | ✅ | ❌ |
| View audit log (`/admin/audit`) | ✅ | ❌ | ❌ | ❌ |
| Create invites, approve users, reset passcodes | ✅ | ❌ | ❌ | ❌ |
| Manage own sponsor name + logo | — | — | — | ✅ (own profile only) |

---

## 9. Verify the setup

Checklist after deploy:

- [ ] Admin can log in with seeded credentials
- [ ] Admin can create an invite link and a player can complete setup
- [ ] Committee member (if created) sees admin hub **without** Squad members card
- [ ] Approved player sees dashboard, can mark availability (toast: "Availability saved")
- [ ] Manual friendly can be added via Admin → Add match
- [ ] Result can be entered via Admin → Enter results
- [ ] Failed network requests show a red error banner with "Try again"
- [ ] Admin can view **Audit log** (`/admin/audit`) and see recent actions
- [ ] Player can upload a sponsor logo + name on their own profile page, admin sees it (with download) on Admin → Squad list
- [ ] Committee to-do (`/admin/todo`) — add a task, assign it, mark done/undo

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| App still uses mock data | Set `VITE_CLUB_DATA_SOURCE=supabase` and restart dev server |
| `Production build requires Supabase` | Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` |
| Committee gets "Unauthorized" on user management | Expected — only admins can manage users; committee should not see Squad members |
| Stats show 0 appearances in live mode | Admin must enter match events on completed fixtures — stats aggregate from those events |
| Push fails | Check VAPID keys, HTTPS, edge function deploy, and Supabase secrets |

---

## Related docs

- [README.md](../README.md) — quick start and scripts
- [PAGE-COPY.md](PAGE-COPY.md) — all UI strings
- [AUDIT.md](AUDIT.md) — project audit
- [ROADMAP-99.md](ROADMAP-99.md) — roadmap to 99/100 score
