import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { AskAnswer, Deck, Slide, VideoFormat } from '@shared/types'
import type { ModelOption } from '@shared/providers'
import { DEFAULT_TRANSITION, THEMES, TRANSITIONS } from '@shared/themes'
import { newId } from '@shared/ids'
import {
  clampSceneSeconds,
  DEFAULT_SCENE_SECONDS,
  formatSeconds,
  isVideo,
  MAX_SCENE_SECONDS,
  MIN_SCENE_SECONDS,
  sceneSeconds,
  VIDEO_FORMATS,
  videoFormat,
  videoSeconds
} from '@shared/video'
import { SlideFrame } from './SlideFrame'
import { Designer, LayoutPicker } from './Designer'
import { Dropdown } from './Dropdown'
import { ChatPanel, type LiveGeneration } from './ChatPanel'
import { FormatShape, Swatch } from './Home'
import { useStoredFlag } from '../util'
import {
  IconClock,
  IconCode,
  IconCopy,
  IconMusic,
  IconDown,
  IconDownload,
  IconExternal,
  IconEye,
  IconLayers,
  IconNote,
  IconPalette,
  IconSparkle,
  IconPlay,
  IconPlus,
  IconTrash,
  IconUp
} from './icons'

type Tab = 'design' | 'preview' | 'code'

interface Props {
  deck: Deck
  busy: boolean
  live: LiveGeneration | null
  /** Model choices for the picker, and the current one ("provider:model"). */
  models: ModelOption[]
  model: string
  hasKey: boolean
  onChange: (deck: Deck) => void
  onGenerate: (prompt: string, scope: 'deck' | 'slide', slideIndex: number) => void
  onStop: () => void
  onAnswer: (answers: AskAnswer[] | null) => void
  onModelChange: (key: string) => void
  onPresent: (index: number) => void
  onOpenInBrowser: () => void
  onExportHtml: () => void
  onExportPdf: () => void
  /** Videos: export as an MP4 file. */
  onExportVideo: () => void
  /** Videos: choose the music. */
  onPickAudio: () => void
  onDelete: () => void
  onClearChat: () => void
  /** Restores the deck from before the last AI change. */
  onUndo: () => void
  onOpenSettings: () => void
  onSelectionChange?: (index: number) => void
}


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

/** A scene's length in seconds; commits on blur or Enter so typing "1.5" doesn't jump through "1". */
function DurationField({ value, disabled, onChange }: { value: number; disabled?: boolean; onChange: (v: number) => void }) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])
  const commit = (): void => {
    const v = clampSceneSeconds(parseFloat(draft))
    setDraft(String(v))
    if (v !== value) onChange(v)
  }
  return (
    <label className="dur-field" title={`How long this scene stays on screen (${MIN_SCENE_SECONDS}-${MAX_SCENE_SECONDS} seconds)`}>
      <IconClock size={13} />
      <input
        type="number"
        min={MIN_SCENE_SECONDS}
        max={MAX_SCENE_SECONDS}
        step={0.5}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
        }}
      />
      <span>s</span>
    </label>
  )
}

/** The video's music: pick a file, set the volume, remove it. */
function MusicMenu({ deck, disabled, onChange, onPick }: { deck: Deck; disabled: boolean; onChange: (d: Deck) => void; onPick: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])
  const audio = deck.audio
  if (!audio) {
    return (
      <button className="chip" disabled={disabled} onClick={onPick} title="Add background music (MP3, WAV, M4A…)">
        <IconMusic size={14} /> <span>Add music</span>
      </button>
    )
  }
  return (
    <div className="dropdown" ref={ref}>
      <button className="chip music-chip" disabled={disabled} onClick={() => setOpen((o) => !o)} title={audio.name}>
        <IconMusic size={14} /> <span dir="auto">{audio.name}</span>
      </button>
      {open && (
        <div className="menu music-menu">
          <div className="music-name" dir="auto">{audio.name}</div>
          <label className="music-volume">
            <span>Volume</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(audio.volume * 100)}
              onChange={(e) => onChange({ ...deck, audio: { ...audio, volume: Number(e.target.value) / 100 } })}
            />
            <span className="muted small">{Math.round(audio.volume * 100)}%</span>
          </label>
          <p className="muted small">The music loops if it is shorter than the video and fades out at the end.</p>
          <div className="menu-sep" />
          <button className="menu-item" onClick={() => { setOpen(false); onPick() }}>
            <span className="menu-label">Replace music…</span>
          </button>
          <button className="menu-item danger" onClick={() => { setOpen(false); onChange({ ...deck, audio: undefined }) }}>
            <span className="menu-label">Remove music</span>
          </button>
        </div>
      )}
    </div>
  )
}

