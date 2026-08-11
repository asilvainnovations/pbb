import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export interface ACAPSConfig {
  username: string
  password: string
  baseUrl: string
}

interface ACAPSState {
  config: ACAPSConfig | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  useStaticData: boolean // Renamed from useMockData
  setConfig: (config: ACAPSConfig) => void
  setUseStaticData: (useStatic: boolean) => void // Renamed
  setError: (error: string | null) => void
  setIsLoading: (loading: boolean) => void
  logout: () => void
}

const ACAPSContext = createContext<ACAPSState | null>(null)

export function ACAPSProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<ACAPSConfig | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Architecture: Default to Static Compiled Data (realData.ts)
  const [useStaticData, setUseStaticData] = useState<boolean>(true)

  const setConfig = useCallback((newConfig: ACAPSConfig) => {
    setConfigState(newConfig)
    setIsAuthenticated(true)
    setError(null)
  }, [])

  const logout = useCallback(() => {
    setConfigState(null)
    setIsAuthenticated(false)
    setError(null)
    setUseStaticData(true) // Revert to static data on logout
  }, [])

  return (
    <ACAPSContext.Provider value={{
      config,
      isAuthenticated,
      isLoading,
      error,
      useStaticData,
      setConfig,
      setUseStaticData,
      setError,
      setIsLoading,
      logout,
    }}>
      {children}
    </ACAPSContext.Provider>
  )
}

export function useACAPSContext() {
  const context = useContext(ACAPSContext)
  if (!context) throw new Error('useACAPSContext must be used within ACAPSProvider')
  return context
}
