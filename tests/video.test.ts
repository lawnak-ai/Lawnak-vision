import { describe, expect, it } from 'vitest'
import { runInNewContext } from 'node:vm'
import { buildDeckDocument, buildSlideDocument } from '@shared/deckHtml'
import { parseReply } from '@shared/parseSlides'
import { applyFixes, applyReply } from '@shared/applyReply'
import {
  clampSceneSeconds,
  DEFAULT_SCENE_SECONDS,
  formatSeconds,
  sceneSeconds,
  slideSize,
  VIRTUAL_TIME_JS,
  videoSeconds
} from '@shared/video'
import { buildUserMessage, REPLY_LANGUAGE, systemPrompt, SYSTEM_PROMPT, VIDEO_PROMPT } from '../src/main/ai/prompt'
import type { Deck } from '@shared/types'

const video: Deck = {
  id: 'd1234',
  title: 'Coffee ad',
  project: 'P',
  kind: 'video',
  format: '9:16',
  themeId: 'midnight',
  css: '',
  slides: [
    { id: 's1', html: '<h1>Wake up</h1>', duration: 1 },
    { id: 's2', html: '<h1>Taste</h1>', duration: 2 },
    { id: 's3', html: '<h1>Order now</h1>' }
  ],
  chat: [],
  createdAt: 0,
  updatedAt: 0
}

describe('video helpers', () => {
  it('uses the format size for videos and 1280x720 for presentations', () => {
    expect(slideSize(video)).toEqual({ width: 720, height: 1280 })
    expect(slideSize({ ...video, format: '1:1' })).toEqual({ width: 720, height: 720 })
    expect(slideSize({ kind: undefined, format: '9:16' })).toEqual({ width: 1280, height: 720 })
  })

  it('adds up scene lengths, with a default for scenes without one', () => {
    expect(sceneSeconds(video.slides[2])).toBe(DEFAULT_SCENE_SECONDS)
    expect(videoSeconds(video)).toBe(1 + 2 + DEFAULT_SCENE_SECONDS)
    expect(clampSceneSeconds(0.2)).toBe(1)
    expect(clampSceneSeconds(99)).toBe(20)
    expect(clampSceneSeconds(NaN)).toBe(DEFAULT_SCENE_SECONDS)
    expect(formatSeconds(65.4)).toBe('1:05')
  })
})

describe('scene durations in AI replies', () => {
  it('reads duration="…" from <slide>', () => {
    const r = parseReply('<slide class="center" duration="2.5"><h1>A</h1></slide><slide duration=40><p>B</p></slide><slide><p>C</p></slide>')
    expect(r.slides.map((s) => s.duration)).toEqual([2.5, 20, undefined])
    expect(r.slides[0].className).toBe('center')
  })

  it('keeps a scene length when a one-scene rewrite or a fix leaves it out', () => {
    const one = applyReply(video, parseReply('<slide><h1>New</h1></slide>'), 'slide', 1)
    expect(one.slides[1]).toMatchObject({ html: '<h1>New</h1>', duration: 2 })
    const fixed = applyFixes(video, '<slide number="1"><h1>Fixed</h1></slide>').deck
    expect(fixed.slides[0]).toMatchObject({ html: '<h1>Fixed</h1>', duration: 1 })
  })
})

describe('video documents', () => {
  const config = (html: string) => JSON.parse(html.match(/<script type="application\/json" id="lv-config">([\s\S]*?)<\/script>/)![1])

  it('sizes vertical scenes and passes the scene lengths to the player', () => {
    const html = buildDeckDocument(video, { videoMode: 'play', audioUrl: 'file:///m/a.mp3' })
    expect(html).toContain('.slide{width:720px;height:1280px')
    expect(config(html)).toEqual({ w: 720, h: 1280, video: { durations: [1, 2, DEFAULT_SCENE_SECONDS], loop: true, capture: false, volume: 1 } })
    expect(html).toContain('<audio id="lv-audio" src="file:///m/a.mp3" preload="auto" loop></audio>')
    expect(html).not.toContain('__lvAdvance')
  })

  it('records on a virtual clock, without sound or a loop', () => {
    const html = buildDeckDocument({ ...video, audio: { file: 'x', name: 'x.mp3', volume: 0.5 } }, { videoMode: 'capture', audioUrl: 'file:///m/a.mp3' })
    expect(html.indexOf('__lvAdvance')).toBeLessThan(html.indexOf('<style>'))
    expect(html).not.toContain('<audio')
    expect(config(html).video).toMatchObject({ loop: false, capture: true, volume: 0.5 })
  })

  it('keeps presentations as they were', () => {
    const deck: Deck = { ...video, kind: undefined, format: undefined }
    const html = buildDeckDocument(deck)
    expect(config(html)).toEqual({ w: 1280, h: 720, video: null })
    expect(html).not.toContain('.slide{width:720px')
    expect(buildSlideDocument(deck, 0)).toContain('html,body{margin:0;width:1280px;height:720px')
    expect(buildSlideDocument(video, 0)).toContain('html,body{margin:0;width:720px;height:1280px')
  })
})

