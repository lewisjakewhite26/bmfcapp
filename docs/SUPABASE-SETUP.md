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

From Admin → **Squad members**, create invite links for players. Players enter their first and last name when they open the link, then set a passcode. Login uses the short display name (e.g. `Chris L.`).

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

Add these **repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Value |
|--------|--------|
| `VITE_SUPABASE_URL` | Club Hub project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (not anon) |

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

### Role permissions

| Action | Admin | Committee | Player |
|--------|-------|-----------|--------|
| View fixtures, stats, calendar | ✅ | ✅ | ✅ (when approved) |
| Mark availability | ✅ | ✅ | ✅ |
| Add manual fixtures / results / training | ✅ | ✅ | ❌ |
| View availability overview | ✅ | ✅ | ❌ |
| Send push notification | ✅ | ✅ | ❌ |
| Create invites, approve users, reset passcodes | ✅ | ❌ | ❌ |

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
- [AUDITNEW.md](../AUDITNEW.md) — project audit
- [ROADMAP-99.md](ROADMAP-99.md) — roadmap to 99/100 score
