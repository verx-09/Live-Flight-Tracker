'use client'

import { useMemo, useState } from 'react'
import type { Flight } from '@/payload-types'

type View = 'overview' | 'distributions' | 'inference' | 'regression' | 'flights'

const views: { id: View; label: string; number: string }[] = [
  { id: 'overview', label: 'Overview', number: '01' },
  { id: 'distributions', label: 'Distributions', number: '02' },
  { id: 'inference', label: 'Inference', number: '03' },
  { id: 'regression', label: 'Regression', number: '04' },
  { id: 'flights', label: 'Flight data', number: '05' },
]

const mean = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)
const variance = (values: number[]) => {
  const avg = mean(values)
  return values.length > 1
    ? values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1)
    : 0
}
const standardDeviation = (values: number[]) => Math.sqrt(variance(values))
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : mean([sorted[middle - 1], sorted[middle]])
}
const quantile = (values: number[], q: number) => {
  const sorted = [...values].sort((a, b) => a - b)
  const position = (sorted.length - 1) * q
  const base = Math.floor(position)
  const rest = position - base
  return (
    sorted[base] + (sorted[base + 1] !== undefined ? rest * (sorted[base + 1] - sorted[base]) : 0)
  )
}
const correlation = (x: number[], y: number[]) => {
  const mx = mean(x)
  const my = mean(y)
  const numerator = x.reduce((sum, value, i) => sum + (value - mx) * (y[i] - my), 0)
  const denominator = Math.sqrt(
    x.reduce((sum, value) => sum + (value - mx) ** 2, 0) *
      y.reduce((sum, value) => sum + (value - my) ** 2, 0),
  )
  return denominator ? numerator / denominator : 0
}
const ranks = (values: number[]) =>
  values.map((value) => [...values].sort((a, b) => a - b).indexOf(value) + 1)
const format = (value: number, digits = 1) =>
  Number.isFinite(value) ? value.toFixed(digits) : '0.0'
const erf = (x: number) => {
  const sign = x < 0 ? -1 : 1
  const a = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * a)
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-a * a)
  return sign * y
}
const normalCdf = (z: number) => (1 + erf(z / Math.sqrt(2))) / 2

function solveLinear(matrix: number[][], values: number[]) {
  const size = values.length
  const augmented = matrix.map((row, index) => [...row, values[index]])
  for (let i = 0; i < size; i++) {
    let max = i
    for (let j = i + 1; j < size; j++)
      if (Math.abs(augmented[j][i]) > Math.abs(augmented[max][i])) max = j
    ;[augmented[i], augmented[max]] = [augmented[max], augmented[i]]
    const pivot = augmented[i][i] || 1e-10
    for (let j = i; j <= size; j++) augmented[i][j] /= pivot
    for (let k = 0; k < size; k++) {
      if (k === i) continue
      const factor = augmented[k][i]
      for (let j = i; j <= size; j++) augmented[k][j] -= factor * augmented[i][j]
    }
  }
  return augmented.map((row) => row[size])
}

function multipleRegression(flights: Flight[]) {
  const weatherScore: Record<Flight['weather'], number> = {
    Clear: 0,
    Cloudy: 1,
    Rain: 2,
    Snow: 3,
    Thunderstorm: 4,
  }
  const rows = flights.map((flight) => [
    1,
    flight.airportCongestion,
    flight.windSpeedKph,
    flight.visibilityKm,
    weatherScore[flight.weather],
  ])
  const y = flights.map((flight) => flight.delayMinutes)
  const xtx = Array.from({ length: 5 }, (_, i) =>
    Array.from({ length: 5 }, (_, j) => rows.reduce((sum, row) => sum + row[i] * row[j], 0)),
  )
  const xty = Array.from({ length: 5 }, (_, i) =>
    rows.reduce((sum, row, index) => sum + row[i] * y[index], 0),
  )
  return solveLinear(xtx, xty)
}

function PlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21.5 15.5 13 12l-2-9-2 1v7L3.5 9 2 10.5l7 5V20l-2 1v1l5-1 5 1v-1l-2-1v-4.5l7-4V9.8l-.5 5.7Z" />
    </svg>
  )
}

