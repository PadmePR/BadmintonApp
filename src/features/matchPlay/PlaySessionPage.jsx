// src/features/matchPlay/PlaySessionPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { fetchSessionMatches, fetchTeamMembers, closeSession as apiCloseSession } from './matchPlayApi.js';
import { col, ini } from '../../lib/utils.js';
import MatchCard from './MatchCard.jsx';

export default function PlaySessionPage({ sessionId, teamId, onClose }) {
  const [matches, setMatches]           = useState([]);
  const [members, setMembers]           = useState([]);
  const [currentRound, setCurrentRound] = useState(null);
  const [now, setNow]                   = useState(new Date());
  const [closing, setClosing]           = useState(false);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load data
  useEffect(() => {
    async function load() {
      try {
        const ms = await fetchSessionMatches(sessionId);
        setMatches(ms || []);
        if (ms && ms.length) setCurrentRound(ms[0].round);

        // teamId is passed directly from TeamView — no need to call fetchSessionsForTeam
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

  const rounds            = useMemo(() => Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b), [matches]);
  const matchesThisRound  = matches.filter(m => m.round === currentRound);

  const membersById = useMemo(() => {
    const map = {};
    for (const m of members) map[m.id] = m;
    return map;
  }, [members]);

  const roundIndex = rounds.indexOf(currentRound);

  function nextRound() { if (roundIndex < rounds.length - 1) setCurrentRound(rounds[roundIndex + 1]); }
  function prevRound() { if (roundIndex > 0) setCurrentRound(rounds[roundIndex - 1]); }

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

  async function refreshMatches() {
    const refreshed = await fetchSessionMatches(sessionId);
    setMatches(refreshed || []);
  }

  // Players sitting out this round
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

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={handleClose}
          disabled={closing}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '1px solid var(--border-medium)', background: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, color: 'var(--text)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            🏸 Play Mode
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {totalCount > 0 && (
              <> · <span style={{ color: doneCount === totalCount ? '#1D9E75' : 'var(--text-secondary)' }}>
                {doneCount}/{totalCount} matches done
              </span></>
            )}
          </div>
        </div>

        <button className="btn-danger" onClick={handleClose} disabled={closing}
          style={{ fontSize: 13, padding: '8px 14px' }}>
          {closing ? 'Ending…' : 'End Session'}
        </button>
      </div>

      {/* ── Round tab bar ── */}
      <div className="tab-bar" style={{ marginBottom: 16 }}>
        {rounds.map(r => (
          <button
            key={r}
            className={`tab-btn${currentRound === r ? ' active' : ''}`}
            onClick={() => setCurrentRound(r)}
          >
            Round {r}
          </button>
        ))}
      </div>

      {/* ── Round nav (prev / next) ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button className="btn-secondary" onClick={prevRound} disabled={roundIndex <= 0}
          style={{ fontSize: 13, padding: '7px 14px' }}>
          ← Prev
        </button>

        <div style={{ textAlign: 'center' }}>
          <span className="round-label">Round {currentRound}</span>
          {' '}
          <span className="round-courts-badge">{totalCount} court{totalCount !== 1 ? 's' : ''}</span>
        </div>

        <button className="btn-secondary" onClick={nextRound} disabled={roundIndex >= rounds.length - 1}
          style={{ fontSize: 13, padding: '7px 14px' }}>
          Next →
        </button>
      </div>

      {/* ── Match cards ── */}
      <div className={`courts-grid courts-${Math.min(totalCount || 1, 3)}`} style={{ marginBottom: 20 }}>
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
            {sittingOut.map((s, i) => {
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
