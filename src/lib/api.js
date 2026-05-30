import { supabase } from './supabase.js'

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

async function apiFetch(path, options = {}) {
  const token = await getToken()
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export const api = {
  // Account
  getAccount:    ()        => apiFetch('/api/account'),
  updateAccount: (updates) => apiFetch('/api/account', { method: 'PUT', body: updates }),
  deleteAccount: ()        => apiFetch('/api/account', { method: 'DELETE' }),

  // Tag lookup
  lookupByTag: (tag) => apiFetch(`/api/lookup?tag=${encodeURIComponent(tag.toLowerCase().trim())}`),

  // Teams
  getTeams:    ()                     => apiFetch('/api/teams'),
  createTeam:  (name)                 => apiFetch('/api/teams', { method: 'POST', body: { name } }),
  renameTeam:  (team_id, name)        => apiFetch('/api/teams', { method: 'PUT',  body: { team_id, name } }),
  deleteTeam:  (team_id)              => apiFetch('/api/teams', { method: 'DELETE', body: { team_id } }),

  // Team members
  getMembers:    (team_id)             => apiFetch(`/api/team-members?team_id=${team_id}`),
  addMember:     (body)                => apiFetch('/api/team-members', { method: 'POST', body }),
  updateMember:  (body)                => apiFetch('/api/team-members', { method: 'PUT',  body }),
  removeMember:  (id, team_id)         => apiFetch('/api/team-members', { method: 'DELETE', body: { id, team_id } }),

  // Team matches
  getTeamMatches:    (team_id)         => apiFetch(`/api/team-matches?team_id=${team_id}`),
  saveTeamMatches:   (team_id, meta)   => apiFetch('/api/team-matches', { method: 'POST', body: { team_id, meta } }),
  deleteTeamMatches: (team_id)         => apiFetch('/api/team-matches', { method: 'DELETE', body: { team_id } }),
}
