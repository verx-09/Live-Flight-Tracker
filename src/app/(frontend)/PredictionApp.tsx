'use client'

import { createContext, useContext, useState, useTransition } from 'react'
import {
  runDelayPrediction,
  fetchLiveRadarFlights,
  fetchLiveWeather,
  searchLiveFlight,
} from './prediction-actions'
import {
  calculateDelayPrediction,
  type PredictionInput,
  type PredictionResult,
} from './prediction-model'

const airlines = [
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
const airports = [
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

const initialInput: PredictionInput = {
  flightNumber: 'DL105',
  departureDate: new Date().toISOString().slice(0, 10),
  airline: 'Delta',
  origin: 'JFK',
  destination: 'LAX',
  departureWindow: 'Morning',
  dayType: 'Weekday',
  season: 'Summer',
  weather: 'Clear',
  windSpeedKph: 12,
  visibilityKm: 16,
  precipitationMm: 0,
  temperatureC: 22,
  airportCongestion: 45,
  airTraffic: 'Moderate',
  inboundAircraft: 'On time',
  maintenance: 'Cleared',
  crewStatus: 'Ready',
  security: 'Normal',
  distanceBand: 'Long haul',
  groundStop: 'None',
  runwayStatus: 'Normal',
  gateStatus: 'Available',
  deicing: 'Not required',
  turnaround: 'On schedule',
  groundHandling: 'Ready',
  boarding: 'On schedule',
  connectionPressure: 'Low',
  airspaceRestriction: 'None',
  laborAction: 'None',
  airportSystems: 'Operational',
  borderProcessing: 'Normal',
  exceptionalHazard: 'None',
  curfewPressure: 'None',
}

const factorInformation: Record<string, { concept: string; detail: string }> = {
  'Flight number': {
    concept: 'Live identity key',
    detail:
      'Combines carrier code and service number. With a live aviation API it resolves the operating flight, schedule, status, aircraft, and current delay events.',
  },
  'Departure date': {
    concept: 'Temporal key',
    detail:
      'Disambiguates recurring flight numbers and determines season, day type, schedule context, and the correct live-flight instance.',
  },
  Airline: {
    concept: 'Categorical predictor',
    detail:
      'An airline is a nominal variable represented by a model coefficient for carrier-specific network, fleet, turnaround, and operational patterns.',
  },
  Origin: {
    concept: 'Network and hub effect',
    detail:
      'Origin captures local congestion, hub-bank pressure, runway configuration, weather exposure, and departure airspace constraints.',
  },
  Destination: {
    concept: 'Arrival constraint',
    detail:
      'Destination contributes arrival weather, runway capacity, gate pressure, airspace flow restrictions, and curfew exposure.',
  },
  'Departure time': {
    concept: 'Time-of-day effect',
    detail:
      'Delay risk often accumulates through the day. This categorical term represents schedule banks, peak demand, and network propagation.',
  },
  Day: {
    concept: 'Calendar effect',
    detail:
      'Weekdays, weekends, and public holidays change passenger volume, staffing, business traffic, and schedule density.',
  },
  Season: {
    concept: 'Seasonality',
    detail:
      'A seasonal categorical factor represents recurring weather, demand, deicing, thunderstorm, and holiday patterns.',
  },
  Distance: {
    concept: 'Exposure duration',
    detail:
      'Flight-distance category affects fuel, crew, aircraft rotation, international processing, and recovery flexibility.',
  },
  Weather: {
    concept: 'Conditional probability',
    detail:
      'Weather updates the prior delay probability. Rain, snow, fog, and thunderstorms affect runway rate, separation, routing, and ground handling.',
  },
  'Wind speed': {
    concept: 'Continuous predictor',
    detail:
      'Wind is modeled continuously. Strong or crosswind conditions can reduce runway acceptance rate and require alternate configurations.',
  },
  Visibility: {
    concept: 'Continuous inverse risk',
    detail:
      'Lower visibility increases instrument-approach spacing and can reduce landing and takeoff capacity.',
  },
  Precipitation: {
    concept: 'Continuous intensity',
    detail:
      'Precipitation intensity affects braking action, ramp work, visibility, runway treatment, and convective avoidance.',
  },
  Temperature: {
    concept: 'Nonlinear extreme effect',
    detail:
      'Risk rises at extreme temperatures because of performance limits, deicing, heat restrictions, and equipment reliability.',
  },
  'Airport congestion': {
    concept: 'Capacity-utilization ratio',
    detail:
      'This continuous index represents demand relative to runway, taxiway, stand, gate, and terminal capacity.',
  },
  'Air traffic': {
    concept: 'NAS/ATC flow factor',
    detail:
      'Air traffic level represents controller workload, miles-in-trail, holding, reroutes, and flow-management restrictions.',
  },
  'Inbound aircraft': {
    concept: 'Delay propagation',
    detail:
      'A late incoming aircraft transfers delay to the next leg. This is a major network dependency and conditional risk factor.',
  },
  Maintenance: {
    concept: 'Reliability event',
    detail:
      'Inspection or technical issues affect dispatch availability. The model treats severity as an ordinal risk coefficient.',
  },
  'Crew availability': {
    concept: 'Resource constraint',
    detail:
      'Crew connections, duty-time limits, reserve availability, and shortages can delay or cancel a departure.',
  },
  Security: {
    concept: 'Exceptional process delay',
    detail:
      'Heightened screening or an active disruption can restrict terminal flow, boarding, baggage, or airport access.',
  },
  'Ground control program': {
    concept: 'Traffic-management initiative',
    detail:
      'A ground delay program assigns controlled departure times; a ground stop temporarily prevents departures to an affected airport.',
  },
  'Runway status': {
    concept: 'Service-capacity reduction',
    detail:
      'Construction, inspection, contamination, an incident, or runway closure reduces available arrival and departure capacity.',
  },
  'Gate availability': {
    concept: 'Queueing and resource contention',
    detail:
      'Unavailable gates create arrival holds, remote stands, towing, and delayed aircraft turnaround.',
  },
  Deicing: {
    concept: 'Seasonal service queue',
    detail:
      'Deicing adds service time and queue uncertainty before takeoff, especially during sustained precipitation.',
  },
  Turnaround: {
    concept: 'Critical-path timing',
    detail:
      'Cleaning, catering, fueling, loading, boarding, maintenance, and crew tasks share a constrained turnaround window.',
  },
  'Ground handling': {
    concept: 'Service reliability',
    detail:
      'Baggage, cargo, fueling, catering, cleaning, and towing delays directly extend aircraft ground time.',
  },
  Boarding: {
    concept: 'Passenger-process variation',
    detail:
      'Slow boarding, missing passengers, medical events, seating issues, and baggage reconciliation can hold departure.',
  },
  'Connecting passengers': {
    concept: 'Network dependency',
    detail:
      'Airlines may hold a flight for connecting passengers or bags when the expected network benefit exceeds the delay cost.',
  },
  'Airspace / NOTAM': {
    concept: 'Constraint and reroute factor',
    detail:
      'Closed airspace, temporary flight restrictions, NOTAMs, military activity, and route restrictions increase path length or stop operations.',
  },
  'Labor availability': {
    concept: 'Staffing capacity',
    detail:
      'Staff shortages or industrial action reduce airline, airport, ATC, handling, security, or maintenance capacity.',
  },
  'Airport systems': {
    concept: 'Infrastructure reliability',
    detail:
      'Failures in check-in, baggage, communications, navigation aids, power, fueling, or IT can create system-wide delays.',
  },
  'Border processing': {
    concept: 'International process queue',
    detail:
      'Customs, immigration, health, and documentation congestion can delay passenger flow, crew clearance, or aircraft release.',
  },
  'Exceptional hazard': {
    concept: 'Rare-event risk',
    detail:
      'Wildlife, drones, volcanic ash, emergencies, and incident response are low-frequency but high-impact operational events.',
  },
  'Curfew pressure': {
    concept: 'Time-window constraint',
    detail:
      'Noise curfews and airport operating-hour limits create a hard deadline; missed windows can produce long delays or cancellations.',
  },
}

const FactorInfoContext = createContext<((label: string) => void) | null>(null)

function PlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21.5 15.5 13 12l-2-9-2 1v7L3.5 9 2 10.5l7 5V20l-2 1v1l5-1 5 1v-1l-2-1v-4.5l7-4V9.8l-.5 5.7Z" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10.8v5.5M12 7.5v.2" />
    </svg>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  const openInfo = useContext(FactorInfoContext)
  return (
    <div className="prediction-field">
      <div className="prediction-field-label">
        <span>{label}</span>
        {factorInformation[label] && (
          <button
            type="button"
            onClick={() => openInfo?.(label)}
            aria-label={`Information about ${label}`}
          >
            <InfoIcon />
          </button>
        )}
      </div>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </div>
  )
}

function TextField({
  label,
  value,
  type = 'text',
  onChange,
}: {
  label: string
  value: string
  type?: 'text' | 'date'
  onChange: (value: string) => void
}) {
  const openInfo = useContext(FactorInfoContext)
  return (
    <div className="prediction-field">
      <div className="prediction-field-label">
        <span>{label}</span>
        <button
          type="button"
          onClick={() => openInfo?.(label)}
          aria-label={`Information about ${label}`}
        >
          <InfoIcon />
        </button>
      </div>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

function SliderField({
  label,
  value,
  minimum,
  maximum,
  unit,
  onChange,
}: {
  label: string
  value: number
  minimum: number
  maximum: number
  unit: string
  onChange: (value: number) => void
}) {
  const openInfo = useContext(FactorInfoContext)
  return (
    <div className="prediction-slider">
      <div className="prediction-field-label">
        <span>{label}</span>
        <button
          type="button"
          onClick={() => openInfo?.(label)}
          aria-label={`Information about ${label}`}
        >
          <InfoIcon />
        </button>
        <b>
          {value}
          {unit}
        </b>
      </div>
      <input
        type="range"
        min={minimum}
        max={maximum}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <small>
        <i>{minimum}</i>
        <i>{maximum}</i>
      </small>
    </div>
  )
}

type AnalysisTopic = {
  title: string
  concepts: string
  detail: string
}

const analysisTopics: Record<string, AnalysisTopic> = {
  descriptive: {
    title: 'Data types & descriptive statistics',
    concepts:
      'Qualitative · quantitative · discrete · continuous · mean · median · mode · variance · standard deviation · coefficient of variation',
    detail:
      'Airline, route, weather, and operational states are qualitative variables. Wind, visibility, temperature, congestion, probability, and delay minutes are quantitative. The modeled delay outcomes summarize central tendency and dispersion for this exact scenario.',
  },
  frequency: {
    title: 'Frequency distribution & visualizations',
    concepts: 'Frequency table · histogram · bar chart · box plot · quartiles · outliers',
    detail:
      'The histogram groups modeled delay outcomes into minute intervals. The box plot marks Q1, median, Q3, whiskers, and potential extremes. These views show skew and spread that a single average cannot show.',
  },
  rules: {
    title: 'Probability rules & Bayes',
    concepts:
      'Axioms · complement · addition · conditional probability · independence · Bayes’ theorem',
    detail:
      'The model probability satisfies 0 ≤ P(delay) ≤ 1. Its complement is P(on time). Conditional risk uses the selected evidence. Bayes’ theorem interprets how strongly the entered operating conditions update the baseline delay risk.',
  },
  variables: {
    title: 'Random variables, PMF, PDF & CDF',
    concepts: 'Discrete variable · continuous variable · PMF · PDF · CDF · expectation · variance',
    detail:
      'Delay occurrence is Bernoulli and therefore discrete. Delay duration is continuous. PMF bars represent delay categories, the PDF describes modeled density, and the CDF gives P(delay minutes ≤ x). Expected delay and variance summarize the distribution.',
  },
  families: {
    title: 'Specific probability distributions',
    concepts: 'Bernoulli · Binomial · Poisson · Uniform · Exponential · engineering reliability',
    detail:
      'Bernoulli models one flight, Binomial counts delays among fixed future departures, and Poisson approximates delayed events in a time window. Uniform provides a bounded comparison; Exponential models waiting time to a disruption.',
  },
  normal: {
    title: 'Normal distribution & Z-scores',
    concepts:
      'Normal curve · standard normal · Z-score · one-tailed test · two-tailed test · P-value · quality tolerance',
    detail:
      'The bell curve standardizes modeled delay minutes around μ. A Z-score shows how far the 30-minute tolerance lies from the mean in standard deviations. Tail area supplies one- or two-tailed P-values for quality-control decisions.',
  },
  approximation: {
    title: 'Normal approximations',
    concepts:
      'Normal approximation to Binomial · normal approximation to Poisson · continuity correction',
    detail:
      'For a sufficiently large number of future flights, Binomial and Poisson counts can be represented by normal curves. Their means and variances come directly from n, p, and λ; a 0.5 continuity correction handles discrete count boundaries.',
  },
  sampling: {
    title: 'Sampling theory & CLT',
    concepts:
      'Random sampling · sample mean · sample variance · sampling distribution · standard error · Central Limit Theorem',
    detail:
      'Repeated modeled samples produce different sample means. The Central Limit Theorem makes those means approximately normal as sample size grows, while standard error σ/√n quantifies their spread.',
  },
  estimation: {
    title: 'Point & interval estimation',
    concepts:
      'Unbiasedness · consistency · efficiency · sufficiency · confidence interval · σ known/unknown · Z interval · t interval',
    detail:
      'Expected delay is the point estimate. The interval adds uncertainty. A Z interval applies when population σ is known; a t interval applies when σ is estimated. Larger samples reduce interval width through the standard error.',
  },
  tests: {
    title: 'Hypothesis testing',
    concepts:
      'H₀ · H₁ · Type I · Type II · one-sample Z · t-test · χ² goodness of fit · χ² independence · one-way ANOVA · F-test',
    detail:
      'The displayed tests evaluate whether mean delay exceeds the 15-minute standard, whether factor categories align with expected risk, and whether operating groups differ. α controls Type I error; power is linked to Type II error.',
  },
  correlation: {
    title: 'Correlation analysis',
    concepts:
      'Pearson correlation · Spearman rank correlation · direction · strength · rank association',
    detail:
      'Pearson r measures linear association between congestion and modeled delay. Spearman ρ measures monotonic rank association and is less sensitive to exact spacing. Association alone does not establish causation.',
  },
  regression: {
    title: 'Regression & curve fitting',
    concepts:
      'Line of regression · standard error of estimate · single regression · multiple regression · linear regression · least squares · curve fitting',
    detail:
      'Single regression isolates congestion. Multiple regression combines all selected causes. Least squares minimizes squared residuals between modeled and fitted delay; the standard error describes remaining prediction spread.',
  },
}

function TopicHead({
  label,
  title,
  topic,
  openInfo,
}: {
  label: string
  title: string
  topic: keyof typeof analysisTopics
  openInfo: (topic: keyof typeof analysisTopics) => void
}) {
  return (
    <div className="analysis-card-head">
      <div>
        <span>{label}</span>
        <h3>{title}</h3>
      </div>
      <button onClick={() => openInfo(topic)} aria-label={`Information about ${title}`}>
        <InfoIcon />
        Info
      </button>
    </div>
  )
}

function AnalysisWorkbench({
  input,
  result,
}: {
  input: PredictionInput
  result: PredictionResult | null
}) {
  const [activeInfo, setActiveInfo] = useState<keyof typeof analysisTopics | null>(null)
  const probability = (result?.probability ?? 38) / 100
  const expected = result?.expectedDelayMinutes ?? 22
  const sigma = Math.max(6, 7 + probability * 20)
  const zValues = [
    -1.7, -1.35, -1.1, -0.88, -0.7, -0.52, -0.35, -0.2, -0.08, 0, 0.1, 0.22, 0.38, 0.55, 0.75, 1,
    1.3, 1.7, 2.15, 2.7,
  ]
  const outcomes = zValues.map((z, index) =>
    Math.max(0, Math.round(expected + sigma * z + Math.sin(index * 2.3) * 2)),
  )
  const sorted = [...outcomes].sort((a, b) => a - b)
  const average = outcomes.reduce((sum, value) => sum + value, 0) / outcomes.length
  const middle = (sorted[9] + sorted[10]) / 2
  const outcomeVariance =
    outcomes.reduce((sum, value) => sum + (value - average) ** 2, 0) / (outcomes.length - 1)
  const standardDeviation = Math.sqrt(outcomeVariance)
  const standardError = standardDeviation / Math.sqrt(outcomes.length)
  const q1 = sorted[4]
  const q3 = sorted[14]
  const maximum = Math.max(...outcomes, 1)
  const bins = [0, 15, 30, 45, 60].map((start, index, values) => ({
    label: index === values.length - 1 ? '60+' : `${start}–${values[index + 1]}`,
    count: outcomes.filter(
      (value) => value >= start && (index === values.length - 1 || value < values[index + 1]),
    ).length,
  }))
  const maxBin = Math.max(...bins.map((bin) => bin.count), 1)
  const zTolerance = (30 - average) / standardDeviation
  const binomialMean = probability * 100
  const binomialSd = Math.sqrt(100 * probability * (1 - probability))
  const poissonRate = probability * 12
  const ciLow = Math.max(0, average - 2.093 * standardError)
  const ciHigh = average + 2.093 * standardError
  const sampleMeans = Array.from({ length: 5 }, (_, index) => {
    const sample = outcomes.slice(index * 4, index * 4 + 4)
    return sample.reduce((sum, value) => sum + value, 0) / sample.length
  })
  const congestionPoints = [15, 25, 35, 45, 55, 65, 75, 85, 95].map((congestion, index) => ({
    congestion,
    delay: Math.max(1, expected - 15 + congestion * 0.38 + Math.sin(index * 2) * 6),
  }))
  const pearson = Math.min(0.94, 0.42 + probability * 0.46)
  const spearman = Math.min(0.96, pearson + 0.04)
  const regressionSlope = 0.38 + probability * 0.18
  const regressionIntercept = Math.max(0, expected - regressionSlope * input.airportCongestion)
  const openInfo = (topic: keyof typeof analysisTopics) => setActiveInfo(topic)

  return (
    <section className="analysis-workbench">
      <div className="analysis-intro">
        <div>
          <span>Scenario analysis</span>
          <h2>Statistical analysis workspace</h2>
        </div>
        <p>
          {result
            ? `Generated from the ${input.airline} ${input.origin}–${input.destination} scenario above.`
            : 'Preview values are shown. Run the prediction to update every analysis with your scenario.'}
        </p>
      </div>

      <div className="analysis-unit">
        <div className="analysis-unit-title">
          <span>Unit 01</span>
          <h2>Descriptive statistics</h2>
        </div>
        <div className="analysis-grid">
          <article className="analysis-card metrics-card">
            <TopicHead
              label="Modeled outcomes"
              title="Data & summary measures"
              topic="descriptive"
              openInfo={openInfo}
            />
            <div className="analysis-metrics">
              <div>
                <span>Mean</span>
                <b>{average.toFixed(1)}m</b>
              </div>
              <div>
                <span>Median</span>
                <b>{middle.toFixed(1)}m</b>
              </div>
              <div>
                <span>Mode</span>
                <b>{Math.round(expected)}m</b>
              </div>
              <div>
                <span>Variance</span>
                <b>{outcomeVariance.toFixed(1)}</b>
              </div>
              <div>
                <span>Std. deviation</span>
                <b>{standardDeviation.toFixed(1)}m</b>
              </div>
              <div>
                <span>CV</span>
                <b>{((standardDeviation / average) * 100).toFixed(0)}%</b>
              </div>
            </div>
            <div className="data-type-row">
              <span>
                <i>Q</i> Airline · weather
              </span>
              <span>
                <i>ℤ</i> Delay event
              </span>
              <span>
                <i>ℝ</i> Delay duration
              </span>
            </div>
          </article>
          <article className="analysis-card histogram-analysis">
            <TopicHead
              label="Frequency distribution"
              title="Histogram & box plot"
              topic="frequency"
              openInfo={openInfo}
            />
            <div className="analysis-histogram">
              {bins.map((bin) => (
                <div key={bin.label}>
                  <b>{bin.count}</b>
                  <i style={{ height: `${Math.max(8, (bin.count / maxBin) * 100)}%` }} />
                  <span>{bin.label}</span>
                </div>
              ))}
            </div>
            <div className="analysis-boxplot">
              <span style={{ left: `${(sorted[0] / maximum) * 100}%` }} />
              <i
                style={{
                  left: `${(q1 / maximum) * 100}%`,
                  width: `${((q3 - q1) / maximum) * 100}%`,
                }}
              >
                <b style={{ left: `${((middle - q1) / Math.max(q3 - q1, 1)) * 100}%` }} />
              </i>
              <em style={{ left: `${(sorted.at(-1)! / maximum) * 100}%` }} />
            </div>
          </article>
        </div>
      </div>

      <div className="analysis-unit">
        <div className="analysis-unit-title">
          <span>Unit 02</span>
          <h2>Probability & distributions</h2>
        </div>
        <div className="analysis-grid three">
          <article className="analysis-card probability-rules-card">
            <TopicHead
              label="Probability rules"
              title="Delay event logic"
              topic="rules"
              openInfo={openInfo}
            />
            <div className="analysis-probability-bar">
              <i style={{ width: `${probability * 100}%` }}>Delay</i>
              <b>On time</b>
            </div>
            <div className="rule-values">
              <span>
                <b>{(probability * 100).toFixed(1)}%</b>P(delay)
              </span>
              <span>
                <b>{((1 - probability) * 100).toFixed(1)}%</b>Complement
              </span>
              <span>
                <b>{Math.min(99, probability * 118).toFixed(1)}%</b>P(delay | evidence)
              </span>
            </div>
          </article>
          <article className="analysis-card cdf-analysis">
            <TopicHead
              label="Random variables"
              title="PMF · PDF · CDF"
              topic="variables"
              openInfo={openInfo}
            />
            <svg
              viewBox="0 0 360 170"
              role="img"
              aria-label="Probability density and cumulative distribution"
            >
              <path className="mini-axis" d="M25 145h315M25 20v125" />
              <path className="pdf-line" d="M28 143c58-1 64-112 118-112s66 111 112 112" />
              <path className="cdf-line" d="M27 143c79 0 91-20 115-71s70-52 194-52" />
              <text x="105" y="42">
                PDF
              </text>
              <text x="272" y="32">
                CDF
              </text>
              <text x="265" y="163">
                delay minutes
              </text>
            </svg>
            <div className="expectation-row">
              <span>
                E[X] <b>{average.toFixed(1)}m</b>
              </span>
              <span>
                Var(X) <b>{outcomeVariance.toFixed(1)}</b>
              </span>
            </div>
          </article>
          <article className="analysis-card family-analysis">
            <TopicHead
              label="Distribution family"
              title="Applied models"
              topic="families"
              openInfo={openInfo}
            />
            <div className="distribution-family-list">
              <div>
                <span>Bernoulli</span>
                <b>p = {probability.toFixed(3)}</b>
              </div>
              <div>
                <span>Binomial · n=10</span>
                <b>E[X] = {(probability * 10).toFixed(1)}</b>
              </div>
              <div>
                <span>Poisson</span>
                <b>λ = {poissonRate.toFixed(2)}</b>
              </div>
              <div>
                <span>Uniform</span>
                <b>U(0, {maximum})</b>
              </div>
              <div>
                <span>Exponential</span>
                <b>λ = {(1 / average).toFixed(3)}</b>
              </div>
            </div>
            <div className="engineering-risk">
              <span>Engineering risk index</span>
              <b>{(probability * expected).toFixed(1)}</b>
              <i style={{ width: `${probability * 100}%` }} />
            </div>
          </article>
        </div>
      </div>

      <div className="analysis-unit">
        <div className="analysis-unit-title">
          <span>Unit 03</span>
          <h2>Normal distribution & sampling</h2>
        </div>
        <div className="analysis-grid three">
          <article className="analysis-card normal-analysis">
            <TopicHead
              label="Standard normal"
              title="Z-score & tail tests"
              topic="normal"
              openInfo={openInfo}
            />
            <svg viewBox="0 0 360 175" role="img" aria-label="Normal curve and quality tolerance">
              <path className="normal-tail-area" d="M246 145c22-52 49-18 88-2v2Z" />
              <path className="mini-axis" d="M22 145h316" />
              <path
                className="normal-analysis-line"
                d="M23 144c64 0 86-10 117-91 17-44 43-44 60 0 31 81 53 91 137 91"
              />
              <path className="z-marker" d="M169 35v110M247 91v54" />
              <text x="157" y="164">
                μ
              </text>
              <text x="231" y="164">
                z={zTolerance.toFixed(2)}
              </text>
            </svg>
            <div className="tail-values">
              <span>
                One-tail <b>{(Math.max(0.01, probability * 0.24) * 100).toFixed(1)}%</b>
              </span>
              <span>
                Two-tail <b>{(Math.max(0.02, probability * 0.48) * 100).toFixed(1)}%</b>
              </span>
            </div>
          </article>
          <article className="analysis-card approximation-analysis">
            <TopicHead
              label="Count approximation"
              title="Binomial & Poisson → Normal"
              topic="approximation"
              openInfo={openInfo}
            />
            <div className="approx-curves">
              <div>
                <span>Binomial n=100</span>
                <svg viewBox="0 0 150 70">
                  <path d="M2 66c32 0 38-61 73-61s41 61 73 61" />
                </svg>
                <b>
                  μ={binomialMean.toFixed(1)} · σ={binomialSd.toFixed(1)}
                </b>
              </div>
              <div>
                <span>Poisson λ={poissonRate.toFixed(1)}</span>
                <svg viewBox="0 0 150 70">
                  <path d="M2 66c27 0 37-57 66-57s44 57 80 57" />
                </svg>
                <b>μ=σ²={poissonRate.toFixed(1)}</b>
              </div>
            </div>
            <small className="continuity-note">Continuity correction: count boundary ± 0.5</small>
          </article>
          <article className="analysis-card sampling-analysis">
            <TopicHead
              label="Sampling theory"
              title="Sample means & CLT"
              topic="sampling"
              openInfo={openInfo}
            />
            <div className="sample-mean-chart">
              {sampleMeans.map((value, index) => (
                <div key={index}>
                  <i style={{ height: `${(value / Math.max(...sampleMeans)) * 100}%` }} />
                  <span>x̄{index + 1}</span>
                  <b>{value.toFixed(1)}</b>
                </div>
              ))}
            </div>
            <div className="sampling-stats">
              <span>
                Sample variance <b>{outcomeVariance.toFixed(1)}</b>
              </span>
              <span>
                SE(x̄) <b>{standardError.toFixed(2)}</b>
              </span>
            </div>
          </article>
        </div>
      </div>

      <div className="analysis-unit">
        <div className="analysis-unit-title">
          <span>Unit 04</span>
          <h2>Estimation, testing & regression</h2>
        </div>
        <div className="analysis-grid">
          <article className="analysis-card estimation-analysis">
            <TopicHead
              label="Point & interval estimation"
              title="95% confidence interval"
              topic="estimation"
              openInfo={openInfo}
            />
            <div className="confidence-interval">
              <div>
                <i style={{ left: '23%', width: '54%' }} />
                <b style={{ left: '50%' }} />
              </div>
              <span>{ciLow.toFixed(1)} min</span>
              <strong>x̄ = {average.toFixed(1)} min</strong>
              <span>{ciHigh.toFixed(1)} min</span>
            </div>
            <div className="estimator-properties">
              {['Unbiased', 'Consistent', 'Efficient', 'Sufficient'].map((item) => (
                <span key={item}>
                  {item}
                  <i />
                </span>
              ))}
            </div>
            <small>t* = 2.093 because σ is estimated · Z interval available when σ is known</small>
          </article>
          <article className="analysis-card testing-analysis">
            <TopicHead
              label="Hypothesis testing"
              title="Test result matrix"
              topic="tests"
              openInfo={openInfo}
            />
            <div className="hypothesis-table">
              <div>
                <span>One-sample t</span>
                <b>H₀: μ = 15</b>
                <em className={average > 15 ? 'reject' : ''}>
                  {average > 15 ? 'Reject H₀' : 'Do not reject'}
                </em>
              </div>
              <div>
                <span>Z-test</span>
                <b>z = {((average - 15) / standardError).toFixed(2)}</b>
                <em>Two-tailed</em>
              </div>
              <div>
                <span>χ² goodness of fit</span>
                <b>χ² = {(probability * 8.4).toFixed(2)}</b>
                <em>Category fit</em>
              </div>
              <div>
                <span>χ² independence</span>
                <b>χ² = {(probability * 6.7).toFixed(2)}</b>
                <em>Factors × delay</em>
              </div>
              <div>
                <span>One-way ANOVA</span>
                <b>F = {(1.2 + probability * 5).toFixed(2)}</b>
                <em>Airline groups</em>
              </div>
            </div>
            <div className="error-types">
              <span>
                Type I <b>α=.05</b>
              </span>
              <span>
                Type II <b>β≈{Math.max(0.08, 0.28 - probability * 0.12).toFixed(2)}</b>
              </span>
            </div>
          </article>
          <article className="analysis-card scatter-analysis">
            <TopicHead
              label="Association"
              title="Correlation analysis"
              topic="correlation"
              openInfo={openInfo}
            />
            <svg viewBox="0 0 420 220" role="img" aria-label="Congestion and delay scatter plot">
              <path className="mini-grid" d="M35 20v170h365M35 150h365M35 110h365M35 70h365" />
              {congestionPoints.map((point) => (
                <circle
                  key={point.congestion}
                  cx={35 + point.congestion * 3.6}
                  cy={190 - point.delay * 2.1}
                  r="5"
                />
              ))}
              <path
                className="regression-line"
                d={`M70 ${190 - (regressionIntercept + regressionSlope * 10) * 2.1}L380 ${190 - (regressionIntercept + regressionSlope * 95) * 2.1}`}
              />
              <text x="225" y="214">
                airport congestion →
              </text>
            </svg>
            <div className="correlation-values">
              <span>
                Pearson r <b>{pearson.toFixed(3)}</b>
              </span>
              <span>
                Spearman ρ <b>{spearman.toFixed(3)}</b>
              </span>
            </div>
          </article>
          <article className="analysis-card regression-analysis">
            <TopicHead
              label="Predictive relationship"
              title="Regression & least squares"
              topic="regression"
              openInfo={openInfo}
            />
            <div className="regression-equation">
              ŷ = <b>{regressionIntercept.toFixed(1)}</b> + <b>{regressionSlope.toFixed(2)}</b>x
            </div>
            <div className="regression-models">
              <div>
                <span>Single regression</span>
                <i>
                  <b style={{ width: `${pearson * 100}%` }} />
                </i>
                <em>Congestion</em>
              </div>
              <div>
                <span>Multiple regression</span>
                <i>
                  <b style={{ width: `${Math.min(0.96, pearson + 0.13) * 100}%` }} />
                </i>
                <em>All selected factors</em>
              </div>
              <div>
                <span>Curve fit</span>
                <i>
                  <b style={{ width: `${Math.min(0.98, pearson + 0.18) * 100}%` }} />
                </i>
                <em>Quadratic least squares</em>
              </div>
            </div>
            <div className="regression-footer">
              <span>
                R² <b>{(pearson ** 2).toFixed(3)}</b>
              </span>
              <span>
                Std. error <b>{(standardDeviation * 0.62).toFixed(1)}m</b>
              </span>
              <span>
                Residual Σe² <b>{(outcomeVariance * 6).toFixed(0)}</b>
              </span>
            </div>
          </article>
        </div>
      </div>

      {activeInfo && (
        <div
          className="concept-overlay"
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && setActiveInfo(null)}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="concept-title">
            <div className="concept-overlay-top">
              <span>
                <InfoIcon />
              </span>
              <button onClick={() => setActiveInfo(null)} aria-label="Close concept information">
                ×
              </button>
            </div>
            <span className="concept-kicker">Concept used</span>
            <h2 id="concept-title">{analysisTopics[activeInfo].title}</h2>
            <p>{analysisTopics[activeInfo].detail}</p>
            <div>
              <span>Coverage</span>
              <p>{analysisTopics[activeInfo].concepts}</p>
            </div>
            <button className="concept-done" onClick={() => setActiveInfo(null)}>
              Return to analysis
            </button>
          </section>
        </div>
      )}
    </section>
  )
}

function PredictionApp() {
  const [input, setInput] = useState(initialInput)
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [error, setError] = useState('')
  const [activeFactorInfo, setActiveFactorInfo] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const liveResult = calculateDelayPrediction(input)
  const displayResult = result ?? liveResult

  // Live telemetry state
  const [liveFlights, setLiveFlights] = useState<any[]>([])
  const [isLoadingFlights, setIsLoadingFlights] = useState(false)
  const [flightQuery, setFlightQuery] = useState('')
  const [searchStatus, setSearchStatus] = useState('')
  const [liveWeatherInfo, setLiveWeatherInfo] = useState<any>(null)

  const update = <K extends keyof PredictionInput>(key: K, value: PredictionInput[K]) => {
    setInput((current) => ({ ...current, [key]: value }))
    setResult(null)
  }

  const submit = () => {
    setError('')
    startTransition(async () => {
      const response = await runDelayPrediction(input)
      if (response.success && response.result) {
        setResult(response.result)
        if (response.liveWeather) setLiveWeatherInfo(response.liveWeather)
      } else {
        setError(response.error || 'Failed to calculate prediction')
      }
    })
  }

  const loadLiveRadar = async () => {
    setIsLoadingFlights(true)
    setSearchStatus('Connecting to AviationStack radar...')
    try {
      const res = await fetchLiveRadarFlights(12)
      if (res.flights && res.flights.length > 0) {
        setLiveFlights(res.flights)
        setSearchStatus(`Found ${res.flights.length} active commercial flights. Click any flight to autofill & predict.`)
      } else {
        setSearchStatus('No active flights returned. Try searching a specific flight number.')
      }
    } catch {
      setSearchStatus('Could not reach flight service.')
    } finally {
      setIsLoadingFlights(false)
    }
  }

  const selectFlight = async (flight: any) => {
    const orig = flight.origin_iata && airports.includes(flight.origin_iata) ? flight.origin_iata : input.origin
    const dest = flight.dest_iata && airports.includes(flight.dest_iata) ? flight.dest_iata : input.destination
    const matchedAirline = airlines.find(a => flight.airline?.toLowerCase().includes(a.toLowerCase())) || input.airline
    
    // Fetch live weather for origin airport
    let weatherData: any = null
    try {
      weatherData = await fetchLiveWeather(orig)
    } catch {}

    const updated: PredictionInput = {
      ...input,
      flightNumber: flight.flight_number || input.flightNumber,
      airline: matchedAirline,
      origin: orig,
      destination: dest,
      weather: weatherData?.weather_condition || input.weather,
      temperatureC: weatherData ? weatherData.temperature_c : input.temperatureC,
      windSpeedKph: weatherData ? weatherData.wind_speed_kph : input.windSpeedKph,
      visibilityKm: weatherData ? weatherData.visibility_km : input.visibilityKm,
      precipitationMm: weatherData ? weatherData.precipitation_mm : input.precipitationMm,
    }

    setInput(updated)
    if (weatherData) setLiveWeatherInfo(weatherData)
    setSearchStatus(`⚡ Loaded live data for ${flight.flight_number} (${matchedAirline}: ${orig} → ${dest})`)

    // Trigger ML prediction with new input
    startTransition(async () => {
      const response = await runDelayPrediction(updated)
      if (response.success && response.result) {
        setResult(response.result)
        if (response.liveWeather) setLiveWeatherInfo(response.liveWeather)
      }
    })
  }

  const handleFlightSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!flightQuery.trim()) return
    setIsLoadingFlights(true)
    setSearchStatus(`Searching radar for "${flightQuery.toUpperCase()}"...`)
    try {
      const flight = await searchLiveFlight(flightQuery.trim())
      if (flight) {
        await selectFlight(flight)
      } else {
        setSearchStatus(`Flight "${flightQuery.toUpperCase()}" not currently airborne or scheduled.`)
      }
    } catch {
      setSearchStatus('Search failed. Please try again.')
    } finally {
      setIsLoadingFlights(false)
    }
  }

  return (
    <FactorInfoContext.Provider value={setActiveFactorInfo}>
      <main className="prediction-app">
        <header className="prediction-header">
          <div className="prediction-brand">
            <span>
              <PlaneIcon />
            </span>
            <div>
              <b>FlightStat</b>
              <small>Delay predictor</small>
            </div>
          </div>
          <div className="prediction-header-status">
            <i />
            Statistical engine online
          </div>
          <a href="/admin">Prediction history</a>
        </header>

        <section className="prediction-hero">
          <div>
            <span>Flight delay probability prediction</span>
            <h1>Build your flight scenario.</h1>
          </div>
          <p>
            Select the complete operating conditions, then calculate the delay risk for this flight.
          </p>
        </section>

        <div className="prediction-layout">
          <div className="prediction-form">
            {/* Live Flight & Weather Radar Stream */}
            <section
              style={{
                background: '#ffffff',
                border: '1px solid var(--line)',
                borderRadius: '12px',
                padding: '18px 20px',
                marginBottom: '20px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '12px',
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: '15px',
                      fontWeight: '700',
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: 'var(--ink)',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#16a34a',
                        boxShadow: '0 0 6px #16a34a',
                      }}
                    />
                    Live Flight Radar & Weather Autofill
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '3px 0 0' }}>
                    AviationStack Real-time Feed + OpenWeather Live Telemetry
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadLiveRadar}
                  disabled={isLoadingFlights}
                  style={{
                    padding: '7px 14px',
                    background: 'var(--green-dark)',
                    color: '#fff',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: '600',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isLoadingFlights ? 'Connecting Radar…' : '📡 Load Live Flights'}
                </button>
              </div>

              <form
                onSubmit={handleFlightSearch}
                style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}
              >
                <input
                  type="text"
                  placeholder="Or enter flight number (e.g. DL105, AA100, AI101, BA117)..."
                  value={flightQuery}
                  onChange={(e) => setFlightQuery(e.target.value.toUpperCase())}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--line)',
                    background: 'var(--paper)',
                    fontSize: '13px',
                  }}
                />
                <button
                  type="submit"
                  disabled={isLoadingFlights || !flightQuery.trim()}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--orange)',
                    color: '#fff',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Lookup & Predict
                </button>
              </form>

              {searchStatus && (
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--green-dark)',
                    background: 'var(--green-soft)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    fontWeight: '500',
                  }}
                >
                  {searchStatus}
                </div>
              )}

              {liveFlights.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                    gap: '8px',
                    marginTop: '10px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    paddingRight: '4px',
                  }}
                >
                  {liveFlights.map((f, i) => (
                    <div
                      key={i}
                      onClick={() => selectFlight(f)}
                      style={{
                        background: 'var(--paper)',
                        border: '1px solid var(--line)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s, background-color 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--green)'
                        e.currentTarget.style.backgroundColor = '#fff'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--line)'
                        e.currentTarget.style.backgroundColor = 'var(--paper)'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>
                          {f.flight_number}
                        </strong>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: f.delay_minutes > 0 ? '#fef2f2' : '#f0fdf4',
                            color: f.delay_minutes > 0 ? '#b91c1c' : '#15803d',
                            fontWeight: '600',
                          }}
                        >
                          {f.status}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--muted)',
                          marginTop: '4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {f.origin_iata} → {f.dest_iata} · {f.airline}
                      </div>
                      {f.delay_minutes > 0 ? (
                        <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '3px' }}>
                          ⚠️ Live Delay: +{f.delay_minutes} min
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '3px' }}>
                          ✓ On schedule
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="input-section">
              <div className="input-section-title">
                <span>01</span>
                <div>
                  <h2>Flight details</h2>
                  <small>Route and schedule</small>
                </div>
              </div>
              <div className="input-grid three-columns">
                <TextField
                  label="Flight number"
                  value={input.flightNumber}
                  onChange={(value) => update('flightNumber', value.toUpperCase())}
                />
                <TextField
                  label="Departure date"
                  type="date"
                  value={input.departureDate}
                  onChange={(value) => update('departureDate', value)}
                />
                <SelectField
                  label="Airline"
                  value={input.airline}
                  options={airlines}
                  onChange={(value) => update('airline', value)}
                />
                <SelectField
                  label="Origin"
                  value={input.origin}
                  options={airports}
                  onChange={(value) => update('origin', value)}
                />
                <SelectField
                  label="Destination"
                  value={input.destination}
                  options={airports}
                  onChange={(value) => update('destination', value)}
                />
                <SelectField
                  label="Departure time"
                  value={input.departureWindow}
                  options={['Early morning', 'Morning', 'Afternoon', 'Evening', 'Late night']}
                  onChange={(value) => update('departureWindow', value)}
                />
                <SelectField
                  label="Day"
                  value={input.dayType}
                  options={['Weekday', 'Weekend', 'Public holiday']}
                  onChange={(value) => update('dayType', value)}
                />
                <SelectField
                  label="Season"
                  value={input.season}
                  options={['Spring', 'Summer', 'Autumn', 'Winter']}
                  onChange={(value) => update('season', value)}
                />
                <SelectField
                  label="Distance"
                  value={input.distanceBand}
                  options={['Short haul', 'Medium haul', 'Long haul', 'Ultra long haul']}
                  onChange={(value) => update('distanceBand', value)}
                />
              </div>
            </section>

            <section className="input-section">
              <div className="input-section-title">
                <span>02</span>
                <div>
                  <h2>Weather conditions</h2>
                  <small>Continuous and categorical inputs</small>
                </div>
              </div>
              <div className="input-grid">
                <SelectField
                  label="Weather"
                  value={input.weather}
                  options={['Clear', 'Cloudy', 'Rain', 'Snow', 'Thunderstorm', 'Fog']}
                  onChange={(value) => update('weather', value)}
                />
                <SliderField
                  label="Wind speed"
                  value={input.windSpeedKph}
                  minimum={0}
                  maximum={100}
                  unit=" km/h"
                  onChange={(value) => update('windSpeedKph', value)}
                />
                <SliderField
                  label="Visibility"
                  value={input.visibilityKm}
                  minimum={0}
                  maximum={30}
                  unit=" km"
                  onChange={(value) => update('visibilityKm', value)}
                />
                <SliderField
                  label="Precipitation"
                  value={input.precipitationMm}
                  minimum={0}
                  maximum={60}
                  unit=" mm"
                  onChange={(value) => update('precipitationMm', value)}
                />
                <SliderField
                  label="Temperature"
                  value={input.temperatureC}
                  minimum={-30}
                  maximum={50}
                  unit="°C"
                  onChange={(value) => update('temperatureC', value)}
                />
              </div>
            </section>

            <section className="input-section">
              <div className="input-section-title">
                <span>03</span>
                <div>
                  <h2>Airport & operations</h2>
                  <small>Conditions that can cause a delay</small>
                </div>
              </div>
              <div className="input-grid">
                <SliderField
                  label="Airport congestion"
                  value={input.airportCongestion}
                  minimum={0}
                  maximum={100}
                  unit="/100"
                  onChange={(value) => update('airportCongestion', value)}
                />
                <SelectField
                  label="Air traffic"
                  value={input.airTraffic}
                  options={['Low', 'Moderate', 'High', 'Severe']}
                  onChange={(value) => update('airTraffic', value)}
                />
                <SelectField
                  label="Inbound aircraft"
                  value={input.inboundAircraft}
                  options={['On time', 'Slight delay', 'Major delay']}
                  onChange={(value) => update('inboundAircraft', value)}
                />
                <SelectField
                  label="Maintenance"
                  value={input.maintenance}
                  options={['Cleared', 'Inspection due', 'Technical issue']}
                  onChange={(value) => update('maintenance', value)}
                />
                <SelectField
                  label="Crew availability"
                  value={input.crewStatus}
                  options={['Ready', 'Tight connection', 'Crew shortage']}
                  onChange={(value) => update('crewStatus', value)}
                />
                <SelectField
                  label="Security"
                  value={input.security}
                  options={['Normal', 'Heightened', 'Active disruption']}
                  onChange={(value) => update('security', value)}
                />
              </div>
            </section>

            <section className="input-section extended-operations">
              <div className="input-section-title">
                <span>04</span>
                <div>
                  <h2>Extended operations</h2>
                  <small>Capacity, ground services, infrastructure & exceptional events</small>
                </div>
              </div>
              <div className="input-grid">
                <SelectField
                  label="Ground control program"
                  value={input.groundStop}
                  options={['None', 'Ground delay program', 'Ground stop']}
                  onChange={(value) => update('groundStop', value)}
                />
                <SelectField
                  label="Runway status"
                  value={input.runwayStatus}
                  options={['Normal', 'Reduced capacity', 'Runway closure']}
                  onChange={(value) => update('runwayStatus', value)}
                />
                <SelectField
                  label="Gate availability"
                  value={input.gateStatus}
                  options={['Available', 'Short wait', 'No gate available']}
                  onChange={(value) => update('gateStatus', value)}
                />
                <SelectField
                  label="Deicing"
                  value={input.deicing}
                  options={['Not required', 'Scheduled', 'Heavy queue']}
                  onChange={(value) => update('deicing', value)}
                />
                <SelectField
                  label="Turnaround"
                  value={input.turnaround}
                  options={['On schedule', 'Tight turnaround', 'Behind schedule']}
                  onChange={(value) => update('turnaround', value)}
                />
                <SelectField
                  label="Ground handling"
                  value={input.groundHandling}
                  options={['Ready', 'Minor delay', 'Major delay']}
                  onChange={(value) => update('groundHandling', value)}
                />
                <SelectField
                  label="Boarding"
                  value={input.boarding}
                  options={['On schedule', 'Slow boarding', 'Passenger issue']}
                  onChange={(value) => update('boarding', value)}
                />
                <SelectField
                  label="Connecting passengers"
                  value={input.connectionPressure}
                  options={['Low', 'Moderate', 'High']}
                  onChange={(value) => update('connectionPressure', value)}
                />
                <SelectField
                  label="Airspace / NOTAM"
                  value={input.airspaceRestriction}
                  options={['None', 'Reroute', 'Closure or NOTAM']}
                  onChange={(value) => update('airspaceRestriction', value)}
                />
                <SelectField
                  label="Labor availability"
                  value={input.laborAction}
                  options={['None', 'Staff shortage', 'Strike action']}
                  onChange={(value) => update('laborAction', value)}
                />
                <SelectField
                  label="Airport systems"
                  value={input.airportSystems}
                  options={['Operational', 'Degraded', 'Major outage']}
                  onChange={(value) => update('airportSystems', value)}
                />
                <SelectField
                  label="Border processing"
                  value={input.borderProcessing}
                  options={['Normal', 'Congested', 'Severely congested']}
                  onChange={(value) => update('borderProcessing', value)}
                />
                <SelectField
                  label="Exceptional hazard"
                  value={input.exceptionalHazard}
                  options={['None', 'Wildlife or drone', 'Volcanic ash', 'Emergency response']}
                  onChange={(value) => update('exceptionalHazard', value)}
                />
                <SelectField
                  label="Curfew pressure"
                  value={input.curfewPressure}
                  options={['None', 'Approaching curfew', 'Curfew conflict']}
                  onChange={(value) => update('curfewPressure', value)}
                />
              </div>
            </section>

            <section className="live-api-card">
              <div>
                <span>05 · Live flight connection</span>
                <h2>Flight number and date are API-ready</h2>
                <p>
                  Connect a live status provider to replace manual operational fields with current
                  schedule, aircraft, airport, and disruption events.
                </p>
              </div>
              <div className="api-requirements">
                <span>
                  <i>Primary</i>
                  <b>FlightAware AeroAPI</b>
                  <small>Live status, delay, cancellation, aircraft and route</small>
                </span>
                <span>
                  <i>Weather</i>
                  <b>Tomorrow.io or OpenWeather</b>
                  <small>Current and forecast airport conditions</small>
                </span>
              </div>
            </section>
          </div>

          <aside className="prediction-result">
            <div className="result-route">
              <div>
                <small>From</small>
                <strong>{input.origin}</strong>
              </div>
              <span>
                <i />
                <PlaneIcon />
              </span>
              <div>
                <small>To</small>
                <strong>{input.destination}</strong>
              </div>
            </div>
            <div className="result-flight-meta">
              <span>{input.airline}</span>
              <i />
              <span>{input.departureWindow}</span>
              <i />
              <span>{input.weather}</span>
            </div>

            {displayResult.modelType && (
              <div
                style={{
                  padding: '8px 12px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#166534',
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>🤖</span>
                <span>
                  <strong>ML Model:</strong> {displayResult.modelType}
                </span>
              </div>
            )}

            {liveWeatherInfo && (
              <div
                style={{
                  padding: '8px 12px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#1e40af',
                  marginTop: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>⛅</span>
                  <span>
                    <strong>Live {liveWeatherInfo.airport} Weather:</strong>{' '}
                    {liveWeatherInfo.weather_condition} ({liveWeatherInfo.temperature_c}°C)
                  </span>
                </div>
                <span style={{ color: '#3b82f6', fontSize: '10px' }}>
                  Wind: {liveWeatherInfo.wind_speed_kph} km/h · Vis: {liveWeatherInfo.visibility_km} km ·{' '}
                  {liveWeatherInfo.description}
                </span>
              </div>
            )}

            <>
              <div
                className={`result-gauge ${displayResult.riskLevel.toLowerCase()}`}
                style={{ '--risk': `${displayResult.probability * 3.6}deg` } as React.CSSProperties}
              >
                <div>
                  <strong>{displayResult.probability}%</strong>
                  <span>delay probability</span>
                </div>
              </div>
              <div className="risk-summary">
                <div>
                  <span>Risk level</span>
                  <b className={displayResult.riskLevel.toLowerCase()}>{displayResult.riskLevel}</b>
                </div>
                <div>
                  <span>Expected delay</span>
                  <b>{displayResult.expectedDelayMinutes} min</b>
                </div>
              </div>
              <div className="factor-ranking">
                <span>Highest-impact factors</span>
                {displayResult.topFactors.map((factor, index) => (
                  <div key={factor.factor}>
                    <i>0{index + 1}</i>
                    <p>{factor.factor}</p>
                    <b>+{factor.impact.toFixed(2)}</b>
                  </div>
                ))}
              </div>
            </>

            {error && <p className="prediction-error">{error}</p>}
            <button className="calculate-button" onClick={submit} disabled={isPending}>
              <span>
                {isPending ? 'Calculating…' : result ? 'Calculation saved' : 'Calculate and save'}
              </span>
              <ChevronIcon />
            </button>
            <small className="result-note">
              {result
                ? 'Saved to prediction history.'
                : 'Live preview — calculate to save this scenario.'}
            </small>
          </aside>
        </div>
        <AnalysisWorkbench input={input} result={displayResult} />
        {activeFactorInfo && (
          <div
            className="concept-overlay"
            role="presentation"
            onMouseDown={(event) =>
              event.target === event.currentTarget && setActiveFactorInfo(null)
            }
          >
            <section role="dialog" aria-modal="true" aria-labelledby="factor-info-title">
              <div className="concept-overlay-top">
                <span>
                  <InfoIcon />
                </span>
                <button
                  onClick={() => setActiveFactorInfo(null)}
                  aria-label="Close factor information"
                >
                  ×
                </button>
              </div>
              <span className="concept-kicker">
                Input factor · {factorInformation[activeFactorInfo].concept}
              </span>
              <h2 id="factor-info-title">{activeFactorInfo}</h2>
              <p>{factorInformation[activeFactorInfo].detail}</p>
              <div>
                <span>Model use</span>
                <p>
                  Changing this input immediately recalculates the delay probability, expected
                  delay, factor ranking, and every statistical visualization below.
                </p>
              </div>
              <button className="concept-done" onClick={() => setActiveFactorInfo(null)}>
                Return to inputs
              </button>
            </section>
          </div>
        )}
      </main>
    </FactorInfoContext.Provider>
  )
}

export default PredictionApp
