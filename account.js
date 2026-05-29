import { supabaseAdmin } from './_supabase.js'
import { requireAuth } from './_auth.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const user = await requireAuth(req, res)
  if (!user) return

  // GET /api/account — get auth info + profile from user_profiles
  if (req.method === 'GET') {
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('username, skill_level, created_at')
      .eq('id', user.id)
      .maybeSingle()

    return res.status(200).json({
      id: user.id,
      email: user.email,
      username: profile?.username || user.user_metadata?.username || '',
      skill_level: profile?.skill_level || null,
      created_at: profile?.created_at || user.created_at,
    })
  }

  // PUT /api/account — update username, skill_level, or password
  if (req.method === 'PUT') {
    const { username, skill_level, password } = req.body

    // --- Validate ---
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

    // --- Update user_profiles (upsert username + skill_level) ---
    if (username !== undefined || skill_level !== undefined) {
      const profileUpdates = { id: user.id, updated_at: new Date().toISOString() }
      if (username !== undefined) profileUpdates.username = username.trim()
      if (skill_level !== undefined) profileUpdates.skill_level = skill_level === null ? null : Number(skill_level)

      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .upsert(profileUpdates, { onConflict: 'id' })

      if (profileError) return res.status(500).json({ error: profileError.message })

      // Keep auth metadata in sync for convenience
      if (username !== undefined) {
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
          data: { username: username.trim() }
        })
      }
    }

    // --- Update password via auth ---
    if (password !== undefined) {
      const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password })
      if (pwError) return res.status(500).json({ error: pwError.message })
    }

    // Return fresh profile
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('username, skill_level, created_at')
      .eq('id', user.id)
      .maybeSingle()

    return res.status(200).json({
      id: user.id,
      email: user.email,
      username: profile?.username || '',
      skill_level: profile?.skill_level || null,
      created_at: profile?.created_at || user.created_at,
    })
  }

  // DELETE /api/account — delete everything
  if (req.method === 'DELETE') {
    await supabaseAdmin.from('players').delete().eq('user_id', user.id)
    await supabaseAdmin.from('matches').delete().eq('user_id', user.id)
    // user_profiles deletes automatically via ON DELETE CASCADE
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
