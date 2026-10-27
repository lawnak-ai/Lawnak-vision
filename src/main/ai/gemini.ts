import {
  FinishReason,
  FunctionCallingConfigMode,
  GoogleGenAI,
  type Content,
  type GenerateContentParameters,
  type GenerateContentResponse,
  type Part
} from '@google/genai'
import { AiError, buildUserMessage, systemPrompt, type AiRequest, type AiResult } from './prompt'
import { runConversation, type Conversation, type ToolCall, type ToolOutput, type Turn } from './agent'

export function buildGeminiRequest(
  req: Omit<AiRequest, 'onText' | 'apiKey' | 'effort' | 'provider'>,
  contents?: Content[],
  useTools = true
): GenerateContentParameters {
  const declarations = (req.tools?.specs ?? []).map((t) => ({
    name: t.name,
    description: t.description,
    parametersJsonSchema: t.parameters
  }))
  return {
    model: req.model,
    contents: contents ?? buildUserMessage(req),
    config: {
      systemInstruction: systemPrompt(req),
      abortSignal: req.signal,
      ...(declarations.length
        ? {
            tools: [{ functionDeclarations: declarations }],
            toolConfig: { functionCallingConfig: { mode: useTools ? FunctionCallingConfigMode.AUTO : FunctionCallingConfigMode.NONE } }
          }
        : {})
    }
  }
}

const DECLINED = new Set<string>([
  FinishReason.SAFETY,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.BLOCKLIST,
  FinishReason.SPII,
  FinishReason.RECITATION
])

/**
 * Collects one streamed reply (skipping thought summaries), its function calls, and every
 * part as sent, because Gemini needs its own parts back (with their thought signatures).
 */
export async function readGeminiTurn(
  stream: AsyncIterable<GenerateContentResponse>,
  onText: (delta: string) => void
): Promise<Turn & { parts: Part[] }> {
  let text = ''
  let finish: string | undefined
  const parts: Part[] = []
  const calls: ToolCall[] = []
  for await (const chunk of stream) {
    if (chunk.promptFeedback?.blockReason) throw new AiError('Gemini declined this request. Try rephrasing it.')
    const candidate = chunk.candidates?.[0]
    for (const part of candidate?.content?.parts ?? []) {
      parts.push(part)
      if (part.functionCall?.name) {
        calls.push({ id: part.functionCall.id ?? `call_${calls.length}`, name: part.functionCall.name, input: part.functionCall.args ?? {} })
      }
      if (!part.text || part.thought) continue
      text += part.text
      onText(part.text)
    }
    if (candidate?.finishReason) finish = candidate.finishReason
  }
  if (finish && DECLINED.has(finish)) throw new AiError('Gemini declined this request. Try rephrasing it.')
  return { text, calls, parts, truncated: finish === FinishReason.MAX_TOKENS }
}

/** Collects the streamed text (skipping thought summaries) and reports why the reply ended. */
export async function readGeminiStream(
  stream: AsyncIterable<GenerateContentResponse>,
  onText: (delta: string) => void
): Promise<AiResult> {
  const turn = await readGeminiTurn(stream, onText)
  return { text: turn.text, truncated: turn.truncated }
}

function partsOf(out: ToolOutput): Part[] {
  const parts: Part[] = [{ text: out.text }]
  for (const img of out.images ?? []) {
    if (img.label) parts.push({ text: img.label })
    parts.push({ inlineData: { mimeType: img.mime, data: img.data } })
  }
  return parts
}

function geminiConversation(req: AiRequest): Conversation {
  const ai = new GoogleGenAI({ apiKey: req.apiKey })
  const contents: Content[] = [{ role: 'user', parts: [{ text: buildUserMessage(req) }] }]
  return {
    async turn(useTools) {
      const stream = await ai.models.generateContentStream(buildGeminiRequest(req, contents, useTools))
      const turn = await readGeminiTurn(stream, req.onText)
      contents.push({ role: 'model', parts: turn.parts.length ? turn.parts : [{ text: turn.text }] })
      return turn
    },
    addToolResults(calls, outputs) {
      contents.push({
        role: 'user',
        parts: calls.map((c, i) => ({
          functionResponse: {
            ...(c.id.startsWith('call_') ? {} : { id: c.id }),
            name: c.name,
            response: { output: outputs[i].text },
            // Pictures go back inside the function response.
            ...(outputs[i].images?.length
              ? { parts: outputs[i].images!.map((img) => ({ inlineData: { mimeType: img.mime, data: img.data } })) }
              : {})
          }
        }))
      })
    },
    addUser(message) {
      contents.push({ role: 'user', parts: partsOf(message) })
    }
  }
}

export async function streamGemini(req: AiRequest): Promise<AiResult> {
  return runConversation(geminiConversation(req), req)
}

export async function listGeminiModels(apiKey: string): Promise<string[]> {
  const ai = new GoogleGenAI({ apiKey })
  const ids: string[] = []
  for await (const m of await ai.models.list()) {
    if (m.name && m.supportedActions?.includes('generateContent')) ids.push(m.name.replace(/^models\//, ''))
  }
  return ids
}
