import { useEffect, useRef, useState } from 'react'
import {
  MAX_PLACES,
  addRunner,
  clearRaceResults,
  isRunnerFilled,
  knownPeople,
  ordinal,
  placedRunners,
  raceSummary,
  removeRunner,
  runnerTitle,
  tapResult,
  updateRace,
  updateRunner,
  type PaidField,
  type Programme,
  type Race,
  type Runner,
} from '../../../lib/raceNight'
import { PaidToggle } from './PaidToggle'
import { RunnerSheet } from './RunnerSheet'

export type RaceMode = 'edit' | 'result'

interface RaceViewProps {
  programme: Programme
  race: Race
  raceIndex: number
  mode: RaceMode
  onMode: (mode: RaceMode) => void
  edit: (change: (p: Programme) => Programme) => Programme | null
  onShowTv: () => void
  onRemoveRace: () => void
}

const PAID_KEY: Record<'horse' | 'owner' | 'jockey', PaidField> = {
  horse: 'horsePaid',
  owner: 'ownerPaid',
  jockey: 'jockeyPaid',
}

const PLACE_STYLE: Record<number, string> = {
  1: 'bg-brand-gold text-brand-navy',
  2: 'bg-slate-300 text-brand-navy',
  3: 'bg-amber-600/70 text-white',
}

