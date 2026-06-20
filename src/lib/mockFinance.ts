import { loadSession } from '../hooks/authContext'
import { DEV_ADMIN } from './devBypass'
import { getMockSquad } from './mockData'
import { DDSFL_SEASONS, DDSFL_ACTIVE_SEASON } from './ddsflConstants'
import type {
  Expense,
  ExpenseCategory,
  FinanceOverview,
  SigningOnFeeRow,
  SigningOnFeesSummary,
  Sponsorship,
  SponsorshipCategory,
} from '../types'

const MOCK_LOGGED_BY = {
  id: DEV_ADMIN.id,
  name: DEV_ADMIN.display_name,
}

export const MOCK_SPONSORSHIPS: Sponsorship[] = [
  {
    id: 'sp1',
    sponsor_name: 'Durham Building Supplies',
    category: 'kit',
    item_detail: 'Home shirts',
    amount: 500,
    paid: true,
    date_added: '2026-05-01',
    logged_by_id: MOCK_LOGGED_BY.id,
    logged_by_name: MOCK_LOGGED_BY.name,
    created_at: '2026-05-01T10:00:00Z',
  },
  {
    id: 'sp2',
    sponsor_name: 'Local Hero Ltd',
    category: 'player_sponsor',
    item_detail: 'Chris Lee',
    amount: 150,
    paid: false,
    date_added: '2026-06-01',
    logged_by_id: MOCK_LOGGED_BY.id,
    logged_by_name: MOCK_LOGGED_BY.name,
    created_at: '2026-06-01T14:00:00Z',
  },
]

export const MOCK_EXPENSES: Expense[] = [
  {
    id: 'ex1',
    description: 'Pre-season pitch hire',
    category: 'pitch_hire',
    amount: 120,
    expense_date: '2026-07-15',
    logged_by_id: MOCK_LOGGED_BY.id,
    logged_by_name: MOCK_LOGGED_BY.name,
    created_at: '2026-07-15T09:00:00Z',
  },
  {
    id: 'ex2',
    description: 'League registration',
    category: 'admin_fees',
    amount: 85,
    expense_date: '2026-06-20',
    logged_by_id: MOCK_LOGGED_BY.id,
    logged_by_name: MOCK_LOGGED_BY.name,
    created_at: '2026-06-20T11:00:00Z',
  },
]

let sponsorships = [...MOCK_SPONSORSHIPS]
let expenses = [...MOCK_EXPENSES]

function mockActor() {
  const session = loadSession()
  return {
    id: session?.id ?? MOCK_LOGGED_BY.id,
    name: session?.display_name ?? MOCK_LOGGED_BY.name,
  }
}

function computeOverview(): FinanceOverview {
  const paid_income = sponsorships.filter((s) => s.paid).reduce((n, s) => n + s.amount, 0)
  const pending_income = sponsorships.filter((s) => !s.paid).reduce((n, s) => n + s.amount, 0)
  const total_expenses = expenses.reduce((n, e) => n + e.amount, 0)

  const sponsorshipCats = new Map<string, { paid: number; pending: number }>()
  for (const s of sponsorships) {
    const row = sponsorshipCats.get(s.category) ?? { paid: 0, pending: 0 }
    if (s.paid) row.paid += s.amount
    else row.pending += s.amount
    sponsorshipCats.set(s.category, row)
  }

  const expenseCats = new Map<string, number>()
  for (const e of expenses) {
    expenseCats.set(e.category, (expenseCats.get(e.category) ?? 0) + e.amount)
  }

  return {
    paid_income,
    pending_income,
    total_expenses,
    net_balance: paid_income - total_expenses,
    sponsorship_by_category: [...sponsorshipCats.entries()].map(([category, v]) => ({
      category,
      paid_amount: v.paid,
      pending_amount: v.pending,
    })),
    expenses_by_category: [...expenseCats.entries()].map(([category, amount]) => ({
      category,
      amount,
    })),
  }
}

export function getMockSponsorships(): Sponsorship[] {
  return [...sponsorships].sort(
    (a, b) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime(),
  )
}

