import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react'

export interface AuthUser {
  username: string
  displayName?: string
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  clearError: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

const SESSION_KEY = 'pbb_inform_session'

// TODO: point this at your real authentication endpoint. This is a placeholder
// path — there is no backend behind it yet. Configure via VITE_AUTH_API_URL
// in your .env file once the endpoint exists.
const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || '/api/auth/login'

interface StoredSession {
  user: AuthUser
  token: string
}

function readStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as StoredSession) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Restore a previous session on load so refreshing the page doesn't sign
  // the user out. Swap this for a token-validity check against your backend
  // once one exists — right now it trusts whatever's in localStorage.
  useEffect(() => {
    const stored = readStoredSession()
    if (stored?.user) setUser(stored.user)
    setIsLoading(false)
  }, [])

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(AUTH_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        setError(
          response.status === 401
            ? 'Incorrect email or password.'
            : 'Sign-in failed. Please try again.'
        )
        return false
      }

      const data = await response.json()
      const authUser: AuthUser = { username, displayName: data.displayName }
      const session: StoredSession = { user: authUser, token: data.token }

      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
      setUser(authUser)
      return true
    } catch {
      setError('Couldn\u2019t reach the authentication server. Check your connection and try again.')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    window.localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    logout,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
