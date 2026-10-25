import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { Deck, ModelId, Slide } from '@shared/types'
import { THEMES } from '@shared/themes'
import { newId } from '@shared/ids'
import { SlideFrame } from './SlideFrame'
import { Dropdown } from './Dropdown'
import { ChatPanel, type LiveGeneration } from './ChatPanel'
import { Swatch } from './Home'
import {
  IconCode,
  IconCopy,
  IconDown,
  IconDownload,
  IconExternal,
  IconEye,
  IconNote,
  IconPalette,
  IconPlay,
  IconPlus,
  IconTrash,
  IconUp
} from './icons'

type Tab = 'preview' | 'html' | 'notes' | 'css'

interface Props {
  deck: Deck
  busy: boolean
  live: LiveGeneration | null
  model: ModelId
  hasKey: boolean
  onChange: (deck: Deck) => void
  onGenerate: (prompt: string, scope: 'deck' | 'slide', slideIndex: number) => void
  onStop: () => void
  onModelChange: (m: ModelId) => void
  onPresent: (index: number) => void
  onOpenInBrowser: () => void
  onExportHtml: () => void
  onExportPdf: () => void
  onDelete: () => void
  onOpenSettings: () => void
  onSelectionChange?: (index: number) => void
}

const NEW_SLIDE_HTML = '<h2>New slide</h2>\n<ul>\n  <li>First point</li>\n  <li>Second point</li>\n</ul>'

/** Text area that commits its value after a short pause, so the preview doesn't reload on every key. */
function CodeArea({ value, onCommit, placeholder, readOnly, mono = true }: {
  value: string
  onCommit: (v: string) => void
  placeholder?: string
  readOnly?: boolean
  mono?: boolean
}) {
  const [draft, setDraft] = useState(value)
  const timer = useRef<number | undefined>(undefined)
  const pending = useRef(false)

  useEffect(() => {
    if (!pending.current) setDraft(value)
  }, [value])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const update = (v: string): void => {
    setDraft(v)
    pending.current = true
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      pending.current = false
      onCommit(v)
    }, 300)
  }

  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key !== 'Tab' || !mono) return
    e.preventDefault()
    const el = e.currentTarget
    const { selectionStart: s, selectionEnd: end } = el
    update(draft.slice(0, s) + '  ' + draft.slice(end))
    requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2))
  }

  return (
    <textarea
      className={mono ? 'code' : 'notes-input'}
      spellCheck={!mono}
      dir={mono ? 'ltr' : 'auto'}
      value={draft}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(e) => update(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={() => {
        if (pending.current) {
          window.clearTimeout(timer.current)
          pending.current = false
          onCommit(draft)
        }
      }}
    />
  )
}

