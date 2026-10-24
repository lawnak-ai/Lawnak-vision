import { describe, expect, it } from 'vitest'
import { parseReply } from '@shared/parseSlides'

describe('parseReply', () => {
  it('reads title, css, slides, classes and notes', () => {
    const r = parseReply(`Here is your deck.
<deck-title>Coffee Shop</deck-title>
<deck-css>.slide h1{color:gold}</deck-css>
<slide class="center">
<h1>Bean There</h1>
<notes>Say hello</notes>
</slide>
<slide>
<h2>Menu</h2>
</slide>`)
    expect(r.title).toBe('Coffee Shop')
    expect(r.css).toBe('.slide h1{color:gold}')
    expect(r.message).toBe('Here is your deck.')
    expect(r.slides).toHaveLength(2)
    expect(r.slides[0]).toEqual({ html: '<h1>Bean There</h1>', className: 'center', notes: 'Say hello' })
    expect(r.slides[1].className).toBeUndefined()
    expect(r.slideInProgress).toBe(false)
  })

  it('only returns finished slides while streaming', () => {
    const r = parseReply('Working on it.\n<slide><h1>One</h1></slide>\n<slide><h2>Tw')
    expect(r.slides).toHaveLength(1)
    expect(r.slideInProgress).toBe(true)
    expect(r.message).toBe('Working on it.')
  })

  it('ignores markdown fences around the output', () => {
    const r = parseReply('```html\n<slide><p>x</p></slide>\n```')
    expect(r.slides).toEqual([{ html: '<p>x</p>', className: undefined, notes: undefined }])
  })

  it('returns no slides for a plain message', () => {
    const r = parseReply('I need more detail about the audience.')
    expect(r.slides).toEqual([])
    expect(r.message).toBe('I need more detail about the audience.')
  })
})
