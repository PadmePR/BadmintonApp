import { useState } from 'react'
import { api } from '../../lib/api.js'

export default function TeamHome({ teams, onSelectTeam, onTeamCreated, onTeamDeleted }) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName]   = useState('')
  const [busy, setBusy]         = useState(false)

  async function createTeam() {
    if (!newName.trim()) return
    setBusy(true)
    try {
      const team = await api.createTeam(newName.trim())
      onTeamCreated(team)
      setNewName(''); setCreating(false)
    } catch (e) { alert(e.message) }
    setBusy(false)
  }

  async function deleteTeam(e, team) {
    e.stopPropagation()
    if (!confirm(`Delete team "${team.name}"? This removes all players and matches. Cannot be undone.`)) return
    try {
      await api.deleteTeam(team.id)
      onTeamDeleted(team.id)
    } catch (e) { alert(e.message) }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="section-label" style={{ fontSize: 13 }}>Your teams</div>
        <button className="btn-primary" style={{ padding: '8px 14px', fontSize: 13 }}
          onClick={() => setCreating(v => !v)}>
          {creating ? 'Cancel' : '+ New team'}
        </button>
      </div>

      {creating && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">Create team</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="field-input" placeholder="Team name" maxLength={40}
              value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createTeam()}
              autoFocus style={{ flex: 1 }} />
            <button className="btn-primary" onClick={createTeam} disabled={busy || !newName.trim()}>
              {busy ? '…' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {teams.length === 0 && !creating && (
        <div className="empty-state">
          No teams yet. Create your first team to get started.
        </div>
      )}

      {teams.map(team => (
        <div key={team.id} className="team-card" onClick={() => onSelectTeam(team)}>
          <div className="team-card-icon">
            {team.name.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>
              {team.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {team.is_admin
                ? <span style={{ color: 'var(--accent)', fontWeight: 500 }}>Admin</span>
                : 'Member'}
              {' · '}
              {new Date(team.created_at).toLocaleDateString()}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {team.is_admin && team.created_by === team._userId && (
              <button className="btn-remove" style={{ flexShrink: 0 }}
                onClick={e => deleteTeam(e, team)}>×</button>
            )}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="var(--text-tertiary)" strokeWidth="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
        </div>
      ))}
    </div>
  )
}
