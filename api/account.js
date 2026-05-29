import { supabaseAdmin } from './_supabase.js'
import { requireAuth } from './_auth.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const user = await requireAuth(req, res)
  if (!user) return

  // GET /api/account — get current account info
  if (req.method === 'GET') {
    return res.status(200).json({
      id: user.id,
      email: user.email,
      username: user.user_metadata?.username || '',
      created_at: user.created_at,
    })
  }

  // PUT /api/account — update username or password
  if (req.method === 'PUT') {
    const { username, password } = req.body
    const updates = { data: {} }

    if (username !== undefined) {
      if (typeof username !== 'string' || username.trim().length === 0)
        return res.status(400).json({ error: 'Username cannot be empty' })
      updates.data.username = username.trim()
    }

    if (password !== undefined) {
      if (typeof password !== 'string' || password.length < 6)
        return res.status(400).json({ error: 'Password must be at least 6 characters' })
      updates.password = password
    }

    if (Object.keys(updates.data).length === 0 && !updates.password) {
      return res.status(400).json({ error: 'Nothing to update' })
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, updates)
    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({
      id: data.user.id,
      email: data.user.email,
      username: data.user.user_metadata?.username || '',
    })
  }

  // DELETE /api/account — delete account and all data
  if (req.method === 'DELETE') {
    // Delete all players
    await supabaseAdmin.from('players').delete().eq('user_id', user.id)
    // Delete all matches
    await supabaseAdmin.from('matches').delete().eq('user_id', user.id)
    // Delete the auth user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
