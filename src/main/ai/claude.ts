import Anthropic from '@anthropic-ai/sdk'
import { AiError, buildUserMessage, systemPrompt, type AiRequest, type AiResult } from './prompt'
import { runConversation, type Conversation, type ToolCall, type ToolOutput } from './agent'

type MessageParam = Anthropic.Beta.BetaMessageParam
type ContentParam = Anthropic.Beta.BetaContentBlockParam

/** Text and pictures as Claude content blocks; each picture follows its label. */
function contentOf(out: ToolOutput): Array<Anthropic.Beta.BetaTextBlockParam | Anthropic.Beta.BetaImageBlockParam> {
  const blocks: Array<Anthropic.Beta.BetaTextBlockParam | Anthropic.Beta.BetaImageBlockParam> = [{ type: 'text', text: out.text || '(no text)' }]
  for (const img of out.images ?? []) {
    if (img.label) blocks.push({ type: 'text', text: img.label })
    blocks.push({ type: 'image', source: { type: 'base64', media_type: img.mime, data: img.data } })
  }
  return blocks
}

function claudeConversation(req: AiRequest): Conversation {
  const client = new Anthropic({ apiKey: req.apiKey })
  const messages: MessageParam[] = [{ role: 'user', content: buildUserMessage(req) }]
  const system = systemPrompt(req)
  const tools = (req.tools?.specs ?? []).map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as Anthropic.Beta.BetaTool.InputSchema
  }))

  // Server-side fallback reroutes a refused request to another model in the
  // same call. Haiku has no server-side fallback, so it is sent without one.
  const fallback = req.model.startsWith('claude-haiku')
    ? {}
    : { betas: ['server-side-fallback-2026-07-01' as const], fallbacks: 'default' as const }

  return {
    async turn(useTools) {
      const stream = client.beta.messages.stream(
        {
          model: req.model,
          max_tokens: 64000,
          output_config: { effort: req.effort },
          cache_control: { type: 'ephemeral' },
          system,
          messages,
          // Once tools have been used they must stay defined; tool_choice "none" stops further calls.
          ...(tools.length ? { tools, tool_choice: useTools ? { type: 'auto' as const } : { type: 'none' as const } } : {}),
          ...fallback
        },
        { signal: req.signal }
      )
      stream.on('text', (delta) => req.onText(delta))
      const message = await stream.finalMessage()

      if (message.stop_reason === 'refusal') {
        throw new AiError('The model declined this request. Try rephrasing it.')
      }
      messages.push({ role: 'assistant', content: message.content as unknown as ContentParam[] })
      const text = message.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
      const calls: ToolCall[] = message.content
        .filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use')
        .map((b) => ({ id: b.id, name: b.name, input: (b.input ?? {}) as Record<string, unknown> }))
      return { text, calls, truncated: message.stop_reason === 'max_tokens' }
    },
    addToolResults(calls, outputs) {
      messages.push({
        role: 'user',
        content: calls.map((c, i) => ({ type: 'tool_result' as const, tool_use_id: c.id, content: contentOf(outputs[i]) }))
      })
    },
    addUser(message) {
      messages.push({ role: 'user', content: contentOf(message) })
    }
  }
}

/** Streams a reply from Claude, running the design tools when the request has them. */
export async function streamClaude(req: AiRequest): Promise<AiResult> {
  return runConversation(claudeConversation(req), req)
}

export async function listClaudeModels(apiKey: string): Promise<string[]> {
  const client = new Anthropic({ apiKey })
  const ids: string[] = []
  for await (const m of client.models.list()) ids.push(m.id)
  return ids
}
