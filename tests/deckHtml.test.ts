import { describe, expect, it } from 'vitest'
import { runInNewContext } from 'node:vm'
import { buildDeckDocument, buildSlideDocument, isRtlText, slideClasses } from '@shared/deckHtml'
import { FX_CSS } from '@shared/effects'
import type { Deck } from '@shared/types'

const deck: Deck = {
  id: 'd1234',
  title: 'A <b>bold</b> talk',
  project: 'P',
  themeId: 'paper',
  css: '.x{color:red}</style><script>alert(1)</script>',
  slides: [
    { id: 's1', html: '<h1>Hi</h1>', className: 'center" onload="x', notes: 'note </script> here' },
    { id: 's2', html: '<p>Two</p>' }
  ],
  chat: [],
  createdAt: 0,
  updatedAt: 0
}

describe('buildDeckDocument', () => {
  const html = buildDeckDocument(deck, { startIndex: 1 })

  it('includes every slide and marks the start slide active', () => {
    expect(html.match(/<section class="slide/g)).toHaveLength(2)
    expect(html).toContain('<section class="slide active" data-index="1"')
  })

  it('escapes the title, class names, css and notes', () => {
    expect(html).toContain('<title>A &lt;b&gt;bold&lt;/b&gt; talk</title>')
    expect(html).toContain('class="slide center onloadx"')
    expect(html).not.toContain('</style><script>alert(1)')
    expect(html).not.toContain('note </script>')
  })

  it('embeds the presentation runtime', () => {
    expect(html).toContain('lv-stage')
    expect(html).toContain("addEventListener('keydown'")
  })
})

describe('buildSlideDocument', () => {
  it('renders a single active slide', () => {
    const html = buildSlideDocument(deck, 1)
    expect(html).toContain('<section class="slide active" data-index="1" dir="auto"><p>Two</p></section>')
    expect(html).not.toContain('<h1>Hi</h1>')
  })
})

/**
 * Runs the presenter script against a tiny fake DOM and records the slide
 * events it fires, e.g. "slideenter:1".
 */
/** A CSS animation as the presenter sees it: one-off or looping, with a clock it can rewind. */
class FakeAnimation {
  currentTime = 5000
  constructor(public loops = false) {}
  get effect() {
    return { getTiming: () => ({ iterations: this.loops ? Infinity : 1 }) }
  }
}

function runPresenter(html: string, hash: string, animations: FakeAnimation[][] = []) {
  // The runtime is the last script; the sample deck's CSS contains a fake <script> tag.
  const script = html.slice(html.lastIndexOf('<script>') + '<script>'.length, html.lastIndexOf('</script>'))
  const starts = [...html.matchAll(/<section class="([^"]*)" data-index="(\d+)"/g)]
  const events: string[] = []
  const slides = starts.map(([, cls, index]) => {
    const classes = new Set(cls.split(' '))
    return {
      classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c), contains: (c: string) => classes.has(c) },
      dispatchEvent: (e: { type: string }) => events.push(`${e.type}:${index}`),
      isActive: () => classes.has('active'),
      getAnimations: () => animations[+index] ?? []
    }
  })
  const listeners: Record<string, ((e: unknown) => void)[]> = {}
  const box = { style: { setProperty() {} }, textContent: '', hidden: true, getAttribute: () => null }
  const context = {
    document: {
      querySelectorAll: () => slides,
      querySelector: () => box,
      getElementById: () => ({ textContent: '[]' }),
      documentElement: { style: { setProperty() {} } },
      addEventListener() {},
      body: { classList: { add() {}, remove() {} } }
    },
    addEventListener: (type: string, fn: (e: unknown) => void) => (listeners[type] ??= []).push(fn),
    innerWidth: 1280,
    innerHeight: 720,
    location: { hash },
    history: { replaceState() {} },
    CustomEvent: class {
      constructor(public type: string) {}
    },
    setTimeout,
    clearTimeout,
    CSSAnimation: FakeAnimation,
    window: { close() {} }
  }
  runInNewContext(script, context)
  const press = (key: string): void => listeners.keydown.forEach((fn) => fn({ key, target: null, preventDefault() {} }))
  return { events, slides, press }
}