/** Runs the player script on a tiny fake DOM with a clock the test moves by hand. */
function runPlayer(html: string) {
  const script = html.slice(html.lastIndexOf('<script>') + '<script>'.length, html.lastIndexOf('</script>'))
  const cfg = html.match(/id="lv-config">([\s\S]*?)<\/script>/)![1]
  const starts = [...html.matchAll(/<section class="([^"]*)" data-index="(\d+)"/g)]
  const events: string[] = []
  let now = 0
  let timers: { at: number; fn: () => void; id: number }[] = []
  let nextId = 1
  const slides = starts.map(([, cls, index]) => {
    const classes = new Set(cls.split(' '))
    return {
      classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c), contains: (c: string) => classes.has(c) },
      dispatchEvent: (e: { type: string }) => events.push(`${e.type}@${now}:${index}`)
    }
  })
  const box = { style: { setProperty() {} }, textContent: '', hidden: true, getAttribute: () => null }
  const context = {
    document: {
      querySelectorAll: () => slides,
      querySelector: () => box,
      getElementById: (id: string) => (id === 'lv-config' ? { textContent: cfg } : id === 'lv-notes-data' ? { textContent: '[]' } : null),
      documentElement: { style: { setProperty() {} } },
      addEventListener() {},
      getAnimations: () => [],
      body: { classList: { add() {}, remove() {}, toggle() {} } }
    },
    addEventListener() {},
    innerWidth: 720,
    innerHeight: 1280,
    location: { hash: '' },
    history: { replaceState() {} },
    performance: { now: () => now },
    CustomEvent: class {
      constructor(public type: string) {}
    },
    setTimeout: (fn: () => void, ms: number) => {
      timers.push({ at: now + ms, fn, id: nextId })
      return nextId++
    },
    clearTimeout: (id: number) => (timers = timers.filter((t) => t.id !== id)),
    setInterval: () => 0,
    window: { close() {} }
  }
  runInNewContext(script, context)
  const advance = (ms: number): void => {
    const end = now + ms
    for (;;) {
      const t = timers.filter((x) => x.at <= end).sort((a, b) => a.at - b.at)[0]
      if (!t) break
      timers = timers.filter((x) => x !== t)
      now = t.at
      t.fn()
    }
    now = end
  }
  return { events, advance }
}

describe('video player', () => {
  const three: Deck = { ...video, slides: video.slides.map((s) => ({ ...s, duration: s.duration ?? 1.5 })) }

  it('moves to each scene after its duration and stops at the end when recording', () => {
    const p = runPlayer(buildDeckDocument(three, { videoMode: 'capture' }))
    p.advance(10000)
    expect(p.events.filter((e) => e.startsWith('slideenter'))).toEqual(['slideenter@0:0', 'slideenter@1000:1', 'slideenter@3000:2'])
  })

  it('starts over when playing in the app', () => {
    const p = runPlayer(buildDeckDocument(three, { videoMode: 'play' }))
    p.advance(4600)
    expect(p.events.filter((e) => e.startsWith('slideenter'))).toEqual([
      'slideenter@0:0',
      'slideenter@1000:1',
      'slideenter@3000:2',
      'slideenter@4500:0'
    ])
  })
})

