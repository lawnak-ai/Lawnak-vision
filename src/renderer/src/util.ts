export function relativeTime(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000))
  if (s < 60) return 'now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}d`
  const mo = Math.round(d / 30)
  if (mo < 12) return `${mo}mo`
  return `${Math.round(mo / 12)}y`
}

/** A short deck title from the first line of a prompt. */
export function titleFromPrompt(prompt: string): string {
  const line = prompt.trim().split('\n')[0].replace(/\s+/g, ' ')
  return line.length > 48 ? line.slice(0, 45).trimEnd() + '…' : line || 'Untitled presentation'
}
