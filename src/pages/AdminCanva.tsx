import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { listCanvaTemplates, triggerAutofillDesign, type AutofillResult, type CanvaTemplate } from '../lib/canva'
import { fetchMySponsor, fetchSquad } from '../lib/clubApi'
import { pageContainerClass } from '../lib/layout'
import type { SquadMember } from '../types'

export default function AdminCanva() {
  const [templates, setTemplates] = useState<CanvaTemplate[]>([])
  const [squad, setSquad] = useState<SquadMember[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [lastResult, setLastResult] = useState<AutofillResult | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const [templateRows, squadRows] = await Promise.all([listCanvaTemplates(), fetchSquad()])
        if (cancelled) return
        setTemplates(templateRows)
        setSquad(squadRows)
        setSelectedTemplateId(templateRows[0]?.id ?? '')
        setSelectedPlayerId(squadRows[0]?.player_id ?? '')
      } catch {
        if (!cancelled) toast.error("Couldn't load Canva templates or squad")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleGenerate = async () => {
    const player = squad.find((s) => s.player_id === selectedPlayerId)
    if (!selectedTemplateId || !player) {
      toast.error('Pick a template and a player')
      return
    }

    setGenerating(true)
    setLastResult(null)
    try {
      const sponsor = await fetchMySponsor(player.player_id)
      const result = await triggerAutofillDesign(selectedTemplateId, {
        displayName: player.display_name,
        photoUrl: player.photo_url ?? null,
        sponsorLogoUrl: sponsor.sponsor_logo_url,
        sponsorName: sponsor.sponsor_name,
      })
      setLastResult(result)
      toast.success(result.mock ? 'Mock design generated' : 'Design generation started')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't generate design")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass('max-w-lg')}>
        <Link to="/admin" className="text-brand-blue text-sm font-medium">← Admin</Link>
        <div>
          <h1 className="font-display text-2xl text-brand-navy">Canva templates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate a design from a player's name, photo and sponsor logo.
          </p>
        </div>

        {loading ? (
          <div className="glass-card h-40 animate-pulse" />
        ) : (
          <>
            <div className="glass-card p-4 space-y-3">
              <p className="text-sm font-semibold text-brand-navy">Templates</p>
              {templates.length === 0 ? (
                <p className="text-sm text-gray-500">No templates configured yet.</p>
              ) : (
                <div className="space-y-2">
                  {templates.map((t) => (
                    <label
                      key={t.id}
                      className={`flex items-start gap-3 rounded-card border p-3 cursor-pointer transition-colors ${
                        selectedTemplateId === t.id
                          ? 'border-brand-blue bg-brand-light/50'
                          : 'border-brand-blue/15'
                      }`}
                    >
                      <input
                        type="radio"
                        name="canva-template"
                        checked={selectedTemplateId === t.id}
                        onChange={() => setSelectedTemplateId(t.id)}
                        className="accent-brand-blue mt-1"
                      />
                      <span>
                        <span className="block font-medium text-brand-navy">{t.name}</span>
                        {t.description && (
                          <span className="block text-xs text-gray-500 mt-0.5">{t.description}</span>
                        )}
                        <span className="block text-[11px] text-gray-400 mt-0.5 font-mono">{t.id}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card p-4 space-y-3">
              <label htmlFor="canva-player" className="text-sm font-semibold text-brand-navy block">
                Player
              </label>
              <select
                id="canva-player"
                className="input-field w-full"
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
              >
                {squad.map((s) => (
                  <option key={s.player_id} value={s.player_id}>
                    {s.display_name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={generating || !selectedTemplateId || !selectedPlayerId}
                onClick={() => void handleGenerate()}
                className="btn-primary w-full disabled:opacity-50"
              >
                {generating ? 'Generating…' : 'Generate design'}
              </button>
            </div>

            {lastResult && (
              <div className="glass-card p-4 space-y-1">
                <p className="text-sm font-semibold text-brand-navy">
                  {lastResult.status === 'success' ? 'Done' : lastResult.status === 'failed' ? 'Failed' : 'In progress'}
                </p>
                <p className="text-xs text-gray-500 font-mono">Job: {lastResult.jobId}</p>
                {lastResult.designUrl && (
                  <a
                    href={lastResult.designUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-brand-blue font-medium block"
                  >
                    Open design →
                  </a>
                )}
                {lastResult.note && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-card px-3 py-2 mt-2">
                    {lastResult.note}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  )
}
