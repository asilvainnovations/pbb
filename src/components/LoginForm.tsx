import { useState } from 'react'
import { useACAPSContext } from '../context/ACAPSContext'
import { Eye, EyeOff, Activity, ArrowLeft } from 'lucide-react'

export function LoginForm() {
  const { setConfig, setUseMockData, useMockData } = useACAPSContext()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) return
    
    setIsSubmitting(true)
    setConfig({
      username,
      password,
      baseUrl: import.meta.env.VITE_ACAPS_API_URL || '/api/acaps',
    })
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* PBB Brand Header */}
        <div className="text-center mb-6">
          <a href="home.html" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-300 transition-colors mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" />
            ← Back to PBB Portal
          </a>
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-3xl">🌿</span>
            <span className="text-slate-500 text-sm">|</span>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-acaps-severity/20 border border-acaps-severity/30">
              <Activity className="w-6 h-6 text-acaps-severity" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">INFORM</h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">BARMM Conflict Intelligence</p>
          <p className="text-sm text-slate-400">
            Partido Bangon Bangsamoro • ACAPS Humanitarian Data
          </p>
        </div>

        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">ACAPS API Authentication</h2>
            <button
              onClick={() => setUseMockData(!useMockData)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                useMockData 
                  ? 'bg-acaps-access/20 text-acaps-access' 
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {useMockData ? 'Mock Mode Active' : 'Use Mock Data'}
            </button>
          </div>

          {useMockData ? (
            <div className="space-y-4">
              <div className="p-4 bg-acaps-access/10 border border-acaps-access/20 rounded-lg">
                <p className="text-acaps-access text-sm font-medium mb-1">Demo Mode Enabled</p>
                <p className="text-slate-400 text-xs">
                  Load simulated BARMM conflict data without ACAPS credentials. 
                  Powered by ACAPS Risk Analysis Methodology (May 2019).
                </p>
              </div>
              <button
                onClick={() => setUseMockData(true)}
                className="w-full py-3 bg-acaps-access hover:bg-acaps-access/90 text-white font-semibold rounded-lg transition-colors"
              >
                Enter INFORM Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  ACAPS Email
                </label>
                <input
                  type="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-acaps-severity/50 focus:border-acaps-severity"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-acaps-severity/50 focus:border-acaps-severity pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-acaps-severity hover:bg-acaps-severity/90 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Authenticating...' : 'Connect to ACAPS API'}
              </button>
            </form>
          )}

          <p className="mt-4 text-xs text-slate-500 text-center">
            INFORM • ACAPS Risk Analysis Methodology (May 2019) • Philippines PHL003 • BARMM
          </p>
          <p className="mt-1 text-[10px] text-slate-600 text-center">
            Partido Bangon Bangsamoro (PBB) — Babangon tungo sa Kaunlaran
          </p>
        </div>
      </div>
    </div>
  )
}
