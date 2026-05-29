import { supabaseAdmin } from './_supabase.js'

/**
 * Verifies the Authorization: Bearer <token> header.
 * Returns the user object if valid, or sends a 401 and returns null.
 */
export async function requireAuth(req, res) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' })
    return null
  }

  const token = auth.slice(7)
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) {
    res.status(401).json({ error: 'Invalid or expired token' })
    return null
  }

  return user
}
