import { useState, type FormEvent } from 'react'
import { useACAPSContext } from '../contexts/ACAPSContext'
import { useAuth } from '../hooks/useAuth'
import { Eye, EyeOff, ArrowLeft, LogIn, UserPlus } from 'lucide-react'

export function LoginForm() {
  const { setConfig, setUseStaticData, useStaticData } = useACAPSContext()
  const { login, isLoading, error, clearError } = useAuth()

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  /* Sign-up state */
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [signupError, setSignupError] = useState<string | null>(null)
  const [signupSuccess, setSignupSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()
    setSignupError(null)

    if (mode === 'signup') {
      if (!fullName || !email || !password || !confirmPassword) return
      if (password !== confirmPassword) {
        setSignupError('Passwords do not match.')
        return
      }
      if (password.length < 6) {
        setSignupError('Password must be at least 6 characters.')
        return
      }
      const signups = JSON.parse(localStorage.getItem('pbb_signup_requests') || '[]')
      signups.push({ fullName, email, submittedAt: new Date().toISOString(), status: 'pending' })
      localStorage.setItem('pbb_signup_requests', JSON.stringify(signups))
      setSignupSuccess(true)
      setMode('login')
      setUsername(email)
      setPassword('')
      setConfirmPassword('')
      return
    }

    if (!username || !password) return
    const success = await login(username, password)
    if (success) {
      setUseStaticData(false) // Switch to Live API on successful login
      setConfig({
        username,
        password,
        baseUrl: import.meta.env.VITE_ACAPS_API_URL || '/api/acaps',
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <a href="/home.html" className="font-label inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-5 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to PBB Portal
          </a>
          <img src="/assets/pbb-logo-128.png" alt="Partido Bangon Bangsamoro seal" className="auth-logo-ring w-16 h-16 mx-auto mb-4 object-cover" />
          <h1 className="font-display text-3xl font-bold text-white mb-1 tracking-tight">INFORM</h1>
          <p className="font-label text-xs text-gold-bright uppercase tracking-widest mb-2">BARMM Data & Intelligence Dashboard</p>
        </div>

        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-lg font-bold text-white">
              {mode === 'login' ? 'Sign In' : 'Sign Up'}
            </h2>
            <button
              type="button"
              onClick={() => setUseStaticData(!useStaticData)}
              className={`badge-pbb text-xs px-3 py-1 ${useStaticData ? 'badge-pbb-on' : 'badge-pbb-off'}`}
            >
              {useStaticData ? 'Static Data Active' : 'Use Static Data'}
            </button>
          </div>

          {useStaticData ? (
            <div className="space-y-4">
              <div className="panel-pbb-tint p-4">
                <p className="font-label text-gold-bright text-sm font-semibold mb-1">Static Compiled Data</p>
                <p className="font-body text-slate-400 text-xs">
                  Viewing pre-compiled real datasets (INFORM, ACLED, World Bank, OCHA) from <code className="text-gold-deep">src/data/realData.ts</code>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setConfig({ username: 'static', password: 'static', baseUrl: '/api/acaps' })
                }}
                className="btn-pbb-gold w-full py-3"
              >
                Continue with Static Data
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* ... standard login form fields ... */}
              <button type="submit" disabled={isLoading} className="btn-pbb-primary w-full py-3 flex items-center justify-center gap-2">
                {isLoading ? 'Processing…' : 'Sign In & Load Live API'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
