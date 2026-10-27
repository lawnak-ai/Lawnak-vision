// Data model shared by the main process, preload and renderer.
import type { ProviderId } from './providers'

export interface Slide {
  id: string
  /** Inner HTML of the slide. Rendered inside a 1280x720 <section class="slide">. */
  html: string
  /** Extra classes for the <section class="slide">, e.g. "center". */
  className?: string
  /** Optional speaker notes. */
  notes?: string
  /** Components placed with the designer (drag and drop), drawn on top of the HTML. */
  elements?: SlideElement[]
  /** Videos only: seconds this scene stays on screen (see video.ts for the default). */
  duration?: number
}

/** Size of a video: landscape, vertical (phones) or square. */
export type VideoFormat = '16:9' | '9:16' | '1:1'

/** Background music of a video, copied into the app's media folder. */
export interface DeckAudio {
  /** File name inside the media folder. */
  file: string
  /** The original file name, for display. */
  name: string
  /** 0 to 1. */
  volume: number
}

export type ElementType =
  | 'text' | 'image' | 'shape' | 'button' | 'icon' | 'chart' | 'map' | 'table' | 'kpi' | 'marquee' | 'circle' | 'orb' | 'coverflow' | 'ring' | 'globe'
  // Motion components (effectsPro.ts)
  | 'rotcards' | 'shadercard' | 'ribbon' | 'albumrail' | 'reel' | 'sticker' | 'bend' | 'depthcard' | 'lenticular' | 'textpath' | 'cursor' | 'pills'

/** A component on a slide, positioned in slide pixels (the slide is 1280x720). */
export interface SlideElement {
  id: string
  type: ElementType
  x: number
  y: number
  w: number
  h: number
  /** Entrance animation class, e.g. "fade-up". */
  anim?: string
  /** Seconds before the entrance animation starts. */
  delay?: number
  /** Settings for this type of component (see elements.ts). */
  props: Record<string, string | number | boolean>
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  at: number
}

/** The deck's content from just before an AI change, so the change can be undone. */
export interface DeckSnapshot {
  title: string
  css: string
  slides: Slide[]
  at: number
}

export interface Deck {
  id: string
  title: string
  project: string
  /** 'video' makes the slides timed scenes that play by themselves and export as a video file. */
  kind?: 'deck' | 'video'
  /** Videos only: the size. */
  format?: VideoFormat
  /** Videos only: background music. */
  audio?: DeckAudio
  themeId: string
  /** Extra CSS appended after the theme (written by the user or the AI). */
  css: string
  /** Transition between slides when presenting, e.g. "slide" or "zoom" (see TRANSITIONS). */
  transition?: string
  slides: Slide[]
  chat: ChatMessage[]
  /** Snapshots taken before each AI change, oldest first. */
  history?: DeckSnapshot[]
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
  kind?: 'deck' | 'video'
}

export type Effort = 'low' | 'medium' | 'high'

export type LocalDevice = 'auto' | 'cpu' | 'gpu'

/** Context sizes offered for local models. */
export const LOCAL_CTX_SIZES = [4096, 8192, 16384, 32768] as const

/** How the app itself looks; 'system' follows the computer's setting. */
export type AppTheme = 'system' | 'light' | 'dark'

export interface Settings {
  /** The AI vendor used for generation. */
  provider: ProviderId
  /** Model name at that vendor, e.g. "claude-opus-5-5" or "gpt-5.5". */
  model: string
  /** Design effort; only Claude uses it. */
  effort: Effort
  /** After the AI writes slides, render them and let it look at the pictures and fix what looks wrong. */
  designCheck: boolean
  defaultThemeId: string
  appTheme: AppTheme
  projects: string[]
  /** Model names the user typed or loaded, per provider, shown in the pickers next to the presets. */
  extraModels: Partial<Record<ProviderId, string[]>>
  /** Server address for the OpenAI-compatible provider, e.g. https://openrouter.ai/api/v1. */
  customBaseUrl: string
  /** Local AI: the fastgguf program (e.g. fastgguf_big.exe). Only set through the file picker. */
  localExe: string
  /** Local AI: the folder with the .gguf model files. Only set through the folder picker. */
  localModelsDir: string
  /** Local AI: context size in tokens (prompt plus reply). */
  localCtx: number
  /** Local AI: where the model runs; 'auto' uses a dedicated graphics card when there is one. */
  localDevice: LocalDevice
  /** True when a key for that provider is stored (keys themselves never reach the renderer). */
  keys: Record<ProviderId, boolean>
  /** True when a key for that provider is set in the environment. */
  envKeys: Record<ProviderId, boolean>
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

/** One answer the AI offers when it asks the user how the deck should look. */
export interface AskOption {
  label: string
  detail?: string
  /** A component gallery id (catalog.ts) to show as this option's picture. */
  preview?: string
  /** A theme id; choosing the option switches the deck to that theme. */
  theme?: string
}

export interface AskQuestion {
  id: string
  question: string
  options: AskOption[]
}

/** The user's reply to one question: the option they picked, or their own words. */
export interface AskAnswer {
  questionId: string
  option?: number
  text?: string
}

export type GenerateEvent =
  | { requestId: string; type: 'status'; text: string }
  /** The AI asks how the deck should look; the request waits for ai:answer. */
  | { requestId: string; type: 'ask'; questions: AskQuestion[] }
  /** The deck's theme changed because the user picked a theme option. */
  | { requestId: string; type: 'theme'; themeId: string }
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
