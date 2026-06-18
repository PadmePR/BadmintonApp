import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchSessionMatches, fetchTeamMembers, closeSession as apiCloseSession, fetchSession } from './matchPlayApi';
import MatchCard from './MatchCard';

export default function PlaySessionPage({ sessionId: propSessionId, onClose }) {
  const params = useParams?.() ?? {};
  const navigate = (useNavigate ? useNavigate() : () => {});
  const sessionId = propSessionId ?? params.sessionId;
  const [session, setSession] = useState(null);
  const [matches, setMatches] = useState([]);
  const [currentRound, setCurrentRound] = useState(null);
  const [now, setNow] = useState(new Date());
  const [members, setMembers] = useState([]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const s = await fetchSession(sessionId);
        setSession(s);

        const ms = await fetchSessionMatches(sessionId);
        setMatches(ms || []);
        if (ms && ms.length) setCurrentRound(ms[0].round);

        const teamId = s?.team_id ?? null;
        if (teamId) {
          const mems = await fetchTeamMembers(teamId);
          setMembers(mems || []);
        }
      } catch (err) {
        console.error(err);
        alert('Failed to load play session: ' + err.message);
      }
    }
    if (sessionId) load();
  }, [sessionId]);

  const rounds = useMemo(() => Array.from(new Set(matches.map(m => m.round))).sort((a,b)=>a-b), [matches]);
  const matchesThisRound = matches.filter(m => m.round === currentRound);

  const membersById = useMemo(() => {
    const map = {};
    for (const m of members) map[m.id] = m;
    return map;
  }, [members]);

  function nextRound() {
    const i = rounds.indexOf(currentRound);
    if (i < rounds.length - 1) setCurrentRound(rounds[i + 1]);
  }
  function prevRound() {
    const i = rounds.indexOf(currentRound);
    if (i > 0) setCurrentRound(rounds[i - 1]);
  }

  async function handleClose() {
    try {
      await apiCloseSession(sessionId);
      if (onClose) {
        onClose();
      } else if (navigate) {
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to close session: ' + err.message);
    }
  }

  // compute sitting out players for the current round
  const sittingOut = useMemo(() => {
    if (!members || members.length === 0) return [];
    const playingIds = new Set();
    for (const m of matchesThisRound) {
      const pa = m.team_a?.players ?? [];
      const pb = m.team_b?.players ?? [];
      for (const id of pa.concat(pb)) playingIds.add(id);
    }
    return members.filter(mm => !playingIds.has(mm.id));
  }, [members, matchesThisRound]);

  return (
    <div className="play-fullscreen" style={{ position:'fixed', inset:0, background:'#fff', zIndex:9999, overflow:'auto', display:'flex', flexDirection:'column' }}>
      <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:16, borderBottom:'1px solid #eee' }}>
        <div style={{ fontSize:18, fontWeight:700 }}>Play Mode</div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ fontSize:14 }}>{now.toLocaleString()}</div>
          <button className="btn" onClick={prevRound}>Prev Round</button>
          <button className="btn" onClick={nextRound}>Next Round</button>
          <button className="btn" onClick={handleClose}>Close Playing</button>
        </div>
      </header>

      <main style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20, padding:20 }}>
        <section>
          <h2>Round {currentRound}</h2>
          <div>
            {matchesThisRound.map(m => (
              <MatchCard key={m.id} match={m} membersById={membersById} onWinnerSet={async ()=>{
                const refreshed = await fetchSessionMatches(sessionId);
                setMatches(refreshed || []);
              }} />
            ))}
          </div>
        </section>

        <aside style={{ borderLeft:'1px solid #eee', paddingLeft:16 }}>
          <h3>Sitting Out</h3>
          {sittingOut.length ? (
            <ul>
              {sittingOut.map(s => <li key={s.id}>{s.name}</li>)}
            </ul>
          ) : <div>No sitting out players</div>}
        </aside>
      </main>
    </div>
  );
}
