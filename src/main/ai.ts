import Anthropic from '@anthropic-ai/sdk'
import type { Deck, Effort, ModelId } from '@shared/types'
import { THEMES } from '@shared/themes'

// Kept byte-for-byte stable so prompt caching can reuse it across requests.
const SYSTEM_PROMPT = `You are the slide designer inside Lawnak Vision, a desktop app that builds presentations from HTML, CSS and JavaScript.

# Output format
Reply with a one or two sentence note to the user, then the slides. Use exactly these tags:

<deck-title>Short deck title</deck-title>
<deck-css>/* optional extra CSS for this deck */</deck-css>
<slide class="optional-classes">
  ...inner HTML of the slide...
  <notes>Optional speaker notes, plain text.</notes>
</slide>

- Write each <slide> completely before starting the next one; the app shows slides as they arrive.
- Never wrap the output in markdown code fences.
- Include <deck-title> and <deck-css> only when creating a deck or when they should change. Omitting <deck-css> keeps the current CSS.

# The canvas
Every slide is a fixed 1280x720 <section class="slide"> (the app scales it to fit). It already has 72px/88px padding and is a flex column with a 24px gap. Content MUST fit inside 1280x720 with no scrolling: keep to about 6 bullet points or 3-4 cards per slide, and split long content across slides.

Available CSS variables: --bg --fg --muted --accent --accent-fg --surface --border --font --heading-font. Use them instead of hard-coded colors so the deck follows the chosen theme.

Built-in classes:
- On <slide>: "center" centers everything (title and section slides); "rtl" for right-to-left text. Combine them with a space.
- h1 (72px), h2 (52px), h3 (32px), p, ul/ol, pre/code are styled already.
- .kicker small uppercase accent label above a heading
- .lead large muted subtitle paragraph
- .grid-2 / .grid-3 equal-width columns that fill the remaining height
- .card rounded panel with surface background
- .stat big accent number
- .badge pill label
- .muted / .accent text colors
- .spacer pushes following content to the bottom
- .footer small text pinned to the bottom of the slide
- .fade-up entrance animation; stagger it on sibling elements

# Rules
- Use inline SVG for charts, diagrams and icons. Do not link external images; there is no internet guarantee during a talk. Emoji are fine.
- JavaScript is allowed inside a slide in a <script> tag for interactive elements (quizzes, counters, live charts). Scope queries to element ids unique to that slide. Each slide fires "slideenter" and "slideleave" events on its <section> and gets the class "active" while shown.
- Keep the text short and presentable: headlines, not paragraphs. Put the detail in <notes>.
- Write the slides in the language the user writes in. For right-to-left languages such as Arabic, add the "rtl" class to every <slide>.
- When asked to change an existing deck, return the full updated deck (every slide, in order), keeping slides the user did not ask to change as they are.
- When asked to rewrite one slide, return exactly one <slide>.`

function serializeDeck(deck: Deck, onlyIndex?: number): string {
  const theme = THEMES.find((t) => t.id === deck.themeId)?.name ?? deck.themeId
  const slides = deck.slides
    .map((s, i) => ({ s, i }))
    .filter(({ i }) => onlyIndex === undefined || i === onlyIndex)
    .map(({ s, i }) => {
      const cls = s.className ? ` class="${s.className}"` : ''
      const notes = s.notes ? `\n<notes>${s.notes}</notes>` : ''
      return `<slide${cls} number="${i + 1}">\n${s.html}${notes}\n</slide>`
    })
    .join('\n')
  return `<current-deck title="${deck.title.replace(/"/g, "'")}" theme="${theme}" slide-count="${deck.slides.length}">\n<deck-css>${deck.css}</deck-css>\n${slides}\n</current-deck>`
}

export interface AiRequest {
  apiKey: string
  model: ModelId
  effort: Effort
  deck: Deck
  prompt: string
  scope: 'deck' | 'slide'
  slideIndex?: number
  slideCount?: number
  signal: AbortSignal
  onText: (delta: string) => void
}

function buildUserMessage(req: AiRequest): string {
  const { deck, prompt, scope, slideIndex, slideCount } = req
  const isNew = deck.slides.length === 0
  const history = deck.chat
    .filter((m) => m.role === 'user')
    .slice(-6)
    .map((m) => `- ${m.text}`)
    .join('\n')

  const parts: string[] = []
  if (!isNew) parts.push(serializeDeck(deck, scope === 'slide' ? slideIndex : undefined))
  if (history) parts.push(`Earlier requests in this deck, for context:\n${history}`)

  if (isNew) {
    const count = slideCount ? `Make exactly ${slideCount} slides.` : 'Choose a sensible number of slides (usually 6-10).'
    parts.push(`Create a new presentation. ${count}\n\nRequest:\n${prompt}`)
  } else if (scope === 'slide' && slideIndex !== undefined) {
    parts.push(`Rewrite only slide ${slideIndex + 1} (shown above). Return exactly one <slide>.\n\nRequest:\n${prompt}`)
  } else {
    parts.push(`Update the deck above. Return the full updated deck.\n\nRequest:\n${prompt}`)
  }
  return parts.join('\n\n')
}

export class AiError extends Error {}

/** Streams the model's reply. Returns the full text once the reply is complete. */
export async function streamSlides(req: AiRequest): Promise<string> {
  const client = new Anthropic({ apiKey: req.apiKey })

  // Server-side fallback reroutes a refused request to another model in the
  // same call. Haiku has no server-side fallback, so it is sent without one.
  const fallback =
    req.model === 'claude-haiku-5-5'
      ? {}
      : { betas: ['server-side-fallback-2026-07-01' as const], fallbacks: 'default' as const }

  try {
    const stream = client.beta.messages.stream(
      {
        model: req.model,
        max_tokens: 64000,
        output_config: { effort: req.effort },
        cache_control: { type: 'ephemeral' },
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserMessage(req) }],
        ...fallback
      },
      { signal: req.signal }
    )
    stream.on('text', (delta) => req.onText(delta))
    const message = await stream.finalMessage()

    if (message.stop_reason === 'refusal') {
      throw new AiError('The model declined this request. Try rephrasing it.')
    }
    // On max_tokens the text is cut off; the parser keeps only complete slides.
    return message.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
  } catch (e) {
    if (e instanceof AiError) throw e
    if (e instanceof Anthropic.APIUserAbortError) throw new AiError('Stopped.')
    if (e instanceof Anthropic.AuthenticationError) throw new AiError('Your API key was rejected. Check it in Settings.')
    if (e instanceof Anthropic.PermissionDeniedError) throw new AiError('This API key does not have access to that model.')
    if (e instanceof Anthropic.RateLimitError) throw new AiError('Rate limited by the API. Wait a moment and try again.')
    if (e instanceof Anthropic.BadRequestError) throw new AiError(`The API rejected the request: ${e.message}`)
    if (e instanceof Anthropic.APIConnectionError) throw new AiError('Could not reach the Claude API. Check your internet connection.')
    if (e instanceof Anthropic.APIError) throw new AiError(`Claude API error (${e.status}): ${e.message}`)
    throw e
  }
}
