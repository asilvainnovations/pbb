import { useState, type FormEvent } from 'react'
import { useACAPSContext } from '../contexts/ACAPSContext'
import { useAuth } from '../hooks/useAuth'
import { Eye, EyeOff, ArrowLeft, LogIn, UserPlus } from 'lucide-react'

export function LoginForm() {
  const { setConfig, setUseMockData, useMockData } = useACAPSContext()
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

      /* Store pending signup for admin review (no backend yet) */
      const signups = JSON.parse(localStorage.getItem('pbb_signup_requests') || '[]')
      signups.push({
        fullName,
        email,
        submittedAt: new Date().toISOString(),
        status: 'pending'
      })
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
        {/* PBB Brand Header */}
        <div className="text-center mb-6">
          <a
            href="/home.html"
            className="font-label inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-5 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to PBB Portal
          </a>

          <img
            src="/assets/pbb-logo-128.png"
            alt="Partido Bangon Bangsamoro seal"
            className="auth-logo-ring w-16 h-16 mx-auto mb-4 object-cover"
          />

          <h1 className="font-display text-3xl font-bold text-white mb-1 tracking-tight">INFORM</h1>
          <p className="font-label text-xs text-gold-bright uppercase tracking-widest mb-2">
            BARMM Data &amp; Intelligence Dashboard
          </p>
          <p className="font-body text-sm text-slate-400">
            Partido Bangon Bangsamoro Staff Portal
          </p>
        </div>

        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-lg font-bold text-white">
              {mode === 'login' ? 'Sign In' : 'Sign Up'}
            </h2>
            <button
              type="button"
              onClick={() => setUseMockData(!useMockData)}
              className={`badge-pbb text-xs px-3 py-1 ${useMockData ? 'badge-pbb-on' : 'badge-pbb-off'}`}
            >
              {useMockData ? 'Compiled Dataset Active' : 'Use Compiled Dataset'}
            </button>
          </div>

          {useMockData ? (
            <div className="space-y-4">
              <div className="panel-pbb-tint p-4">
                <p className="font-label text-gold-bright text-sm font-semibold mb-1">Preview Mode</p>
                <p className="font-body text-slate-400 text-xs">
                  Explore INFORM with the compiled BARMM dataset (INFORM, ACLED, World Bank &amp; OCHA) —
                  no account required.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUseMockData(true)}
                className="btn-pbb-gold w-full py-3"
              >
                Continue with Compiled Dataset
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && (
                <div className="panel-pbb-error p-3">
                  <p className="font-body text-sm text-red-300">{error}</p>
                </div>
              )}

              {signupError && (
                <div className="panel-pbb-error p-3">
                  <p className="font-body text-sm text-red-300">{signupError}</p>
                </div>
              )}

              {signupSuccess && (
                <div className="panel-pbb-tint p-3">
                  <p className="font-body text-sm text-green-300">
                    Account request submitted! You can now sign in with your email.
                  </p>
                </div>
              )}

              {mode === 'signup' && (
                <>
                  <div>
                    <label className="font-label block text-sm font-medium text-slate-300 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Juan Dela Cruz"
                      autoComplete="name"
                      className="input-pbb px-4 py-2.5 placeholder-slate-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-label block text-sm font-medium text-slate-300 mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      autoComplete="email"
                      className="input-pbb px-4 py-2.5 placeholder-slate-500"
                      required
                    />
                  </div>
                </>
              )}

              {mode === 'login' && (
                <div>
                  <label className="font-label block text-sm font-medium text-slate-300 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="username"
                    className="input-pbb px-4 py-2.5 placeholder-slate-500"
                    required
                  />
                </div>
              )}

              <div>
                <label className="font-label block text-sm font-medium text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    className="input-pbb px-4 py-2.5 pr-10 placeholder-slate-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="font-label block text-sm font-medium text-slate-300 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="input-pbb px-4 py-2.5 pr-10 placeholder-slate-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn-pbb-primary w-full py-3 flex items-center justify-center gap-2"
              >
                {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {isLoading ? 'Processing…' : (mode === 'login' ? 'Sign In' : 'Create Account')}
              </button>
            </form>
          )}

          {!useMockData && (
            <div className="mt-4 text-center">
              <p className="font-body text-sm text-slate-500">
                {mode === 'login' ? (
                  <>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('signup'); clearError(); setSignupError(null); setSignupSuccess(false); }}
                      className="text-gold-bright hover:underline font-semibold bg-transparent border-none p-0 cursor-pointer"
                    >
                      Sign Up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('login'); clearError(); setSignupError(null); setSignupSuccess(false); }}
                      className="text-gold-bright hover:underline font-semibold bg-transparent border-none p-0 cursor-pointer"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </p>
            </div>
          )}

          <p className="mt-4 font-body text-xs text-slate-500 text-center">
            Partido Bangon Bangsamoro — Babangon tungo sa Kaunlaran
          </p>
        </div>
      </div>
    </div>
  )
}
