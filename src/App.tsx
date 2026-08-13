import { useEffect, useState } from 'react'
import { ACAPSProvider, useACAPSContext } from './contexts/ACAPSContext'
import { AuthProvider } from './contexts/Auth'
import { LoginForm } from './components/LoginForm'
import { Dashboard } from './components/Dashboard'
import { LoadingSpinner } from './components/LoadingSpinner'

/**
 * Routing constants.
 *
 * HOME_PAGE_PATH was previously referenced on the redirect path below but
 * never declared — `tsc` failed with TS2304 and `npm run build` could not
 * complete. It is defined here as the single source of truth for "where the
 * public campaign site lives", so the dashboard and the public site can be
 * re-pointed independently of each other (see H-9 in the audit: these two
 * apps should eventually live on separate hosts).
 *
 * public/home.html is emitted to the build root as /home.html by Vite, so
 * this path is correct for both `npm run dev` and the production bundle.
 */
const HOME_PAGE_PATH = '/home.html'
const LOGIN_ROUTE = '/login'

function wantsLoginScreen(): boolean {
  if (typeof window === 'undefined') return false
  const { pathname, search } = window.location
  return pathname === LOGIN_ROUTE || new URLSearchParams(search).has('login')
}

/**
 * `?intelligence` opens the dashboard in sample-data mode without credentials.
 *
 * SECURITY NOTE: this is deliberately NOT an auth bypass. It only ever
 * unlocks `realData.ts` — a compiled, already-public reference dataset
 * (INFORM Severity, ACLED, World Bank, OCHA). Live ACAPS data still requires
 * a real token. If this flag is ever extended to reach live data, it must be
 * removed and replaced with proper authentication first.
 */
function wantsIntelligence(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).has('intelligence')
}

function AppContent() {
  const { isAuthenticated, useMockData, setUseMockData } = useACAPSContext()
  const [loginRequested] = useState(wantsLoginScreen)
  const [intelligenceRequested] = useState(wantsIntelligence)
  const [isRedirecting, setIsRedirecting] = useState(false)

  /* Intelligence mode enables the public sample dataset. See note above. */
  useEffect(() => {
    if (intelligenceRequested && !useMockData) {
      setUseMockData(true)
    }
  }, [intelligenceRequested, useMockData, setUseMockData])

  /*
   * A visitor who lands on the dashboard root without credentials and without
   * explicitly asking for the login screen is almost always looking for the
   * campaign site — send them there rather than showing a login wall.
   */
  useEffect(() => {
    if (isAuthenticated || useMockData) return
    if (loginRequested || intelligenceRequested) return
    setIsRedirecting(true)
    window.location.replace(HOME_PAGE_PATH)
  }, [isAuthenticated, useMockData, loginRequested, intelligenceRequested])

  if (!isAuthenticated && !useMockData) {
    if (!loginRequested && !intelligenceRequested) {
      /*
       * Previously returned `null`, which rendered a blank white page for the
       * whole duration of the redirect. Show the spinner instead so a slow
       * connection does not look like a broken site.
       */
      return <LoadingSpinner />
    }
    return <LoginForm />
  }

  if (isRedirecting) return <LoadingSpinner />

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

export { HOME_PAGE_PATH, LOGIN_ROUTE }
