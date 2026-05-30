import { supabaseAdmin } from './_supabase.js'
import { requireAuth } from './_auth.js'

async function checkAdmin(teamId, userId) {
  const { data } = await supabaseAdmin
    .from('team_members')
    .select('is_admin')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .maybeSingle()
  return data?.is_admin === true
}

async function checkMember(teamId, userId) {
  const { data } = await supabaseAdmin
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const user = await requireAuth(req, res)
  if (!user) return

  // GET /api/team-matches?team_id=xxx
  if (req.method === 'GET') {
    const team_id = req.query.team_id
    if (!team_id) return res.status(400).json({ error: 'team_id required' })

    const isMember = await checkMember(team_id, user.id)
    if (!isMember) return res.status(403).json({ error: 'Not a member of this team' })

    const { data, error } = await supabaseAdmin
      .from('team_matches')
      .select('*')
      .eq('team_id', team_id)
      .maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data || null)
  }

  // POST /api/team-matches — save/upsert (admin only)
  if (req.method === 'POST') {
    const { team_id, meta } = req.body
    if (!team_id) return res.status(400).json({ error: 'team_id required' })

    const isAdmin = await checkAdmin(team_id, user.id)
    if (!isAdmin) return res.status(403).json({ error: 'Admins only' })

    const { data: existing } = await supabaseAdmin
      .from('team_matches').select('id').eq('team_id', team_id).maybeSingle()

    let result
    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('team_matches').update({ meta, created_by: user.id })
        .eq('id', existing.id).select().single()
      if (error) return res.status(500).json({ error: error.message })
      result = data
    } else {
      const { data, error } = await supabaseAdmin
        .from('team_matches').insert({ team_id, meta, created_by: user.id })
        .select().single()
      if (error) return res.status(500).json({ error: error.message })
      result = data
    }
    return res.status(200).json(result)
  }

  // DELETE /api/team-matches (admin only)
  if (req.method === 'DELETE') {
    const { team_id } = req.body
    if (!team_id) return res.status(400).json({ error: 'team_id required' })

    const isAdmin = await checkAdmin(team_id, user.id)
    if (!isAdmin) return res.status(403).json({ error: 'Admins only' })

    const { error } = await supabaseAdmin
      .from('team_matches').delete().eq('team_id', team_id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
