import { loadSession } from '../hooks/authContext'
import { DEV_ADMIN } from './devBypass'
import { getMockSquad, PREVIEW_PLAYER_ID } from './mockData'
import type { FineEntry, FineSession, FineSessionDetail, FinesOverview, PlayerFinesSummaryRow } from '../types'

const sessions: FineSession[] = [
  {
    id: 'fine-session-1',
    session_date: '2026-06-14',
    title: 'Sat training',
    notes: null,
    created_at: '2026-06-14T10:00:00.000Z',
    entry_count: 3,
    session_total: 9,
    unpaid_total: 7,
  },
  {
    id: 'fine-session-2',
    session_date: '2026-06-07',
    title: 'League match vs Shildon',
    notes: 'Post-match fines',
    created_at: '2026-06-07T18:30:00.000Z',
    entry_count: 2,
    session_total: 7,
    unpaid_total: 0,
  },
]

const entries: FineEntry[] = [
  {
    id: 'fine-1',
    session_id: 'fine-session-1',
    profile_id: PREVIEW_PLAYER_ID,
    display_name: 'Chris L',
    fine_key: 'late',
    label: 'Late',
    amount: 2,
    paid: false,
    session_date: '2026-06-14',
    session_title: 'Sat training',
    created_at: '2026-06-14T10:05:00.000Z',
  },
  {
    id: 'fine-2',
    session_id: 'fine-session-1',
    profile_id: PREVIEW_PLAYER_ID,
    display_name: 'Chris L',
    fine_key: 'no_shin_pads',
    label: 'No shin pads',
    amount: 2,
    paid: false,
    session_date: '2026-06-14',
    session_title: 'Sat training',
    created_at: '2026-06-14T10:05:00.000Z',
  },
  {
    id: 'fine-3',
    session_id: 'fine-session-1',
    profile_id: 'p3',
    display_name: 'Mark D',
    fine_key: 'no_show',
    label: 'No show',
    amount: 5,
    paid: true,
    marked_at: '2026-06-15T09:00:00.000Z',
    marked_by_name: DEV_ADMIN.display_name,
    session_date: '2026-06-14',
    session_title: 'Sat training',
    created_at: '2026-06-14T10:06:00.000Z',
  },
  {
    id: 'fine-4',
    session_id: 'fine-session-2',
    profile_id: 'p2',
    display_name: 'James W',
    fine_key: 'yellow_card',
    label: 'Yellow card',
    amount: 5,
    paid: true,
    marked_at: '2026-06-08T12:00:00.000Z',
    marked_by_name: DEV_ADMIN.display_name,
    session_date: '2026-06-07',
    session_title: 'League match vs Shildon',
    created_at: '2026-06-07T18:35:00.000Z',
  },
  {
    id: 'fine-5',
    session_id: 'fine-session-2',
    profile_id: PREVIEW_PLAYER_ID,
    display_name: 'Chris L',
    fine_key: 'lost_ball',
    label: 'Lost ball',
    amount: 2,
    paid: true,
    marked_at: '2026-06-08T12:00:00.000Z',
    marked_by_name: DEV_ADMIN.display_name,
    session_date: '2026-06-07',
    session_title: 'League match vs Shildon',
    created_at: '2026-06-07T18:36:00.000Z',
  },
]

function refreshSessionTotals() {
  for (const session of sessions) {
    const sessionEntries = entries.filter((e) => e.session_id === session.id)
    session.entry_count = sessionEntries.length
    session.session_total = sessionEntries.reduce((s, e) => s + e.amount, 0)
    session.unpaid_total = sessionEntries.filter((e) => !e.paid).reduce((s, e) => s + e.amount, 0)
  }
}

function squadList() {
  return getMockSquad().map((m) => ({
    profile_id: m.player_id,
    display_name: m.display_name,
  }))
}

export function getMockFineSessions(): FineSession[] {
  refreshSessionTotals()
  return [...sessions].sort((a, b) => b.session_date.localeCompare(a.session_date))
}

export function createMockFineSession(input: {
  session_date: string
  title: string
  notes: string | null
}): FineSession {
  const session: FineSession = {
    id: `fine-session-${Date.now()}`,
    session_date: input.session_date,
    title: input.title,
    notes: input.notes,
    created_at: new Date().toISOString(),
    entry_count: 0,
    session_total: 0,
    unpaid_total: 0,
  }
  sessions.unshift(session)
  return session
}

