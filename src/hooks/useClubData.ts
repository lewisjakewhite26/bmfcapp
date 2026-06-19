import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  fetchAllAvailability,
  fetchAvailability,
  fetchClubEvents,
  fetchCompletedFixtures,
  fetchDashboardSummary,
  fetchFixturesWithResults,
  fetchFundraisers,
  fetchLeagueTable,
  fetchPlayerStats,
  fetchTrainingSessions,
  fetchUpcomingFixtures,
  saveAvailability,
} from '../lib/clubApi'
import { buildCalendarItems } from '../lib/calendarItems'
import { isUpcomingScheduledFixture } from '../lib/fixtureFilters'
import { getErrorMessage } from '../lib/errors'
import type {
  Availability,
  AvailabilityStatus,
  ClubEvent,
  DashboardSummary,
  FixtureWithResult,
  Fundraiser,
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
      setError(getErrorMessage(err, "Couldn't load dashboard"))
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
      setError(getErrorMessage(err, "Couldn't load league table"))
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
      setError(getErrorMessage(err, "Couldn't load fixtures"))
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
      setError(getErrorMessage(err, "Couldn't load stats"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  return { stats, loading, error, reload }
}

export function useCalendar(playerId?: string) {
  const [items, setItems] = useState<{
    fixtures: FixtureWithResult[]
    training: TrainingSession[]
    events: ClubEvent[]
    fundraisers: Fundraiser[]
  }>({
    fixtures: [],
    training: [],
    events: [],
    fundraisers: [],
  })
  const [availability, setAvailability] = useState<Availability[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availabilitySaving, setAvailabilitySaving] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [fixtures, training, events, fundraisers, avail] = await Promise.all([
        fetchFixturesWithResults(),
        fetchTrainingSessions(),
        fetchClubEvents(),
        fetchFundraisers(),
        playerId ? fetchAvailability(playerId) : Promise.resolve([]),
      ])
      const now = Date.now()
      setItems({
        fixtures: fixtures.filter((f) => isUpcomingScheduledFixture(f)),
        training: training.filter((t) => new Date(t.session_date).getTime() > now - 86400000),
        events: events.filter((e) => new Date(e.event_date).getTime() > now - 86400000),
        fundraisers: fundraisers.filter((f) => new Date(`${f.date}T23:59:59`).getTime() > now - 86400000),
      })
      setAvailability(avail)
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load calendar"))
    } finally {
      setLoading(false)
    }
  }, [playerId])

  const calendarItems = useMemo(() => buildCalendarItems(items), [items])

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
      toast.error(getErrorMessage(err, "Couldn't save availability"))
    } finally {
      setAvailabilitySaving(false)
    }
  }

  return { items, availability, loading, error, reload, setAvailabilityFor, availabilitySaving, calendarItems }
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
      setError(getErrorMessage(err, "Couldn't load availability"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  return { rows, loading, error, reload }
}
