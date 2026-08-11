import { useEffect, useState } from 'react'
import { ACAPSProvider, useACAPSContext } from './contexts/ACAPSContext'
import { AuthProvider } from './contexts/Auth'
import { LoginForm } from './components/LoginForm'
import { Dashboard } from './components/Dashboard'

const HOME_PAGE_PATH = '/home.html'
const LOGIN_ROUTE = '/login'

function wantsLoginScreen(): boolean {
  if (typeof window === 'undefined') return false
  const { pathname, search } = window.location
  return pathname === LOGIN_ROUTE || new URLSearchParams(search).has('login')
}

function wantsIntelligence(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).has('intelligence')
}

function AppContent() {
  const { isAuthenticated, useMockData, setUseMockData } = useACAPSContext()
  const [loginRequested] = useState(wantsLoginScreen)
  const [intelligenceRequested] = useState(wantsIntelligence)

  /* Architecture: intelligence mode bypasses auth and enables sample data */
  useEffect(() => {
    if (intelligenceRequested && !useMockData) {
      setUseMockData(true)
    }
  }, [intelligenceRequested, useMockData, setUseMockData])

  useEffect(() => {
    if (isAuthenticated || useMockData) return
    if (!loginRequested && !intelligenceRequested) {
      window.location.replace(HOME_PAGE_PATH)
    }
  }, [isAuthenticated, useMockData, loginRequested, intelligenceRequested])

  if (!isAuthenticated && !useMockData) {
    if (!loginRequested && !intelligenceRequested) {
      return null
    }
    return <LoginForm />
  }

  return <Dashboard />
}

export default function App() {
  return (
    <AuthProvider>
      <ACAPSProvider>
        <AppContent />
      </ACAPSProvider>
    </AuthProvider>
  )
}