describe('virtual clock for recording', () => {
  function setup() {
    const anims: { playState: string; currentTime: number | null; pause(): void }[] = []
    const ctx: Record<string, unknown> = {
      performance: { now: () => 12345 },
      Date: { now: () => 1000 },
      requestAnimationFrame: (cb: (t: number) => void) => setTimeout(() => cb(0), 0),
      document: { getAnimations: () => anims, fonts: { ready: Promise.resolve() } },
      console
    }
    ctx.window = ctx
    runInNewContext(VIRTUAL_TIME_JS, ctx)
    const anim = (): (typeof anims)[number] => {
      const a = { playState: 'running', currentTime: null as number | null, pause() { a.playState = 'paused' } }
      anims.push(a)
      return a
    }
    return { ctx: ctx as Record<string, any>, anim }
  }

  it('runs timers in order at their own time, then animation frames', async () => {
    const { ctx } = setup()
    const log: string[] = []
    const at = (name: string) => () => log.push(`${name}@${ctx.performance.now()}`)
    ctx.setTimeout(at('a'), 100)
    ctx.setTimeout(at('b'), 50)
    const iv = ctx.setInterval(at('i'), 40)
    ctx.requestAnimationFrame((t: number) => log.push(`raf@${t}`))
    expect(ctx.performance.now()).toBe(0)
    await ctx.__lvAdvance(100)
    expect(log).toEqual(['i@40', 'b@50', 'i@80', 'a@100', 'raf@100'])
    ctx.clearInterval(iv)
    await ctx.__lvAdvance(100)
    expect(log).toHaveLength(5)
    expect(ctx.Date.now()).toBe(1200)
  })

  it('pauses CSS animations and moves them with the clock from when they appear', async () => {
    const { ctx, anim } = setup()
    const first = anim()
    await ctx.__lvReady()
    await ctx.__lvAdvance(40)
    const later = anim()
    await ctx.__lvAdvance(60)
    expect(first.playState).toBe('paused')
    expect(first.currentTime).toBe(100)
    expect(later.currentTime).toBe(0)
    await ctx.__lvAdvance(25)
    expect(later.currentTime).toBe(25)
  })
})

describe('video prompt', () => {
  it('adds the video rules only for videos', () => {
    expect(systemPrompt({ tools: undefined, deck: video })).toBe(SYSTEM_PROMPT + VIDEO_PROMPT)
    expect(systemPrompt({ tools: undefined, deck: { kind: undefined } })).toBe(SYSTEM_PROMPT)
    expect(systemPrompt({ tools: undefined })).toBe(SYSTEM_PROMPT)
  })

  it('tells the model the canvas size and the scene lengths', () => {
    const fresh = buildUserMessage({ deck: { ...video, slides: [] }, prompt: 'Coffee', scope: 'deck' })
    expect(fresh).toContain('Create a new promotional video. The canvas is 720x1280 (vertical 9:16).')
    const edit = buildUserMessage({ deck: video, prompt: 'Faster', scope: 'deck' })
    expect(edit).toContain('kind="video" size="720x1280 (vertical 9:16)"')
    expect(edit).toContain('<slide number="2" duration="2">')
  })
})

describe('motion rules for the AI', () => {
  it("asks for gallery motion first, slide-timed custom animations, and replies in the user's language", () => {
    expect(SYSTEM_PROMPT).toContain('Prefer ready-made motion')
    expect(SYSTEM_PROMPT).toContain('.slide:is(.active,.lv-leave) .my-step')
    expect(SYSTEM_PROMPT).toContain('never opacity:0')
    expect(SYSTEM_PROMPT).toContain('an Arabic request gets an Arabic reply')
  })

  it('ends every request, new deck or edit, with the reply-language reminder', () => {
    const empty: Deck = { id: 'd', title: 't', project: 'p', themeId: 'glass', css: '', slides: [], chat: [], createdAt: 0, updatedAt: 0 }
    const full: Deck = { ...empty, slides: [{ id: 's1', html: '<h1>نبض</h1>' }, { id: 's2', html: '<p>٢</p>' }] }
    for (const msg of [
      buildUserMessage({ deck: empty, prompt: 'سوّ لي عرض', scope: 'deck' }),
      buildUserMessage({ deck: full, prompt: 'خل البطاقات تدور', scope: 'slide', slideIndex: 1 }),
      buildUserMessage({ deck: full, prompt: 'غير الألوان', scope: 'deck' })
    ])
      expect(msg.trimEnd().endsWith(REPLY_LANGUAGE)).toBe(true)
  })

  it('lets the presenter restart an animation on the virtual clock', () => {
    expect(VIRTUAL_TIME_JS).toContain('__lvRestartAnimation')
  })
})
