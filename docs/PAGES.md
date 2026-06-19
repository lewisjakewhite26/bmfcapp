# BMFC Club Hub — Pages & How They Connect

**24 routed pages** (+ 6 legacy redirects). Admin routes are lazy-loaded. All routes live in `src/App.tsx`.

---

## Page inventory

### Public (no login required)

| Route | File | Purpose |
|-------|------|---------|
| `/` | `Landing.tsx` | Marketing home — features, login CTA |
| `/login` | `Login.tsx` | Name + 4-digit passcode sign-in |
| `/invite/:token` | `Invite.tsx` | One-time passcode setup from admin invite link |
| `*` (catch-all) | `NotFound.tsx` | Branded 404 |

### Auth gate (special)

| Route | File | Guard | Purpose |
|-------|------|-------|---------|
| `/pending` | `PendingApproval.tsx` | `ProtectedRoute allowPending` | Waiting screen after invite setup, before admin approval |
| — | `ConfigRequired.tsx` | Replaces entire app | Shown when `VITE_CLUB_DATA_SOURCE=supabase` but env vars missing |

### Squad app (approved players)

| Route | File | Guard | Purpose |
|-------|------|-------|---------|
| `/dashboard` | `Dashboard.tsx` | `ProtectedRoute` | Home — league position, next match, mark availability |
| `/table` | `LeagueTable.tsx` | `ProtectedRoute` | DDSFL league table |
| `/results` | `Results.tsx` | `ProtectedRoute` | Upcoming fixtures + completed results |
| `/stats` | `Stats.tsx` | `ProtectedRoute` | Squad stats (goals, assists, MOTM, etc.) |
| `/calendar` | `Calendar.tsx` | `ProtectedRoute` | Matches, training, events, fundraisers + availability |
| `/player/:playerId` | `PlayerProfile.tsx` | `ProtectedRoute` | Individual player stats + own availability |

### Admin (committee or admin)

| Route | File | Guard | Who can access |
|-------|------|-------|----------------|
| `/admin` | `Admin.tsx` | `adminOnly` | Admin + committee — hub of admin tools |
| `/admin/squad` | `AdminSquad.tsx` | `adminOnly` | Admin + committee — squad list & positions |
| `/admin/fixtures` | `AdminFixtures.tsx` | `adminOnly` | Admin + committee — add/edit matches |
| `/admin/results` | `AdminResults.tsx` | `adminOnly` | Admin + committee — enter scores, goals, MOTM |
| `/admin/training` | `AdminTraining.tsx` | `adminOnly` | Admin + committee — training sessions |
| `/admin/events` | `AdminEvents.tsx` | `adminOnly` | Admin + committee — socials, AGM, committee meetings |
| `/admin/fundraisers` | `AdminFundraisers.tsx` | `adminOnly` | Admin + committee — fundraiser participation |
| `/admin/availability` | `AdminAvailability.tsx` | `adminOnly` | Admin + committee — who's in/out per event |
| `/admin/lineup` | `AdminLineup.tsx` | `adminOnly` | Admin + committee — pick formation & XI |
| `/admin/notifications` | `AdminNotifications.tsx` | `adminOnly` | Admin + committee — push notifications |
| `/admin/users` | `AdminUsers.tsx` | `adminOnly` + `requireAdmin` | **Admin only** — invites, approval, passcodes |

### Legacy redirects (old World Cup predictor URLs)

| Route | Redirects to |
|-------|----------------|
| `/signup` | `/login` |
| `/leaderboard` | `/table` |
| `/history` | `/results` |
| `/predictions` | `/dashboard` |
| `/admin/ops` | `/admin` |
| `/admin/technical` | `/admin` |

---

## Route guards

