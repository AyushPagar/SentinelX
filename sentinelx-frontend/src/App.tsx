
import { useCallback, useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCheck,
  ClipboardList,
  LayoutDashboard,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Menu,
  X,
  GitBranch,
  Radar,
  CircleDot,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

import './App.css'
import AttackTimeline from './AttackTimeline'
import AttackChains from './AttackChains'
import ThreatIntelligence from './ThreatIntelligence'
import IncidentManagement from './IncidentManagement'

type SecurityEvent = {
  id: string
  eventType?: string
  sourceIp?: string
  destinationIp?: string
  severity?: string
  message?: string
  timestamp?: string
}

type Incident = {
  id: string
  title?: string
  severity?: string
  status?: string
  sourceIp?: string
  eventId?: string
  createdAt?: string
}

type IncidentNotification = {
  id: string
  title: string
  severity: string
  sourceIp: string
  createdAt?: string
  read: boolean
}

type LiveAlert = {
  type?: string
  message?: string
  severity?: string
  timestamp?: string
}

type PageName =
  | 'Dashboard'
  | 'Attack Timeline'
  | 'Attack Chains'
  | 'Threat Intelligence'
  | 'Incident Management'

const navigation = [
  { label: 'Dashboard' as PageName, icon: LayoutDashboard },
  { label: 'Attack Timeline' as PageName, icon: Activity },
  { label: 'Attack Chains' as PageName, icon: GitBranch },
  { label: 'Threat Intelligence' as PageName, icon: Radar },
  { label: 'Incident Management' as PageName, icon: ClipboardList },
]

const severityColors: Record<string, string> = {
  CRITICAL: '#fb7185',
  HIGH: '#fb923c',
  MEDIUM: '#facc15',
  LOW: '#34d399',
  UNKNOWN: '#64748b',
}

function getSeverity(event: SecurityEvent) {
  const severity = event.severity?.toUpperCase()
  return severity && severityColors[severity] ? severity : 'UNKNOWN'
}

function formatTime(value?: string) {
  if (!value) return 'Time unavailable'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Time unavailable'

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Dashboard({
  events,
  incidents,
  loading,
  lastUpdated,
  onRefresh,
  liveConnected,
}: {
  events: SecurityEvent[]
  incidents: Incident[]
  loading: boolean
  lastUpdated: Date | null
  onRefresh: () => void
  liveConnected: boolean
}) {
  const criticalCount = events.filter(
    event => getSeverity(event) === 'CRITICAL'
  ).length

  const highCount = events.filter(
    event => getSeverity(event) === 'HIGH'
  ).length

  const openIncidents = incidents.filter(
    incident =>
      !['RESOLVED', 'FALSE_POSITIVE'].includes(
        (incident.status || 'OPEN').toUpperCase()
      )
  ).length

  const investigatingIncidents = incidents.filter(
    incident =>
      (incident.status || 'OPEN').toUpperCase() === 'INVESTIGATING'
  ).length

  const resolvedIncidents = incidents.filter(
    incident => (incident.status || '').toUpperCase() === 'RESOLVED'
  ).length

  const severityData = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']
    .map(name => ({
      name,
      value: events.filter(event => getSeverity(event) === name).length,
      color: severityColors[name],
    }))
    .filter(item => item.value > 0)

  const trendData = (() => {
    const now = new Date()

    const buckets = Array.from({ length: 12 }, (_, index) => {
      const start = new Date(
        now.getTime() - (11 - index) * 60 * 60 * 1000
      )
      const end = new Date(start.getTime() + 60 * 60 * 1000)

      return {
        hour: start.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        start: start.getTime(),
        end: end.getTime(),
        total: 0,
        critical: 0,
      }
    })

    events.forEach(event => {
      if (!event.timestamp) return

      const timestamp = new Date(event.timestamp).getTime()
      if (Number.isNaN(timestamp)) return

      const bucket = buckets.find(
        item => timestamp >= item.start && timestamp < item.end
      )

      if (bucket) {
        bucket.total += 1
        if (getSeverity(event) === 'CRITICAL') {
          bucket.critical += 1
        }
      }
    })

    return buckets
  })()

  const recentEvents = [...events]
    .sort(
      (a, b) =>
        new Date(b.timestamp || 0).getTime() -
        new Date(a.timestamp || 0).getTime()
    )
    .slice(0, 8)

  return (
    <div className="soc-dashboard">
      <section className="soc-welcome">
        <div>
          <div className="soc-eyebrow">
            <span className="soc-live-dot" />
            SECURITY OPERATIONS CENTER
          </div>
          <h1>Security Overview</h1>
          <p>
            Monitor detected security events, assess risk, and track incidents
            across your environment.
          </p>
        </div>

        <button
          className="soc-refresh"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'soc-spin' : ''} />
          {loading ? 'Refreshing...' : 'Refresh data'}
        </button>
      </section>

      <section className="soc-status-strip">
        <span>
          <CircleDot size={15} />
          API connection: {loading ? 'Updating' : 'Last request completed'}
        </span>
        <span>
          <CircleDot size={14} />
          Live alerts: {liveConnected ? 'Connected' : 'Reconnecting...'}
        </span>
        <span>
          <Clock size={15} />
          Updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Not yet'}
        </span>
        <span>
          <RefreshCw size={14} />
          Auto-refresh every 30 seconds
        </span>
      </section>

      <section className="soc-kpis">
        <article className="soc-kpi">
          <div className="soc-kpi-top">
            <span>Total events</span>
            <div className="soc-kpi-icon blue">
              <Activity size={19} />
            </div>
          </div>
          <strong>{events.length}</strong>
          <small>Events returned by the API</small>
        </article>

        <article className="soc-kpi">
          <div className="soc-kpi-top">
            <span>Critical threats</span>
            <div className="soc-kpi-icon red">
              <ShieldAlert size={19} />
            </div>
          </div>
          <strong>{criticalCount}</strong>
          <small>Events classified as critical</small>
        </article>

        <article className="soc-kpi">
          <div className="soc-kpi-top">
            <span>High severity</span>
            <div className="soc-kpi-icon orange">
              <AlertTriangle size={19} />
            </div>
          </div>
          <strong>{highCount}</strong>
          <small>Events classified as high</small>
        </article>

        <article className="soc-kpi">
          <div className="soc-kpi-top">
            <span>Active incidents</span>
            <div className="soc-kpi-icon green">
              <ClipboardList size={19} />
            </div>
          </div>
          <strong>{openIncidents}</strong>
          <small>Incidents not yet closed</small>
        </article>
      </section>

      <section className="incident-status-strip">
        <div>
          <span className="incident-status-dot open-dot" />
          <span>Open / active</span>
          <strong>{openIncidents}</strong>
        </div>
        <div>
          <span className="incident-status-dot investigating-dot" />
          <span>Investigating</span>
          <strong>{investigatingIncidents}</strong>
        </div>
        <div>
          <span className="incident-status-dot resolved-dot" />
          <span>Resolved</span>
          <strong>{resolvedIncidents}</strong>
        </div>
      </section>

      <section className="soc-chart-grid">
        <article className="soc-panel soc-trend-panel">
          <div className="soc-panel-heading">
            <div>
              <h2>Event activity</h2>
              <p>Hourly activity over the last 12 hours</p>
            </div>
            <span className="soc-panel-tag">12 HOURS</span>
          </div>

          <div className="soc-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient
                    id="eventGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient
                    id="criticalGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#fb7185" stopOpacity={0.01} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="#263244"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={25}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    background: '#111827',
                    border: '1px solid #334155',
                    borderRadius: 10,
                    color: '#f8fafc',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="All events"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  fill="url(#eventGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="critical"
                  name="Critical events"
                  stroke="#fb7185"
                  strokeWidth={2}
                  fill="url(#criticalGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <p className="soc-chart-note">
            Events without a valid timestamp are excluded from this chart.
          </p>
        </article>

        <article className="soc-panel soc-severity-panel">
          <div className="soc-panel-heading">
            <div>
              <h2>Severity distribution</h2>
              <p>Classification of returned events</p>
            </div>
          </div>

          {severityData.length === 0 ? (
            <div className="soc-chart-empty">
              <ShieldCheck size={32} />
              <p>No security events available yet.</p>
            </div>
          ) : (
            <>
              <div className="soc-donut">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="62%"
                      outerRadius="86%"
                      paddingAngle={3}
                      stroke="none"
                    >
                      {severityData.map(item => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#111827',
                        border: '1px solid #334155',
                        borderRadius: 10,
                        color: '#f8fafc',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="soc-donut-center">
                  <strong>{events.length}</strong>
                  <span>EVENTS</span>
                </div>
              </div>

              <div className="soc-legend">
                {severityData.map(item => (
                  <div className="soc-legend-row" key={item.name}>
                    <span>
                      <i style={{ background: item.color }} />
                      {item.name}
                    </span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </article>
      </section>

      <section className="soc-panel soc-events-panel">
        <div className="soc-panel-heading">
          <div>
            <h2>Recent security events</h2>
            <p>Latest events received from the backend</p>
          </div>
          <span className="soc-panel-tag">{recentEvents.length} SHOWN</span>
        </div>

        {recentEvents.length === 0 ? (
          <div className="soc-chart-empty">
            <Activity size={30} />
            <p>No events to display. Add a test event to see activity here.</p>
          </div>
        ) : (
          <div className="soc-table-wrap">
            <table className="soc-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Source IP</th>
                  <th>Severity</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((event, index) => {
                  const severity = getSeverity(event)

                  return (
                    <tr key={event.id || `${event.eventType}-${index}`}>
                      <td>
                        <div className="soc-event-name">
                          <span className="soc-event-symbol">
                            <Activity size={15} />
                          </span>
                          <div>
                            <strong>
                              {event.eventType || 'Security event'}
                            </strong>
                            <small>
                              {event.message || 'No event description'}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td className="soc-ip">
                        {event.sourceIp || 'Unknown'}
                      </td>
                      <td>
                        <span
                          className={`soc-severity-badge ${severity.toLowerCase()}`}
                        >
                          <i />
                          {severity}
                        </span>
                      </td>
                      <td className="soc-time">
                        {formatTime(event.timestamp)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="soc-disclaimer">
        <ShieldCheck size={16} />
        <span>
          Dashboard metrics reflect events and incidents returned by your
          configured backend. This page does not independently monitor network
          traffic or perform live external threat-intelligence lookups.
        </span>
      </footer>
    </div>
  )
}

export default function App() {
  const [activePage, setActivePage] = useState<PageName>('Dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [apiError, setApiError] = useState('')
  const [notifications, setNotifications] = useState<
    IncidentNotification[]
  >([])
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false)
  const [liveConnected, setLiveConnected] = useState(false)

  const knownIncidentIds = useRef<Set<string> | null>(null)

  const unreadCount = notifications.filter(
    notification => !notification.read
  ).length

  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    setApiError('')

    try {
      const [eventResponse, incidentResponse] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/incidents'),
      ])

      if (!eventResponse.ok) {
        throw new Error(`Events API returned ${eventResponse.status}`)
      }

      if (!incidentResponse.ok) {
        throw new Error(`Incidents API returned ${incidentResponse.status}`)
      }

      const eventData: SecurityEvent[] = await eventResponse.json()
      const incidentData: Incident[] = await incidentResponse.json()

      const safeEvents = Array.isArray(eventData) ? eventData : []
      const safeIncidents = Array.isArray(incidentData)
        ? incidentData
        : []

      setEvents(safeEvents)

      const currentIds = new Set(
        safeIncidents
          .map(incident => incident.id)
          .filter((id): id is string => Boolean(id))
      )

      if (knownIncidentIds.current !== null) {
        const knownIds = knownIncidentIds.current

        const newIncidents = safeIncidents.filter(
          incident => incident.id && !knownIds.has(incident.id)
        )

        if (newIncidents.length > 0) {
          setNotifications(previous => {
            const existingIds = new Set(
              previous.map(notification => notification.id)
            )

            const additions: IncidentNotification[] = newIncidents
              .filter(incident => !existingIds.has(incident.id))
              .map(incident => ({
                id: incident.id,
                title: incident.title || 'New security incident',
                severity: (incident.severity || 'UNKNOWN').toUpperCase(),
                sourceIp: incident.sourceIp || 'Unknown source',
                createdAt: incident.createdAt,
                read: false,
              }))

            return [...additions, ...previous].slice(0, 50)
          })
        }
      }

      knownIncidentIds.current = currentIds
      setIncidents(safeIncidents)
      setLastUpdated(new Date())
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : 'Could not load dashboard data.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  // Real-time connection to Spring Boot's WebSocket endpoint.
  useEffect(() => {
    const client = new Client({
      brokerURL: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`,
      reconnectDelay: 5000,

      onConnect: () => {
        setLiveConnected(true)

        client.subscribe('/topic/security-alerts', message => {
          try {
            const alert: LiveAlert = JSON.parse(message.body)

            console.info('SentinelX live security alert:', alert)

            // Refresh the saved events and incidents immediately.
            void loadDashboardData()
          } catch (error) {
            console.error('Could not process SentinelX live alert:', error)
          }
        })
      },

      onDisconnect: () => {
        setLiveConnected(false)
      },

      onWebSocketClose: () => {
        setLiveConnected(false)
      },

      onWebSocketError: event => {
        setLiveConnected(false)
        console.error('SentinelX WebSocket error:', event)
      },
    })

    void client.activate()

    return () => {
      setLiveConnected(false)
      void client.deactivate()
    }
  }, [loadDashboardData])

  useEffect(() => {
    void loadDashboardData()
  }, [loadDashboardData])

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadDashboardData()
    }, 30000)

    return () => window.clearInterval(interval)
  }, [loadDashboardData])

  function openPage(page: PageName) {
    setActivePage(page)
    setMobileMenuOpen(false)

    if (page !== 'Dashboard') {
      window.dispatchEvent(new CustomEvent('sentinelx-refresh'))
    }
  }

  const criticalCount = events.filter(
    event => getSeverity(event) === 'CRITICAL'
  ).length

  return (
    <div className="app-shell">
      {mobileMenuOpen && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">
            <ShieldCheck size={23} />
          </div>
          <div>
            <strong>SentinelX</strong>
            <span>THREAT INTELLIGENCE</span>
          </div>
          <button
            className="mobile-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>

        <div className="sidebar-section-label">WORKSPACE</div>

        <nav className="sidebar-nav">
          {navigation.map(item => {
            const Icon = item.icon
            const active = activePage === item.label

            return (
              <button
                key={item.label}
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={() => openPage(item.label)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.label === 'Incident Management' &&
                  incidents.length > 0 && <small>{incidents.length}</small>}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-health">
            <span className="soc-live-dot" />
            <div>
              <strong>SentinelX services</strong>
              <small>
                {apiError ? 'Check API connection' : 'Dashboard available'}
              </small>
            </div>
          </div>
          <div className="sidebar-version">SENTINELX · SECURITY CONSOLE</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu-button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={21} />
            </button>
            <div className="breadcrumb">
              <span>SentinelX</span>
              <span className="breadcrumb-separator">/</span>
              <strong>{activePage}</strong>
            </div>
          </div>

          <div className="topbar-right">
            <span className="topbar-status">
              <span className="soc-live-dot" />
              <span>LOCAL ENVIRONMENT</span>
            </span>

            <div className="notification-wrapper">
              <button
                className="notification-bell"
                aria-label={`Notifications, ${unreadCount} unread`}
                aria-expanded={notificationPanelOpen}
                onClick={() =>
                  setNotificationPanelOpen(open => !open)
                }
                title="Incident notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="notification-count">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {notificationPanelOpen && (
                <div className="notification-panel">
                  <div className="notification-panel-header">
                    <div>
                      <strong>Incident notifications</strong>
                      <small>{unreadCount} unread</small>
                    </div>
                    <button
                      className="notification-mark-read"
                      title="Mark all as read"
                      onClick={() =>
                        setNotifications(previous =>
                          previous.map(item => ({ ...item, read: true }))
                        )
                      }
                    >
                      <CheckCheck size={16} />
                    </button>
                  </div>

                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <div className="notification-empty">
                        <Bell size={24} />
                        <strong>No new incidents</strong>
                        <span>
                          New incidents appear here after a successful refresh.
                        </span>
                      </div>
                    ) : (
                      notifications.map(notification => (
                        <button
                          key={notification.id}
                          className={`notification-item ${
                            notification.read ? 'read' : 'unread'
                          }`}
                          onClick={() => {
                            setNotifications(previous =>
                              previous.map(item =>
                                item.id === notification.id
                                  ? { ...item, read: true }
                                  : item
                              )
                            )
                            setNotificationPanelOpen(false)
                            openPage('Incident Management')
                          }}
                        >
                          <span
                            className={`notification-severity ${notification.severity.toLowerCase()}`}
                          >
                            <ShieldAlert size={17} />
                          </span>

                          <span className="notification-content">
                            <strong>{notification.title}</strong>
                            <small>
                              {notification.severity} · {notification.sourceIp}
                            </small>
                            <small>
                              {notification.createdAt
                                ? formatTime(notification.createdAt)
                                : 'Recently detected'}
                            </small>
                          </span>

                          {!notification.read && (
                            <span className="notification-unread-dot" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              className="topbar-refresh"
              onClick={() => {
                void loadDashboardData()
                window.dispatchEvent(new CustomEvent('sentinelx-refresh'))
              }}
              title="Refresh dashboard data"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </header>

        <div className="page-content">
          {activePage === 'Dashboard' && (
            <>
              {apiError && (
                <div className="app-api-error">
                  <AlertTriangle size={17} />
                  <span>{apiError}</span>
                  <button onClick={() => void loadDashboardData()}>
                    Retry
                  </button>
                </div>
              )}

              <Dashboard
                events={events}
                incidents={incidents}
                loading={loading}
                lastUpdated={lastUpdated}
                onRefresh={() => void loadDashboardData()}
                liveConnected={liveConnected}
              />
            </>
          )}

          {activePage === 'Attack Timeline' && <AttackTimeline />}
          {activePage === 'Attack Chains' && <AttackChains />}
          {activePage === 'Threat Intelligence' && <ThreatIntelligence />}
          {activePage === 'Incident Management' && <IncidentManagement />}

          <div className="app-footer">
            <span>
              <ShieldCheck size={14} />
              SentinelX Security Operations
            </span>
            <span>
              {criticalCount} critical event
              {criticalCount === 1 ? '' : 's'} in loaded event data
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}
