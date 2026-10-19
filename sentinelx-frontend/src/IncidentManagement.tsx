
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AlertTriangle,
  ClipboardList,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
  Plus,
  UserRound,
  Clock,
} from 'lucide-react'
import './IncidentManagement.css'

type Incident = {
  id: string
  title: string
  description?: string
  eventId?: string
  sourceIp?: string
  severity?: string
  status: string
  assignedTo?: string
  analystNotes?: string[]
  createdAt?: string
  updatedAt?: string
}

type IncidentForm = {
  title: string
  description: string
  sourceIp: string
  severity: string
  assignedTo: string
}

const statuses = [
  'OPEN',
  'INVESTIGATING',
  'RESOLVED',
  'FALSE_POSITIVE',
]

const initialForm: IncidentForm = {
  title: '',
  description: '',
  sourceIp: '',
  severity: 'HIGH',
  assignedTo: '',
}

export default function IncidentManagement() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selected, setSelected] = useState<Incident | null>(null)
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState<IncidentForm>(initialForm)

  async function loadIncidents() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/incidents')

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`)
      }

      const data: Incident[] = await response.json()
      setIncidents(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load incidents.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadIncidents()
  }, [])

  useEffect(() => {
    const refresh = () => void loadIncidents()

    window.addEventListener('sentinelx-refresh', refresh)

    return () => {
      window.removeEventListener('sentinelx-refresh', refresh)
    }
  }, [])

  async function createIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreating(true)
    setError('')
    setSuccess('')

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        sourceIp: formData.sourceIp.trim(),
        severity: formData.severity,
        assignedTo: formData.assignedTo.trim(),
        status: 'OPEN',
      }

      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(
          message || `Could not create incident: ${response.status}`
        )
      }

      const created: Incident = await response.json()

      setIncidents(current => [
        created,
        ...current.filter(item => item.id !== created.id),
      ])

      setFormData(initialForm)
      setShowCreateForm(false)
      setStatusFilter('ALL')
      setSearch('')
      setSuccess('Incident created successfully.')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not create incident.'
      )
    } finally {
      setCreating(false)
    }
  }

  async function updateStatus(id: string, status: string) {
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/incidents/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        throw new Error(`Status update failed: ${response.status}`)
      }

      const updated: Incident = await response.json()

      setIncidents(current =>
        current.map(item => item.id === id ? updated : item)
      )

      setSelected(current =>
        current?.id === id ? updated : current
      )

      setSuccess('Incident status updated.')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not update status.'
      )
    }
  }

  async function addNote() {
    if (!selected || !newNote.trim()) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        `/api/incidents/${selected.id}/notes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ note: newNote.trim() }),
        }
      )

      if (!response.ok) {
        throw new Error(`Could not save note: ${response.status}`)
      }

      const updated: Incident = await response.json()

      setIncidents(current =>
        current.map(item => item.id === updated.id ? updated : item)
      )

      setSelected(updated)
      setNewNote('')
      setSuccess('Analyst note saved.')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save note.'
      )
    } finally {
      setSaving(false)
    }
  }

  const filtered = incidents.filter(incident => {
    const query = search.toLowerCase()

    const matchesSearch = [
      incident.title,
      incident.sourceIp ?? '',
      incident.description ?? '',
      incident.assignedTo ?? '',
    ].some(value => value.toLowerCase().includes(query))

    const matchesStatus =
      statusFilter === 'ALL' || incident.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const openCount = incidents.filter(
    item => item.status === 'OPEN'
  ).length

  const investigatingCount = incidents.filter(
    item => item.status === 'INVESTIGATING'
  ).length

  const resolvedCount = incidents.filter(
    item => item.status === 'RESOLVED'
  ).length

  const criticalCount = incidents.filter(
    item => item.severity?.toUpperCase() === 'CRITICAL'
  ).length

  return (
    <div className="im-page">
      <section className="im-heading">
        <div>
          <div className="im-eyebrow">
            <ClipboardList size={15} />
            SECURITY OPERATIONS
          </div>

          <h1>Incident Management</h1>

          <p>Track, investigate, and manage security incidents.</p>
        </div>

        <button
          type="button"
          className="im-refresh"
          onClick={() => void loadIncidents()}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'im-spin' : ''} />
          Refresh
        </button>
      </section>

      {error && (
        <div className="im-error" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="im-success" role="status">
          <ShieldCheck size={17} />
          <span>{success}</span>
          <button
            type="button"
            onClick={() => setSuccess('')}
            aria-label="Dismiss success message"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <section className="im-stats">
        <div className="im-stat">
          <span>Total incidents</span>
          <strong>{incidents.length}</strong>
        </div>

        <div className="im-stat">
          <span>Open</span>
          <strong>{openCount}</strong>
        </div>

        <div className="im-stat">
          <span>Investigating</span>
          <strong>{investigatingCount}</strong>
        </div>

        <div className="im-stat">
          <span>Critical</span>
          <strong>{criticalCount}</strong>
        </div>

        <div className="im-stat">
          <span>Resolved</span>
          <strong>{resolvedCount}</strong>
        </div>
      </section>

      <section className="im-create-toolbar">
        <div>
          <h2>Security incidents</h2>
          <p>Create and manage incidents from one workspace.</p>
        </div>

        <button
          type="button"
          className="im-create-button"
          onClick={() => {
            setShowCreateForm(current => !current)
            setError('')
            setSuccess('')
          }}
        >
          {showCreateForm ? <X size={17} /> : <Plus size={17} />}
          {showCreateForm ? 'Cancel' : 'Create Incident'}
        </button>
      </section>

      {showCreateForm && (
        <form className="im-create-form" onSubmit={createIncident}>
          <div className="im-form-heading">
            <h2>New security incident</h2>
            <p>Enter the details and assign a severity level.</p>
          </div>

          <label>
            Incident title *
            <input
              required
              maxLength={150}
              value={formData.title}
              onChange={event =>
                setFormData({
                  ...formData,
                  title: event.target.value,
                })
              }
              placeholder="e.g. Multiple Failed Login Attempts"
            />
          </label>

          <label>
            Description *
            <textarea
              required
              maxLength={2000}
              rows={4}
              value={formData.description}
              onChange={event =>
                setFormData({
                  ...formData,
                  description: event.target.value,
                })
              }
              placeholder="Describe the suspicious activity..."
            />
          </label>

          <div className="im-form-grid">
            <label>
              Source IP address
              <input
                maxLength={45}
                value={formData.sourceIp}
                onChange={event =>
                  setFormData({
                    ...formData,
                    sourceIp: event.target.value,
                  })
                }
                placeholder="e.g. 192.168.1.105"
              />
            </label>

            <label>
              Severity *
              <select
                value={formData.severity}
                onChange={event =>
                  setFormData({
                    ...formData,
                    severity: event.target.value,
                  })
                }
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </label>
          </div>

          <label>
            Assigned analyst
            <input
              maxLength={100}
              value={formData.assignedTo}
              onChange={event =>
                setFormData({
                  ...formData,
                  assignedTo: event.target.value,
                })
              }
              placeholder="e.g. SOC Analyst 1"
            />
          </label>

          <div className="im-form-actions">
            <button
              type="button"
              className="im-cancel-button"
              onClick={() => setShowCreateForm(false)}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="im-create-button"
              disabled={creating}
            >
              {creating ? (
                <>
                  <RefreshCw size={16} className="im-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={17} />
                  Create Incident
                </>
              )}
            </button>
          </div>
        </form>
      )}

      <section className="im-panel">
        <div className="im-toolbar">
          <div className="im-search">
            <Search size={17} />

            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search title, description, IP, analyst..."
            />
          </div>

          <select
            aria-label="Filter by incident status"
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
          >
            <option value="ALL">All statuses</option>

            {statuses.map(status => (
              <option key={status} value={status}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="im-empty">
            <RefreshCw className="im-spin" size={23} />
            <p>Loading incidents...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="im-empty">
            <ShieldCheck size={30} />
            <h3>No incidents found</h3>
            <p>
              Create an incident or adjust your search and status filters.
            </p>

            {incidents.length === 0 && (
              <button
                type="button"
                className="im-create-button"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus size={17} />
                Create your first incident
              </button>
            )}
          </div>
        ) : (
          <div className="im-list">
            {filtered.map(incident => (
              <article className="im-card" key={incident.id}>
                <div className="im-card-top">
                  <div className="im-incident-icon">
                    <AlertTriangle size={19} />
                  </div>

                  <div className="im-card-title">
                    <h3>{incident.title || 'Untitled incident'}</h3>
                    <p>
                      {incident.description || 'No description provided.'}
                    </p>
                  </div>

                  <span
                    className={`im-severity ${(incident.severity || 'LOW').toLowerCase()}`}
                  >
                    {incident.severity || 'UNSPECIFIED'}
                  </span>
                </div>

                <div className="im-meta">
                  <span>
                    Source: {incident.sourceIp || 'Not specified'}
                  </span>

                  <span>
                    <Clock size={13} />
                    {incident.createdAt
                      ? new Date(incident.createdAt).toLocaleString()
                      : 'Date unknown'}
                  </span>

                  {incident.assignedTo && (
                    <span>
                      <UserRound size={13} />
                      {incident.assignedTo}
                    </span>
                  )}
                </div>

                <div className="im-card-bottom">
                  <label
                    className={`im-status ${(incident.status || 'OPEN').toLowerCase()}`}
                  >
                    {(incident.status || 'OPEN').replace('_', ' ')}
                  </label>

                  <div className="im-actions">
                    <select
                      aria-label={`Change status for ${incident.title}`}
                      value={incident.status || 'OPEN'}
                      onChange={event =>
                        void updateStatus(incident.id, event.target.value)
                      }
                    >
                      {statuses.map(status => (
                        <option key={status} value={status}>
                          {status.replace('_', ' ')}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        setSelected(incident)
                        setNewNote('')
                        setError('')
                        setSuccess('')
                      }}
                    >
                      View / Notes
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <div
          className="im-modal-backdrop"
          onClick={() => setSelected(null)}
        >
          <section
            className="im-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Incident details"
            onClick={event => event.stopPropagation()}
          >
            <div className="im-modal-heading">
              <div>
                <span className="im-eyebrow">INCIDENT DETAILS</span>
                <h2>{selected.title}</h2>
              </div>

              <button
                type="button"
                className="im-close"
                onClick={() => setSelected(null)}
                aria-label="Close incident details"
              >
                <X size={20} />
              </button>
            </div>

            <p className="im-description">
              {selected.description || 'No description provided.'}
            </p>

            <div className="im-detail-grid">
              <div>
                <span>Source IP</span>
                <strong>{selected.sourceIp || 'N/A'}</strong>
              </div>

              <div>
                <span>Severity</span>
                <strong>{selected.severity || 'N/A'}</strong>
              </div>

              <div>
                <span>Status</span>
                <strong>
                  {(selected.status || 'OPEN').replace('_', ' ')}
                </strong>
              </div>

              <div>
                <span>Event ID</span>
                <strong>{selected.eventId || 'Not linked'}</strong>
              </div>

              <div>
                <span>Assigned analyst</span>
                <strong>{selected.assignedTo || 'Unassigned'}</strong>
              </div>

              <div>
                <span>Last updated</span>
                <strong>
                  {selected.updatedAt
                    ? new Date(selected.updatedAt).toLocaleString()
                    : 'Unknown'}
                </strong>
              </div>
            </div>

            <h3>Analyst notes</h3>

            <div className="im-notes">
              {selected.analystNotes?.length ? (
                selected.analystNotes.map((note, index) => (
                  <div className="im-note" key={`${index}-${note}`}>
                    <span>Note {index + 1}</span>
                    <p>{note}</p>
                  </div>
                ))
              ) : (
                <p className="im-muted">No notes have been added.</p>
              )}
            </div>

            <textarea
              value={newNote}
              onChange={event => setNewNote(event.target.value)}
              placeholder="Write an investigation note..."
              rows={3}
              maxLength={2000}
            />

            <button
              type="button"
              className="im-save-note"
              onClick={() => void addNote()}
              disabled={saving || !newNote.trim()}
            >
              {saving ? 'Saving...' : 'Save analyst note'}
            </button>
          </section>
        </div>
      )}
    </div>
  )
}
