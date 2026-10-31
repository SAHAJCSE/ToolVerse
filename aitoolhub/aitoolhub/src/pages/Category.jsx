import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Listing, { Sidebar, SearchBar } from '../components/Listing'
import { Empty, useAsync } from '../components/ui'
import { listCategories, categoryCounts } from '../lib/api'

export default function Category() {
  const { slug } = useParams()
  const [q, setQ] = useState('')
  const { data, loading } = useAsync(() => Promise.all([listCategories(), categoryCounts()]), [])
  const cat = data?.[0].find((c) => c.slug === slug)
  const count = cat ? data[1][cat.id] || 0 : 0
  if (cat) document.title = `${cat.name} | AI Tools Hub`
  if (loading) return <main className="wrap"><Empty>Loading...</Empty></main>
  if (!cat) return <main className="wrap"><Empty>This category does not exist. <Link to="/" style={{ textDecoration: 'underline' }}>Back to all tools</Link></Empty></main>
  return (
    <main className="wrap">
      <section className="hero" style={{ paddingBottom: 28 }}>
        <div className="crumb" style={{ marginTop: 0 }}><Link to="/">All tools</Link> / {cat.name}</div>
        <h1 style={{ maxWidth: '18ch' }}>{cat.name}</h1>
        <p className="lede">{cat.description} {count} published {count === 1 ? 'tool' : 'tools'}.</p>
        <SearchBar value={q} onChange={setQ} />
      </section>
      <div className="layout"><Sidebar current={slug} /><div><Listing q={q} categoryId={cat.id} /></div></div>
    </main>
  )
}
