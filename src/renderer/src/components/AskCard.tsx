import { useMemo, useState } from 'react'
import type { AskAnswer, AskOption, AskQuestion, Deck } from '@shared/types'
import { catalogSlide, findCatalogItem } from '@shared/catalog'
import { SlideFrame } from './SlideFrame'

interface Props {
  questions: AskQuestion[]
  /** The deck being designed: its theme and CSS style the pictures. */
  deck: Deck
  onAnswer: (answers: AskAnswer[] | null) => void
}

/** Shown for a theme option that names no gallery item, so the user sees the theme on a real slide. */
const THEME_SAMPLE = 'hero-split'

/** A one-slide deck that shows an option: its gallery item, in its theme (or the theme picked so far). */
function previewDeck(base: Deck, option: AskOption, themeId: string): Deck | null {
  const item = findCatalogItem(option.preview ?? (option.theme ? THEME_SAMPLE : ''))
  if (!item) return null
  return {
    ...base,
    themeId: option.theme ?? themeId,
    css: base.css + (item.css ? '\n' + item.css : ''),
    slides: [{ id: `ask-${item.id}`, ...catalogSlide(item) }]
  }
}

/** The AI's questions about how the deck should look, with a picture for each choice. */
export function AskCard({ questions, deck, onAnswer }: Props) {
  const [picked, setPicked] = useState<Record<string, number>>({})
  const [own, setOwn] = useState<Record<string, string>>({})

  // Pictures follow the theme the user has chosen so far.
  const themeId = useMemo(() => {
    for (const q of questions) {
      const t = q.options[picked[q.id]]?.theme
      if (t) return t
    }
    return deck.themeId
  }, [questions, picked, deck.themeId])

  // Built once per look, so typing in the boxes does not reload the pictures.
  const looks = useMemo(
    () => questions.map((q) => q.options.map((o) => previewDeck(deck, o, themeId))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questions, themeId, deck.themeId, deck.css]
  )

  const done = questions.every((q) => picked[q.id] !== undefined || own[q.id]?.trim())

  const submit = (): void =>
    onAnswer(
      questions.map((q) => ({
        questionId: q.id,
        ...(picked[q.id] !== undefined ? { option: picked[q.id] } : {}),
        ...(own[q.id]?.trim() ? { text: own[q.id].trim() } : {})
      }))
    )

  return (
    <div className="ask-card" dir="auto">
      {questions.map((q, qi) => (
        <div key={q.id} className="ask-q">
          <div className="ask-title">{q.question}</div>
          <div className="ask-options" role="radiogroup" aria-label={q.question}>
            {q.options.map((o, i) => {
              const look = looks[qi][i]
              const on = picked[q.id] === i
              return (
                <button
                  key={i}
                  role="radio"
                  aria-checked={on}
                  className={`ask-opt ${on ? 'on' : ''}`}
                  onClick={() => setPicked((p) => ({ ...p, [q.id]: i }))}
                >
                  {look && (
                    <span className="ask-pic">
                      <SlideFrame deck={look} index={0} />
                    </span>
                  )}
                  <span className="ask-label">{o.label}</span>
                  {o.detail && <span className="ask-detail">{o.detail}</span>}
                </button>
              )
            })}
          </div>
          <input
            className="ask-own"
            dir="auto"
            placeholder="Or describe it in your words…"
            value={own[q.id] ?? ''}
            onChange={(e) => setOwn((p) => ({ ...p, [q.id]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && done) submit()
            }}
          />
        </div>
      ))}
      <div className="ask-actions">
        <button className="btn accent" disabled={!done} onClick={submit}>
          Continue
        </button>
        <button className="btn" onClick={() => onAnswer(null)}>
          Let the AI decide
        </button>
      </div>
    </div>
  )
}