describe('presenter runtime', () => {
  const three: Deck = { ...deck, slides: [...deck.slides, { id: 's3', html: '<p>Three</p>' }] }

  it('fires slideenter on the slide it starts on', () => {
    const p = runPresenter(buildDeckDocument(three, { startIndex: 1 }), '#2')
    expect(p.events).toEqual(['slideenter:1'])
    expect(p.slides.map((s) => s.isActive())).toEqual([false, true, false])
  })

  it('fires slideleave then slideenter when moving', () => {
    const p = runPresenter(buildDeckDocument(three), '')
    p.press('ArrowRight')
    p.press('ArrowLeft')
    expect(p.events).toEqual(['slideenter:0', 'slideleave:0', 'slideenter:1', 'slideleave:1', 'slideenter:0'])
  })

  it('fires nothing more when already on the last slide', () => {
    const p = runPresenter(buildDeckDocument(three, { startIndex: 2 }), '#3')
    p.press('ArrowRight')
    expect(p.events).toEqual(['slideenter:2'])
  })

  it("restarts a slide's one-off animations as it comes in, and leaves loops running", () => {
    // A deck's own CSS may start animations when the file opens; by slide 2 they would be over.
    const once = new FakeAnimation()
    const loop = new FakeAnimation(true)
    const p = runPresenter(buildDeckDocument(three), '', [[], [once, loop]])
    expect(once.currentTime).toBe(5000)
    p.press('ArrowRight')
    expect(once.currentTime).toBe(0)
    expect(loop.currentTime).toBe(5000)
  })

  it('moves the active class when the address points at another slide', () => {
    const p = runPresenter(buildDeckDocument(three, { startIndex: 0 }), '#3')
    expect(p.events).toEqual(['slideenter:2'])
    expect(p.slides.map((s) => s.isActive())).toEqual([false, false, true])
  })
})

describe('slide preview', () => {
  it('tells the slide it is on screen', () => {
    expect(buildSlideDocument(deck, 0)).toContain("dispatchEvent(new CustomEvent('slideenter'")
  })

  it('keeps thumbnails still and lets the main preview animate', () => {
    expect(buildSlideDocument(deck, 0)).toContain('<html class="lv-static">')
    expect(buildSlideDocument(deck, 0, { animate: true })).toContain('<html><head>')
  })
})

describe('slide transitions', () => {
  it('uses the deck transition, or the default for an unknown one', () => {
    expect(buildDeckDocument({ ...deck, transition: 'zoom' })).toContain('data-transition="zoom"')
    expect(buildDeckDocument({ ...deck, transition: 'x" onload="y' })).toContain('data-transition="slide"')
  })

  it('mirrors the movement for a right-to-left deck', () => {
    const rtl = { ...deck, slides: deck.slides.map((s) => ({ ...s, className: 'center rtl' })) }
    expect(buildDeckDocument(rtl)).toContain('data-rtl="1"')
    expect(buildDeckDocument(deck)).toContain('data-rtl="0"')
  })

  it('mirrors an Arabic deck even when its slides are not marked rtl', () => {
    const arabic = { ...deck, slides: deck.slides.map((s) => ({ ...s, html: '<h1>رحلتنا</h1>', className: 'center' })) }
    expect(buildDeckDocument(arabic)).toContain('data-rtl="1"')
  })
})

describe('right-to-left slides', () => {
  it('tells right-to-left text from Latin text by what is visible', () => {
    expect(isRtlText('<h1>نصمم عروضك بالذكاء الاصطناعي</h1>')).toBe(true)
    expect(isRtlText('<h1>Build slides that move</h1>')).toBe(false)
    // An Arabic word in an English slide does not flip it.
    expect(isRtlText('<h2>Our name means color: لونك</h2>')).toBe(false)
    // Class names and styles are not text.
    expect(isRtlText('<style>.cx-rs-card{display:flex;padding:32px}</style><div class="cx-rs-card glass">٩٢٪ يوصون</div>')).toBe(true)
    expect(isRtlText('<img src="logo.png">')).toBe(false)
  })

  it('adds rtl to an Arabic slide the AI forgot or misspelled, once, and leaves "ltr" alone', () => {
    expect(slideClasses({ html: '<h1>مرحبا</h1>' })).toBe('rtl')
    expect(slideClasses({ html: '<h1>مرحبا</h1>', className: 'center rdl' })).toBe('center rdl rtl')
    expect(slideClasses({ html: '<h1>مرحبا</h1>', className: 'center rtl' })).toBe('center rtl')
    expect(slideClasses({ html: '<h1>مرحبا</h1>', className: 'ltr' })).toBe('ltr')
    expect(slideClasses({ html: '<h1>Hello</h1>', className: 'center' })).toBe('center')
  })

  it('puts the class on the rendered slide', () => {
    const arabic = { ...deck, slides: [{ id: 'a', html: '<h1>رحلتنا</h1>', className: 'center' }] }
    expect(buildSlideDocument(arabic, 0)).toContain('<section class="slide center rtl active"')
  })
})

describe('text effects', () => {
  it('gives split words the gradient fill, so gradient text inside a word animation stays visible', () => {
    expect(FX_CSS).toMatch(/:is\(\.gradient-text,\.fx-shiny\) \.fx-u\{background:inherit;[^}]*background-clip:text;color:transparent\}/)
  })
})

describe('still pictures and print', () => {
  it('show every animation at its end, including ones a deck hides until they play', () => {
    const html = buildSlideDocument(deck, 0)
    expect(html).toContain('animation-duration:0s!important')
    expect(html).toContain('animation-fill-mode:both!important')
    expect(html).toContain('.slide *::before,.slide *::after')
    expect(html).not.toContain('animation:none!important}')
    // A playing preview leaves animations alone.
    expect(buildSlideDocument(deck, 0, { animate: true })).not.toContain('animation-duration:0s!important')
  })
})
