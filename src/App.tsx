import { useEffect, useState } from 'react'
import { ACAPSProvider, useACAPSContext } from './contexts/ACAPSContext'
import { AuthProvider } from './contexts/Auth'
import { LoginForm } from './components/LoginForm'
import { Dashboard } from './components/Dashboard'
import { LogIn, ArrowLeft } from 'lucide-react'

function AppContent() {
  const { isAuthenticated, useStaticData, setUseStaticData } = useACAPSContext()
  const [showLogin, setShowLogin] = useState(false)

  /* Architecture: 
     - Unauthenticated users ALWAYS see the Dashboard powered by realData.ts (useStaticData = true).
     - Authenticated users can toggle to Live API (useStaticData = false). */
  useEffect(() => {
    if (!isAuthenticated && !useStaticData) {
      setUseStaticData(true)
    }
  }, [isAuthenticated, useStaticData, setUseStaticData])

  if (showLogin && !isAuthenticated) {
    return (
      <div className="relative">
        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={() => setShowLogin(false)}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white bg-slate-800/80 border border-slate-700 px-4 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </div>
        <LoginForm />
      </div>
    )
  }

  return (
    <div className="relative">
      {!isAuthenticated && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => setShowLogin(true)}
            className="btn-pbb-gold px-5 py-2.5 flex items-center gap-2 shadow-xl text-sm font-semibold"
          >
            <LogIn className="w-4 h-4" /> Sign In
          </button>
        </div>
      )}
      <Dashboard />
    </div>
  )
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
