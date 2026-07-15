import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { DataErrorBanner } from '../components/ui/DataErrorBanner'
import { FineSquadOwedCard } from '../components/fines/FineSquadOwedCard'
import { FineYourBalanceCard } from '../components/fines/FineYourBalanceCard'
import { FinePaymentDetails } from '../components/fines/FinePaymentDetails'
import { pageContainerClass } from '../lib/layout'
import { FINE_EMPTY, FINE_PAGE, FINE_SQUAD } from '../lib/finePlayerCopy'
import { fetchMyUnpaidFines, fetchOutstandingFinesSummary } from '../lib/clubApi'
import { useAuth } from '../hooks/useAuth'

export default function Fines() {
  const { user } = useAuth()
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchOutstandingFinesSummary>>>([])
  const [myFines, setMyFines] = useState<Awaited<ReturnType<typeof fetchMyUnpaidFines>>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [summary, mine] = await Promise.all([
        fetchOutstandingFinesSummary(),
        fetchMyUnpaidFines(),
      ])
      setRows(summary)
      setMyFines(mine)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load fines")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const squadRows = useMemo(() => {
    if (!user || myFines.length === 0) return rows
    return rows.filter((row) => row.profile_id !== user.id)
  }, [rows, user, myFines.length])

  const showSquadSection = squadRows.length > 0

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass()}>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-brand-navy">{FINE_PAGE.title}</h1>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{FINE_PAGE.subtitle}</p>
        </div>

        {error && <DataErrorBanner message={error} onRetry={load} />}

        <FinePaymentDetails />

        {loading ? (
          <div className="glass-card p-8 animate-pulse bg-brand-light/40 h-40 rounded-card" />
        ) : (
          <>
            {myFines.length > 0 && <FineYourBalanceCard entries={myFines} />}

            {rows.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <p className="font-semibold text-brand-navy">{FINE_EMPTY.heading}</p>
                <p className="text-sm text-gray-500 mt-1">{FINE_EMPTY.body}</p>
              </div>
            ) : showSquadSection ? (
              <section className="space-y-3">
                <div>
                  <h2 className="font-semibold text-brand-navy">{FINE_SQUAD.heading}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{FINE_SQUAD.hint}</p>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {squadRows.map((row) => (
                    <li key={row.profile_id}>
                      <FineSquadOwedCard
                        row={row}
                        expanded={expandedId === row.profile_id}
                        isMe={user?.id === row.profile_id}
                        onToggle={() =>
                          setExpandedId(expandedId === row.profile_id ? null : row.profile_id)
                        }
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </div>
    </PageShell>
  )
}
