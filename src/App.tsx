import { useEffect, useState } from 'react'
import { ACAPSProvider } from './context/ACAPSContext'
import { useACAPSContext } from './context/ACAPSContext'
import { AuthProvider } from './contexts/Auth'
import { LoginForm } from './components/LoginForm'
import { Dashboard } from './components/Dashboard'

// public/home.html is served as a static file at this path by Vite.
const HOME_PAGE_PATH = '/home.html'
const LOGIN_ROUTE = '/login'

/**
 * Someone only sees the login form if they deliberately asked for it —
 * either by visiting /login directly, or via a "?login" link (e.g. a
 * "Staff Login" link placed on public/home.html). Everyone else who lands
 * on the app without credentials belongs on the public site, not here.
 */
function wantsLoginScreen(): boolean {
  if (typeof window === 'undefined') return false
  const { pathname, search } = window.location
  return pathname === LOGIN_ROUTE || new URLSearchParams(search).has('login')
}

function AppContent() {
  const { isAuthenticated, useMockData } = useACAPSContext()
  const [loginRequested] = useState(wantsLoginScreen)

  useEffect(() => {
    // Already signed in, or intentionally running on mock data — nothing to redirect.
    if (isAuthenticated || useMockData) return

    // No credentials, and the login screen wasn't explicitly requested:
    // send the visitor to the real point of entry, the public marketing site.
    if (!loginRequested) {
      window.location.replace(HOME_PAGE_PATH)
    }
  }, [isAuthenticated, useMockData, loginRequested])

  if (!isAuthenticated && !useMockData) {
    if (!loginRequested) {
      // Redirect to home.html is in flight — render nothing so the login
      // form never flashes on screen while the browser navigates away.
      return null
    }
    return <LoginForm />
  }

  return <Dashboard />
}

export default function App() {
  return (
    <ACAPSProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ACAPSProvider>
  )
}
