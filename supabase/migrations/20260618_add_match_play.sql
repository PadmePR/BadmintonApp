-- supabase/migrations/20260618_add_match_play.sql

-- Create sessions table (one play session per "Start Playing")
create table if not exists public.match_play_sessions (
  id uuid not null default gen_random_uuid() primary key,
  team_matches_id uuid null references public.team_matches(id) on delete set null,
  team_id uuid null references public.teams(id) on delete set null,
  admin_id uuid null references auth.users(id) on delete set null,
  status text not null default 'active', -- active | closed | error
  started_at timestamptz null default now(),
  ended_at timestamptz null,
  created_at timestamptz null default now()
);

-- Create per-match table for sessions
create table if not exists public.match_play_matches (
  id uuid not null default gen_random_uuid() primary key,
  session_id uuid not null references public.match_play_sessions(id) on delete cascade,
  round integer not null,
  match_index integer not null,
  team_a jsonb not null,
  team_b jsonb not null,
  sitting_out boolean default false,
  winner_team text null,
  winner_players jsonb null,
  score text null,
  started_at timestamptz null,
  finished_at timestamptz null,
  created_at timestamptz null default now()
);

-- Indexes to help queries
create index if not exists idx_mpm_session_round on public.match_play_matches(session_id, round);
create index if not exists idx_mps_started_at on public.match_play_sessions(started_at);

-- Enable RLS
alter table public.match_play_sessions enable row level security;
alter table public.match_play_matches enable row level security;

-- Read policies: allow team members to SELECT sessions and match rows for their team
-- Drop existing policies if present (helpful when re-running migration)
DROP POLICY IF EXISTS "match_play_sessions_select_for_team_members" ON public.match_play_sessions;
CREATE POLICY "match_play_sessions_select_for_team_members" ON public.match_play_sessions
  FOR SELECT USING (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = public.match_play_sessions.team_id
        and tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "match_play_matches_select_for_team_members" ON public.match_play_matches;
CREATE POLICY "match_play_matches_select_for_team_members" ON public.match_play_matches
  FOR SELECT USING (
    exists (
      select 1 from public.match_play_sessions s
      join public.team_members tm on tm.team_id = s.team_id
      where s.id = public.match_play_matches.session_id
        and tm.user_id = auth.uid()
    )
  );

-- Admin policies: only team admins (team_members.is_admin = true) can INSERT/UPDATE/DELETE sessions and match rows
DROP POLICY IF EXISTS "admins_manage_sessions" ON public.match_play_sessions;
CREATE POLICY "admins_manage_sessions" ON public.match_play_sessions
  FOR ALL USING (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = public.match_play_sessions.team_id
        and tm.user_id = auth.uid()
        and tm.is_admin = true
    )
  ) WITH CHECK (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = public.match_play_sessions.team_id
        and tm.user_id = auth.uid()
        and tm.is_admin = true
    )
  );

DROP POLICY IF EXISTS "admins_manage_match_rows" ON public.match_play_matches;
CREATE POLICY "admins_manage_match_rows" ON public.match_play_matches
  FOR ALL USING (
    exists (
      select 1 from public.match_play_sessions s
      join public.team_members tm on tm.team_id = s.team_id
      where s.id = public.match_play_matches.session_id
        and tm.user_id = auth.uid()
        and tm.is_admin = true
    )
  ) WITH CHECK (
    exists (
      select 1 from public.match_play_sessions s
      join public.team_members tm on tm.team_id = s.team_id
      where s.id = public.match_play_matches.session_id
        and tm.user_id = auth.uid()
        and tm.is_admin = true
    )
  );

-- Notes:
-- winner_players will store team_members.id (recommended, because the app supports players without linked auth accounts).
