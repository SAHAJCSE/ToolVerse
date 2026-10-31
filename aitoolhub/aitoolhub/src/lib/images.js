export const MAX_BYTES = 2 * 1024 * 1024
export const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

export function isHttpUrl(value) {
  try { const u = new URL(value); return u.protocol === 'https:' || u.protocol === 'http:' } catch { return false }
}

// The website's own icon, fetched by URL (no copy is stored). Admins can replace it with an upload or a pasted logo link.
export function logoFromWebsite(siteUrl, size = 128) {
  if (!isHttpUrl(siteUrl)) return ''
  const host = new URL(siteUrl).hostname
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`
}

export function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