function Metric({
  label,
  value,
  note,
  accent = false,
}: {
  label: string
  value: string
  note: string
  accent?: boolean
}) {
  return (
    <div className={`metric ${accent ? 'accent' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  )
}

function SectionTitle({ index, title, meta }: { index: string; title: string; meta: string }) {
  return (
    <div className="section-title">
      <div>
        <span>{index}</span>
        <h2>{title}</h2>
      </div>
      <p>{meta}</p>
    </div>
  )
}

function FlightDashboard({ flights }: { flights: Flight[] }) {
  const [view, setView] = useState<View>('overview')
  const [carrier, setCarrier] = useState('All carriers')
  const [weather, setWeather] = useState('All weather')
  const [forecastWeather, setForecastWeather] = useState<Flight['weather']>('Rain')
  const [forecastCongestion, setForecastCongestion] = useState(65)
  const [forecastWind, setForecastWind] = useState(24)
  const [forecastVisibility, setForecastVisibility] = useState(8)

  const filtered = useMemo(
    () =>
      flights.filter(
        (flight) =>
          (carrier === 'All carriers' || flight.carrier === carrier) &&
          (weather === 'All weather' || flight.weather === weather),
      ),
    [flights, carrier, weather],
  )

  const stats = useMemo(() => {
    const delays = filtered.map((flight) => flight.delayMinutes)
    const avg = mean(delays)
    const med = median(delays)
    const mode =
      [...delays].sort(
        (a, b) => delays.filter((v) => v === b).length - delays.filter((v) => v === a).length,
      )[0] ?? 0
    const sd = standardDeviation(delays)
    const delayed = filtered.filter((flight) => flight.delayMinutes >= 15)
    const adverse = filtered.filter((flight) =>
      ['Rain', 'Snow', 'Thunderstorm'].includes(flight.weather),
    )
    const adverseDelayed = adverse.filter((flight) => flight.delayMinutes >= 15)
    const sorted = [...delays].sort((a, b) => a - b)
    const bins = [0, 15, 30, 45, 60, 90].map((start, index, all) => ({
      label: index === all.length - 1 ? '90+' : `${start}–${all[index + 1] ?? 90}`,
      count: delays.filter(
        (value) => value >= start && (index === all.length - 1 || value < all[index + 1]),
      ).length,
    }))
    const carrierGroups = [...new Set(filtered.map((flight) => flight.carrier))].map((name) => {
      const values = filtered
        .filter((flight) => flight.carrier === name)
        .map((flight) => flight.delayMinutes)
      return { name, avg: mean(values), count: values.length }
    })
    const congestion = filtered.map((flight) => flight.airportCongestion)
    const wind = filtered.map((flight) => flight.windSpeedKph)
    const visibility = filtered.map((flight) => flight.visibilityKm)
    const r = correlation(congestion, delays)
    const slope = r * (standardDeviation(delays) / Math.max(standardDeviation(congestion), 0.001))
    const intercept = avg - slope * mean(congestion)
    const fitted = congestion.map((value) => intercept + slope * value)
    const residualSS = delays.reduce((sum, value, index) => sum + (value - fitted[index]) ** 2, 0)
    const totalSS = delays.reduce((sum, value) => sum + (value - avg) ** 2, 0)
    const regressionSE = Math.sqrt(residualSS / Math.max(delays.length - 2, 1))
    const t = (avg - 15) / Math.max(sd / Math.sqrt(delays.length), 0.001)
    const groups = carrierGroups.map((group) =>
      filtered
        .filter((flight) => flight.carrier === group.name)
        .map((flight) => flight.delayMinutes),
    )
    const between = groups.reduce((sum, group) => sum + group.length * (mean(group) - avg) ** 2, 0)
    const within = groups.reduce(
      (sum, group) => sum + group.reduce((s, value) => s + (value - mean(group)) ** 2, 0),
      0,
    )
    const f =
      between /
      Math.max(groups.length - 1, 1) /
      (within / Math.max(delays.length - groups.length, 1))
    const chiObserved = [
      adverseDelayed.length,
      adverse.length - adverseDelayed.length,
      delayed.length - adverseDelayed.length,
      filtered.length - adverse.length - delayed.length + adverseDelayed.length,
    ]
    const row1 = adverse.length,
      row2 = filtered.length - adverse.length,
      col1 = delayed.length,
      col2 = filtered.length - delayed.length
    const expected = [row1 * col1, row1 * col2, row2 * col1, row2 * col2].map(
      (v) => v / Math.max(filtered.length, 1),
    )
    const chi = chiObserved.reduce(
      (sum, value, i) => sum + (value - expected[i]) ** 2 / Math.max(expected[i], 0.001),
      0,
    )
    const sampleMeans = Array.from({ length: Math.min(8, Math.floor(delays.length / 4)) }, (_, i) =>
      mean(delays.slice(i * 4, i * 4 + 4)),
    )
    return {
      delays,
      avg,
      med,
      mode,
      sd,
      delayed,
      adverse,
      adverseDelayed,
      sorted,
      bins,
      carrierGroups,
      congestion,
      wind,
      visibility,
      variance: variance(delays),
      cv: avg ? (sd / avg) * 100 : 0,
      q1: quantile(delays, 0.25),
      q3: quantile(delays, 0.75),
      delayRate: delayed.length / Math.max(filtered.length, 1),
      conditional: adverseDelayed.length / Math.max(adverse.length, 1),
      bayes: adverseDelayed.length / Math.max(delayed.length, 1),
      r,
      spearman: correlation(ranks(congestion), ranks(delays)),
      slope,
      intercept,
      r2: totalSS ? 1 - residualSS / totalSS : 0,
      regressionSE,
      t,
      p: 2 * (1 - normalCdf(Math.abs(t))),
      f,
      chi,
      sampleMeans,
      se: sd / Math.sqrt(Math.max(delays.length, 1)),
      coefficients: filtered.length >= 6 ? multipleRegression(filtered) : [0, 0, 0, 0, 0],
    }
  }, [filtered])

  const prediction = useMemo(() => {
    const weatherScore: Record<Flight['weather'], number> = {
      Clear: 0,
      Cloudy: 1,
      Rain: 2,
      Snow: 3,
      Thunderstorm: 4,
    }
    const [b0, bc, bw, bv, bweather] = stats.coefficients
    const minutes = Math.max(
      0,
      b0 +
        bc * forecastCongestion +
        bw * forecastWind +
        bv * forecastVisibility +
        bweather * weatherScore[forecastWeather],
    )
    const probability = 1 / (1 + Math.exp(-(minutes - 15) / 9))
    return { minutes, probability }
  }, [stats.coefficients, forecastCongestion, forecastWind, forecastVisibility, forecastWeather])

  if (!flights.length)
    return (
      <main className="empty-state">
        <PlaneIcon />
        <h1>No flight records yet</h1>
        <p>Add flights in the Payload admin panel to populate the analysis.</p>
        <a href="/admin">Open admin</a>
      </main>
    )

  const maxBin = Math.max(...stats.bins.map((bin) => bin.count), 1)
  const maxCarrier = Math.max(...stats.carrierGroups.map((group) => group.avg), 1)

  return (
    <div className="dashboard-shell">
      <aside className="app-nav">
        <div className="app-brand">
          <span>
            <PlaneIcon />
          </span>
          <div>
            <b>FlightStat</b>
            <small>Delay intelligence</small>
          </div>
        </div>
        <nav aria-label="Analytics views">
          <p>Analysis</p>
          {views.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? 'active' : ''}
              onClick={() => setView(item.id)}
            >
              <span>{item.number}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="nav-status">
          <i />
          <div>
            <b>Payload connected</b>
            <small>{flights.length} persisted records</small>
          </div>
        </div>
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <div className="mobile-logo">
            <span>
              <PlaneIcon />
            </span>
            <b>FlightStat</b>
          </div>
          <div className="dataset-label">
            <i /> Historical operations dataset
          </div>
          <div className="header-actions">
            <a href="/admin">Manage data</a>
            <span>{filtered.length} flights</span>
          </div>
        </header>

        <div className="workspace-body">
          <section className="dashboard-intro">
            <div>
              <span className="overline">Flight delay probability prediction</span>
              <h1>Statistical flight operations dashboard</h1>
            </div>
            <div className="filters">
              <label>
                Carrier
                <select value={carrier} onChange={(e) => setCarrier(e.target.value)}>
                  <option>All carriers</option>
                  {[...new Set(flights.map((flight) => flight.carrier))].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label>
                Weather
                <select value={weather} onChange={(e) => setWeather(e.target.value)}>
                  <option>All weather</option>
                  {[...new Set(flights.map((flight) => flight.weather))].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <div className="mobile-tabs">
            {views.map((item) => (
              <button
                key={item.id}
                className={view === item.id ? 'active' : ''}
                onClick={() => setView(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {view === 'overview' && (
            <>
              <SectionTitle
                index="01"
                title="Operational summary"
                meta="Descriptive statistics · probability rules · engineering risk"
              />
              <section className="metric-grid">
                <Metric
                  label="Mean delay"
                  value={`${format(stats.avg)} min`}
                  note={`Median ${format(stats.med)} · Mode ${stats.mode}`}
                  accent
                />
                <Metric
                  label="Delay probability"
                  value={`${format(stats.delayRate * 100, 0)}%`}
                  note={`Complement ${format((1 - stats.delayRate) * 100, 0)}% on time`}
                />
                <Metric
                  label="Standard deviation"
                  value={`${format(stats.sd)} min`}
                  note={`Variance ${format(stats.variance)} min²`}
                />
                <Metric
                  label="Coefficient of variation"
                  value={`${format(stats.cv, 0)}%`}
                  note="Relative operational spread"
                />
              </section>
              <section className="dashboard-grid overview-grid">
                <div className="panel histogram-panel">
                  <div className="panel-head">
                    <div>
                      <span>Frequency distribution</span>
                      <h3>Delay minutes</h3>
                    </div>
                    <small>Histogram</small>
                  </div>
                  <div className="histogram">
                    {stats.bins.map((bin) => (
                      <div key={bin.label}>
                        <b>{bin.count}</b>
                        <i style={{ height: `${Math.max(8, (bin.count / maxBin) * 100)}%` }} />
                        <span>{bin.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="panel probability-panel">
                  <div className="panel-head">
                    <div>
                      <span>Conditional probability</span>
                      <h3>Weather impact</h3>
                    </div>
                    <small>Bayes</small>
                  </div>
                  <div
                    className="probability-ring"
                    style={
                      { '--probability': `${stats.conditional * 360}deg` } as React.CSSProperties
                    }
                  >
                    <div>
                      <strong>{format(stats.conditional * 100, 0)}%</strong>
                      <span>P(delay | adverse)</span>
                    </div>
                  </div>
                  <div className="probability-row">
                    <span>
                      <b>{format(stats.bayes * 100, 0)}%</b>P(adverse | delay)
                    </span>
                    <span>
                      <b>{stats.adverse.length}</b>adverse flights
                    </span>
                  </div>
                </div>
                <div className="panel box-panel">
                  <div className="panel-head">
                    <div>
                      <span>Five-number summary</span>
                      <h3>Delay spread</h3>
                    </div>
                    <small>Box plot</small>
                  </div>
                  <div className="box-scale">
                    <div
                      className="box-whisker"
                      style={{
                        left: `${(stats.sorted[0] / Math.max(...stats.sorted)) * 100}%`,
                        right: 0,
                      }}
                    >
                      <i
                        style={{
                          left: `${(stats.q1 / Math.max(...stats.sorted)) * 100}%`,
                          width: `${((stats.q3 - stats.q1) / Math.max(...stats.sorted)) * 100}%`,
                        }}
                      >
                        <b
                          style={{
                            left: `${((stats.med - stats.q1) / Math.max(stats.q3 - stats.q1, 1)) * 100}%`,
                          }}
                        />
                      </i>
                    </div>
                  </div>
                  <div className="quartiles">
                    <span>
                      Min <b>{stats.sorted[0]}</b>
                    </span>
                    <span>
                      Q1 <b>{format(stats.q1, 0)}</b>
                    </span>
                    <span>
                      Median <b>{format(stats.med, 0)}</b>
                    </span>
                    <span>
                      Q3 <b>{format(stats.q3, 0)}</b>
                    </span>
                    <span>
                      Max <b>{stats.sorted.at(-1)}</b>
                    </span>
                  </div>
                </div>
              </section>
            </>
          )}

          {view === 'distributions' && (
            <>
              <SectionTitle
                index="02"
                title="Probability distributions"
                meta="PMF · PDF · CDF · Bernoulli · Binomial · Poisson · Uniform · Exponential"
              />
              <section className="dashboard-grid distribution-panels">
                <div className="panel pmf-panel">
                  <div className="panel-head">
                    <div>
                      <span>Discrete random variable</span>
                      <h3>Delay category PMF</h3>
                    </div>
                    <small>ΣP(x) = 1</small>
                  </div>
                  <div className="pmf-bars">
                    {stats.bins.slice(0, 5).map((bin) => (
                      <div key={bin.label}>
                        <i
                          style={{
                            height: `${(bin.count / Math.max(filtered.length, 1)) * 260}px`,
                          }}
                        >
                          <b>{format(bin.count / Math.max(filtered.length, 1), 2)}</b>
                        </i>
                        <span>{bin.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="panel cdf-panel">
                  <div className="panel-head">
                    <div>
                      <span>Continuous random variable</span>
                      <h3>Empirical CDF</h3>
                    </div>
                    <small>F(x) = P(X ≤ x)</small>
                  </div>
                  <svg
                    viewBox="0 0 440 220"
                    role="img"
                    aria-label="Cumulative distribution of delay minutes"
                  >
                    <path className="chart-axis" d="M35 15v175h390" />
                    <polyline
                      points={stats.sorted
                        .map(
                          (value, i) =>
                            `${35 + (value / Math.max(...stats.sorted)) * 380},${190 - ((i + 1) / stats.sorted.length) * 165}`,
                        )
                        .join(' ')}
                    />
                    <text x="34" y="210">
                      0 min
                    </text>
                    <text x="370" y="210">
                      {stats.sorted.at(-1)} min
                    </text>
                    <text x="7" y="24">
                      1.0
                    </text>
                  </svg>
                </div>
                <div className="panel family-panel">
                  <div className="panel-head">
                    <div>
                      <span>Fitted family outputs</span>
                      <h3>Flight-event models</h3>
                    </div>
                    <small>E[X] · Var(X)</small>
                  </div>
                  <div className="family-grid">
                    <div>
                      <span>Bernoulli</span>
                      <b>p = {format(stats.delayRate, 2)}</b>
                      <small>single flight delayed</small>
                    </div>
                    <div>
                      <span>Binomial n=10</span>
                      <b>E[X] = {format(stats.delayRate * 10)}</b>
                      <small>delays in next 10</small>
                    </div>
                    <div>
                      <span>Poisson</span>
                      <b>λ = {format(stats.delayed.length / 8)}</b>
                      <small>delays per operating day</small>
                    </div>
                    <div>
                      <span>Uniform</span>
                      <b>
                        U({stats.sorted[0]}, {stats.sorted.at(-1)})
                      </b>
                      <small>bounded baseline</small>
                    </div>
                    <div>
                      <span>Exponential</span>
                      <b>λ = {format(1 / Math.max(stats.avg, 0.1), 3)}</b>
                      <small>delay-time rate</small>
                    </div>
                    <div>
                      <span>Expectation</span>
                      <b>{format(stats.avg)} min</b>
                      <small>variance {format(stats.variance)}</small>
                    </div>
                  </div>
                </div>
                <div className="panel carrier-panel">
                  <div className="panel-head">
                    <div>
                      <span>Qualitative × quantitative</span>
                      <h3>Carrier mean delay</h3>
                    </div>
                    <small>Bar chart</small>
                  </div>
                  <div className="carrier-bars">
                    {stats.carrierGroups.map((group) => (
                      <div key={group.name}>
                        <span>{group.name}</span>
                        <i>
                          <b style={{ width: `${(group.avg / maxCarrier) * 100}%` }} />
                        </i>
                        <strong>{format(group.avg)}m</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )}

          {view === 'inference' && (
            <>
              <SectionTitle
                index="03"
                title="Sampling & inference"
                meta="Normal theory · CLT · estimation · Z/t · χ² · one-way ANOVA"
              />
              <section className="metric-grid inference-metrics">
                <Metric
                  label="95% confidence interval"
                  value={`${format(stats.avg - 2.04 * stats.se)}–${format(stats.avg + 2.04 * stats.se)} min`}
                  note="t interval · σ unknown"
                  accent
                />
                <Metric
                  label="Standard error"
                  value={`${format(stats.se, 2)} min`}
                  note={`n = ${filtered.length} random records`}
                />
                <Metric
                  label="One-sample t"
                  value={format(stats.t, 2)}
                  note={`H₀: μ = 15 · p ≈ ${format(stats.p, 3)}`}
                />
                <Metric
                  label="Quality tolerance"
                  value={`${filtered.filter((flight) => flight.delayMinutes <= 30).length}/${filtered.length}`}
                  note="Flights within 30 minutes"
                />
              </section>
              <section className="dashboard-grid inference-grid">
                <div className="panel normal-panel">
                  <div className="panel-head">
                    <div>
                      <span>Standard normal</span>
                      <h3>Delay tolerance curve</h3>
                    </div>
                    <small>One & two tails</small>
                  </div>
                  <svg
                    viewBox="0 0 450 230"
                    role="img"
                    aria-label="Normal distribution with tail beyond 30 minutes"
                  >
                    <defs>
                      <linearGradient id="normalTail">
                        <stop offset="0" stopColor="#e06b3c" stopOpacity=".1" />
                        <stop offset="1" stopColor="#e06b3c" stopOpacity=".8" />
                      </linearGradient>
                    </defs>
                    <path className="normal-area" d="M316 188c31-73 58-29 105-3v3Z" />
                    <path className="chart-axis" d="M25 188h400" />
                    <path
                      className="normal-line"
                      d="M26 187c86 0 112-8 147-105 18-50 48-50 66 0 35 97 61 105 185 105"
                    />
                    <path className="normal-marker" d="M206 38v150M316 115v73" />
                    <text x="194" y="210">
                      μ {format(stats.avg)}
                    </text>
                    <text x="302" y="210">
                      30 min
                    </text>
                    <text x="345" y="121">
                      tail
                    </text>
                  </svg>
                </div>
                <div className="panel clt-panel">
                  <div className="panel-head">
                    <div>
                      <span>Central Limit Theorem</span>
                      <h3>Sample mean distribution</h3>
                    </div>
                    <small>n = 4 per sample</small>
                  </div>
                  <div className="sample-means">
                    {stats.sampleMeans.map((value, index) => (
                      <div key={index}>
                        <i
                          style={{
                            height: `${20 + (value / Math.max(...stats.sampleMeans)) * 105}px`,
                          }}
                        />
                        <span>x̄{index + 1}</span>
                        <b>{format(value)}</b>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="panel test-panel">
                  <div className="panel-head">
                    <div>
                      <span>Hypothesis test matrix</span>
                      <h3>Operational tests</h3>
                    </div>
                    <small>α = 0.05</small>
                  </div>
                  <div className="test-rows">
                    <div>
                      <span>One-sample t-test</span>
                      <b>t = {format(stats.t, 2)}</b>
                      <em className={stats.p < 0.05 ? 'reject' : ''}>
                        {stats.p < 0.05 ? 'Reject H₀' : 'Do not reject'}
                      </em>
                    </div>
                    <div>
                      <span>χ² weather × delay</span>
                      <b>χ² = {format(stats.chi, 2)}</b>
                      <em className={stats.chi > 3.84 ? 'reject' : ''}>
                        {stats.chi > 3.84 ? 'Associated' : 'Independent'}
                      </em>
                    </div>
                    <div>
                      <span>One-way ANOVA</span>
                      <b>F = {format(stats.f, 2)}</b>
                      <em className={stats.f > 2.7 ? 'reject' : ''}>
                        {stats.f > 2.7 ? 'Carrier effect' : 'No carrier effect'}
                      </em>
                    </div>
                    <div>
                      <span>Error control</span>
                      <b>Type I α = .05</b>
                      <em>Type II β monitored</em>
                    </div>
                  </div>
                </div>
                <div className="panel approximation-panel">
                  <div className="panel-head">
                    <div>
                      <span>Normal approximations</span>
                      <h3>Next 100 departures</h3>
                    </div>
                    <small>Continuity corrected</small>
                  </div>
                  <div className="approx-stats">
                    <div>
                      <span>Binomial → Normal</span>
                      <b>μ = {format(stats.delayRate * 100)}</b>
                      <small>
                        σ = {format(Math.sqrt(100 * stats.delayRate * (1 - stats.delayRate)))}
                      </small>
                    </div>
                    <div>
                      <span>Poisson → Normal</span>
                      <b>λ = {format(stats.delayRate * 100)}</b>
                      <small>σ = {format(Math.sqrt(stats.delayRate * 100))}</small>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {view === 'regression' && (
            <>
              <SectionTitle
                index="04"
                title="Correlation & regression"
                meta="Pearson · Spearman · single/multiple regression · least squares · curve fit"
              />
              <section className="regression-layout">
                <div className="panel scatter-panel">
                  <div className="panel-head">
                    <div>
                      <span>Least-squares line</span>
                      <h3>Congestion vs delay</h3>
                    </div>
                    <small>
                      ŷ = {format(stats.intercept)} + {format(stats.slope, 2)}x
                    </small>
                  </div>
                  <svg
                    viewBox="0 0 620 330"
                    role="img"
                    aria-label="Scatter plot of airport congestion and flight delay"
                  >
                    <path
                      className="chart-grid"
                      d="M50 30v250h540M50 230h540M50 180h540M50 130h540M50 80h540"
                    />
                    <line
                      className="fit-line"
                      x1="65"
                      y1={
                        280 -
                        ((stats.intercept + stats.slope * 20) / Math.max(...stats.delays)) * 240
                      }
                      x2="575"
                      y2={
                        280 -
                        ((stats.intercept + stats.slope * 90) / Math.max(...stats.delays)) * 240
                      }
                    />
                    {filtered.map((flight) => (
                      <circle
                        key={flight.id}
                        cx={50 + (flight.airportCongestion / 100) * 540}
                        cy={280 - (flight.delayMinutes / Math.max(...stats.delays)) * 240}
                        r="6"
                      >
                        <title>
                          {flight.flightNumber}: {flight.delayMinutes} min
                        </title>
                      </circle>
                    ))}
                    <text x="245" y="320">
                      Airport congestion index
                    </text>
                    <text x="6" y="20">
                      Delay
                    </text>
                  </svg>
                </div>
                <div className="regression-side">
                  <div className="panel correlation-panel">
                    <div className="panel-head">
                      <div>
                        <span>Association</span>
                        <h3>Model fit</h3>
                      </div>
                    </div>
                    <div className="correlation-stats">
                      <div>
                        <span>Pearson r</span>
                        <b>{format(stats.r, 3)}</b>
                      </div>
                      <div>
                        <span>Spearman ρ</span>
                        <b>{format(stats.spearman, 3)}</b>
                      </div>
                      <div>
                        <span>R²</span>
                        <b>{format(stats.r2, 3)}</b>
                      </div>
                      <div>
                        <span>Std. error</span>
                        <b>{format(stats.regressionSE)}m</b>
                      </div>
                    </div>
                  </div>
                  <div className="panel coefficients-panel">
                    <div className="panel-head">
                      <div>
                        <span>Multiple regression</span>
                        <h3>OLS coefficients</h3>
                      </div>
                      <small>5-factor fit</small>
                    </div>
                    <div className="coefficient-list">
                      {[
                        'Intercept',
                        'Congestion',
                        'Wind speed',
                        'Visibility',
                        'Weather severity',
                      ].map((label, i) => (
                        <div key={label}>
                          <span>{label}</span>
                          <b className={stats.coefficients[i] >= 0 ? 'positive' : ''}>
                            {stats.coefficients[i] >= 0 ? '+' : ''}
                            {format(stats.coefficients[i], 2)}
                          </b>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="panel predictor-panel">
                  <div className="panel-head">
                    <div>
                      <span>Multiple-regression forecast</span>
                      <h3>Delay probability</h3>
                    </div>
                    <small>Applied model</small>
                  </div>
                  <div className="predictor-body">
                    <div className="predictor-controls">
                      <label>
                        Weather
                        <select
                          value={forecastWeather}
                          onChange={(e) => setForecastWeather(e.target.value as Flight['weather'])}
                        >
                          {['Clear', 'Cloudy', 'Rain', 'Snow', 'Thunderstorm'].map((value) => (
                            <option key={value}>{value}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Congestion <b>{forecastCongestion}</b>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={forecastCongestion}
                          onChange={(e) => setForecastCongestion(Number(e.target.value))}
                        />
                      </label>
                      <label>
                        Wind speed <b>{forecastWind} km/h</b>
                        <input
                          type="range"
                          min="0"
                          max="60"
                          value={forecastWind}
                          onChange={(e) => setForecastWind(Number(e.target.value))}
                        />
                      </label>
                      <label>
                        Visibility <b>{forecastVisibility} km</b>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={forecastVisibility}
                          onChange={(e) => setForecastVisibility(Number(e.target.value))}
                        />
                      </label>
                    </div>
                    <div className="prediction-output">
                      <div
                        className="probability-ring large"
                        style={
                          {
                            '--probability': `${prediction.probability * 360}deg`,
                          } as React.CSSProperties
                        }
                      >
                        <div>
                          <strong>{format(prediction.probability * 100, 0)}%</strong>
                          <span>delay probability</span>
                        </div>
                      </div>
                      <p>
                        <span>Estimated delay</span>
                        <b>{format(prediction.minutes)} min</b>
                        <small>OLS curve fit from current filtered records</small>
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {view === 'flights' && (
            <>
              <SectionTitle
                index="05"
                title="Flight records"
                meta="Qualitative · quantitative · discrete · continuous variables"
              />
              <div className="panel data-panel">
                <div className="panel-head">
                  <div>
                    <span>Payload backend</span>
                    <h3>Operational dataset</h3>
                  </div>
                  <small>{filtered.length} rows</small>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Flight</th>
                        <th>Route</th>
                        <th>Scheduled</th>
                        <th>Weather</th>
                        <th>Congestion</th>
                        <th>Cause</th>
                        <th>Delay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((flight) => (
                        <tr key={flight.id}>
                          <td>
                            <b>{flight.flightNumber}</b>
                            <small>{flight.carrier}</small>
                          </td>
                          <td>
                            {flight.origin} <span>→</span> {flight.destination}
                            <small>{flight.distanceKm} km</small>
                          </td>
                          <td>
                            {new Date(flight.scheduledDeparture).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                            <small>
                              {new Date(flight.scheduledDeparture).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </small>
                          </td>
                          <td>
                            {flight.weather}
                            <small>{flight.windSpeedKph} km/h wind</small>
                          </td>
                          <td>
                            <i className="congestion-bar">
                              <b style={{ width: `${flight.airportCongestion}%` }} />
                            </i>
                            <small>{flight.airportCongestion}/100</small>
                          </td>
                          <td>{flight.delayCause}</td>
                          <td>
                            <em className={flight.delayMinutes >= 15 ? 'late' : ''}>
                              {flight.delayMinutes} min
                            </em>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default FlightDashboard
