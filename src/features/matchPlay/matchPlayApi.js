// src/features/matchPlay/matchPlayApi.js

import { supabase } from '../../lib/supabase.js';

export async function startPlaying(teamMatchesId) {
  const { data: plan, error: planErr } = await supabase
    .from('team_matches')
    .select('id, team_id, rounds')
    .eq('id', teamMatchesId)
    .single();
  if (planErr) throw planErr;
  if (!plan || !plan.rounds) throw new Error('No generated match plan found.');

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

  const matchesToInsert = [];
  for (let roundIndex = 0; roundIndex < plan.rounds.length; roundIndex++) {
    const roundObj = plan.rounds[roundIndex];
    const roundNumber = roundIndex + 1;
    const matchesArr = roundObj.matches ?? [];
    for (let mi = 0; mi < matchesArr.length; mi++) {
      const m = matchesArr[mi];
      let t1, t2;
      if (Array.isArray(m)) {
        t1 = m[0] ?? [];
        t2 = m[1] ?? [];
      } else {
        t1 = m.team_a ?? m.a ?? [];
        t2 = m.team_b ?? m.b ?? [];
      }
      matchesToInsert.push({
        session_id: session.id,
        round: roundNumber,
        match_index: mi,
        team_a: { players: (Array.isArray(t1) ? t1 : []).map(p => p.id ?? p) },
        team_b: { players: (Array.isArray(t2) ? t2 : []).map(p => p.id ?? p) },
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

/**
 * Record the winner and optionally the score for a match.
 * score: { a: number|null, b: number|null } | null
 */
export async function setWinner(matchId, winnerTeam, winnerPlayers = [], score = null) {
  const payload = {
    winner_team: winnerTeam,
    winner_players: winnerPlayers,
    score: score,
    finished_at: winnerTeam ? new Date().toISOString() : null,
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
  const { error } = await supabase
    .from('match_play_sessions')
    .delete()
    .eq('id', sessionId);
  if (error) throw error;
  return true;
}