export function DeckEditor(props: Props) {
  const { deck, busy, live } = props
  const [selected, setSelected] = useState(0)
  const [tab, setTab] = useState<Tab>('preview')
  const [exportOpen, setExportOpen] = useState(false)
  const slideCount = deck.slides.length
  const index = Math.min(selected, Math.max(0, slideCount - 1))
  const slide: Slide | undefined = deck.slides[index]
  const thumbsRef = useRef<HTMLDivElement>(null)
  const { onSelectionChange } = props

  useEffect(() => {
    onSelectionChange?.(index)
  }, [index, onSelectionChange])

  // Follow the newest slide while the AI is writing.
  useEffect(() => {
    if (busy && live?.scope === 'deck' && live.slidesDone > 0) setSelected(live.slidesDone - 1)
  }, [busy, live?.scope, live?.slidesDone])

  useEffect(() => {
    thumbsRef.current?.querySelector('.thumb.selected')?.scrollIntoView({ block: 'nearest' })
  }, [index])

  useEffect(() => {
    if (!exportOpen) return
    const close = (): void => setExportOpen(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [exportOpen])

  const updateSlides = (slides: Slide[]): void => props.onChange({ ...deck, slides })
  const updateSlide = (patch: Partial<Slide>): void => {
    if (!slide) return
    updateSlides(deck.slides.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }
  const addSlide = (): void => {
    const slides = [...deck.slides]
    slides.splice(index + 1, 0, { id: newId('s'), html: NEW_SLIDE_HTML })
    updateSlides(slides)
    setSelected(slideCount === 0 ? 0 : index + 1)
  }
  const duplicate = (): void => {
    if (!slide) return
    const slides = [...deck.slides]
    slides.splice(index + 1, 0, { ...slide, id: newId('s') })
    updateSlides(slides)
    setSelected(index + 1)
  }
  const remove = (): void => {
    if (!slide) return
    updateSlides(deck.slides.filter((_, i) => i !== index))
    setSelected(Math.max(0, index - 1))
  }
  const move = (dir: -1 | 1): void => {
    const to = index + dir
    if (!slide || to < 0 || to >= slideCount) return
    const slides = [...deck.slides]
    ;[slides[index], slides[to]] = [slides[to], slides[index]]
    updateSlides(slides)
    setSelected(to)
  }

  const onThumbKey = (e: ReactKeyboardEvent): void => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      setSelected(Math.min(slideCount - 1, index + 1))
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      setSelected(Math.max(0, index - 1))
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && !busy) {
      remove()
    }
  }

  return (
    <div className="editor">
      <header className="editor-top">
        <input
          className="title-input"
          dir="auto"
          value={deck.title}
          disabled={busy}
          onChange={(e) => props.onChange({ ...deck, title: e.target.value })}
          aria-label="Presentation title"
        />
        <Dropdown
          value={deck.themeId}
          icon={<IconPalette size={14} />}
          options={THEMES.map((t) => ({ value: t.id, label: t.name, icon: <Swatch colors={t.swatch} /> }))}
          onChange={(themeId) => props.onChange({ ...deck, themeId })}
          title="Theme"
        />
        <div className="spacer" />
        <button className="btn" disabled={!slideCount} onClick={props.onOpenInBrowser} title="Open in your web browser (Ctrl+B)">
          <IconExternal size={15} /> Open in Browser
        </button>
        <div className="export-wrap" onClick={(e) => e.stopPropagation()}>
          <button className="btn" disabled={!slideCount} onClick={() => setExportOpen((o) => !o)}>
            <IconDownload size={15} /> Export
          </button>
          {exportOpen && (
            <div className="menu menu-right">
              <button className="menu-item" onClick={() => { setExportOpen(false); props.onExportHtml() }}>
                <span className="menu-label">HTML file</span>
                <span className="menu-hint">Ctrl+E</span>
              </button>
              <button className="menu-item" onClick={() => { setExportOpen(false); props.onExportPdf() }}>
                <span className="menu-label">PDF</span>
                <span className="menu-hint">Ctrl+P</span>
              </button>
              <div className="menu-sep" />
              <button className="menu-item danger" onClick={() => { setExportOpen(false); props.onDelete() }}>
                <span className="menu-label">Delete presentation</span>
              </button>
            </div>
          )}
        </div>
        <button className="btn accent" disabled={!slideCount} onClick={() => props.onPresent(index)} title="Present from this slide (F5)">
          <IconPlay size={13} /> Present
        </button>
      </header>

      <div className="editor-body">
        <div className="thumbs" ref={thumbsRef} tabIndex={0} onKeyDown={onThumbKey}>
          {deck.slides.map((s, i) => (
            <button key={s.id} className={`thumb ${i === index ? 'selected' : ''}`} onClick={() => setSelected(i)} tabIndex={-1}>
              <span className="thumb-num">{i + 1}</span>
              <SlideFrame deck={deck} index={i} width={176} />
            </button>
          ))}
          {busy && live?.scope === 'deck' && (
            <div className="thumb ghost">
              <span className="thumb-num">{slideCount + 1}</span>
              <div className="ghost-box">
                <span className="spinner" />
              </div>
            </div>
          )}
          {!busy && (
            <button className="add-slide" onClick={addSlide}>
              <IconPlus size={14} /> Add slide
            </button>
          )}
        </div>

        <section className="stage">
          <div className="stage-tabs">
            <div className="tabs">
              <button className={tab === 'preview' ? 'on' : ''} onClick={() => setTab('preview')}>
                <IconEye size={14} /> Preview
              </button>
              <button className={tab === 'html' ? 'on' : ''} onClick={() => setTab('html')}>
                <IconCode size={14} /> HTML
              </button>
              <button className={tab === 'notes' ? 'on' : ''} onClick={() => setTab('notes')}>
                <IconNote size={14} /> Notes
              </button>
              <button className={tab === 'css' ? 'on' : ''} onClick={() => setTab('css')}>
                <IconPalette size={14} /> CSS
              </button>
            </div>
            {slide && !busy && (
              <div className="slide-actions">
                <span className="muted small">
                  {index + 1} / {slideCount}
                </span>
                <button className="icon-btn" title="Move up" disabled={index === 0} onClick={() => move(-1)}>
                  <IconUp />
                </button>
                <button className="icon-btn" title="Move down" disabled={index === slideCount - 1} onClick={() => move(1)}>
                  <IconDown />
                </button>
                <button className="icon-btn" title="Duplicate" onClick={duplicate}>
                  <IconCopy />
                </button>
                <button className="icon-btn" title="Delete slide" onClick={remove}>
                  <IconTrash />
                </button>
              </div>
            )}
          </div>

          {!slide ? (
            <div className="stage-empty">
              {busy ? (
                <>
                  <span className="spinner large" />
                  <p>{live?.status ?? 'Working…'}</p>
                </>
              ) : (
                <>
                  <p>This presentation has no slides yet.</p>
                  <button className="btn" onClick={addSlide}>
                    <IconPlus size={14} /> Add a slide
                  </button>
                </>
              )}
            </div>
          ) : tab === 'preview' ? (
            <div className="stage-view">
              <div className="stage-fit">
                <SlideFrame deck={deck} index={index} animate interactive />
              </div>
            </div>
          ) : (
            <div className="stage-split">
              <div className="editor-pane">
                {tab === 'html' && (
                  <>
                    <label className="field-row">
                      <span>Slide classes</span>
                      <input
                        value={slide.className ?? ''}
                        placeholder='e.g. "center"'
                        readOnly={busy}
                        onChange={(e) => updateSlide({ className: e.target.value || undefined })}
                      />
                    </label>
                    <CodeArea key={slide.id} value={slide.html} readOnly={busy} onCommit={(html) => updateSlide({ html })} />
                  </>
                )}
                {tab === 'notes' && (
                  <CodeArea
                    key={slide.id + ':notes'}
                    mono={false}
                    value={slide.notes ?? ''}
                    readOnly={busy}
                    placeholder="Speaker notes. Press N while presenting to show them."
                    onCommit={(notes) => updateSlide({ notes: notes || undefined })}
                  />
                )}
                {tab === 'css' && (
                  <CodeArea
                    value={deck.css}
                    readOnly={busy}
                    placeholder={'/* Applies to every slide in this deck */\n.slide h1 { color: var(--accent); }'}
                    onCommit={(css) => props.onChange({ ...deck, css })}
                  />
                )}
              </div>
              <div className="preview-pane">
                <div className="stage-fit">
                  <SlideFrame deck={deck} index={index} />
                </div>
              </div>
            </div>
          )}
        </section>

        <ChatPanel
          chat={deck.chat}
          live={live}
          busy={busy}
          selectedIndex={index}
          slideCount={slideCount}
          model={props.model}
          hasKey={props.hasKey}
          onModelChange={props.onModelChange}
          onSend={(prompt, scope) => props.onGenerate(prompt, scope, index)}
          onStop={props.onStop}
          onOpenSettings={props.onOpenSettings}
        />
      </div>
    </div>
  )
}
