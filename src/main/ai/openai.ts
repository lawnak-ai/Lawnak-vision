import OpenAI from 'openai'
import { AiError, buildUserMessage, systemPrompt, type AiRequest, type AiResult } from './prompt'
import { designSupport, parseArgs, runConversation, type Conversation, type ToolCall, type ToolOutput, type Turn } from './agent'

type ChatParams = OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming
type Chunk = OpenAI.Chat.Completions.ChatCompletionChunk
type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam
type Part = OpenAI.Chat.Completions.ChatCompletionContentPart

/**
 * The output limit to ask for. Most vendors default to the model's maximum, but
 * DeepSeek Chat defaults to 4K tokens, which cuts a deck off after a few slides.
 */
function maxTokensFor(req: Pick<AiRequest, 'provider' | 'model' | 'maxTokens'>): number | undefined {
  if (req.maxTokens) return req.maxTokens
  if (req.provider === 'deepseek' && req.model === 'deepseek-chat') return 8192
  return undefined
}

/** Chat Completions request for OpenAI, DeepSeek, xAI, fastgguf and other OpenAI-compatible servers. */
export function buildOpenAiRequest(
  req: Omit<AiRequest, 'signal' | 'onText' | 'apiKey' | 'effort'>,
  messages?: Message[],
  useTools = true
): ChatParams {
  const maxTokens = maxTokensFor(req)
  const tools = (req.tools?.specs ?? []).map((t) => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.parameters }
  }))
  return {
    model: req.model,
    stream: true,
    messages: messages ?? [
      { role: 'system', content: systemPrompt(req) },
      { role: 'user', content: buildUserMessage(req) }
    ],
    ...(tools.length ? { tools, tool_choice: useTools ? ('auto' as const) : ('none' as const) } : {}),
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
    // fastgguf picks the likeliest word every time unless told otherwise, which makes small models repeat themselves.
    ...(req.provider === 'local' ? { temperature: 0.7 } : {})
  }
}

/** Collects one streamed reply: its text, any tool calls (sent in pieces), and why it ended. */
export async function readOpenAiTurn(
  stream: AsyncIterable<Chunk>,
  onText: (delta: string) => void
): Promise<Turn & { reasoning: string }> {
  let text = ''
  // DeepSeek's reasoning model streams its thinking separately; it must be sent back between tool calls.
  let reasoning = ''
  let finish: string | null = null
  const calls: { id: string; name: string; args: string }[] = []
  for await (const chunk of stream) {
    // fastgguf also sends a stats chunk with no choices.
    const choice = chunk.choices?.[0]
    const delta = choice?.delta?.content
    if (delta) {
      text += delta
      onText(delta)
    }
    const think = (choice?.delta as { reasoning_content?: unknown } | undefined)?.reasoning_content
    if (typeof think === 'string') reasoning += think
    for (const tc of choice?.delta?.tool_calls ?? []) {
      const call = (calls[tc.index] ??= { id: '', name: '', args: '' })
      if (tc.id) call.id = tc.id
      if (tc.function?.name) call.name += tc.function.name
      if (tc.function?.arguments) call.args += tc.function.arguments
    }
    if (choice?.finish_reason) finish = choice.finish_reason
  }
  if (finish === 'content_filter') throw new AiError('The model declined this request. Try rephrasing it.')
  return {
    text,
    reasoning,
    calls: calls
      .filter((c) => c && c.name)
      .map((c, i): ToolCall => ({ id: c.id || `call_${i}`, name: c.name, input: parseArgs(c.args) })),
    truncated: finish === 'length'
  }
}

/** Collects the streamed text and reports why the reply ended. */
export async function readOpenAiStream(stream: AsyncIterable<Chunk>, onText: (delta: string) => void): Promise<AiResult> {
  const turn = await readOpenAiTurn(stream, onText)
  return { text: turn.text, truncated: turn.truncated }
}

function client(apiKey: string, baseURL?: string): OpenAI {
  // Local servers such as Ollama need no key, but the SDK requires a value.
  return new OpenAI({ apiKey: apiKey || 'no-key', baseURL })
}

/** Text and pictures as a user message; pictures only for models that can see them. */
function userParts(out: ToolOutput, vision: boolean): Part[] {
  const parts: Part[] = [{ type: 'text', text: out.text }]
  if (!vision) return parts
  for (const img of out.images ?? []) {
    if (img.label) parts.push({ type: 'text', text: img.label })
    parts.push({ type: 'image_url', image_url: { url: `data:${img.mime};base64,${img.data}` } })
  }
  return parts
}

function openAiConversation(req: AiRequest): Conversation {
  const api = client(req.apiKey, req.baseURL)
  const vision = designSupport(req.provider).vision
  const messages: Message[] = [
    { role: 'system', content: systemPrompt(req) },
    { role: 'user', content: buildUserMessage(req) }
  ]
  return {
    async turn(useTools) {
      const stream = await api.chat.completions.create(buildOpenAiRequest(req, messages, useTools), { signal: req.signal })
      const turn = await readOpenAiTurn(stream, req.onText)
      messages.push({
        role: 'assistant',
        content: turn.text || null,
        ...(turn.reasoning && turn.calls.length ? { reasoning_content: turn.reasoning } : {}),
        ...(turn.calls.length
          ? {
              tool_calls: turn.calls.map((c) => ({
                id: c.id,
                type: 'function' as const,
                function: { name: c.name, arguments: JSON.stringify(c.input) }
              }))
            }
          : {})
      })
      return turn
    },
    addToolResults(calls, outputs) {
      calls.forEach((c, i) => messages.push({ role: 'tool', tool_call_id: c.id, content: outputs[i].text || '(no text)' }))
      // Tool messages carry text only, so pictures follow in one user message.
      const images = outputs.flatMap((o) => o.images ?? [])
      if (vision && images.length) messages.push({ role: 'user', content: userParts({ text: 'Pictures from the tools above:', images }, true) })
    },
    addUser(message) {
      messages.push({ role: 'user', content: userParts(message, vision) })
    }
  }
}

export async function streamOpenAiCompatible(req: AiRequest): Promise<AiResult> {
  return runConversation(openAiConversation(req), req)
}

// The OpenAI list includes embedding, audio and image models that can't write slides.
const NOT_CHAT = /embed|tts|whisper|dall-e|image|audio|realtime|moderation|transcribe|search|sora|computer-use/i

export async function listOpenAiModels(apiKey: string, baseURL?: string): Promise<string[]> {
  const ids: string[] = []
  for await (const m of client(apiKey, baseURL).models.list()) {
    if (!NOT_CHAT.test(m.id)) ids.push(m.id)
  }
  return ids
}
