import { useMemo } from 'react'
import type { DailyEvent } from '../types/acaps'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format, startOfWeek } from 'date-fns'

interface Props {
  data: DailyEvent[]
}

export function DailyEvents({ data }: Props) {
  const chartData = useMemo(() => {
    if (!data.length) return []
    
    const weekly: Record<string, { week: string; fatalities: number; displaced: number }> = {}
    
    data.forEach(event => {
      const date = new Date(event.date)
      const weekStart = startOfWeek(date, { weekStartsOn: 1 })
      const weekKey = format(weekStart, 'MMM dd')
      
      if (!weekly[weekKey]) {
        weekly[weekKey] = { week: weekKey, fatalities: 0, displaced: 0 }
      }
      weekly[weekKey].fatalities += event.fatalities || 0
      weekly[weekKey].displaced += event.displaced || 0
    })
    
    return Object.values(weekly).slice(-12)
  }, [data])

  if (!data.length) return <div className="h-64 flex items-center justify-center text-slate-500">No event data</div>

  return (
    <div className="dashboard-card">
      <h3 className="chart-title">Weekly Event Aggregation</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={11} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Legend wrapperStyle={{ color: '#94a3b8' }} />
            <Bar dataKey="fatalities" fill="#C0392B" opacity={0.85} radius={[4, 4, 0, 0]} name="Fatalities" />
            <Bar dataKey="displaced" fill="#E67E22" opacity={0.85} radius={[4, 4, 0, 0]} name="Displaced" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
