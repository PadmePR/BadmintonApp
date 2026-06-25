// src/features/matchPlay/PlaySessionPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { fetchSessionMatches, fetchTeamMembers, closeSession as apiCloseSession } from './matchPlayApi.js';
import { col, ini } from '../../lib/utils.js';
import MatchCard from './MatchCard.jsx';
import './play.css';

export default function PlaySessionPage({ sessionId, teamId, onClose }) {
  const [matches, setMatches]           = useState([]);
  const [members, setMembers]           = useState([]);
  const [currentRound, setCurrentRound] = useState(null);
  const [now, setNow]                   = useState(new Date());
  const [closing, setClosing]           = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const ms = await fetchSessionMatches(sessionId);
        setMatches(ms || []);
        if (ms && ms.length) setCurrentRound(ms[0].round);
        if (teamId) {
          const mems = await fetchTeamMembers(teamId);
          setMembers(mems || []);
        }
      } catch (err) {
        console.error(err);
        alert('Failed to load play session: ' + err.message);
      }
    }
    load();
  }, [sessionId, teamId]);

  const rounds           = useMemo(() => Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b), [matches]);
  const matchesThisRound = matches.filter(m => m.round === currentRound);
  const roundIndex       = rounds.indexOf(currentRound);

  const membersById = useMemo(() => {
    const map = {};
    for (const m of members) map[m.id] = m;
    return map;
  }, [members]);

  async function refreshMatches() {
    const refreshed = await fetchSessionMatches(sessionId);
    setMatches(refreshed || []);
  }

  async function handleClose() {
    if (!confirm('End this playing session?')) return;
    setClosing(true);
    try {
      await apiCloseSession(sessionId);
      if (onClose) onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to close session: ' + err.message);
      setClosing(false);
    }
  }

  const sittingOut = useMemo(() => {
    if (!members.length) return [];
    const playingIds = new Set();
    for (const m of matchesThisRound) {
      for (const id of [...(m.team_a?.players ?? []), ...(m.team_b?.players ?? [])]) {
        playingIds.add(id);
      }
    }
    return members.filter(mm => !playingIds.has(mm.id));
  }, [members, matchesThisRound]);

  const doneCount  = matchesThisRound.filter(m => m.winner_team).length;
  const totalCount = matchesThisRound.length;
  const allDone    = totalCount > 0 && doneCount === totalCount;

  return (
    <div>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
        padding: '16px 18px', borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, var(--accent), var(--team-a))',
        boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: '#fff' }}>🏸 Play Mode</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <button onClick={handleClose} disabled={closing}
          style={{
            fontSize: 13, fontWeight: 600, padding: '8px 14px',
            border: '1px solid rgba(255,255,255,0.5)', borderRadius: 'var(--radius)',
            background: 'rgba(255,255,255,0.12)', color: '#fff',
          }}>
          {closing ? 'Ending…' : 'End Session'}
        </button>
      </div>

      {/* ── Round nav — prev / label / next only, no tab scroll ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
        background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '10px 14px',
      }}>
        <button
          onClick={() => setCurrentRound(rounds[roundIndex - 1])}
          disabled={roundIndex <= 0}
          style={{
            width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border-medium)',
            background: 'none', color: 'var(--text-secondary)', cursor: roundIndex <= 0 ? 'default' : 'pointer',
            opacity: roundIndex <= 0 ? 0.35 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>
            Round {currentRound}
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)' }}>
              {' '}· {totalCount} court{totalCount !== 1 ? 's' : ''}{allDone ? ' · ✓' : ''}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {rounds.map(r => (
              <span key={r} style={{
                width: r === currentRound ? 8 : 6, height: r === currentRound ? 8 : 6,
                borderRadius: '50%', flexShrink: 0,
                background: r === currentRound ? 'var(--accent)' : 'var(--border-medium)',
                transition: 'all 0.15s',
              }} />
            ))}
          </div>
        </div>

        <button
          onClick={() => setCurrentRound(rounds[roundIndex + 1])}
          disabled={roundIndex >= rounds.length - 1}
          style={{
            width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border-medium)',
            background: 'none', color: 'var(--text-secondary)', cursor: roundIndex >= rounds.length - 1 ? 'default' : 'pointer',
            opacity: roundIndex >= rounds.length - 1 ? 0.35 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      {/* ── Match cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {matchesThisRound.map((m, ci) => (
          <MatchCard
            key={m.id}
            match={m}
            courtNumber={ci + 1}
            membersById={membersById}
            onWinnerSet={refreshMatches}
          />
        ))}
      </div>

      {/* ── Sitting out ── */}
      {sittingOut.length > 0 && (
        <div className="sitting-out">
          <span className="sitting-label">Sitting out:</span>
          <div className="sitting-players">
            {sittingOut.map(s => {
              const c = col(members.findIndex(mm => mm.id === s.id));
              return (
                <div className="sitting-chip" key={s.id}>
                  <div className="sitting-av" style={{ background: c.bg, color: c.fg }}>
                    {ini(s.name || '?')}
                  </div>
                  <span className="sitting-nm">{s.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
