import { useMemo } from 'react'
import type { ProtectionRisk } from '../types/acaps'

interface Props {
  data: ProtectionRisk[]
}

export function ProtectionHeatmap({ data }: Props) {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => (b.severity || 0) - (a.severity || 0))
  }, [data])

  const getColor = (score: number) => {
    if (score >= 4.5) return 'bg-red-900'
    if (score >= 4.0) return 'bg-red-800'
    if (score >= 3.5) return 'bg-red-700'
    if (score >= 3.0) return 'bg-red-600'
    return 'bg-red-500'
  }

  if (!data.length) return <div className="h-64 flex items-center justify-center text-slate-500">No protection data</div>

  return (
    <div className="dashboard-card">
      <h3 className="chart-title">Protection Risks by Indicator</h3>
      <div className="space-y-2 mt-4">
        {sortedData.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-300 font-medium truncate max-w-[200px]">
                  {item.indicator}
                </span>
                <span className="text-xs font-bold text-slate-200">
                  {item.severity?.toFixed(1) || 'N/A'}
                </span>
              </div>
              <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${getColor(item.severity || 0)}`}
                  style={{ width: `${((item.severity || 0) / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-4 text-[10px] text-slate-500 uppercase tracking-wider">
        <span>Low</span>
        <span>Medium</span>
        <span>High</span>
        <span>Critical</span>
      </div>
    </div>
  )
}
