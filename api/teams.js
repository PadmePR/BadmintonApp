import { supabaseAdmin } from './_supabase.js'
import { requireAuth } from './_auth.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const user = await requireAuth(req, res)
  if (!user) return

  // GET /api/teams — list all teams the user belongs to
  if (req.method === 'GET') {
    const { data: memberships, error } = await supabaseAdmin
      .from('team_members')
      .select('team_id, is_admin, teams(id, name, created_by, created_at)')
      .eq('user_id', user.id)

    if (error) return res.status(500).json({ error: error.message })

    const teams = (memberships || []).map(m => ({
      id: m.teams.id,
      name: m.teams.name,
      created_by: m.teams.created_by,
      created_at: m.teams.created_at,
      is_admin: m.is_admin,
    }))

    return res.status(200).json(teams)
  }

  // POST /api/teams — create a new team
  if (req.method === 'POST') {
    const { name } = req.body
    if (!name || !name.trim()) return res.status(400).json({ error: 'Team name is required' })

    // Create team
    const { data: team, error: teamErr } = await supabaseAdmin
      .from('teams')
      .insert({ name: name.trim(), created_by: user.id })
      .select()
      .single()
    if (teamErr) return res.status(500).json({ error: teamErr.message })

    // Get creator's profile for display name
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('username, skill_level, user_tag')
      .eq('id', user.id)
      .maybeSingle()

    // Add creator as first admin member
    const { error: memberErr } = await supabaseAdmin
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: user.id,
        name: profile?.username || user.email.split('@')[0],
        skill: profile?.skill_level || 5,
        absent: false,
        is_admin: true,
        added_by: user.id,
      })
    if (memberErr) return res.status(500).json({ error: memberErr.message })

    return res.status(201).json({ ...team, is_admin: true })
  }

  // PUT /api/teams — rename a team (admin only)
  if (req.method === 'PUT') {
    const { team_id, name } = req.body
    if (!team_id) return res.status(400).json({ error: 'team_id required' })
    if (!name || !name.trim()) return res.status(400).json({ error: 'name required' })

    const isAdmin = await checkAdmin(team_id, user.id)
    if (!isAdmin) return res.status(403).json({ error: 'Admins only' })

    const { data, error } = await supabaseAdmin
      .from('teams')
      .update({ name: name.trim() })
      .eq('id', team_id)
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // DELETE /api/teams — delete a team (creator only)
  if (req.method === 'DELETE') {
    const { team_id } = req.body
    if (!team_id) return res.status(400).json({ error: 'team_id required' })

    const { data: team } = await supabaseAdmin
      .from('teams').select('created_by').eq('id', team_id).single()
    if (team?.created_by !== user.id)
      return res.status(403).json({ error: 'Only the creator can delete a team' })

    await supabaseAdmin.from('team_matches').delete().eq('team_id', team_id)
    await supabaseAdmin.from('team_members').delete().eq('team_id', team_id)
    await supabaseAdmin.from('teams').delete().eq('id', team_id)
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

async function checkAdmin(teamId, userId) {
  const { data } = await supabaseAdmin
    .from('team_members')
    .select('is_admin')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .maybeSingle()
  return data?.is_admin === true
}