/** One race: racecard-style rows. Tap a runner to edit it, or switch to "Enter result". */
export function RaceView({ programme, race, raceIndex, mode, onMode, edit, onShowTv, onRemoveRace }: RaceViewProps) {
  const [sheetRunnerId, setSheetRunnerId] = useState<string | null>(null)
  const [editingSponsor, setEditingSponsor] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const tableRef = useRef<HTMLTableElement>(null)

  // Moving to another race closes any open editor.
  useEffect(() => {
    setSheetRunnerId(null)
    setEditingSponsor(false)
    setConfirmRemove(false)
  }, [race.id, mode])

  const summary = raceSummary(race)
  const sheetIndex = race.runners.findIndex((r) => r.id === sheetRunnerId)
  const sheetRunner = sheetIndex >= 0 ? race.runners[sheetIndex] : null

  const addAndOpen = () => {
    const next = edit((p) => addRunner(p, race.id))
    const added = next?.races.find((r) => r.id === race.id)?.runners.at(-1)
    // Phones open the sheet for the new runner; the desktop table just gains a row.
    if (added && window.matchMedia?.('(max-width: 767px)').matches) setSheetRunnerId(added.id)
  }

  const onTableEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const cells = Array.from(tableRef.current?.querySelectorAll<HTMLInputElement>('input[data-cell]') ?? [])
    const i = cells.indexOf(e.currentTarget)
    cells[i + 1]?.focus()
    e.preventDefault()
  }

  const people = knownPeople(programme)
  const placed = placedRunners(race)
  const resultRunners = race.runners.filter((r) => isRunnerFilled(r) || r.position !== null)

  return (
    <section className="space-y-3">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-2xl text-brand-navy">
            Race {raceIndex + 1}
            {mode === 'result' && <span className="text-gray-400"> · Result</span>}
          </h2>
          <button type="button" onClick={onShowTv} className="text-sm text-brand-blue font-semibold min-h-[44px] px-1">
            Show on TV
          </button>
        </div>

        {editingSponsor ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              autoFocus
              value={race.sponsor}
              onChange={(e) => edit((p) => updateRace(p, race.id, { sponsor: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && setEditingSponsor(false)}
              className="input-field text-sm flex-1 min-w-0"
              placeholder="Race sponsor"
              aria-label="Race sponsor"
            />
            <PaidToggle
              paid={race.sponsorPaid}
              onChange={(paid) => edit((p) => updateRace(p, race.id, { sponsorPaid: paid }))}
              label="Sponsor"
              disabled={!race.sponsor.trim()}
            />
            <button type="button" onClick={() => setEditingSponsor(false)} className="text-brand-blue font-semibold text-sm min-h-[44px] px-2">
              Done
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingSponsor(true)}
            className="flex w-full items-center justify-between gap-2 text-sm text-gray-500 min-h-[36px] text-left"
          >
            <span className="min-w-0 truncate">
              {race.sponsor.trim() ? (
                <>
                  Sponsored by <b className="text-brand-navy">{race.sponsor}</b>
                  <PaidDot paid={race.sponsorPaid} />
                </>
              ) : (
                'No sponsor yet'
              )}
            </span>
            <span className="text-brand-blue font-semibold shrink-0">{race.sponsor.trim() ? 'Edit' : 'Add'}</span>
          </button>
        )}
      </div>

      {summary.dueCount > 0 && (
        <p className={`text-xs font-semibold ${summary.unpaid === 0 ? 'text-emerald-700' : 'text-amber-800'}`}>
          {summary.unpaid === 0
            ? `All ${summary.dueCount} payments received`
            : `${summary.dueCount - summary.unpaid} of ${summary.dueCount} paid · ${summary.unpaid} to collect`}
        </p>
      )}

      <div className="flex gap-1.5 p-1 glass-card" role="group" aria-label="Mode">
        {(
          [
            ['edit', 'Edit runners'],
            ['result', 'Enter result'],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => onMode(m)}
            className={`flex-1 min-h-[44px] rounded-pill text-sm font-semibold ${
              mode === m ? 'bg-brand-blue text-white' : 'text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'edit' ? (
        <>
          {/* Phones: racecard rows, tap to edit in a sheet. */}
          <ul className="space-y-1.5 md:hidden">
            {race.runners.map((r) => (
              <RunnerRow key={r.id} runner={r} onOpen={() => setSheetRunnerId(r.id)} />
            ))}
          </ul>

          {/* Laptops and tablets: inline table, Enter moves across. */}
          <div className="hidden md:block glass-card p-3">
            <datalist id="race-night-people">
              {people.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <table ref={tableRef} className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="w-10 pb-1">#</th>
                  <th className="pb-1 pr-2">Horse <span className="font-normal">(tick = paid)</span></th>
                  <th className="pb-1 pr-2">Owner</th>
                  <th className="pb-1 pr-2">Jockey</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {race.runners.map((r) => (
                  <tr key={r.id}>
                    <td className="py-1 font-bold text-brand-navy">{r.number}</td>
                    {(['horse', 'owner', 'jockey'] as const).map((field) => (
                      <td key={field} className="py-1 pr-2">
                        <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          data-cell
                          list={field === 'horse' ? undefined : 'race-night-people'}
                          value={r[field]}
                          onChange={(e) => edit((p) => updateRunner(p, race.id, r.id, { [field]: e.target.value }))}
                          onKeyDown={onTableEnter}
                          className="input-field text-sm w-full"
                          aria-label={`Race ${raceIndex + 1} runner ${r.number} ${field}`}
                        />
                        <input
                          type="checkbox"
                          checked={r[PAID_KEY[field]]}
                          disabled={!r[field].trim()}
                          onChange={(e) => edit((p) => updateRunner(p, race.id, r.id, { [PAID_KEY[field]]: e.target.checked }))}
                          className="h-5 w-5 shrink-0 accent-emerald-600"
                          aria-label={`Race ${raceIndex + 1} runner ${r.number} ${field} paid`}
                          title="Paid"
                        />
                        </div>
                      </td>
                    ))}
                    <td className="py-1 text-right">
                      <button
                        type="button"
                        onClick={() => edit((p) => removeRunner(p, race.id, r.id))}
                        className="min-h-[40px] min-w-[40px] text-red-500 font-semibold"
                        aria-label={`Remove runner ${r.number}`}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={addAndOpen}
            className="w-full min-h-[48px] rounded-card border border-dashed border-brand-blue/40 text-brand-blue font-semibold"
          >
            + Add runner
          </button>

          <div className="text-center">
            {confirmRemove ? (
              <span className="text-sm">
                <button type="button" onClick={onRemoveRace} className="text-red-600 font-semibold min-h-[44px] px-3">
                  Yes, remove race {raceIndex + 1}
                </button>
                <button type="button" onClick={() => setConfirmRemove(false)} className="text-gray-600 min-h-[44px] px-3">
                  Cancel
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmRemove(true)} className="text-sm text-gray-500 min-h-[44px] px-3">
                Remove this race
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-card px-3 py-2">
            Tap runners in the order they finish. Tap again to take a place off.
          </p>
          {placed.length > 0 && (
            <p className="text-sm bg-brand-gold/15 text-brand-navy rounded-card px-3 py-2">
              {placed.map((r) => `${ordinal(r.position ?? 0)} ${runnerTitle(r)}`).join(' · ')}
            </p>
          )}
          {resultRunners.length === 0 ? (
            <div className="glass-card p-6 text-center text-sm text-gray-500">No runners entered yet.</div>
          ) : (
            <ul className="space-y-1.5">
              {resultRunners.map((r) => {
                const full = placed.length >= MAX_PLACES && r.position === null
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => edit((p) => tapResult(p, race.id, r.id))}
                      disabled={full}
                      aria-pressed={r.position !== null}
                      className={`w-full flex items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors ${
                        r.position !== null ? 'border-brand-gold bg-amber-50' : 'border-brand-blue/10 bg-white'
                      } ${full ? 'opacity-50' : ''}`}
                    >
                      <span
                        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold ${
                          r.position !== null ? PLACE_STYLE[r.position] ?? 'bg-slate-200' : 'border-2 border-dashed border-gray-300 text-gray-400'
                        }`}
                      >
                        {r.position !== null ? ordinal(r.position) : r.number}
                      </span>
                      <span className="min-w-0">
                        <b className="block text-[15px] text-brand-navy truncate">{runnerTitle(r)}</b>
                        {r.horse.trim() && r.owner.trim() && (
                          <span className="block text-xs text-gray-500 truncate">{r.owner}</span>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => edit((p) => clearRaceResults(p, race.id))}
              disabled={placed.length === 0}
              className="flex-1 min-h-[48px] rounded-pill border border-brand-blue/15 bg-white text-sm font-semibold text-gray-600 disabled:opacity-40"
            >
              Clear result
            </button>
            <button type="button" onClick={() => onMode('edit')} className="btn-primary flex-1 min-h-[48px]">
              Done
            </button>
          </div>
        </>
      )}

      <p className="sr-only">
        {summary.filled} of {summary.total} runners entered
      </p>

      {sheetRunner && (
        <RunnerSheet
          programme={programme}
          race={race}
          raceIndex={raceIndex}
          runner={sheetRunner}
          onChange={(patch) => edit((p) => updateRunner(p, race.id, sheetRunner.id, patch))}
          onPrev={sheetIndex > 0 ? () => setSheetRunnerId(race.runners[sheetIndex - 1].id) : null}
          isLast={sheetIndex === race.runners.length - 1}
          onNext={() => {
            if (sheetIndex < race.runners.length - 1) setSheetRunnerId(race.runners[sheetIndex + 1].id)
            else setSheetRunnerId(null)
          }}
          onRemove={() => {
            const nextId = race.runners[sheetIndex + 1]?.id ?? race.runners[sheetIndex - 1]?.id ?? null
            edit((p) => removeRunner(p, race.id, sheetRunner.id))
            setSheetRunnerId(nextId)
          }}
          onClose={() => setSheetRunnerId(null)}
        />
      )}
    </section>
  )
}

function RunnerRow({ runner, onOpen }: { runner: Runner; onOpen: () => void }) {
  const horse = runner.horse.trim()
  const owner = runner.owner.trim()
  const jockey = runner.jockey.trim()
  const filled = isRunnerFilled(runner)
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="w-full flex items-center gap-3 rounded-2xl border border-brand-blue/10 bg-white px-3 py-2 text-left min-h-[56px]"
      >
        <span className="shrink-0 w-8 h-8 rounded-full bg-brand-blue/10 text-brand-navy text-sm font-extrabold flex items-center justify-center">
          {runner.number}
        </span>
        <span className="min-w-0 flex-1">
          {horse ? (
            <b className="block text-[15px] text-brand-navy truncate">
              {horse}
              <PaidDot paid={runner.horsePaid} />
            </b>
          ) : (
            <b className="block text-[15px] text-gray-400 italic font-medium truncate">{filled ? 'Add horse name' : 'Empty · tap to add'}</b>
          )}
          {filled && (
            <span className="block text-xs text-gray-500 truncate">
              {owner ? <>Owner {owner}<PaidDot paid={runner.ownerPaid} /></> : 'No owner'}
              {' · '}
              {jockey ? <>Jockey {jockey}<PaidDot paid={runner.jockeyPaid} /></> : <em className="text-amber-700">no jockey</em>}
            </span>
          )}
        </span>
        <span className="text-gray-300 text-lg" aria-hidden>
          ›
        </span>
      </button>
    </li>
  )
}

/** Tiny status next to a name: green tick once paid, amber £ while owed. */
function PaidDot({ paid }: { paid: boolean }) {
  return (
    <span
      className={`ml-1.5 inline-block text-[11px] font-bold ${paid ? 'text-emerald-600' : 'text-amber-600'}`}
      aria-label={paid ? 'paid' : 'unpaid'}
    >
      {paid ? '✓' : '£'}
    </span>
  )
}
