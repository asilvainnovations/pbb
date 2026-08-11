import type { 
  SeverityRecord, RiskRecord, AccessConstraint, 
  ProtectionRisk, DailyEvent, RiskAssessment, ImpactComponents 
} from '../types/acaps'
import { buildRiskAssessment } from '../utils/methodology'

export const mockSeverityData: SeverityRecord[] = [
  { date: '2025-09-01', queryDate: '2025-09-01', countryIso3: 'PHL', countryName: 'Philippines', severityScore: 5.2, impactScore: 4.8, conditionsScore: 5.5, complexityScore: 5.0, reliabilityScore: 3.5 },
  { date: '2025-10-01', queryDate: '2025-10-01', countryIso3: 'PHL', countryName: 'Philippines', severityScore: 5.4, impactScore: 5.0, conditionsScore: 5.6, complexityScore: 5.2, reliabilityScore: 3.4 },
  { date: '2025-11-01', queryDate: '2025-11-01', countryIso3: 'PHL', countryName: 'Philippines', severityScore: 5.1, impactScore: 4.9, conditionsScore: 5.4, complexityScore: 5.1, reliabilityScore: 3.6 },
  { date: '2025-12-01', queryDate: '2025-12-01', countryIso3: 'PHL', countryName: 'Philippines', severityScore: 5.8, impactScore: 5.3, conditionsScore: 5.9, complexityScore: 5.5, reliabilityScore: 3.3 },
  { date: '2026-01-01', queryDate: '2026-01-01', countryIso3: 'PHL', countryName: 'Philippines', severityScore: 6.0, impactScore: 5.5, conditionsScore: 6.1, complexityScore: 5.7, reliabilityScore: 3.2 },
  { date: '2026-02-01', queryDate: '2026-02-01', countryIso3: 'PHL', countryName: 'Philippines', severityScore: 5.9, impactScore: 5.4, conditionsScore: 6.0, complexityScore: 5.6, reliabilityScore: 3.3 },
  { date: '2026-03-01', queryDate: '2026-03-01', countryIso3: 'PHL', countryName: 'Philippines', severityScore: 6.2, impactScore: 5.6, conditionsScore: 6.3, complexityScore: 5.8, reliabilityScore: 3.1 },
  { date: '2026-04-01', queryDate: '2026-04-01', countryIso3: 'PHL', countryName: 'Philippines', severityScore: 6.1, impactScore: 5.5, conditionsScore: 6.2, complexityScore: 5.7, reliabilityScore: 3.2 },
  { date: '2026-05-01', queryDate: '2026-05-01', countryIso3: 'PHL', countryName: 'Philippines', severityScore: 5.8, impactScore: 5.2, conditionsScore: 5.9, complexityScore: 5.4, reliabilityScore: 3.4 },
  { date: '2026-06-01', queryDate: '2026-06-01', countryIso3: 'PHL', countryName: 'Philippines', severityScore: 5.9, impactScore: 5.3, conditionsScore: 6.0, complexityScore: 5.5, reliabilityScore: 3.3 },
  { date: '2026-07-01', queryDate: '2026-07-01', countryIso3: 'PHL', countryName: 'Philippines', severityScore: 6.0, impactScore: 5.4, conditionsScore: 6.1, complexityScore: 5.6, reliabilityScore: 3.2 },
  { date: '2026-08-01', queryDate: '2026-08-01', countryIso3: 'PHL', countryName: 'Philippines', severityScore: 6.3, impactScore: 5.7, conditionsScore: 6.4, complexityScore: 5.9, reliabilityScore: 3.0 },
]

