
import { useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Clock,
  RefreshCw,
  ShieldAlert,
  Network,
  GitBranch,
} from 'lucide-react'
import './AttackChains.css'

type SecurityEvent = {
  id?: string
  eventType: string
  sourceIp: string
  destinationIp?: string
  severity: string
  message: string
  timestamp?: string
}

type AttackChain = {
  sourceIp: string
  events: SecurityEvent[]
  firstSeen: number
  lastSeen: number
  risk: string
}

const WINDOW_MS = 30 * 60 * 1000

function getRisk(events: SecurityEvent[]) {
  if (events.some(e => e.severity?.toUpperCase() === 'CRITICAL')) {
    return 'CRITICAL'
  }

  if (events.some(e => e.severity?.toUpperCase() === 'HIGH')) {
    return 'HIGH'
  }

  return 'MEDIUM'
}

function getEventIcon(type: string) {
  const eventType = type.toUpperCase()

  if (eventType.includes('SCAN')) return <Network size={17} />
  if (eventType.includes('LOGIN') || eventType.includes('BRUTE_FORCE')) {
    return <AlertTriangle size={17} />
  }
  if (eventType.includes('RANSOMWARE')) return <ShieldAlert size={17} />

  return <Activity size={17} />
}

function formatTime(timestamp?: string) {
  if (!timestamp) return 'Time unavailable'

  const date = new Date(timestamp)

  return Number.isNaN(date.getTime())
    ? timestamp
    : date.toLocaleString()
}

function correlateEvents(events: SecurityEvent[]): AttackChain[] {
  const validEvents = events
    .filter(event =>
      Boolean(event.sourceIp?.trim()) &&
      Boolean(event.timestamp) &&
      !Number.isNaN(new Date(event.timestamp!).getTime())
    )
    .sort(
      (a, b) =>
        new Date(a.timestamp!).getTime() -
        new Date(b.timestamp!).getTime()
    )

  const groups: AttackChain[] = []
  const eventsByIp = new Map<string, SecurityEvent[]>()

  for (const event of validEvents) {
    const ip = event.sourceIp.trim()
    const previousEvents = eventsByIp.get(ip) ?? []
    const currentTime = new Date(event.timestamp!).getTime()
    const lastEvent = previousEvents[previousEvents.length - 1]
    const lastTime = lastEvent
      ? new Date(lastEvent.timestamp!).getTime()
      : 0

    if (!lastEvent || currentTime - lastTime > WINDOW_MS) {
      if (previousEvents.length >= 2) {
        groups.push(makeChain(ip, previousEvents))
      }

      eventsByIp.set(ip, [event])
    } else {
      previousEvents.push(event)
      eventsByIp.set(ip, previousEvents)
    }
  }

  for (const [ip, groupedEvents] of eventsByIp.entries()) {
    if (groupedEvents.length >= 2) {
      groups.push(makeChain(ip, groupedEvents))
    }
  }

  return groups.sort((a, b) => b.lastSeen - a.lastSeen)
}

function makeChain(
  sourceIp: string,
  events: SecurityEvent[]
): AttackChain {
  const times = events.map(event =>
    new Date(event.timestamp!).getTime()
  )

  return {
    sourceIp,
    events,
    firstSeen: Math.min(...times),
    lastSeen: Math.max(...times),
    risk: getRisk(events),
  }
}

