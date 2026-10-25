import { useEffect, useRef, type ReactNode } from 'react'
import { IconArrowRight, IconStop } from './icons'

interface Props {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onStop?: () => void
  busy?: boolean
  placeholder: string
  left?: ReactNode
  right?: ReactNode
  footer?: ReactNode
  autoFocus?: boolean
  disabled?: boolean
}

/** Text box with a toolbar row, like a chat composer. Enter sends, Shift+Enter adds a line. */
export function PromptBox({ value, onChange, onSubmit, onStop, busy, placeholder, left, right, footer, autoFocus, disabled }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 240) + 'px'
  }, [value])

  const canSend = value.trim().length > 0 && !busy && !disabled

  return (
    <div className={`prompt-box ${disabled ? 'disabled' : ''}`}>
      <div className="prompt-main">
        <textarea
          ref={ref}
          dir="auto"
          rows={1}
          value={value}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              if (canSend) onSubmit()
            }
          }}
        />
        <div className="prompt-toolbar">
          <div className="prompt-left">{left}</div>
          <div className="prompt-right">
            {right}
            {busy ? (
              <button type="button" className="send-btn stop" onClick={onStop} title="Stop">
                <IconStop size={14} />
              </button>
            ) : (
              <button type="button" className="send-btn" disabled={!canSend} onClick={onSubmit} title="Send (Enter)">
                <IconArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
      {footer && <div className="prompt-footer">{footer}</div>}
    </div>
  )
}
