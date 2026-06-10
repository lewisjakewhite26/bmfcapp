import { Link } from 'react-router-dom'
import type { Availability, DashboardSummary } from '../../types'
import { formatMatchDate, formatMatchTime } from '../../lib/format'

interface AvailabilityNudgeProps {
  summary: DashboardSummary
  availability: Availability[]
}

export function AvailabilityNudge({ summary, availability }: AvailabilityNudgeProps) {
  const messages: string[] = []

  if (summary.nextFixture) {
    const hasResponse = availability.some((a) => a.fixture_id === summary.nextFixture!.id)
    if (!hasResponse) {
      const opponent = summary.nextFixture.opponent.replace(/ FC$/, '')
      const prefix = summary.nextFixture.home_away === 'home' ? 'vs' : '@'
      const when = formatMatchDate(summary.nextFixture.match_date)
      messages.push(`Haven't marked availability for ${when} ${prefix} ${opponent} yet. Tap to respond.`)
    }
  }

  if (summary.upcomingTraining) {
    const hasResponse = availability.some((a) => a.training_id === summary.upcomingTraining!.id)
    if (!hasResponse) {
      const when = formatMatchDate(summary.upcomingTraining.session_date)
      const time = formatMatchTime(summary.upcomingTraining.session_date)
      messages.push(`Haven't marked availability for training on ${when} · ${time}. Tap to respond.`)
    }
  }

  if (messages.length === 0) return null

  return (
    <Link
      to="/calendar"
      className="block glass-card p-4 border-l-4 border-amber-400 bg-amber-50/60 hover:bg-amber-50/80 transition-colors"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Availability</p>
      <ul className="mt-1 space-y-1">
        {messages.map((message) => (
          <li key={message} className="text-sm font-medium text-brand-navy">
            {message}
          </li>
        ))}
      </ul>
      <p className="text-xs text-amber-800/80 mt-2 font-medium">Tap to respond on the calendar →</p>
    </Link>
  )
}
