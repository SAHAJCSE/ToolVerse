import { useState } from 'react'
import Listing, { Sidebar, SearchBar } from '../components/Listing'
import { ToolRow, useAsync } from '../components/ui'
import { listTools, trendingTools, listCategories, categoryCounts } from '../lib/api'

const CATS = [
  'Audio Generation', 'Code Generation', 'Design Assistant', 'Education',
  'Image Generation', 'Marketing', 'Research', 'Text Generation', 'Trading Bots', 'Video Generation',
]

function Section({ title, tools }) {
  if (!tools?.length) return null
  return <div className="sec"><h2>{title}</h2><div className="rows">{tools.map((t) => <ToolRow key={t.id} t={t} />)}</div></div>
}

export default function Home() {
  const [q, setQ] = useState(''), [total, setTotal] = useState(null), [cat, setCat] = useState('')
  const featured = useAsync(() => listTools({ featured: true, limit: 4 }), [])
  const latest = useAsync(() => listTools({ sort: 'new', limit: 4 }), [])
  const trending = useAsync(() => trendingTools(4), [])
  const cats = useAsync(() => Promise.all([listCategories(), categoryCounts()]), [])
  const [catList = [], counts = {}] = cats.data || []
  const catTotal = Object.values(counts).reduce((a, b) => a + b, 0)
  const stats = [
    { n: '510+', l: 'AI Tools' },
    { n: '31', l: 'Categories' },
    { n: catTotal || '—', l: 'Daily AI News' },
    { n: 'Verified', l: 'Checked' },
  ]
  document.title = 'AI Tools Hub: discover the best AI tools'
  return (
    <main className="wrap">
      <section className="hero">
        <span className="eyebrow">THE CURATED AI TOOL DIRECTORY</span>
        <h1>Find the AI tools <em>worth using</em>.</h1>
        <p className="lede">Ranked by real usage, reviewed by the community, quality-checked — never auto-generated.</p>
        <SearchBar value={q} onChange={setQ} total={total} />
        <div className="chips">
          {CATS.map((c) => <button key={c} type="button" className="chip" aria-pressed={cat === c} onClick={() => setCat(cat === c ? '' : c)}>{c}</button>)}
        </div>
        <div className="stats">
          {stats.map((s) => <div key={s.l} className="stat"><div className="stat-n">{s.n}</div><div className="stat-l">{s.l}</div></div>)}
        </div>
      </section>
      <div className="layout">
        <Sidebar current="" />
        <div>
          <Listing q={q} categoryId="" onTotal={setTotal} />
          {!q && (
            <div className="two" style={{ gridTemplateColumns: '1fr' }}>
              <Section title="Featured" tools={featured.data?.tools} />
              <Section title="Trending this week" tools={trending.data} />
              <Section title="Recently added" tools={latest.data?.tools} />
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
