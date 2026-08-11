import { useMemo } from 'react'
import type { RiskAssessment } from '../types/acaps'

interface Props {
  data: RiskAssessment[]
}

export function RiskMatrix({ data }: Props) {
  const barmmRisks = useMemo(() => data.filter(r => r.barmmRelevant), [data])

  const getCellColor = (impact: number, prob: number) => {
    const score = impact * prob
    if (score <= 4) return { bg: 'bg-yellow-500/20', text: 'text-yellow-500', label: 'Low' }
    if (score <= 9) return { bg: 'bg-orange-500/20', text: 'text-orange-500', label: 'Medium' }
    return { bg: 'bg-red-600/20', text: 'text-red-500', label: 'High' }
  }

  const getRiskColor = (level: string) => {
    if (level === 'High') return '#dc2626'
    if (level === 'Medium') return '#ea580c'
    return '#ca8a04'
  }

  return (
    <div className="dashboard-card">
      <h3 className="chart-title">ACAPS Risk Matrix</h3>
      <p className="chart-desc">
        Plots every BARMM-relevant risk on a 5×5 grid of Probability (how likely, left to right)
        against Impact (how severe, bottom to top). <span className="text-slate-400">Risk = Impact
        × Probability.</span> Risks landing in the upper-right (red) combine high likelihood and
        high impact and warrant the closest monitoring; lower-left (yellow) risks are lower priority.
      </p>
      
      <div className="relative">
        {/* Matrix Grid */}
        <div className="grid grid-cols-5 gap-1 mb-1">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={`prob-${i}`} className="text-center text-[10px] text-slate-500 font-medium">
              {['Negligible', 'Low', 'Medium', 'High', 'Very High'][i]}
            </div>
          ))}
        </div>
        
        <div className="flex gap-1">
          {/* Impact Labels */}
          <div className="flex flex-col gap-1 justify-around pr-2">
            {['Major', 'Significant', 'Moderate', 'Low', 'Very Low'].map((label) => (
              <div key={label} className="text-[10px] text-slate-500 font-medium w-16 text-right leading-tight">
                {label}
              </div>
            ))}
          </div>
          
          {/* Grid */}
          <div className="grid grid-cols-5 gap-1 flex-1">
            {Array.from({ length: 25 }, (_, i) => {
              const impact = 5 - Math.floor(i / 5)
              const prob = (i % 5) + 1
              const score = impact * prob
              const style = getCellColor(impact, prob)
              
              return (
                <div 
                  key={i}
                  className={`aspect-square rounded-md flex items-center justify-center ${style.bg} border border-slate-700/50 relative`}
                >
                  <span className={`text-xs font-bold ${style.text}`}>{score}</span>
                  {/* Plot risks */}
                  {barmmRisks
                    .filter(r => r.impactLevel === ['VERY_LOW', 'LOW', 'MODERATE', 'SIGNIFICANT', 'MAJOR'][impact - 1] && r.probabilityScore === prob)
                    .map((risk, idx) => (
                      <div
                        key={risk.hazardId}
                        className="absolute rounded-full border-2 border-white shadow-lg animate-pulse"
                        style={{
                          width: `${Math.min(risk.riskScore * 3 + 8, 28)}px`,
                          height: `${Math.min(risk.riskScore * 3 + 8, 28)}px`,
                          backgroundColor: getRiskColor(risk.riskLevel),
                          top: `${20 + idx * 15}%`,
                          left: `${20 + idx * 15}%`,
                          zIndex: 10,
                        }}
                        title={`${risk.hazardName} (Score: ${risk.riskScore})`}
                      />
                    ))}
                </div>
              )
            })}
          </div>
        </div>
        
        <div className="text-center text-[10px] text-slate-500 mt-2 font-medium">Probability of Hazard Occurring</div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-600/50 border border-red-500" />
          <span className="text-xs text-slate-400">High Risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-orange-500/50 border border-orange-400" />
          <span className="text-xs text-slate-400">Medium Risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-500/50 border border-yellow-400" />
          <span className="text-xs text-slate-400">Low Risk</span>
        </div>
      </div>
    </div>
  )
}
