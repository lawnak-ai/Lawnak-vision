// Data model shared by the main process, preload and renderer.

export interface Slide {
  id: string
  /** Inner HTML of the slide. Rendered inside a 1280x720 <section class="slide">. */
  html: string
  /** Extra classes for the <section class="slide">, e.g. "center". */
  className?: string
  /** Optional speaker notes. */
  notes?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  at: number
}

export interface Deck {
  id: string
  title: string
  project: string
  themeId: string
  /** Extra CSS appended after the theme (written by the user or the AI). */
  css: string
  slides: Slide[]
  chat: ChatMessage[]
  createdAt: number
  updatedAt: number
}

/** Lightweight entry for the sidebar list. */
export interface DeckSummary {
  id: string
  title: string
  project: string
  slideCount: number
  updatedAt: number
}

export type ModelId = 'claude-opus-5-5' | 'claude-sonnet-5-5' | 'claude-haiku-5-5'
export type Effort = 'low' | 'medium' | 'high'

export interface Settings {
  model: ModelId
  effort: Effort
  defaultThemeId: string
  projects: string[]
  /** True when an API key is stored (the key itself never reaches the renderer). */
  hasApiKey: boolean
  /** True when ANTHROPIC_API_KEY is set in the environment. */
  envApiKey: boolean
}

export interface GenerateRequest {
  /** Unique id so the renderer can match stream events to this request. */
  requestId: string
  deckId: string
  prompt: string
  /** 'deck' rewrites/creates the whole deck, 'slide' rewrites only one slide. */
  scope: 'deck' | 'slide'
  slideIndex?: number
  slideCount?: number
}

export type GenerateEvent =
  | { requestId: string; type: 'status'; text: string }
  | { requestId: string; type: 'text'; text: string }
  | { requestId: string; type: 'slide'; index: number; slide: Slide }
  | { requestId: string; type: 'meta'; title?: string; css?: string }
  | { requestId: string; type: 'done'; deck: Deck }
  | { requestId: string; type: 'error'; message: string }

export interface Theme {
  id: string
  name: string
  /** Swatch colors for the picker: [background, accent]. */
  swatch: [string, string]
  css: string
}

export const MODELS: { id: ModelId; label: string }[] = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5' }
]
