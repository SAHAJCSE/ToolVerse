import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { ToolRow, Empty, Toast, useAsync, useToast } from '../components/ui'
import { savedTools, recentTools } from '../lib/api'

export default function Account() {
  const { profile, session, signOut } = useAuth()
  const uid = session.user.id
  const [name, setName] = useState(profile?.name || ''), [msg, toast] = useToast()
  const saved = useAsync(() => savedTools(uid), [uid])
  const recent = useAsync(() => recentTools(uid), [uid])
  async function save(e) {
    e.preventDefault()
    const { error } = await supabase.from('users').update({ name: name.trim() }).eq('id', uid)
    toast(error ? error.message : 'Profile saved.')
  }
  document.title = 'Your account | AI Tools Hub'
  return (
    <main className="wrap" style={{ padding: '48px 20px 72px' }}>
      <h1 style={{ fontSize: 34, letterSpacing: '-.02em', margin: '0 0 6px' }}>Your account</h1>
      <p style={{ color: 'var(--muted)', marginTop: 0 }}>{profile?.email} {profile?.role === 'admin' && '(admin)'}</p>
      <form onSubmit={save} style={{ display: 'flex', gap: 10, maxWidth: 420, margin: '20px 0 40px' }}>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" /><button className="btn">Save</button>
      </form>
      <h2 className="h3">Saved tools</h2>
      <div className="rows" style={{ marginBottom: 36 }}>{saved.data?.length ? saved.data.map((t) => <ToolRow key={t.id} t={t} />) : <Empty>Nothing saved yet. Use Save on a tool page.</Empty>}</div>
      <h2 className="h3">Recently viewed</h2>
      <div className="rows" style={{ marginBottom: 36 }}>{recent.data?.length ? recent.data.map((t) => <ToolRow key={t.id} t={t} />) : <Empty>Tools you open will appear here.</Empty>}</div>
      <button className="btn-alt" onClick={signOut}>Log out</button>
      <Toast msg={msg} />
    </main>
  )
}
