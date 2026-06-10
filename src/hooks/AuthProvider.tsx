import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { isSupabaseConfigured } from '../lib/supabase'
import { rpcCompleteInvite, rpcGetSessionUser, rpcLogin } from '../lib/clubAuth'
import { isMockDataMode } from '../lib/clubApi'
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

    const profile = await rpcGetSessionUser(session.id, session.session_token)
    if (!profile) {
      saveSession(null)
      setUser(null)
      return
    }

    saveSession(profile)
    setUser(profile)
  }, [])

  useEffect(() => {
    refreshUser().finally(() => setLoading(false))
  }, [refreshUser])

  const login = async (displayName: string, passcode: string) => {
    if (isMockDataMode()) {
      throw new Error('Use dev preview login while mock data mode is active.')
    }
    if (!isSupabaseConfigured) {
      throw new Error('Can\'t sign in. Supabase isn\'t set up.')
    }

    const profile = await rpcLogin(displayName.trim(), passcode)
    saveSession(profile)
    setUser(profile)
  }

  const completeInvite = async (token: string, passcode: string) => {
    if (isMockDataMode()) {
      throw new Error('Invites need Supabase. Use dev preview for now.')
    }
    if (!isSupabaseConfigured) {
      throw new Error('Can\'t finish invite setup. Supabase isn\'t set up.')
    }

    const profile = await rpcCompleteInvite(token, passcode)
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