export const mockRiskData: RiskRecord[] = [
  { riskId: 'R001', countryIso3: 'PHL', riskType: 'Protracted crisis', riskDescription: 'Conflict in Mindanao', dateIdentified: '2026-01-01', barmmRelevant: true },
  { riskId: 'R002', countryIso3: 'PHL', riskType: 'Deterioration', riskDescription: 'Clan violence escalation', dateIdentified: '2026-02-01', barmmRelevant: true },
  { riskId: 'R003', countryIso3: 'PHL', riskType: 'New emerging risk', riskDescription: 'ASG resurgence', dateIdentified: '2026-03-01', barmmRelevant: true },
  { riskId: 'R004', countryIso3: 'PHL', riskType: 'Food insecurity', riskDescription: 'El Niño impact', dateIdentified: '2026-04-01', barmmRelevant: true },
  { riskId: 'R005', countryIso3: 'PHL', riskType: 'Displacement', riskDescription: 'Military operations', dateIdentified: '2026-05-01', barmmRelevant: true },
  { riskId: 'R006', countryIso3: 'PHL', riskType: 'Political', riskDescription: 'Election violence', dateIdentified: '2026-06-01', barmmRelevant: true },
  { riskId: 'R007', countryIso3: 'PHL', riskType: 'Protection risk', riskDescription: 'SGBV in IDP camps', dateIdentified: '2026-07-01', barmmRelevant: true },
  { riskId: 'R008', countryIso3: 'PHL', riskType: 'Conflict', riskDescription: 'BIFF splinter attacks', dateIdentified: '2026-08-01', barmmRelevant: true },
  { riskId: 'R009', countryIso3: 'PHL', riskType: 'Hydrometeorological', riskDescription: 'Flash floods', dateIdentified: '2026-08-01', barmmRelevant: true },
  { riskId: 'R010', countryIso3: 'PHL', riskType: 'Protracted crisis', riskDescription: 'Marawi reconstruction', dateIdentified: '2026-01-01', barmmRelevant: true },
  { riskId: 'R011', countryIso3: 'PHL', riskType: 'Conflict', riskDescription: 'Child recruitment', dateIdentified: '2026-02-01', barmmRelevant: true },
  { riskId: 'R012', countryIso3: 'PHL', riskType: 'Economic', riskDescription: 'Agricultural collapse', dateIdentified: '2026-03-01', barmmRelevant: true },
]

export const mockAccessData: AccessConstraint[] = [
  { date: '2026-08-01', countryIso3: 'PHL', pillar: 'Physical and security constraints', indicator: 'Roadblocks', score: 4.5 },
  { date: '2026-08-01', countryIso3: 'PHL', pillar: 'Access of humanitarian actors', indicator: 'Bureaucratic', score: 4.2 },
  { date: '2026-08-01', countryIso3: 'PHL', pillar: 'Access of people in need', indicator: 'Movement', score: 3.8 },
  { date: '2026-08-01', countryIso3: 'PHL', pillar: 'Legal and bureaucratic constraints', indicator: 'Permits', score: 3.2 },
  { date: '2026-08-01', countryIso3: 'PHL', pillar: 'Information and communication constraints', indicator: 'Connectivity', score: 2.9 },
]

export const mockProtectionData: ProtectionRisk[] = [
  { indicator: 'Physical violence / attacks on civilians', severity: 4.5, countryIso3: 'PHL' },
  { indicator: 'Sexual and gender-based violence (SGBV)', severity: 3.8, countryIso3: 'PHL' },
  { indicator: 'Child protection violations', severity: 4.2, countryIso3: 'PHL' },
  { indicator: 'Forced recruitment / abduction', severity: 3.5, countryIso3: 'PHL' },
  { indicator: 'Denial of access to services', severity: 4.0, countryIso3: 'PHL' },
  { indicator: 'Forced displacement', severity: 4.8, countryIso3: 'PHL' },
  { indicator: 'Landmine / ERW contamination', severity: 3.2, countryIso3: 'PHL' },
  { indicator: 'Housing, land and property rights', severity: 3.9, countryIso3: 'PHL' },
]

export const mockDailyEvents: DailyEvent[] = Array.from({ length: 45 }, (_, i) => ({
  eventId: `E${String(i + 1).padStart(3, '0')}`,
  date: `2026-06-${String((i % 30) + 1).padStart(2, '0')}`,
  countryIso3: 'PHL',
  eventType: ['Armed clash', 'IED explosion', 'Civilian targeting', 'Displacement', 'Infrastructure damage'][i % 5],
  description: `Event ${i + 1} in BARMM`,
  location: ['Maguindanao', 'Lanao del Sur', 'Sulu', 'Basilan', 'Tawi-Tawi', 'Marawi'][i % 6],
  fatalities: Math.floor(Math.random() * 8),
  displaced: Math.floor(Math.random() * 300) + 50,
  barmmRelevant: true,
}))

