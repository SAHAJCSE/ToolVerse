import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import ImageInput from '../../components/ImageInput'
import { isHttpUrl, slugify } from '../../lib/images'

const empty = { name: '', slug: '', short_description: '', full_description: '', official_url: '', logo_url: '', screenshots: [], category_id: '', pricing_type: 'freemium', pricing_details: '', features: '', tags: '', platforms: '', launch_date: '', status: 'draft', is_featured: false }
const lines = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean)
const commas = (s) => s.split(',').map((x) => x.trim()).filter(Boolean)

export default function ToolForm({ tool, categories, onSaved, onCancel }) {
  const { profile } = useAuth()
  const [f, setF] = useState(empty)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setF(tool ? { ...empty, ...tool, features: (tool.features || []).join('\n'), tags: (tool.tags || []).join(', '), platforms: (tool.platforms || []).join(', '), launch_date: tool.launch_date || '' } : empty)
  }, [tool])

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  function validate() {
    const e = {}
    if (!f.name.trim()) e.name = 'Enter the tool name.'
    if (!f.short_description.trim()) e.short_description = 'Enter a short description.'
    if (!isHttpUrl(f.official_url)) e.official_url = 'Enter the full website address, starting with https://'
    if (!f.category_id) e.category_id = 'Choose a category.'
    setErrors(e)
    return !Object.keys(e).length
  }

  async function save(status) {
    if (!validate()) return
    setBusy(true)
    const row = {
      name: f.name.trim(), slug: f.slug || slugify(f.name), short_description: f.short_description.trim(), full_description: f.full_description,
      official_url: f.official_url.trim(), logo_url: f.logo_url || null, screenshots: f.screenshots, category_id: f.category_id,
      pricing_type: f.pricing_type, pricing_details: f.pricing_details, features: lines(f.features), tags: commas(f.tags), platforms: commas(f.platforms),
      // Only store a launch date the admin typed; it is flagged verified only when present.
      launch_date: f.launch_date || null, launch_date_verified: !!f.launch_date, is_featured: f.is_featured, status
    }
    const q = tool?.id ? supabase.from('ai_tools').update(row).eq('id', tool.id).select().single() : supabase.from('ai_tools').insert({ ...row, created_by: profile.id }).select().single()
    const { data, error } = await q
    setBusy(false)
    if (error) return setErrors({ form: error.code === '23505' ? 'A tool with this slug already exists.' : error.message })
    await supabase.from('admin_logs').insert({ admin_id: profile.id, action: `${tool?.id ? 'update' : 'create'}_tool:${status}`, entity_id: data.id })
    onSaved(data)
  }

  const err = (k) => errors[k] && <small role="alert" className="text-red-700">{errors[k]}</small>
  return (
    <form onSubmit={(e) => { e.preventDefault(); save('published') }} className="grid max-w-2xl gap-4">
      <label className="grid gap-1 text-sm font-semibold">Tool name
        <input className="field" value={f.name} onChange={(e) => { set('name', e.target.value); if (!tool) set('slug', slugify(e.target.value)) }} />
        <small className="font-normal text-[#5d6975]">Slug: {f.slug || 'generated from the name'}</small>{err('name')}
      </label>
      <label className="grid gap-1 text-sm font-semibold">Short description<input className="field" maxLength={140} value={f.short_description} onChange={(e) => set('short_description', e.target.value)} />{err('short_description')}</label>
      <label className="grid gap-1 text-sm font-semibold">Full description<textarea className="field" rows={4} value={f.full_description} onChange={(e) => set('full_description', e.target.value)} /></label>
      <label className="grid gap-1 text-sm font-semibold">Official website<input className="field" type="url" placeholder="https://" value={f.official_url} onChange={(e) => set('official_url', e.target.value)} />{err('official_url')}</label>
      <ImageInput label="Logo" value={f.logo_url} onChange={(v) => set('logo_url', v)} websiteUrl={f.official_url} folder="logos" />
      <div className="grid gap-2">
        <span className="text-sm font-semibold">Screenshots</span>
        {f.screenshots.map((s, i) => (
          <ImageInput key={i} label={`Screenshot ${i + 1}`} value={s} folder="screenshots" onChange={(v) => set('screenshots', v ? f.screenshots.map((x, j) => (j === i ? v : x)) : f.screenshots.filter((_, j) => j !== i))} />
        ))}
        <button type="button" className="btn-alt w-fit text-sm" onClick={() => set('screenshots', [...f.screenshots, ''])}>Add screenshot</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold">Category
          <select className="field" value={f.category_id} onChange={(e) => set('category_id', e.target.value)}><option value="">Choose</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{err('category_id')}
        </label>
        <label className="grid gap-1 text-sm font-semibold">Pricing
          <select className="field" value={f.pricing_type} onChange={(e) => set('pricing_type', e.target.value)}><option value="free">Free</option><option value="freemium">Freemium</option><option value="paid">Paid</option><option value="free_trial">Free trial</option></select>
        </label>
      </div>
      <label className="grid gap-1 text-sm font-semibold">Pricing details<input className="field" value={f.pricing_details} onChange={(e) => set('pricing_details', e.target.value)} /></label>
      <label className="grid gap-1 text-sm font-semibold">Main features<textarea className="field" rows={3} value={f.features} onChange={(e) => set('features', e.target.value)} /><small className="font-normal text-[#5d6975]">One per line</small></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold">Tags<input className="field" value={f.tags} onChange={(e) => set('tags', e.target.value)} /><small className="font-normal text-[#5d6975]">Separate with commas</small></label>
        <label className="grid gap-1 text-sm font-semibold">Platforms<input className="field" value={f.platforms} onChange={(e) => set('platforms', e.target.value)} /><small className="font-normal text-[#5d6975]">Separate with commas</small></label>
      </div>
      <label className="grid gap-1 text-sm font-semibold">Launch date<input className="field" type="date" value={f.launch_date} onChange={(e) => set('launch_date', e.target.value)} /><small className="font-normal text-[#5d6975]">Leave empty unless you have confirmed the date with the maker.</small></label>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={f.is_featured} onChange={(e) => set('is_featured', e.target.checked)} />Featured</label>
      {errors.form && <p role="alert" className="text-sm text-red-700">{errors.form}</p>}
      <div className="flex flex-wrap gap-3">
        <button className="btn" disabled={busy}>{busy ? 'Saving...' : 'Publish'}</button>
        <button type="button" className="btn-alt" disabled={busy} onClick={() => save('draft')}>Save draft</button>
        {onCancel && <button type="button" className="underline" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  )
}
