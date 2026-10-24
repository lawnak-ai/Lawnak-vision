import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import type { Deck, DeckSummary, Effort, ModelId } from '@shared/types'

export interface StoredSettings {
  model: ModelId
  effort: Effort
  defaultThemeId: string
  projects: string[]
}

const DEFAULT_SETTINGS: StoredSettings = {
  model: 'claude-opus-5-5',
  effort: 'medium',
  defaultThemeId: 'midnight',
  projects: ['My Presentations']
}

const ID_RE = /^[a-z0-9_-]{4,64}$/i

/** Saves decks as one JSON file each, plus a settings file, in a data folder. */
export class Store {
  private decksDir: string
  private settingsFile: string

  constructor(private root: string) {
    this.decksDir = join(root, 'decks')
    this.settingsFile = join(root, 'settings.json')
  }

  async init(): Promise<void> {
    await fs.mkdir(this.decksDir, { recursive: true })
  }

  private deckPath(id: string): string {
    // Ids come from the renderer, so never let one escape the folder.
    if (!ID_RE.test(id)) throw new Error(`Invalid deck id: ${id}`)
    return join(this.decksDir, `${id}.json`)
  }

  async listDecks(): Promise<DeckSummary[]> {
    const files = (await fs.readdir(this.decksDir)).filter((f) => f.endsWith('.json'))
    const out: DeckSummary[] = []
    for (const f of files) {
      try {
        const d = JSON.parse(await fs.readFile(join(this.decksDir, f), 'utf8')) as Deck
        out.push({ id: d.id, title: d.title, project: d.project, slideCount: d.slides.length, updatedAt: d.updatedAt })
      } catch {
        // Skip a damaged file rather than hiding every deck.
      }
    }
    return out.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  async getDeck(id: string): Promise<Deck | null> {
    try {
      return JSON.parse(await fs.readFile(this.deckPath(id), 'utf8')) as Deck
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw e
    }
  }

  async saveDeck(deck: Deck): Promise<Deck> {
    const saved = { ...deck, updatedAt: Date.now() }
    const path = this.deckPath(deck.id)
    // Write to a temp file first so a crash mid-write can't corrupt the deck.
    await fs.writeFile(path + '.tmp', JSON.stringify(saved, null, 2), 'utf8')
    await fs.rename(path + '.tmp', path)
    return saved
  }

  async deleteDeck(id: string): Promise<void> {
    await fs.rm(this.deckPath(id), { force: true })
  }

  async getSettings(): Promise<StoredSettings> {
    try {
      const raw = JSON.parse(await fs.readFile(this.settingsFile, 'utf8')) as Partial<StoredSettings>
      return { ...DEFAULT_SETTINGS, ...raw }
    } catch {
      return { ...DEFAULT_SETTINGS }
    }
  }

  async saveSettings(patch: Partial<StoredSettings>): Promise<StoredSettings> {
    const next = { ...(await this.getSettings()), ...patch }
    await fs.writeFile(this.settingsFile, JSON.stringify(next, null, 2), 'utf8')
    return next
  }

  get keyFile(): string {
    return join(this.root, 'api-key.bin')
  }
}
