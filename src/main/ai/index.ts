import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { ApiError as GeminiApiError } from '@google/genai'
import { getProvider, type ProviderId } from '@shared/providers'
import { AiError, AiStoppedError, type AiRequest, type AiResult } from './prompt'
import { listClaudeModels, streamClaude } from './claude'
import { listOpenAiModels, streamOpenAiCompatible } from './openai'
import { listGeminiModels, streamGemini } from './gemini'

export { AiError, AiStoppedError, type AiRequest, type AiResult } from './prompt'

/** Turns an SDK error from any provider into a message for the user. */
export function toAiError(e: unknown, provider: ProviderId): AiError {
  if (e instanceof AiError) return e
  const name = getProvider(provider).name
  if (e instanceof Anthropic.APIConnectionError || e instanceof OpenAI.APIConnectionError) {
    if (provider === 'local') return new AiError('Lost the connection to fastgguf. It may have stopped; try again.')
    return new AiError(`Could not reach ${name}. Check your internet connection${provider === 'custom' ? ' and the server address' : ''}.`)
  }
  const status =
    e instanceof Anthropic.APIError || e instanceof OpenAI.APIError || e instanceof GeminiApiError ? e.status : undefined
  const detail = e instanceof Error ? e.message : String(e)
  switch (status) {
    case 401:
      return new AiError(`Your ${name} API key was rejected. Check it in Settings.`)
    case 403:
      return new AiError(`This ${name} API key does not have access to that model.`)
    case 404:
      return new AiError(`${name} does not know that model. Pick another one in Settings.`)
    case 429:
      return new AiError(`Rate limited by ${name}. Wait a moment and try again.`)
    case 400:
      return new AiError(`${name} rejected the request: ${detail}`)
    case undefined:
      return new AiError(detail)
    default:
      return new AiError(`${name} API error (${status}): ${detail}`)
  }
}

/** Streams the model's reply from the chosen provider. */
export async function streamSlides(req: AiRequest): Promise<AiResult> {
  try {
    if (req.provider === 'anthropic') return await streamClaude(req)
    if (req.provider === 'gemini') return await streamGemini(req)
    const result = await streamOpenAiCompatible(req)
    // fastgguf ends the stream without a word when the request does not fit in the context.
    if (req.provider === 'local' && !result.text.trim() && !req.signal.aborted) {
      throw new AiError('The local model wrote nothing. The request may be too long for its context size; pick a larger one in Settings.')
    }
    return result
  } catch (e) {
    // Each SDK reports an abort differently; the signal is the one reliable sign.
    if (req.signal.aborted && !(e instanceof AiError)) throw new AiStoppedError('Stopped.')
    throw toAiError(e, req.provider)
  }
}

/** The provider's live model list, newest names first where the API sorts them. */
export async function listModels(provider: ProviderId, apiKey: string, baseURL?: string): Promise<string[]> {
  try {
    const ids =
      provider === 'anthropic'
        ? await listClaudeModels(apiKey)
        : provider === 'gemini'
          ? await listGeminiModels(apiKey)
          : await listOpenAiModels(apiKey, baseURL)
    return Array.from(new Set(ids)).sort().slice(0, 300)
  } catch (e) {
    throw toAiError(e, provider)
  }
}
