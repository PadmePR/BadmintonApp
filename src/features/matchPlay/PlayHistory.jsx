// src/features/matchPlay/PlayHistory.jsx
import React, { useEffect, useState } from 'react';
import { fetchSessionsForTeam, fetchSessionMatches, deleteSession } from './matchPlayApi.js';
import { col, ini } from '../../lib/utils.js';

function PlayerName({ id, membersById }) {
  const m = membersById[id];
  return <span>{m ? m.name : id}</span>;
}

function SessionDetail({ session, isAdmin, membersById, onDeleted }) {
  const [matches, setMatches]     = useState(null); // null = not yet loaded
  const [loading, setLoading]     = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [expanded, setExpanded]   = useState(false);

  async function toggle() {
    if (!expanded && matches === null) {
      setLoading(true);
      try {
        const ms = await fetchSessionMatches(session.id);
        setMatches(ms || []);
      } catch (err) {
        alert('Failed to load session: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    setExpanded(v => !v);
  }

  async function handleDelete() {
    if (!confirm('Delete this session and all its match results? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteSession(session.id);
      onDeleted(session.id);
    } catch (err) {
      alert('Failed to delete session: ' + err.message);
      setDeleting(false);
    }
  }

  const date = session.started_at
    ? new Date(session.started_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const time = session.started_at
    ? new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const rounds = matches
    ? Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b)
    : [];

  const totalMatches  = matches?.length ?? 0;
  const doneMatches   = matches?.filter(m => m.winner_team).length ?? 0;

  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', marginBottom: 10, overflow: 'hidden',
    }}>
      {/* Session row — always visible */}
      <div
        onClick={toggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '13px 16px', cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Date badge */}
        <div style={{
          flexShrink: 0, width: 42, textAlign: 'center',
          background: 'var(--accent-light)', borderRadius: 'var(--radius)', padding: '5px 4px',
        }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent)', lineHeight: 1.1 }}>
            {new Date(session.started_at || Date.now()).getDate()}
          </div>
          <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.04em' }}>
            {new Date(session.started_at || Date.now()).toLocaleDateString(undefined, { month: 'short' })}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            {date} · {time}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {session.status === 'closed'
              ? `${doneMatches || '?'} results recorded`
              : session.status === 'active'
                ? <span style={{ color: '#1D9E75', fontWeight: 500 }}>● In progress</span>
                : session.status}
          </div>
        </div>

        {/* Admin delete */}
        {isAdmin && (
          <button
            className="btn-danger"
            onClick={e => { e.stopPropagation(); handleDelete(); }}
            disabled={deleting}
            style={{ fontSize: 12, padding: '5px 10px', flexShrink: 0 }}
          >
            {deleting ? '…' : 'Delete'}
          </button>
        )}

        {/* Chevron */}
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="var(--text-tertiary)" strokeWidth="2.5"
          style={{ flexShrink: 0, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px' }}>
          {loading ? (
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '8px 0' }}>Loading…</div>
          ) : matches && matches.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No match data recorded.</div>
          ) : (
            rounds.map(r => {
              const roundMatches = matches.filter(m => m.round === r);
              return (
                <div key={r} style={{ marginBottom: 16 }}>
                  {/* Round header */}
                  <div className="round-header" style={{ marginBottom: 8 }}>
                    <span className="round-label">Round {r}</span>
                    <span className="round-courts-badge">
                      {roundMatches.filter(m => m.winner_team).length}/{roundMatches.length} done
                    </span>
                    <div className="round-divider" />
                  </div>

                  {roundMatches.map((m, ci) => {
                    const teamA = (m.team_a?.players ?? []);
                    const teamB = (m.team_b?.players ?? []);
                    const winA  = m.winner_team === 'A';
                    const winB  = m.winner_team === 'B';

                    return (
                      <div key={m.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 10px', marginBottom: 6,
                        background: 'var(--bg-secondary)', borderRadius: 'var(--radius)',
                        border: '1px solid var(--border)',
                      }}>
                        {/* Court label */}
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)', flexShrink: 0, width: 44 }}>
                          Court {ci + 1}
                        </span>

                        {/* Team A */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {teamA.map((id, i) => {
                              const member = membersById[id];
                              const c = col(i);
                              return (
                                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <div style={{
                                    width: 20, height: 20, borderRadius: '50%',
                                    background: c.bg, color: c.fg,
                                    fontSize: 8, fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                  }}>
                                    {ini(member?.name || '?')}
                                  </div>
                                  <span style={{
                                    fontSize: 12,
                                    fontWeight: winA ? 600 : 400,
                                    color: winA ? 'var(--text)' : 'var(--text-secondary)',
                                  }}>
                                    {member?.name || id}
                                  </span>
                                </div>
                              );
                            })}
                            {winA && <span style={{ fontSize: 13, paddingLeft: 2 }}>🏆</span>}
                          </div>
                        </div>

                        {/* vs */}
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', flexShrink: 0 }}>vs</span>

                        {/* Team B */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
                            {teamB.map((id, i) => {
                              const member = membersById[id];
                              const c = col(i + 2);
                              return (
                                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <div style={{
                                    width: 20, height: 20, borderRadius: '50%',
                                    background: c.bg, color: c.fg,
                                    fontSize: 8, fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                  }}>
                                    {ini(member?.name || '?')}
                                  </div>
                                  <span style={{
                                    fontSize: 12,
                                    fontWeight: winB ? 600 : 400,
                                    color: winB ? 'var(--text)' : 'var(--text-secondary)',
                                  }}>
                                    {member?.name || id}
                                  </span>
                                </div>
                              );
                            })}
                            {winB && <span style={{ fontSize: 13, paddingRight: 2 }}>🏆</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function PlayHistory({ teamId, isAdmin, members, onBack }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);

  // Build a members lookup map from the already-loaded members array
  const membersById = {};
  for (const m of (members || [])) membersById[m.id] = m;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchSessionsForTeam(teamId);
        setSessions(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (teamId) load();
  }, [teamId]);

  function handleDeleted(deletedId) {
    setSessions(prev => prev.filter(s => s.id !== deletedId));
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Match History</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
          {sessions.length} session{sessions.length !== 1 ? 's' : ''}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
          Loading history…
        </div>
      ) : sessions.length === 0 ? (
        <div className="empty-state">
          No match sessions recorded yet. Start a playing session to begin tracking results.
        </div>
      ) : (
        sessions.map(s => (
          <SessionDetail
            key={s.id}
            session={s}
            isAdmin={isAdmin}
            membersById={membersById}
            onDeleted={handleDeleted}
          />
        ))
      )}
    </div>
  );
}