export function DeckEditor(props: Props) {
  const { deck, busy, live } = props
  const [selected, setSelected] = useState(0)
  const [tab, setTab] = useState<Tab>('design')
  const [picking, setPicking] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [chatHidden, setChatHidden] = useStoredFlag('lv.chatHidden', false)
  const slideCount = deck.slides.length
  const video = isVideo(deck)
  const format = videoFormat(deck)
  const word = video ? 'scene' : 'slide'
  // Thumbnails keep about the same area whatever the shape.
  const thumbWidth = format.height > format.width ? 84 : format.height === format.width ? 120 : 176
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
  // "Add slide" opens the ready-made layouts; the picked one goes after the current slide.
  const addSlide = (): void => {
    // The ready-made layouts are drawn for 16:9; vertical and square scenes start blank.
    if (video && format.width !== 1280) insertSlide({ html: '', className: 'center' })
    else setPicking(true)
  }
  const insertSlide = (made: Omit<Slide, 'id'>): void => {
    const slides = [...deck.slides]
    slides.splice(index + 1, 0, { ...made, id: newId('s') })
    updateSlides(slides)
    setSelected(slideCount === 0 ? 0 : index + 1)
    setPicking(false)
    setTab('design')
  }
  const updateElements = (slideId: string, elements: Slide['elements']): void =>
    updateSlides(deck.slides.map((s) => (s.id === slideId ? { ...s, elements } : s)))
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
          aria-label={video ? 'Video title' : 'Presentation title'}
        />
        <Dropdown
          value={deck.themeId}
          icon={<IconPalette size={14} />}
          options={THEMES.map((t) => ({ value: t.id, label: t.name, icon: <Swatch colors={t.swatch} /> }))}
          onChange={(themeId) => props.onChange({ ...deck, themeId })}
          title="Theme"
        />
        <Dropdown
          value={deck.transition ?? DEFAULT_TRANSITION}
          icon={<IconLayers size={14} />}
          options={TRANSITIONS.map((t) => ({ value: t.id, label: t.name }))}
          onChange={(transition) => props.onChange({ ...deck, transition })}
          title={video ? 'Transition between scenes' : 'Transition between slides when presenting'}
        />
        {video && (
          <>
            <Dropdown
              value={format.id}
              icon={<FormatShape format={format.id} />}
              options={VIDEO_FORMATS.map((f) => ({ value: f.id, label: f.name, hint: f.hint, icon: <FormatShape format={f.id} /> }))}
              onChange={(f) => props.onChange({ ...deck, format: f as VideoFormat })}
              title="Video size. Changing it keeps the scenes; ask the AI to adapt them to the new shape."
            />
            <MusicMenu deck={deck} disabled={busy} onChange={props.onChange} onPick={props.onPickAudio} />
            <span className="chip static" title="Length of the video">
              <IconClock size={14} /> {formatSeconds(videoSeconds(deck))}
            </span>
          </>
        )}
        <div className="spacer" />
        {(deck.history?.length ?? 0) > 0 && !busy && (
          <button
            className="btn"
            onClick={props.onUndo}
            title="Go back to the deck as it was before the last AI change. Edits made since then are lost."
          >
            Undo AI change
          </button>
        )}
        <button className="btn" disabled={!slideCount} onClick={props.onOpenInBrowser} title="Open in your web browser (Ctrl+B)">
          <IconExternal size={15} /> Open in Browser
        </button>
        <div className="export-wrap" onClick={(e) => e.stopPropagation()}>
          <button className="btn" disabled={!slideCount} onClick={() => setExportOpen((o) => !o)}>
            <IconDownload size={15} /> Export
          </button>
          {exportOpen && (
            <div className="menu menu-right">
              {video && (
                <>
                  <button className="menu-item" onClick={() => { setExportOpen(false); props.onExportVideo() }}>
                    <span className="menu-label">Video (MP4, {format.outWidth}×{format.outHeight})</span>
                    <span className="menu-hint">Ctrl+Shift+E</span>
                  </button>
                  <div className="menu-sep" />
                </>
              )}
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
                <span className="menu-label">Delete {video ? 'video' : 'presentation'}</span>
              </button>
            </div>
          )}
        </div>
        {chatHidden && (
          <button className="btn" onClick={() => setChatHidden(false)} title="Show the AI chat">
            <IconSparkle size={14} /> Chat {busy && <span className="pulse" />}
          </button>
        )}
        <button
          className="btn accent"
          disabled={!slideCount}
          onClick={() => props.onPresent(index)}
          title={video ? 'Play the video from this scene, with the music (F5)' : 'Present from this slide (F5)'}
        >
          <IconPlay size={13} /> {video ? 'Play' : 'Present'}
        </button>
      </header>

      <div className="editor-body">
        <div className="thumbs" ref={thumbsRef} tabIndex={0} onKeyDown={onThumbKey}>
          {deck.slides.map((s, i) => (
            <button key={s.id} className={`thumb ${i === index ? 'selected' : ''}`} onClick={() => setSelected(i)} tabIndex={-1}>
              <span className="thumb-num">{i + 1}</span>
              <SlideFrame deck={deck} index={i} width={thumbWidth} />
              {video && <span className="thumb-dur">{sceneSeconds(s)}s</span>}
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
              <IconPlus size={14} /> Add {word}
            </button>
          )}
        </div>

        <section className="stage">
          <div className="stage-tabs">
            <div className="tabs">
              <button className={tab === 'design' ? 'on' : ''} onClick={() => setTab('design')} title="Drag and drop components">
                <IconLayers size={14} /> Design
              </button>
              <button className={tab === 'preview' ? 'on' : ''} onClick={() => setTab('preview')}>
                <IconEye size={14} /> Preview
              </button>
              <button className={tab === 'code' ? 'on' : ''} onClick={() => setTab('code')} title="Slide HTML, deck CSS and speaker notes">
                <IconCode size={14} /> Code
              </button>
            </div>
            {slide && !busy && (
              <div className="slide-actions">
                {video && (
                  <DurationField
                    value={sceneSeconds(slide)}
                    onChange={(duration) => updateSlide({ duration: duration === DEFAULT_SCENE_SECONDS ? undefined : duration })}
                  />
                )}
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
                <button className="icon-btn" title={`Delete ${word}`} onClick={remove}>
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
                  <p>{video ? 'This video has no scenes yet.' : 'This presentation has no slides yet.'}</p>
                  <button className="btn" onClick={addSlide}>
                    <IconPlus size={14} /> Add a {word}
                  </button>
                </>
              )}
            </div>
          ) : tab === 'design' ? (
            <Designer
              deck={deck}
              index={index}
              readOnly={busy}
              onChange={updateElements}
              onSlideChange={(id, patch) => updateSlides(deck.slides.map((s) => (s.id === id ? { ...s, ...patch } : s)))}
            />
          ) : tab === 'preview' ? (
            <div className="stage-view">
              <div className="stage-fit">
                <SlideFrame deck={deck} index={index} animate interactive />
              </div>
            </div>
          ) : (
            <div className="stage-split">
              <div className="editor-pane">
                <div className="code-section html">
                  <div className="code-head">
                    <IconCode size={13} /> HTML <span className="code-hint">this slide</span>
                  </div>
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
                </div>
                <div className="code-section css">
                  <div className="code-head">
                    <IconPalette size={13} /> CSS <span className="code-hint">every slide</span>
                  </div>
                  <CodeArea
                    value={deck.css}
                    readOnly={busy}
                    placeholder={'/* Applies to every slide in this deck */\n.slide h1 { color: var(--accent); }'}
                    onCommit={(css) => props.onChange({ ...deck, css })}
                  />
                </div>
                <div className="code-section notes">
                  <div className="code-head">
                    <IconNote size={13} /> Notes <span className="code-hint">press N while presenting</span>
                  </div>
                  <CodeArea
                    key={slide.id + ':notes'}
                    mono={false}
                    value={slide.notes ?? ''}
                    readOnly={busy}
                    placeholder="Speaker notes for this slide."
                    onCommit={(notes) => updateSlide({ notes: notes || undefined })}
                  />
                </div>
              </div>
              <div className="preview-pane">
                <div className="stage-fit">
                  <SlideFrame deck={deck} index={index} />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* The chat opens by itself when the AI asks a question. */}
        {(!chatHidden || live?.ask) && (
        <ChatPanel
          deck={deck}
          chat={deck.chat}
          live={live}
          busy={busy}
          selectedIndex={index}
          slideCount={slideCount}
          models={props.models}
          model={props.model}
          hasKey={props.hasKey}
          onModelChange={props.onModelChange}
          onSend={(prompt, scope) => props.onGenerate(prompt, scope, index)}
          onStop={props.onStop}
          onAnswer={props.onAnswer}
          onOpenSettings={props.onOpenSettings}
          onClearChat={props.onClearChat}
          onHide={() => setChatHidden(true)}
        />
        )}
      </div>
      {picking && <LayoutPicker deck={deck} onPick={insertSlide} onClose={() => setPicking(false)} />}
    </div>
  )
}
