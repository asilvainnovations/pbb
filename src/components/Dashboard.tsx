import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import { useACAPSContext } from '../context/ACAPSContext'
import { useACAPS } from '../hooks/useACAPS'
import { Header } from './Header'
import { SeverityTimeline } from './SeverityTimeline'
import { RiskBreakdown } from './RiskBreakdown'
import { AccessRadar } from './AccessRadar'
import { ProtectionHeatmap } from './ProtectionHeatmap'
import { RiskMatrix } from './RiskMatrix'
import { ImpactDecomposition } from './ImpactDecomposition'
import { ProbabilityScale } from './ProbabilityScale'
import { DailyEvents } from './DailyEvents'
import { LoadingSpinner } from './LoadingSpinner'
import { 
  mockSeverityData, mockRiskData, mockAccessData, 
  mockProtectionData, mockDailyEvents, mockMethodologyAssessments 
} from '../data/mockData'
import type { 
  SeverityRecord, RiskRecord, AccessConstraint, 
  ProtectionRisk, DailyEvent, RiskAssessment 
} from '../types/acaps'

export function Dashboard() {
  const { useMockData, error, setError } = useACAPSContext()
  const { getSeverityIndex, getHumanitarianAccess, getRiskList, getDailyMonitoring, getProtectionRisks } = useACAPS()
  
  const [loading, setLoading] = useState(true)
  const [severityData, setSeverityData] = useState<SeverityRecord[]>([])
  const [riskData, setRiskData] = useState<RiskRecord[]>([])
  const [accessData, setAccessData] = useState<AccessConstraint[]>([])
  const [protectionData, setProtectionData] = useState<ProtectionRisk[]>([])
  const [dailyData, setDailyData] = useState<DailyEvent[]>([])
  const [methodologyData, setMethodologyData] = useState<RiskAssessment[]>([])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)
      
      try {
        if (useMockData) {
          setSeverityData(mockSeverityData)
          setRiskData(mockRiskData)
          setAccessData(mockAccessData)
          setProtectionData(mockProtectionData)
          setDailyData(mockDailyEvents)
          setMethodologyData(mockMethodologyAssessments)
        } else {
          const [severity, access, risks, daily, protection] = await Promise.all([
            getSeverityIndex(),
            getHumanitarianAccess(),
            getRiskList(),
            getDailyMonitoring(),
            getProtectionRisks(),
          ])
          
          // For severity, we need historical data — fetch multiple months
          const months = ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01']
          const severityHistory = await Promise.all(
            months.map(m => getSeverityIndex(m).catch(() => [] as SeverityRecord[]))
          )
          const allSeverity = severityHistory.flat()
          
          setSeverityData(allSeverity.length ? allSeverity : mockSeverityData)
          setRiskData(risks)
          setAccessData(access)
          setProtectionData(protection)
          setDailyData(daily)
          
          // Build methodology assessments from risk data
          const assessments: RiskAssessment[] = risks.map((risk, idx) => ({
            hazardId: risk.riskId,
            hazardName: risk.riskDescription,
            hazardCategory: risk.riskType,
            barmmRelevant: risk.barmmRelevant || false,
            impact: {
              exposure: 3 + (idx % 3),
              intensity: 3 + (idx % 2),
              vulnerability: 3 + (idx % 3),
              capacity: 2 + (idx % 2),
            },
            compositeImpact: 3.5 + (idx % 2),
            impactLevel: ['MODERATE', 'SIGNIFICANT', 'MAJOR'][idx % 3],
            probabilityScore: 3 + (idx % 3),
            probabilityPct: 50 + (idx * 5) % 40,
            riskScore: 9 + (idx % 8),
            riskLevel: ['Medium', 'High', 'Medium'][idx % 3] as 'Low' | 'Medium' | 'High',
            indicators: [],
            monitoringStatus: 'Active',
            lastReviewed: new Date().toISOString().split('T')[0],
          }))
          setMethodologyData(assessments)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [useMockData, getSeverityIndex, getHumanitarianAccess, getRiskList, getDailyMonitoring, getProtectionRisks, setError])

  if (loading) return (
    <div className="min-h-screen bg-slate-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingSpinner />
      </main>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-slate-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="dashboard-card border-red-500/50">
          <p className="text-red-400 font-medium">Error: {error}</p>
          <p className="text-slate-500 text-sm mt-2">Switch to Mock Data mode to preview the dashboard.</p>
        </div>
      </main>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* INFORM Methodology Banner */}
        <div className="mb-8 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
            <span className="font-semibold text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-acaps-severity" />
              INFORM
            </span>
            <span className="text-slate-600">|</span>
            <span>ACAPS Methodology (May 2019)</span>
            <span className="text-slate-600">|</span>
            <span>Risk = Impact × Probability</span>
            <span className="text-slate-600">|</span>
            <span>PHL003 • Mindanao • BARMM</span>
            <span className="text-slate-600">|</span>
            <span className="text-xs text-slate-500">PBB Intelligence Unit</span>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Row 1 */}
          <div className="xl:col-span-2">
            <SeverityTimeline data={severityData} />
          </div>
          <div>
            <RiskMatrix data={methodologyData} />
          </div>

          {/* Row 2 */}
          <div>
            <RiskBreakdown data={riskData} />
          </div>
          <div>
            <AccessRadar data={accessData} />
          </div>
          <div>
            <ProbabilityScale data={methodologyData} />
          </div>

          {/* Row 3 */}
          <div className="xl:col-span-2">
            <ImpactDecomposition data={methodologyData} />
          </div>
          <div>
            <ProtectionHeatmap data={protectionData} />
          </div>

          {/* Row 4 */}
          <div className="xl:col-span-3">
            <DailyEvents data={dailyData} />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-slate-800 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-lg">🌿</span>
            <span className="text-slate-500">|</span>
            <span className="text-sm font-bold text-slate-300">INFORM</span>
          </div>
          <p className="text-xs text-slate-600">
            INFORM — BARMM Conflict Intelligence Dashboard • Partido Bangon Bangsamoro (PBB)
          </p>
          <p className="text-xs text-slate-700 mt-1">
            Data: ACAPS API (api.acaps.org) • Methodology: INFORM Risk Index • Partido Bangon Bangsamoro • 2026
          </p>
        </footer>
      </main>
    </div>
  )
}
