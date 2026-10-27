import type { AskAnswer, Deck, DeckAudio, DeckSummary, GenerateEvent, GenerateRequest, Settings, VideoFormat } from '../shared/types'
import type { ProviderId } from '../shared/providers'

export interface CreateDeckOptions {
  title?: string
  project: string
  themeId: string
  templateId?: string
  /** 'video' makes a video (timed scenes) instead of a presentation. */
  kind?: 'deck' | 'video'
  format?: VideoFormat
}

/** A video export that has started: the size of its frames, and the music to mix in. */
export interface VideoJob {
  jobId: string
  width: number
  height: number
  fps: number
  frames: number
  audio: { data: Uint8Array; volume: number } | null
}

/** The bridge the renderer uses to talk to the main process (window.api). */
export interface Api {
  getSettings(): Promise<Settings>
  setSettings(
    patch: Partial<
      Pick<
        Settings,
        | 'provider'
        | 'model'
        | 'effort'
        | 'designCheck'
        | 'defaultThemeId'
        | 'appTheme'
        | 'projects'
        | 'extraModels'
        | 'customBaseUrl'
        | 'localCtx'
        | 'localDevice'
      >
    >
  ): Promise<Settings>
  setApiKey(provider: ProviderId, key: string | null): Promise<Settings>
  /** The provider's live model list; error says why it could not be loaded. */
  listModels(provider: ProviderId): Promise<{ models: string[]; error?: string }>
  /** Opens a file picker for the fastgguf program (Local AI) and saves the choice. */
  pickLocalExe(): Promise<Settings>
  /** Opens a folder picker for the .gguf models folder (Local AI) and saves the choice. */
  pickLocalModelsDir(): Promise<Settings>

  listDecks(): Promise<DeckSummary[]>
  getDeck(id: string): Promise<Deck | null>
  saveDeck(deck: Deck): Promise<Deck>
  deleteDeck(id: string): Promise<void>
  createDeck(opts: CreateDeckOptions): Promise<Deck>

  generate(req: GenerateRequest): Promise<void>
  cancel(requestId: string): Promise<void>
  /** Answers the AI's questions about the look; null leaves the choice to the AI. */
  answer(requestId: string, answers: AskAnswer[] | null): Promise<void>
  onGenerateEvent(cb: (ev: GenerateEvent) => void): () => void

  present(id: string, startIndex?: number): Promise<void>
  openInBrowser(id: string): Promise<void>
  exportHtml(id: string): Promise<string | null>
  exportPdf(id: string): Promise<string | null>
  showFile(path: string): Promise<void>

  /** Opens a file picker for a video's music and copies the file in; null when cancelled. */
  pickAudio(deckId: string): Promise<DeckAudio | null>
  /** Asks where to save the video and gets it ready to record; null when cancelled. */
  videoBegin(deckId: string, container: 'mp4' | 'webm'): Promise<VideoJob | null>
  /** The next frame as BGRA pixels, or null after the last one. */
  videoFrame(jobId: string): Promise<Uint8Array | null>
  /** Saves the finished video file and returns its path. */
  videoFinish(jobId: string, data: Uint8Array): Promise<string>
  videoCancel(jobId: string): Promise<void>

  onMenu(cb: (action: string) => void): () => void
}

declare global {
  interface Window {
    api: Api
  }
}
