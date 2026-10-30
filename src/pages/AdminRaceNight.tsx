import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { RaceNightTv } from '../components/admin/RaceNightTv'
import { Overview } from '../components/admin/raceNight/Overview'
import { PrintProgramme } from '../components/admin/raceNight/PrintProgramme'
import { RaceStrip } from '../components/admin/raceNight/RaceStrip'
import { RaceView, type RaceMode } from '../components/admin/raceNight/RaceView'
import { SaveBadge } from '../components/admin/raceNight/SaveBadge'
import { useRaceNightDoc } from '../hooks/useRaceNightDoc'
import { pageContainerClass } from '../lib/layout'
import { addRace, removeRace } from '../lib/raceNight'

const SWIPE_PX = 70

export default function AdminRaceNight() {
  const { programme, status, loadError, edit, reload, flush } = useRaceNightDoc()
  const [params, setParams] = useSearchParams()
  const [tvStart, setTvStart] = useState<number | null>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const raceId = params.get('race')
  const mode: RaceMode = params.get('mode') === 'result' ? 'result' : 'edit'
  const printing = params.get('view') === 'print'

  const raceIndex = programme && raceId ? programme.races.findIndex((r) => r.id === raceId) : -1
  const race = programme && raceIndex >= 0 ? programme.races[raceIndex] : null

  // A race that no longer exists (removed, or reloaded) sends you back to the overview.
  useEffect(() => {
    if (programme && raceId && raceIndex < 0) setParams({}, { replace: true })
  }, [programme, raceId, raceIndex, setParams])

  const openRace = (id: string, nextMode: RaceMode = 'edit') =>
    setParams(nextMode === 'result' ? { race: id, mode: 'result' } : { race: id })
  const toOverview = () => setParams({})

  const createRace = () => {
    const next = edit(addRace)
    const added = next?.races.at(-1)
    if (added) openRace(added.id)
  }

  const swipe = (dx: number) => {
    if (!programme || raceIndex < 0) return
    const target = programme.races[raceIndex + (dx < 0 ? 1 : -1)]
    if (target) openRace(target.id, mode)
  }

  return (
    <PageShell>
      <div className="print:hidden">
        <Navbar />
      </div>
      <div className={pageContainerClass()}>
        <div className="print:hidden space-y-3">
          <div className="flex items-center justify-between gap-3">
            {race || printing ? (
              <button type="button" onClick={toOverview} className="text-brand-blue text-sm font-medium min-h-[44px]">
                ← Race night
              </button>
            ) : (
              <Link to="/admin" className="text-brand-blue text-sm font-medium min-h-[44px] inline-flex items-center">
                ← Admin
              </Link>
            )}
            <SaveBadge status={status} onRetry={() => void flush()} />
          </div>

          {!race && !printing && <h1 className="font-display text-2xl text-brand-navy">Race night</h1>}

          {status === 'conflict' && (
            <div className="glass-card border border-red-300 bg-red-50 p-4 space-y-2">
              <p className="text-sm font-semibold text-red-900">Someone else has saved changes to this programme</p>
              <p className="text-xs text-red-800">
                Your latest edits haven't been saved. Reload to see the newest version, then redo any changes.
              </p>
              <button type="button" onClick={() => void reload()} className="btn-primary">
                Reload latest
              </button>
            </div>
          )}

          {loadError && (
            <div className="glass-card p-6 text-center space-y-3">
              <p className="text-gray-600">{loadError}</p>
              <button type="button" onClick={() => void reload()} className="btn-primary">
                Try again
              </button>
            </div>
          )}

          {!programme && !loadError && <div className="glass-card h-40 animate-pulse" />}

          {programme && printing && (
            <button type="button" onClick={() => window.print()} className="btn-primary w-full min-h-[48px]">
              Print
            </button>
          )}

          {programme && !printing && !race && (
            <Overview
              programme={programme}
              onOpenRace={openRace}
              onAddRace={createRace}
              onShowTv={() => setTvStart(0)}
              onPrint={() => setParams({ view: 'print' })}
            />
          )}

          {programme && race && (
            <div
              className="space-y-3"
              onTouchStart={(e) => {
                const t = e.touches[0]
                const onField = (e.target as HTMLElement).closest('input, textarea, [role="dialog"]')
                touchStart.current = onField ? null : { x: t.clientX, y: t.clientY }
              }}
              onTouchEnd={(e) => {
                const s = touchStart.current
                touchStart.current = null
                if (!s) return
                const t = e.changedTouches[0]
                const dx = t.clientX - s.x
                if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(t.clientY - s.y) * 2) swipe(dx)
              }}
            >
              <RaceStrip programme={programme} activeId={race.id} onSelect={(id) => openRace(id, mode)} onAdd={createRace} />
              <RaceView
                programme={programme}
                race={race}
                raceIndex={raceIndex}
                mode={mode}
                onMode={(m) => openRace(race.id, m)}
                edit={edit}
                onShowTv={() => setTvStart(raceIndex)}
                onRemoveRace={() => {
                  edit((p) => removeRace(p, race.id))
                  toOverview()
                }}
              />
            </div>
          )}
        </div>

        {programme && printing && <PrintProgramme programme={programme} />}
      </div>

      {programme && tvStart !== null && (
        <RaceNightTv programme={programme} startIndex={tvStart} onClose={() => setTvStart(null)} />
      )}
    </PageShell>
  )
}
