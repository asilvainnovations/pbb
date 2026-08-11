import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface AuthState {
  token: string | null
  isLoading: boolean
  error: string | null
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within <AuthProvider>')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('acaps_token')
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    try {
      const baseUrl = import.meta.env.VITE_ACAPS_API_URL || '/api/acaps'
      const response = await fetch(`${baseUrl}/token-auth/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || errData.message || `Authentication failed (${response.status})`)
      }
      const data = await response.json()
      const newToken = data.token
      if (!newToken) {
        throw new Error('No token received from ACAPS API')
      }
      localStorage.setItem('acaps_token', newToken)
      setToken(newToken)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed'
      setError(message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('acaps_token')
    setToken(null)
    setError(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, isLoading, error, login, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  )
}

// FIX: Export AuthContext so useAuth.ts can import it
export { AuthContext }
