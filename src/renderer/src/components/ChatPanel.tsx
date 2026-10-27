import { useEffect, useRef, useState } from 'react'
import type { AskAnswer, AskQuestion, ChatMessage, Deck } from '@shared/types'
import type { ModelOption } from '@shared/providers'
import { isVideo } from '@shared/video'
import { Dropdown } from './Dropdown'
import { PromptBox } from './PromptBox'
import { AskCard } from './AskCard'
import { IconPanelRight, IconSparkle, IconTrash } from './icons'

export interface LiveGeneration {
  status: string
  message: string
  slidesDone: number
  scope: 'deck' | 'slide'
  error?: string
  /** Questions from the AI about the look, waiting for an answer. */
  ask?: AskQuestion[]
}

interface Props {
  /** The deck being edited; its theme styles the pictures in the AI's questions. */
  deck: Deck
  chat: ChatMessage[]
  live: LiveGeneration | null
  busy: boolean
  selectedIndex: number
  slideCount: number
  models: ModelOption[]
  model: string
  hasKey: boolean
  onModelChange: (key: string) => void
  onSend: (prompt: string, scope: 'deck' | 'slide') => void
  onStop: () => void
  onAnswer: (answers: AskAnswer[] | null) => void
  onOpenSettings: () => void
  onClearChat: () => void
  onHide: () => void
}

const QUICK_ACTIONS: { label: string; prompt: string; scope: 'deck' | 'slide' }[] = [
  { label: 'Add a chart', prompt: 'Add an SVG chart that supports the main point of this slide.', scope: 'slide' },
  { label: 'Make it visual', prompt: 'Make this slide more visual: fewer words, add icons or a diagram.', scope: 'slide' },
  { label: 'Shorten text', prompt: 'Shorten the text on every slide and move details into speaker notes.', scope: 'deck' },
  { label: 'Add speaker notes', prompt: 'Write speaker notes for every slide.', scope: 'deck' },
  { label: 'Add animations', prompt: 'Add tasteful entrance animations using the fade-up class.', scope: 'deck' }
]

const VIDEO_ACTIONS: { label: string; prompt: string; scope: 'deck' | 'slide' }[] = [
  { label: 'More energy', prompt: 'Make this scene punchier: bigger type, stronger motion, an animated background.', scope: 'slide' },
  { label: 'Faster pace', prompt: 'Make the whole video faster paced: shorter scene durations and quicker entrances.', scope: 'deck' },
  { label: 'Stronger ending', prompt: 'Make the closing scene a strong call to action with the brand name.', scope: 'deck' },
  { label: 'Fit the size', prompt: 'Adapt every scene to the current canvas size so nothing is cut off or crowded.', scope: 'deck' },
  { label: 'Translate to Arabic', prompt: 'Translate the whole video to Arabic and make every scene right-to-left.', scope: 'deck' }
]

export function ChatPanel(props: Props) {
  const { chat, live, busy, selectedIndex, slideCount, model, hasKey } = props
  const video = isVideo(props.deck)
  const actions = video ? VIDEO_ACTIONS : QUICK_ACTIONS
  const [text, setText] = useState('')
  const [scope, setScope] = useState<'deck' | 'slide'>('deck')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [chat.length, live?.message, live?.status, live?.ask])

  const send = (prompt: string, s: 'deck' | 'slide'): void => {
    if (!prompt.trim() || busy) return
    props.onSend(prompt.trim(), slideCount === 0 ? 'deck' : s)
    setText('')
  }

  return (
    <aside className="chat">
      <div className="chat-header">
        <IconSparkle size={15} /> AI Assistant
        <div className="spacer" />
        <button
          className="icon-btn small"
          title={busy ? 'Wait for the AI to finish' : 'Clear chat history'}
          disabled={busy || chat.length === 0}
          onClick={props.onClearChat}
        >
          <IconTrash size={14} />
        </button>
        <button className="icon-btn small" title="Hide chat" onClick={props.onHide}>
          <IconPanelRight size={15} />
        </button>
      </div>
      <div className="chat-list" ref={listRef}>
        {chat.length === 0 && !live && (
          <div className="chat-empty">
            {video
              ? 'Ask for changes in plain words: “add a scene with our price”, “make scene 2 longer”, “use a darker, more luxurious look”.'
              : 'Ask for changes in plain words: “add a slide about pricing”, “make slide 3 a timeline”, “translate the deck to Arabic”.'}
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
            {live.ask && <AskCard questions={live.ask} deck={props.deck} onAnswer={props.onAnswer} />}
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
          {actions.map((a) => (
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
              Set up an AI provider
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
          placeholder={
            scope === 'slide'
              ? `Change ${video ? 'scene' : 'slide'} ${selectedIndex + 1}…`
              : `Ask for changes to the ${video ? 'video' : 'deck'}…`
          }
          left={
            <Dropdown
              up
              value={model}
              options={props.models.map((m) => ({ ...m, label: m.label.replace('Claude ', '') }))}
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
                  { value: 'deck', label: video ? 'Whole video' : 'Whole deck' },
                  { value: 'slide', label: `${video ? 'Scene' : 'Slide'} ${selectedIndex + 1}` }
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
