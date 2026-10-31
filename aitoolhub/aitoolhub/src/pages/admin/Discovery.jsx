import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { logoFromWebsite, slugify } from '../../lib/images'

export default function Discovery() {
  const { profile, session } = useAuth()
  const [items, setItems] = useState([]), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('tool_candidates').select('*').eq('status', 'pending').order('run_date', { ascending: false }).order('rank')
    if (error) setMsg(error.message)
    setItems(data || []); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function runNow() {
    setBusy(true); setMsg('')
    try {
      const r = await fetch('/api/admin/run-discovery', { method: 'POST', headers: { authorization: `Bearer ${session.access_token}` } })
      const j = await r.json()
      setMsg(!r.ok ? j.error : j.skipped ? j.reason : `Found ${j.inserted} new ${j.inserted === 1 ? 'candidate' : 'candidates'}.`)
      load()
    } catch { setMsg('The discovery endpoint is not reachable. It runs on Vercel (or with "vercel dev"), not "npm run dev".') }
    setBusy(false)
  }

  async function approve(c) {
    setBusy(true); setMsg('')
    const { data: cat } = c.category_slug ? await supabase.from('categories').select('id').eq('slug', c.category_slug).maybeSingle() : { data: null }
    const row = { name: c.name, short_description: c.description || c.name, official_url: c.official_url, logo_url: logoFromWebsite(c.official_url), category_id: cat?.id ?? null, status: 'draft', created_by: profile.id }
    let { data: tool, error } = await supabase.from('ai_tools').insert({ ...row, slug: slugify(c.name) }).select('id').single()
    if (error?.code === '23505') ({ data: tool, error } = await supabase.from('ai_tools').insert({ ...row, slug: `${slugify(c.name)}-${Math.random().toString(36).slice(2, 6)}` }).select('id').single())
    if (error) { setBusy(false); return setMsg(error.message) }
    await supabase.from('tool_candidates').update({ status: 'approved', tool_id: tool.id }).eq('id', c.id)
    await supabase.from('admin_logs').insert({ admin_id: profile.id, action: 'approve_candidate', entity_id: tool.id })
    setMsg(`${c.name} was added as a draft. Open Tools to confirm pricing and publish it.`)
    setBusy(false); load()
  }
  async function reject(c) {
    await supabase.from('tool_candidates').update({ status: 'rejected' }).eq('id', c.id)
    load()
  }

  return (
    <main className="wrap" style={{ padding: '40px 20px 72px', maxWidth: 860 }}>
      <div className="crumb" style={{ marginTop: 0 }}><Link to="/admin">Tools</Link> / Discovery</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <h1 style={{ fontSize: 34, letterSpacing: '-.02em', margin: 0 }}>Today&rsquo;s top 5</h1>
        <button className="btn" onClick={runNow} disabled={busy}>{busy ? 'Working...' : 'Run discovery now'}</button>
      </div>
      <p className="lede" style={{ fontSize: 16 }}>The agent runs every morning, ranks new AI tools by discussion on Hacker News and Product Hunt, and lists the top 5 here. Nothing is published until you approve it and confirm the details.</p>
      {msg && <p role="status" className="msg" style={{ marginBottom: 16 }}>{msg}</p>}
      <div className="rows">
        {loading ? <p className="empty">Loading...</p> : items.length === 0 ? <p className="empty">No candidates waiting. Run discovery to look for today&rsquo;s tools.</p> : items.map((c) => (
          <div key={c.id} className="row" style={{ gridTemplateColumns: '1fr auto' }}>
            <div>
              <b>{c.rank}. {c.name}</b> <span className="meta">{c.run_date}</span>
              <p>{c.description || 'No description found.'}</p>
              <p style={{ fontSize: 13 }}><a href={c.official_url} target="_blank" rel="noopener noreferrer nofollow" style={{ textDecoration: 'underline' }}>{c.domain}</a> &nbsp; {c.source} score {c.source_score} &nbsp; {c.source_url && <a href={c.source_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>Discussion</a>} &nbsp; {c.category_slug || 'No category suggested'}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'start' }}>
              <button className="btn" disabled={busy} onClick={() => approve(c)}>Approve</button>
              <button className="btn-alt" disabled={busy} onClick={() => reject(c)}>Reject</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
