import { useMemo } from 'react'
import type { RiskRecord } from '../types/acaps'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface Props {
  data: RiskRecord[]
}

const COLORS = ['#dc2626', '#ea580c', '#ca8a04', '#2563eb', '#9333ea', '#0891b2', '#16a34a', '#be123c']

export function RiskBreakdown({ data }: Props) {
  const chartData = useMemo(() => {
    const counts = data.reduce((acc, item) => {
      acc[item.riskType] = (acc[item.riskType] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.value - b.value)
  }, [data])

  if (!data.length) return <div className="h-64 flex items-center justify-center text-slate-500">No risk data</div>

  return (
    <div className="dashboard-card">
      <h3 className="chart-title">Risk Category Breakdown</h3>
      <p className="chart-desc">
        Counts how many tracked INFORM Risk Index indicators fall into each risk category —
        Conflict, Hazard (natural disasters), and Vulnerability (underlying socioeconomic factors) —
        for the Philippines. A longer bar means more distinct indicators are being monitored in that
        category, not necessarily a higher severity.
      </p>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} horizontal={false} />
            <XAxis type="number" stroke="#94a3b8" fontSize={11} />
            <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={100} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
