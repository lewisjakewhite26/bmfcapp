import { useCallback, useEffect, useState } from 'react'
import { fetchPlayerProfile } from '../lib/clubApi'
import { getErrorMessage } from '../lib/errors'
import type { PlayerProfile } from '../types'

export function usePlayerProfile(playerId?: string) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!playerId) {
      setProfile(null)
      setLoading(false)
      setNotFound(true)
      setError(null)
      return
    }

    setLoading(true)
    setNotFound(false)
    setError(null)
    try {
      const data = await fetchPlayerProfile(playerId)
      setProfile(data)
      setNotFound(!data)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load player profile'))
      setProfile(null)
      setNotFound(false)
    } finally {
      setLoading(false)
    }
  }, [playerId])

  useEffect(() => {
    reload()
  }, [reload])

  return { profile, loading, notFound, error, reload }
}
