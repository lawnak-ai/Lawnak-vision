import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { LOCAL_CTX_SIZES, type Deck, type DeckSummary, type Settings } from '@shared/types'
import { isProviderId, PROVIDER_IDS, type ProviderId } from '@shared/providers'

/** Settings saved to disk; key status is worked out when the settings are read. */
export type StoredSettings = Omit<Settings, 'keys' | 'envKeys'>

const DEFAULT_SETTINGS: StoredSettings = {
  provider: 'anthropic',
  model: 'claude-opus-5-5',
  effort: 'medium',
  designCheck: true,
  defaultThemeId: 'midnight',
  appTheme: 'dark',
  projects: ['My Presentations'],
  extraModels: {},
  customBaseUrl: '',
  localExe: '',
  localModelsDir: '',
  localCtx: 16384,
  localDevice: 'auto'
}

const isText = (v: unknown, max = 200): v is string => typeof v === 'string' && v.length <= max
const isTextList = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 50 && v.every((x) => isText(x))

/**
 * Keeps only the fields the renderer may change, with the right types.
 * The Local AI program and models folder are left out: the app runs that program,
 * so only the main process's file pickers may set them.
 */
export function cleanSettingsPatch(patch: unknown): Partial<StoredSettings> {
  const p = (patch ?? {}) as Record<string, unknown>
  const out: Partial<StoredSettings> = {}
  if (isProviderId(p.provider)) out.provider = p.provider
  if (isText(p.model) && p.model.trim()) out.model = p.model.trim()
  if (p.effort === 'low' || p.effort === 'medium' || p.effort === 'high') out.effort = p.effort
  if (typeof p.designCheck === 'boolean') out.designCheck = p.designCheck
  if (isText(p.defaultThemeId)) out.defaultThemeId = p.defaultThemeId
  if (p.appTheme === 'system' || p.appTheme === 'light' || p.appTheme === 'dark') out.appTheme = p.appTheme
  if (isTextList(p.projects)) out.projects = p.projects
  if (p.extraModels && typeof p.extraModels === 'object') {
    const extra: StoredSettings['extraModels'] = {}
    for (const [id, list] of Object.entries(p.extraModels)) {
      if (isProviderId(id) && isTextList(list)) extra[id] = list
    }
    out.extraModels = extra
  }
  if (isText(p.customBaseUrl, 500) && (p.customBaseUrl === '' || /^https?:\/\/\S+$/i.test(p.customBaseUrl.trim()))) {
    out.customBaseUrl = p.customBaseUrl.trim()
  }
  if ((LOCAL_CTX_SIZES as readonly unknown[]).includes(p.localCtx)) out.localCtx = p.localCtx as number
  if (p.localDevice === 'auto' || p.localDevice === 'cpu' || p.localDevice === 'gpu') out.localDevice = p.localDevice
  return out
}

const ID_RE = /^[a-z0-9_-]{4,64}$/i

/** Saves decks as one JSON file each, plus a settings file, in a data folder. */
export class Store {
  private decksDir: string
  private settingsFile: string
  /** Ids deleted while the app runs. Ids are never reused, so a save for one is always stale. */
  private deleted = new Set<string>()

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
        out.push({
          id: d.id,
          title: d.title,
          project: d.project,
          slideCount: d.slides.length,
          updatedAt: d.updatedAt,
          ...(d.kind === 'video' ? { kind: 'video' as const } : {})
        })
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
    if (this.deleted.has(deck.id)) throw new Error('This presentation was deleted.')
    // Write to a temp file first so a crash mid-write can't corrupt the deck.
    await fs.writeFile(path + '.tmp', JSON.stringify(saved, null, 2), 'utf8')
    await fs.rename(path + '.tmp', path)
    // The deck may have been deleted while this save was writing.
    if (this.deleted.has(deck.id)) {
      await fs.rm(path, { force: true })
      throw new Error('This presentation was deleted.')
    }
    return saved
  }

  async deleteDeck(id: string): Promise<void> {
    const path = this.deckPath(id)
    this.deleted.add(id)
    await fs.rm(path, { force: true })
  }

  async getSettings(): Promise<StoredSettings> {
    try {
      const raw = JSON.parse(await fs.readFile(this.settingsFile, 'utf8')) as Partial<StoredSettings>
      // Settings from before other providers were added have only a Claude model, so the default provider fits them.
      const s = { ...DEFAULT_SETTINGS, ...raw }
      return isProviderId(s.provider) ? s : { ...s, provider: DEFAULT_SETTINGS.provider, model: DEFAULT_SETTINGS.model }
    } catch {
      return { ...DEFAULT_SETTINGS }
    }
  }

  async saveSettings(patch: Partial<StoredSettings>): Promise<StoredSettings> {
    const next = { ...(await this.getSettings()), ...patch }
    await fs.writeFile(this.settingsFile, JSON.stringify(next, null, 2), 'utf8')
    return next
  }

  /** Where a provider's API key is kept. Claude keeps the original file name so existing keys still work. */
  keyFile(provider: ProviderId = 'anthropic'): string {
    if (!PROVIDER_IDS.includes(provider)) throw new Error(`Unknown provider: ${provider}`)
    return join(this.root, provider === 'anthropic' ? 'api-key.bin' : `api-key-${provider}.bin`)
  }
}
