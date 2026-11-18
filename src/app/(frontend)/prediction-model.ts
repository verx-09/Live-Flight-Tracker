export const predictionOptions = {
  airline: [
    'Air India',
    'Alaska',
    'American',
    'British Airways',
    'Delta',
    'Emirates',
    'IndiGo',
    'JetBlue',
    'Lufthansa',
    'Southwest',
    'SkyWest',
    'United',
  ],
  airport: ['ATL', 'BOM', 'BOS', 'DEL', 'DXB', 'FRA', 'JFK', 'LAX', 'LHR', 'ORD', 'SEA', 'SFO'],
  departureWindow: ['Early morning', 'Morning', 'Afternoon', 'Evening', 'Late night'],
  dayType: ['Weekday', 'Weekend', 'Public holiday'],
  season: ['Spring', 'Summer', 'Autumn', 'Winter'],
  weather: ['Clear', 'Cloudy', 'Rain', 'Snow', 'Thunderstorm', 'Fog'],
  airTraffic: ['Low', 'Moderate', 'High', 'Severe'],
  inboundAircraft: ['On time', 'Slight delay', 'Major delay'],
  maintenance: ['Cleared', 'Inspection due', 'Technical issue'],
  crewStatus: ['Ready', 'Tight connection', 'Crew shortage'],
  security: ['Normal', 'Heightened', 'Active disruption'],
  distanceBand: ['Short haul', 'Medium haul', 'Long haul', 'Ultra long haul'],
  groundStop: ['None', 'Ground delay program', 'Ground stop'],
  runwayStatus: ['Normal', 'Reduced capacity', 'Runway closure'],
  gateStatus: ['Available', 'Short wait', 'No gate available'],
  deicing: ['Not required', 'Scheduled', 'Heavy queue'],
  turnaround: ['On schedule', 'Tight turnaround', 'Behind schedule'],
  groundHandling: ['Ready', 'Minor delay', 'Major delay'],
  boarding: ['On schedule', 'Slow boarding', 'Passenger issue'],
  connectionPressure: ['Low', 'Moderate', 'High'],
  airspaceRestriction: ['None', 'Reroute', 'Closure or NOTAM'],
  laborAction: ['None', 'Staff shortage', 'Strike action'],
  airportSystems: ['Operational', 'Degraded', 'Major outage'],
  borderProcessing: ['Normal', 'Congested', 'Severely congested'],
  exceptionalHazard: ['None', 'Wildlife or drone', 'Volcanic ash', 'Emergency response'],
  curfewPressure: ['None', 'Approaching curfew', 'Curfew conflict'],
} as const

export type PredictionInput = {
  flightNumber: string
  departureDate: string
  airline: string
  origin: string
  destination: string
  departureWindow: string
  dayType: string
  season: string
  weather: string
  windSpeedKph: number
  visibilityKm: number
  precipitationMm: number
  temperatureC: number
  airportCongestion: number
  airTraffic: string
  inboundAircraft: string
  maintenance: string
  crewStatus: string
  security: string
  distanceBand: string
  groundStop: string
  runwayStatus: string
  gateStatus: string
  deicing: string
  turnaround: string
  groundHandling: string
  boarding: string
  connectionPressure: string
  airspaceRestriction: string
  laborAction: string
  airportSystems: string
  borderProcessing: string
  exceptionalHazard: string
  curfewPressure: string
}

export type PredictionResult = {
  probability: number
  expectedDelayMinutes: number
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Severe'
  topFactors: { factor: string; impact: number }[]
  modelType?: string
}

const numericLimits = {
  windSpeedKph: [0, 150],
  visibilityKm: [0, 50],
  precipitationMm: [0, 100],
  temperatureC: [-50, 60],
  airportCongestion: [0, 100],
} as const

function isAllowed(value: string, list: readonly string[]) {
  return list.includes(value)
}

