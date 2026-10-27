export { designSupport } from '@shared/providers'
import type { AiRequest, AiResult } from './prompt'

/**
 * The tool loop shared by every provider: the model may call the design tools
 * (browse the component gallery, preview a slide) before it writes its reply,
 * and the app may answer the finished reply once with pictures of the slides.
 */

export interface ToolImage {
  mime: 'image/jpeg' | 'image/png'
  /** Base64. */
  data: string
  /** Shown as text just before the picture, e.g. "Slide 3". */
  label?: string
}

/** What a tool returns, and what the app sends back after a reply. */
export interface ToolOutput {
  text: string
  images?: ToolImage[]
}

export interface ToolSpec {
  name: string
  description: string
  /** JSON Schema of an object. */
  parameters: Record<string, unknown>
}

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface DesignTools {
  specs: ToolSpec[]
  run(call: ToolCall): Promise<ToolOutput>
}

/** One model reply: its text, the tools it asked for, and whether it hit the token limit. */
export interface Turn {
  text: string
  calls: ToolCall[]
  truncated: boolean
}

/** A provider's side of the conversation, holding the messages in that provider's own format. */
export interface Conversation {
  /** Streams one reply. With `tools` false the model is told to answer without calling tools. */
  turn(tools: boolean): Promise<Turn>
  addToolResults(calls: ToolCall[], outputs: ToolOutput[]): void
  addUser(message: ToolOutput): void
}

/** Enough to browse the gallery and preview a few slides, without letting a model loop forever. */
export const MAX_TOOL_ROUNDS = 6

export async function runConversation(conv: Conversation, req: AiRequest): Promise<AiResult> {
  let rounds = 0
  let followed = false
  for (;;) {
    const useTools = Boolean(req.tools) && rounds < MAX_TOOL_ROUNDS
    req.onTurn?.()
    const turn = await conv.turn(useTools)
    if (turn.truncated) return { text: turn.text, truncated: true }

    if (useTools && req.tools && turn.calls.length) {
      rounds++
      const outputs: ToolOutput[] = []
      for (const call of turn.calls) {
        req.signal.throwIfAborted()
        try {
          outputs.push(await req.tools.run(call))
        } catch (e) {
          // Stopped while a tool waited (for example for the user's answer).
          if (req.signal.aborted) throw e
          outputs.push({ text: `The tool failed: ${e instanceof Error ? e.message : String(e)}` })
        }
      }
      conv.addToolResults(turn.calls, outputs)
      continue
    }

    if (!followed && req.followUp) {
      followed = true
      const message = await req.followUp()
      if (message) {
        conv.addUser(message)
        continue
      }
    }
    return { text: turn.text, truncated: false }
  }
}

/** Reads a tool call's JSON arguments; a model may send nothing or broken JSON. */
export function parseArgs(json: string | undefined): Record<string, unknown> {
  if (!json) return {}
  try {
    const v = JSON.parse(json) as unknown
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}
