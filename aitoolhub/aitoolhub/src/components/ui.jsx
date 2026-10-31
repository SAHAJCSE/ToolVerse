import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PRICE, fmtDate } from '../lib/api'

export function Logo({ tool }) {
  const [bad, setBad] = useState(false)
  useEffect(() => setBad(false), [tool.logo_url])
  return (
    <div className="mono" aria-hidden="true">
      {tool.logo_url && !bad ? <img src={tool.logo_url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBad(true)} /> : tool.name[0]}
    </div>
  )
}

export function ToolRow({ t, showDate }) {
  return (
    <Link className="row" to={`/tool/${t.slug}`}>
      <Logo tool={t} />
      <div><b>{t.name}</b>{t.is_featured && <span className="flag">Featured</span>}<p>{t.short_description}</p></div>
      <div className="meta">{t.category?.name}{t.category && <br />}{PRICE[t.pricing_type]}{showDate && t.published_at && <><br />Added {fmtDate(t.published_at)}</>}</div>
    </Link>
  )
}

export const Empty = ({ children }) => <p className="empty">{children}</p>

export function useAsync(fn, deps) {
  const [s, set] = useState({ data: null, error: null, loading: true })
  useEffect(() => {
    let live = true
    set((p) => ({ ...p, loading: true, error: null }))
    fn().then((data) => live && set({ data, error: null, loading: false })).catch((error) => live && set({ data: null, error, loading: false }))
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return s
}

export function Toast({ msg }) { return msg ? <div className="toast" role="status">{msg}</div> : null }
export function useToast() {
  const [msg, setMsg] = useState('')
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 2600); return () => clearTimeout(t) }, [msg])
  return [msg, setMsg]
}
