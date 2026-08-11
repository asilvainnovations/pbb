export interface ACAPSConfig {
  username: string
  password: string
  baseUrl: string
}

export interface Crisis {
  id: string
  iso3: string
  country: string
  regions: string | null
  overview: string | null
  crises: string[]
  barmmRelevant?: boolean
}

export interface SeverityRecord {
  date: string
  countryIso3: string
  countryName: string
  severityScore: number
  impactScore?: number
  conditionsScore?: number
  complexityScore?: number
  reliabilityScore?: number
  queryDate?: string
}

export interface AccessConstraint {
  date: string
  countryIso3: string
  pillar: string
  indicator: string
  subindicator?: string
  score?: number
  description?: string
}

export interface RiskRecord {
  riskId: string
  countryIso3: string
  riskType: string
  riskDescription: string
  dateIdentified: string
  severity?: string
  probability?: string
  impact?: string
  barmmRelevant?: boolean
}

export interface DailyEvent {
  eventId: string
  date: string
  countryIso3: string
  eventType: string
  description: string
  location?: string
  fatalities?: number
  displaced?: number
  source?: string
  barmmRelevant?: boolean
}

export interface ProtectionRisk {
  indicator: string
  severity?: number
  score?: number
  countryIso3?: string
}

export interface ImpactComponents {
  exposure: number      // 1-5
  intensity: number     // 1-5
  vulnerability: number // 1-5
  capacity: number      // 1-5
}

export interface RiskAssessment {
  hazardId: string
  hazardName: string
  hazardCategory: string
  barmmRelevant: boolean
  impact: ImpactComponents
  compositeImpact: number
  impactLevel: string
  probabilityScore: number
  probabilityPct: number
  riskScore: number
  riskLevel: 'Low' | 'Medium' | 'High'
  indicators: string[]
  monitoringStatus: string
  lastReviewed: string
}

export interface AuthResponse {
  token: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type DatasetType = 
  | 'crises' 
  | 'severity' 
  | 'access' 
  | 'riskList' 
  | 'daily' 
  | 'protection'
