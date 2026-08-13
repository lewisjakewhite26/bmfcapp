import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  deleteSponsorLogo,
  fetchMySponsor,
  saveSponsorName,
  uploadSponsorLogo,
} from '../../lib/clubApi'
import { SPONSOR_LOGO_ACCEPT, SPONSOR_NAME_MAX_LENGTH } from '../../lib/sponsorLogo'
import { resolveSponsorLogoUrl } from '../../lib/sponsorLogoUrl'

interface SponsorLogoCardProps {
  playerId: string
}

export function SponsorLogoCard({ playerId }: SponsorLogoCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [savedName, setSavedName] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [savingName, setSavingName] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchMySponsor(playerId)
      .then((sponsor) => {
        if (cancelled) return
        setLogoUrl(sponsor.sponsor_logo_url)
        setName(sponsor.sponsor_name ?? '')
        setSavedName(sponsor.sponsor_name)
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load sponsor details")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [playerId])

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadSponsorLogo(file)
      setLogoUrl(url)
      toast.success('Sponsor logo updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't upload logo")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemoveLogo = async () => {
    setUploading(true)
    try {
      await deleteSponsorLogo()
      setLogoUrl(null)
      toast.success('Sponsor logo removed')
    } catch {
      toast.error("Couldn't remove logo")
    } finally {
      setUploading(false)
    }
  }

  const handleSaveName = async () => {
    if (name.trim() === (savedName ?? '')) return
    setSavingName(true)
    try {
      const result = await saveSponsorName(name)
      setSavedName(result)
      setName(result ?? '')
      toast.success('Sponsor name saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save sponsor name")
    } finally {
      setSavingName(false)
    }
  }

  const resolvedLogo = resolveSponsorLogoUrl(logoUrl)
  const nameChanged = name.trim() !== (savedName ?? '')

  return (
    <section className="glass-card p-4 space-y-3">
      <div>
        <h2 className="font-display text-lg text-brand-navy">My sponsor</h2>
        <p className="text-sm text-gray-500 mt-1">
          Add a personal sponsor's name and logo — shown on your player profile.
        </p>
      </div>

      {loading ? (
        <div className="h-24 animate-pulse bg-brand-light/60 rounded-card" />
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-card border border-brand-blue/15 bg-white flex items-center justify-center overflow-hidden shrink-0">
              {resolvedLogo ? (
                <img src={resolvedLogo} alt="" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xs text-gray-400">No logo</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={inputRef}
                type="file"
                accept={SPONSOR_LOGO_ACCEPT}
                className="hidden"
                disabled={uploading}
                onChange={(e) => void handleFile(e.target.files?.[0])}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="btn-secondary text-xs disabled:opacity-50"
              >
                {uploading ? 'Saving…' : logoUrl ? 'Replace logo' : 'Upload logo'}
              </button>
              {logoUrl && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => void handleRemoveLogo()}
                  className="text-xs font-medium text-red-600 disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="sponsor-name" className="block text-xs text-gray-500 mb-1">
              Sponsor name
            </label>
            <div className="flex gap-2">
              <input
                id="sponsor-name"
                type="text"
                value={name}
                maxLength={SPONSOR_NAME_MAX_LENGTH}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bishop Middleham Motors"
                className="input-field flex-1 min-w-0"
              />
              <button
                type="button"
                disabled={savingName || !nameChanged}
                onClick={() => void handleSaveName()}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {savingName ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
