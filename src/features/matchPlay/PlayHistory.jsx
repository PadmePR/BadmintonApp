// src/features/matchPlay/PlayHistory.jsx
import React, { useEffect, useState } from 'react';
import { fetchSessionsForTeam, fetchSessionMatches } from './matchPlayApi';
import { Link } from 'react-router-dom';

export default function PlayHistory({ teamId }) {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchSessionsForTeam(teamId);
        setSessions(data || []);
      } catch (err) {
        console.error(err);
      }
    }
    if (teamId) load();
  }, [teamId]);

  return (
    <div style={{ padding: 16 }}>
      <h2>Match Play History</h2>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr>
            <th>Play date</th>
            <th>Admin</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sessions.map(s => (
            <tr key={s.id}>
              <td>{s.started_at ? new Date(s.started_at).toLocaleString() : ''}</td>
              <td>{s.admin_id}</td>
              <td>{s.status}</td>
              <td><Link to={`/play/history/${s.id}`}>View</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
