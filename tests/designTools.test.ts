import { describe, expect, it } from 'vitest'
import type OpenAI from 'openai'
import type { GenerateContentResponse } from '@google/genai'
import { CATALOG, CATALOG_CATEGORIES, catalogSlide, componentBlock, describeCatalog, findCatalogItem } from '@shared/catalog'
import { designCheckNote, isArabicText } from '../src/main/designTools'
import { parseReply } from '@shared/parseSlides'
import { applyFixes } from '@shared/applyReply'
import { designSupport } from '@shared/providers'
import type { Deck } from '@shared/types'
import { MAX_TOOL_ROUNDS, parseArgs, runConversation, type Conversation, type DesignTools, type Turn } from '../src/main/ai/agent'
import { buildOpenAiRequest, readOpenAiTurn } from '../src/main/ai/openai'
import { buildGeminiRequest, readGeminiTurn } from '../src/main/ai/gemini'
import { SYSTEM_PROMPT, TOOLS_PROMPT, type AiRequest } from '../src/main/ai/prompt'
import { cleanQuestions, createDesignTools, describeAnswers } from '../src/main/designTools'
import type { SlideRenderer } from '../src/main/render'

const deck: Deck = {
  id: 'd1234',
  title: 'Talk',
  project: 'P',
  themeId: 'midnight',
  css: '',
  slides: [
    { id: 's1', html: '<h1>One</h1>', notes: 'first' },
    { id: 's2', html: '<h1>Two</h1>', elements: [{ id: 'e1', type: 'icon', x: 0, y: 0, w: 10, h: 10, props: { emoji: '🚀' } }] }
  ],
  chat: [],
  createdAt: 0,
  updatedAt: 0
}

async function* items<T>(list: T[]): AsyncGenerator<T> {
  for (const x of list) yield x
}

describe('component gallery', () => {
  it('has unique ids, every category filled, and HTML for each item', () => {
    const ids = CATALOG.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const cat of CATALOG_CATEGORIES) expect(CATALOG.some((c) => c.category === cat.id)).toBe(true)
    for (const item of CATALOG) {
      expect(item.html.trim().length).toBeGreaterThan(10)
      expect(item.use.length).toBeGreaterThan(10)
    }
  })

  it('offers the motion components as slide HTML the runtime picks up', () => {
    const motion = CATALOG.filter((c) => c.category === 'motion')
    expect(motion.length).toBeGreaterThan(5)
    for (const m of motion) expect(m.html).toContain('fxp-')
  })

  it('includes the components from examples/components with their own styles', () => {
    const ids = ['kinetic-title', 'ring-stats', 'timeline-draw', 'marquee-band', 'card-fan']
    for (const id of ids) {
      const item = findCatalogItem(id)
      expect(item, id).toBeDefined()
      // Only the part between the markers: the style block and the markup, not the preview page around it.
      expect(item!.html.startsWith('<style>'), id).toBe(true)
      expect(item!.html).toContain('cx-')
      expect(item!.html).not.toMatch(/<!doctype|<section|_preview|COMPONENT/i)
      expect(describeCatalog(item!.category)).toContain(`- ${id}:`)
    }
  })

  it('cuts a component out of its file by its markers', () => {
    const file = '<html><!-- COMPONENT x: copy from here -->\n<style>.cx{}</style><b>hi</b>\n<!-- /COMPONENT x --></html>'
    expect(componentBlock(file, 'x')).toBe('<style>.cx{}</style><b>hi</b>')
    expect(componentBlock(file, 'y')).toBe('')
  })

  it('keeps designer charts out of example HTML, where they would not draw', () => {
    for (const ex of CATALOG.filter((c) => c.category === 'examples')) expect(ex.html).not.toContain('el-chart')
  })

  it('lists one category or all of them, and finds items by id', () => {
    expect(describeCatalog('3d')).toContain('globe')
    expect(describeCatalog('3d')).not.toContain('chart-bar')
    expect(describeCatalog()).toContain('## layouts')
    expect(describeCatalog('nope')).toContain('Unknown category')
    expect(findCatalogItem(' Chart-Bar ')?.name).toBe('Bar chart')
    expect(catalogSlide(findCatalogItem('bg-silk')!).className).toContain('bg-silk')
  })
})

describe('design check replies', () => {
  it('reads the slide number the model writes', () => {
    const r = parseReply('Fixed.\n<slide number="2" class="center"><h1>B</h1></slide>')
    expect(r.slides[0]).toMatchObject({ number: 2, className: 'center', html: '<h1>B</h1>' })
    expect(r.message).toBe('Fixed.')
  })

  it('replaces only the numbered slides, keeping ids, components and notes', () => {
    const { deck: next, fixed, message } = applyFixes(deck, 'Tightened it.\n<slide number="2"><h1>Two!</h1></slide><slide number="9"><p>x</p></slide>')
    expect(fixed).toEqual([1])
    expect(message).toBe('Tightened it.')
    expect(next.slides[0]).toBe(deck.slides[0])
    expect(next.slides[1]).toMatchObject({ id: 's2', html: '<h1>Two!</h1>', elements: deck.slides[1].elements })
  })

  it('changes nothing when every slide looks good', () => {
    const r = applyFixes(deck, 'Looks good.')
    expect(r.fixed).toEqual([])
    expect(r.deck).toBe(deck)
  })
})

