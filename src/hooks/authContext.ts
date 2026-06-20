import { createContext, useContext } from 'react'
import type { User } from '../types'

export interface AuthContextType {
  user: User | null
  loading: boolean
  login: (displayName: string, passcode: string) => Promise<void>
  completeInvite: (token: string, firstName: string, lastName: string, passcode: string) => Promise<void>
  devBypassLogin: (asAdmin?: boolean, asPending?: boolean) => void
  logout: () => void | Promise<void>
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)

export const STORAGE_KEY = 'bmfc_club_session'

/** Session persists in localStorage with no client-side TTL until logout or server invalidation. */

export function loadSession(): User | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored) as User
  } catch {
    return null
  }
}

export function saveSession(user: User | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
