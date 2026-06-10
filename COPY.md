# BMFC World Cup Predictor — User-Facing Copy

Extracted from all `.tsx` and `.ts` files in `src/`. Organised by page/component.

Dynamic values shown in `{curly braces}`. Database-driven content (fixture team names, matchday labels from Supabase seed, API sync messages) is not listed here unless transformed in code.

---

## Shared / Global

### `index.html` (loaded by app, not in `src/`)

- **Page title:** BMFC World Cup 2026
- **Meta description:** BMFC World Cup 2026 — Predict the scores. Follow every game. See where you finish.

### `lib/greeting.ts`

- Good morning
- Good afternoon
- Good evening

### `lib/scoring.ts` — stage labels (`getStageLabel`)

- Group Stage
- Round of 32
- Round of 16
- Quarter-final
- Semi-final
- Third Place
- Final

### `lib/scoring.ts` — countdown / cutoff (formatted dates use locale)

- Predictions closed *(CutoffCountdown)*
- Closed *(DashboardStatusBanner countdown at zero)*

### Matchday label transform (used in multiple components)

- UI replaces `Game Day` with `Matchday` in labels loaded from the database (e.g. `Group Stage — Matchday 1`).

### Game day status badges (raw status from database)

- open
- locked
- completed

### Group stage fixture header pattern

- `{Stage label} · Group {letter}` *(e.g. Group Stage · Group A)*

---

## `App.tsx`

No user-facing copy (routing and toast styling only).

---

## Pages

### `pages/Landing.tsx`

**Hero**

- Alt text: BMFC
- Headline: BMFC World Cup **2026**
- Tagline: Predict every score. Follow the tournament. See how you do.
- Button: Sign Up
- Button: Login
- Footer: Est. 1984 · Bishop Middleham Football Club
- Scroll hint: ↓

**How it works**

- Section heading: How it works
- Card 1 title: Predict the scores
- Card 1 body: Enter your scoreline for every fixture before kickoff. Both teams, every match.
- Card 2 title: Confirm your picks
- Card 2 body: Submit your predictions before the match starts. Once it kicks off, they're locked.
- Card 3 title: Follow the table
- Card 3 body: Points are updated automatically after each result. See where you stand throughout the tournament.

**Points system**

- Section heading: Points system
- Card label suffix: pts
- 10 pts card title: Correct Score
- 10 pts card body: Exact scoreline correct — if you predicted 2–1 and it finished 2–1, you get 10 points.
- 5 pts card title: Correct Result
- 5 pts card body: Correct result but wrong score — if you predicted 2–1 and it finished 3–1, you still get 5 points.

---

### `pages/Login.tsx`

No copy (wraps `LoginForm`).

---

### `pages/Signup.tsx`

No copy (wraps `SignupForm`).

---

### `pages/Dashboard.tsx`

- Greeting: `{Good morning|Good afternoon|Good evening}, {first name|there}`
- Subheading: Enter your predictions before each match kicks off
- Empty state: No matchday is currently open. Check back later.

---

### `pages/PreviousPredictions.tsx`

**ScoreLegend**

- Exact — 10 pts
- Result — 5 pts
- No points

**Page**

- Heading: Previous Matchdays
- Subheading pattern: `{display_name} · {totalPoints} pts scored`
- Empty state: No completed matchdays yet. Your results will appear here once the first round is scored.

---

### `pages/Leaderboard.tsx`

- Heading: The Table
- Subheading: Updated after every result
- CTA (logged out): Sign up to take part
- Button: Sign up to join The Table

---

### `pages/Admin.tsx`

- Heading: Admin
- Subheading: Manage matchdays, sync results, and users

**Section headings (page wrappers)**

- API Sync
- Auto Progression
- Knockout Fixture Editor
- Matchday Manager
- Manual Result Entry
- Predictions Audit
- Entry Fees
- User Manager

**Knockout Fixture Editor**

- Description: Update placeholder team names once knockout opponents are confirmed (Matchdays 4–8).

**Matchday Manager section**

*(Uses `GameDayManager` component — see below.)*

**Manual Result Entry section**

- Select option: All pending
- Select options: `{matchday label with "Matchday"}` per game day
- Empty state: All fixtures have results entered

**Predictions Audit section**

- Description: Every player's picks, actual results, and points — filter by matchday or player.

**Entry Fees section**

- Description: All sign-ups — tick each player when you've received their cash payment.

**User Manager section**

- Table headers: Username | Display Name | Points
- Select placeholder: Select user to reset passcode
- Select option pattern: `{display_name} (@{username})`
- Input placeholder: New 4-digit PIN
- Button: Reset Passcode

**Toasts**

- Matchday {n} opened (preview only)
- Matchday {n} completed (preview only)
- Score confirmed (preview only)
- Select a user and enter a 4-digit passcode
- Passcode reset successfully
- Failed to update payment status
- *(Plus server error messages via `error.message`)*

---

## Auth

### `components/auth/LoginForm.tsx`

