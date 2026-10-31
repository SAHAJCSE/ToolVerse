import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import GoogleButton from '../components/GoogleButton'

export default function Signup() {
  const { signUp } = useAuth()
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [done, setDone] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  async function submit(e) {
    e.preventDefault()
    if (f.password.length < 8) return setMsg('Use at least 8 characters.')
    setBusy(true); setMsg('')
    const { data, error } = await signUp(f.email.trim(), f.password, f.name.trim())
    setBusy(false)
    if (error) return setMsg(error.message)
    // Supabase returns a user with no identities when the email is already registered.
    if (data.user && data.user.identities?.length === 0) return setMsg('This email already has an account. Log in instead.')
    setDone(true)
  }
  document.title = 'Create an account | AI Tools Hub'
  if (done) return <main className="authbox"><h1>Check your email</h1><p>We sent a verification link to {f.email}. Open it, then <Link to="/login" style={{ textDecoration: 'underline' }}>log in</Link>.</p></main>
  return (
    <main className="authbox">
      <h1>Create an account</h1>
      <GoogleButton label="Sign up with Google" onError={setMsg} />
      <div className="or">or use email</div>
      <form onSubmit={submit}>
        <label>Name<input className="field" autoComplete="name" required value={f.name} onChange={set('name')} /></label>
        <label>Email<input className="field" type="email" autoComplete="email" required value={f.email} onChange={set('email')} /></label>
        <label>Password<input className="field" type="password" autoComplete="new-password" required minLength={8} value={f.password} onChange={set('password')} /></label>
        {msg && <p className="msg" role="alert">{msg}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Creating...' : 'Sign up'}</button>
      </form>
      <p className="msg" style={{ marginTop: 16 }}>Already registered? <Link to="/login" style={{ textDecoration: 'underline' }}>Log in</Link></p>
    </main>
  )
}
