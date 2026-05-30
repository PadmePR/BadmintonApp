import { supabaseAdmin } from './_supabase.js'
import { requireAuth } from './_auth.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const user = await requireAuth(req, res)
  if (!user) return

  // GET /api/account
  if (req.method === 'GET') {
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('username, skill_level, user_tag, created_at')
      .eq('id', user.id)
      .maybeSingle()

    return res.status(200).json({
      id: user.id,
      email: user.email,
      username: profile?.username || user.user_metadata?.username || '',
      skill_level: profile?.skill_level || null,
      user_tag: profile?.user_tag || null,
      created_at: profile?.created_at || user.created_at,
    })
  }

  // PUT /api/account
  if (req.method === 'PUT') {
    const { username, skill_level, password, user_tag } = req.body

    if (username !== undefined) {
      if (typeof username !== 'string' || username.trim().length === 0)
        return res.status(400).json({ error: 'Username cannot be empty' })
    }
    if (skill_level !== undefined && skill_level !== null) {
      const s = Number(skill_level)
      if (isNaN(s) || s < 1 || s > 10)
        return res.status(400).json({ error: 'Skill level must be 1–10' })
    }
    if (password !== undefined) {
      if (typeof password !== 'string' || password.length < 6)
        return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    if (user_tag !== undefined && user_tag !== null && user_tag !== '') {
      if (typeof user_tag !== 'string' || !/^[a-z0-9_]{3,20}$/.test(user_tag))
        return res.status(400).json({ error: 'User tag must be 3–20 characters: lowercase letters, numbers, underscores only' })
      // Check uniqueness
      const { data: existing } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('user_tag', user_tag)
        .maybeSingle()
      if (existing && existing.id !== user.id)
        return res.status(409).json({ error: 'That user tag is already taken' })
    }

    if (username !== undefined || skill_level !== undefined || user_tag !== undefined) {
      const profileUpdates = { id: user.id, updated_at: new Date().toISOString() }
      if (username !== undefined) profileUpdates.username = username.trim()
      if (skill_level !== undefined) profileUpdates.skill_level = skill_level === null ? null : Number(skill_level)
      if (user_tag !== undefined) profileUpdates.user_tag = user_tag === '' ? null : user_tag

      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .upsert(profileUpdates, { onConflict: 'id' })
      if (profileError) return res.status(500).json({ error: profileError.message })

      if (username !== undefined) {
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
          data: { username: username.trim() }
        })
      }
    }

    if (password !== undefined) {
      const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password })
      if (pwError) return res.status(500).json({ error: pwError.message })
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('username, skill_level, user_tag, created_at')
      .eq('id', user.id)
      .maybeSingle()

    return res.status(200).json({
      id: user.id,
      email: user.email,
      username: profile?.username || '',
      skill_level: profile?.skill_level || null,
      user_tag: profile?.user_tag || null,
      created_at: profile?.created_at || user.created_at,
    })
  }

  // DELETE /api/account
  if (req.method === 'DELETE') {
    await supabaseAdmin.from('players').delete().eq('user_id', user.id)
    await supabaseAdmin.from('matches').delete().eq('user_id', user.id)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
