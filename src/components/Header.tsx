import { useACAPSContext } from '../contexts/ACAPSContext'
import { LogOut, Database, Globe, ArrowLeft, Activity } from 'lucide-react'

export function Header() {
  const { useMockData, logout, setUseMockData } = useACAPSContext()

  return (
    <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <a href="/home.html" className="flex items-center gap-2 text-decoration-none hover:opacity-80 transition-opacity">
              <img src="/assets/pbb-logo-128.png" alt="" className="w-5 h-5 rounded-full" />
              <span className="text-sm font-bold text-white tracking-tight font-display">PBB</span>
            </a>
            <span className="text-slate-600 text-xs">|</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-forest/20">
                <Activity className="w-4 h-4 text-gold-bright" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white leading-tight tracking-wide font-display">INFORM</h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-label">BARMM Data &amp; Intelligence</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a 
              href="/home.html" 
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors border border-slate-700 rounded-lg hover:border-slate-600"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              PBB Portal
            </a>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-300 font-medium">PHL • Mindanao</span>
            </div>
            
            <button
              onClick={() => setUseMockData(!useMockData)}
              className={`badge-pbb flex items-center gap-2 px-3 py-1.5 border text-xs font-medium ${
                useMockData
                  ? 'badge-pbb-on border-transparent'
                  : 'badge-pbb-off border-slate-700 hover:text-slate-300'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              {useMockData ? 'Sample Data' : 'Live API'}
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
