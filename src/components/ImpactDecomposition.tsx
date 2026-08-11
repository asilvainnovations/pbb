import { useMemo } from 'react'
import type { RiskAssessment } from '../types/acaps'
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine, Line, Legend
} from 'recharts'

interface Props {
  data: RiskAssessment[]
}

export function ImpactDecomposition({ data }: Props) {
  const chartData = useMemo(() => {
    return [...data]
      .filter(r => r.barmmRelevant)
      .sort((a, b) => b.compositeImpact - a.compositeImpact)
      .slice(0, 12)
      .map(r => ({
        name: r.hazardName.length > 25 ? r.hazardName.substring(0, 25) + '...' : r.hazardName,
        exposure: r.impact.exposure,
        intensity: r.impact.intensity,
        vulnerability: r.impact.vulnerability,
        capacity: -r.impact.capacity,
        composite: r.compositeImpact,
      }))
  }, [data])

  if (!data.length) return <div className="h-64 flex items-center justify-center text-slate-500">No methodology data</div>

  return (
    <div className="dashboard-card">
      <h3 className="chart-title">Impact Decomposition</h3>
      <p className="chart-desc">
        Breaks the top 12 BARMM-relevant risks' Impact score into its four ACAPS components —
        how many people are Exposed, how Intense the hazard is, how Vulnerable the affected
        population is, and how much existing Coping Capacity offsets it (shown as a negative bar).
        <span className="text-slate-400"> Impact = Exposure × Intensity × Vulnerability − Capacity.</span>
        {' '}This shows what's driving each risk's impact, not just the final composite number.
      </p>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} angle={-35} textAnchor="end" height={80} />
            <YAxis stroke="#94a3b8" fontSize={11} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              itemStyle={{ color: '#e2e8f0' }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '11px' }} />
            <ReferenceLine y={0} stroke="#cbd5e1" />
            <Bar dataKey="exposure" stackId="a" fill="#3b82f6" opacity={0.9} name="Exposure" />
            <Bar dataKey="intensity" stackId="a" fill="#ef4444" opacity={0.9} name="Intensity" />
            <Bar dataKey="vulnerability" stackId="a" fill="#f59e0b" opacity={0.9} name="Vulnerability" />
            <Bar dataKey="capacity" stackId="a" fill="#22c55e" opacity={0.9} name="Capacity (reduces)" />
            <Line type="monotone" dataKey="composite" stroke="#8B0000" strokeWidth={2.5} dot={{ r: 4 }} name="Composite" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
