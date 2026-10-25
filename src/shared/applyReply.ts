import type { Deck, Slide } from './types'
import type { ParsedReply, ParsedSlide } from './parseSlides'
import { newId } from './ids'

export function toSlide(p: ParsedSlide, id = newId('s')): Slide {
  return { id, html: p.html, className: p.className, notes: p.notes }
}

/** Merges a parsed AI reply into a deck and returns the new deck. */
export function applyReply(
  deck: Deck,
  reply: ParsedReply,
  scope: 'deck' | 'slide',
  slideIndex?: number
): Deck {
  const next: Deck = { ...deck, slides: [...deck.slides] }
  if (reply.title) next.title = reply.title
  if (reply.css !== undefined) next.css = reply.css

  if (reply.slides.length === 0) return next

  if (scope === 'slide' && slideIndex !== undefined && slideIndex < deck.slides.length) {
    const [first, ...extra] = reply.slides
    // Keep the slide id so the selection in the editor stays on it.
    next.slides[slideIndex] = toSlide(first, deck.slides[slideIndex].id)
    next.slides.splice(slideIndex + 1, 0, ...extra.map((s) => toSlide(s)))
  } else {
    next.slides = reply.slides.map((s, i) => toSlide(s, deck.slides[i]?.id))
  }
  return next
}
