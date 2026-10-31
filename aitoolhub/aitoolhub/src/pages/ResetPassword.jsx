import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function ResetPassword() {
  const { session, loading } = useAuth()
  const nav = useNavigate()
  const [pw, setPw] = useState(''), [msg, setMsg] = useState('')
  async function submit(e) {
    e.preventDefault()
    if (pw.length < 8) return setMsg('Use at least 8 characters.')
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) return setMsg(error.message)
    nav('/account', { replace: true })
  }
  if (loading) return <main className="authbox"><p>Loading...</p></main>
  if (!session) return <main className="authbox"><h1>Link expired</h1><p>This reset link is no longer valid. Request a new one from the log in page.</p></main>
  return (
    <main className="authbox"><h1>Set a new password</h1>
      <form onSubmit={submit}><label>New password<input className="field" type="password" autoComplete="new-password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} /></label>
        {msg && <p className="msg" role="alert">{msg}</p>}<button className="btn">Save password</button></form>
    </main>
  )
}