- Alt text: BMFC
- Heading: Back in the dugout
- Subheading: Sign in to enter your predictions
- Label: Username
- Placeholder: your_username
- Label: 4-Digit Passcode
- Button (loading): Signing in...
- Button: Login
- Footer: No account? **Sign up**
- Toast: Enter your 4-digit passcode
- Toast: Signed in
- Toast: Invalid username or passcode

---

### `components/auth/SignupForm.tsx`

- Alt text: BMFC
- Heading: Create an account
- Subheading: Sign up to enter your predictions
- Label: Username
- Placeholder: 3-20 characters
- Label: Display Name
- Placeholder: Shown on The Table
- Label: Create 4-Digit Passcode
- Label: Confirm Passcode
- Button (loading): Creating account...
- Button: Sign Up
- Footer: Already have an account? **Login**

**Success state**

- Heading: Account created
- Body: Taking you to your predictions...

**Toasts**

- Username must be 3-20 alphanumeric characters or underscores
- Passcode must be exactly 4 digits
- Passcodes do not match
- Account created!
- Username already taken
- Signup failed

---

### `components/auth/PinInput.tsx`

No user-facing text (numeric inputs only).

---

## Navigation

### `components/ui/Navbar.tsx`

- Alt text: BMFC
- Brand (desktop): BMFC Predictor
- Link: The Table
- Link: History
- Link: Admin *(admins only)*
- Button: Logout
- Link (logged out): The Table
- Link (logged out): Login
- Button (logged out): Sign Up

---

### `components/ui/MobileBottomNav.tsx`

**Tab labels**

- Home
- History
- Table
- Account

**Account sheet**

- Link: Admin *(admins only)*
- Button: Log out

**Aria labels**

- Close account menu
- Main navigation
- Account menu

**Points display pattern**

- `{total_points} pts`

---

### `components/ui/PointsTotal.tsx`

- Label: PTS

---

## Dashboard

### `components/match/UserStatsGrid.tsx`

- Total Points
- League Position *(value pattern: `#` + number or `—`)*
- Best Matchday
- Points off Top
- Loading placeholder: —

---

### `components/dashboard/DashboardStatusBanner.tsx`

- Idle: No matchday is currently open. Check back later.
- Label: This matchday
- Status lines:
  - Predictions closed for this matchday
  - All predictions submitted
  - Fixtures loading…
  - `{lockedCount} of {total} picks locked in`
- Closes line pattern: Closes `{formatted datetime}`
- Countdown labels: Cutoff | Time left
- Countdown at zero: Closed

---

### `components/match/PicksProgressBar.tsx`

- Label: Locked in
- Counter pattern: `{lockedCount}/{total}`
- Celebration message: All predictions in for this matchday

---

## Match / Predictions

### `components/match/GameDayPanel.tsx`

- Empty state: No fixtures
- History badge pattern: `{dayPoints} pts`
- Matchday header uses `{label}` + status badge

---

### `components/match/MatchCard.tsx`

**Badges / status**

- Not yet entered
- Submitted
- Draft saved soon…
- Saving draft…
- Draft saved
- Draft save failed
- 🔒 Locked

**Button**

- Submitting…
- Submit prediction

**Footer**

- Kickoff pattern: `{formatted kickoff} · {city}`
- Result pattern: Result: `{home}` — `{away}`

---

### `components/match/HistoryMatchCard.tsx`

**Outcome labels**

- Exact score
- Correct result
- No points

**Footer**

- Result pattern: Result: `{home}` — `{away}`
- Kickoff: `{formatted kickoff}`
- No prediction: No prediction entered

---

### `components/match/PointsBadge.tsx`

- 10 pts
- 5 pts
- 0 pts
- Fallback pattern: `{n} pts`

---

### `components/match/MatchScoreLine.tsx`

No standalone copy (team names and scores from data).

---

### `components/match/ScoreInput.tsx`

No user-facing text.

---

### `components/match/CutoffCountdown.tsx`

**Tooltip/title pattern**

- Cutoff: `{formatted datetime}`

**Labels**

- Cutoff passed
- Time to predict
- Closes `{formatted datetime}`
- Countdown: Predictions closed *(at zero)*

---

### `components/match/CountryFlag.tsx`

No user-facing labels (team names from fixture data; abbreviations derived from `teamFlags.ts`).

---

## Leaderboard

### `components/leaderboard/Leaderboard.tsx`

- Empty state: No predictions yet. Sign up to take part.
- Podium points pattern: `{n} pts`
- Table headers: Rank | Name | Exact | Result | Pts
- Compact headers: # | Name | Pts
- Link: Sign up to take part →

---

## Admin components

### `components/admin/SyncStatusCard.tsx`

- Heading: API Sync Status
- Description: API-Football · polls every 15 min during match windows
- Label: Today's API requests
- Counter pattern: `{count} / 80`
- Label: Last synced
- Label: Last API call
- Relative time: Never | Just now | `{n}s ago` | `{n} min(s) ago` | `{n} hour(s) ago` | `{n} day(s) ago`
- Status badges: Success | Error | No fixtures | Skipped | Pending
- Button (loading): Syncing…
- Button: Manual Sync
- Warning: Daily request limit reached. Sync will resume from midnight.

