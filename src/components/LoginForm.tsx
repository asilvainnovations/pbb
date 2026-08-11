import { useState } from 'react'
import { useACAPSContext } from '../context/ACAPSContext'
import { Shield, Eye, EyeOff } from 'lucide-react'

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
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-acaps-severity/20 mb-4">
            <Shield className="w-8 h-8 text-acaps-severity" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">ACAPS BARMM Dashboard</h1>
          <p className="text-slate-400 text-sm">
            Bangsamoro Autonomous Region Conflict Intelligence
          </p>
        </div>

        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Authentication</h2>
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
                  The dashboard will load with simulated BARMM data. No API credentials required.
                </p>
              </div>
              <button
                onClick={() => setUseMockData(true)}
                className="w-full py-3 bg-acaps-access hover:bg-acaps-access/90 text-white font-semibold rounded-lg transition-colors"
              >
                Enter Dashboard
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
            ACAPS Risk Analysis Methodology (May 2019) • Philippines PHL003
          </p>
        </div>
      </div>
    </div>
  )
}
