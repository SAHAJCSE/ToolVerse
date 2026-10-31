import { supabase } from './supabase'

export const PAGE_SIZE = 12
export const PRICE = { free: 'Free', freemium: 'Freemium', paid: 'Paid', free_trial: 'Free trial' }
const CARD = 'id,name,slug,short_description,logo_url,pricing_type,category_id,is_featured,published_at,launch_date,launch_date_verified,views_count,category:categories!category_id(name,slug)'
const clean = (s) => s.replace(/[%,()*\\]/g, ' ').trim()
const ok = ({ data, error }) => { if (error) throw error; return data }

export const listCategories = () => supabase.from('categories').select('id,name,slug,description').order('name').then(ok)

export async function categoryCounts() {
  const rows = await supabase.from('ai_tools').select('category_id').eq('status', 'published').then(ok)
  return rows.reduce((m, r) => ((m[r.category_id] = (m[r.category_id] || 0) + 1), m), {})
}

export async function listTools({ q = '', categoryId = '', price = '', sort = 'new', page = 0, featured = false, limit = PAGE_SIZE } = {}) {
  let query = supabase.from('ai_tools').select(CARD, { count: 'exact' }).eq('status', 'published')
  if (categoryId) query = query.eq('category_id', categoryId)
  if (price) query = query.eq('pricing_type', price)
  if (featured) query = query.eq('is_featured', true)
  const s = clean(q)
  if (s) query = query.or(`name.ilike.%${s}%,short_description.ilike.%${s}%,tagline.ilike.%${s}%,tags.cs.{${s.toLowerCase()}}`)
  if (sort === 'az') query = query.order('name')
  else if (sort === 'popular') query = query.order('views_count', { ascending: false })
  else query = query.order('published_at', { ascending: false, nullsFirst: false })
  const from = page * limit
  const { data, count, error } = await query.range(from, from + limit - 1)
  if (error) throw error
  return { tools: data, total: count ?? 0 }
}

export const trendingTools = (n = 4) => supabase.rpc('trending_tools', { p_limit: n }).then(ok)

export async function getTool(slug) {
  return supabase.from('ai_tools').select('*, category:categories!category_id(id,name,slug)').eq('slug', slug).eq('status', 'published').maybeSingle().then(ok)
}
export const similarTools = (tool) => supabase.from('ai_tools').select(CARD).eq('status', 'published').eq('category_id', tool.category_id).neq('id', tool.id).limit(3).then(ok)
export const getRating = (id) => supabase.from('tool_ratings').select('avg_rating,review_count').eq('tool_id', id).maybeSingle().then(ok)
export const getReviews = (id) => supabase.from('reviews').select('id,user_id,rating,review,created_at').eq('tool_id', id).order('created_at', { ascending: false }).then(ok)
export const saveReview = (r) => supabase.from('reviews').upsert(r, { onConflict: 'user_id,tool_id' }).then(ok)
export const recordView = (id) => supabase.rpc('record_tool_view', { p_tool_id: id })

export const isSaved = async (uid, tid) => !!(await supabase.from('favorites').select('id').eq('user_id', uid).eq('tool_id', tid).maybeSingle().then(ok))
export async function toggleSaved(uid, tid, saved) {
  const q = saved ? supabase.from('favorites').delete().eq('user_id', uid).eq('tool_id', tid) : supabase.from('favorites').insert({ user_id: uid, tool_id: tid })
  return ok(await q)
}
export const savedTools = (uid) => supabase.from('favorites').select(`tool:ai_tools(${CARD})`).eq('user_id', uid).order('created_at', { ascending: false }).then(ok).then((r) => r.map((x) => x.tool).filter(Boolean))
export async function recentTools(uid) {
  const rows = await supabase.from('tool_views').select(`viewed_at,tool:ai_tools(${CARD})`).eq('user_id', uid).order('viewed_at', { ascending: false }).limit(40).then(ok)
  const seen = new Set()
  return rows.map((r) => r.tool).filter((t) => t && !seen.has(t.id) && seen.add(t.id)).slice(0, 8)
}
export const reportOutdated = (tool_id, user_id, message) => supabase.from('outdated_reports').insert({ tool_id, user_id, message }).then(ok)
export const subscribe = (email) => supabase.rpc('subscribe_newsletter', { p_email: email }).then(ok)
export const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
