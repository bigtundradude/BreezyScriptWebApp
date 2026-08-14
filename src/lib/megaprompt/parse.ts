// Ported from BreezyScript scriptContextPro.ts — keep prompt text byte-faithful; do not edit wording casually.

/** Lenient JSON parse for pasted replies. Tries, in order: the raw text,
 *  the contents of the first fenced code block, and the outermost {...} span.
 *  Returns null on failure — callers surface a friendly retry message. */
export function parseJsonLenient<T>(raw: string): T | null {
  const tryParse = (t: string): T | null => { try { return JSON.parse(t.trim()) as T } catch { return null } }

  const direct = tryParse(raw)
  if (direct !== null) return direct

  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) {
    const fenced = tryParse(fence[1])
    if (fenced !== null) return fenced
  }

  const start = raw.indexOf('{')
  const end   = raw.lastIndexOf('}')
  if (start >= 0 && end > start) return tryParse(raw.slice(start, end + 1))
  return null
}
