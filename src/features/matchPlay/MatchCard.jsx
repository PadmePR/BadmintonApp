// src/features/matchPlay/MatchCard.jsx
import React, { useState } from 'react';
import { setWinner } from './matchPlayApi.js';
import { col, ini } from '../../lib/utils.js';

function PlayerPill({ player, memberIndex }) {
  const c = col(memberIndex);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        background: c.bg, color: c.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700,
      }}>
        {ini(player.name || '?')}
      </div>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
        {player.name || player.id}
      </span>
    </div>
  );
}

export default function MatchCard({ match, courtNumber, membersById, onWinnerSet }) {
  const [saving, setSaving] = useState(false);

  const teamAPlayers = (match.team_a?.players ?? []).map(id => membersById[id] || { id, name: String(id) });
  const teamBPlayers = (match.team_b?.players ?? []).map(id => membersById[id] || { id, name: String(id) });

  // Always allow picking/changing winner
  async function pickWinner(team) {
    if (saving) return;
    // If same team tapped again, treat as undo (clear winner)
    const newWinner = match.winner_team === team ? null : team;
    setSaving(true);
    const winnerPlayers = newWinner === 'A'
      ? (match.team_a?.players ?? [])
      : newWinner === 'B'
        ? (match.team_b?.players ?? [])
        : [];
    try {
      await setWinner(match.id, newWinner, winnerPlayers, null);
      onWinnerSet?.();
    } catch (err) {
      console.error('Failed to set winner', err);
      alert('Failed to save result: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const winner = match.winner_team; // 'A' | 'B' | null

  const teamStyle = (team) => ({
    flex: 1,
    display: 'flex', flexDirection: 'column', gap: 8,
    padding: '12px 12px',
    borderRadius: 'var(--radius)',
    cursor: saving ? 'default' : 'pointer',
    userSelect: 'none',
    transition: 'background 0.15s, border-color 0.15s, transform 0.1s',
    // Winner highlight uses accent; loser is dimmed
    background: winner === team
      ? 'var(--accent-light)'
      : winner && winner !== team
        ? 'var(--bg-secondary)'
        : 'var(--bg-secondary)',
    border: winner === team
      ? '2px solid var(--accent)'
      : '2px solid transparent',
    opacity: winner && winner !== team ? 0.55 : 1,
  });

  return (
    <div style={{
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      {/* Court header strip */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 14px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)' }}>
          Court {courtNumber}
        </span>

        {saving ? (
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Saving…</span>
        ) : winner ? (
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#1D9E75',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            Done · tap to change
          </span>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Tap winning team</span>
        )}
      </div>

      {/* Teams row */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, padding: 10 }}>
        {/* Team A */}
        <button
          onClick={() => pickWinner('A')}
          disabled={saving}
          style={{ all: 'unset', ...teamStyle('A') }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: winner === 'A' ? 'var(--accent)' : 'var(--text-tertiary)', marginBottom: 2 }}>
            Team A {winner === 'A' && '🏆'}
          </div>
          {teamAPlayers.map((p, i) => (
            <PlayerPill key={p.id} player={p} memberIndex={i} />
          ))}
        </button>

        {/* VS divider */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, flexShrink: 0,
          fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)',
        }}>
          vs
        </div>

        {/* Team B */}
        <button
          onClick={() => pickWinner('B')}
          disabled={saving}
          style={{ all: 'unset', ...teamStyle('B') }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: winner === 'B' ? 'var(--accent)' : 'var(--text-tertiary)', marginBottom: 2 }}>
            Team B {winner === 'B' && '🏆'}
          </div>
          {teamBPlayers.map((p, i) => (
            <PlayerPill key={p.id} player={p} memberIndex={i + 2} />
          ))}
        </button>
      </div>
    </div>
  );
}
