// src/features/matchPlay/PlayHistoryDetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchSessionMatches } from './matchPlayApi';

export default function PlayHistoryDetail() {
  const { sessionId } = useParams();
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const ms = await fetchSessionMatches(sessionId);
        setMatches(ms || []);
      } catch (err) { console.error(err); }
    }
    load();
  }, [sessionId]);

  const rounds = Array.from(new Set(matches.map(m=>m.round))).sort((a,b)=>a-b);

  return (
    <div style={{ padding:16 }}>
      <h2>Match Play Session {sessionId}</h2>
      <Link to="/play/history">Back to history</Link>
      {rounds.map(r => (
        <section key={r} style={{ marginTop: 16 }}>
          <h3>Round {r}</h3>
          {matches.filter(m=>m.round===r).map(m => (
            <div key={m.id} style={{ border:'1px solid #eee', padding:8, borderRadius:6, marginBottom:8 }}>
              <div><strong>Match {m.match_index}</strong></div>
              <div>Team A: {Array.isArray(m.team_a?.players) ? m.team_a.players.join(', ') : JSON.stringify(m.team_a)}</div>
              <div>Team B: {Array.isArray(m.team_b?.players) ? m.team_b.players.join(', ') : JSON.stringify(m.team_b)}</div>
              <div>Winner: {m.winner_team ? `Team ${m.winner_team}` : '—'}</div>
              <div>Winner players: {m.winner_players ? JSON.stringify(m.winner_players) : '—'}</div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
