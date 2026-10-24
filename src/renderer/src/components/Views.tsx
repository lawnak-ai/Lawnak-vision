import { useMemo, useState } from 'react'
import type { Deck, DeckSummary } from '@shared/types'
import { TEMPLATES } from '@shared/templates'
import { SlideFrame } from './SlideFrame'
import { relativeTime } from '../util'
import { IconSearch } from './icons'

export function TemplatesView({ onUse }: { onUse: (templateId: string) => void }) {
  // Build throwaway decks so the first slide of each template can be previewed.
  const previews = useMemo(
    () =>
      TEMPLATES.map(
        (t): Deck => ({
          id: t.id,
          title: t.name,
          project: '',
          themeId: t.themeId,
          css: '',
          slides: t.slides.map((s, i) => ({ ...s, id: `${t.id}-${i}` })),
          chat: [],
          createdAt: 0,
          updatedAt: 0
        })
      ),
    []
  )

  return (
    <div className="page">
      <h1 className="page-title">Templates</h1>
      <p className="muted">Start from a ready-made deck, then edit it by hand or with the AI assistant.</p>
      <div className="template-grid">
        {TEMPLATES.map((t, i) => (
          <button key={t.id} className="template-card" onClick={() => onUse(t.id)}>
            <SlideFrame deck={previews[i]} index={0} width={300} />
            <div className="template-meta">
              <strong>{t.name}</strong>
              <span className="muted small">
                {t.slides.length} slide{t.slides.length === 1 ? '' : 's'} · {t.description}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export function HistoryView({ decks, onOpen }: { decks: DeckSummary[]; onOpen: (id: string) => void }) {
  const [q, setQ] = useState('')
  const shown = decks.filter((d) => d.title.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <div className="page">
      <h1 className="page-title">Presentation History</h1>
      <div className="search-field">
        <IconSearch size={15} />
        <input autoFocus placeholder="Search by title…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {shown.length === 0 ? (
        <p className="muted">{decks.length ? 'No matches.' : 'No presentations yet. Create one from New Presentation.'}</p>
      ) : (
        <div className="history-list">
          {shown.map((d) => (
            <button key={d.id} className="history-row" onClick={() => onOpen(d.id)}>
              <span className="deck-title" dir="auto">
                {d.title}
              </span>
              <span className="muted small">{d.project}</span>
              <span className="muted small">{d.slideCount} slides</span>
              <span className="muted small">{relativeTime(d.updatedAt)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
