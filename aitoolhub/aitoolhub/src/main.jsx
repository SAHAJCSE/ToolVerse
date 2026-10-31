import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom'
import './index.css'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import { subscribe } from './lib/api'
import Home from './pages/Home'
import Category from './pages/Category'
import Latest from './pages/Latest'
import ToolPage from './pages/ToolPage'
import Account from './pages/Account'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ResetPassword from './pages/ResetPassword'
import AdminTools from './pages/admin/AdminTools'
import Discovery from './pages/admin/Discovery'

function useTheme() {
  const [t, setT] = useState(() => { try { return localStorage.getItem('theme') } catch { return null } })
  useEffect(() => {
    if (t) document.documentElement.dataset.theme = t
    try { if (t) localStorage.setItem('theme', t) } catch { /* storage unavailable */ }
  }, [t])
  const isDark = t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  return [isDark, () => setT(isDark ? 'light' : 'dark')]
}

function Newsletter() {
  const [email, setEmail] = useState(''), [msg, setMsg] = useState('')
  async function go(e) {
    e.preventDefault()
    try { await subscribe(email); setMsg('Subscribed.'); setEmail('') } catch { setMsg('Enter a valid email.') }
  }
  return <form className="nl" onSubmit={go}><input type="email" required placeholder="Email for new tool alerts" aria-label="Email for the newsletter" value={email} onChange={(e) => setEmail(e.target.value)} /><button className="btn-alt" style={{ padding: '6px 14px' }}>Subscribe</button>{msg && <span role="status">{msg}</span>}</form>
}

function Shell({ children }) {
  const { session, profile, isAdmin } = useAuth()
  const [dark, toggle] = useTheme()
  return (
    <>
      <header className="hdr"><div className="wrap bar">
        <Link to="/" className="brand">AI Tools Hub</Link>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'on' : '')}>Browse</NavLink>
          <NavLink to="/latest" className={({ isActive }) => (isActive ? 'on' : '')}>Latest</NavLink>
          {isAdmin && <NavLink to="/admin" className={({ isActive }) => (isActive ? 'on' : '')}>Admin</NavLink>}
          {session ? <NavLink to="/account" className={({ isActive }) => (isActive ? 'on' : '')}>{profile?.name?.split(' ')[0] || 'Account'}</NavLink> : <NavLink to="/login">Log in</NavLink>}
          <button className="tbtn" onClick={toggle}>{dark ? 'Light' : 'Dark'}</button>
        </nav>
      </div></header>
      {children}
      <footer className="ftr"><div className="wrap"><span>AI Tools Hub. Every listing is reviewed before it is published.</span><Newsletter /></div></footer>
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter><AuthProvider><Shell>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/category/:slug" element={<Category />} />
      <Route path="/latest" element={<Latest />} />
      <Route path="/tool/:slug" element={<ToolPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute admin><AdminTools /></ProtectedRoute>} />
      <Route path="/admin/discovery" element={<ProtectedRoute admin><Discovery /></ProtectedRoute>} />
      <Route path="*" element={<main className="wrap"><p className="empty">Page not found. <Link to="/" style={{ textDecoration: 'underline' }}>Go home</Link></p></main>} />
    </Routes>
  </Shell></AuthProvider></BrowserRouter>,
)