```mermaid
flowchart TD
  subgraph public [Public]
    L[Landing /]
    LG[Login /login]
    INV[Invite /invite/:token]
  end

  subgraph pending [Pending only]
    P[PendingApproval /pending]
  end

  subgraph squad [Approved squad]
    D[Dashboard]
    T[Table]
    R[Results]
    S[Stats]
    C[Calendar]
    PP[PlayerProfile]
  end

  subgraph admin [Admin / Committee]
    A[Admin hub]
    AU[Admin Users - admin only]
    AS[Admin Squad]
    AF[Admin Fixtures]
    AR[Admin Results]
    AT[Admin Training]
    AA[Admin Availability]
    AL[Admin Lineup]
    AN[Admin Notifications]
  end

  L --> LG
  L --> INV
  LG -->|GuestRoute: approved| D
  LG -->|GuestRoute: unapproved| P
  INV -->|after passcode| P
  P -->|after admin Approve + refresh/login| D

  D --> T & R & S & C & PP
  D --> A
  S --> PP
  A --> AU & AS & AF & AR & AT & AA & AL & AN

  squad -->|not logged in| LG
  squad -->|logged in, not approved| P
  admin -->|player role| D
  AU -->|committee| A
```

| Guard | Behaviour |
|-------|-----------|
| **None** | `/`, `/invite/:token`, `*` |
| **GuestRoute** | `/login` — approved → `/dashboard`; pending → `/pending` |
| **ProtectedRoute** | Must be logged in + `is_approved` |
| **ProtectedRoute allowPending** | Logged in OK even if not approved — `/pending` only |
| **ProtectedRoute adminOnly** | Admin **or** committee; players → `/dashboard` |
| **ProtectedRoute requireAdmin** | Admin only; committee → `/admin` |
| **ConfigRequired** | Whole app blocked if Supabase env missing at build time |

---

## Global navigation

### Navbar (`Navbar.tsx`)

- **Logged out:** logo → `/`, Login button
- **Pending:** logo → `/`, Logout only
- **Approved (desktop):** Table, Results, Stats, Calendar, name → `/player/:id`, Admin (if committee/admin), Logout
- **Approved (mobile):** logo + first name only (full nav is bottom bar)

### Mobile bottom nav (`MobileBottomNav.tsx`)

- Only shown when `user.is_approved`
- Tabs: **Home** (`/dashboard`), **Results**, **Table**, **Calendar**, **Stats**
- Account menu (FAB): My profile, push toggle, Admin (committee/admin), Logout

---

## Onboarding flow

```mermaid
sequenceDiagram
  participant Admin
  participant Player
  participant App
  participant Supabase

  Admin->>App: /admin/users — Create invite
  App->>Supabase: admin_create_invite
  Admin->>Player: WhatsApp invite link
  Player->>App: /invite/:token
  App->>Supabase: get_invite_preview
  Player->>App: Set 4-digit passcode
  App->>Supabase: complete_invite (is_approved=false)
  App->>Player: /pending
  Admin->>App: Approve in Squad members
  App->>Supabase: admin_set_user_approved
  Player->>App: Refresh or /login
  App->>Player: /dashboard + full squad nav
```

---

## Page interactions (links & data)

### Landing → Login → Squad

| From | To | How |
|------|-----|-----|
| `/` | `/login` | Hero CTA |
| `/login` | `/dashboard` | Successful login (if approved) |
| `/login` | `/pending` | GuestRoute if session exists but not approved |
| `/invite/:token` | `/pending` | After passcode saved |
| `/invite/:token` | `/login` | Invalid/expired link, or “Already set up?” |
| `/pending` | `/` | “Back to home” |
| `/pending` | `/dashboard` | After admin approval + refresh/login |

### Squad hub (Dashboard)

**Dashboard** pulls: league position, next fixture, availability for next match.

| From | To | How |
|------|-----|-----|
| `/dashboard` | `/calendar` | “Calendar →” link |
| `/dashboard` | `/results` | “All results →” link |
| Bottom nav / Navbar | `/table`, `/results`, `/stats`, `/calendar` | Primary navigation |

### Stats ↔ Player profile

| From | To | How |
|------|-----|-----|
| `/stats` | `/player/:id` | Tap any player row/card in `SquadStatsView` |
| `/stats` | `/admin/results` | Empty state CTA (admin/committee) |
| `/player/:id` | `/stats` | “← Squad stats” |
| Navbar / account menu | `/player/:yourId` | Your name / “My profile” |

