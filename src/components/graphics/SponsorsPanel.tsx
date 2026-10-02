import { useId, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import type { SquadMember } from '../../types'
import { SPONSOR_LOGO_ACCEPT, SPONSOR_NAME_MAX_LENGTH } from '../../lib/sponsorLogo'
import { resolveSponsorLogoUrl } from '../../lib/sponsorLogoUrl'
import {
  adminClearPlayerSponsorLogo,
  adminSetPlayerSponsorName,
  adminUploadPlayerSponsorLogo,
} from '../../lib/sponsorAdmin'
import { SHARED_LOGO_FOLDER, type SharedLogoFile } from '../../lib/sharedSponsorLogos'
import { ListSection } from './ListSection'

interface SponsorsPanelProps {
  squad: SquadMember[]
  /** Files in the Supabase sponsors folder. */
  sharedLogos: SharedLogoFile[]
  onChanged: () => void
}

type Status = 'done' | 'no-logo' | 'no-sponsor'

function statusOf(p: SquadMember): Status {
  if (!p.sponsor_name?.trim()) return 'no-sponsor'
  return p.sponsor_logo_url ? 'done' : 'no-logo'
}

const STATUS_LABEL: Record<Status, string> = {
  done: 'Ready',
  'no-logo': 'Needs logo',
  'no-sponsor': 'No sponsor',
}

const STATUS_CLASS: Record<Status, string> = {
  done: 'bg-green-50 text-green-700 border-green-200',
  'no-logo': 'bg-amber-50 text-amber-800 border-amber-200',
  'no-sponsor': 'bg-gray-50 text-gray-500 border-gray-200',
}

function PlayerSponsorRow({ player, onChanged }: { player: SquadMember; onChanged: () => void }) {
  const inputId = useId()
  const fileId = useId()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(player.sponsor_name ?? '')
  const [busy, setBusy] = useState(false)
  const logoUrl = resolveSponsorLogoUrl(player.sponsor_logo_url)
  const sharedFile = player.sponsor_logo_shared_file ?? null
  const status = statusOf(player)

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true)
    try {
      await fn()
      toast.success(done)
      setEditing(false)
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
        <div
          className="w-12 h-12 shrink-0 rounded-xl border border-brand-blue/15 grid place-items-center overflow-hidden"
          // Checkerboard so white and dark logos both show.
          style={{ background: 'repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%) 50% / 12px 12px' }}
        >
          {logoUrl ? (
            <img src={logoUrl} alt={`${player.sponsor_name ?? 'Sponsor'} logo`} className="max-w-[44px] max-h-[44px]" loading="lazy" />
          ) : (
            <span className="text-[10px] text-gray-400 text-center leading-tight">No logo</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-brand-navy truncate">{player.display_name}</p>
          <p className="text-sm text-gray-500 truncate">{player.sponsor_name?.trim() || 'No sponsor'}</p>
          {sharedFile && <p className="text-xs text-gray-400 truncate">Logo from sponsors folder: {sharedFile}</p>}
        </div>
        <span className={`shrink-0 text-[11px] font-semibold border rounded-pill px-2 py-1 ${STATUS_CLASS[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-4 text-xs font-semibold pl-[60px]">
        <button type="button" className="text-brand-blue min-h-[32px]" disabled={busy} onClick={() => setEditing((e) => !e)}>
          {editing ? 'Cancel' : player.sponsor_name ? 'Change sponsor' : 'Add sponsor'}
        </button>
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
          {sharedFile ? 'Use a different logo' : logoUrl ? 'Replace logo' : 'Add logo'}
        </label>
        {logoUrl && !sharedFile && (
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

      {editing && (
        <form
          className="flex gap-2 pl-[60px]"
          onSubmit={(e) => {
            e.preventDefault()
            void run(() => adminSetPlayerSponsorName(player.player_id, name), name.trim() ? 'Sponsor saved' : 'Sponsor removed')
          }}
        >
          <label htmlFor={inputId} className="sr-only">
            Sponsor for {player.display_name}
          </label>
          <input
            id={inputId}
            className="input-field py-2 text-sm"
            placeholder="Sponsor name (leave blank for none)"
            maxLength={SPONSOR_NAME_MAX_LENGTH}
            value={name}
            disabled={busy}
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="btn-primary px-4 py-2 min-h-[44px] text-sm shrink-0" disabled={busy}>
            Save
          </button>
        </form>
      )}
    </li>
  )
}

export function SponsorsPanel({ squad, sharedLogos, onChanged }: SponsorsPanelProps) {
  const players = useMemo(() => [...squad].sort((a, b) => a.display_name.localeCompare(b.display_name)), [squad])
  const counts = useMemo(() => {
    const c = { done: 0, 'no-logo': 0, 'no-sponsor': 0 } as Record<Status, number>
    for (const p of players) c[statusOf(p)]++
    return c
  }, [players])
  const [filter, setFilter] = useState('all')
  const unusedLogos = useMemo(() => {
    const used = new Set(players.map((p) => p.sponsor_logo_shared_file).filter(Boolean))
    const usedLight = new Set(players.map((p) => p.sponsor_logo_light_url).filter(Boolean))
    return sharedLogos.filter((f) => !used.has(f.name) && !usedLight.has(f.path))
  }, [players, sharedLogos])

  const shown = filter === 'all' ? players : players.filter((p) => statusOf(p) === filter)

  return (
    <ListSection
      title="Player sponsors"
      summary={`${counts.done} ready · ${counts['no-logo']} need a logo · ${counts['no-sponsor']} without a sponsor`}
      filters={[
        { key: 'all', label: 'All', count: players.length },
        { key: 'done', label: 'Ready', count: counts.done },
        { key: 'no-logo', label: 'Needs logo', count: counts['no-logo'] },
        { key: 'no-sponsor', label: 'No sponsor', count: counts['no-sponsor'] },
      ]}
      filter={filter}
      onFilter={setFilter}
      defaultOpen
    >
      <p className="text-xs text-gray-500">
        Shown on that player's goalscorer and MOTM posts. Players can also add their own from their profile.
      </p>
      <p className="text-xs text-gray-500">Logos: JPEG, PNG, WebP or GIF up to 2MB. A PNG with a clear background looks best.</p>
      <details className="text-xs text-gray-500">
        <summary className="cursor-pointer font-semibold text-brand-blue">Adding lots of logos at once</summary>
        <p className="mt-1">
          In Supabase, open Storage → sponsor-logos and drop the files into the <b>{SHARED_LOGO_FOLDER}</b> folder, each named
          after the sponsor (e.g. “Lines Valeting.png”). Every player with that sponsor picks it up. A logo added here on a
          player always takes priority.
        </p>
      </details>
      <ul className="divide-y divide-brand-blue/10">
        {shown.length === 0 && <li className="py-2 text-sm text-gray-500">Nobody here.</li>}
        {shown.map((p) => (
          <PlayerSponsorRow key={`${p.player_id}-${p.sponsor_name ?? ''}-${p.sponsor_logo_url ?? ''}`} player={p} onChanged={onChanged} />
        ))}
      </ul>
      {unusedLogos.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">Logos in the sponsors folder not matched to anyone</p>
          <p className="text-xs mt-1">Rename them in Supabase to the sponsor's name as shown above.</p>
          <ul className="mt-2 list-disc pl-5">
            {unusedLogos.map((f) => (
              <li key={f.name}>{f.name}</li>
            ))}
          </ul>
        </div>
      )}
    </ListSection>
  )
}
