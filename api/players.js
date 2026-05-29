import { supabaseAdmin } from './_supabase.js'
import { requireAuth } from './_auth.js'

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const user = await requireAuth(req, res)
  if (!user) return // requireAuth already sent the 401

  // GET /api/players — list all players for this user
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('players')
      .select('*')
      .eq('user_id', user.id)
      .order('name')

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // POST /api/players — create a new player
  if (req.method === 'POST') {
    const { name, skill, absent } = req.body
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' })
    }
    const skillNum = Number(skill)
    if (isNaN(skillNum) || skillNum < 1 || skillNum > 10) {
      return res.status(400).json({ error: 'Skill must be 1–10' })
    }

    const { data, error } = await supabaseAdmin
      .from('players')
      .insert({ name: name.trim(), skill: skillNum, absent: Boolean(absent), user_id: user.id })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  // PUT /api/players — update a player
  if (req.method === 'PUT') {
    const { id, name, skill, absent } = req.body
    if (!id) return res.status(400).json({ error: 'Player id is required' })

    const updates = {}
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0)
        return res.status(400).json({ error: 'Name cannot be empty' })
      updates.name = name.trim()
    }
    if (skill !== undefined) {
      const skillNum = Number(skill)
      if (isNaN(skillNum) || skillNum < 1 || skillNum > 10)
        return res.status(400).json({ error: 'Skill must be 1–10' })
      updates.skill = skillNum
    }
    if (absent !== undefined) updates.absent = Boolean(absent)

    // Scope update to this user's player only
    const { data, error } = await supabaseAdmin
      .from('players')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // DELETE /api/players — delete a player
  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'Player id is required' })

    const { error } = await supabaseAdmin
      .from('players')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
