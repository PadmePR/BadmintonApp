// src/features/matchPlay/MatchCard.jsx
import React, { useState } from 'react';
import { setWinner } from './matchPlayApi.js';
import { col, ini } from '../../lib/utils.js';

function PlayerChip({ player, index }) {
  const c = col(index);
  return (
    <div className="team-player">
      <div className="tp-avatar" style={{ background: c.bg, color: c.fg }}>
        {ini(player.name || '?')}
      </div>
      <div className="tp-name">{player.name || player.id}</div>
    </div>
  );
}

export default function MatchCard({ match, courtNumber, membersById, onWinnerSet }) {
  const [saving, setSaving] = useState(false);

  const teamAPlayers = (match.team_a?.players ?? []).map(id => membersById[id] || { id, name: String(id) });
  const teamBPlayers = (match.team_b?.players ?? []).map(id => membersById[id] || { id, name: String(id) });

  const isFinished = !!match.winner_team;

  async function pickWinner(team) {
    if (isFinished || saving) return;
    setSaving(true);
    const winnerPlayers = team === 'A' ? (match.team_a?.players ?? []) : (match.team_b?.players ?? []);
    try {
      await setWinner(match.id, team, winnerPlayers, null);
      onWinnerSet?.();
    } catch (err) {
      console.error('Failed to set winner', err);
      alert('Failed to save winner: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="match-card" style={isFinished ? { opacity: 0.75 } : {}}>
      {/* Header */}
      <div className="match-header">
        <span className="match-num">Court {courtNumber}</span>
        {isFinished ? (
          <span className="tag tag-perfect">✓ Done</span>
        ) : saving ? (
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Saving…</span>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Tap winner</span>
        )}
      </div>

      {/* Teams */}
      <div className="vs-row">
        {/* Team A */}
        <button
          onClick={() => pickWinner('A')}
          disabled={isFinished || saving}
          style={{
            all: 'unset', display: 'flex', flexDirection: 'column', gap: 7,
            padding: '10px 10px', borderRadius: 'var(--radius)',
            cursor: isFinished ? 'default' : 'pointer',
            background: match.winner_team === 'A' ? 'var(--accent-light)' : 'var(--bg-secondary)',
            border: match.winner_team === 'A' ? '1.5px solid var(--accent)' : '1.5px solid transparent',
            width: '100%', transition: 'background 0.15s, border-color 0.15s',
          }}
        >
          {teamAPlayers.map((p, i) => <PlayerChip key={p.id} player={p} index={i} />)}
          {match.winner_team === 'A' && (
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginTop: 4 }}>Winner 🏆</div>
          )}
        </button>

        <div className="vs-divider">vs</div>

        {/* Team B */}
        <button
          onClick={() => pickWinner('B')}
          disabled={isFinished || saving}
          style={{
            all: 'unset', display: 'flex', flexDirection: 'column', gap: 7,
            padding: '10px 10px', borderRadius: 'var(--radius)',
            cursor: isFinished ? 'default' : 'pointer',
            background: match.winner_team === 'B' ? 'var(--accent-light)' : 'var(--bg-secondary)',
            border: match.winner_team === 'B' ? '1.5px solid var(--accent)' : '1.5px solid transparent',
            width: '100%', transition: 'background 0.15s, border-color 0.15s',
          }}
        >
          {teamBPlayers.map((p, i) => <PlayerChip key={p.id} player={p} index={i + 2} />)}
          {match.winner_team === 'B' && (
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginTop: 4 }}>Winner 🏆</div>
          )}
        </button>
      </div>
    </div>
  );
}
