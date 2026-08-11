import { useState, useCallback } from 'react'
import { useACAPSContext } from '../contexts/ACAPSContext'
import type { AuthResponse, PaginatedResponse, Crisis, SeverityRecord, RiskRecord, AccessConstraint, DailyEvent, ProtectionRisk } from '../types/acaps'
import { isBarmmRelevant } from '../utils/methodology'

const BASE_URL = import.meta.env.VITE_ACAPS_API_URL || '/api/acaps'
const REQUEST_DELAY = 1000

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function useACAPS() {
  const { config, setError, setIsLoading } = useACAPSContext()
  const [token, setToken] = useState<string | null>(null)

  const authenticate = useCallback(async (): Promise<string> => {
    if (!config) throw new Error('No credentials configured')
    if (token) return token

    setIsLoading(true)
    try {
      const response = await fetch(`${BASE_URL}/token-auth/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: config.username, password: config.password }),
      })
      
      if (!response.ok) throw new Error(`Authentication failed: ${response.statusText}`)
      
      const data: AuthResponse = await response.json()
      setToken(data.token)
      return data.token
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [config, token, setError, setIsLoading])

  const fetchAllPages = useCallback(async <T>(endpoint: string, params?: Record<string, string>): Promise<T[]> => {
    const authToken = await authenticate()
    const allResults: T[] = []
    let url: string | null = `${BASE_URL}${endpoint}`
    let page = 1

    while (url) {
      const queryParams = params ? new URLSearchParams(params).toString() : ''
      const fullUrl = queryParams ? `${url}?${queryParams}` : url
      
      const response = await fetch(fullUrl, {
        headers: { 
          'Authorization': `Token ${authToken}`,
          'Accept': 'application/json',
        },
      })
      
      if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`)
      
      const data: PaginatedResponse<T> = await response.json()
      allResults.push(...data.results)
      
      url = data.next || null
      page++
      
      if (url) await sleep(REQUEST_DELAY)
    }
    
    return allResults
  }, [authenticate])

  const getCrises = useCallback(async (): Promise<Crisis[]> => {
    const data = await fetchAllPages<Crisis>('/crises/', { iso3: 'PHL' })
    return data.map(c => ({
      ...c,
      barmmRelevant: isBarmmRelevant(`${c.regions || ''} ${c.overview || ''} ${c.country}`),
    }))
  }, [fetchAllPages])

  const getSeverityIndex = useCallback(async (dateStr?: string): Promise<SeverityRecord[]> => {
    const d = dateStr || new Date().toISOString().split('T')[0]
    const data = await fetchAllPages<Record<string, unknown>>(`/inform-severity-index/${d}/`)
    return data
      .filter((item: Record<string, unknown>) => {
        const iso3 = String(item.iso3 || '').toUpperCase()
        const country = String(item.country || '')
        return iso3 === 'PHL' || country.toLowerCase().includes('philippines')
      })
      .map((item: Record<string, unknown>) => ({
        date: d,
        queryDate: d,
        countryIso3: 'PHL',
        countryName: 'Philippines',
        severityScore: Number(item.severity) || 0,
        impactScore: Number(item.impact) || undefined,
        conditionsScore: Number(item.conditions) || undefined,
        complexityScore: Number(item.complexity) || undefined,
        reliabilityScore: Number(item.reliability) || undefined,
      }))
  }, [fetchAllPages])

  const getHumanitarianAccess = useCallback(async (dateStr?: string): Promise<AccessConstraint[]> => {
    const d = dateStr || new Date().toISOString().split('T')[0]
    const data = await fetchAllPages<Record<string, unknown>>(`/humanitarian-access/${d}/`)
    return data
      .filter((item: Record<string, unknown>) => {
        const iso3 = String(item.iso3 || '').toUpperCase()
        const country = String(item.country || '')
        return iso3 === 'PHL' || country.toLowerCase().includes('philippines')
      })
      .map((item: Record<string, unknown>) => ({
        date: d,
        countryIso3: 'PHL',
        pillar: String(item.pillar || ''),
        indicator: String(item.indicator || ''),
        subindicator: String(item.subindicator || ''),
        score: Number(item.score) || undefined,
        description: String(item.description || ''),
      }))
  }, [fetchAllPages])

  const getRiskList = useCallback(async (): Promise<RiskRecord[]> => {
    const data = await fetchAllPages<Record<string, unknown>>('/risk-list/')
    return data
      .filter((item: Record<string, unknown>) => {
        const iso3 = String(item.iso3 || '').toUpperCase()
        const country = String(item.country || '')
        return iso3 === 'PHL' || country.toLowerCase().includes('philippines')
      })
      .map((item: Record<string, unknown>) => ({
        riskId: String(item.id || ''),
        countryIso3: 'PHL',
        riskType: String(item.risk_type || ''),
        riskDescription: String(item.risk_description || item.description || ''),
        dateIdentified: String(item.date_identified || ''),
        severity: String(item.severity || ''),
        probability: String(item.probability || ''),
        impact: String(item.impact || ''),
        barmmRelevant: isBarmmRelevant(`${String(item.regions || '')} ${String(item.description || '')} ${String(item.country || '')}`),
      }))
  }, [fetchAllPages])

  const getDailyMonitoring = useCallback(async (): Promise<DailyEvent[]> => {
    const data = await fetchAllPages<Record<string, unknown>>('/daily-monitoring/')
    return data
      .filter((item: Record<string, unknown>) => {
        const iso3 = String(item.iso3 || '').toUpperCase()
        const country = String(item.country || '')
        return iso3 === 'PHL' || country.toLowerCase().includes('philippines')
      })
      .map((item: Record<string, unknown>) => ({
        eventId: String(item.id || ''),
        date: String(item.date || ''),
        countryIso3: 'PHL',
        eventType: String(item.event_type || ''),
        description: String(item.description || ''),
        location: String(item.location || ''),
        fatalities: Number(item.fatalities) || undefined,
        displaced: Number(item.displaced) || undefined,
        source: String(item.source || ''),
        barmmRelevant: isBarmmRelevant(`${String(item.location || '')} ${String(item.description || '')}`),
      }))
  }, [fetchAllPages])

  const getProtectionRisks = useCallback(async (): Promise<ProtectionRisk[]> => {
    const data = await fetchAllPages<Record<string, unknown>>('/protection-risks-monitor/')
    return data
      .filter((item: Record<string, unknown>) => {
        const iso3 = String(item.iso3 || '').toUpperCase()
        const country = String(item.country || '')
        return iso3 === 'PHL' || country.toLowerCase().includes('philippines')
      })
      .map((item: Record<string, unknown>) => ({
        indicator: String(item.indicator || ''),
        severity: Number(item.severity) || undefined,
        score: Number(item.score) || undefined,
        countryIso3: 'PHL',
      }))
  }, [fetchAllPages])

  return {
    authenticate,
    getCrises,
    getSeverityIndex,
    getHumanitarianAccess,
    getRiskList,
    getDailyMonitoring,
    getProtectionRisks,
  }
}