export function isValidPredictionInput(input: PredictionInput) {
  const categoricalChecks = [
    isAllowed(input.airline, predictionOptions.airline),
    isAllowed(input.origin, predictionOptions.airport),
    isAllowed(input.destination, predictionOptions.airport),
    isAllowed(input.departureWindow, predictionOptions.departureWindow),
    isAllowed(input.dayType, predictionOptions.dayType),
    isAllowed(input.season, predictionOptions.season),
    isAllowed(input.weather, predictionOptions.weather),
    isAllowed(input.airTraffic, predictionOptions.airTraffic),
    isAllowed(input.inboundAircraft, predictionOptions.inboundAircraft),
    isAllowed(input.maintenance, predictionOptions.maintenance),
    isAllowed(input.crewStatus, predictionOptions.crewStatus),
    isAllowed(input.security, predictionOptions.security),
    isAllowed(input.distanceBand, predictionOptions.distanceBand),
    isAllowed(input.groundStop, predictionOptions.groundStop),
    isAllowed(input.runwayStatus, predictionOptions.runwayStatus),
    isAllowed(input.gateStatus, predictionOptions.gateStatus),
    isAllowed(input.deicing, predictionOptions.deicing),
    isAllowed(input.turnaround, predictionOptions.turnaround),
    isAllowed(input.groundHandling, predictionOptions.groundHandling),
    isAllowed(input.boarding, predictionOptions.boarding),
    isAllowed(input.connectionPressure, predictionOptions.connectionPressure),
    isAllowed(input.airspaceRestriction, predictionOptions.airspaceRestriction),
    isAllowed(input.laborAction, predictionOptions.laborAction),
    isAllowed(input.airportSystems, predictionOptions.airportSystems),
    isAllowed(input.borderProcessing, predictionOptions.borderProcessing),
    isAllowed(input.exceptionalHazard, predictionOptions.exceptionalHazard),
    isAllowed(input.curfewPressure, predictionOptions.curfewPressure),
  ]
  const numericChecks = Object.entries(numericLimits).every(([key, [minimum, maximum]]) => {
    const value = input[key as keyof typeof numericLimits]
    return Number.isFinite(value) && value >= minimum && value <= maximum
  })

  return categoricalChecks.every(Boolean) && numericChecks && input.origin !== input.destination
}

