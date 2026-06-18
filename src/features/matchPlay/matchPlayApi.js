import { supabase } from '../../lib/supabase.js'

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
  const { data: userData } = await supabase.auth.getUser();
  const adminId = userData?.user?.id ?? null;
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
  const matchesToInsert = [];
  for (const roundObj of plan.rounds) {
    const roundNumber = roundObj.round ?? roundObj.round_number ?? null;
    const matchesArr = roundObj.matches ?? [];
    for (const m of matchesArr) {
      const match_index = m.match_index ?? m.index ?? 0;
      const team_a = m.team_a ?? m.a ?? { team_id: m.team_a_id ?? null, players: m.team_a_player_ids ?? [] };
      const team_b = m.team_b ?? m.b ?? { team_id: m.team_b_id ?? null, players: m.team_b_player_ids ?? [] };

      matchesToInsert.push({
        session_id: session.id,
        round: roundNumber ?? 0,
        match_index,
        team_a,
        team_b,
        sitting_out: !!m.sitting_out
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
    winner_team: winnerTeam, // 'A' or 'B'
    winner_players: winnerPlayers, // e.g. ['uuid1','uuid2'] (team_members.id)
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

export async function fetchSession(sessionId) {
  const { data, error } = await supabase
    .from('match_play_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  if (error) throw error;
  return data;
}
