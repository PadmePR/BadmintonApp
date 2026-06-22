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

/**
 * Record the winner (and optionally the score) for a match.
 *
 * @param {string} matchId
 * @param {'A'|'B'|null} winnerTeam
 * @param {string[]} winnerPlayers  — array of member IDs on the winning team
 * @param {{ a: number|null, b: number|null }|null} score  — optional point totals
 */
export async function setWinner(matchId, winnerTeam, winnerPlayers = [], score = null) {
  const payload = {
    winner_team: winnerTeam,
    winner_players: winnerPlayers,
    // Only persist score when at least one side has a value
    score: score && (score.a != null || score.b != null) ? score : null,
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
  // match_play_matches rows cascade-delete via FK
  const { error } = await supabase
    .from('match_play_sessions')
    .delete()
    .eq('id', sessionId);
  if (error) throw error;
  return true;
}

/**
 * Compute a naive skill estimate for each player in a team from recorded match
 * scores across one or more sessions.
 *
 * Algorithm (Elo-lite, score-weighted):
 *   For each match where a score was recorded:
 *     - Compute share_A = score.a / (score.a + score.b)  (0–1)
 *     - "Expected" share based on combined skill ratio
 *     - Delta = K * (actual_share − expected_share)
 *     - Apply delta to each player on the winning / losing side
 *
 * Returns { [memberId]: estimatedSkill (1–10) }
 *
 * @param {string} teamId
 * @param {{ [id: string]: { skill: number } }} membersById  — current skill levels
 */
export async function computeSkillEstimates(teamId, membersById) {
  // Fetch all closed sessions for the team
  const { data: sessions, error: sErr } = await supabase
    .from('match_play_sessions')
    .select('id')
    .eq('team_id', teamId)
    .eq('status', 'closed');
  if (sErr) throw sErr;
  if (!sessions || sessions.length === 0) return {};

  const sessionIds = sessions.map(s => s.id);

  // Fetch all matches that have both a winner and a score
  const { data: matches, error: mErr } = await supabase
    .from('match_play_matches')
    .select('id, team_a, team_b, winner_team, score')
    .in('session_id', sessionIds)
    .not('winner_team', 'is', null)
    .not('score', 'is', null);
  if (mErr) throw mErr;
  if (!matches || matches.length === 0) return {};

  const K = 0.5; // learning rate — tune to taste
  // Start from current DB skill levels (1–10 scale internally as floats)
  const estimates = {};
  for (const [id, m] of Object.entries(membersById)) {
    estimates[id] = m.skill ?? 5;
  }

  for (const match of matches) {
    const { team_a, team_b, score } = match;
    if (!score || score.a == null || score.b == null) continue;
    const total = score.a + score.b;
    if (total === 0) continue;

    const playersA = team_a?.players ?? [];
    const playersB = team_b?.players ?? [];
    if (playersA.length === 0 || playersB.length === 0) continue;

    const avgA = playersA.reduce((s, id) => s + (estimates[id] ?? 5), 0) / playersA.length;
    const avgB = playersB.reduce((s, id) => s + (estimates[id] ?? 5), 0) / playersB.length;
    const expectedA = avgA / (avgA + avgB); // expected share for A
    const actualA   = score.a / total;

    const delta = K * (actualA - expectedA);

    // A players move up if they over-performed, B players move inversely
    for (const id of playersA) {
      if (estimates[id] !== undefined) estimates[id] = Math.min(10, Math.max(1, estimates[id] + delta));
    }
    for (const id of playersB) {
      if (estimates[id] !== undefined) estimates[id] = Math.min(10, Math.max(1, estimates[id] - delta));
    }
  }

  // Round to 1 decimal
  const result = {};
  for (const [id, val] of Object.entries(estimates)) {
    result[id] = Math.round(val * 10) / 10;
  }
  return result;
}
