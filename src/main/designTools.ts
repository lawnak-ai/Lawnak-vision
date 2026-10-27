import type { AskAnswer, AskOption, AskQuestion, Deck, Slide } from '@shared/types'
import { CATALOG_CATEGORIES, catalogSlide, describeCatalog, findCatalogItem } from '@shared/catalog'
import { THEMES } from '@shared/themes'
import type { DesignTools, ToolImage, ToolOutput, ToolSpec } from './ai/agent'
import type { SlideRenderer } from './render'

const MAX_VIEW = 4
/** Previews per request; the design check after the reply covers the rest. */
const MAX_PREVIEWS = 6
/** Pictures in the design check; later slides get the text check only. */
const MAX_REVIEW_PICTURES = 16

const SPECS: ToolSpec[] = [
  {
    name: 'list_components',
    description:
      'Lists the gallery of ready-made layouts and components in this app, with when to use each. Call it once before designing a new deck or a redesign.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: CATALOG_CATEGORIES.map((c) => c.id),
          description: 'Only this category. Leave it out to list everything.'
        }
      }
    }
  },
  {
    name: 'view_components',
    description: `Returns the working HTML of gallery items and a picture of each, rendered in this deck's theme. Up to ${MAX_VIEW} ids per call.`,
    parameters: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'string' }, maxItems: MAX_VIEW, description: 'Ids from list_components.' }
      },
      required: ['ids']
    }
  },
  {
    name: 'preview_slide',
    description:
      "Renders one slide in this deck's theme and returns a picture of it plus the layout problems found (content running off the slide, clipped or overlapping text, tiny text).",
    parameters: {
      type: 'object',
      properties: {
        html: { type: 'string', description: 'Inner HTML of the slide, as you would write inside <slide>.' },
        class: { type: 'string', description: 'Classes for the <slide>, e.g. "center aurora".' },
        css: { type: 'string', description: 'Deck CSS to use instead of the current deck CSS, if you plan to change it.' }
      },
      required: ['html']
    }
  }
]

const MAX_QUESTIONS = 3
const MAX_OPTIONS = 4

const ASK_SPEC: ToolSpec = {
  name: 'ask_user',
  description:
    'Asks the user how the presentation should look, as 1-3 short questions with 2-4 clickable options each, and waits for the answers. ' +
    'Every option should show a picture: set "preview" to a gallery id from list_components (a layout, background, 3D or motion item) ' +
    'and/or "theme" to a theme id. Choosing an option with a theme switches the deck to that theme. ' +
    `Themes: ${THEMES.map((t) => `${t.id} (${t.name})`).join(', ')}. ` +
    'Ask once, at the start of a new deck or a redesign, only when the request leaves the look open. Write in the user\'s language.',
  parameters: {
    type: 'object',
    properties: {
      questions: {
        type: 'array',
        maxItems: MAX_QUESTIONS,
        items: {
          type: 'object',
          properties: {
            question: { type: 'string', description: 'Short question, e.g. "Which mood fits your talk?"' },
            options: {
              type: 'array',
              maxItems: MAX_OPTIONS,
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string', description: 'One to four words.' },
                  detail: { type: 'string', description: 'One short line on what this choice means.' },
                  preview: { type: 'string', description: 'Gallery id to show as the picture.' },
                  theme: { type: 'string', enum: THEMES.map((t) => t.id), description: 'Theme to show, and to switch to if chosen.' }
                },
                required: ['label']
              }
            }
          },
          required: ['question', 'options']
        }
      }
    },
    required: ['questions']
  }
}

const text = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Keeps only well-formed questions and options from the model's arguments. */
export function cleanQuestions(input: unknown): AskQuestion[] {
  const list = Array.isArray((input as { questions?: unknown })?.questions) ? (input as { questions: unknown[] }).questions : []
  return list
    .slice(0, MAX_QUESTIONS)
    .map((q, i): AskQuestion => {
      const raw = (q ?? {}) as Record<string, unknown>
      const options = (Array.isArray(raw.options) ? raw.options : [])
        .slice(0, MAX_OPTIONS)
        .map((o): AskOption => {
          const r = (o ?? {}) as Record<string, unknown>
          const preview = findCatalogItem(text(r.preview, 80))?.id
          const theme = THEMES.find((t) => t.id === text(r.theme, 40))?.id
          return {
            label: text(r.label, 60),
            ...(text(r.detail, 160) ? { detail: text(r.detail, 160) } : {}),
            ...(preview ? { preview } : {}),
            ...(theme ? { theme } : {})
          }
        })
        .filter((o) => o.label)
      return { id: `q${i + 1}`, question: text(raw.question, 200), options }
    })
    .filter((q) => q.question && q.options.length >= 2)
}