/** A scripted conversation: each call to turn() returns the next reply. */
function fake(turns: Turn[]): Conversation & { log: string[] } {
  const log: string[] = []
  let i = 0
  return {
    log,
    async turn(tools) {
      log.push(`turn tools=${tools}`)
      return turns[Math.min(i++, turns.length - 1)]
    },
    addToolResults(calls, outputs) {
      log.push(`results ${calls.map((c) => c.name).join(',')}: ${outputs.map((o) => o.text).join('|')}`)
    },
    addUser(m) {
      log.push(`user ${m.text}`)
    }
  }
}

const req = (extra: Partial<AiRequest> = {}): AiRequest => ({
  provider: 'anthropic',
  model: 'm',
  apiKey: 'k',
  effort: 'low',
  deck,
  prompt: 'p',
  scope: 'deck',
  signal: new AbortController().signal,
  onText: () => {},
  ...extra
})

const tools: DesignTools = {
  specs: [{ name: 'list_components', description: 'd', parameters: { type: 'object', properties: {} } }],
  run: async (c) => {
    if (c.name === 'boom') throw new Error('kaput')
    return { text: `ran ${c.name}` }
  }
}

describe('tool loop', () => {
  it('runs the tools the model asks for, then sends the design check once', async () => {
    const conv = fake([
      { text: '', calls: [{ id: '1', name: 'list_components', input: {} }, { id: '2', name: 'boom', input: {} }], truncated: false },
      { text: '<slide>A</slide>', calls: [], truncated: false },
      { text: 'Looks good.', calls: [], truncated: false }
    ])
    let checks = 0
    const res = await runConversation(
      conv,
      req({ tools, followUp: async () => (checks++, { text: 'pictures' }) })
    )
    expect(res).toEqual({ text: 'Looks good.', truncated: false })
    expect(checks).toBe(1)
    expect(conv.log).toEqual([
      'turn tools=true',
      'results list_components,boom: ran list_components|The tool failed: kaput',
      'turn tools=true',
      'user pictures',
      'turn tools=true'
    ])
  })

  it('stops offering tools after the round limit', async () => {
    const conv = fake([{ text: '', calls: [{ id: '1', name: 'list_components', input: {} }], truncated: false }])
    await runConversation(conv, req({ tools }))
    const turns = conv.log.filter((l) => l.startsWith('turn'))
    expect(turns).toHaveLength(MAX_TOOL_ROUNDS + 1)
    expect(turns[turns.length - 1]).toBe('turn tools=false')
  })

  it('returns a cut-off reply straight away', async () => {
    const conv = fake([{ text: '<slide>A', calls: [], truncated: true }])
    let checked = false
    const res = await runConversation(conv, req({ followUp: async () => ((checked = true), null) }))
    expect(res.truncated).toBe(true)
    expect(checked).toBe(false)
  })

  it('reads tool arguments defensively', () => {
    expect(parseArgs('{"ids":["a"]}')).toEqual({ ids: ['a'] })
    expect(parseArgs('[1]')).toEqual({})
    expect(parseArgs('{oops')).toEqual({})
    expect(parseArgs(undefined)).toEqual({})
  })
})

