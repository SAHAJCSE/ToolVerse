import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Logo, ToolRow, Empty, Toast, useAsync, useToast } from '../components/ui'
import * as api from '../lib/api'
import { callGemini } from '../lib/gemini'

function Reviews({ tool, toast }) {
  const { session } = useAuth()
  const uid = session?.user.id
  const [n, setN] = useState(0)
  const { data: rating } = useAsync(() => api.getRating(tool.id), [tool.id, n])
  const { data: reviews } = useAsync(() => api.getReviews(tool.id), [tool.id, n])
  const [stars, setStars] = useState(5), [text, setText] = useState('')
  async function submit(e) {
    e.preventDefault()
    try { await api.saveReview({ user_id: uid, tool_id: tool.id, rating: stars, review: text.trim() || null }); setText(''); setN(n + 1); toast('Review saved.') }
    catch (err) { toast(err.message) }
  }
  return (
    <section>
      <h2 className="h3">Reviews</h2>
      <p style={{ color: 'var(--muted)', marginTop: 0 }}>{rating ? `${rating.avg_rating} out of 5 from ${rating.review_count} ${rating.review_count === 1 ? 'review' : 'reviews'}` : 'No reviews yet.'}</p>
      {reviews?.map((r) => <div className="rev" key={r.id}><b>{r.rating} out of 5</b>{r.review && <p style={{ margin: '4px 0 0' }}>{r.review}</p>}<small style={{ color: 'var(--muted)' }}>{api.fmtDate(r.created_at)}</small></div>)}
      {session ? (
        <form onSubmit={submit} style={{ display: 'grid', gap: 10, marginTop: 16, maxWidth: 480 }}>
          <label style={{ fontWeight: 600, fontSize: 14 }}>Your rating <select className="field" style={{ width: 'auto', marginLeft: 8 }} value={stars} onChange={(e) => setStars(+e.target.value)}>{[5, 4, 3, 2, 1].map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
          <textarea className="field" rows={3} maxLength={2000} placeholder="What did you use it for?" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn" style={{ width: 'fit-content' }}>Save review</button>
        </form>
      ) : <p style={{ marginTop: 16 }}><Link to="/login" style={{ textDecoration: 'underline' }}>Log in</Link> to rate this tool.</p>}
    </section>
  )
}

export default function ToolPage() {
  const { slug } = useParams()
  const nav = useNavigate()
  const { session } = useAuth()
  const uid = session?.user.id
  const [msg, toast] = useToast()
  const [saved, setSaved] = useState(false)
  const { data: tool, loading } = useAsync(() => api.getTool(slug), [slug])
  const { data: similar } = useAsync(() => (tool ? api.similarTools(tool) : Promise.resolve([])), [tool?.id])

  useEffect(() => {
    if (!tool) return
    document.title = `${tool.name} | AI Tools Hub`
    let m = document.querySelector('meta[name="description"]')
    if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m) }
    m.content = tool.short_description
    api.recordView(tool.id)
  }, [tool])
  useEffect(() => { if (tool && uid) api.isSaved(uid, tool.id).then(setSaved).catch(() => {}); else setSaved(false) }, [tool, uid])

  if (loading) return <main className="wrap"><Empty>Loading...</Empty></main>
  if (!tool) return <main className="wrap"><Empty>This tool is not published. <Link to="/" style={{ textDecoration: 'underline' }}>Back to all tools</Link></Empty></main>

  const need = () => { toast('Log in first.'); nav('/login', { state: { from: { pathname: `/tool/${slug}` } } }) }
  async function save() {
    if (!uid) return need()
    try { await api.toggleSaved(uid, tool.id, saved); setSaved(!saved); toast(saved ? 'Removed from saved.' : 'Saved.') } catch (e) { toast(e.message) }
  }
  async function share() {
    const url = window.location.href
    try { if (navigator.share) await navigator.share({ title: tool.name, url }); else { await navigator.clipboard.writeText(url); toast('Link copied.') } } catch { /* cancelled */ }
  }
  async function report() {
    if (!uid) return need()
    const m = window.prompt('What is out of date?')
    if (!m?.trim()) return
    try { await api.reportOutdated(tool.id, uid, m.trim()); toast('Thanks. An admin will review it.') } catch (e) { toast(e.message) }
  }
  const list = (a) => a?.length > 0 && <ul className="f">{a.map((x) => <li key={x}>{x}</li>)}</ul>
  return (
    <main className="wrap">
      <div className="crumb"><Link to="/">All tools</Link> / {tool.category && <><Link to={`/category/${tool.category.slug}`}>{tool.category.name}</Link> / </>}{tool.name}</div>
      <div className="tool">
        <div>
          <div className="th"><Logo tool={tool} /><h1>{tool.name}</h1></div>
          <p className="lede" style={{ marginBottom: 0 }}>{tool.short_description}</p>
          <div className="btns">
            <a className="btn" href={tool.official_url} target="_blank" rel="noopener noreferrer nofollow">Visit tool</a>
            <button className="btn-alt" onClick={save}>{saved ? 'Saved' : 'Save'}</button>
            <button className="btn-alt" onClick={share}>Share</button>
            <button className="btn-alt" onClick={report}>Report outdated info</button>
          </div>
          {tool.full_description && <><h2 className="h3">Overview</h2><p style={{ whiteSpace: 'pre-line', maxWidth: '65ch' }}>{tool.full_description}</p></>}
          {tool.features?.length > 0 && <><h2 className="h3">Main features</h2>{list(tool.features)}</>}
          {tool.pros?.length > 0 && <><h2 className="h3">Pros</h2>{list(tool.pros)}</>}
          {tool.cons?.length > 0 && <><h2 className="h3">Cons</h2>{list(tool.cons)}</>}
          {tool.screenshots?.length > 0 && <div className="shots">{tool.screenshots.map((s) => <img key={s} src={s} alt={`${tool.name} screenshot`} loading="lazy" referrerPolicy="no-referrer" />)}</div>}
          <Reviews tool={tool} toast={toast} />
        </div>
        <div>
          <dl>
            <div><dt>Category</dt><dd>{tool.category?.name || 'None'}</dd></div>
            <div><dt>Pricing</dt><dd>{api.PRICE[tool.pricing_type]}</dd></div>
            {tool.pricing_details && <div><dt>Plans</dt><dd>{tool.pricing_details}</dd></div>}
            {tool.platforms?.length > 0 && <div><dt>Platforms</dt><dd>{tool.platforms.join(', ')}</dd></div>}
            <div><dt>Launch date</dt><dd>{tool.launch_date_verified ? api.fmtDate(tool.launch_date) : 'Not verified'}</dd></div>
            <div><dt>Added here</dt><dd>{tool.published_at ? api.fmtDate(tool.published_at) : 'Not yet'}</dd></div>
            <div><dt>Last updated</dt><dd>{api.fmtDate(tool.updated_at)}</dd></div>
          </dl>
          {similar?.length > 0 && <><h2 className="h3" style={{ margin: '28px 0 6px' }}>Similar tools</h2><div className="rows">{similar.map((t) => <ToolRow key={t.id} t={t} />)}</div></>}
        </div>
      </div>
      <Toast msg={msg} />
    </main>
  )
}
