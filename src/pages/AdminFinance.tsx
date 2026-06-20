import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { DataErrorBanner } from '../components/ui/DataErrorBanner'
import { CollapsibleCard } from '../components/ui/CollapsibleCard'
import { FinanceBreakdownChart } from '../components/finance/FinanceBreakdownChart'
import { FinanceLedgerNote } from '../components/finance/FinanceLedgerNote'
import { SigningOnFeeChecklist } from '../components/finance/SigningOnFeeChecklist'
import {
  createExpense,
  createSponsorship,
  deleteExpense,
  deleteSponsorship,
  fetchExpenses,
  fetchFinanceOverview,
  fetchSponsorships,
  updateExpense,
  updateSponsorship,
} from '../lib/clubApi'
import {
  EXPENSE_CATEGORIES,
  SPONSORSHIP_CATEGORIES,
  expenseCategoryLabel,
  formatGBP,
  sponsorshipCategoryLabel,
} from '../lib/financeCategories'
import { pageContainerClass } from '../lib/layout'
import type { Expense, ExpenseCategory, FinanceOverview, Sponsorship, SponsorshipCategory } from '../types'

type PaidFilter = 'all' | 'paid' | 'unpaid'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function SummaryCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'positive' | 'warning' | 'negative'
}) {
  const tones = {
    default: 'text-brand-navy',
    positive: 'text-emerald-700',
    warning: 'text-amber-700',
    negative: 'text-red-700',
  }
  return (
    <div className="glass-card p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`font-display text-2xl font-bold mt-1 ${tones[tone]}`}>{value}</p>
    </div>
  )
}

