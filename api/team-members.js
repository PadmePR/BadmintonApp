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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const user = await requireAuth(req, res)
  if (!user) return

  // GET /api/team-members?team_id=xxx — get all members
  if (req.method === 'GET') {
    const team_id = req.query.team_id
    if (!team_id) return res.status(400).json({ error: 'team_id required' })

    // Must be a member to view
    const { data: membership } = await supabaseAdmin
      .from('team_members')
      .select('is_admin')
      .eq('team_id', team_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!membership) return res.status(403).json({ error: 'Not a member of this team' })

    const { data, error } = await supabaseAdmin
      .from('team_members')
      .select('*')
      .eq('team_id', team_id)
      .order('created_at')
    if (error) return res.status(500).json({ error: error.message })

    const isAdmin = membership.is_admin
    // Non-admins only see present players (not absent, no skill details of others)
    const filtered = isAdmin
      ? data
      : data.map(m => ({
          id: m.id, team_id: m.team_id, name: m.name,
          absent: m.absent, is_admin: m.is_admin,
          user_id: m.user_id === user.id ? m.user_id : null,
          skill: m.absent ? null : m.skill, // hide skill of absent players for members
        })).filter(m => !m.absent)

    return res.status(200).json({ members: filtered, is_admin: isAdmin })
  }

  // POST /api/team-members — add a player (admin only)
  if (req.method === 'POST') {
    const { team_id, name, skill, user_tag } = req.body
    if (!team_id) return res.status(400).json({ error: 'team_id required' })

    const isAdmin = await checkAdmin(team_id, user.id)
    if (!isAdmin) return res.status(403).json({ error: 'Admins only' })

    let resolvedUserId = null
    let resolvedName = name?.trim()
    let resolvedSkill = Number(skill) || 5

    // If adding by user_tag, resolve their profile
    if (user_tag) {
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('id, username, skill_level')
        .eq('user_tag', user_tag.toLowerCase())
        .maybeSingle()
      if (!profile) return res.status(404).json({ error: 'No user found with that tag' })

      resolvedUserId = profile.id
      resolvedName = profile.username || user_tag
      resolvedSkill = Number(skill) || profile.skill_level || 5 // allow override

      // Check not already in team
      const { data: existing } = await supabaseAdmin
        .from('team_members')
        .select('id')
        .eq('team_id', team_id)
        .eq('user_id', resolvedUserId)
        .maybeSingle()
      if (existing) return res.status(409).json({ error: 'That player is already in this team' })
    }

    if (!resolvedName) return res.status(400).json({ error: 'Player name is required' })
    if (resolvedSkill < 1 || resolvedSkill > 10)
      return res.status(400).json({ error: 'Skill must be 1–10' })

    const { data, error } = await supabaseAdmin
      .from('team_members')
      .insert({
        team_id,
        user_id: resolvedUserId,
        name: resolvedName,
        skill: resolvedSkill,
        absent: false,
        is_admin: false,
        added_by: user.id,
      })
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  // PUT /api/team-members — update skill, absent, or is_admin
  if (req.method === 'PUT') {
    const { id, team_id, skill, absent, is_admin } = req.body
    if (!id || !team_id) return res.status(400).json({ error: 'id and team_id required' })

    const isAdmin = await checkAdmin(team_id, user.id)
    if (!isAdmin) return res.status(403).json({ error: 'Admins only' })

    // Admin count check when promoting
    if (is_admin === true) {
      const { data: admins } = await supabaseAdmin
        .from('team_members')
        .select('id')
        .eq('team_id', team_id)
        .eq('is_admin', true)
      if ((admins || []).length >= 4)
        return res.status(400).json({ error: 'A team can have at most 4 admins' })
    }

    // Cannot demote the creator
    if (is_admin === false) {
      const { data: team } = await supabaseAdmin
        .from('teams').select('created_by').eq('id', team_id).single()
      const { data: member } = await supabaseAdmin
        .from('team_members').select('user_id').eq('id', id).single()
      if (member?.user_id && team?.created_by === member.user_id)
        return res.status(400).json({ error: 'Cannot remove admin from team creator' })
    }

    const updates = {}
    if (skill !== undefined) updates.skill = Math.max(1, Math.min(10, Number(skill)))
    if (absent !== undefined) updates.absent = Boolean(absent)
    if (is_admin !== undefined) updates.is_admin = Boolean(is_admin)

    const { data, error } = await supabaseAdmin
      .from('team_members')
      .update(updates)
      .eq('id', id)
      .eq('team_id', team_id)
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // DELETE /api/team-members — remove a player (admin only)
  if (req.method === 'DELETE') {
    const { id, team_id } = req.body
    if (!id || !team_id) return res.status(400).json({ error: 'id and team_id required' })

    const isAdmin = await checkAdmin(team_id, user.id)
    if (!isAdmin) return res.status(403).json({ error: 'Admins only' })

    // Cannot remove creator
    const { data: team } = await supabaseAdmin
      .from('teams').select('created_by').eq('id', team_id).single()
    const { data: member } = await supabaseAdmin
      .from('team_members').select('user_id').eq('id', id).single()
    if (member?.user_id && team?.created_by === member.user_id)
      return res.status(400).json({ error: 'Cannot remove the team creator' })

    const { error } = await supabaseAdmin
      .from('team_members').delete().eq('id', id).eq('team_id', team_id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