**Toasts**

- Manual sync triggered (preview only)
- Sync skipped *(with optional reason from API)*
- Synced — `{n}` fixture(s) updated
- Sync complete — no new results
- Manual sync failed

---

### `components/admin/ProgressionStatusCard.tsx`

- Heading: Auto Progression
- Description: Matchday completion, knockout discovery, and auto-open · cron every 5 min
- Label: Queue
- Job title pattern: Matchday `{n}`
- Due pattern: Due `{relative}` · `{timestamp}`
- Queue statuses (displayed as-is): pending | processing | failed | completed
- Button (loading): Processing…
- Button: Process Now
- Empty queue: No pending progression jobs
- Label: Recent log
- Empty log: No progression events yet
- Log prefix pattern: MD`{game_day}` · `{relative time}`

**Event labels**

- All scored
- Wait started
- Teams discovered
- Matchday opened

**Toasts**

- Progression triggered (preview only)
- Progression processed *(or API message)*
- Process failed

---

### `components/admin/GameDayManager.tsx`

- Incomplete warning pattern: `{n}` fixture(s) need results
- Button: Open
- Button: Mark Complete
- Toasts: Matchday `{n}` opened | Matchday `{n}` marked complete | Failed to open matchday | Failed to complete matchday

---

### `components/admin/KnockoutFixtureEditor.tsx`

- Empty state: No upcoming knockout placeholders to edit.
- Header pattern: Matchday `{n}` · `{stage with underscores replaced by spaces}`
- Fixture id pattern: `#`{id}
- Label: Home team
- Label: Away team
- Button (loading): Saving…
- Button: Save teams
- Toasts: Enter both team names before saving | Teams updated (preview only) | Fixture teams updated | Failed to save

---

### `components/admin/AdminFixtureRow.tsx`

- vs
- Kickoff pattern: `{formatted kickoff} · {city}`
- Button (loading): ...
- Button: Update *(if result exists)*
- Button: Confirm Score *(if no result)*
- Badge: ✓ Scored
- Toasts: Enter both scores | Score saved and points updated | Failed to confirm score

---

### `components/admin/AdminPredictionsAudit.tsx`

- Filter label: Matchday
- Option: All matchdays
- Filter label: Player
- Option: All players
- Option pattern: `{display_name} ({total_points} pts)`
- Summary: `{count}` picks | `{scored}` scored | `{totalPts}` pts in view
- Loading: Loading picks…
- Empty (dev): Predictions audit (preview only — no data in dev bypass)
- Empty: No predictions match these filters
- Table headers: Player | MD | Match | Pick | Actual | Pts
- Username pattern: @{username}
- Score display: `{predicted_home}–{predicted_away}` | `{actual_home}–{actual_away}` | —
- Toast: Failed to load predictions

---

### `components/admin/AdminPaymentList.tsx`

- Summary pattern: `{paidCount}` of `{total}` paid
- Hint: Tick when cash received
- Empty: No sign-ups yet
- Aria label pattern: `{display_name}` paid
- Badge: Paid
- Dev note: Preview mode — payment ticks are disabled
- Toasts: Marked paid (preview) | Marked unpaid (preview)

---

## UI utilities

### `components/ui/ErrorBoundary.tsx`

- Message: There was a problem loading this section.
- Button: Try again

---

### `components/ui/Skeleton.tsx`

No user-facing text (loading placeholders only).

---

### `components/ui/PageBackground.tsx`

No user-facing text.

---

## Hooks (user-visible error strings)

### `hooks/usePredictions.ts`

- Failed to load predictions
- You need to be signed in to view predictions

### `hooks/useAuth.tsx`

- useAuth must be used within AuthProvider *(developer error, unlikely shown to users)*

---

## Dev bypass preview data (`lib/devBypass.ts`)

Shown only when logged in with the local dev bypass session (`import.meta.env.DEV`).

**User display names**

- Preview Player
- Preview Admin

**Mock matchday labels**

- Group Stage — Matchday 1
- Group Stage — Matchday 2
- Group Stage — Matchday 3

**Mock leaderboard names**

- Alex Morgan
- Jamie Smith
- Preview Player
- Chris Lee
- Sam Patel

---

## Dynamic / server-driven copy (not hardcoded in `src/`)

These may appear in the UI but originate from Supabase, API-Football, or Vercel functions:

- Fixture team names, venues, cities
- Matchday labels from `game_days.label` (e.g. Round of 32, Group Stage — Matchday 1)
- Knockout placeholder names (e.g. Group A Winner, R32 Winner 1)
- User display names and usernames
- API sync log messages (`last_sync_message`)
- Progression log `details` JSON
- Supabase RPC error messages (e.g. Invalid session, Game day is not open, Predictions are locked for this matchday, Username already taken)
- API progression/sync response messages from `/api/process-progression` and `/api/sync-results`

---

*Generated from the BMFC World Cup Predictor `src/` tree. Last updated to match tone-of-voice revision (matter-of-fact, adult).*
