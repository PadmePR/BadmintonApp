// src/features/matchPlay/MatchCard.jsx
import React, { useState } from 'react';
import { setWinner } from './matchPlayApi';

export default function MatchCard({ match, membersById, onWinnerSet }) {
  const [isSaving, setIsSaving] = useState(false);

  const teamAPlayers = (match.team_a?.players ?? []).map(id => membersById[id] || { id, name: id });
  const teamBPlayers = (match.team_b?.players ?? []).map(id => membersById[id] || { id, name: id });

  async function pickWinner(team) {
    setIsSaving(true);
    const winnerPlayers = team === 'A' ? (match.team_a.players ?? []) : (match.team_b.players ?? []);

    try {
      await setWinner(match.id, team, winnerPlayers, match.score ?? null);
      onWinnerSet?.();
    } catch (err) {
      console.error('Failed to set winner', err);
      alert('Failed to save winner: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={`match-card ${match.winner_team ? 'finished' : ''}`} style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>Match {match.match_index}</div>
        <div style={{ fontSize: 12, color: '#666' }}>{match.started_at ? new Date(match.started_at).toLocaleTimeString() : ''}</div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
        <div onClick={() => pickWinner('A')} style={{ flex: 1, padding: 12, borderRadius: 10, background: match.winner_team === 'A' ? '#dff0d8' : '#f5f5f5', cursor: 'pointer' }}>
          <div style={{ fontWeight: 'bold' }}>Team A</div>
          <div style={{ marginTop: 6 }}>{teamAPlayers.map(p => p.name).join(', ')}</div>
        </div>

        <div style={{ width: 48, textAlign: 'center' }}>VS</div>

        <div onClick={() => pickWinner('B')} style={{ flex: 1, padding: 12, borderRadius: 10, background: match.winner_team === 'B' ? '#dff0d8' : '#f5f5f5', cursor: 'pointer' }}>
          <div style={{ fontWeight: 'bold' }}>Team B</div>
          <div style={{ marginTop: 6 }}>{teamBPlayers.map(p => p.name).join(', ')}</div>
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 13 }}>
        {isSaving ? 'Saving...' : match.winner_team ? `Winner: Team ${match.winner_team}` : 'Tap a team to mark winner'}
      </div>
    </div>
  );
}
