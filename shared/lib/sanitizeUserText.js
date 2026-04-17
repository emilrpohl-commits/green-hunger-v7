import createDOMPurify from 'dompurify'

function getPurifier() {
  if (typeof window === 'undefined') return null
  try {
    return createDOMPurify(window)
  } catch {
    return null
  }
}

/** Strip/neutralize HTML in user-authored beat / scene strings before React render. */
export function sanitizeUserText(text) {
  if (text == null) return ''
  const s = String(text)
  const purify = getPurifier()
  if (!purify || typeof purify.sanitize !== 'function') {
    return s.replace(/<[^>]*>/g, '')
  }
  return purify.sanitize(s, { ALLOWED_TAGS: [], KEEP_CONTENT: true })
}
