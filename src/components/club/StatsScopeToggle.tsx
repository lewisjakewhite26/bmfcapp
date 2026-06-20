import type { StatsScope } from '../../lib/seasonScope'
import { statsScopeLabel } from '../../lib/seasonScope'

interface StatsScopeToggleProps {
  value: StatsScope
  onChange: (scope: StatsScope) => void
}

const OPTIONS: StatsScope[] = ['pre_season', 'season']

export function StatsScopeToggle({ value, onChange }: StatsScopeToggleProps) {
  return (
    <div className="flex gap-2 p-1 glass-card">
      {OPTIONS.map((scope) => (
        <button
          key={scope}
          type="button"
          onClick={() => onChange(scope)}
          className={`flex-1 min-h-[40px] rounded-pill text-sm font-semibold whitespace-nowrap transition-colors ${
            value === scope ? 'bg-brand-blue text-white' : 'text-gray-600 hover:bg-white/60'
          }`}
        >
          {statsScopeLabel(scope)}
        </button>
      ))}
    </div>
  )
}
