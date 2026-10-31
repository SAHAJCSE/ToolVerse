import { useState } from 'react'
import Listing, { Sidebar, SearchBar } from '../components/Listing'
import { ToolRow, useAsync } from '../components/ui'
import { listTools, trendingTools } from '../lib/api'

function Section({ title, tools }) {
  if (!tools?.length) return null
  return <div className="sec"><h2>{title}</h2><div className="rows">{tools.map((t) => <ToolRow key={t.id} t={t} />)}</div></div>
}

export default function Home() {
  const [q, setQ] = useState(''), [total, setTotal] = useState(null)
  const featured = useAsync(() => listTools({ featured: true, limit: 4 }), [])
  const latest = useAsync(() => listTools({ sort: 'new', limit: 4 }), [])
  const trending = useAsync(() => trendingTools(4), [])
  document.title = 'AI Tools Hub: discover the best AI tools'
  return (
    <main className="wrap">
      <section className="hero">
        <h1>Discover the Best AI Tools for Everything.</h1>
        <p className="lede">A reviewed directory of AI products. Search by what you need to get done, compare pricing, and open the official site.</p>
        <SearchBar value={q} onChange={setQ} total={total} />
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