**Player profile** shows stats for any squad member; availability editing only when viewing **your own** profile.

### Calendar & availability

| Page | Availability |
|------|----------------|
| `/dashboard` | Mark in/out/maybe for **next fixture** |
| `/calendar` | Mark for all upcoming fixtures + training (list or month view) |
| `/player/:yourId` | Same calendar items on own profile |

**Admin availability** (`/admin/availability`) reads everyone’s responses for a selected fixture/training — committee overview, not player-facing.

### Results & fixtures

| Page | Content |
|------|---------|
| `/results` | Player view — upcoming vs completed tabs |
| `/admin/fixtures` | Create/edit manual fixtures; link to enter result |
| `/admin/fixtures` → `/admin/results` | “Edit result” for a fixture |
| `/admin/results` | Enter scores, scorers, MOTM, cards — feeds **Stats** |

### League table

| Page | Data source |
|------|-------------|
| `/table` | DDSFL standings (synced via `npm run sync:ddsfl`) |
| `/dashboard` | Summary card — position + points |

---

## Admin hub structure

**`/admin`** is the index. All sub-pages have “← Admin” back link.

```mermaid
flowchart LR
  A[/admin hub]

  A --> AU[/admin/users<br/>admin only]
  A --> AS[/admin/squad]
  A --> AF[/admin/fixtures]
  A --> AR[/admin/results]
  A --> AT[/admin/training]
  A --> AA[/admin/availability]
  A --> AL[/admin/lineup]
  A --> AN[/admin/notifications]

  AU -->|creates| INV[/invite/:token]
  AS -->|positions for| S[/stats]
  AF --> AR
  AR --> S
  AT --> C[/calendar]
  AA --> C
  AL --> C
  AN -->|deep link default| C
```

| Admin page | Feeds into |
|------------|------------|
| **Squad members** | Accounts, invites, approval, passcode reset |
| **Squad list** | Who appears in stats/result entry/lineup picker |
| **Add match** | Calendar, results, availability, lineup |
| **Enter results** | Stats, player profiles, league table (via points) |
| **Training** | Calendar, availability |
| **Availability overview** | Read-only view of player responses |
| **Lineup** | Saved lineups per fixture (migration 011) |
| **Notifications** | Push to squad (needs VAPID setup) |

---

## Role matrix

| Page | Player | Committee | Admin |
|------|:------:|:---------:|:-----:|
| Landing, Login, Invite | ✅ | ✅ | ✅ |
| Pending | ✅ (if unapproved) | — | — |
| Dashboard, Table, Results, Stats, Calendar, Profile | ✅ | ✅ | ✅ |
| Admin hub + all `/admin/*` except users | ❌ | ✅ | ✅ |
| `/admin/users` | ❌ | ❌ | ✅ |

---

## Shared layout

Almost every page uses:

- **`PageShell`** — background, skip link → `#main-content`
- **`Navbar`** — top nav (except Login/Invite use minimal chrome)
- **`pageContainerClass()`** — consistent padding + mobile nav clearance

**Mobile bottom nav** appears on approved squad pages only (hidden on `/login`, `/pending`, `/admin/*`, Landing).

---

## Quick reference — all routes

```
/                          Landing
/login                     Login
/invite/:token             Invite setup
/pending                   Awaiting approval
/dashboard                 Home
/table                     League table
/results                   Fixtures & results
/stats                     Squad stats
/calendar                  Calendar + availability
/player/:playerId          Player profile
/admin                     Admin hub
/admin/users               Squad members (admin only)
/admin/squad               Squad list
/admin/fixtures            Add match
/admin/results             Enter results
/admin/training            Training sessions
/admin/availability        Availability overview
/admin/lineup              Lineup picker
/admin/notifications       Push notifications
*                          404 NotFound

Legacy: /signup /leaderboard /history /predictions /admin/ops /admin/technical → redirects
Config: entire app → ConfigRequired (bad Supabase env at build)
```

---

*Last updated: June 2026 · App at `2f8d68d` (invite approval) · migration 012 applied*
