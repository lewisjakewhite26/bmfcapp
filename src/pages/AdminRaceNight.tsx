import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { RaceNightTv } from '../components/admin/RaceNightTv'
import { RACE_NIGHT_CONFLICT, fetchRaceNight, saveRaceNight } from '../lib/clubApi'
import { pageContainerClass } from '../lib/layout'
import {
  addRace,
  addRunner,
  clearRaceResults,
  isRunnerFilled,
  knownPeople,
  ordinal,
  placedRunners,
  programmeTotals,
  removeRace,
  removeRunner,
  runnerTitle,
  setRunnerPosition,
  updateRace,
  updateRunner,
  type Programme,
  type Race,
  type Runner,
} from '../lib/raceNight'

type Tab = 'edit' | 'results' | 'print'
type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error' | 'conflict'

const SAVE_DEBOUNCE_MS = 700
const RETRY_MS = 4000
const POSITIONS = [1, 2, 3] as const

const TAB_LABELS: Record<Tab, string> = { edit: 'Programme', results: 'Results', print: 'Print' }

export default function AdminRaceNight() {
  const [programme, setProgramme] = useState<Programme | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('edit')
  const [status, setStatus] = useState<SaveStatus>('saved')
  const [tvStart, setTvStart] = useState<number | null>(null)
  const [confirmRaceId, setConfirmRaceId] = useState<string | null>(null)

  const programmeRef = useRef<Programme | null>(null)
  const versionRef = useRef(0)
  const revisionRef = useRef(0)
  const savingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const statusRef = useRef<SaveStatus>('saved')

  const updateStatus = useCallback((next: SaveStatus) => {
    statusRef.current = next
    setStatus(next)
  }, [])

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const doc = await fetchRaceNight()
      programmeRef.current = doc.programme
      versionRef.current = doc.version
      revisionRef.current = 0
      setProgramme(doc.programme)
      updateStatus('saved')
    } catch {
      setLoadError("Couldn't load the race night programme")
    }
  }, [updateStatus])

  useEffect(() => {
    void load()
  }, [load])

  const flush = useCallback(async () => {
    if (savingRef.current || !programmeRef.current) return
    if (statusRef.current === 'conflict') return
    savingRef.current = true
    const startedAt = revisionRef.current
    updateStatus('saving')
    try {
      versionRef.current = await saveRaceNight(programmeRef.current, versionRef.current)
      updateStatus(revisionRef.current === startedAt ? 'saved' : 'dirty')
    } catch (err) {
      // Supabase errors aren't Error instances, so read .message either way.
      const message = (err as { message?: string } | null)?.message ?? ''
      updateStatus(message.includes(RACE_NIGHT_CONFLICT) ? 'conflict' : 'error')
    } finally {
      savingRef.current = false
    }
    // More edits landed while saving, or the save failed: go again shortly.
    if (statusRef.current === 'dirty') {
      timerRef.current = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS)
    } else if (statusRef.current === 'error') {
      timerRef.current = setTimeout(() => void flush(), RETRY_MS)
    }
  }, [updateStatus])

  const edit = useCallback(
    (change: (p: Programme) => Programme) => {
      const current = programmeRef.current
      if (!current) return
      const next = change(current)
      programmeRef.current = next
      revisionRef.current += 1
      setProgramme(next)
      if (statusRef.current !== 'conflict') updateStatus('dirty')
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS)
    },
    [flush, updateStatus],
  )

  // Save straight away when the tab is hidden, and warn before leaving with unsaved changes.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && statusRef.current === 'dirty') {
        if (timerRef.current) clearTimeout(timerRef.current)
        void flush()
      }
    }
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (statusRef.current === 'dirty' || statusRef.current === 'saving' || statusRef.current === 'error') {
        e.preventDefault()
      }
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('beforeunload', onBeforeUnload)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [flush])

  const totals = useMemo(() => (programme ? programmeTotals(programme) : null), [programme])
  const people = useMemo(() => (programme ? knownPeople(programme) : []), [programme])

  return (
    <PageShell>
      <div className="print:hidden">
        <Navbar />
      </div>
      <div className={pageContainerClass()}>
        <div className="print:hidden space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Link to="/admin" className="text-brand-blue text-sm font-medium">
              ← Admin
            </Link>
            <SaveBadge status={status} onRetry={() => void flush()} />
          </div>

          <div className="flex items-start justify-between gap-3">
            <h1 className="font-display text-2xl text-brand-navy">Race night</h1>
            <button
              type="button"
              disabled={!programme || programme.races.length === 0}
              onClick={() => setTvStart(0)}
              className="btn-primary shrink-0"
            >
              Show on TV
            </button>
          </div>

          {status === 'conflict' && (
            <div className="glass-card border border-red-300 bg-red-50 p-4 space-y-2">
              <p className="text-sm font-semibold text-red-900">Someone else has saved changes to this programme</p>
              <p className="text-xs text-red-800">
                Your latest edits haven't been saved. Reload to see the newest version, then redo any changes.
              </p>
              <button type="button" onClick={() => void load()} className="btn-primary">
                Reload latest
              </button>
            </div>
          )}

          {loadError && (
            <div className="glass-card p-6 text-center space-y-3">
              <p className="text-gray-600">{loadError}</p>
              <button type="button" onClick={() => void load()} className="btn-primary">
                Try again
              </button>
            </div>
          )}

          {!programme && !loadError && <div className="glass-card h-40 animate-pulse" />}

          {programme && totals && (
            <>
              <div className="grid grid-cols-4 gap-2">
                <Stat label="Races" value={totals.races} />
                <Stat label="Runners" value={totals.runners} />
                <Stat label="Horses" value={totals.horses} />
                <Stat label="Sponsors" value={totals.sponsors} />
              </div>

              <div className="flex gap-2 p-1 glass-card">
                {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`flex-1 min-h-[44px] rounded-pill text-sm font-semibold ${
                      tab === t ? 'bg-brand-blue text-white' : 'text-gray-600'
                    }`}
                  >
                    {TAB_LABELS[t]}
                  </button>
                ))}
              </div>
            </>
          )}

          {programme && tab === 'edit' && (
            <div className="space-y-4">
              <datalist id="race-night-people">
                {people.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>

              {programme.races.map((race, ri) => (
                <RaceEditor
                  key={race.id}
                  race={race}
                  index={ri}
                  confirmingRemove={confirmRaceId === race.id}
                  onAskRemove={() => setConfirmRaceId(race.id)}
                  onCancelRemove={() => setConfirmRaceId(null)}
                  onRemove={() => {
                    setConfirmRaceId(null)
                    edit((p) => removeRace(p, race.id))
                  }}
                  onSponsor={(sponsor) => edit((p) => updateRace(p, race.id, { sponsor }))}
                  onRunner={(runnerId, patch) => edit((p) => updateRunner(p, race.id, runnerId, patch))}
                  onAddRunner={() => edit((p) => addRunner(p, race.id))}
                  onRemoveRunner={(runnerId) => edit((p) => removeRunner(p, race.id, runnerId))}
                  onShowOnTv={() => setTvStart(ri)}
                />
              ))}

              <button
                type="button"
                onClick={() => edit(addRace)}
                className="w-full min-h-[48px] rounded-card border border-dashed border-brand-blue/40 text-brand-blue font-semibold"
              >
                + Add a race
              </button>
            </div>
          )}

          {programme && tab === 'results' && (
            <div className="space-y-4">
              {programme.races.length === 0 && (
                <div className="glass-card p-8 text-center text-gray-500">No races yet.</div>
              )}
              {programme.races.map((race, ri) => (
                <ResultsEditor
                  key={race.id}
                  race={race}
                  index={ri}
                  onPlace={(runnerId, position) => edit((p) => setRunnerPosition(p, race.id, runnerId, position))}
                  onClear={() => edit((p) => clearRaceResults(p, race.id))}
                />
              ))}
            </div>
          )}

          {programme && tab === 'print' && (
            <div className="space-y-3">
              <div className="glass-card p-4 flex items-center justify-between gap-3">
                <p className="text-sm text-gray-600">Preview of the printed race card.</p>
                <button type="button" onClick={() => window.print()} className="btn-primary shrink-0">
                  Print programme
                </button>
              </div>
            </div>
          )}
        </div>

        {programme && tab === 'print' && <PrintProgramme programme={programme} />}
      </div>

      {programme && tvStart !== null && (
        <RaceNightTv programme={programme} startIndex={tvStart} onClose={() => setTvStart(null)} />
      )}
    </PageShell>
  )
}

