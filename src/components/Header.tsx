import { useACAPSContext } from '../context/ACAPSContext'
import { Shield, LogOut, Database, Globe } from 'lucide-react'

export function Header() {
  const { useMockData, logout, setUseMockData } = useACAPSContext()

  return (
    <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-acaps-severity/20">
              <Shield className="w-5 h-5 text-acaps-severity" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">ACAPS BARMM</h1>
              <p className="text-xs text-slate-400">Conflict Intelligence Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-300 font-medium">PHL • Mindanao</span>
            </div>
            
            <button
              onClick={() => setUseMockData(!useMockData)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                useMockData
                  ? 'bg-acaps-access/10 border-acaps-access/30 text-acaps-access'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              {useMockData ? 'Mock Data' : 'Live API'}
            </button>

            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-400 hover:text-slate-300 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Exit
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
