import type { Settings } from './types'

/** The AI vendors the app can call. */
export type ProviderId = 'anthropic' | 'openai' | 'gemini' | 'deepseek' | 'xai' | 'custom' | 'local'

export interface ModelPreset {
  id: string
  label: string
}

export interface Provider {
  id: ProviderId
  name: string
  /** Where to get an API key. */
  keyUrl?: string
  keyPlaceholder: string
  /** Environment variables that can hold the key instead of Settings. */
  envVars: string[]
  /** Endpoint for OpenAI-compatible vendors. The custom provider uses the address from Settings. */
  baseURL?: string
  /** A few current models; any other model name can be typed or loaded in Settings. */
  models: ModelPreset[]
}

export const PROVIDERS: Provider[] = [
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    keyUrl: 'https://console.anthropic.com',
    keyPlaceholder: 'sk-ant-…',
    envVars: ['ANTHROPIC_API_KEY'],
    models: [
      { id: 'claude-opus-5-5', label: 'Claude Opus 5.5' },
      { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5' },
      { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5' }
    ]
  },
  {
    id: 'openai',
    name: 'OpenAI',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-…',
    envVars: ['OPENAI_API_KEY'],
    models: [
      { id: 'gpt-5.5', label: 'GPT-5.5' },
      { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini' }
    ]
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyPlaceholder: 'AIza…',
    envVars: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
    models: [
      { id: 'gemini-4-argon', label: 'Gemini 4 Argon' },
      { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
      { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite' }
    ]
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    keyPlaceholder: 'sk-…',
    envVars: ['DEEPSEEK_API_KEY'],
    baseURL: 'https://api.deepseek.com',
    models: [
      { id: 'deepseek-chat', label: 'DeepSeek Chat' },
      { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner' }
    ]
  },
  {
    id: 'xai',
    name: 'xAI Grok',
    keyUrl: 'https://console.x.ai',
    keyPlaceholder: 'xai-…',
    envVars: ['XAI_API_KEY'],
    baseURL: 'https://api.x.ai/v1',
    models: [
      { id: 'grok-4.7', label: 'Grok 4.7' },
      { id: 'grok-4.6', label: 'Grok 4.6' }
    ]
  },
  {
    id: 'custom',
    name: 'OpenAI-compatible',
    keyPlaceholder: 'Optional for local servers',
    envVars: [],
    models: []
  },
  {
    // Runs .gguf model files on this computer with fastgguf; model names are file names in the models folder.
    id: 'local',
    name: 'Local AI (fastgguf)',
    keyPlaceholder: '',
    envVars: [],
    models: []
  }
]

export const PROVIDER_IDS = PROVIDERS.map((p) => p.id)

export function isProviderId(v: unknown): v is ProviderId {
  return typeof v === 'string' && (PROVIDER_IDS as string[]).includes(v)
}

export function getProvider(id: ProviderId): Provider {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0]
}

/** Providers that need an API key (the others run on this computer or use an optional key). */
export const needsKey = (id: ProviderId): boolean => id !== 'custom' && id !== 'local'

/** Only Claude takes the design effort setting. */
export const supportsEffort = (id: ProviderId): boolean => id === 'anthropic'

/**
 * What a provider can do with the design tools: call tools (browse the component gallery,
 * preview slides) and see pictures. Local and custom servers are not assumed to do either.
 */
export function designSupport(id: ProviderId): { tools: boolean; vision: boolean } {
  switch (id) {
    case 'anthropic':
    case 'openai':
    case 'gemini':
    case 'xai':
      return { tools: true, vision: true }
    case 'deepseek':
      return { tools: true, vision: false }
    default:
      return { tools: false, vision: false }
  }
}

export interface ModelChoice {
  provider: ProviderId
  model: string
}

/** One string per provider+model, for dropdown values. Model names may contain ":" (e.g. "llama3:8b"). */
export const choiceKey = (c: ModelChoice): string => `${c.provider}:${c.model}`

export function parseChoiceKey(key: string): ModelChoice | null {
  const i = key.indexOf(':')
  const provider = key.slice(0, i)
  const model = key.slice(i + 1)
  return i > 0 && model && isProviderId(provider) ? { provider, model } : null
}

export function modelLabel(provider: ProviderId, model: string): string {
  if (provider === 'local') return localModelLabel(model)
  return getProvider(provider).models.find((m) => m.id === model)?.label ?? model
}

/** A .gguf file name without its folder and extension, e.g. "Llama-3.2-1B-Instruct-Q4_K_M". */
export function localModelLabel(file: string): string {
  return file.split(/[\\/]/).pop()!.replace(/\.gguf$/i, '')
}

type ProviderSettings = Pick<
  Settings,
  'provider' | 'model' | 'extraModels' | 'customBaseUrl' | 'localExe' | 'localModelsDir' | 'keys' | 'envKeys'
>

/** True when the app has what it needs to call this provider. */
export function providerReady(s: ProviderSettings, id: ProviderId): boolean {
  if (id === 'custom') return Boolean(s.customBaseUrl.trim())
  if (id === 'local') return Boolean(s.localExe && s.localModelsDir)
  return Boolean(s.keys[id] || s.envKeys[id])
}

/** Presets plus the model names the user added, without repeats. */
export function providerModels(s: Pick<Settings, 'extraModels'>, id: ProviderId): ModelPreset[] {
  const presets = getProvider(id).models
  const extra = (s.extraModels[id] ?? [])
    .filter((m) => !presets.some((p) => p.id === m))
    .map((m) => ({ id: m, label: modelLabel(id, m) }))
  return [...presets, ...extra]
}

export interface ModelOption {
  value: string
  label: string
  hint: string
}

/**
 * Models for the pickers: every provider that is set up, plus the current
 * choice. With nothing set up, Claude's models are shown.
 */
export function modelOptions(s: ProviderSettings): ModelOption[] {
  const ready = PROVIDERS.filter((p) => providerReady(s, p.id) || p.id === s.provider)
  const providers = ready.length ? ready : [PROVIDERS[0]]
  const options = providers.flatMap((p) =>
    providerModels(s, p.id).map((m) => ({ value: choiceKey({ provider: p.id, model: m.id }), label: m.label, hint: p.name }))
  )
  const current = choiceKey(s)
  if (!options.some((o) => o.value === current)) {
    options.unshift({ value: current, label: modelLabel(s.provider, s.model), hint: getProvider(s.provider).name })
  }
  return options
}

/** How many typed or loaded model names are remembered per provider. */
export const MAX_EXTRA_MODELS = 8

/** Remembers a model name for a provider's picker (newest first). */
export function addExtraModel(extra: Settings['extraModels'], id: ProviderId, model: string): Settings['extraModels'] {
  if (getProvider(id).models.some((m) => m.id === model)) return extra
  const list = [model, ...(extra[id] ?? []).filter((m) => m !== model)].slice(0, MAX_EXTRA_MODELS)
  return { ...extra, [id]: list }
}