export default function AttackChains() {
  const [chains, setChains] = useState<AttackChain[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  async function loadChains() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/events')

      if (!response.ok) {
        throw new Error(`Could not load events (${response.status})`)
      }

      const events: SecurityEvent[] = await response.json()
      setChains(correlateEvents(events))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadChains()
  }, [])

  const highRiskCount = chains.filter(
    chain => chain.risk === 'CRITICAL' || chain.risk === 'HIGH'
  ).length

  return (
    <section className="chains-page">
      <header className="chains-header">
        <div>
          <div className="chains-eyebrow">
            <GitBranch size={15} />
            SENTINELX / THREAT CORRELATION
          </div>

          <h1>Attack Chain Correlation</h1>

          <p>
            Identify groups of security events that share a source IP
            and occur within a 30-minute window.
          </p>
        </div>

        <button
          className="chains-refresh"
          onClick={() => void loadChains()}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </header>

      <div className="chains-stats">
        <div className="chains-stat">
          <span>Potential chains</span>
          <strong>{chains.length}</strong>
        </div>

        <div className="chains-stat">
          <span>High-risk chains</span>
          <strong>{highRiskCount}</strong>
        </div>

        <div className="chains-stat">
          <span>Correlation window</span>
          <strong>30 min</strong>
        </div>
      </div>

      {loading && (
        <div className="chains-message">
          <RefreshCw size={20} className="chains-spin" />
          Analyzing security events...
        </div>
      )}

      {!loading && error && (
        <div className="chains-message chains-error">
          <AlertTriangle size={20} />
          <div>
            <strong>Could not analyze events</strong>
            <p>{error}</p>
            <button onClick={() => void loadChains()}>Try again</button>
          </div>
        </div>
      )}

      {!loading && !error && chains.length === 0 && (
        <div className="chains-message">
          <ShieldAlert size={24} />
          <div>
            <strong>No potential chains found</strong>
            <p>
              At least two timestamped events from the same source IP
              must occur within 30 minutes.
            </p>
          </div>
        </div>
      )}

      {!loading && !error && chains.length > 0 && (
        <div className="chains-list">
          {chains.map((chain, index) => {
            const chainId = `${chain.sourceIp}-${chain.firstSeen}`
            const isExpanded = expanded === chainId

            return (
              <article className="chain-card" key={chainId}>
                <div className="chain-card-header">
                  <div className="chain-icon">
                    <GitBranch size={20} />
                  </div>

                  <div className="chain-title">
                    <span>Potential chain #{index + 1}</span>
                    <h2>{chain.sourceIp}</h2>
                    <p>Shared source IP · {chain.events.length} events</p>
                  </div>

                  <span
                    className={`chain-risk ${chain.risk.toLowerCase()}`}
                  >
                    {chain.risk}
                  </span>
                </div>

                <div className="chain-meta">
                  <span>
                    <Clock size={14} />
                    First: {new Date(chain.firstSeen).toLocaleString()}
                  </span>
                  <span>
                    <Clock size={14} />
                    Last: {new Date(chain.lastSeen).toLocaleString()}
                  </span>
                </div>

                <div className="chain-sequence">
                  {chain.events.map((event, eventIndex) => (
                    <div
                      className="chain-step"
                      key={
                        event.id ??
                        `${event.eventType}-${event.timestamp}-${eventIndex}`
                      }
                    >
                      <div className="chain-step-icon">
                        {getEventIcon(event.eventType)}
                      </div>

                      <div className="chain-step-content">
                        <strong>
                          {event.eventType.replaceAll('_', ' ')}
                        </strong>
                        <span>{formatTime(event.timestamp)}</span>
                        <p>
                          {event.message || 'No description provided.'}
                        </p>
                        {event.destinationIp && (
                          <small>
                            Destination: {event.destinationIp}
                          </small>
                        )}
                      </div>

                      <span
                        className={`chain-step-severity ${
                          event.severity?.toLowerCase() ?? 'low'
                        }`}
                      >
                        {event.severity || 'UNKNOWN'}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  className="chain-details-button"
                  onClick={() =>
                    setExpanded(isExpanded ? null : chainId)
                  }
                >
                  {isExpanded ? 'Hide analysis' : 'View analysis'}
                </button>

                {isExpanded && (
                  <div className="chain-analysis">
                    <strong>Why these events were grouped</strong>
                    <p>
                      These events have the same source IP, and the
                      gap between consecutive events is no more than
                      30 minutes. The group is a correlation candidate,
                      not proof of a single attack.
                    </p>

                    <strong>Recommended analyst checks</strong>
                    <ul>
                      <li>Verify whether the source IP is trusted.</li>
                      <li>Compare event types and destination systems.</li>
                      <li>Review timestamps and surrounding log records.</li>
                      <li>Investigate high-severity events first.</li>
                    </ul>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      <div className="chains-disclaimer">
        <ShieldAlert size={16} />
        Correlation is based on source IP and event timing only.
        Shared IP addresses and close timestamps do not prove a common
        attacker or causal relationship.
      </div>
    </section>
  )
}