export function calculateDelayPrediction(input: PredictionInput): PredictionResult {
  const impacts: { factor: string; impact: number }[] = []
  const add = (factor: string, impact: number) => {
    if (impact !== 0) impacts.push({ factor, impact })
    return impact
  }

  const airlineImpact: Record<string, number> = {
    'Air India': 0.2,
    Alaska: -0.12,
    American: 0.05,
    'British Airways': -0.05,
    Delta: -0.18,
    Emirates: -0.14,
    IndiGo: 0.08,
    JetBlue: 0.14,
    Lufthansa: -0.12,
    Southwest: 0.09,
    SkyWest: 0.18,
    United: 0.04,
  }
  const weatherImpact: Record<string, number> = {
    Clear: -0.28,
    Cloudy: 0.08,
    Rain: 0.62,
    Snow: 1.05,
    Thunderstorm: 1.38,
    Fog: 0.82,
  }
  const trafficImpact: Record<string, number> = {
    Low: -0.25,
    Moderate: 0.12,
    High: 0.65,
    Severe: 1.08,
  }
  const inboundImpact: Record<string, number> = {
    'On time': -0.2,
    'Slight delay': 0.5,
    'Major delay': 1.25,
  }
  const maintenanceImpact: Record<string, number> = {
    Cleared: -0.12,
    'Inspection due': 0.48,
    'Technical issue': 1.35,
  }
  const crewImpact: Record<string, number> = {
    Ready: -0.1,
    'Tight connection': 0.45,
    'Crew shortage': 1.05,
  }
  const securityImpact: Record<string, number> = {
    Normal: 0,
    Heightened: 0.42,
    'Active disruption': 1.15,
  }
  const scheduleImpact: Record<string, number> = {
    'Early morning': -0.3,
    Morning: 0.08,
    Afternoon: 0.3,
    Evening: 0.52,
    'Late night': 0.2,
  }
  const seasonImpact: Record<string, number> = {
    Spring: 0,
    Summer: 0.18,
    Autumn: 0.08,
    Winter: 0.42,
  }
  const distanceImpact: Record<string, number> = {
    'Short haul': -0.08,
    'Medium haul': 0,
    'Long haul': 0.16,
    'Ultra long haul': 0.28,
  }
  const groundStopImpact: Record<string, number> = {
    None: 0,
    'Ground delay program': 0.85,
    'Ground stop': 1.65,
  }
  const runwayImpact: Record<string, number> = {
    Normal: 0,
    'Reduced capacity': 0.58,
    'Runway closure': 1.42,
  }
  const gateImpact: Record<string, number> = {
    Available: 0,
    'Short wait': 0.3,
    'No gate available': 0.9,
  }
  const deicingImpact: Record<string, number> = {
    'Not required': 0,
    Scheduled: 0.34,
    'Heavy queue': 0.88,
  }
  const turnaroundImpact: Record<string, number> = {
    'On schedule': 0,
    'Tight turnaround': 0.38,
    'Behind schedule': 0.95,
  }
  const handlingImpact: Record<string, number> = {
    Ready: 0,
    'Minor delay': 0.28,
    'Major delay': 0.82,
  }
  const boardingImpact: Record<string, number> = {
    'On schedule': 0,
    'Slow boarding': 0.25,
    'Passenger issue': 0.62,
  }
  const connectionImpact: Record<string, number> = { Low: 0, Moderate: 0.18, High: 0.52 }
  const airspaceImpact: Record<string, number> = {
    None: 0,
    Reroute: 0.55,
    'Closure or NOTAM': 1.35,
  }
  const laborImpact: Record<string, number> = {
    None: 0,
    'Staff shortage': 0.62,
    'Strike action': 1.5,
  }
  const systemsImpact: Record<string, number> = {
    Operational: 0,
    Degraded: 0.48,
    'Major outage': 1.4,
  }
  const borderImpact: Record<string, number> = {
    Normal: 0,
    Congested: 0.25,
    'Severely congested': 0.68,
  }
  const hazardImpact: Record<string, number> = {
    None: 0,
    'Wildlife or drone': 0.9,
    'Volcanic ash': 1.7,
    'Emergency response': 1.45,
  }
  const curfewImpact: Record<string, number> = {
    None: 0,
    'Approaching curfew': 0.42,
    'Curfew conflict': 1.1,
  }
  const hubImpact = ['ATL', 'DEL', 'DXB', 'JFK', 'LAX', 'LHR', 'ORD'].includes(input.origin)
    ? 0.15
    : 0

  let score = -1.85
  score += add(`${input.airline} operating profile`, airlineImpact[input.airline])
  score += add(`${input.weather} weather`, weatherImpact[input.weather])
  score += add(`${input.airTraffic.toLowerCase()} air traffic`, trafficImpact[input.airTraffic])
  score += add(
    `${input.inboundAircraft.toLowerCase()} inbound aircraft`,
    inboundImpact[input.inboundAircraft],
  )
  score += add(input.maintenance.toLowerCase(), maintenanceImpact[input.maintenance])
  score += add(input.crewStatus.toLowerCase(), crewImpact[input.crewStatus])
  score += add(`${input.security.toLowerCase()} security`, securityImpact[input.security])
  score += add(
    `${input.departureWindow.toLowerCase()} departure`,
    scheduleImpact[input.departureWindow],
  )
  score += add(`${input.season.toLowerCase()} season`, seasonImpact[input.season])
  score += add(input.distanceBand.toLowerCase(), distanceImpact[input.distanceBand])
  score += add('origin hub pressure', hubImpact)
  score += add('airport congestion', (input.airportCongestion - 40) * 0.021)
  score += add('wind speed', Math.max(0, input.windSpeedKph - 18) * 0.018)
  score += add('low visibility', Math.max(0, 10 - input.visibilityKm) * 0.075)
  score += add('precipitation', input.precipitationMm * 0.025)
  score += add('extreme temperature', Math.max(0, Math.abs(input.temperatureC - 18) - 16) * 0.025)
  if (input.dayType === 'Public holiday') score += add('public holiday demand', 0.44)
  if (input.dayType === 'Weekend') score += add('weekend schedule', 0.08)
  score += add(input.groundStop.toLowerCase(), groundStopImpact[input.groundStop])
  score += add(input.runwayStatus.toLowerCase(), runwayImpact[input.runwayStatus])
  score += add(input.gateStatus.toLowerCase(), gateImpact[input.gateStatus])
  score += add(input.deicing.toLowerCase(), deicingImpact[input.deicing])
  score += add(input.turnaround.toLowerCase(), turnaroundImpact[input.turnaround])
  score += add(
    `${input.groundHandling.toLowerCase()} ground handling`,
    handlingImpact[input.groundHandling],
  )
  score += add(input.boarding.toLowerCase(), boardingImpact[input.boarding])
  score += add(
    `${input.connectionPressure.toLowerCase()} connection pressure`,
    connectionImpact[input.connectionPressure],
  )
  score += add(input.airspaceRestriction.toLowerCase(), airspaceImpact[input.airspaceRestriction])
  score += add(input.laborAction.toLowerCase(), laborImpact[input.laborAction])
  score += add(
    `${input.airportSystems.toLowerCase()} airport systems`,
    systemsImpact[input.airportSystems],
  )
  score += add(
    `${input.borderProcessing.toLowerCase()} border processing`,
    borderImpact[input.borderProcessing],
  )
  score += add(input.exceptionalHazard.toLowerCase(), hazardImpact[input.exceptionalHazard])
  score += add(input.curfewPressure.toLowerCase(), curfewImpact[input.curfewPressure])

  const probability = Math.min(98, Math.max(2, (1 / (1 + Math.exp(-score))) * 100))
  const expectedDelayMinutes = Math.max(1, 3 + probability * 0.57 + Math.max(0, score) * 5)
  const riskLevel: PredictionResult['riskLevel'] =
    probability < 25 ? 'Low' : probability < 50 ? 'Moderate' : probability < 75 ? 'High' : 'Severe'
  const topFactors = impacts
    .filter((item) => item.impact > 0)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 5)

  return {
    probability: Math.round(probability * 10) / 10,
    expectedDelayMinutes: Math.round(expectedDelayMinutes),
    riskLevel,
    topFactors: topFactors.map((item) => ({
      ...item,
      impact: Math.round(item.impact * 100) / 100,
    })),
  }
}
