import { createClient } from '@supabase/supabase-js'
import { timingSafeEqual } from 'node:crypto'

// Service-role client: server only. Never import this from src/.
export const adminClient = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

export function cronAuthorized(req) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const given = Buffer.from(req.headers.authorization || '')
  const want = Buffer.from(`Bearer ${secret}`)
  return given.length === want.length && timingSafeEqual(given, want)
}
