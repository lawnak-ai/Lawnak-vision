import type { Deck, DeckSummary, GenerateEvent, GenerateRequest, Settings } from '../shared/types'

export interface CreateDeckOptions {
  title?: string
  project: string
  themeId: string
  templateId?: string
}

/** The bridge the renderer uses to talk to the main process (window.api). */
export interface Api {
  getSettings(): Promise<Settings>
  setSettings(patch: Partial<Pick<Settings, 'model' | 'effort' | 'defaultThemeId' | 'projects'>>): Promise<Settings>
  setApiKey(key: string | null): Promise<Settings>

  listDecks(): Promise<DeckSummary[]>
  getDeck(id: string): Promise<Deck | null>
  saveDeck(deck: Deck): Promise<Deck>
  deleteDeck(id: string): Promise<void>
  createDeck(opts: CreateDeckOptions): Promise<Deck>

  generate(req: GenerateRequest): Promise<void>
  cancel(requestId: string): Promise<void>
  onGenerateEvent(cb: (ev: GenerateEvent) => void): () => void

  present(id: string, startIndex?: number): Promise<void>
  openInBrowser(id: string): Promise<void>
  exportHtml(id: string): Promise<string | null>
  exportPdf(id: string): Promise<string | null>
  showFile(path: string): Promise<void>

  onMenu(cb: (action: string) => void): () => void
}

declare global {
  interface Window {
    api: Api
  }
}