export function getMockExpenses(): Expense[] {
  return [...expenses].sort(
    (a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime(),
  )
}

export function getMockFinanceOverview(): FinanceOverview {
  return computeOverview()
}

export function addMockSponsorship(input: {
  sponsor_name: string
  category: SponsorshipCategory
  item_detail?: string | null
  amount: number
  paid: boolean
  date_added: string
}): Sponsorship {
  const actor = mockActor()
  const row: Sponsorship = {
    id: crypto.randomUUID(),
    ...input,
    item_detail: input.item_detail ?? null,
    logged_by_id: actor.id,
    logged_by_name: actor.name,
    created_at: new Date().toISOString(),
  }
  sponsorships.push(row)
  return row
}

export function updateMockSponsorship(
  id: string,
  input: {
    sponsor_name: string
    category: SponsorshipCategory
    item_detail?: string | null
    amount: number
    paid: boolean
    date_added: string
  },
): Sponsorship {
  const actor = mockActor()
  const idx = sponsorships.findIndex((s) => s.id === id)
  if (idx < 0) throw new Error('Sponsorship not found')
  sponsorships[idx] = {
    ...sponsorships[idx],
    ...input,
    item_detail: input.item_detail ?? null,
    edited_by_id: actor.id,
    edited_by_name: actor.name,
    edited_at: new Date().toISOString(),
  }
  return sponsorships[idx]
}

export function deleteMockSponsorship(id: string) {
  sponsorships = sponsorships.filter((s) => s.id !== id)
}

export function addMockExpense(input: {
  description: string
  category: ExpenseCategory
  amount: number
  expense_date: string
}): Expense {
  const actor = mockActor()
  const row: Expense = {
    id: crypto.randomUUID(),
    ...input,
    logged_by_id: actor.id,
    logged_by_name: actor.name,
    created_at: new Date().toISOString(),
  }
  expenses.push(row)
  return row
}

export function updateMockExpense(
  id: string,
  input: {
    description: string
    category: ExpenseCategory
    amount: number
    expense_date: string
  },
): Expense {
  const actor = mockActor()
  const idx = expenses.findIndex((e) => e.id === id)
  if (idx < 0) throw new Error('Expense not found')
  expenses[idx] = {
    ...expenses[idx],
    ...input,
    edited_by_id: actor.id,
    edited_by_name: actor.name,
    edited_at: new Date().toISOString(),
  }
  return expenses[idx]
}

export function deleteMockExpense(id: string) {
  expenses = expenses.filter((e) => e.id !== id)
}

const signingOnPaidBySeason = new Map<string, Set<string>>()

export function resetMockFinance() {
  sponsorships = [...MOCK_SPONSORSHIPS]
  expenses = [...MOCK_EXPENSES]
  signingOnPaidBySeason.clear()
}

function signingOnSeasonKey(season: string) {
  if (!signingOnPaidBySeason.has(season)) {
    signingOnPaidBySeason.set(season, new Set(['00000000-0000-0000-0000-000000000001']))
  }
  return signingOnPaidBySeason.get(season)!
}

export function getMockSigningOnFees(season: string): SigningOnFeesSummary {
  const paidSet = signingOnSeasonKey(season)
  return {
    season,
    members: getMockSquad().map((member) => ({
      profile_id: member.player_id,
      display_name: member.display_name,
      paid: paidSet.has(member.player_id),
      marked_at: paidSet.has(member.player_id) ? new Date().toISOString() : null,
      marked_by_name: paidSet.has(member.player_id) ? MOCK_LOGGED_BY.name : null,
    })),
  }
}

export function setMockSigningOnPaid(season: string, profileId: string, paid: boolean): SigningOnFeeRow {
  const paidSet = signingOnSeasonKey(season)
  const actor = mockActor()
  if (paid) paidSet.add(profileId)
  else paidSet.delete(profileId)

  const member = getMockSquad().find((m) => m.player_id === profileId)
  return {
    profile_id: profileId,
    display_name: member?.display_name ?? 'Unknown',
    paid,
    marked_at: paid ? new Date().toISOString() : null,
    marked_by_name: paid ? actor.name : null,
  }
}

export const MOCK_CURRENT_SEASON = DDSFL_SEASONS[DDSFL_ACTIVE_SEASON].appSeason
