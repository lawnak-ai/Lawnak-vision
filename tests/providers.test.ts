import { describe, expect, it } from 'vitest'
import {
  addExtraModel,
  choiceKey,
  MAX_EXTRA_MODELS,
  modelOptions,
  parseChoiceKey,
  localModelLabel,
  PROVIDER_IDS,
  providerReady,
  type ProviderId
} from '@shared/providers'
import type { Settings } from '@shared/types'

const none = Object.fromEntries(PROVIDER_IDS.map((id) => [id, false])) as Record<ProviderId, boolean>

const settings = (patch: Partial<Settings> = {}): Settings => ({
  provider: 'anthropic',
  model: 'claude-opus-5-5',
  effort: 'medium',
  designCheck: true,
  defaultThemeId: 'midnight',
  appTheme: 'dark',
  projects: [],
  extraModels: {},
  customBaseUrl: '',
  localExe: '',
  localModelsDir: '',
  localCtx: 16384,
  localDevice: 'auto',
  keys: { ...none },
  envKeys: { ...none },
  ...patch
})

describe('choice keys', () => {
  it('round-trips model names that contain a colon', () => {
    const key = choiceKey({ provider: 'custom', model: 'llama3:8b' })
    expect(key).toBe('custom:llama3:8b')
    expect(parseChoiceKey(key)).toEqual({ provider: 'custom', model: 'llama3:8b' })
  })

  it('rejects unknown providers and empty models', () => {
    expect(parseChoiceKey('acme:model')).toBeNull()
    expect(parseChoiceKey('openai:')).toBeNull()
    expect(parseChoiceKey('gpt-5.5')).toBeNull()
  })
})

describe('providerReady', () => {
  it('needs a saved or environment key', () => {
    expect(providerReady(settings(), 'openai')).toBe(false)
    expect(providerReady(settings({ keys: { ...none, openai: true } }), 'openai')).toBe(true)
    expect(providerReady(settings({ envKeys: { ...none, gemini: true } }), 'gemini')).toBe(true)
  })

  it('needs only a server address for the OpenAI-compatible provider', () => {
    expect(providerReady(settings(), 'custom')).toBe(false)
    expect(providerReady(settings({ customBaseUrl: 'http://localhost:11434/v1' }), 'custom')).toBe(true)
  })

  it('needs the fastgguf program and a models folder for Local AI', () => {
    expect(providerReady(settings({ localExe: 'C:/fg/fastgguf_big.exe' }), 'local')).toBe(false)
    expect(providerReady(settings({ localExe: 'C:/fg/fastgguf_big.exe', localModelsDir: 'C:/models' }), 'local')).toBe(true)
  })
})

describe('local model names', () => {
  it('shows the file name without folder or extension', () => {
    expect(localModelLabel('Llama-3.2-1B-Instruct-Q4_K_M.gguf')).toBe('Llama-3.2-1B-Instruct-Q4_K_M')
    expect(localModelLabel('qwen/Qwen3-8B-Q4_K_M.gguf')).toBe('Qwen3-8B-Q4_K_M')
    const s = settings({ provider: 'local', model: 'a.gguf', localExe: 'x', localModelsDir: 'y', extraModels: { local: ['a.gguf'] } })
    expect(modelOptions(s).find((o) => o.value === 'local:a.gguf')?.label).toBe('a')
  })
})

describe('modelOptions', () => {
  it('shows Claude when nothing is set up', () => {
    const values = modelOptions(settings()).map((o) => o.value)
    expect(values).toEqual(['anthropic:claude-opus-5-5', 'anthropic:claude-sonnet-5-5', 'anthropic:claude-haiku-5-5'])
  })

  it('lists every provider that is set up, with the models the user added', () => {
    const s = settings({
      keys: { ...none, anthropic: true, deepseek: true },
      extraModels: { deepseek: ['deepseek-v4-flash'] }
    })
    const options = modelOptions(s)
    expect(options.map((o) => o.value)).toContain('deepseek:deepseek-chat')
    expect(options.map((o) => o.value)).toContain('deepseek:deepseek-v4-flash')
    expect(options.find((o) => o.value === 'deepseek:deepseek-chat')?.hint).toBe('DeepSeek')
    expect(options.some((o) => o.value.startsWith('openai:'))).toBe(false)
  })

  it('always includes the model in use', () => {
    const options = modelOptions(settings({ provider: 'xai', model: 'grok-9' }))
    expect(options[0]).toEqual({ value: 'xai:grok-9', label: 'grok-9', hint: 'xAI Grok' })
  })
})

describe('addExtraModel', () => {
  it('skips presets, moves repeats to the front and keeps a short list', () => {
    expect(addExtraModel({}, 'openai', 'gpt-5.5')).toEqual({})
    let extra = addExtraModel({}, 'openai', 'a')
    extra = addExtraModel(extra, 'openai', 'b')
    extra = addExtraModel(extra, 'openai', 'a')
    expect(extra.openai).toEqual(['a', 'b'])
    for (let i = 0; i < 20; i++) extra = addExtraModel(extra, 'openai', `m${i}`)
    expect(extra.openai).toHaveLength(MAX_EXTRA_MODELS)
    expect(extra.openai![0]).toBe('m19')
  })
})
