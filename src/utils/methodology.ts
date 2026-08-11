import type { ImpactComponents, RiskAssessment } from '../types/acaps'

export enum ImpactLevel {
  VERY_LOW = 1,
  LOW = 2,
  MODERATE = 3,
  SIGNIFICANT = 4,
  MAJOR = 5,
}

export enum ProbabilityLevel {
  NEGLIGIBLE = 1,
  LOW = 2,
  MEDIUM = 3,
  HIGH = 4,
  VERY_HIGH = 5,
}

export const PROBABILITY_RANGES: Record<number, { label: string; min: number; max: number }> = {
  1: { label: 'Negligible', min: 0, max: 10 },
  2: { label: 'Low', min: 11, max: 33 },
  3: { label: 'Medium', min: 34, max: 66 },
  4: { label: 'High', min: 67, max: 90 },
  5: { label: 'Very High', min: 91, max: 100 },
}

export const RISK_MATRIX: string[][] = [
  ['Low', 'Low', 'Low', 'Low', 'Medium'],
  ['Low', 'Low', 'Low', 'Medium', 'Medium'],
  ['Low', 'Low', 'Medium', 'Medium', 'High'],
  ['Low', 'Medium', 'Medium', 'High', 'High'],
  ['Low', 'Medium', 'High', 'High', 'High'],
]

export function calculateCompositeImpact(components: ImpactComponents): number {
  const numerator = components.exposure * components.intensity * components.vulnerability
  const denominator = Math.max(components.capacity, 1)
  return Math.min(numerator / denominator, 5.0)
}

export function getImpactLevel(score: number): ImpactLevel {
  if (score < 1.5) return ImpactLevel.VERY_LOW
  if (score < 2.5) return ImpactLevel.LOW
  if (score < 3.5) return ImpactLevel.MODERATE
  if (score < 4.5) return ImpactLevel.SIGNIFICANT
  return ImpactLevel.MAJOR
}

export function probabilityToScore(pct: number): number {
  if (pct < 10) return 1
  if (pct < 34) return 2
  if (pct < 67) return 3
  if (pct <= 90) return 4
  return 5
}

export function scoreToProbabilityRange(score: number): { label: string; min: number; max: number } {
  return PROBABILITY_RANGES[score] || { label: 'Unknown', min: 0, max: 0 }
}

export function calculateRisk(impactLevel: ImpactLevel, probabilityScore: number): { score: number; level: 'Low' | 'Medium' | 'High' } {
  const score = impactLevel * probabilityScore
  if (score <= 4) return { score, level: 'Low' }
  if (score <= 9) return { score, level: 'Medium' }
  return { score, level: 'High' }
}

export function buildRiskAssessment(
  hazardId: string,
  hazardName: string,
  hazardCategory: string,
  barmmRelevant: boolean,
  impact: ImpactComponents,
  probabilityScore: number,
  indicators: string[] = []
): RiskAssessment {
  const compositeImpact = calculateCompositeImpact(impact)
  const impactLevel = getImpactLevel(compositeImpact)
  const probRange = scoreToProbabilityRange(probabilityScore)
  const risk = calculateRisk(impactLevel, probabilityScore)
  
  return {
    hazardId,
    hazardName,
    hazardCategory,
    barmmRelevant,
    impact,
    compositeImpact: Math.round(compositeImpact * 10) / 10,
    impactLevel: ImpactLevel[impactLevel],
    probabilityScore,
    probabilityPct: Math.round((probRange.min + probRange.max) / 2),
    riskScore: risk.score,
    riskLevel: risk.level,
    indicators,
    monitoringStatus: 'Active',
    lastReviewed: new Date().toISOString().split('T')[0],
  }
}

export const BARMM_KEYWORDS = [
  'mindanao', 'barmm', 'bangsamoro', 'sulu', 'basilan',
  'maguindanao', 'lanao', 'tawi-tawi', 'cotabato', 'marawi', 'moro'
]

export function isBarmmRelevant(text: string): boolean {
  const lower = text.toLowerCase()
  return BARMM_KEYWORDS.some(k => lower.includes(k))
}

export const HAZARD_CATEGORIES = [
  'Biological', 'Conflict', 'Environmental', 'Economic',
  'Geological', 'Hydrometeorological', 'Political', 'Technological'
]
