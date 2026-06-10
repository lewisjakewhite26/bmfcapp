import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  fetchAllAvailability,
  fetchAvailability,
  fetchCompletedFixtures,
  fetchDashboardSummary,
  fetchFixturesWithResults,
  fetchLeagueTable,
  fetchPlayerStats,
  fetchTrainingSessions,
  fetchUpcomingFixtures,
  saveAvailability,
} from '../lib/clubApi'
import { getErrorMessage } from '../lib/errors'
import type {
  Availability,
  AvailabilityStatus,
  DashboardSummary,
  FixtureWithResult,
  LeagueTableRow,
  PlayerStats,
  TrainingSession,
} from '../types'

export function useDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSummary(await fetchDashboardSummary())
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load dashboard'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  return { summary, loading, error, reload }
}

export function useLeagueTable() {
  const [rows, setRows] = useState<LeagueTableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await fetchLeagueTable())
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load league table'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  return { rows, loading, error, reload }
}

export function useFixtures() {
  const [upcoming, setUpcoming] = useState<FixtureWithResult[]>([])
  const [completed, setCompleted] = useState<FixtureWithResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [u, c] = await Promise.all([fetchUpcomingFixtures(), fetchCompletedFixtures()])
      setUpcoming(u)
      setCompleted(c)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load fixtures'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  return { upcoming, completed, loading, error, reload }
}

export function usePlayerStats() {
  const [stats, setStats] = useState<PlayerStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setStats(await fetchPlayerStats())
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load stats'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  return { stats, loading, error, reload }
}

export function useCalendar(playerId?: string) {
  const [items, setItems] = useState<{ fixtures: FixtureWithResult[]; training: TrainingSession[] }>({
    fixtures: [],
    training: [],
  })
  const [availability, setAvailability] = useState<Availability[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availabilitySaving, setAvailabilitySaving] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [fixtures, training, avail] = await Promise.all([
        fetchFixturesWithResults(),
        fetchTrainingSessions(),
        playerId ? fetchAvailability(playerId) : Promise.resolve([]),
      ])
      const now = Date.now()
      setItems({
        fixtures: fixtures.filter((f) => f.status !== 'completed' || new Date(f.match_date).getTime() > now - 7 * 86400000),
        training: training.filter((t) => new Date(t.session_date).getTime() > now - 86400000),
      })
      setAvailability(avail)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load calendar'))
    } finally {
      setLoading(false)
    }
  }, [playerId])

  useEffect(() => { reload() }, [reload])

  const setAvailabilityFor = async (
    target: { fixtureId?: string; trainingId?: string },
    status: AvailabilityStatus,
    message?: string | null
  ) => {
    if (!playerId) return

    setAvailabilitySaving(true)
    try {
      const row = await saveAvailability(
        playerId,
        target,
        status,
        status === 'yes' ? null : message
      )
      setAvailability((prev) => {
        const filtered = prev.filter(
          (a) =>
            !((target.fixtureId && a.fixture_id === target.fixtureId) ||
              (target.trainingId && a.training_id === target.trainingId))
        )
        return [...filtered, row]
      })
      toast.success('Availability saved')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save availability'))
    } finally {
      setAvailabilitySaving(false)
    }
  }

  return { items, availability, loading, error, reload, setAvailabilityFor, availabilitySaving }
}

export function useAdminAvailability() {
  const [rows, setRows] = useState<Availability[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await fetchAllAvailability())
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load availability'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  return { rows, loading, error, reload }
}
