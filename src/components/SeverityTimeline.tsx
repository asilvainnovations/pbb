import { useMemo } from 'react'
import type { SeverityRecord } from '../types/acaps'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea
} from 'recharts'

interface Props {
  data: SeverityRecord[]
}

export function SeverityTimeline({ data }: Props) {
  const chartData = useMemo(() => {
    return data.map(d => ({
      date: d.queryDate || d.date,
      severity: d.severityScore,
      impact: d.impactScore,
      conditions: d.conditionsScore,
      complexity: d.complexityScore,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [data])

  if (!data.length) return <div className="h-64 flex items-center justify-center text-slate-500">No severity data</div>

  return (
    <div className="dashboard-card">
      <h3 className="chart-title">INFORM Severity Index Timeline</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis 
              dataKey="date" 
              stroke="#94a3b8" 
              fontSize={11} 
              tickFormatter={(val) => {
                const d = new Date(val)
                return `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`
              }}
            />
            <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 10]} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              itemStyle={{ color: '#e2e8f0' }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Legend wrapperStyle={{ color: '#94a3b8' }} />
            <ReferenceArea y1={7} y2={10} fill="#7f1d1d" opacity={0.1} />
            <ReferenceArea y1={5} y2={7} fill="#c2410c" opacity={0.1} />
            <ReferenceArea y1={3} y2={5} fill="#ca8a04" opacity={0.1} />
            <Line type="monotone" dataKey="severity" stroke="#C0392B" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="impact" stroke="#E67E22" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="conditions" stroke="#F1C40F" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="complexity" stroke="#8E44AD" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-3 mt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-900/50"></span>Extreme (7-10)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-700/50"></span>High (5-7)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-600/50"></span>Medium (3-5)</span>
      </div>
    </div>
  )
}
