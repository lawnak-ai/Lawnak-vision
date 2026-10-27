import { describe, expect, it } from 'vitest'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { ApiError, FinishReason, type GenerateContentResponse } from '@google/genai'
import { buildOpenAiRequest, readOpenAiStream } from '../src/main/ai/openai'
import { buildGeminiRequest, readGeminiStream } from '../src/main/ai/gemini'
import { AiError, AiStoppedError, streamSlides, toAiError } from '../src/main/ai'
import { SYSTEM_PROMPT } from '../src/main/ai/prompt'
import type { Deck } from '@shared/types'

const deck: Deck = {
  id: 'd1234',
  title: 'Talk',
  project: 'P',
  themeId: 'midnight',
  css: '',
  slides: [],
  chat: [],
  createdAt: 0,
  updatedAt: 0
}
const base = { deck, prompt: 'A talk about tea', scope: 'deck' as const, signal: new AbortController().signal }

async function* items<T>(list: T[]): AsyncGenerator<T> {
  for (const x of list) yield x
}

const chunk = (content: string | null, finish: string | null = null) =>
  ({ choices: [{ index: 0, delta: content === null ? {} : { content }, finish_reason: finish }] }) as unknown as OpenAI.Chat.Completions.ChatCompletionChunk

describe('OpenAI-compatible providers', () => {
  it('sends the slide designer prompt and the request', () => {
    const params = buildOpenAiRequest({ ...base, provider: 'openai', model: 'gpt-5.5' })
    expect(params.model).toBe('gpt-5.5')
    expect(params.stream).toBe(true)
    expect(params.messages[0]).toEqual({ role: 'system', content: SYSTEM_PROMPT })
    expect(params.messages[1].content).toContain('A talk about tea')
    expect(params.max_tokens).toBeUndefined()
  })

  it('raises the DeepSeek Chat output limit so decks are not cut off at 4K tokens', () => {
    expect(buildOpenAiRequest({ ...base, provider: 'deepseek', model: 'deepseek-chat' }).max_tokens).toBe(8192)
    expect(buildOpenAiRequest({ ...base, provider: 'deepseek', model: 'deepseek-reasoner' }).max_tokens).toBeUndefined()
  })

  it('streams the text and spots a reply cut off by the token limit', async () => {
    const seen: string[] = []
    const done = await readOpenAiStream(items([chunk('<slide>'), chunk(null), chunk('A</slide>', 'stop')]), (d) => seen.push(d))
    expect(done).toEqual({ text: '<slide>A</slide>', truncated: false })
    expect(seen).toEqual(['<slide>', 'A</slide>'])

    const cut = await readOpenAiStream(items([chunk('<slide>A', 'length')]), () => {})
    expect(cut.truncated).toBe(true)
  })

  it('skips the stats chunk fastgguf sends without choices', async () => {
    const stats = { x_stats: '12 tok' } as unknown as OpenAI.Chat.Completions.ChatCompletionChunk
    const done = await readOpenAiStream(items([chunk('<slide>A</slide>'), stats, chunk(null, 'stop')]), () => {})
    expect(done).toEqual({ text: '<slide>A</slide>', truncated: false })
  })

  it('lets a local model use the whole context and sample instead of always taking the likeliest word', () => {
    const params = buildOpenAiRequest({ ...base, provider: 'local', model: 'a.gguf', maxTokens: 16384 })
    expect(params.max_tokens).toBe(16384)
    expect(params.temperature).toBe(0.7)
    expect(buildOpenAiRequest({ ...base, provider: 'openai', model: 'gpt-5.5' }).temperature).toBeUndefined()
  })

  it('reports a content filter stop as a decline', async () => {
    await expect(readOpenAiStream(items([chunk('x', 'content_filter')]), () => {})).rejects.toThrow('declined')
  })
})

const geminiChunk = (parts: { text: string; thought?: boolean }[], finishReason?: FinishReason) =>
  ({ candidates: [{ content: { parts }, finishReason }] }) as unknown as GenerateContentResponse

describe('Gemini', () => {
  it('puts the slide designer prompt in the system instruction', () => {
    const req = buildGeminiRequest({ ...base, model: 'gemini-3.8-flash' })
    expect(req.model).toBe('gemini-3.8-flash')
    expect(req.config?.systemInstruction).toBe(SYSTEM_PROMPT)
    expect(req.config?.abortSignal).toBe(base.signal)
    expect(req.contents).toContain('A talk about tea')
  })

  it('skips thought summaries and spots a cut-off reply', async () => {
    const seen: string[] = []
    const res = await readGeminiStream(
      items([geminiChunk([{ text: 'planning…', thought: true }, { text: '<slide>A' }]), geminiChunk([{ text: '</slide>' }], FinishReason.MAX_TOKENS)]),
      (d) => seen.push(d)
    )
    expect(res).toEqual({ text: '<slide>A</slide>', truncated: true })
    expect(seen).toEqual(['<slide>A', '</slide>'])
  })

  it('reports a safety stop or a blocked prompt as a decline', async () => {
    await expect(readGeminiStream(items([geminiChunk([], FinishReason.SAFETY)]), () => {})).rejects.toThrow('declined')
    const blocked = { promptFeedback: { blockReason: 'SAFETY' } } as unknown as GenerateContentResponse
    await expect(readGeminiStream(items([blocked]), () => {})).rejects.toThrow('declined')
  })
})

describe('toAiError', () => {
  const headers = new Headers()

  it('names the provider in key and model errors from each SDK', () => {
    expect(toAiError(new OpenAI.AuthenticationError(401, {}, 'bad key', headers), 'xai').message).toBe(
      'Your xAI Grok API key was rejected. Check it in Settings.'
    )
    expect(toAiError(new Anthropic.NotFoundError(404, {}, 'nope', headers), 'anthropic').message).toBe(
      'Anthropic Claude does not know that model. Pick another one in Settings.'
    )
    expect(toAiError(new ApiError({ message: 'slow down', status: 429 }), 'gemini').message).toBe(
      'Rate limited by Google Gemini. Wait a moment and try again.'
    )
  })

  it('points at the server address when a custom server is unreachable', () => {
    const e = toAiError(new OpenAI.APIConnectionError({ message: 'ECONNREFUSED' }), 'custom')
    expect(e.message).toBe('Could not reach OpenAI-compatible. Check your internet connection and the server address.')
  })

  it('keeps errors that are already for the user', () => {
    const e = new AiError('Already clear.')
    expect(toAiError(e, 'openai')).toBe(e)
  })
})

describe('streamSlides', () => {
  it('reports a stop the same way for every provider', async () => {
    const controller = new AbortController()
    controller.abort()
    // An unreachable local address: the request fails, but the signal says the user stopped it.
    const req = {
      ...base,
      signal: controller.signal,
      provider: 'custom' as const,
      model: 'm',
      apiKey: '',
      baseURL: 'http://127.0.0.1:9/v1',
      effort: 'low' as const,
      onText: () => {}
    }
    await expect(streamSlides(req)).rejects.toBeInstanceOf(AiStoppedError)
  })
})
