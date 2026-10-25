import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Store } from '../src/main/store'
import type { Deck } from '@shared/types'

let dir: string
let store: Store

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'lv-'))
  store = new Store(dir)
  await store.init()
})
afterEach(() => rm(dir, { recursive: true, force: true }))

const make = (id: string, title: string): Deck => ({
  id, title, project: 'P', themeId: 'midnight', css: '', slides: [{ id: 's', html: 'x' }], chat: [], createdAt: 0, updatedAt: 0
})

describe('Store', () => {
  it('saves, lists and deletes decks', async () => {
    await store.saveDeck(make('aaaa1', 'First'))
    await new Promise((r) => setTimeout(r, 5))
    await store.saveDeck(make('bbbb2', 'Second'))
    const list = await store.listDecks()
    expect(list.map((d) => d.title)).toEqual(['Second', 'First'])
    expect(list[0].slideCount).toBe(1)
    expect((await store.getDeck('aaaa1'))?.title).toBe('First')
    await store.deleteDeck('aaaa1')
    expect(await store.getDeck('aaaa1')).toBeNull()
  })

  it('rejects ids that could escape the data folder', async () => {
    await expect(store.getDeck('../../etc/passwd')).rejects.toThrow('Invalid deck id')
  })

  it('merges settings with defaults', async () => {
    expect((await store.getSettings()).model).toBe('claude-opus-5-5')
    await store.saveSettings({ effort: 'high' })
    const s = await store.getSettings()
    expect(s.effort).toBe('high')
    expect(s.projects).toEqual(['My Presentations'])
  })
})
