import { supabaseAdmin } from './_supabase.js'
import { requireAuth } from './_auth.js'

// GET /api/lookup?tag=john123
// Returns public profile info (name + skill only — no email or id)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const user = await requireAuth(req, res)
  if (!user) return

  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method not allowed' })

  const tag = (req.query.tag || '').toLowerCase().trim()
  if (!tag) return res.status(400).json({ error: 'tag is required' })
  if (!/^[a-z0-9_]{3,20}$/.test(tag))
    return res.status(400).json({ error: 'Invalid tag format' })

  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('username, skill_level, user_tag')
    .eq('user_tag', tag)
    .maybeSingle()

  if (error) return res.status(500).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'No user found with that tag' })

  // Only expose what's needed — never email or uuid
  return res.status(200).json({
    username: data.username || '',
    skill_level: data.skill_level || 5,
    user_tag: data.user_tag,
  })
}
