import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanSettingsPatch, Store } from '../src/main/store'
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

describe('Store after a delete', () => {
  it('refuses to save a deleted deck, so a late AI reply cannot bring it back', async () => {
    await store.saveDeck(make('cccc3', 'Doomed'))
    await store.deleteDeck('cccc3')
    await expect(store.saveDeck(make('cccc3', 'Doomed'))).rejects.toThrow('deleted')
    expect(await store.getDeck('cccc3')).toBeNull()
    expect((await store.listDecks()).map((d) => d.id)).not.toContain('cccc3')
  })

  it('removes the file again when the delete happens while a save is writing', async () => {
    const saving = store.saveDeck(make('dddd4', 'Racing'))
    await store.deleteDeck('dddd4')
    await expect(saving).rejects.toThrow('deleted')
    expect(await store.getDeck('dddd4')).toBeNull()
  })
})

describe('Store settings for several providers', () => {
  it('reads settings saved before other providers existed', async () => {
    await writeFile(join(dir, 'settings.json'), JSON.stringify({ model: 'claude-sonnet-5-5', effort: 'low' }))
    const s = await store.getSettings()
    expect(s.provider).toBe('anthropic')
    expect(s.model).toBe('claude-sonnet-5-5')
    expect(s.extraModels).toEqual({})
    expect(s.customBaseUrl).toBe('')
  })

  it('falls back to Claude when the saved provider is unknown', async () => {
    await writeFile(join(dir, 'settings.json'), JSON.stringify({ provider: 'acme', model: 'x' }))
    const s = await store.getSettings()
    expect(s.provider).toBe('anthropic')
    expect(s.model).toBe('claude-opus-5-5')
  })

  it('keeps one key file per provider, with the original name for Claude', () => {
    expect(store.keyFile('anthropic')).toBe(join(dir, 'api-key.bin'))
    expect(store.keyFile('openai')).toBe(join(dir, 'api-key-openai.bin'))
    expect(() => store.keyFile('../x' as never)).toThrow('Unknown provider')
  })
})

describe('cleanSettingsPatch', () => {
  it('keeps valid fields only', () => {
    expect(
      cleanSettingsPatch({
        provider: 'gemini',
        model: ' gemini-3.8-flash ',
        effort: 'extreme',
        extraModels: { openai: ['gpt-x'], acme: ['y'], xai: 'not-a-list' },
        customBaseUrl: 'http://localhost:11434/v1',
        hacked: true
      })
    ).toEqual({ provider: 'gemini', model: 'gemini-3.8-flash', extraModels: { openai: ['gpt-x'] }, customBaseUrl: 'http://localhost:11434/v1' })
  })

  it('never lets the renderer choose the program Local AI runs', () => {
    expect(cleanSettingsPatch({ localExe: 'C:/evil.exe', localModelsDir: 'C:/x', localCtx: 8192, localDevice: 'cpu' })).toEqual({
      localCtx: 8192,
      localDevice: 'cpu'
    })
    expect(cleanSettingsPatch({ localCtx: 123, localDevice: 'tpu' })).toEqual({})
  })

  it('rejects unknown providers and addresses that are not http(s)', () => {
    expect(cleanSettingsPatch({ provider: 'acme', customBaseUrl: 'file:///etc/passwd' })).toEqual({})
    expect(cleanSettingsPatch(null)).toEqual({})
  })
})
