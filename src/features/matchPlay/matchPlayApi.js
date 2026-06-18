// src/features/matchPlay/matchPlayApi.js

import { supabase } from '../../lib/supabase.js';

export async function startPlaying(teamMatchesId) {
  // 1) fetch plan and derive team_id
  const { data: plan, error: planErr } = await supabase
    .from('team_matches')
    .select('id, team_id, rounds')
    .eq('id', teamMatchesId)
    .single();
  if (planErr) throw planErr;
  if (!plan || !plan.rounds) throw new Error('No generated match plan found.');

  // 2) create session row
  const user = (await supabase.auth.getUser()).data?.user;
  const adminId = user?.id ?? null;
  const { data: session, error: sessErr } = await supabase
    .from('match_play_sessions')
    .insert([{
      team_matches_id: plan.id,
      team_id: plan.team_id,
      admin_id: adminId,
      status: 'active'
    }])
    .select('*')
    .single();
  if (sessErr) throw sessErr;

  // 3) map rounds -> match_play_matches
  // The match engine serialises rounds as:
  //   { courts, sitting: [...], matches: [[t1_players, t2_players], ...] }
  // where each match is a 2-element array of player-object arrays.
  const matchesToInsert = [];
  for (let roundIndex = 0; roundIndex < plan.rounds.length; roundIndex++) {
    const roundObj = plan.rounds[roundIndex];
    const roundNumber = roundIndex + 1; // 1-based round number
    const matchesArr = roundObj.matches ?? [];
    for (let mi = 0; mi < matchesArr.length; mi++) {
      const m = matchesArr[mi];
      // Each match is either a [t1, t2] array pair (from the match engine)
      // or an object with team_a / team_b keys.
      let t1, t2;
      if (Array.isArray(m)) {
        t1 = m[0] ?? [];
        t2 = m[1] ?? [];
      } else {
        t1 = m.team_a ?? m.a ?? [];
        t2 = m.team_b ?? m.b ?? [];
      }
      const team_a = {
        players: (Array.isArray(t1) ? t1 : []).map(p => p.id ?? p),
      };
      const team_b = {
        players: (Array.isArray(t2) ? t2 : []).map(p => p.id ?? p),
      };

      matchesToInsert.push({
        session_id: session.id,
        round: roundNumber,
        match_index: mi,
        team_a,
        team_b,
        sitting_out: false,
      });
    }
  }

  const { error: insertErr } = await supabase
    .from('match_play_matches')
    .insert(matchesToInsert);
  if (insertErr) {
    await supabase.from('match_play_sessions').update({ status: 'error' }).eq('id', session.id);
    throw insertErr;
  }

  return session;
}

export async function setWinner(matchId, winnerTeam, winnerPlayers = [], score = null) {
  const payload = {
    winner_team: winnerTeam,
    winner_players: winnerPlayers,
    score,
    finished_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('match_play_matches')
    .update(payload)
    .eq('id', matchId);

  if (error) throw error;
  return true;
}

export async function closeSession(sessionId) {
  const { error } = await supabase
    .from('match_play_sessions')
    .update({ status: 'closed', ended_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) throw error;
  return true;
}

export async function fetchSessionsForTeam(teamId) {
  const { data, error } = await supabase
    .from('match_play_sessions')
    .select('id, team_matches_id, admin_id, status, started_at, ended_at, created_at')
    .eq('team_id', teamId)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchSessionMatches(sessionId) {
  const { data, error } = await supabase
    .from('match_play_matches')
    .select('*')
    .eq('session_id', sessionId)
    .order('round', { ascending: true })
    .order('match_index', { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchTeamMembers(teamId) {
  const { data, error } = await supabase
    .from('team_members')
    .select('id, user_id, name, absent, is_admin')
    .eq('team_id', teamId)
    .eq('absent', false);
  if (error) throw error;
  return data;
}

export async function deleteSession(sessionId) {
  // match_play_matches rows cascade-delete via FK
  const { error } = await supabase
    .from('match_play_sessions')
    .delete()
    .eq('id', sessionId);
  if (error) throw error;
  return true;
}
