
import { useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Clock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Network,
} from 'lucide-react'
import './AttackTimeline.css'

type SecurityEvent = {
  id?: string
  eventType: string
  sourceIp: string
  destinationIp?: string
  severity: string
  message: string
  timestamp?: string
}

function getEventIcon(event: SecurityEvent) {
  const type = event.eventType.toUpperCase()

  if (event.severity === 'CRITICAL' || type.includes('RANSOMWARE')) {
    return <ShieldAlert size={18} />
  }

  if (type.includes('LOGIN') || type.includes('BRUTE_FORCE')) {
    return <AlertTriangle size={18} />
  }

  if (type.includes('SCAN')) {
    return <Network size={18} />
  }

  return <Activity size={18} />
}

function formatTimestamp(timestamp?: string) {
  if (!timestamp) return 'Timestamp unavailable'

  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) return timestamp

  return date.toLocaleString()
}

export default function AttackTimeline() {
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [severityFilter, setSeverityFilter] = useState('ALL')

  async function loadTimeline() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/events')

      if (!response.ok) {
        throw new Error(`Failed to load events (${response.status})`)
      }

      const data: SecurityEvent[] = await response.json()

      const sortedEvents = [...data].sort((a, b) => {
        const timeA = a.timestamp
          ? new Date(a.timestamp).getTime()
          : 0

        const timeB = b.timestamp
          ? new Date(b.timestamp).getTime()
          : 0

        return timeB - timeA
      })

      setEvents(sortedEvents)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load security events.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTimeline()
  }, [])

  const filteredEvents =
    severityFilter === 'ALL'
      ? events
      : events.filter(
          event => event.severity.toUpperCase() === severityFilter
        )

  const criticalCount = events.filter(
    event => event.severity.toUpperCase() === 'CRITICAL'
  ).length

  const highCount = events.filter(
    event => event.severity.toUpperCase() === 'HIGH'
  ).length

  return (
    <section className="timeline-page">
      <div className="timeline-header">
        <div>
          <div className="timeline-eyebrow">
            <Activity size={15} />
            SECURITY OPERATIONS CENTER
          </div>

          <h1>Attack Timeline</h1>

          <p>
            Explore security events chronologically and investigate
            suspicious activity.
          </p>
        </div>

        <button
          className="timeline-refresh"
          onClick={() => void loadTimeline()}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={loading ? 'timeline-spinning' : ''}
          />
          Refresh
        </button>
      </div>

      <div className="timeline-stats">
        <div className="timeline-stat">
          <span>Total events</span>
          <strong>{events.length}</strong>
        </div>

        <div className="timeline-stat critical-stat">
          <span>Critical events</span>
          <strong>{criticalCount}</strong>
        </div>

        <div className="timeline-stat high-stat">
          <span>High severity</span>
          <strong>{highCount}</strong>
        </div>

        <div className="timeline-stat">
          <span>Visible events</span>
          <strong>{filteredEvents.length}</strong>
        </div>
      </div>

      <div className="timeline-toolbar">
        <div>
          <h2>Event sequence</h2>
          <p>Newest events appear first.</p>
        </div>

        <select
          value={severityFilter}
          onChange={event => setSeverityFilter(event.target.value)}
          aria-label="Filter events by severity"
        >
          <option value="ALL">All severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {loading && (
        <div className="timeline-message">
          <RefreshCw size={20} className="timeline-spinning" />
          Loading security events...
        </div>
      )}

      {!loading && error && (
        <div className="timeline-message timeline-error">
          <AlertTriangle size={20} />
          <div>
            <strong>Unable to load timeline</strong>
            <p>{error}</p>
            <button onClick={() => void loadTimeline()}>
              Try again
            </button>
          </div>
        </div>
      )}

      {!loading && !error && filteredEvents.length === 0 && (
        <div className="timeline-message">
          <ShieldCheck size={24} />
          No events match this filter.
        </div>
      )}

      {!loading && !error && filteredEvents.length > 0 && (
        <div className="timeline-list">
          {filteredEvents.map((event, index) => (
            <article
              className="timeline-event"
              key={event.id ?? `${event.eventType}-${event.timestamp ?? ''}-${index}`}
            >
              <div
                className={`timeline-marker ${event.severity.toLowerCase()}`}
              >
                {getEventIcon(event)}
              </div>

              <div className="timeline-event-card">
                <div className="timeline-event-top">
                  <div>
                    <span className="timeline-event-type">
                      {event.eventType.replaceAll('_', ' ')}
                    </span>

                    <div className="timeline-time">
                      <Clock size={13} />
                      {formatTimestamp(event.timestamp)}
                    </div>
                  </div>

                  <span
                    className={`timeline-severity ${event.severity.toLowerCase()}`}
                  >
                    {event.severity}
                  </span>
                </div>

                <p className="timeline-description">
                  {event.message || 'No event description provided.'}
                </p>

                <div className="timeline-network">
                  <span>
                    <small>Source</small>
                    <strong>{event.sourceIp || 'Unknown'}</strong>
                  </span>

                  <span className="timeline-arrow">→</span>

                  <span>
                    <small>Destination</small>
                    <strong>{event.destinationIp || 'Not provided'}</strong>
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="timeline-note">
        <ShieldCheck size={16} />
        This timeline displays recorded events. Their chronological order
        alone does not prove that they belong to the same attack.
      </div>
    </section>
  )
}
