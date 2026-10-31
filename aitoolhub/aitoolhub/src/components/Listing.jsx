import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PRICE, PAGE_SIZE, listCategories, categoryCounts, listTools } from '../lib/api'
import { ToolRow, Empty, useAsync } from './ui'

export function Sidebar({ current }) {
  const { data } = useAsync(() => Promise.all([listCategories(), categoryCounts()]), [])
  const [cats = [], counts = {}] = data || []
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  return (
    <aside className="side"><h3>Categories</h3>
      <ul className="cats">
        <li><Link to="/" className={!current ? 'on' : ''}><span>All tools</span><span>{total}</span></Link></li>
        {cats.map((c) => <li key={c.id}><Link to={`/category/${c.slug}`} className={current === c.slug ? 'on' : ''}><span>{c.name}</span><span>{counts[c.id] || 0}</span></Link></li>)}
      </ul>
    </aside>
  )
}

export function SearchBar({ value, onChange, total }) {
  return (
    <div className="search">
      <input type="search" placeholder="Search by name, feature or use" aria-label="Search AI tools" value={value} onChange={(e) => onChange(e.target.value)} />
      {total != null && <span>{total} {total === 1 ? 'tool' : 'tools'}</span>}
    </div>
  )
}

export function useDebounced(v, ms = 300) {
  const [d, setD] = useState(v)
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t) }, [v, ms])
  return d
}

export default function Listing({ q, categoryId, onTotal }) {
  const [price, setPrice] = useState(''), [sort, setSort] = useState('new'), [page, setPage] = useState(0)
  const dq = useDebounced(q)
  useEffect(() => setPage(0), [dq, price, sort, categoryId])
  const { data, error, loading } = useAsync(() => listTools({ q: dq, categoryId, price, sort, page }), [dq, categoryId, price, sort, page])
  useEffect(() => { if (data && onTotal) onTotal(data.total) }, [data, onTotal])
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1
  return (
    <>
      <div className="filters">
        {[['', 'Any price'], ...Object.entries(PRICE)].map(([k, l]) => <button key={k} type="button" className="chip" aria-pressed={price === k} onClick={() => setPrice(k)}>{l}</button>)}
        <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}><option value="new">Newest first</option><option value="popular">Most viewed</option><option value="az">A to Z</option></select>
      </div>
      <div className="rows">
        {loading && !data ? <Empty>Loading tools...</Empty>
          : error ? <Empty>Tools could not be loaded. Refresh the page and try again.</Empty>
          : data.tools.length ? data.tools.map((t) => <ToolRow key={t.id} t={t} />)
          : <Empty>{q || price ? 'No tools match. Clear the search or choose another price.' : 'No tools published here yet.'}</Empty>}
      </div>
      {data && data.total > PAGE_SIZE && (
        <div className="pager"><button className="btn-alt" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1} of {pages}</span><button className="btn-alt" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next</button></div>
      )}
    </>
  )
}
