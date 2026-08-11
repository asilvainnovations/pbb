import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { ACAPSConfig, DatasetType } from '../types/acaps'

interface ACAPSState {
  config: ACAPSConfig | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  activeDataset: DatasetType
  useMockData: boolean
  setConfig: (config: ACAPSConfig) => void
  setActiveDataset: (dataset: DatasetType) => void
  setUseMockData: (useMock: boolean) => void
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
  const [activeDataset, setActiveDataset] = useState<DatasetType>('crises')
  const [useMockData, setUseMockData] = useState(import.meta.env.VITE_USE_MOCK_DATA === 'true')

  const setConfig = useCallback((newConfig: ACAPSConfig) => {
    setConfigState(newConfig)
    setIsAuthenticated(true)
    setError(null)
  }, [])

  const logout = useCallback(() => {
    setConfigState(null)
    setIsAuthenticated(false)
    setError(null)
  }, [])

  return (
    <ACAPSContext.Provider value={{
      config,
      isAuthenticated,
      isLoading,
      error,
      activeDataset,
      useMockData,
      setConfig,
      setActiveDataset,
      setUseMockData,
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
