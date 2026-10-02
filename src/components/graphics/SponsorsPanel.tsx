import { useId, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import type { SquadMember } from '../../types'
import { SPONSOR_LOGO_ACCEPT, SPONSOR_NAME_MAX_LENGTH } from '../../lib/sponsorLogo'
import { resolveSponsorLogoUrl } from '../../lib/sponsorLogoUrl'
import {
  adminClearPlayerSponsorLogo,
  adminImportPlayerSponsors,
  adminSetPlayerSponsorName,
  adminUploadPlayerSponsorLogo,
  parseSponsorList,
} from '../../lib/sponsorAdmin'

interface SponsorsPanelProps {
  squad: SquadMember[]
  onChanged: () => void
}

function PlayerSponsorRow({ player, onChanged }: { player: SquadMember; onChanged: () => void }) {
  const inputId = useId()
  const fileId = useId()
  const [name, setName] = useState(player.sponsor_name ?? '')
  const [busy, setBusy] = useState(false)
  const logoUrl = resolveSponsorLogoUrl(player.sponsor_logo_url)
  const dirty = name.trim() !== (player.sponsor_name ?? '')

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true)
    try {
      await fn()
      toast.success(done)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save")
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="py-3 space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 shrink-0 rounded-xl bg-white border border-brand-blue/15 grid place-items-center overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt={`${player.sponsor_name ?? 'Sponsor'} logo`} className="max-w-[44px] max-h-[44px]" loading="lazy" />
          ) : (
            <span className="text-[10px] text-gray-400 text-center leading-tight">No logo</span>
          )}
        </div>
        <label htmlFor={inputId} className="flex-1 font-medium text-brand-navy">
          {player.display_name}
        </label>
      </div>
      <div className="flex gap-2">
        <input
          id={inputId}
          className="input-field py-2 text-sm"
          placeholder="No sponsor"
          maxLength={SPONSOR_NAME_MAX_LENGTH}
          value={name}
          disabled={busy}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="button"
          className="btn-secondary px-4 py-2 text-sm shrink-0"
          disabled={busy || !dirty}
          onClick={() => void run(() => adminSetPlayerSponsorName(player.player_id, name), 'Sponsor saved')}
        >
          Save
        </button>
      </div>
      <div className="flex gap-3 text-xs font-semibold">
        <input
          id={fileId}
          type="file"
          accept={SPONSOR_LOGO_ACCEPT}
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void run(() => adminUploadPlayerSponsorLogo(player.player_id, file), 'Logo saved')
          }}
        />
        <label htmlFor={fileId} className={`text-brand-blue cursor-pointer min-h-[32px] inline-flex items-center ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
          {logoUrl ? 'Replace logo' : 'Add logo'}
        </label>
        {logoUrl && (
          <button
            type="button"
            className="text-red-600 min-h-[32px]"
            disabled={busy}
            onClick={() => void run(() => adminClearPlayerSponsorLogo(player.player_id), 'Logo removed')}
          >
            Remove logo
          </button>
        )}
      </div>
    </li>
  )
}

export function SponsorsPanel({ squad, onChanged }: SponsorsPanelProps) {
  const listId = useId()
  const [text, setText] = useState('')
  const [importing, setImporting] = useState(false)

  const players = useMemo(() => [...squad].sort((a, b) => a.display_name.localeCompare(b.display_name)), [squad])
  const parsed = useMemo(() => parseSponsorList(text, players), [text, players])
  const matched = parsed.filter((p) => p.player)
  const unmatched = parsed.filter((p) => !p.player)

  const handleImport = async () => {
    setImporting(true)
    try {
      const count = await adminImportPlayerSponsors(
        matched.map((p) => ({ playerId: p.player!.player_id, sponsorName: p.sponsorName })),
      )
      toast.success(`${count} sponsors saved`)
      setText('')
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the sponsors")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="glass-card p-4 space-y-3">
        <div>
          <h2 className="font-display text-lg text-brand-navy">Paste a sponsor list</h2>
          <p className="text-sm text-gray-500 mt-1">
            One player per line, e.g. <span className="font-mono text-xs">Jack Marley – L Brown Installations</span>. Write
            "available" for no sponsor. Players not listed are left as they are.
          </p>
        </div>
        <label htmlFor={listId} className="sr-only">
          Sponsor list
        </label>
        <textarea
          id={listId}
          className="input-field min-h-[160px] text-sm font-mono"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'Jack Marley – L Brown Installations\nSam Marshall – David Redfern Building Services'}
        />
        {parsed.length > 0 && (
          <div className="space-y-2">
            <ul className="text-sm divide-y divide-brand-blue/10 rounded-card border border-brand-blue/15 bg-white/70">
              {parsed.map((p, i) => (
                <li key={`${p.line}-${i}`} className="px-3 py-2 flex justify-between gap-3">
                  <span className={p.player ? 'text-brand-navy font-medium' : 'text-red-600 font-medium'}>
                    {p.playerName}
                    {!p.player && ' (not in squad)'}
                  </span>
                  <span className="text-gray-600 text-right">{p.sponsorName ?? 'No sponsor'}</span>
                </li>
              ))}
            </ul>
            {unmatched.length > 0 && (
              <p className="text-xs text-red-600">
                {unmatched.length} name{unmatched.length === 1 ? '' : 's'} didn't match the squad list. Check the spelling, or
                they'll be skipped.
              </p>
            )}
            <button type="button" className="btn-primary w-full" disabled={importing || matched.length === 0} onClick={() => void handleImport()}>
              {importing ? 'Saving…' : `Save ${matched.length} sponsor${matched.length === 1 ? '' : 's'}`}
            </button>
          </div>
        )}
      </section>

      <section className="glass-card p-4 space-y-1">
        <h2 className="font-display text-lg text-brand-navy">Player sponsors</h2>
        <p className="text-sm text-gray-500">
          Players can also add their own from their profile. Logos: JPEG, PNG, WebP or GIF up to 2MB. A PNG with a clear
          background looks best.
        </p>
        <ul className="divide-y divide-brand-blue/10">
          {players.map((p) => (
            <PlayerSponsorRow key={`${p.player_id}-${p.sponsor_name ?? ''}-${p.sponsor_logo_url ?? ''}`} player={p} onChanged={onChanged} />
          ))}
        </ul>
      </section>
    </div>
  )
}