describe('providers with tools', () => {
  it('knows which providers can call tools and see pictures', () => {
    expect(designSupport('anthropic')).toEqual({ tools: true, vision: true })
    expect(designSupport('deepseek')).toEqual({ tools: true, vision: false })
    expect(designSupport('local')).toEqual({ tools: false, vision: false })
  })

  it('adds the tools and their instructions to an OpenAI request', () => {
    const params = buildOpenAiRequest({ ...req({ tools }), provider: 'openai', model: 'gpt-5.5' })
    expect(params.messages[0]).toEqual({ role: 'system', content: SYSTEM_PROMPT + TOOLS_PROMPT })
    expect(params.tools?.[0]).toMatchObject({ type: 'function', function: { name: 'list_components' } })
    expect(params.tool_choice).toBe('auto')
    expect(buildOpenAiRequest({ ...req({ tools }), provider: 'openai', model: 'x' }, undefined, false).tool_choice).toBe('none')
    expect(buildOpenAiRequest({ ...req(), provider: 'openai', model: 'x' }).tools).toBeUndefined()
  })

  it('puts tool calls streamed in pieces back together', async () => {
    const c = (delta: object, finish: string | null = null) =>
      ({ choices: [{ index: 0, delta, finish_reason: finish }] }) as unknown as OpenAI.Chat.Completions.ChatCompletionChunk
    const turn = await readOpenAiTurn(
      items([
        c({ tool_calls: [{ index: 0, id: 'call_a', function: { name: 'view_components', arguments: '{"ids":' } }] }),
        c({ tool_calls: [{ index: 0, function: { arguments: '["orb"]}' } }] }),
        c({}, 'tool_calls')
      ]),
      () => {}
    )
    expect(turn.calls).toEqual([{ id: 'call_a', name: 'view_components', input: { ids: ['orb'] } }])
  })

  it('reads Gemini function calls and keeps its parts for the next turn', async () => {
    const chunk = {
      candidates: [{ content: { parts: [{ text: 'hm', thought: true, thoughtSignature: 'sig' }, { functionCall: { name: 'list_components', args: { category: '3d' } } }] } }]
    } as unknown as GenerateContentResponse
    const turn = await readGeminiTurn(items([chunk]), () => {})
    expect(turn.calls).toEqual([{ id: 'call_0', name: 'list_components', input: { category: '3d' } }])
    expect(turn.parts).toHaveLength(2)
    expect(turn.text).toBe('')
    const params = buildGeminiRequest({ ...req({ tools }), model: 'g' }, [], false)
    expect(params.config?.tools).toHaveLength(1)
    expect(params.config?.toolConfig?.functionCallingConfig?.mode).toBe('NONE')
  })
})

describe('asking the user about the look', () => {
  const raw = {
    questions: [
      {
        question: 'Which mood?',
        options: [
          { label: 'Bold', detail: 'Big type', preview: 'title-portal' },
          { label: 'Calm', preview: 'not-a-real-id', theme: 'paper' },
          { label: '' }
        ]
      },
      { question: 'Only one option', options: [{ label: 'A' }] },
      { question: 'Colors?', options: [{ label: 'Dark', theme: 'midnight' }, { label: 'Light', theme: 'nope' }] }
    ]
  }

  it('keeps well-formed questions and drops unknown previews and themes', () => {
    const qs = cleanQuestions(raw)
    expect(qs.map((q) => q.question)).toEqual(['Which mood?', 'Colors?'])
    expect(qs[0].options).toEqual([
      { label: 'Bold', detail: 'Big type', preview: 'title-portal' },
      { label: 'Calm', theme: 'paper' }
    ])
    expect(qs[1].options[1]).toEqual({ label: 'Light' })
    expect(cleanQuestions({})).toEqual([])
  })

  it('tells the model what was picked and which theme to switch to', () => {
    const qs = cleanQuestions(raw)
    const res = describeAnswers(qs, [
      { questionId: qs[0].id, option: 0, text: 'like a keynote' },
      { questionId: qs[1].id, option: 0 }
    ])
    expect(res.theme).toBe('midnight')
    expect(res.text).toContain('"Bold" (gallery: title-portal), in their words: "like a keynote"')
    expect(res.text).toContain('Midnight theme')
    expect(describeAnswers(qs, null).text).toContain('skipped')
  })

  it('asks once, switches the theme, and is offered only when the app can ask', async () => {
    const renderer = {} as SlideRenderer
    let shown: unknown = null
    let theme = ''
    const t = createDesignTools({
      deck: () => deck,
      renderer,
      vision: false,
      onStatus: () => {},
      ask: async (questions) => ((shown = questions), [{ questionId: 'q1', option: 1 }]),
      onTheme: (id) => (theme = id)
    })
    expect(t.specs.map((s) => s.name)).toContain('ask_user')
    const first = await t.run({ id: '1', name: 'ask_user', input: raw })
    expect(shown).toHaveLength(2)
    expect(theme).toBe('paper')
    expect(first.text).toContain('"Calm"')
    expect((await t.run({ id: '2', name: 'ask_user', input: raw })).text).toContain('already asked')

    const noAsk = createDesignTools({ deck: () => deck, renderer, vision: false, onStatus: () => {} })
    expect(noAsk.specs.map((s) => s.name)).not.toContain('ask_user')
  })
})

describe('design check note', () => {
  it('follows the language the user wrote in', () => {
    expect(isArabicText('ابي عرض لمطعم شاورما')).toBe(true)
    expect(isArabicText('A pitch deck for a café')).toBe(false)
    expect(designCheckNote([1, 5], undefined, true)).toBe('(فحص التصميم: تم تحسين الشرائح 2، 6.)')
    expect(designCheckNote([0], undefined, true)).toBe('(فحص التصميم: تم تحسين الشريحة 1.)')
    expect(designCheckNote([], undefined, true)).toBe('(فحص التصميم: كل الشرائح سليمة.)')
    expect(designCheckNote([1, 5], undefined, false)).toBe('(Design check: improved slides 2, 6.)')
    expect(designCheckNote([], 'timed out', false)).toBe('(Design check stopped: timed out)')
  })
})
