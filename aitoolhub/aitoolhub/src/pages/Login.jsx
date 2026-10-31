import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import GoogleButton from '../components/GoogleButton'

export default function Login() {
  const { signIn, resetPassword, resendVerification } = useAuth()
  const nav = useNavigate(), loc = useLocation()
  const [email, setEmail] = useState(''), [password, setPassword] = useState('')
  const [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [unverified, setUnverified] = useState(false)

  async function submit(e) {
    e.preventDefault(); setBusy(true); setMsg(''); setUnverified(false)
    const { error } = await signIn(email.trim(), password)
    setBusy(false)
    if (!error) return nav(loc.state?.from?.pathname || '/', { replace: true })
    if (/not confirmed/i.test(error.message)) { setUnverified(true); setMsg('Verify your email first. Check your inbox for the link.') }
    else setMsg(error.message === 'Invalid login credentials' ? 'Email or password is incorrect.' : error.message)
  }
  async function forgot() {
    if (!email) return setMsg('Enter your email first.')
    const { error } = await resetPassword(email.trim())
    setMsg(error ? error.message : 'Check your inbox for a password reset link.')
  }
  async function resend() { const { error } = await resendVerification(email.trim()); setMsg(error ? error.message : 'Verification email sent.') }

  document.title = 'Log in | AI Tools Hub'
  return (
    <main className="authbox">
      <h1>Log in</h1>
      <GoogleButton onError={setMsg} />
      <div className="or">or use email</div>
      <form onSubmit={submit}>
        <label>Email<input className="field" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input className="field" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {msg && <p className="msg" role="alert">{msg} {unverified && <button type="button" className="tbtn" onClick={resend}>Resend email</button>}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Logging in...' : 'Log in'}</button>
      </form>
      <p className="msg" style={{ marginTop: 16 }}><button className="tbtn" onClick={forgot}>Forgot password</button> &nbsp; <Link to="/signup" style={{ textDecoration: 'underline' }}>Create an account</Link></p>
    </main>
  )
}