export const mockMethodologyAssessments: RiskAssessment[] = [
  buildRiskAssessment('H001', 'Escalation of clan/rido violence', 'Conflict', true, 
    { exposure: 4, intensity: 4, vulnerability: 4, capacity: 2 }, 4, ['Clan tensions', 'Armed group mobilization']),
  buildRiskAssessment('H002', 'MILF/BIFF splinter group attacks', 'Conflict', true,
    { exposure: 4, intensity: 4, vulnerability: 3, capacity: 3 }, 3, ['Ceasefire violations', 'Arms movement']),
  buildRiskAssessment('H003', 'Election-related violence', 'Political', true,
    { exposure: 3, intensity: 3, vulnerability: 4, capacity: 2 }, 4, ['Campaign period', 'Armed group alliances']),
  buildRiskAssessment('H004', 'ASG / Dawlah Islamiyah resurgence', 'Conflict', true,
    { exposure: 4, intensity: 4, vulnerability: 3, capacity: 2 }, 3, ['Recruitment activity', 'IED incidents']),
  buildRiskAssessment('H005', 'Food insecurity — El Niño impact', 'Environmental', true,
    { exposure: 4, intensity: 4, vulnerability: 5, capacity: 2 }, 4, ['Rainfall deficits', 'Crop failures']),
  buildRiskAssessment('H006', 'Displacement from military operations', 'Conflict', true,
    { exposure: 3, intensity: 3, vulnerability: 4, capacity: 2 }, 4, ['Aerial bombardment', 'Ground assaults']),
  buildRiskAssessment('H007', 'Dengue / measles outbreak', 'Biological', true,
    { exposure: 2, intensity: 2, vulnerability: 4, capacity: 3 }, 3, ['Rainy season', 'IDP camp density']),
  buildRiskAssessment('H008', 'Flash floods / landslides', 'Hydrometeorological', true,
    { exposure: 3, intensity: 3, vulnerability: 4, capacity: 2 }, 4, ['Monsoon onset', 'Deforestation']),
  buildRiskAssessment('H009', 'Bangsamoro governance transition delays', 'Political', true,
    { exposure: 3, intensity: 3, vulnerability: 3, capacity: 2 }, 3, ['Legislative delays', 'Inter-group disputes']),
  buildRiskAssessment('H010', 'Economic collapse — coconut / agriculture', 'Economic', true,
    { exposure: 3, intensity: 3, vulnerability: 4, capacity: 3 }, 3, ['Price collapse', 'Export restrictions']),
  buildRiskAssessment('H011', 'School closures / education disruption', 'Conflict', true,
    { exposure: 2, intensity: 2, vulnerability: 4, capacity: 2 }, 4, ['Teacher abductions', 'Infrastructure damage']),
  buildRiskAssessment('H012', 'Child recruitment by armed groups', 'Conflict', true,
    { exposure: 3, intensity: 3, vulnerability: 4, capacity: 3 }, 3, ['Poverty', 'Orphanhood']),
  buildRiskAssessment('H013', 'SGBV increase in IDP camps', 'Conflict', true,
    { exposure: 3, intensity: 3, vulnerability: 4, capacity: 2 }, 3, ['Camp overcrowding', 'Lack of lighting']),
  buildRiskAssessment('H014', 'Infrastructure damage', 'Conflict', true,
    { exposure: 2, intensity: 2, vulnerability: 3, capacity: 3 }, 3, ['IED attacks', 'Sabotage']),
  buildRiskAssessment('H015', 'Marawi reconstruction delays', 'Political', true,
    { exposure: 3, intensity: 3, vulnerability: 4, capacity: 2 }, 4, ['Funding gaps', 'Land disputes']),
  buildRiskAssessment('H016', 'IDP camp fire / WASH disease outbreak', 'Technological', true,
    { exposure: 3, intensity: 3, vulnerability: 4, capacity: 2 }, 3, ['Fire hazards', 'Water contamination']),
  buildRiskAssessment('H017', 'Tsunami / seismic event', 'Geological', true,
    { exposure: 5, intensity: 5, vulnerability: 4, capacity: 3 }, 1, ['Sulu trench activity', 'Early warning systems']),
  buildRiskAssessment('H018', 'Fishing rights dispute', 'Economic', true,
    { exposure: 2, intensity: 2, vulnerability: 3, capacity: 3 }, 3, ['Territorial disputes', 'Resource depletion']),
]
