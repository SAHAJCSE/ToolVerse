import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import ToolForm from './ToolForm'

export default function AdminTools() {
  const { profile } = useAuth()
  const [tools, setTools] = useState([]), [cats, setCats] = useState([])
  const [editing, setEditing] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [t, c] = await Promise.all([supabase.from('ai_tools').select('*').order('created_at', { ascending: false }), supabase.from('categories').select('id,name').order('name')])
    if (t.error || c.error) setError((t.error || c.error).message)
    setTools(t.data || []); setCats(c.data || []); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function toggle(t) {
    const status = t.status === 'published' ? 'unpublished' : 'published'
    const { error } = await supabase.from('ai_tools').update({ status }).eq('id', t.id)
    if (error) return setError(error.message)
    await supabase.from('admin_logs').insert({ admin_id: profile.id, action: `set_${status}`, entity_id: t.id })
    load()
  }
  async function remove(t) {
    if (!window.confirm(`Delete ${t.name}? This cannot be undone.`)) return
    const { error } = await supabase.from('ai_tools').delete().eq('id', t.id)
    if (error) return setError(error.message)
    await supabase.from('admin_logs').insert({ admin_id: profile.id, action: 'delete_tool', entity_id: t.id })
    load()
  }

  if (editing !== null) return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">{editing.id ? 'Edit tool' : 'Add a tool'}</h1>
      <ToolForm tool={editing.id ? editing : null} categories={cats} onSaved={() => { setEditing(null); load() }} onCancel={() => setEditing(null)} />
    </main>
  )
  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <div className="mb-6 flex items-center justify-between"><h1 className="text-3xl font-bold tracking-tight">Tools</h1><div style={{ display: 'flex', gap: 10 }}><Link className="btn-alt" to="/admin/discovery">Discovery</Link><button className="btn" onClick={() => setEditing({})}>Add a tool</button></div></div>
      {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
      {loading ? <p>Loading...</p> : tools.length === 0 ? <p className="text-[#5d6975]">No tools yet. Add the first one.</p> : (
        <ul className="border-t border-[#16202a]">
          {tools.map((t) => (
            <li key={t.id} className="flex items-center gap-4 border-b border-[#dfe3e6] py-3">
              {t.logo_url ? <img src={t.logo_url} alt="" referrerPolicy="no-referrer" className="h-10 w-10 rounded-md border border-[#dfe3e6] object-contain" /> : <div className="h-10 w-10 rounded-md bg-[#16202a]" />}
              <div className="mr-auto"><b>{t.name}</b><div className="text-sm text-[#5d6975]">{t.status}</div></div>
              <button className="underline" onClick={() => setEditing(t)}>Edit</button>
              <button className="underline" onClick={() => toggle(t)}>{t.status === 'published' ? 'Unpublish' : 'Publish'}</button>
              <button className="underline" onClick={() => remove(t)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
