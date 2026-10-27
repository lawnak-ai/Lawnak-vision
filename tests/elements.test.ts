import { describe, expect, it } from 'vitest'
import { ELEMENT_KINDS, LAYOUTS, newElement, renderElement } from '@shared/elements'
import { buildDeckDocument, buildSlideDocument } from '@shared/deckHtml'
import { applyReply } from '@shared/applyReply'
import type { Deck } from '@shared/types'

const deck = (elements: ReturnType<typeof newElement>[]): Deck => ({
  id: 'd',
  title: 'T',
  project: 'P',
  themeId: 'glass',
  css: '',
  slides: [{ id: 's1', html: '<p>Base</p>', elements }],
  chat: [],
  createdAt: 0,
  updatedAt: 0
})

describe('designer components', () => {
  it('places a component where it was dropped, centered', () => {
    const el = newElement('chart', { x: 640, y: 360 })
    expect(el.x + el.w / 2).toBe(640)
    expect(el.y + el.h / 2).toBe(360)
  })

  it('escapes text and keeps unsafe colors and image sources out', () => {
    const text = { ...newElement('text'), props: { text: '<b>hi</b>\nthere', color: 'red;background:url(x)' } }
    const html = renderElement(text)
    expect(html).toContain('&lt;b&gt;hi&lt;/b&gt;<br>there')
    expect(html).not.toContain('url(x)')
    const img = { ...newElement('image'), props: { src: 'javascript:alert(1)' } }
    expect(renderElement(img)).not.toContain('javascript:')
  })

  it('draws components on top of the slide HTML', () => {
    const html = buildSlideDocument(deck([newElement('title')]), 0)
    expect(html).toMatch(/<p>Base<\/p>\s*<div class="el el-text/)
  })

  it('embeds Chart.js and Leaflet only when a slide uses them', () => {
    const plain = buildDeckDocument(deck([newElement('text')]))
    expect(plain).not.toContain('data-chartjs')
    // Chart.js alone is about 210 KB and Leaflet about 150 KB, so either would push a plain deck past this.
    expect(plain.length).toBeLessThan(120_000)
    const rich = buildDeckDocument(deck([newElement('chart'), newElement('map')]))
    expect(rich).toContain('Chart.js v4')
    expect(rich).toContain('leaflet')
    expect(rich).not.toMatch(/<\/script[^>]*>[^<]*<\/script>\s*<\/script>/)
  })

  it('adds the live-edit bridge only for the designer', () => {
    expect(buildSlideDocument(deck([]), 0, { edit: true })).toContain("d.lv==='geom'")
    expect(buildSlideDocument(deck([]), 0)).not.toContain("d.lv==='geom'")
  })

  it('gives every layout fresh ids', () => {
    for (const l of LAYOUTS) {
      const a = l.make().map((e) => e.id)
      const b = l.make().map((e) => e.id)
      expect(a.filter((id) => b.includes(id))).toEqual([])
    }
  })

  it('builds the annual report template with its charts, map and CSS', async () => {
    const { REPORT_TEMPLATE: t } = await import('@shared/reportTemplate')
    const html = buildDeckDocument({ ...deck([]), css: t.css!, transition: t.transition, slides: t.slides.map((s, i) => ({ ...s, id: 's' + i })) })
    expect(t.slides).toHaveLength(12)
    expect(html.match(/data-chartjs=/g)).toHaveLength(7)
    expect(html.match(/data-map=/g)).toHaveLength(1)
    expect(html).toContain('data-transition="zoom"')
    expect(html).toContain('.rep-mark')
  })

  it('renders every motion component and adds its runtime only when used', async () => {
    const { PRO_TYPES } = await import('@shared/effectsPro')
    const kinds = ELEMENT_KINDS.filter((k) => k.group === 'motion')
    expect(kinds.map((k) => k.type).sort()).toEqual([...PRO_TYPES].sort())
    for (const k of kinds) expect(renderElement(newElement(k.kind))).toContain(`fxp-${k.type}`)
    const plain = buildDeckDocument(deck([newElement('text')]))
    expect(plain).not.toContain('function rotcards')
    const rich = buildDeckDocument(deck(kinds.map((k) => newElement(k.kind))))
    expect(rich).toContain('function rotcards')
    expect(rich).toContain('.fxp-rc-card')
  })

  it('keeps unsafe pictures and colours out of motion components', () => {
    const sticker = { ...newElement('sticker'), props: { src: 'javascript:alert(1)', finish: 'x"><script>' } }
    const html = renderElement(sticker)
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('<script>')
    const card = { ...newElement('shadercard'), props: { title: '<img src=x onerror=alert(1)>', color: 'red;x:url(y)' } }
    const out = renderElement(card)
    expect(out).toContain('&lt;img')
    expect(out).not.toContain('url(y)')
    const list = { ...newElement('ribbon'), props: { items: '"><script>alert(1)</script>|Title' } }
    expect(renderElement(list)).not.toContain('<script>')
  })

  it('keeps components when the AI rewrites the slide', () => {
    const d = deck([newElement('map')])
    const next = applyReply(d, { slides: [{ html: '<h2>New</h2>' }] } as never, 'slide', 0)
    expect(next.slides[0].html).toBe('<h2>New</h2>')
    expect(next.slides[0].elements).toHaveLength(1)
  })
})

describe('effects', () => {
  it('turns text, marquee and circle components into effect markup', () => {
    const t = { ...newElement('text'), props: { text: 'We are', fx: 'fx-rotate', words: 'fast|bold' } }
    expect(renderElement(t)).toContain('<span class="fx-rotate" data-words="fast|bold">fast</span>')
    const shiny = { ...newElement('text'), props: { text: 'Hi', fx: 'fx-shiny', color: '#ff0000' } }
    expect(renderElement(shiny)).toContain('<span class="fx-shiny" style="--fx-c:#ff0000">Hi</span>')
    expect(renderElement(newElement('marquee'))).toMatch(/class="el el-marquee fade-up fx-marquee".*<div class="fx-mq"><span>Riyadh<\/span>/)
    expect(renderElement(newElement('circle'))).toContain('data-text="LAWNAK')
    const card = { ...newElement('kpi'), props: { ...newElement('kpi').props, hover: 'fx-tilt" onmouseover="x' } }
    expect(renderElement(card)).toContain('fx-tiltonmouseoverx')
  })

  it('ships the effects runtime and the showcase template', async () => {
    const { FX_TEMPLATE: t } = await import('@shared/fxTemplate')
    const html = buildDeckDocument({ ...deck([]), css: t.css!, slides: t.slides.map((s, i) => ({ ...s, id: 's' + i })) })
    expect(html).toContain('window.__lvFx=init')
    expect(html).toContain('bg-particles')
  })
})

describe('3D components', () => {
  it('renders orb, coverflow and ring markup and keeps them absolutely placed', async () => {
    expect(renderElement(newElement('orb'))).toMatch(/class="el el-orb fade-up fx3-orb" data-el="[^"]+" data-energy="0.8"/)
    const cover = renderElement(newElement('coverflow'))
    expect(cover).toContain('fx3-cover')
    expect(cover).toContain('data-items="🚀|Launch|Q1 2027\n📊')
    expect(renderElement({ ...newElement('ring'), props: { items: 'a|b', axis: 'sideways"', mode: 'x' } })).toContain('data-axis="x" data-mode="step"')
    const { FX3D_TEMPLATE: t } = await import('@shared/fx3dTemplate')
    const html = buildDeckDocument({ ...deck([]), css: t.css!, slides: t.slides.map((s, i) => ({ ...s, id: 's' + i })) })
    expect(html).toContain('window.__lvFx3=init')
    expect(html).toContain(':is(.fx3-cover,.fx3-ring):not(.el){position:relative}')
  })

  it('renders the globe with clean places and options', () => {
    const globe = { ...newElement('globe'), props: { places: '24.7, 46.6, <b>Riyadh</b>\nnot a place\n51.5, -0.1, London', speed: -5, arcs: false, color: 'red;x' } }
    const html = renderElement(globe)
    expect(html).toContain('fx3-globe')
    expect(html).toContain('data-places="24.7, 46.6, &lt;b&gt;Riyadh&lt;/b&gt;\n51.5, -0.1, London"')
    expect(html).toContain('data-speed="0" data-arcs="false"')
    expect(html).not.toContain('data-color')
    expect(renderElement(newElement('globe'))).not.toContain('data-arcs')
  })

  it('ships the globe, depth card and the new shader backgrounds in decks', async () => {
    const { FX3D_TEMPLATE: t } = await import('@shared/fx3dTemplate')
    const html = buildDeckDocument({ ...deck([]), css: t.css!, slides: t.slides.map((s, i) => ({ ...s, id: 's' + i })) })
    for (const k of ['plasma', 'blob', 'portal']) {
      expect(html).toContain(`bg-${k}`)
      expect(html).toMatch(new RegExp(`"${k}":"precision highp float`))
    }
    expect(html).toContain("querySelectorAll('.fx3-globe'),globe")
    expect(html).toContain('.slide .fx3-depth>*{')
    // The globe's land outlines ship only with decks that have a globe.
    expect(html).toContain('window.__lvLand={"land":[[-168,66,')
    expect(buildDeckDocument(deck([newElement('text')]))).not.toContain('window.__lvLand=')
    const handWritten = { ...deck([]), slides: [{ id: 's', html: '<div class="fx3-globe" data-places="1, 2, A"></div>' }] }
    expect(buildDeckDocument(handWritten)).toContain('window.__lvLand=')
  })
})
