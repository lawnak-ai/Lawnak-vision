import { useEffect, useRef, useState } from 'react'
import { MODELS, type ChatMessage, type ModelId } from '@shared/types'
import { Dropdown } from './Dropdown'
import { PromptBox } from './PromptBox'
import { IconSparkle } from './icons'

export interface LiveGeneration {
  status: string
  message: string
  slidesDone: number
  scope: 'deck' | 'slide'
  error?: string
}

interface Props {
  chat: ChatMessage[]
  live: LiveGeneration | null
  busy: boolean
  selectedIndex: number
  slideCount: number
  model: ModelId
  hasKey: boolean
  onModelChange: (m: ModelId) => void
  onSend: (prompt: string, scope: 'deck' | 'slide') => void
  onStop: () => void
  onOpenSettings: () => void
}

const QUICK_ACTIONS: { label: string; prompt: string; scope: 'deck' | 'slide' }[] = [
  { label: 'Add a chart', prompt: 'Add an SVG chart that supports the main point of this slide.', scope: 'slide' },
  { label: 'Make it visual', prompt: 'Make this slide more visual: fewer words, add icons or a diagram.', scope: 'slide' },
  { label: 'Shorten text', prompt: 'Shorten the text on every slide and move details into speaker notes.', scope: 'deck' },
  { label: 'Add speaker notes', prompt: 'Write speaker notes for every slide.', scope: 'deck' },
  { label: 'Add animations', prompt: 'Add tasteful entrance animations using the fade-up class.', scope: 'deck' }
]

export function ChatPanel(props: Props) {
  const { chat, live, busy, selectedIndex, slideCount, model, hasKey } = props
  const [text, setText] = useState('')
  const [scope, setScope] = useState<'deck' | 'slide'>('deck')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [chat.length, live?.message, live?.status])

  const send = (prompt: string, s: 'deck' | 'slide'): void => {
    if (!prompt.trim() || busy) return
    props.onSend(prompt.trim(), slideCount === 0 ? 'deck' : s)
    setText('')
  }

  return (
    <aside className="chat">
      <div className="chat-header">
        <IconSparkle size={15} /> AI Assistant
      </div>
      <div className="chat-list" ref={listRef}>
        {chat.length === 0 && !live && (
          <div className="chat-empty">
            Ask for changes in plain words: “add a slide about pricing”, “make slide 3 a timeline”, “translate the deck to Arabic”.
          </div>
        )}
        {chat.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`} dir="auto">
            {m.text}
          </div>
        ))}
        {live && (
          <div className="bubble assistant live" dir="auto">
            {live.message && <div>{live.message}</div>}
            {live.error ? (
              <div className="error-text">{live.error}</div>
            ) : (
              <div className="live-status">
                <span className="spinner" /> {live.status}
                {live.slidesDone > 0 && <span className="muted"> · {live.slidesDone} ready</span>}
              </div>
            )}
          </div>
        )}
      </div>

      {slideCount > 0 && !busy && (
        <div className="quick-actions">
          {QUICK_ACTIONS.map((a) => (
            <button key={a.label} className="suggestion small" disabled={!hasKey} onClick={() => send(a.prompt, a.scope)}>
              {a.label}
            </button>
          ))}
        </div>
      )}

      <div className="chat-input">
        {!hasKey && (
          <p className="home-note small">
            <button className="link" onClick={props.onOpenSettings}>
              Add an API key
            </button>{' '}
            to use the assistant.
          </p>
        )}
        <PromptBox
          value={text}
          onChange={setText}
          onSubmit={() => send(text, scope)}
          onStop={props.onStop}
          busy={busy}
          disabled={!hasKey}
          placeholder={scope === 'slide' ? `Change slide ${selectedIndex + 1}…` : 'Ask for changes to the deck…'}
          left={
            <Dropdown
              up
              value={model}
              options={MODELS.map((m) => ({ value: m.id, label: m.label.replace('Claude ', '') }))}
              onChange={props.onModelChange}
              title="Model"
            />
          }
          right={
            slideCount > 0 ? (
              <Dropdown
                up
                align="right"
                value={scope}
                options={[
                  { value: 'deck', label: 'Whole deck' },
                  { value: 'slide', label: `Slide ${selectedIndex + 1}` }
                ]}
                onChange={setScope}
                title="What the AI may change"
              />
            ) : undefined
          }
        />
      </div>
    </aside>
  )
}
