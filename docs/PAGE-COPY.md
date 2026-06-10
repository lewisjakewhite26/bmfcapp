# BMFC Club Hub — Page Copy

Complete UI copy for every screen and shared component.  
**Dynamic values** (player names, opponents, dates, scores, counts, etc.) are shown in `{curly braces}`.

---

## Site meta (`index.html`)

| Field | Copy |
|-------|------|
| Page title | BMFC Club Hub |
| Meta description | BMFC Club Hub — fixtures, league table, stats and availability for Bishop Middleham FC. |
| Apple web app title | BMFC |
| Logo alt text | BMFC |

---

## Global constants

| Constant | Value |
|----------|-------|
| Club name | Bishop Middleham FC |
| League name | Swinburne Maddison Third Division |
| Current season | 2025/26 |
| Default home venue | Bishop Middleham Recreation Ground |
| Default match kick-off | 10:30 |
| Default training time | 19:00 |
| Default training location | Bishop Middleham Recreation Ground |
| Squad positions | Forward, Midfielder, Defender, Goalkeeper |

---

## Time greetings (`getTimeGreeting`)

- Good morning *(before 12:00)*
- Good afternoon *(12:00–17:59)*
- Good evening *(18:00 onwards)*

---

## Global navigation

### Navbar (desktop — signed in)

- BMFC Club Hub
- Table
- Results
- Stats
- Calendar
- {display_name}
- Admin *(admin or committee only)*
- Logout

### Navbar (mobile — signed in)

- {first name from display_name}

### Navbar (signed in, not approved)

- Logout

### Navbar (signed out)

- Login

### Mobile bottom nav

Tab labels:

- Home
- Results
- Table
- Calendar
- Stats
- More

Account menu (More):

- {display_name}
- @{username}
- My profile
- Push notifications — On / Off / ...
- Admin *(admin or committee only)*
- Log out

Accessibility labels:

- Close account menu
- Main navigation
- Account menu
- Previous month
- Next month

---

## Shared components

### Availability picker

- In
- Maybe
- Out

### Availability form

- Reason *(optional)*
- Placeholder: e.g. away for the weekend, injured...

### Availability nudge (dashboard banner)

- Availability
- Haven't marked availability for {date} {vs or @} {opponent} yet. Tap to respond.
- Haven't marked availability for training on {date} · {time}. Tap to respond.
- Tap to respond on the calendar →

### Fixture card

- Win / Loss / Draw *(completed matches)*
- Postponed
- vs
- Scorers
- {competition name}
- {venue}

### League table view

Column headers:

- #
- Team
- P
- W
- D
- L
- GF
- GA
- GD
- Pts

Footer:

- Source: DDSFL · Updated {date/time}

Club row marker: ★

### Calendar list

- Nothing scheduled yet.
- Training

### Calendar month view

Weekday headers:

- Mon, Tue, Wed, Thu, Fri, Sat, Sun

Legend:

- Match
- Training

Selected day empty state:

- No events on this day.

Event labels:

- Match
- Training
- vs / @ {opponent}

### Squad stats view

Summary tiles:

- Team goals
- Assists
- Appearances
- MOTM

Section heading:

- Top scorers

Filter tabs:

- All
- Goals
- Assists
- Cards

Position group headings:

- {Position}s *(e.g. Forwards, Midfielders, Defenders, Goalkeepers, Squads)*

Stat chips:

- G, A, Apps, CS
- goals *(under top scorer count)*
- {n} assist / {n} assists

Empty state:

- No stats recorded yet.

### Player profile view

Hero:

- season pts
- Bishop Middleham FC
- Your profile *(own profile only)*

Sidebar labels:

- Joined
- Matches
- Goals
- Assists
- Avg impact — {n} pts

Performance section:

- Performance
- Match-by-match impact score
- ⭐ {n} MOTM

Player profile (radar):

- Player profile
- Season attributes (0–100 scale)

Radar axis labels *(outfield)*:

- Goals, Assists, Apps, MOTM, Discipline

Radar axis labels *(goalkeeper)*:

- Clean sheets, Apps, MOTM, Discipline, Goals

Statistics section:

- Statistics
- Matches played
- Goals
- Assists
- Man of the match
- Clean sheets *(goalkeeper only)*
- Yellow cards
- Red cards
- Contributions per match

Summary tiles:

- Goals, Assists, MOTM

Match record:

- Match record
- No match contributions yet.
- vs / @ {opponent}
- W / D / L

Event badges:

- ⚽ Goal
- 🅰️ Assist
- ⭐ MOTM
- 🟨 Yellow
- 🟥 Red

Own profile calendar:

- My calendar
- Full calendar →
- Mark your availability for upcoming matches and training.

### Player performance chart

- No match data yet.
- Match impact (pts)
- Goals +10 · Assist +6 · MOTM +15
- {n} pts

### Player form timeline

- Recent form
- Avg last {n}: {average} pts

### Push notification prompt

