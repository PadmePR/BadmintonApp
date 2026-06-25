// src/features/matchPlay/MatchCard.jsx
import React, { useState, useEffect } from 'react';
import { setWinner, setScore } from './matchPlayApi.js';
import { col, ini } from '../../lib/utils.js';

const COURT_COLORS = [
  { bg: 'linear-gradient(135deg, #E6F1FB, #B5D4F4)', fg: '#0C447C' },
  { bg: 'linear-gradient(135deg, #EAF3DE, #C0DD97)', fg: '#27500A' },
  { bg: 'linear-gradient(135deg, #FBEAF0, #F5C7D9)', fg: '#72243E' },
];
function courtColor(i) { return COURT_COLORS[i % COURT_COLORS.length]; }

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

function ScoreInput({ value, onChange, highlight, color, colorLight }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      background: highlight ? colorLight : 'var(--bg-tertiary)',
      border: `1.5px solid ${highlight ? color : 'var(--border-medium)'}`,
      borderRadius: 8, padding: '3px 4px',
      transition: 'background 0.15s, border-color 0.15s',
    }}>
      <button
        onClick={() => onChange(Math.max(0, (value ?? 0) - 1))}
        style={{
          width: 22, height: 22, border: 'none', borderRadius: 5,
          background: 'none', cursor: 'pointer', padding: 0,
          color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'inherit',
        }}
      >−</button>
      <input
        type="text"
        inputMode="numeric"
        value={value === null || value === undefined ? '' : String(value)}
        onChange={e => {
          const raw = e.target.value.replace(/[^0-9]/g, '');
          onChange(raw === '' ? null : Math.min(99, parseInt(raw, 10)));
        }}
        placeholder="—"
        style={{
          width: 28, border: 'none', background: 'none', outline: 'none',
          textAlign: 'center', fontSize: 14, fontWeight: 700,
          color: highlight ? color : 'var(--text)',
          fontFamily: 'inherit', padding: 0,
        }}
      />
      <button
        onClick={() => onChange(Math.min(99, (value ?? 0) + 1))}
        style={{
          width: 22, height: 22, border: 'none', borderRadius: 5,
          background: 'none', cursor: 'pointer', padding: 0,
          color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'inherit',
        }}
      >+</button>
    </div>
  );
}

