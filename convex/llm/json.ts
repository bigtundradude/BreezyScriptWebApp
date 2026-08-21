// Lenient JSON-array extraction for model replies. Models sometimes wrap the
// array in prose or code fences, and long replies can truncate mid-array when
// they hit max_tokens — the salvage path recovers every complete row instead
// of failing the whole generation. On total failure the raw reply head is
// logged so production failures are diagnosable from the dashboard.
export function extractJsonArray(raw: string, label: string): unknown[] | null {
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start !== -1 && end > start) {
    try {
      const parsed: unknown = JSON.parse(raw.slice(start, end + 1))
      if (Array.isArray(parsed)) return parsed
    } catch {
      // fall through to the truncation salvage
    }
  }
  // Truncated mid-array: cut back to the last complete object and close the
  // bracket. Rows in this app are flat objects, so the last '}' is a row end.
  if (start !== -1) {
    const tail = raw.slice(start)
    const lastClose = tail.lastIndexOf('}')
    if (lastClose > 0) {
      try {
        const parsed: unknown = JSON.parse(tail.slice(0, lastClose + 1) + ']')
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.error(
            `${label}: salvaged a truncated JSON array (${parsed.length} rows) — the reply likely hit max_tokens`,
          )
          return parsed
        }
      } catch {
        // fall through to the failure log
      }
    }
  }
  console.error(`${label}: no usable JSON in the model reply; first 1200 chars:\n${raw.slice(0, 1200)}`)
  return null
}