export function getMockFineSessionDetail(sessionId: string): FineSessionDetail {
  const session = sessions.find((s) => s.id === sessionId)
  if (!session) throw new Error('Fines session not found')
  refreshSessionTotals()
  return {
    session: { ...session },
    entries: entries.filter((e) => e.session_id === sessionId),
    squad: squadList(),
  }
}

export function setMockFineEntry(
  sessionId: string,
  profileId: string,
  fineKey: string,
  label: string,
  amount: number,
  enabled: boolean,
): FineEntry | null {
  const session = sessions.find((s) => s.id === sessionId)
  if (!session) throw new Error('Fines session not found')
  const squadMember = squadList().find((s) => s.profile_id === profileId)
  if (!squadMember) throw new Error('Invalid squad member')

  const idx = entries.findIndex(
    (e) => e.session_id === sessionId && e.profile_id === profileId && e.fine_key === fineKey,
  )

  if (!enabled) {
    if (idx >= 0) entries.splice(idx, 1)
    refreshSessionTotals()
    return null
  }

  if (idx >= 0) {
    entries[idx] = { ...entries[idx], label, amount }
    refreshSessionTotals()
    return entries[idx]
  }

  const row: FineEntry = {
    id: `fine-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    session_id: sessionId,
    profile_id: profileId,
    display_name: squadMember.display_name,
    fine_key: fineKey,
    label,
    amount,
    paid: false,
    session_date: session.session_date,
    session_title: session.title,
    created_at: new Date().toISOString(),
  }
  entries.push(row)
  refreshSessionTotals()
  return row
}

export function setMockFinePaid(entryId: string, paid: boolean): FineEntry {
  const row = entries.find((e) => e.id === entryId)
  if (!row) throw new Error('Fine not found')
  const actor = loadSession()
  row.paid = paid
  row.marked_at = paid ? new Date().toISOString() : null
  row.marked_by_name = paid ? (actor?.display_name ?? DEV_ADMIN.display_name) : null
  refreshSessionTotals()
  return { ...row }
}

export function getMockFinesOverview(filter: 'all' | 'unpaid' | 'paid'): FinesOverview {
  refreshSessionTotals()
  let list = [...entries].sort((a, b) => b.created_at.localeCompare(a.created_at))
  if (filter === 'unpaid') list = list.filter((e) => !e.paid)
  if (filter === 'paid') list = list.filter((e) => e.paid)
  const unpaid = entries.filter((e) => !e.paid)
  const owingIds = new Set(unpaid.map((e) => e.profile_id))
  return {
    total_outstanding: unpaid.reduce((s, e) => s + e.amount, 0),
    players_owing: owingIds.size,
    entries: list,
  }
}

export function getMockOutstandingFinesSummary(): PlayerFinesSummaryRow[] {
  refreshSessionTotals()
  const byPlayer = new Map<string, FineEntry[]>()
  for (const entry of entries.filter((e) => !e.paid)) {
    const list = byPlayer.get(entry.profile_id) ?? []
    list.push(entry)
    byPlayer.set(entry.profile_id, list)
  }

  const MS_PER_DAY = 86_400_000
  const rows: PlayerFinesSummaryRow[] = []
  for (const [profileId, playerEntries] of byPlayer) {
    const outstanding = playerEntries.reduce((s, e) => s + e.amount, 0)
    const oldest = Math.max(
      ...playerEntries.map((e) =>
        Math.floor((Date.now() - new Date(e.created_at).getTime()) / MS_PER_DAY),
      ),
    )
    rows.push({
      profile_id: profileId,
      display_name: playerEntries[0]?.display_name ?? 'Unknown',
      outstanding_total: outstanding,
      unpaid_count: playerEntries.length,
      oldest_unpaid_days: oldest,
      entries: [...playerEntries].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    })
  }
  return rows.sort((a, b) => b.outstanding_total - a.outstanding_total)
}

export function getMockPlayerFines(profileId: string): FineEntry[] {
  return entries
    .filter((e) => e.profile_id === profileId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}
