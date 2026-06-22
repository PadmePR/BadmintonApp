// src/features/matchPlay/PlayHistory.jsx
import React, { useEffect, useState } from 'react';
import {
  fetchSessionsForTeam,
  fetchSessionMatches,
  deleteSession,
  computeSkillEstimates,
} from './matchPlayApi.js';
import { col, ini, sl } from '../../lib/utils.js';

function ScoreBadge({ score, winner, side }) {
  if (!score || (score.a == null && score.b == null)) return null;
  const val  = side === 'A' ? score.a : score.b;
  const isWinner = winner === side;
  if (val == null) return null;
  return (
    <span style={{
      display: 'inline-block',
      padding: '1px 7px',
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 700,
      background: isWinner ? 'var(--accent-light)' : 'var(--bg-tertiary)',
      color: isWinner ? 'var(--accent)' : 'var(--text-secondary)',
      border: `1px solid ${isWinner ? 'var(--accent)' : 'var(--border)'}`,
      marginLeft: 4,
    }}>
      {val}
    </span>
  );
}

function SessionDetail({ session, isAdmin, membersById, onDeleted }) {
  const [matches, setMatches]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);

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

  const rounds       = matches ? Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b) : [];
  const totalMatches = matches?.length ?? 0;
  const doneMatches  = matches?.filter(m => m.winner_team).length ?? 0;
  const scoredMatches = matches?.filter(m => m.score && (m.score.a != null || m.score.b != null)).length ?? 0;

  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', marginBottom: 10, overflow: 'hidden',
    }}>
      {/* Session summary row */}
      <div
        onClick={toggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '13px 16px', cursor: 'pointer', userSelect: 'none',
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
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {session.status === 'closed' ? (
              <>
                <span>{doneMatches || '?'} results recorded</span>
                {scoredMatches > 0 && (
                  <span style={{ color: '#1D9E75', fontWeight: 500 }}>· {scoredMatches} with scores</span>
                )}
              </>
            ) : session.status === 'active' ? (
              <span style={{ color: '#1D9E75', fontWeight: 500 }}>● In progress</span>
            ) : (
              <span>{session.status}</span>
            )}
          </div>
        </div>

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

        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="var(--text-tertiary)" strokeWidth="2.5"
          style={{ flexShrink: 0, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>

      {/* Expanded match detail */}
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
                  <div className="round-header" style={{ marginBottom: 8 }}>
                    <span className="round-label">Round {r}</span>
                    <span className="round-courts-badge">
                      {roundMatches.filter(m => m.winner_team).length}/{roundMatches.length} done
                    </span>
                    <div className="round-divider" />
                  </div>

                  {roundMatches.map((m, ci) => {
                    const teamA = m.team_a?.players ?? [];
                    const teamB = m.team_b?.players ?? [];
                    const winA  = m.winner_team === 'A';
                    const winB  = m.winner_team === 'B';
                    const hasScore = m.score && (m.score.a != null || m.score.b != null);

                    return (
                      <div key={m.id} style={{
                        padding: '8px 10px', marginBottom: 6,
                        background: 'var(--bg-secondary)', borderRadius: 'var(--radius)',
                        border: '1px solid var(--border)',
                      }}>
                        {/* Court label row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                            letterSpacing: '0.07em', color: 'var(--text-tertiary)',
                          }}>
                            Court {ci + 1}
                          </span>
                          {hasScore && (
                            <span style={{
                              fontSize: 11, fontWeight: 700,
                              color: 'var(--text-secondary)',
                              background: 'var(--bg-tertiary)',
                              padding: '1px 8px', borderRadius: 6,
                              border: '1px solid var(--border)',
                              letterSpacing: '0.04em',
                            }}>
                              {m.score.a ?? '—'} – {m.score.b ?? '—'}
                            </span>
                          )}
                        </div>

                        {/* Teams side by side */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
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
                              {winA && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 2 }}>
                                  <span style={{ fontSize: 13 }}>🏆</span>
                                  <ScoreBadge score={m.score} winner={m.winner_team} side="A" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* vs */}
                          <span style={{
                            fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)',
                            flexShrink: 0, paddingTop: 2,
                          }}>vs</span>

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
                              {winB && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', paddingRight: 2 }}>
                                  <ScoreBadge score={m.score} winner={m.winner_team} side="B" />
                                  <span style={{ fontSize: 13 }}>🏆</span>
                                </div>
                              )}
                            </div>
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

// ── Skill Estimates Panel ───────────────────────────────────────────────────
function SkillEstimatesPanel({ teamId, members, membersById }) {
  const [estimates, setEstimates] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [open, setOpen]           = useState(false);

  async function load() {
    if (estimates !== null) { setOpen(v => !v); return; }
    setLoading(true); setError('');
    try {
      const result = await computeSkillEstimates(teamId, membersById);
      setEstimates(result);
      setOpen(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const changed = estimates
    ? members.filter(m => estimates[m.id] !== undefined && Math.abs(estimates[m.id] - m.skill) >= 0.1)
    : [];

  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', marginBottom: 20, overflow: 'hidden',
    }}>
      <button
        onClick={load}
        disabled={loading}
        style={{
          width: '100%', padding: '13px 16px', border: 'none',
          background: 'none', cursor: loading ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'inherit',
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--radius)',
          background: 'var(--accent-light)', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2">
            <path d="M18 20V10M12 20V4M6 20v-6"/>
          </svg>
        </div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            Skill estimates from scores
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>
            Computed from matches where scores were recorded
          </div>
        </div>
        {loading ? (
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Computing…</span>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="var(--text-tertiary)" strokeWidth="2.5"
            style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        )}
      </button>

      {error && (
        <div style={{ padding: '0 16px 12px', fontSize: 13, color: '#A32D2D' }}>{error}</div>
      )}

      {open && estimates && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px' }}>
          {Object.keys(estimates).length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
              No scored matches found. Record scores during play sessions to enable this.
            </div>
          ) : changed.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
              Current skill levels already match the score-based estimates.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                Based on score margins, the following adjustments are suggested.
                These are estimates only — apply them manually if they look right.
              </div>
              {changed.map(m => {
                const est  = estimates[m.id];
                const diff = est - m.skill;
                const up   = diff > 0;
                const lab  = sl(Math.round(est));
                return (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', marginBottom: 6,
                    background: 'var(--bg-secondary)', borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--accent-light)', color: 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, flexShrink: 0,
                    }}>
                      {ini(m.name || '?')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{m.name}</div>
                    </div>
                    {/* Current */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Current</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)' }}>{m.skill}</div>
                    </div>
                    {/* Arrow */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke={up ? '#1D9E75' : '#A32D2D'} strokeWidth="2.5">
                      <path d={up ? 'M5 12h14M12 5l7 7-7 7' : 'M19 12H5M12 19l-7-7 7-7'}/>
                    </svg>
                    {/* Suggested */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Suggested</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: up ? '#1D9E75' : '#A32D2D' }}>
                        {est.toFixed(1)}
                      </div>
                    </div>
                    {/* Skill label */}
                    <span className="skill-badge" style={{ background: lab.bg, color: lab.fg }}>
                      {lab.t}
                    </span>
                  </div>
                );
              })}
              <div style={{
                fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8,
                padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: 8,
              }}>
                To apply: go to the Players tab and adjust skill levels manually.
                More scored matches will improve estimate accuracy.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main PlayHistory ────────────────────────────────────────────────────────
export default function PlayHistory({ teamId, isAdmin, members, onBack }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);

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

  const closedSessions = sessions.filter(s => s.status === 'closed');

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Match History</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
          {sessions.length} session{sessions.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Skill estimates — only when there are closed sessions and the viewer is admin */}
      {isAdmin && closedSessions.length > 0 && members.length > 0 && (
        <SkillEstimatesPanel
          teamId={teamId}
          members={members}
          membersById={membersById}
        />
      )}

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
