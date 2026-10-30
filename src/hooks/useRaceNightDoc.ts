import { useCallback, useEffect, useRef, useState } from 'react'
import { RACE_NIGHT_CONFLICT, fetchRaceNight, saveRaceNight } from '../lib/clubApi'
import type { Programme } from '../lib/raceNight'

export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error' | 'conflict'

const SAVE_DEBOUNCE_MS = 700
const RETRY_MS = 4000

/**
 * Loads the race night programme and autosaves every edit (debounced), with a
 * version check so two people can't silently overwrite each other.
 */
export function useRaceNightDoc() {
  const [programme, setProgramme] = useState<Programme | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [status, setStatus] = useState<SaveStatus>('saved')

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

  /** Apply a change and schedule a save. Returns the new programme. */
  const edit = useCallback(
    (change: (p: Programme) => Programme): Programme | null => {
      const current = programmeRef.current
      if (!current) return null
      const next = change(current)
      programmeRef.current = next
      revisionRef.current += 1
      setProgramme(next)
      if (statusRef.current !== 'conflict') updateStatus('dirty')
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS)
      return next
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

  return { programme, status, loadError, edit, reload: load, flush }
}
