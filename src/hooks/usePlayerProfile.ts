import { useCallback, useEffect, useState } from 'react'
import { fetchPlayerProfile } from '../lib/clubApi'
import { getErrorMessage } from '../lib/errors'
import type { StatsScope } from '../lib/seasonScope'
import type { PlayerProfile } from '../types'

export function usePlayerProfile(playerId?: string, scope: StatsScope = 'season') {
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
      const data = await fetchPlayerProfile(playerId, scope)
      setProfile(data)
      setNotFound(!data)
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load player profile"))
      setProfile(null)
      setNotFound(false)
    } finally {
      setLoading(false)
    }
  }, [playerId, scope])

  useEffect(() => {
    reload()
  }, [reload])

  return { profile, loading, notFound, error, reload }
}
