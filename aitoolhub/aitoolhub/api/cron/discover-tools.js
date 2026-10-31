import { adminClient, cronAuthorized } from '../_lib/server.js'
import { runDiscovery } from '../_lib/discover.js'

// Vercel Cron calls this daily with "Authorization: Bearer $CRON_SECRET".
export default async function handler(req, res) {
  if (!cronAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' })
  try { res.status(200).json(await runDiscovery({ supabase: adminClient() })) }
  catch (e) { res.status(500).json({ error: e.message }) }
}