function SaveBadge({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  const map: Record<SaveStatus, { text: string; cls: string }> = {
    saved: { text: 'All changes saved', cls: 'text-emerald-700 bg-emerald-50' },
    dirty: { text: 'Saving…', cls: 'text-gray-600 bg-gray-100' },
    saving: { text: 'Saving…', cls: 'text-gray-600 bg-gray-100' },
    error: { text: "Couldn't save · retrying", cls: 'text-amber-800 bg-amber-100' },
    conflict: { text: 'Not saved', cls: 'text-red-800 bg-red-100' },
  }
  const { text, cls } = map[status]
  return (
    <span className="flex items-center gap-2" aria-live="polite">
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-pill ${cls}`}>{text}</span>
      {status === 'error' && (
        <button type="button" onClick={onRetry} className="text-xs font-semibold text-brand-blue underline">
          Retry now
        </button>
      )}
    </span>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-card py-3 text-center">
      <p className="font-display text-2xl font-bold text-brand-navy leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-gray-500 mt-1">{label}</p>
    </div>
  )
}

interface RaceEditorProps {
  race: Race
  index: number
  confirmingRemove: boolean
  onAskRemove: () => void
  onCancelRemove: () => void
  onRemove: () => void
  onSponsor: (sponsor: string) => void
  onRunner: (runnerId: string, patch: Partial<Pick<Runner, 'horse' | 'owner' | 'jockey'>>) => void
  onAddRunner: () => void
  onRemoveRunner: (runnerId: string) => void
  onShowOnTv: () => void
}

function RaceEditor({
  race,
  index,
  confirmingRemove,
  onAskRemove,
  onCancelRemove,
  onRemove,
  onSponsor,
  onRunner,
  onAddRunner,
  onRemoveRunner,
  onShowOnTv,
}: RaceEditorProps) {
  const filled = race.runners.filter(isRunnerFilled).length
  return (
    <section className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg text-brand-navy">Race {index + 1}</h2>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>
            {filled}/{race.runners.length} entered
          </span>
          <button type="button" onClick={onShowOnTv} className="text-brand-blue font-semibold min-h-[32px]">
            TV
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500" htmlFor={`sponsor-${race.id}`}>
          Race sponsor
        </label>
        <input
          id={`sponsor-${race.id}`}
          type="text"
          value={race.sponsor}
          onChange={(e) => onSponsor(e.target.value)}
          className="input-field mt-1 w-full"
          placeholder="e.g. D Dalton Building Services"
        />
      </div>

      <ul className="space-y-2">
        {race.runners.map((r) => (
          <li key={r.id} className="rounded-card border border-brand-blue/10 bg-white/60 p-2 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="shrink-0 w-8 h-8 rounded-full bg-brand-blue/10 text-brand-navy text-sm font-bold flex items-center justify-center">
                {r.number}
              </span>
              <input
                type="text"
                value={r.horse}
                onChange={(e) => onRunner(r.id, { horse: e.target.value })}
                className="input-field text-sm min-w-0 flex-1"
                placeholder="Horse name"
                aria-label={`Race ${index + 1} runner ${r.number} horse`}
                enterKeyHint="next"
              />
              <button
                type="button"
                onClick={() => onRemoveRunner(r.id)}
                className="shrink-0 min-h-[40px] min-w-[40px] text-red-500 text-sm font-semibold"
                aria-label={`Remove runner ${r.number}`}
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:pl-10">
              <input
                type="text"
                list="race-night-people"
                value={r.owner}
                onChange={(e) => onRunner(r.id, { owner: e.target.value })}
                className="input-field text-sm min-w-0 w-full"
                placeholder="Owner"
                aria-label={`Race ${index + 1} runner ${r.number} owner`}
                enterKeyHint="next"
              />
              <input
                type="text"
                list="race-night-people"
                value={r.jockey}
                onChange={(e) => onRunner(r.id, { jockey: e.target.value })}
                className="input-field text-sm min-w-0 w-full"
                placeholder="Jockey"
                aria-label={`Race ${index + 1} runner ${r.number} jockey`}
                enterKeyHint="done"
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-2 pt-1">
        <button type="button" onClick={onAddRunner} className="text-sm text-brand-blue font-semibold min-h-[44px]">
          + Add runner
        </button>
        {confirmingRemove ? (
          <span className="flex items-center gap-3 text-sm">
            <button type="button" onClick={onRemove} className="text-red-600 font-semibold min-h-[44px]">
              Yes, remove race
            </button>
            <button type="button" onClick={onCancelRemove} className="text-gray-600 min-h-[44px]">
              Cancel
            </button>
          </span>
        ) : (
          <button type="button" onClick={onAskRemove} className="text-sm text-gray-500 min-h-[44px]">
            Remove race
          </button>
        )}
      </div>
    </section>
  )
}

interface ResultsEditorProps {
  race: Race
  index: number
  onPlace: (runnerId: string, position: number) => void
  onClear: () => void
}

function ResultsEditor({ race, index, onPlace, onClear }: ResultsEditorProps) {
  const runners = race.runners.filter(isRunnerFilled)
  const placed = placedRunners(race)
  return (
    <section className="glass-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-lg text-brand-navy">Race {index + 1}</h2>
          {race.sponsor.trim() && <p className="text-xs text-gray-500">Sponsored by {race.sponsor}</p>}
        </div>
        {placed.length > 0 && (
          <button type="button" onClick={onClear} className="text-xs text-gray-500 min-h-[32px]">
            Clear result
          </button>
        )}
      </div>

      {placed.length > 0 && (
        <p className="text-sm bg-brand-gold/15 text-brand-navy rounded-card px-3 py-2">
          {placed.map((r) => `${ordinal(r.position ?? 0)} ${runnerTitle(r)}`).join(' · ')}
        </p>
      )}

      {runners.length === 0 ? (
        <p className="text-sm text-gray-500">No runners entered yet.</p>
      ) : (
        <ul className="space-y-2">
          {runners.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-navy truncate">
                  <span className="text-gray-400 mr-1.5">{r.number}</span>
                  {runnerTitle(r)}
                </p>
                {(r.horse.trim() ? r.owner.trim() : '') && (
                  <p className="text-xs text-gray-500 truncate pl-5">{r.owner}</p>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                {POSITIONS.map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => onPlace(r.id, pos)}
                    aria-pressed={r.position === pos}
                    className={`min-h-[40px] min-w-[44px] px-2 rounded-pill text-sm font-semibold border transition-colors ${
                      r.position === pos
                        ? 'bg-brand-gold text-brand-navy border-brand-gold'
                        : 'bg-white/80 text-gray-600 border-brand-blue/15'
                    }`}
                  >
                    {ordinal(pos)}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Clean race card for printing. Only this is visible when printing. */
function PrintProgramme({ programme }: { programme: Programme }) {
  const totals = programmeTotals(programme)
  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #race-night-print, #race-night-print * { visibility: visible; }
          #race-night-print { position: absolute; left: 0; top: 0; width: 100%; padding: 0; margin: 0; box-shadow: none; }
          @page { margin: 12mm; }
        }
      `}</style>
      <div id="race-night-print" className="glass-card p-5 mt-3 print:bg-white text-brand-navy">
        <header className="text-center mb-4">
          <h2 className="font-display text-3xl font-bold">{programme.title}</h2>
          <p className="text-sm text-gray-600">
            {totals.races} races · {totals.horses} horses · {totals.sponsors} sponsors
          </p>
        </header>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5 print:grid-cols-2">
          {programme.races.map((race, i) => (
            <section key={race.id} className="break-inside-avoid">
              <div className="border-b-2 border-brand-navy pb-1 mb-1">
                <h3 className="font-display text-lg font-bold">Race {i + 1}</h3>
                {race.sponsor.trim() && <p className="text-xs text-gray-600">Sponsored by {race.sponsor}</p>}
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="w-6 py-0.5 font-semibold">#</th>
                    <th className="font-semibold">Horse</th>
                    <th className="font-semibold">Owner</th>
                    <th className="font-semibold">Jockey</th>
                  </tr>
                </thead>
                <tbody>
                  {race.runners.map((r) => (
                    <tr key={r.id} className="border-t border-gray-200">
                      <td className="py-1 font-semibold">{r.number}</td>
                      <td className="py-1 pr-2">{r.horse}</td>
                      <td className="py-1 pr-2">{r.owner}</td>
                      <td className="py-1">{r.jockey}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
