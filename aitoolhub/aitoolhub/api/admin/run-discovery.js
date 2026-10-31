import { adminClient } from '../_lib/server.js'
import { runDiscovery } from '../_lib/discover.js'

// "Run now" button. Requires a signed-in admin; the role is checked on the server.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' })
  const token = (req.headers.authorization || '').replace(/^Bearer /, '')
  const sb = adminClient()
  const { data: u } = await sb.auth.getUser(token)
  if (!u?.user) return res.status(401).json({ error: 'Log in first' })
  const { data: p } = await sb.from('users').select('role,status').eq('id', u.user.id).single()
  if (p?.role !== 'admin' || p?.status !== 'active') return res.status(403).json({ error: 'Admins only' })
  try { res.status(200).json(await runDiscovery({ supabase: sb })) }
  catch (e) { res.status(500).json({ error: e.message }) }
}