/** The answers as text for the model, and the theme the user chose, if any. */
export function describeAnswers(questions: AskQuestion[], answers: AskAnswer[] | null): { text: string; theme?: string } {
  if (!answers) return { text: 'The user skipped the questions and left the look to you. Decide yourself and design now.' }
  let theme: string | undefined
  const lines = questions.map((q) => {
    const a = answers.find((x) => x.questionId === q.id)
    const picked = a?.option !== undefined ? q.options[a.option] : undefined
    if (picked?.theme) theme = picked.theme
    const own = a?.text?.trim().slice(0, 300)
    const answer = [picked ? `"${picked.label}"${picked.preview ? ` (gallery: ${picked.preview})` : ''}` : '', own ? `in their words: "${own}"` : '']
      .filter(Boolean)
      .join(', ')
    return `- ${q.question} → ${answer || 'no preference'}`
  })
  const switched = theme ? `\nThe deck now uses the ${THEMES.find((t) => t.id === theme)?.name ?? theme} theme.` : ''
  return { text: `The user answered:\n${lines.join('\n')}${switched}\nFollow these choices closely, then design.`, theme }
}

// Gallery pictures depend only on the item and the deck's look, so they are kept for the session.
const pictureCache = new Map<string, string>()

function picture(jpeg: string, label?: string): ToolImage {
  return { mime: 'image/jpeg', data: jpeg, label }
}

export interface DesignToolsOptions {
  /** The deck as it was when the request started: its theme and CSS style the pictures. */
  deck: () => Deck
  renderer: SlideRenderer
  /** The model can see pictures. Without it, tools return text only. */
  vision: boolean
  onStatus: (text: string) => void
  /** Shows the questions to the user and waits; null when they skip. Unset when the app cannot ask. */
  ask?: (questions: AskQuestion[]) => Promise<AskAnswer[] | null>
  /** The user picked an option that switches the theme. */
  onTheme?: (themeId: string) => void
}

