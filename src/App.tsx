import { ACAPSProvider } from './context/ACAPSContext'
import { useACAPSContext } from './context/ACAPSContext'
import { LoginForm } from './components/LoginForm'
import { Dashboard } from './components/Dashboard'

function AppContent() {
  const { isAuthenticated, useMockData } = useACAPSContext()
  
  if (!isAuthenticated && !useMockData) {
    return <LoginForm />
  }
  
  return <Dashboard />
}

export default function App() {
  return (
    <ACAPSProvider>
      <AppContent />
    </ACAPSProvider>
  )
}