export default function AdminFinance() {
  const [overview, setOverview] = useState<FinanceOverview | null>(null)
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paidFilter, setPaidFilter] = useState<PaidFilter>('all')

  const [spName, setSpName] = useState('')
  const [spCategory, setSpCategory] = useState<SponsorshipCategory>('other')
  const [spDetail, setSpDetail] = useState('')
  const [spAmount, setSpAmount] = useState('')
  const [spPaid, setSpPaid] = useState(false)
  const [spDate, setSpDate] = useState(todayISO())
  const [editingSpId, setEditingSpId] = useState<string | null>(null)

  const [exDesc, setExDesc] = useState('')
  const [exCategory, setExCategory] = useState<ExpenseCategory>('other')
  const [exAmount, setExAmount] = useState('')
  const [exDate, setExDate] = useState(todayISO())
  const [editingExId, setEditingExId] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [breakdownOpen, setBreakdownOpen] = useState(false)
  const [sponsorshipsOpen, setSponsorshipsOpen] = useState(false)
  const [expensesOpen, setExpensesOpen] = useState(false)

  useEffect(() => {
    if (editingSpId) setSponsorshipsOpen(true)
  }, [editingSpId])

  useEffect(() => {
    if (editingExId) setExpensesOpen(true)
  }, [editingExId])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ov, sp, ex] = await Promise.all([
        fetchFinanceOverview(),
        fetchSponsorships(),
        fetchExpenses(),
      ])
      setOverview(ov)
      setSponsorships(sp)
      setExpenses(ex)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load finance data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const filteredSponsorships = useMemo(() => {
    if (paidFilter === 'paid') return sponsorships.filter((s) => s.paid)
    if (paidFilter === 'unpaid') return sponsorships.filter((s) => !s.paid)
    return sponsorships
  }, [sponsorships, paidFilter])

  const resetSpForm = () => {
    setSpName('')
    setSpCategory('other')
    setSpDetail('')
    setSpAmount('')
    setSpPaid(false)
    setSpDate(todayISO())
    setEditingSpId(null)
  }

  const resetExForm = () => {
    setExDesc('')
    setExCategory('other')
    setExAmount('')
    setExDate(todayISO())
    setEditingExId(null)
  }

  const handleSaveSponsorship = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(spAmount)
    if (!spName.trim() || Number.isNaN(amount) || amount < 0) {
      toast.error('Enter sponsor name and a valid amount')
      return
    }

    setSaving(true)
    try {
      const payload = {
        sponsor_name: spName.trim(),
        category: spCategory,
        item_detail: spDetail.trim() || null,
        amount,
        paid: spPaid,
        date_added: spDate,
      }
      if (editingSpId) {
        await updateSponsorship(editingSpId, payload)
        toast.success('Sponsorship updated')
      } else {
        await createSponsorship(payload)
        toast.success('Sponsorship added')
      }
      resetSpForm()
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save sponsorship")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(exAmount)
    if (!exDesc.trim() || Number.isNaN(amount) || amount < 0) {
      toast.error('Enter description and a valid amount')
      return
    }

    setSaving(true)
    try {
      const payload = {
        description: exDesc.trim(),
        category: exCategory,
        amount,
        expense_date: exDate,
      }
      if (editingExId) {
        await updateExpense(editingExId, payload)
        toast.success('Expense updated')
      } else {
        await createExpense(payload)
        toast.success('Expense added')
      }
      resetExForm()
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save expense")
    } finally {
      setSaving(false)
    }
  }

  const startEditSp = (row: Sponsorship) => {
    setEditingSpId(row.id)
    setSpName(row.sponsor_name)
    setSpCategory(row.category)
    setSpDetail(row.item_detail ?? '')
    setSpAmount(String(row.amount))
    setSpPaid(row.paid)
    setSpDate(row.date_added)
  }

  const startEditEx = (row: Expense) => {
    setEditingExId(row.id)
    setExDesc(row.description)
    setExCategory(row.category)
    setExAmount(String(row.amount))
    setExDate(row.expense_date)
  }

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass('max-w-6xl')}>
        <Link to="/admin" className="text-brand-blue text-sm font-medium">← Admin</Link>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-brand-navy">Finance</h1>
          <p className="text-sm text-gray-500 mt-1">Track sponsorships and club expenses. Every entry shows who logged it.</p>
        </div>

        {error && <DataErrorBanner message={error} onRetry={reload} />}

        {loading && !overview ? (
          <div className="glass-card h-48 animate-pulse" />
        ) : overview && (
          <>
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <SummaryCard label="Paid in" value={formatGBP(overview.paid_income)} tone="positive" />
              <SummaryCard label="Still owed" value={formatGBP(overview.pending_income)} tone="warning" />
              <SummaryCard label="Total expenses" value={formatGBP(overview.total_expenses)} tone="negative" />
              <SummaryCard
                label="Net balance"
                value={formatGBP(overview.net_balance)}
                tone={overview.net_balance >= 0 ? 'positive' : 'negative'}
              />
            </section>

            <CollapsibleCard
              title="Breakdown"
              summary="Sponsorship and expenses by category"
              open={breakdownOpen}
              onOpenChange={setBreakdownOpen}
            >
              <FinanceBreakdownChart overview={overview} />
            </CollapsibleCard>
          </>
        )}

        <SigningOnFeeChecklist />

        <CollapsibleCard
          title="Sponsorships"
          summary={
            sponsorships.length === 0
              ? 'No entries yet'
              : `${sponsorships.length} ${sponsorships.length === 1 ? 'entry' : 'entries'}`
          }
          open={sponsorshipsOpen}
          onOpenChange={setSponsorshipsOpen}
        >
          <h3 className="font-semibold text-brand-navy -mt-1">
            {editingSpId ? 'Edit sponsorship' : 'Add sponsorship'}
          </h3>
          <form onSubmit={handleSaveSponsorship} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input
              type="text"
              value={spName}
              onChange={(e) => setSpName(e.target.value)}
              className="input-field sm:col-span-2"
              placeholder="Sponsor name"
              required
            />
            <select value={spCategory} onChange={(e) => setSpCategory(e.target.value as SponsorshipCategory)} className="input-field">
              {SPONSORSHIP_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={spDetail}
              onChange={(e) => setSpDetail(e.target.value)}
              className="input-field sm:col-span-2"
              placeholder="e.g. home shirts (optional)"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={spAmount}
              onChange={(e) => setSpAmount(e.target.value)}
              className="input-field"
              placeholder="Amount (£)"
              required
            />
            <input type="date" value={spDate} onChange={(e) => setSpDate(e.target.value)} className="input-field" required />
            <label className="inline-flex items-center gap-2 text-sm text-brand-navy min-h-[44px] px-1">
              <input type="checkbox" checked={spPaid} onChange={(e) => setSpPaid(e.target.checked)} />
              Paid
            </label>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary text-sm">
                {saving ? 'Saving...' : editingSpId ? 'Save changes' : 'Add sponsorship'}
              </button>
              {editingSpId && (
                <button type="button" onClick={resetSpForm} className="btn-secondary text-sm">Cancel</button>
              )}
            </div>
          </form>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-brand-blue/10">
            {(['all', 'paid', 'unpaid'] as PaidFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setPaidFilter(f)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-pill ${
                  paidFilter === f ? 'bg-brand-blue text-white' : 'bg-brand-light text-brand-navy'
                }`}
              >
                {f === 'all' ? 'All' : f === 'paid' ? 'Paid' : 'Pending'}
              </button>
            ))}
          </div>

          {filteredSponsorships.length === 0 ? (
            <p className="text-sm text-gray-500">No sponsorships yet.</p>
          ) : (
            <ul className="space-y-3">
              {filteredSponsorships.map((row) => (
                <li key={row.id} className="rounded-card border border-brand-blue/10 p-4 bg-white/50">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-navy">{row.sponsor_name}</p>
                      <p className="text-sm text-gray-600">
                        {sponsorshipCategoryLabel(row.category)}
                        {row.item_detail ? ` · ${row.item_detail}` : ''}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(row.date_added).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <FinanceLedgerNote entry={row} />
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg font-bold text-brand-navy">{formatGBP(row.amount)}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-pill ${
                        row.paid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {row.paid ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-3">
                    <button type="button" onClick={() => startEditSp(row)} className="text-xs text-brand-blue font-medium">Edit</button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm('Delete this sponsorship?')) return
                        try {
                          await deleteSponsorship(row.id)
                          toast.success('Deleted')
                          reload()
                        } catch {
                          toast.error("Couldn't delete")
                        }
                      }}
                      className="text-xs text-red-600 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleCard>

        <CollapsibleCard
          title="Expenses"
          summary={
            expenses.length === 0
              ? 'No entries yet'
              : `${expenses.length} ${expenses.length === 1 ? 'entry' : 'entries'}`
          }
          open={expensesOpen}
          onOpenChange={setExpensesOpen}
        >
          <h3 className="font-semibold text-brand-navy -mt-1">
            {editingExId ? 'Edit expense' : 'Add expense'}
          </h3>
          <form onSubmit={handleSaveExpense} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input
              type="text"
              value={exDesc}
              onChange={(e) => setExDesc(e.target.value)}
              className="input-field sm:col-span-2"
              placeholder="Description"
              required
            />
            <select value={exCategory} onChange={(e) => setExCategory(e.target.value as ExpenseCategory)} className="input-field">
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              value={exAmount}
              onChange={(e) => setExAmount(e.target.value)}
              className="input-field"
              placeholder="Amount (£)"
              required
            />
            <input type="date" value={exDate} onChange={(e) => setExDate(e.target.value)} className="input-field" required />
            <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary text-sm">
                {saving ? 'Saving...' : editingExId ? 'Save changes' : 'Add expense'}
              </button>
              {editingExId && (
                <button type="button" onClick={resetExForm} className="btn-secondary text-sm">Cancel</button>
              )}
            </div>
          </form>

          {expenses.length === 0 ? (
            <p className="text-sm text-gray-500">No expenses yet.</p>
          ) : (
            <ul className="space-y-3">
              {expenses.map((row) => (
                <li key={row.id} className="rounded-card border border-brand-blue/10 p-4 bg-white/50">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-navy">{row.description}</p>
                      <p className="text-sm text-gray-600">{expenseCategoryLabel(row.category)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(row.expense_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <FinanceLedgerNote entry={row} />
                    </div>
                    <p className="font-display text-lg font-bold text-brand-navy">{formatGBP(row.amount)}</p>
                  </div>
                  <div className="flex gap-3 mt-3">
                    <button type="button" onClick={() => startEditEx(row)} className="text-xs text-brand-blue font-medium">Edit</button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm('Delete this expense?')) return
                        try {
                          await deleteExpense(row.id)
                          toast.success('Deleted')
                          reload()
                        } catch {
                          toast.error("Couldn't delete")
                        }
                      }}
                      className="text-xs text-red-600 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleCard>
      </div>
    </PageShell>
  )
}
