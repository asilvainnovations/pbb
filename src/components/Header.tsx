import { useACAPSContext } from '../contexts/ACAPSContext'
import { LogOut, Database, Wifi } from 'lucide-react'

export function Header() {
  const { useStaticData, logout, setUseStaticData } = useACAPSContext()

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img src="/assets/pbb-logo-128.png" alt="PBB" className="w-8 h-8 rounded-full" />
            <div>
              <h1 className="font-display text-lg font-bold text-white leading-tight">INFORM</h1>
              <p className="font-label text-[10px] text-gold-bright uppercase tracking-wider">BARMM Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Data Source Toggle */}
            <button
              onClick={() => setUseStaticData(!useStaticData)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                useStaticData 
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700' 
                  : 'bg-green-900/40 text-green-400 hover:bg-green-900/60 border border-green-800/50'
              }`}
              title={useStaticData ? 'Switch to Live API Data' : 'Switch to Static Compiled Data'}
            >
              {useStaticData ? (
                <>
                  <Database className="w-3.5 h-3.5" />
                  Static Data
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  Live API
                </>
              )}
            </button>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-900/50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
