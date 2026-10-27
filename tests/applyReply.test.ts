import { describe, expect, it } from 'vitest'
import { applyReply, finishReply, MAX_SNAPSHOTS, undoLast, withSnapshot } from '@shared/applyReply'
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

describe('cut-off and stopped replies', () => {
  it('keeps the slides that did not arrive when a whole-deck reply is partial', () => {
    const next = applyReply(deck(), parseReply('<slide>A</slide><slide>B</slide><slide>C'), 'deck', undefined, { partial: true })
    expect(next.slides.map((s) => s.html)).toEqual(['A', 'B', 'three'])
    expect(next.slides.map((s) => s.id)).toEqual(['s1', 's2', 's3'])
  })

  it('notes how many slides were kept when the reply hit the token limit', () => {
    const { deck: next, note } = finishReply(deck(), 'Here you go.\n<slide>A</slide><slide>B', 'deck', undefined, 'truncated')
    expect(next.slides.map((s) => s.html)).toEqual(['A', 'two', 'three'])
    expect(note).toBe('Here you go.\n\nThe reply was cut off after 1 slide. The last 2 slides stayed as before.')
  })

  it('keeps finished slides when the user stops', () => {
    const { deck: next, note } = finishReply(deck(), '<slide>A</slide><slide>B</slide><slide>C', 'deck', undefined, 'stopped')
    expect(next.slides.map((s) => s.html)).toEqual(['A', 'B', 'three'])
    expect(note).toBe('Stopped. Kept 2 finished slides. The last 1 slide stayed as before.')
  })

  it('leaves the deck unchanged when stopped before any slide finished', () => {
    const before = deck()
    const { deck: next, note } = finishReply(before, 'Working on it.\n<slide>A', 'deck', undefined, 'stopped')
    expect(next).toBe(before)
    expect(note).toBe('Stopped before any slide was finished.')
  })

  it('still replaces the whole deck when a complete reply has fewer slides', () => {
    const { deck: next } = finishReply(deck(), '<slide>A</slide>', 'deck', undefined, 'complete')
    expect(next.slides.map((s) => s.html)).toEqual(['A'])
  })
})

describe('undo', () => {
  it('takes a snapshot before an AI change and restores it', () => {
    const { deck: next } = finishReply(deck(), '<deck-title>New</deck-title><deck-css>.b{}</deck-css><slide>A</slide>', 'deck', undefined, 'complete')
    expect(next.slides).toHaveLength(1)
    expect(next.history).toHaveLength(1)

    const restored = undoLast(next)!
    expect(restored.title).toBe('Old')
    expect(restored.css).toBe('.a{}')
    expect(restored.slides.map((s) => s.html)).toEqual(['one', 'two', 'three'])
    expect(restored.history).toEqual([])
    expect(undoLast(restored)).toBeNull()
  })

  it('does not take a snapshot when the reply changes nothing', () => {
    const { deck: next } = finishReply(deck(), 'Can you tell me more about the audience?', 'deck', undefined, 'complete')
    expect(next.history).toBeUndefined()
  })

  it('undoes changes one at a time, newest first', () => {
    let d = finishReply(deck(), '<slide>A</slide>', 'deck', undefined, 'complete').deck
    d = finishReply(d, '<slide>B</slide>', 'deck', undefined, 'complete').deck
    d = undoLast(d)!
    expect(d.slides.map((s) => s.html)).toEqual(['A'])
    d = undoLast(d)!
    expect(d.slides.map((s) => s.html)).toEqual(['one', 'two', 'three'])
  })

  it(`keeps at most ${MAX_SNAPSHOTS} snapshots`, () => {
    let d = deck()
    for (let i = 0; i < MAX_SNAPSHOTS + 5; i++) d = withSnapshot({ ...d, title: `v${i}` })
    expect(d.history).toHaveLength(MAX_SNAPSHOTS)
    expect(d.history![0].title).toBe('v5')
  })
})
