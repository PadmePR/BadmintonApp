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
  // Players
  getPlayers: () => apiFetch('/api/players'),
  addPlayer: (player) => apiFetch('/api/players', { method: 'POST', body: player }),
  updatePlayer: (player) => apiFetch('/api/players', { method: 'PUT', body: player }),
  deletePlayer: (id) => apiFetch('/api/players', { method: 'DELETE', body: { id } }),

  // Matches
  getMatches: () => apiFetch('/api/matches'),
  saveMatches: (html, meta) => apiFetch('/api/matches', { method: 'POST', body: { html, meta } }),
  deleteMatches: () => apiFetch('/api/matches', { method: 'DELETE' }),

  // Account
  getAccount: () => apiFetch('/api/account'),
  updateAccount: (updates) => apiFetch('/api/account', { method: 'PUT', body: updates }),
  deleteAccount: () => apiFetch('/api/account', { method: 'DELETE' }),
}
