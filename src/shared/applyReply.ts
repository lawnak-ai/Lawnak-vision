import type { Deck, Slide } from './types'
import { parseReply, type ParsedReply, type ParsedSlide } from './parseSlides'
import { newId } from './ids'

/** How many AI changes can be undone per deck. */
export const MAX_SNAPSHOTS = 10

export function toSlide(p: ParsedSlide, id = newId('s')): Slide {
  return { id, html: p.html, className: p.className, notes: p.notes, ...(p.duration !== undefined ? { duration: p.duration } : {}) }
}

/**
 * Merges a parsed AI reply into a deck and returns the new deck.
 * With `partial` (the reply was cut off or stopped), a whole-deck reply only
 * replaces the slides that arrived; the deck's later slides are kept.
 */
export function applyReply(
  deck: Deck,
  reply: ParsedReply,
  scope: 'deck' | 'slide',
  slideIndex?: number,
  opts: { partial?: boolean } = {}
): Deck {
  const next: Deck = { ...deck, slides: [...deck.slides] }
  if (reply.title) next.title = reply.title
  if (reply.css !== undefined) next.css = reply.css

  if (reply.slides.length === 0) return next

  if (scope === 'slide' && slideIndex !== undefined && slideIndex < deck.slides.length) {
    const [first, ...extra] = reply.slides
    // Keep the slide id so the selection in the editor stays on it.
    // Components placed with the designer stay on the slide.
    const old = deck.slides[slideIndex]
    next.slides[slideIndex] = { ...toSlide(first, old.id), elements: old.elements, duration: first.duration ?? old.duration }
    next.slides.splice(slideIndex + 1, 0, ...extra.map((s) => toSlide(s)))
  } else {
    next.slides = reply.slides.map((s, i) => ({ ...toSlide(s, deck.slides[i]?.id), elements: deck.slides[i]?.elements }))
    if (opts.partial) next.slides.push(...deck.slides.slice(reply.slides.length))
  }
  return next
}

/**
 * Applies a design-check reply, where each <slide number="N"> replaces slide N.
 * Slides keep their id, designer components and (when the fix has none) their notes.
 */
export function applyFixes(deck: Deck, raw: string): { deck: Deck; fixed: number[]; message: string } {
  const reply = parseReply(raw)
  const slides = [...deck.slides]
  const fixed = new Set<number>()
  for (const p of reply.slides) {
    const i = (p.number ?? 0) - 1
    const old = slides[i]
    if (!old) continue
    slides[i] = { ...toSlide(p, old.id), notes: p.notes ?? old.notes, elements: old.elements, duration: p.duration ?? old.duration }
    fixed.add(i)
  }
  return {
    deck: fixed.size ? { ...deck, slides } : deck,
    fixed: [...fixed].sort((a, b) => a - b),
    message: reply.message
  }
}

/** Saves the deck's current content as an undo step. */
export function withSnapshot(deck: Deck, at = Date.now()): Deck {
  const snapshot = { title: deck.title, css: deck.css, slides: deck.slides, at }
  return { ...deck, history: [...(deck.history ?? []), snapshot].slice(-MAX_SNAPSHOTS) }
}

/** Restores the content from before the last AI change, or null if there is none. */
export function undoLast(deck: Deck): Deck | null {
  const history = deck.history ?? []
  const last = history[history.length - 1]
  if (!last) return null
  return { ...deck, title: last.title, css: last.css, slides: last.slides, history: history.slice(0, -1) }
}

/** How an AI reply ended: finished, cut off by the token limit, or stopped by the user. */
export type ReplyEnd = 'complete' | 'truncated' | 'stopped'

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`

/**
 * Applies the AI's raw reply text to the deck, taking an undo snapshot when
 * anything changes, and returns the note to show in the chat.
 */
export function finishReply(
  deck: Deck,
  raw: string,
  scope: 'deck' | 'slide',
  slideIndex: number | undefined,
  end: ReplyEnd
): { deck: Deck; note: string } {
  const reply = parseReply(raw)
  const partial = end !== 'complete'
  const changed = reply.slides.length > 0 || Boolean(reply.title) || reply.css !== undefined
  const next = changed ? applyReply(withSnapshot(deck), reply, scope, slideIndex, { partial }) : deck

  const n = reply.slides.length
  const kept = partial && scope === 'deck' && n > 0 ? Math.max(0, deck.slides.length - n) : 0
  const keptNote = kept ? ` The last ${plural(kept, 'slide')} stayed as before.` : ''

  let note: string
  if (end === 'stopped') {
    note = n ? `Stopped. Kept ${plural(n, 'finished slide')}.${keptNote}` : 'Stopped before any slide was finished.'
  } else if (end === 'truncated') {
    const cut = n ? `The reply was cut off after ${plural(n, 'slide')}.${keptNote}` : 'The reply was cut off before any slide was finished.'
    note = reply.message ? `${reply.message}\n\n${cut}` : cut
  } else {
    note = reply.message || (n ? `Updated ${plural(n, 'slide')}.` : 'No slides were returned.')
  }
  return { deck: next, note }
}
