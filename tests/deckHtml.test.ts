import { describe, expect, it } from 'vitest'
import { buildDeckDocument, buildSlideDocument } from '@shared/deckHtml'
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
