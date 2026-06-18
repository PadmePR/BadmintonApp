import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase.js'
import { api } from '../../lib/api.js'
import TeamPlayersTab from './TeamPlayersTab.jsx'
import TeamMatchesTab from './TeamMatchesTab.jsx'
import PlaySessionPage from '../../features/matchPlay/PlaySessionPage.jsx'
import PlayHistory from '../../features/matchPlay/PlayHistory.jsx'

export default function TeamView({ team, currentUserId, onBack, onTeamUpdated }) {
  const [tab, setTab]               = useState('players')
  const [members, setMembers]       = useState([])
  const [isAdmin, setIsAdmin]       = useState(false)
  const [loading, setLoading]       = useState(true)
  const [matchResult, setMatchResult] = useState(null)
  const [savedMeta, setSavedMeta]   = useState(null)
  const [editing, setEditing]       = useState(false)
  const [newName, setNewName]       = useState(team.name)
  const [syncBadge, setSyncBadge]   = useState(null) // 'players' | 'matches' | null
  const [playSession, setPlaySession] = useState(null) // active play session
  const [showHistory, setShowHistory] = useState(false)
  const channelRef = useRef(null)

  useEffect(() => {
    loadAll()
    subscribeRealtime()
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [team.id])

  async function loadAll() {
    setLoading(true)
    try {
      const [{ members: m, is_admin }, matchData] = await Promise.all([
        api.getMembers(team.id),
        api.getTeamMatches(team.id),
      ])
      setMembers(m)
      setIsAdmin(is_admin)
      applyMatchData(matchData)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  function applyMatchData(data) {
    if (!data) { setMatchResult(null); setSavedMeta(null); return }
    // data.rounds is the serialised array from DB; wrap it into the shape
    // TeamMatchesTab expects: { rounds: [...], courts, sittingCount }
    if (data.rounds && Array.isArray(data.rounds)) {
      const courts = data.meta?.courts ?? (data.rounds[0]?.courts || 1)
      const sittingCount = data.rounds[0]?.sitting?.length ?? 0
      setMatchResult({ rounds: data.rounds, courts, sittingCount, totalPlayers: data.meta?.players })
    }
    if (data.meta) setSavedMeta(data.meta)
  }

  // ── Supabase Realtime ──────────────────────────────────────────────────
  function subscribeRealtime() {
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    const channel = supabase
      .channel(`team-${team.id}`)

      // team_members changes → reload members
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'team_members',
        filter: `team_id=eq.${team.id}`,
      }, () => {
        reloadMembers()
        flashBadge('players')
      })

      // team_matches changes → reload matches
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'team_matches',
        filter: `team_id=eq.${team.id}`,
      }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setMatchResult(null); setSavedMeta(null)
        } else if (payload.new) {
          applyMatchData(payload.new)
        } else {
          // Realtime sometimes omits payload.new for large rows — re-fetch
          api.getTeamMatches(team.id).then(applyMatchData).catch(console.error)
        }
        flashBadge('matches')
      })

      .subscribe()

    channelRef.current = channel
  }

  async function reloadMembers() {
    try {
      const { members: m, is_admin } = await api.getMembers(team.id)
      setMembers(m)
      setIsAdmin(is_admin)
    } catch (e) { console.error(e) }
  }

  // Show a brief "synced" indicator on the tab that changed
  function flashBadge(which) {
    setSyncBadge(which)
    setTimeout(() => setSyncBadge(null), 2500)
  }

  async function saveTeamName() {
    if (!newName.trim() || newName.trim() === team.name) { setEditing(false); return }
    try {
      const updated = await api.renameTeam(team.id, newName.trim())
      onTeamUpdated({ ...team, name: updated.name })
      setEditing(false)
    } catch (e) { alert(e.message) }
  }

  if (playSession) return (
    <PlaySessionPage
      sessionId={playSession.id}
      teamId={team.id}
      onClose={() => setPlaySession(null)}
    />
  )

  if (showHistory) return (
    <PlayHistory
      teamId={team.id}
      isAdmin={isAdmin}
      members={members}
      onBack={() => setShowHistory(false)}
    />
  )

  if (loading) return (
    <div style={{ padding: 40, color: 'var(--text-secondary)', textAlign: 'center' }}>
      Loading team…
    </div>
  )

  return (
    <div>
      {/* Team header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '1px solid var(--border-medium)', background: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>

        {editing ? (
          <div style={{ display: 'flex', gap: 8, flex: 1 }}>
            <input className="field-input" value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveTeamName(); if (e.key === 'Escape') setEditing(false) }}
              autoFocus style={{ flex: 1 }} />
            <button className="btn-primary" style={{ padding: '8px 14px', fontSize: 13 }}
              onClick={saveTeamName}>Save</button>
            <button className="btn-secondary" style={{ padding: '8px 14px', fontSize: 13 }}
              onClick={() => { setEditing(false); setNewName(team.name) }}>Cancel</button>
          </div>
        ) : (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                {team.name}
              </h2>
              {isAdmin && (
                <button onClick={() => setEditing(true)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-tertiary)', padding: 4,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {members.length} player{members.length !== 1 ? 's' : ''} ·{' '}
              {isAdmin
                ? <span style={{ color: 'var(--accent)', fontWeight: 500 }}>Admin</span>
                : 'Member'}
            </div>
          </div>
        )}
      </div>

      {/* Tab bar with sync indicator */}
      <div className="tab-bar">
        {['players', 'matches', 'history'].map(t => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
            style={{ position: 'relative' }}>
            {t === 'players' ? 'Players' : t === 'matches' ? 'Matches' : 'History'}
            {syncBadge === t && tab !== t && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: 7, height: 7, borderRadius: '50%',
                background: '#1D9E75',
              }} />
            )}
          </button>
        ))}
      </div>

      {tab === 'players' && (
        <TeamPlayersTab
          team={team}
          members={members}
          setMembers={setMembers}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          onGenerate={() => setTab('matches')}
        />
      )}
      {tab === 'matches' && (
        <TeamMatchesTab
          team={team}
          members={members}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          result={matchResult}
          setResult={setMatchResult}
          savedMeta={savedMeta}
          setSavedMeta={setSavedMeta}
          onStartPlaying={(session) => setPlaySession(session)}
        />
      )}
      {tab === 'history' && (
        <PlayHistory
          teamId={team.id}
          isAdmin={isAdmin}
          members={members}
          onBack={() => setTab('matches')}
        />
      )}
    </div>
  )
}