- 🔔
- Turn on notifications
- Get match and training reminders straight to your phone — no app needed.
- Requires HTTPS and server setup (VAPID keys). *(when not configured)*
- Enable / Enabling...
- Not now

### Notification toggle

- Notifications not supported on this device.
- Notifications blocked — enable them in your browser settings.
- Push notifications
- On / Off / ...

### Data error banner

- {error message}
- Try again

### Error boundary

- There was a problem loading this section.
- Try again

---

## `/` — Landing

### Hero

- BMFC Club Hub
- {CLUB_NAME} — Bishop Middleham FC
- Your squad app — fixtures, league table, stats, and availability in one place.
- {LEAGUE_NAME} — Swinburne Maddison Third Division
- Login
- New players — use the invite link from your admin.
- Est. 1984 · Bishop Middleham

### Features section

- Everything the squad needs

**League table**

- Live standings from DDSFL — see where we are in the division.

**Results & fixtures**

- Every match, every score. Bishop Middleham FC's full season history.

**Calendar & availability**

- Mark yourself in, out or maybe for matches and training. Works like TeamApp, no download needed.

**Squad stats**

- Goals, assists, MOTM, cards and appearances for everyone in the squad.

---

## `/login` — Login

### Login form

- Welcome back
- Sign in to BMFC Club Hub
- Your name
- Placeholder: Chris Lee
- Passcode
- Placeholder: ••••
- Login / Signing in...
- Test *(mock mode only)*
- Test as admin *(mock mode only)*
- New player? Use the invite link your admin sent you.

---

## `/invite/:token` — Invite setup

### Loading

*(spinner only — no text)*

### Invalid invite

- Invite link problem
- {error message} / This link is not valid.
- Go to login

### Invite form

- Welcome, {display_name}
- Choose a 4-digit passcode to finish setting up your account.
- Passcode
- Placeholder: ••••
- Confirm passcode
- Placeholder: ••••
- Get started / Setting up...
- Already set up? Login

---

## `/pending` — Awaiting approval

- ⏳
- Awaiting approval
- Hi {display_name or "there"} — your account is waiting for approval. A committee member will sort it shortly.
- Once approved you'll be able to see fixtures, mark your availability and view squad stats.
- Log out
- Back to home

---

## `/dashboard` — Home

- {greeting}, {first name or "there"}
- {CLUB_NAME} · {LEAGUE_NAME}

### Summary cards

- League position
- {position or "—"}
- {points} pts
- Next match
- vs / @ {opponent}
- {date} · {time}
- No upcoming fixtures

### Sections

- Mark availability
- Calendar →
- Last result
- All results →
- Next training

### Quick links

- League table
- Results
- Stats
- Calendar

*(Also shows Push notification prompt and Availability nudge when applicable.)*

---

## `/table` — League table

- League table
- {LEAGUE_NAME} · {CURRENT_SEASON}

*(League table component — see Shared components.)*

---

## `/results` — Fixtures & results

- Fixtures & results
- Bishop Middleham FC

Tabs:

- Upcoming
- Results

Empty states:

- No upcoming fixtures yet.
- No results yet.

---

## `/stats` — Squad stats

- Squad stats
- Goals, assists, appearances & more

*(Squad stats view — see Shared components.)*

---

## `/calendar` — Calendar

- Calendar
- Matches, training & availability

View tabs:

- List
- Calendar

*(Calendar list or month view — see Shared components.)*

---

## `/player/:id` — Player profile

- ← Squad stats
- Player not found.

*(Player profile view — see Shared components.)*

---

## `/admin` — Admin hub

- Admin
- Committee & admin tools *(admin)*
- Committee tools *(committee)*

**Squad members** *(admin only)*

- Create accounts, invite links & passcodes

**Squad list**

- Positions for stats and result entry

**Add match**

- Friendlies, cups & pre-season games

**Enter results**

- Scores, goalscorers, MOTM & cards

**Training sessions**

- Add, edit & remove training on the calendar

**Availability overview**

- See who's in for upcoming events

**Send notification**

- Push reminder to subscribed players

---

## `/admin/users` — Squad members

- ← Admin
- Squad members
- Create accounts and send invite links. Set a position so they show up in stats as soon as they accept.

### Add a player

- Add a player
- Placeholder: Player name, e.g. Chris Lee
- {Forward | Midfielder | Defender | Goalkeeper}
- Create invite / Creating...

### Latest invite link

- Latest invite link
- {invite URL}
- Copy link

### Reset passcode

- Reset passcode — {display_name}
- Set a new 4-digit code and send it to them on WhatsApp.
- Placeholder: ••••
- Save new passcode
- Cancel

### Awaiting setup

- Awaiting setup ({count})
- {display_name}
- Invite not used · {position}
- New link

### All members table

Headers:

- Name
- Squad
- Status
- Actions

Role labels:

- Admin
- Committee
- Player

Squad column:

- {position} / Squad / —

Status badges:

- Invite sent
- Active
- Inactive

Actions:

