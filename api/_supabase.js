import { createClient } from '@supabase/supabase-js'

// This uses the SERVICE ROLE key — never sent to the browser.
// It bypasses RLS so we can trust our own auth middleware instead.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