export default function MatchCard({ match, courtNumber, membersById, onWinnerSet }) {
  const [saving, setSaving]       = useState(false);
  const [showScore, setShowScore] = useState(
    !!(match.score && (match.score.a != null || match.score.b != null))
  );
  const [scoreA, setScoreA] = useState(match.score?.a ?? null);
  const [scoreB, setScoreB] = useState(match.score?.b ?? null);

  // Sync local score state when the match prop updates (e.g. after refresh)
  useEffect(() => {
    setScoreA(match.score?.a ?? null);
    setScoreB(match.score?.b ?? null);
    if (match.score && (match.score.a != null || match.score.b != null)) {
      setShowScore(true);
    }
  }, [match.score]);

  const teamAPlayers = (match.team_a?.players ?? []).map(id => membersById[id] || { id, name: String(id) });
  const teamBPlayers = (match.team_b?.players ?? []).map(id => membersById[id] || { id, name: String(id) });

  // Tapping a team only updates the winner — score is untouched
  async function pickWinner(team) {
    if (saving) return;
    const newWinner = match.winner_team === team ? null : team;
    setSaving(true);
    const winnerPlayers = newWinner === 'A'
      ? (match.team_a?.players ?? [])
      : newWinner === 'B'
        ? (match.team_b?.players ?? [])
        : [];
    try {
      await setWinner(match.id, newWinner, winnerPlayers);
      onWinnerSet?.();
    } catch (err) {
      console.error('Failed to set winner', err);
      alert('Failed to save result: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  // Save score button — only updates the score column, never touches winner
  async function saveScore() {
    if (saving) return;
    if (scoreA === null && scoreB === null) return;
    setSaving(true);
    try {
      await setScore(match.id, { a: scoreA, b: scoreB });
      onWinnerSet?.(); // refresh parent so score badge updates
    } catch (err) {
      alert('Failed to save score: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const winner   = match.winner_team;
  const hasScore = match.score && (match.score.a != null || match.score.b != null);

  const teamColor = (team) => team === 'A' ? 'var(--team-a)' : 'var(--team-b)';
  const teamColorLight = (team) => team === 'A' ? 'var(--team-a-light)' : 'var(--team-b-light)';

  const teamStyle = (team) => ({
    flex: 1,
    display: 'flex', flexDirection: 'column', gap: 8,
    padding: '12px 12px',
    borderRadius: 'var(--radius)',
    cursor: saving ? 'default' : 'pointer',
    userSelect: 'none',
    transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
    background: winner === team ? teamColorLight(team) : 'var(--bg-secondary)',
    border: winner === team ? `2px solid ${teamColor(team)}` : '2px solid transparent',
    borderLeft: `4px solid ${teamColor(team)}`,
    boxShadow: winner === team ? `0 2px 10px ${teamColorLight(team)}` : 'none',
    opacity: winner && winner !== team ? 0.5 : 1,
  });

  const cc = courtColor(courtNumber - 1);

  return (
    <div className="match-card" style={{
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      {/* Court header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 14px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.07em', color: cc.fg,
          background: cc.bg, padding: '3px 10px', borderRadius: 20,
        }}>
          Court {courtNumber}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setShowScore(v => !v)}
            style={{
              fontSize: 11, fontWeight: 500, border: 'none', background: 'none',
              cursor: 'pointer', padding: '2px 6px', borderRadius: 5,
              color: showScore ? 'var(--accent)' : 'var(--text-tertiary)',
              fontFamily: 'inherit',
            }}
          >
            {hasScore && !showScore
              ? `${match.score.a ?? '—'} – ${match.score.b ?? '—'}`
              : showScore ? 'Hide score' : '+ Score'}
          </button>

          {saving ? (
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Saving…</span>
          ) : winner ? (
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--win)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              Done · tap to change
            </span>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Tap winning team</span>
          )}
        </div>
      </div>

      {/* Teams */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, padding: 10 }}>
        <button onClick={() => pickWinner('A')} disabled={saving} style={{ all: 'unset', ...teamStyle('A') }}>
          <div style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--team-a)', marginBottom: 2,
          }}>
            Team A {winner === 'A' && '🏆'}
          </div>
          {teamAPlayers.map((p, i) => <PlayerPill key={p.id} player={p} memberIndex={i} />)}
        </button>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 30, height: 30, margin: 'auto 0', flexShrink: 0, fontSize: 10, fontWeight: 700,
          color: 'var(--text-tertiary)', borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--team-a-light), var(--team-b-light))',
        }}>vs</div>

        <button onClick={() => pickWinner('B')} disabled={saving} style={{ all: 'unset', ...teamStyle('B') }}>
          <div style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--team-b)', marginBottom: 2,
          }}>
            Team B {winner === 'B' && '🏆'}
          </div>
          {teamBPlayers.map((p, i) => <PlayerPill key={p.id} player={p} memberIndex={i + 2} />)}
        </button>
      </div>

      {/* Score panel */}
      {showScore && (
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '10px 14px',
          background: 'var(--bg-secondary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: 'var(--text-tertiary)', flexShrink: 0,
            }}>Score</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--team-a)',
                }}>Team A</span>
                <ScoreInput value={scoreA} onChange={setScoreA} highlight={winner === 'A'}
                  color="var(--team-a)" colorLight="var(--team-a-light)" />
              </div>

              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-tertiary)', marginTop: 14 }}>–</span>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--team-b)',
                }}>Team B</span>
                <ScoreInput value={scoreB} onChange={setScoreB} highlight={winner === 'B'}
                  color="var(--team-b)" colorLight="var(--team-b-light)" />
              </div>
            </div>

            <button
              onClick={saveScore}
              disabled={saving || (scoreA === null && scoreB === null)}
              style={{
                padding: '6px 14px', border: 'none', borderRadius: 7,
                background: 'var(--accent)', color: 'white',
                fontSize: 12, fontWeight: 600,
                cursor: saving || (scoreA === null && scoreB === null) ? 'default' : 'pointer',
                opacity: saving || (scoreA === null && scoreB === null) ? 0.45 : 1,
                fontFamily: 'inherit', marginTop: 14,
              }}
            >
              {saving ? '…' : 'Save score'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
