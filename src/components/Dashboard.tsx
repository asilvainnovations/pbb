import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import { useACAPSContext } from '../contexts/ACAPSContext'
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
  realSeverityData, realRiskData, realAccessData, 
  realProtectionData, realDailyEvents, realMethodologyAssessments 
} from '../data/realData'
import type { 
  SeverityRecord, RiskRecord, AccessConstraint, 
  ProtectionRisk, DailyEvent, RiskAssessment 
} from '../types/acaps'

export function Dashboard() {
  // Note: `useMockData` is a legacy name from ACAPSContext.
  // Semantically it means "Offline Preview" — uses pre-compiled real datasets
  // from realData.ts instead of fetching from the live ACAPS API.
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
          // Offline Preview: use pre-compiled real datasets from realData.ts
          setSeverityData(realSeverityData)
          setRiskData(realRiskData)
          setAccessData(realAccessData)
          setProtectionData(realProtectionData)
          setDailyData(realDailyEvents)
          setMethodologyData(realMethodologyAssessments)
        } else {
          // Live ACAPS API fetch (requires authentication)
          const [, access, risks, daily, protection] = await Promise.all([
            getSeverityIndex(),
            getHumanitarianAccess(),
            getRiskList(),
            getDailyMonitoring(),
            getProtectionRisks(),
          ])

          // Fetch historical severity data for timeline
          const months = [
            '2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01',
            '2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01'
          ]
          const severityHistory = await Promise.all(
            months.map(m => getSeverityIndex(m).catch(() => [] as SeverityRecord[]))
          )
          const allSeverity = severityHistory.flat()

          // Fallback to real compiled data if API returns empty arrays
          setSeverityData(allSeverity.length ? allSeverity : realSeverityData)
          setRiskData(risks && risks.length ? risks : realRiskData)
          setAccessData(access && access.length ? access : realAccessData)
          setProtectionData(protection && protection.length ? protection : realProtectionData)
          setDailyData(daily && daily.length ? daily : realDailyEvents)

          // Use pre-compiled methodology assessments from realData.ts
          // The ACAPS API does not return methodology data, so we use the curated dataset
          setMethodologyData(realMethodologyAssessments)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [useMockData, getSeverityIndex, getHumanitarianAccess, getRiskList, getDailyMonitoring, getProtectionRisks, setError])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingSpinner />
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="dashboard-card border-red-500/50">
            <p className="text-red-400 font-medium">Error: {error}</p>
            <p className="text-slate-500 text-sm mt-2">
              Switch to Offline Real Data mode to load compiled INFORM, ACLED, World Bank, and OCHA datasets.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* INFORM Methodology Banner */}
        <div className="mb-8 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
            <span className="font-semibold text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-gold-bright" />
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
            <img src="/assets/pbb-logo-128.png" alt="" className="w-5 h-5 rounded-full" />
            <span className="text-slate-500">|</span>
            <span className="text-sm font-bold text-slate-300 font-display">INFORM</span>
          </div>
          <p className="text-xs text-slate-600">
            INFORM — BARMM Data &amp; Intelligence Dashboard • Partido Bangon Bangsamoro (PBB)
          </p>
          <p className="text-xs text-slate-700 mt-1">
            Data: INFORM Severity July 2026 (ACAPS/JRC) • INFORM Risk Index 2026 (HDX) • 
            ACLED Conflict Exposure • World Bank Poverty 2018–2023 • OCHA HRP 2024–2025 • 
            ACAPS Methodology (May 2019) • 2026
          </p>
        </footer>
      </main>
    </div>
  )
}
