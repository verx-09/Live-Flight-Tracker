import type { Access, CollectionConfig } from 'payload'

const isPayloadAdmin: Access = ({ req }) => req.user?.collection === 'admins'

const airlineOptions = [
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
]

const airportOptions = [
  'ATL',
  'BOM',
  'BOS',
  'DEL',
  'DXB',
  'FRA',
  'JFK',
  'LAX',
  'LHR',
  'ORD',
  'SEA',
  'SFO',
]

export const PredictionRuns: CollectionConfig = {
  slug: 'prediction-runs',
  access: {
    create: () => false,
    delete: isPayloadAdmin,
    read: isPayloadAdmin,
    update: isPayloadAdmin,
  },
  admin: {
    group: 'Flight Operations',
    defaultColumns: ['airline', 'origin', 'destination', 'probability', 'riskLevel', 'createdAt'],
    useAsTitle: 'airline',
  },
  fields: [
    { name: 'flightNumber', type: 'text' },
    { name: 'departureDate', type: 'date' },
    { name: 'airline', type: 'select', options: airlineOptions, required: true },
    { name: 'origin', type: 'select', options: airportOptions, required: true },
    { name: 'destination', type: 'select', options: airportOptions, required: true },
    {
      name: 'departureWindow',
      type: 'select',
      options: ['Early morning', 'Morning', 'Afternoon', 'Evening', 'Late night'],
      required: true,
    },
    {
      name: 'dayType',
      type: 'select',
      options: ['Weekday', 'Weekend', 'Public holiday'],
      required: true,
    },
    {
      name: 'season',
      type: 'select',
      options: ['Spring', 'Summer', 'Autumn', 'Winter'],
      required: true,
    },
    {
      name: 'weather',
      type: 'select',
      options: ['Clear', 'Cloudy', 'Rain', 'Snow', 'Thunderstorm', 'Fog'],
      required: true,
    },
    { name: 'windSpeedKph', type: 'number', min: 0, max: 150, required: true },
    { name: 'visibilityKm', type: 'number', min: 0, max: 50, required: true },
    { name: 'precipitationMm', type: 'number', min: 0, max: 100, required: true },
    { name: 'temperatureC', type: 'number', min: -50, max: 60, required: true },
    { name: 'airportCongestion', type: 'number', min: 0, max: 100, required: true },
    {
      name: 'airTraffic',
      type: 'select',
      options: ['Low', 'Moderate', 'High', 'Severe'],
      required: true,
    },
    {
      name: 'inboundAircraft',
      type: 'select',
      options: ['On time', 'Slight delay', 'Major delay'],
      required: true,
    },
    {
      name: 'maintenance',
      type: 'select',
      options: ['Cleared', 'Inspection due', 'Technical issue'],
      required: true,
    },
    {
      name: 'crewStatus',
      type: 'select',
      options: ['Ready', 'Tight connection', 'Crew shortage'],
      required: true,
    },
    {
      name: 'security',
      type: 'select',
      options: ['Normal', 'Heightened', 'Active disruption'],
      required: true,
    },
    {
      name: 'distanceBand',
      type: 'select',
      options: ['Short haul', 'Medium haul', 'Long haul', 'Ultra long haul'],
      required: true,
    },
    {
      name: 'groundStop',
      type: 'select',
      options: ['None', 'Ground delay program', 'Ground stop'],
    },
    {
      name: 'runwayStatus',
      type: 'select',
      options: ['Normal', 'Reduced capacity', 'Runway closure'],
    },
    {
      name: 'gateStatus',
      type: 'select',
      options: ['Available', 'Short wait', 'No gate available'],
    },
    {
      name: 'deicing',
      type: 'select',
      options: ['Not required', 'Scheduled', 'Heavy queue'],
    },
    {
      name: 'turnaround',
      type: 'select',
      options: ['On schedule', 'Tight turnaround', 'Behind schedule'],
    },
    {
      name: 'groundHandling',
      type: 'select',
      options: ['Ready', 'Minor delay', 'Major delay'],
    },
    {
      name: 'boarding',
      type: 'select',
      options: ['On schedule', 'Slow boarding', 'Passenger issue'],
    },
    {
      name: 'connectionPressure',
      type: 'select',
      options: ['Low', 'Moderate', 'High'],
    },
    {
      name: 'airspaceRestriction',
      type: 'select',
      options: ['None', 'Reroute', 'Closure or NOTAM'],
    },
    {
      name: 'laborAction',
      type: 'select',
      options: ['None', 'Staff shortage', 'Strike action'],
    },
    {
      name: 'airportSystems',
      type: 'select',
      options: ['Operational', 'Degraded', 'Major outage'],
    },
    {
      name: 'borderProcessing',
      type: 'select',
      options: ['Normal', 'Congested', 'Severely congested'],
    },
    {
      name: 'exceptionalHazard',
      type: 'select',
      options: ['None', 'Wildlife or drone', 'Volcanic ash', 'Emergency response'],
    },
    {
      name: 'curfewPressure',
      type: 'select',
      options: ['None', 'Approaching curfew', 'Curfew conflict'],
    },
    { name: 'probability', type: 'number', min: 0, max: 100, required: true },
    { name: 'expectedDelayMinutes', type: 'number', min: 0, required: true },
    {
      name: 'riskLevel',
      type: 'select',
      options: ['Low', 'Moderate', 'High', 'Severe'],
      required: true,
    },
    {
      name: 'topFactors',
      type: 'array',
      fields: [
        { name: 'factor', type: 'text', required: true },
        { name: 'impact', type: 'number', required: true },
      ],
    },
  ],
  versions: false,
}