- New link
- Committee *(checkbox)*
- Reset code
- Revoke
- Approve

---

## `/admin/squad` — Squad list

- ← Admin
- Squad list
- Players on the squad list appear in stats and result entry. Link their account once they've accepted their invite.

### Add to squad

- Add to squad
- Select player…
- {position options}
- Add

Empty state:

- No squad members yet.

Member row:

- Joined {month year}
- Remove

Confirm dialog:

- Remove {display_name} from the squad list?

---

## `/admin/fixtures` — Add / edit match

- ← Admin
- Add match / Edit match
- Friendlies, cups and other games. League fixtures come from DDSFL automatically.

### Form

- Match type
- Friendly
- League
- Cup / trophy
- Other
- Competition name *(cup/other only)*
- Placeholder: e.g. Alan Smith Memorial Trophy / e.g. Charity match
- Opponent
- Placeholder: e.g. Shildon Town
- Date
- Kick-off
- Home or away
- home
- away
- Venue / Venue (opponent ground)
- Placeholder: Bishop Middleham Recreation Ground / e.g. Willington Recreation Ground
- Cancel
- Add match / Save changes / Saving...

### Manual matches list

- Manual matches
- Only matches added here can be edited or removed. DDSFL league games are read-only.
- No manual matches yet. Add a friendly or cup game above.
- Played
- Edit
- Remove / Removing...
- Edit result

Confirm dialog:

- Remove "{competition} vs {opponent}"? This cannot be undone.

---

## `/admin/results` — Enter results

- ← Admin
- Enter results

Tabs:

- Needs result
- Edit completed

Empty state:

- No fixtures in this list.

Fixture selector:

- {opponent} — {date}

### Result entry form

- {opponent} · {date}
- Goals for
- Goals against
- Notes
- Placeholder: Optional
- Match events
- + Add
- Goal
- Assist
- MOTM
- Yellow
- Red
- Placeholder: Min
- Save result / Saving...

---

## `/admin/training` — Training sessions

- ← Admin
- Training sessions / Edit training
- Add, edit or remove sessions on the squad calendar.

### Form

- Date
- Time
- Location
- Notes
- Placeholder: Optional
- Cancel
- Add to calendar / Save changes / Saving...

### List

- Scheduled sessions
- No training sessions yet.
- Past
- Edit
- Remove / Removing...

Confirm dialog:

- Remove training on {date}? Player availability for this session will also be deleted.

---

## `/admin/availability` — Availability overview

- ← Admin
- Availability
- See who's in, out, or hasn't responded

Empty state:

- No upcoming matches or training sessions.

- Select event
- {Match vs {opponent} | Training} — {date} · {time}

Summary pills:

- In
- Maybe
- Out
- No reply

Groups:

- In ({count})
- Maybe ({count})
- Out ({count})
- No response ({count})
- Nobody
- "{message}" *(player notes, italic)*

- Refresh

---

## `/admin/notifications` — Send notification

- ← Admin
- Send notification
- Push to all squad members who have notifications turned on.

Form defaults:

- Title: BMFC reminder
- Message: Please mark your availability for this weekend.
- Link (when tapped): /calendar

Labels:

- Title
- Message
- Link (when tapped)
- Send to squad / Sending...

---

## Toast messages

### Auth

- Passcode must be 4 digits
- Signed in
- Sign in failed
- Passcode must be exactly 4 digits
- Passcodes do not match
- You're all set!
- Setup failed
- Invalid invite link

### Availability

- Availability saved
- Could not save availability

### Data loading

- Failed to load dashboard
- Failed to load league table
- Failed to load fixtures
- Failed to load stats
- Failed to load calendar
- Failed to load player profile
- Failed to load availability

### Notifications

- Notifications enabled
- Could not enable notifications
- Notifications turned off
- Notifications turned on
- Connect Supabase to send push notifications.
- Not signed in
- Sent to {n} device(s)
- Failed to send

### Admin — users

- Copied to clipboard
- Could not copy — select the link manually
- Enter the player's name
- Invite created for {name}
- Failed to create invite
- New link for {name}
- Failed to regenerate link
- Passcode reset for {name} — tell them the new code
- Failed to reset passcode
- Role updated
- Failed to update role

### Admin — squad

- Pick a player
- {name} added to squad
- Failed to update squad
- Position updated
- Failed to update position
- Removed from squad
- Failed to remove

### Admin — fixtures

- Failed to load fixtures
- Date and opponent are required
- Competition name is required
- Match updated
- Match added
- Failed to save match
- Match removed
- Failed to remove match

### Admin — training

- Failed to load sessions
- Pick a date
- Training session updated
- Training session added
- Failed to save session
- Training session removed
- Failed to remove session

### Admin — results

- Enter valid scores
- Result saved
- Failed to save result

---

## Routes with no visible copy

| Route | Behaviour |
|-------|-----------|
| `/signup` | Redirects to `/login` |

---

*Generated from BMFC Club Hub source. Last updated: June 2026.*
