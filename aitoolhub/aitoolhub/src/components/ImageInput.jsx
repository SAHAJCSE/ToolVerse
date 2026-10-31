import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ALLOWED, MAX_BYTES, isHttpUrl, logoFromWebsite } from '../lib/images'

// One field, three ways to set an image: upload a file, paste a direct link, or use the website's own icon.
export default function ImageInput({ label, value, onChange, folder = 'logos', websiteUrl }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function upload(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!ALLOWED.includes(file.type)) return setError('Use a PNG, JPG, WebP or SVG file.')
    if (file.size > MAX_BYTES) return setError('The file is larger than 2 MB.')
    setBusy(true); setError('')
    const ext = file.type === 'image/svg+xml' ? 'svg' : file.type.split('/')[1].replace('jpeg', 'jpg')
    const path = `${folder}/${crypto.randomUUID()}.${ext}`
    const { error: err } = await supabase.storage.from('tool-assets').upload(path, file, { contentType: file.type })
    setBusy(false)
    if (err) return setError(err.message)
    onChange(supabase.storage.from('tool-assets').getPublicUrl(path).data.publicUrl)
  }

  function paste(v) {
    setError('')
    onChange(v.trim())
  }

  return (
    <div className="grid gap-2">
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-lg border border-[#dfe3e6] bg-white">
          {value && isHttpUrl(value)
            ? <img src={value} alt="" className="h-full w-full object-contain" referrerPolicy="no-referrer" onError={() => setError('This link did not load as an image.')} />
            : <span className="text-xs text-[#5d6975]">None</span>}
        </div>
        <input className="field" type="url" placeholder="Paste an image link (https://...)" value={value || ''} onChange={(e) => paste(e.target.value)} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="btn-alt cursor-pointer text-sm">
          {busy ? 'Uploading...' : 'Upload file'}
          <input type="file" accept={ALLOWED.join(',')} className="sr-only" onChange={upload} disabled={busy} />
        </label>
        {websiteUrl && isHttpUrl(websiteUrl) && (
          <button type="button" className="btn-alt text-sm" onClick={() => paste(logoFromWebsite(websiteUrl))}>Use the website's own logo</button>
        )}
        {value && <button type="button" className="text-sm underline" onClick={() => paste('')}>Remove</button>}
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  )
}
