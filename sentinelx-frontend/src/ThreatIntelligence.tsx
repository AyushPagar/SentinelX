
import { useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Clock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Search,
  Radar,
} from 'lucide-react'
import './ThreatIntelligence.css'

type SecurityEvent = {
  id?: string
  eventType: string
  sourceIp: string
  destinationIp?: string
  severity: string
  message: string
  timestamp?: string
}

type ThreatRecord = {
  sourceIp: string
  events: SecurityEvent[]
  score: number
  level: string
  reasons: string[]
  latestTime: number
}

function calculateThreat(events: SecurityEvent[]): ThreatRecord {
  const sourceIp = events[0].sourceIp
  const reasons: string[] = []

  const severityWeight: Record<string, number> = {
    LOW: 10,
    MEDIUM: 25,
    HIGH: 40,
    CRITICAL: 60,
  }

  const maxSeverity = Math.max(
    ...events.map(event =>
      severityWeight[event.severity?.toUpperCase()] ?? 10
    )
  )

  let score = maxSeverity

  const types = events.map(event => event.eventType.toUpperCase())

  if (types.some(type => type.includes('RANSOMWARE'))) {
    score += 25
    reasons.push('Ransomware-related event recorded')
  }

  if (
    types.some(
      type =>
        type.includes('BRUTE_FORCE') ||
        type.includes('FAILED_LOGIN')
    )
  ) {
    score += 20
    reasons.push('Login attack indicators recorded')
  }

  if (
    types.some(
      type => type.includes('SCAN') || type.includes('UNAUTHORIZED')
    )
  ) {
    score += 10
    reasons.push('Scanning or unauthorized-access indicators recorded')
  }

  if (events.length >= 5) {
    score += 15
    reasons.push(`${events.length} events recorded for this source IP`)
  } else if (events.length >= 3) {
    score += 10
    reasons.push(`${events.length} events recorded for this source IP`)
  } else if (events.length === 2) {
    score += 5
    reasons.push('Repeated activity recorded for this source IP')
  }

  if (reasons.length === 0) {
    reasons.push('Score is primarily based on recorded event severity')
  }

  score = Math.min(100, score)

  const level =
    score >= 75 ? 'CRITICAL' :
    score >= 50 ? 'HIGH' :
    score >= 25 ? 'MEDIUM' : 'LOW'

  const latestTime = Math.max(
    ...events.map(event => {
      const time = event.timestamp
        ? new Date(event.timestamp).getTime()
        : 0

      return Number.isNaN(time) ? 0 : time
    })
  )

  return {
    sourceIp,
    events,
    score,
    level,
    reasons,
    latestTime,
  }
}

function buildThreatRecords(events: SecurityEvent[]): ThreatRecord[] {
  const grouped = new Map<string, SecurityEvent[]>()

  for (const event of events) {
    const ip = event.sourceIp?.trim()

    if (!ip) continue

    const existing = grouped.get(ip) ?? []
    existing.push(event)
    grouped.set(ip, existing)
  }

  return Array.from(grouped.values())
    .map(calculateThreat)
    .sort((a, b) => b.score - a.score)
}

function formatTime(timestamp?: string) {
  if (!timestamp) return 'Time unavailable'

  const date = new Date(timestamp)

  return Number.isNaN(date.getTime())
    ? 'Time unavailable'
    : date.toLocaleString()
}

