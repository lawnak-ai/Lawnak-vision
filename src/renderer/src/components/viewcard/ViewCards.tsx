import { useEffect, useRef, useState, type ReactNode } from 'react'
import { VIEW_CARDS, type ViewCardCategory, type ViewCardEntry } from './catalog'
import './viewcard.css'

const PICKS_KEY = 'lawnak.viewcard.picks'
const CATEGORIES: ('All' | ViewCardCategory)[] = ['All', '3D & Shaders', 'Galleries', 'Text & Cursor']

function readPicks(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(PICKS_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** Mounts its children only while on screen, so a dozen animations don't all run at once. */
function OnScreen({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { rootMargin: '120px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {seen && enabled ? children : null}
    </div>
  )
}

function Stage({ entry, big, n, run }: { entry: ViewCardEntry; big: boolean; n: number; run: number }) {
  return (
    <div className="vc-stage">
      <span className="vc-stage-num">{String(n).padStart(2, '0')}</span>
      {big ? (
        <div key={run} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {entry.render(true)}
        </div>
      ) : (
        <OnScreen key={run} enabled>
          {entry.render(false)}
        </OnScreen>
      )}
      <span className="vc-stage-hint">{entry.tryIt}</span>
    </div>
  )
}

/**
 * The View Cards page: a live preview of every motion component, so you can try
 * them and pick the ones you want to use in your decks.
 */
export function ViewCardsView() {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>('All')
  const [picks, setPicks] = useState<string[]>(readPicks)
  const [open, setOpen] = useState<string | null>(null)
  const [runs, setRuns] = useState<Record<string, number>>({})

  useEffect(() => {
    try {
      localStorage.setItem(PICKS_KEY, JSON.stringify(picks))
    } catch {
      /* storage unavailable: picks last for this session only */
    }
  }, [picks])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const toggle = (id: string): void => setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const restart = (id: string): void => setRuns((r) => ({ ...r, [id]: (r[id] ?? 0) + 1 }))
  const shown = VIEW_CARDS.filter((c) => cat === 'All' || c.category === cat)
  const openEntry = VIEW_CARDS.find((c) => c.id === open) ?? null
  const indexOf = (id: string): number => VIEW_CARDS.findIndex((c) => c.id === id) + 1

  const actions = (c: ViewCardEntry, inModal: boolean): ReactNode => {
    const picked = picks.includes(c.id)
    return (
      <div className="vc-actions">
        <button className={`vc-btn ${picked ? 'primary' : ''}`} onClick={() => toggle(c.id)} title="Mark this component as one you want to use">
          {picked ? '★ Picked' : '☆ Pick'}
        </button>
        {!inModal && (
          <button className="vc-btn" onClick={() => setOpen(c.id)}>
            ⤢ Full size
          </button>
        )}
        <button className="vc-btn ghost" onClick={() => restart(c.id)} title="Play the entrance again">
          ↻ Restart
        </button>
        {inModal && (
          <button className="vc-btn ghost" onClick={() => setOpen(null)} title="Close (Esc)">
            ✕
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="vc-page">
      <div className="vc-head">
        <div>
          <h1 className="page-title">Components</h1>
          <p className="muted">Try each motion component live. To use one, open a presentation and drag it from the Motion group of the Insert bar.</p>
        </div>
        <div className="vc-picked">
          {picks.length === 0 ? (
            <span>Nothing picked yet. Press ☆ Pick on the ones you like.</span>
          ) : (
            <>
              <b>Picked {picks.length}:</b>
              {VIEW_CARDS.filter((c) => picks.includes(c.id)).map((c) => (
                <span key={c.id} className="vc-tag">
                  {c.name}
                </span>
              ))}
              <button className="vc-btn ghost" onClick={() => setPicks([])}>
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      <div className="vc-chips">
        {CATEGORIES.map((c) => (
          <button key={c} className={`vc-chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>
            {c} <span className="muted small">{c === 'All' ? VIEW_CARDS.length : VIEW_CARDS.filter((v) => v.category === c).length}</span>
          </button>
        ))}
      </div>

      <div className="vc-grid">
        {shown.map((c) => (
          <article key={c.id} className={`vc-card ${picks.includes(c.id) ? 'picked' : ''}`}>
            {open === c.id ? <div className="vc-stage" /> : <Stage entry={c} big={false} n={indexOf(c.id)} run={runs[c.id] ?? 0} />}
            <div className="vc-body">
              <div className="vc-title-row">
                <strong>{c.name}</strong>
                <span className="vc-cat">{c.category}</span>
              </div>
              <p className="vc-desc">{c.description}</p>
              <p className="vc-good">
                <b>Good for:</b> {c.goodFor}
              </p>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {actions(c, false)}
                <span className="vc-source">Inspired by React Bits Pro</span>
              </div>
            </div>
          </article>
        ))}
      </div>

      {openEntry && (
        <div className="vc-modal" onMouseDown={(e) => e.target === e.currentTarget && setOpen(null)}>
          <div className="vc-modal-box" role="dialog" aria-label={openEntry.name}>
            <div className="vc-modal-head">
              <strong>{openEntry.name}</strong>
              <span className="vc-cat">{openEntry.category}</span>
              <span className="muted small">{openEntry.description}</span>
              {actions(openEntry, true)}
            </div>
            <Stage entry={openEntry} big n={indexOf(openEntry.id)} run={runs[openEntry.id] ?? 0} />
          </div>
        </div>
      )}
    </div>
  )
}
