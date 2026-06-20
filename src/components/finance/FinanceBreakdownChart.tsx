import { useMemo } from 'react'
import type { FinanceOverview } from '../../types'
import {
  expenseCategoryLabel,
  formatGBP,
  sponsorshipCategoryLabel,
} from '../../lib/financeCategories'

interface FinanceBreakdownChartProps {
  overview: FinanceOverview
}

function HorizontalBars({
  title,
  rows,
}: {
  title: string
  rows: { label: string; value: number; color: string; sub?: string }[]
}) {
  const max = useMemo(() => Math.max(1, ...rows.map((r) => r.value)), [rows])

  if (rows.every((r) => r.value === 0)) {
    return (
      <div>
        <h3 className="font-semibold text-brand-navy text-sm mb-3">{title}</h3>
        <p className="text-sm text-gray-500">No entries yet.</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="font-semibold text-brand-navy text-sm mb-3">{title}</h3>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex items-center justify-between text-xs mb-1 gap-2">
              <span className="font-medium text-brand-navy truncate">{row.label}</span>
              <span className="text-gray-600 shrink-0">{formatGBP(row.value)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-brand-light overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${row.color}`}
                style={{ width: `${Math.max((row.value / max) * 100, row.value > 0 ? 8 : 0)}%` }}
              />
            </div>
            {row.sub && <p className="text-[10px] text-gray-400 mt-0.5">{row.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

export function FinanceBreakdownChart({ overview }: FinanceBreakdownChartProps) {
  const sponsorshipRows = overview.sponsorship_by_category.flatMap((row) => {
    const label = sponsorshipCategoryLabel(row.category as Parameters<typeof sponsorshipCategoryLabel>[0])
    const items: { label: string; value: number; color: string; sub?: string }[] = []
    const paid = Number(row.paid_amount ?? 0)
    const pending = Number(row.pending_amount ?? 0)
    if (paid > 0) {
      items.push({ label: `${label} (paid)`, value: paid, color: 'bg-emerald-500' })
    }
    if (pending > 0) {
      items.push({ label: `${label} (pending)`, value: pending, color: 'bg-amber-400' })
    }
    return items
  })

  const expenseRows = overview.expenses_by_category.map((row) => ({
    label: expenseCategoryLabel(row.category as Parameters<typeof expenseCategoryLabel>[0]),
    value: Number(row.amount ?? 0),
    color: 'bg-brand-blue',
  }))

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <HorizontalBars title="Sponsorship by category" rows={sponsorshipRows} />
      <HorizontalBars title="Expenses by category" rows={expenseRows} />
    </div>
  )
}
