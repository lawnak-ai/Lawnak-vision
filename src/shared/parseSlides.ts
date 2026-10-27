/**
 * Parses the AI's reply format. The model writes plain tags so slides can be
 * picked out while the reply is still streaming:
 *
 *   <deck-title>Quarterly review</deck-title>
 *   <deck-css>.slide h1{color:gold}</deck-css>
 *   <slide class="center">
 *     <h1>Hello</h1>
 *     <notes>Speaker notes here</notes>
 *   </slide>
 *
 * Anything outside the tags is a short message for the chat panel.
 */
import { clampSceneSeconds } from './video'

export interface ParsedSlide {
  html: string
  className?: string
  notes?: string
  /** The slide number the model wrote, e.g. <slide number="3">, used when it fixes single slides. */
  number?: number
  /** Videos: seconds the scene stays on screen, from <slide duration="3.5">. */
  duration?: number
}

export interface ParsedReply {
  title?: string
  css?: string
  /** Slides whose closing tag has arrived. */
  slides: ParsedSlide[]
  /** True while a <slide> is open but not yet closed. */
  slideInProgress: boolean
  /** Text outside the tags (the model's note to the user). */
  message: string
}

const SLIDE_RE = /<slide\b([^>]*)>([\s\S]*?)<\/slide>/gi
const NOTES_RE = /<notes>([\s\S]*?)<\/notes>/i
const CLASS_RE = /\bclass\s*=\s*"([^"]*)"|\bclass\s*=\s*'([^']*)'/i
const NUMBER_RE = /\bnumber\s*=\s*["']?(\d+)/i
const DURATION_RE = /\bduration\s*=\s*["']?(\d+(?:\.\d+)?)/i

/** Remove a ```html fence the model might wrap around its output. */
function stripFences(text: string): string {
  return text.replace(/```[a-z]*\n?/gi, '')
}

export function parseReply(raw: string): ParsedReply {
  const text = stripFences(raw)
  const slides: ParsedSlide[] = []

  for (const m of text.matchAll(SLIDE_RE)) {
    let body = m[2]
    let notes: string | undefined
    const n = body.match(NOTES_RE)
    if (n) {
      notes = n[1].trim()
      body = body.replace(NOTES_RE, '')
    }
    const c = m[1].match(CLASS_RE)
    const className = (c?.[1] ?? c?.[2] ?? '').trim() || undefined
    const num = m[1].match(NUMBER_RE)
    const dur = m[1].match(DURATION_RE)
    slides.push({
      html: body.trim(),
      className,
      notes,
      ...(num ? { number: Number(num[1]) } : {}),
      ...(dur ? { duration: clampSceneSeconds(Number(dur[1])) } : {})
    })
  }

  const title = text.match(/<deck-title>([\s\S]*?)<\/deck-title>/i)?.[1].trim()
  const css = text.match(/<deck-css>([\s\S]*?)<\/deck-css>/i)?.[1].trim()

  // Everything that is not a tag block is the chat message.
  const withoutBlocks = text
    .replace(SLIDE_RE, '')
    .replace(/<deck-title>[\s\S]*?<\/deck-title>/gi, '')
    .replace(/<deck-css>[\s\S]*?<\/deck-css>/gi, '')
  const openIdx = withoutBlocks.search(/<slide\b|<deck-css>|<deck-title>/i)
  const slideInProgress = /<slide\b/i.test(openIdx >= 0 ? withoutBlocks.slice(openIdx) : '')
  const message = (openIdx >= 0 ? withoutBlocks.slice(0, openIdx) : withoutBlocks)
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return { title, css, slides, slideInProgress, message }
}
