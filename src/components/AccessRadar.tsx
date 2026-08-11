import { useMemo } from 'react'
import type { AccessConstraint } from '../types/acaps'
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip
} from 'recharts'

interface Props {
  data: AccessConstraint[]
}

export function AccessRadar({ data }: Props) {
  const chartData = useMemo(() => {
    const grouped = data.reduce((acc, item) => {
      if (!acc[item.pillar]) acc[item.pillar] = { total: 0, count: 0 }
      acc[item.pillar].total += item.score || 0
      acc[item.pillar].count += 1
      return acc
    }, {} as Record<string, { total: number; count: number }>)
    
    return Object.entries(grouped).map(([pillar, { total, count }]) => ({
      pillar: pillar.length > 20 ? pillar.split(' ').slice(0, 3).join(' ') + '...' : pillar,
      fullPillar: pillar,
      score: Math.round((total / count) * 10) / 10,
    }))
  }, [data])

  if (!data.length) return <div className="h-64 flex items-center justify-center text-slate-500">No access data</div>

  return (
    <div className="dashboard-card">
      <h3 className="chart-title">Humanitarian Access Constraints</h3>
      <p className="chart-desc">
        Scores five humanitarian-access pillars for BARMM on a 0–5 scale, derived from ACLED
        conflict-exposure data (population living within 1km, 2km, and 5km of recorded conflict
        events). The further a point sits from the center, the more constrained that pillar is —
        useful for spotting which type of access (physical safety, actor reach, bureaucratic
        clearance) is the binding constraint right now.
      </p>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="pillar" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fill: '#64748b', fontSize: 10 }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              itemStyle={{ color: '#e2e8f0' }}
              formatter={(value: number) => [value, 'Score (0-5)']}
            />
            <Radar
              name="Access Score"
              dataKey="score"
              stroke="#27AE60"
              fill="#27AE60"
              fillOpacity={0.25}
              strokeWidth={2.5}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-slate-500 mt-2 text-center">0 = No constraints | 5 = Extreme constraints</p>
    </div>
  )
}
