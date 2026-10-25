import { describe, expect, it } from 'vitest'
import { applyReply } from '@shared/applyReply'
import { parseReply } from '@shared/parseSlides'
import type { Deck } from '@shared/types'

const deck = (): Deck => ({
  id: 'd1234',
  title: 'Old',
  project: 'P',
  themeId: 'midnight',
  css: '.a{}',
  slides: [
    { id: 's1', html: 'one' },
    { id: 's2', html: 'two' },
    { id: 's3', html: 'three' }
  ],
  chat: [],
  createdAt: 0,
  updatedAt: 0
})

describe('applyReply', () => {
  it('replaces the whole deck and keeps css when none is returned', () => {
    const next = applyReply(deck(), parseReply('<deck-title>New</deck-title><slide>A</slide><slide>B</slide>'), 'deck')
    expect(next.title).toBe('New')
    expect(next.css).toBe('.a{}')
    expect(next.slides.map((s) => s.html)).toEqual(['A', 'B'])
    expect(next.slides[0].id).toBe('s1')
  })

  it('replaces one slide and keeps its id', () => {
    const next = applyReply(deck(), parseReply('<slide>TWO</slide>'), 'slide', 1)
    expect(next.slides.map((s) => s.html)).toEqual(['one', 'TWO', 'three'])
    expect(next.slides[1].id).toBe('s2')
  })

  it('inserts extra slides after the edited one', () => {
    const next = applyReply(deck(), parseReply('<slide>2a</slide><slide>2b</slide>'), 'slide', 1)
    expect(next.slides.map((s) => s.html)).toEqual(['one', '2a', '2b', 'three'])
  })

  it('leaves slides alone when the reply has none', () => {
    const next = applyReply(deck(), parseReply('Sorry, can you clarify?'), 'deck')
    expect(next.slides).toHaveLength(3)
  })
})
