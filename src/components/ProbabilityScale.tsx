import { useMemo } from 'react'
import type { RiskAssessment } from '../types/acaps'

const PROB_ZONES = [
  { label: 'Negligible', range: '<10%', min: 0, max: 10, color: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
  { label: 'Low', range: '11–33%', min: 10, max: 33, color: 'bg-lime-500/20', border: 'border-lime-500/30' },
  { label: 'Medium', range: '34–66%', min: 33, max: 66, color: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  { label: 'High', range: '67–90%', min: 66, max: 90, color: 'bg-orange-500/20', border: 'border-orange-500/30' },
  { label: 'Very High', range: '>90%', min: 90, max: 100, color: 'bg-red-500/20', border: 'border-red-500/30' },
]

export function ProbabilityScale({ data }: { data: RiskAssessment[] }) {
  const barmmRisks = useMemo(() => {
    return [...data]
      .filter(r => r.barmmRelevant)
      .sort((a, b) => a.probabilityPct - b.probabilityPct)
  }, [data])

  const getRiskColor = (level: string) => {
    if (level === 'High') return 'bg-red-600'
    if (level === 'Medium') return 'bg-orange-500'
    return 'bg-yellow-500'
  }

  if (!data.length) return <div className="h-64 flex items-center justify-center text-slate-500">No data</div>

  return (
    <div className="dashboard-card">
      <h3 className="chart-title">Probability Scale (Unequal Ranges)</h3>
      <p className="text-xs text-slate-500 mb-4">Meadow & Lucey method — ACAPS 2019</p>
      
      {/* Scale background */}
      <div className="relative h-8 rounded-lg overflow-hidden flex mb-6">
        {PROB_ZONES.map((zone, i) => (
          <div
            key={i}
            className={`${zone.color} ${zone.border} border-r flex items-center justify-center text-[10px] font-bold text-slate-300`}
            style={{ width: `${zone.max - zone.min}%` }}
          >
            {zone.label}
          </div>
        ))}
      </div>

      {/* Risks */}
      <div className="space-y-2">
        {barmmRisks.map((risk, idx) => {
          const left = risk.probabilityPct
          return (
            <div key={idx} className="relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-300 truncate max-w-[200px]">{risk.hazardName}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full text-white font-medium ${getRiskColor(risk.riskLevel)}`}>
                    {risk.riskLevel}
                  </span>
                  <span className="text-xs text-slate-400 w-10 text-right">{risk.probabilityPct}%</span>
                </div>
              </div>
              <div className="relative h-2 bg-slate-700 rounded-full">
                <div 
                  className={`absolute top-0 h-full rounded-full ${getRiskColor(risk.riskLevel)} opacity-80`}
                  style={{ left: 0, width: `${left}%` }}
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-300 shadow"
                  style={{ left: `${left}%`, transform: `translate(-50%, -50%)` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