export default function ThreatIntelligence() {
  const [threats, setThreats] = useState<ThreatRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [selectedIp, setSelectedIp] = useState<string | null>(null)

  async function loadThreats() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/events')

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`)
      }

      const data: SecurityEvent[] = await response.json()
      setThreats(buildThreatRecords(data))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load threat data.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadThreats()
  }, [])

  const filteredThreats = threats.filter(threat => {
    const matchesSearch =
      threat.sourceIp.toLowerCase().includes(search.toLowerCase()) ||
      threat.events.some(event =>
        `${event.eventType} ${event.message}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )

    const matchesFilter =
      filter === 'ALL' || threat.level === filter

    return matchesSearch && matchesFilter
  })

  const criticalCount = threats.filter(
    threat => threat.level === 'CRITICAL'
  ).length

  const highCount = threats.filter(
    threat => threat.level === 'HIGH'
  ).length

  const highestScore = threats.length
    ? Math.max(...threats.map(threat => threat.score))
    : 0

  return (
    <section className="ti-page">
      <header className="ti-header">
        <div>
          <div className="ti-eyebrow">
            <Radar size={15} />
            SENTINELX / THREAT INTELLIGENCE
          </div>

          <h1>Threat Intelligence</h1>

          <p>
            Review source IP activity, inspect risk indicators, and
            prioritize suspicious security events.
          </p>
        </div>

        <button
          className="ti-refresh"
          onClick={() => void loadThreats()}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={loading ? 'ti-spin' : ''}
          />
          Refresh
        </button>
      </header>

      <div className="ti-notice">
        <ShieldCheck size={18} />
        <span>
          Risk scores are generated locally from event severity,
          event types, and event counts. This is not a live reputation
          lookup of the IP address.
        </span>
      </div>

      <div className="ti-stats">
        <article className="ti-stat">
          <span>Unique source IPs</span>
          <strong>{loading ? '—' : threats.length}</strong>
        </article>

        <article className="ti-stat">
          <span>Critical risk</span>
          <strong>{loading ? '—' : criticalCount}</strong>
        </article>

        <article className="ti-stat">
          <span>High risk</span>
          <strong>{loading ? '—' : highCount}</strong>
        </article>

        <article className="ti-stat">
          <span>Highest score</span>
          <strong>{loading ? '—' : highestScore}/100</strong>
        </article>
      </div>

      <section className="ti-panel">
        <div className="ti-panel-heading">
          <div>
            <h2>Source IP Risk Analysis</h2>
            <p>Higher scores are prioritized first.</p>
          </div>
          <Activity size={20} />
        </div>

        <div className="ti-controls">
          <label className="ti-search">
            <Search size={17} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search IP, event type, or message..."
            />
          </label>

          <select
            value={filter}
            onChange={event => setFilter(event.target.value)}
            aria-label="Filter by risk level"
          >
            <option value="ALL">All risk levels</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {loading && (
          <div className="ti-message">
            <RefreshCw size={20} className="ti-spin" />
            Analyzing recorded events...
          </div>
        )}

        {!loading && error && (
          <div className="ti-message ti-error">
            <AlertTriangle size={20} />
            <div>
              <strong>Unable to load threat data</strong>
              <p>{error}</p>
              <button onClick={() => void loadThreats()}>
                Try again
              </button>
            </div>
          </div>
        )}

        {!loading && !error && filteredThreats.length === 0 && (
          <div className="ti-message">
            <ShieldCheck size={24} />
            No source IPs match your search or filter.
          </div>
        )}

        {!loading && !error && filteredThreats.length > 0 && (
          <div className="ti-threat-list">
            {filteredThreats.map(threat => {
              const isSelected = selectedIp === threat.sourceIp

              return (
                <article
                  className="ti-threat-card"
                  key={threat.sourceIp}
                >
                  <div className="ti-threat-top">
                    <div className="ti-ip-icon">
                      <ShieldAlert size={19} />
                    </div>

                    <div className="ti-threat-identity">
                      <strong>{threat.sourceIp}</strong>
                      <span>
                        {threat.events.length} recorded event
                        {threat.events.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    <span className={`ti-level ${threat.level.toLowerCase()}`}>
                      {threat.level}
                    </span>
                  </div>

                  <div className="ti-score-row">
                    <div>
                      <span>Risk score</span>
                      <strong>{threat.score}/100</strong>
                    </div>

                    <div
                      className="ti-score-track"
                      role="progressbar"
                      aria-label={`Risk score for ${threat.sourceIp}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={threat.score}
                    >
                      <div
                        className={`ti-score-fill ${threat.level.toLowerCase()}`}
                        style={{ width: `${threat.score}%` }}
                      />
                    </div>
                  </div>

                  <div className="ti-last-seen">
                    <Clock size={14} />
                    Latest activity: {formatTime(
                      threat.latestTime
                        ? new Date(threat.latestTime).toISOString()
                        : undefined
                    )}
                  </div>

                  <button
                    className="ti-details-button"
                    onClick={() =>
                      setSelectedIp(isSelected ? null : threat.sourceIp)
                    }
                  >
                    {isSelected ? 'Hide details' : 'View risk reasons'}
                  </button>

                  {isSelected && (
                    <div className="ti-details">
                      <h3>Risk indicators</h3>

                      <ul>
                        {threat.reasons.map(reason => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>

                      <h3>Recorded events</h3>

                      {threat.events.map((event, index) => (
                        <div
                          className="ti-event"
                          key={
                            event.id ??
                            `${event.eventType}-${event.timestamp}-${index}`
                          }
                        >
                          <div>
                            <strong>
                              {event.eventType.replaceAll('_', ' ')}
                            </strong>
                            <span>{event.severity}</span>
                          </div>

                          <p>{event.message || 'No message provided.'}</p>

                          {event.destinationIp && (
                            <small>
                              Destination: {event.destinationIp}
                            </small>
                          )}

                          <small>{formatTime(event.timestamp)}</small>
                        </div>
                      ))}

                      <p className="ti-analysis-note">
                        This score is a rule-based prioritization aid,
                        not a verified malicious-IP reputation or a
                        probability of compromise. Validate the evidence
                        before taking action.
                      </p>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </section>
  )
}
