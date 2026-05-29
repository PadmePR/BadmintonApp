import { supabaseAdmin } from './_supabase.js'
import { requireAuth } from './_auth.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const user = await requireAuth(req, res)
  if (!user) return

  // GET /api/matches — load saved match for this user
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data || null)
  }

  // POST /api/matches — upsert saved match
  if (req.method === 'POST') {
    const { html, meta } = req.body
    if (!html) return res.status(400).json({ error: 'html is required' })

    const { data: existing } = await supabaseAdmin
      .from('matches')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    let result
    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('matches')
        .update({ html, meta })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) return res.status(500).json({ error: error.message })
      result = data
    } else {
      const { data, error } = await supabaseAdmin
        .from('matches')
        .insert({ user_id: user.id, html, meta })
        .select()
        .single()
      if (error) return res.status(500).json({ error: error.message })
      result = data
    }

    return res.status(200).json(result)
  }

  // DELETE /api/matches — clear saved match
  if (req.method === 'DELETE') {
    const { error } = await supabaseAdmin
      .from('matches')
      .delete()
      .eq('user_id', user.id)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