/** True when the text is written mostly in Arabic letters (Arabic, Persian, Urdu share the script). */
export function isArabicText(text: string): boolean {
  const arabic = text.match(/[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/g)?.length ?? 0
  return arabic > 0 && arabic > (text.match(/[A-Za-z]/g)?.length ?? 0)
}

/** The app's note after the design check, in Arabic when the user wrote in Arabic. */
export function designCheckNote(fixed: number[], problem: string | undefined, arabic: boolean): string {
  const list = fixed.map((i) => i + 1).join(arabic ? '، ' : ', ')
  if (arabic) {
    if (fixed.length) return `(فحص التصميم: تم تحسين ${fixed.length === 1 ? 'الشريحة' : 'الشرائح'} ${list}.)`
    return problem ? `(توقف فحص التصميم: ${problem})` : '(فحص التصميم: كل الشرائح سليمة.)'
  }
  if (fixed.length) return `(Design check: improved slide${fixed.length === 1 ? '' : 's'} ${list}.)`
  return problem ? `(Design check stopped: ${problem})` : '(Design check: every slide looks good.)'
}

export function createDesignTools(opts: DesignToolsOptions): DesignTools {
  const { renderer, vision, onStatus } = opts
  let previews = 0
  let asked = false

  async function viewComponents(ids: string[]): Promise<ToolOutput> {
    const deck = opts.deck()
    const parts: string[] = []
    const images: ToolImage[] = []
    for (const id of ids.slice(0, MAX_VIEW)) {
      const item = findCatalogItem(id)
      if (!item) {
        parts.push(`## ${id}\nNot in the gallery. Call list_components to see the ids.`)
        continue
      }
      const css = item.css ? `\nIt relies on this deck CSS (add it to <deck-css>):\n${item.css.trim()}` : ''
      parts.push(
        `## ${item.id}: ${item.name}\n${item.use}${item.slideClass ? `\nSlide class: "${item.slideClass}"` : ''}${css}\nHTML:\n${item.html}`
      )
      if (!vision) continue
      const key = `${item.id}|${deck.themeId}|${deck.css}`
      let jpeg = pictureCache.get(key)
      if (!jpeg) {
        onStatus(`Looking at ${item.name}…`)
        const look: Deck = { ...deck, css: deck.css + (item.css ? '\n' + item.css : '') }
        jpeg = (await renderer.render(look, catalogSlide(item), 640)).jpeg
        if (pictureCache.size > 200) pictureCache.clear()
        pictureCache.set(key, jpeg)
      }
      images.push(picture(jpeg, `Picture of ${item.id}:`))
    }
    return { text: parts.join('\n\n'), images }
  }

  async function previewSlide(input: Record<string, unknown>): Promise<ToolOutput> {
    if (previews >= MAX_PREVIEWS) return { text: 'No more previews for this request. Write your reply now; the app checks every slide afterwards.' }
    previews++
    const html = String(input.html ?? '')
    if (!html.trim()) return { text: 'The html is empty.' }
    onStatus('Previewing a slide…')
    const deck = opts.deck()
    const look: Deck = typeof input.css === 'string' ? { ...deck, css: input.css } : deck
    const slide: Omit<Slide, 'id'> = { html, className: typeof input.class === 'string' ? input.class : undefined }
    const out = await renderer.render(look, slide)
    const checks = out.issues.length ? `Layout problems:\n- ${out.issues.join('\n- ')}` : 'The automatic layout check found no problems.'
    return { text: checks, images: vision ? [picture(out.jpeg, 'The slide:')] : [] }
  }

  async function askUser(input: Record<string, unknown>): Promise<ToolOutput> {
    if (!opts.ask) return { text: 'Asking is not available here. Decide yourself.' }
    if (asked) return { text: 'You already asked. Use the answers you have and design now.' }
    const questions = cleanQuestions(input)
    if (!questions.length) return { text: 'Give 1-3 questions, each with a question and 2-4 options that have a label.' }
    asked = true
    onStatus('Waiting for your answer…')
    const result = describeAnswers(questions, await opts.ask(questions))
    if (result.theme) opts.onTheme?.(result.theme)
    onStatus('Thinking…')
    return { text: result.text }
  }

  return {
    specs: opts.ask ? [...SPECS, ASK_SPEC] : SPECS,
    async run(call) {
      const input = call.input
      switch (call.name) {
        case 'ask_user':
          return askUser(input)
        case 'list_components':
          onStatus('Browsing the component gallery…')
          return { text: describeCatalog(typeof input.category === 'string' ? input.category : undefined) }
        case 'view_components': {
          const ids = Array.isArray(input.ids) ? input.ids.map(String) : typeof input.ids === 'string' ? [input.ids] : []
          return viewComponents(ids)
        }
        case 'preview_slide':
          return previewSlide(input)
        default:
          return { text: `There is no tool named ${call.name}.` }
      }
    }
  }
}

/**
 * The design check: renders the slides the model just wrote and asks it to fix what looks wrong.
 * `indices` are the deck positions to check. Returns null when there is nothing to send:
 * a model that cannot see pictures only gets a message when the layout check found problems.
 */
export async function buildDesignReview(
  deck: Deck,
  indices: number[],
  renderer: SlideRenderer,
  vision: boolean,
  onStatus: (text: string) => void
): Promise<ToolOutput | null> {
  const images: ToolImage[] = []
  const problems: string[] = []
  for (const i of indices) {
    const slide = deck.slides[i]
    if (!slide) continue
    onStatus(`Checking slide ${i + 1} of ${deck.slides.length}…`)
    const out = await renderer.render(deck, slide, 640)
    if (out.issues.length) problems.push(`Slide ${i + 1}:\n- ${out.issues.join('\n- ')}`)
    if (vision && images.length < MAX_REVIEW_PICTURES) images.push(picture(out.jpeg, `Slide ${i + 1}:`))
  }
  if (!images.length && !problems.length) return null

  const checks = problems.length
    ? `The automatic layout check found:\n${problems.join('\n')}`
    : 'The automatic layout check found no layout problems.'
  const look = vision
    ? `Here is how your slides look in the app, with a picture of each. ${checks}\n\nLook at every picture like a demanding designer: text cut off, overflowing or overlapping; crowded or empty areas; poor contrast; a slide that is a plain bullet list or repeats its neighbour's layout; a weak title or closing slide.`
    : `Your slides were rendered in the app. ${checks}`
  const text = `${look}

Return only the slides that need changes, each as a complete <slide number="N" class="..."> with its full new HTML and notes, where N is the slide number above. Do not repeat slides that are fine, and do not write <deck-title> or <deck-css>. Before the slides, write one short sentence for the user about what you improved. If every slide is fine, reply with just: Looks good.`
  return { text, images }
}
