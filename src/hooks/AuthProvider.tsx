import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { isSupabaseConfigured } from '../lib/supabase'
import { rpcCompleteInvite, rpcGetSessionUser, rpcLogin } from '../lib/clubAuth'
import { isMockDataMode, completeMockInvite as completeMockInviteApi } from '../lib/clubApi'
import { DEV_USER, DEV_ADMIN, DEV_PENDING, isDevBypassEnabled, isDevBypassSession } from '../lib/devBypass'
import type { User } from '../types'
import { AuthContext, loadSession, saveSession } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(loadSession)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const session = loadSession()

    if (session && isDevBypassSession(session)) {
      setUser(session)
      return
    }

    if (isMockDataMode()) {
      setUser(session)
      return
    }

    if (!session?.id || !session.session_token) {
      saveSession(null)
      setUser(null)
      return
    }

    const result = await rpcGetSessionUser(session.id, session.session_token)
    if (result.status === 'invalid') {
      saveSession(null)
      setUser(null)
      return
    }
    if (result.status === 'unavailable') {
      setUser(session)
      return
    }

    saveSession(result.user)
    setUser(result.user)
  }, [])

  useEffect(() => {
    refreshUser().finally(() => setLoading(false))
  }, [refreshUser])

  const login = async (displayName: string, passcode: string) => {
    if (isMockDataMode()) {
      if (import.meta.env.VITE_E2E === 'true') {
        const { mockLoginByCredentials } = await import('../lib/mockData')
        const profile = mockLoginByCredentials(displayName, passcode)
        if (!profile) throw new Error('Wrong display name or passcode.')
        saveSession(profile)
        setUser(profile)
        return
      }
      throw new Error('Use dev preview login while mock data mode is active.')
    }
    if (!isSupabaseConfigured) {
      throw new Error('Can\'t sign in. Supabase isn\'t set up.')
    }

    const profile = await rpcLogin(displayName.trim(), passcode)
    saveSession(profile)
    setUser(profile)
  }

  const completeInvite = async (token: string, firstName: string, lastName: string, passcode: string) => {
    if (isMockDataMode()) {
      const profile = completeMockInviteApi(token, firstName, lastName, passcode)
      if (!profile) throw new Error('Invalid invite link')
      saveSession(profile)
      setUser(profile)
      return
    }
    if (!isSupabaseConfigured) {
      throw new Error('Can\'t finish invite setup. Supabase isn\'t set up.')
    }

    const profile = await rpcCompleteInvite(token, firstName, lastName, passcode)
    saveSession(profile)
    setUser(profile)
  }

  const logout = async () => {
    saveSession(null)
    setUser(null)
    navigate('/', { replace: true })
  }

  const devBypassLogin = (asAdmin = false, asPending = false) => {
    if (!isDevBypassEnabled() && !isMockDataMode()) return
    const devUser = asPending ? DEV_PENDING : asAdmin ? DEV_ADMIN : DEV_USER
    saveSession(devUser)
    setUser(devUser)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, completeInvite, devBypassLogin, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}
