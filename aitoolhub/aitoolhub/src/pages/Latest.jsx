import { ToolRow, Empty, useAsync } from '../components/ui'
import { listTools } from '../lib/api'

export default function Latest() {
  document.title = 'Latest AI tools | AI Tools Hub'
  const { data, loading, error } = useAsync(() => listTools({ sort: 'new', limit: 30 }), [])
  return (
    <main className="wrap">
      <section className="hero" style={{ paddingBottom: 24 }}>
        <h1 style={{ maxWidth: '16ch' }}>Latest tools</h1>
        <p className="lede">Ordered by when each tool was published here. A launch date appears only after an admin has verified it.</p>
      </section>
      <div className="rows" style={{ marginBottom: 72 }}>
        {loading ? <Empty>Loading...</Empty> : error ? <Empty>Tools could not be loaded.</Empty> : data.tools.length ? data.tools.map((t) => (
          <div key={t.id}><ToolRow t={t} showDate />{t.launch_date_verified && <p className="meta" style={{ textAlign: 'left', margin: '-10px 0 12px 64px' }}>Launched {new Date(t.launch_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}</div>
        )) : <Empty>No tools published yet.</Empty>}
      </div>
    </main>
  )
}
