import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode
} from 'react'
import type { Deck, Slide, SlideElement } from '@shared/types'
import { buildSlideDocument, isRtlSlide } from '@shared/deckHtml'
import { slideSize } from '@shared/video'
import { ANIMATIONS, CHART_TYPES, ELEMENT_KINDS, LAYOUTS, PLACES, newElement, parseCsv, renderElement } from '@shared/elements'
import { getTheme } from '@shared/themes'
import { BACKGROUNDS, HOVER_EFFECTS, TEXT_EFFECTS } from '@shared/effects'
import { newId } from '@shared/ids'
import { SlideFrame } from './SlideFrame'
import './designer.css'

type Box = Pick<SlideElement, 'x' | 'y' | 'w' | 'h'>
type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
type Props = SlideElement['props']

const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
const KIND_MIME = 'application/x-lv-kind'
/** How close (in slide pixels) an edge must be to snap to a guide. */
const SNAP = 6

// ---------- Icons for the Insert bar ----------

const svg = (d: ReactNode): ReactNode => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
)
const KIND_ICONS: Record<string, ReactNode> = {
  title: svg(<path d="M5 6h14M12 6v13" />),
  text: svg(<path d="M5 7h14M5 12h14M5 17h9" />),
  image: svg(<><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m21 16-5-5-8 8" /></>),
  shape: svg(<><rect x="3" y="9" width="10" height="10" rx="2" /><circle cx="16" cy="8" r="5" /></>),
  button: svg(<><rect x="3" y="8" width="18" height="8" rx="4" /><path d="M9 12h6" /></>),
  icon: svg(<path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z" />),
  chart: svg(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />),
  map: svg(<><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>),
  table: svg(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M3 15h18M10 4v16" /></>),
  kpi: svg(<><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M7 15l3-3 3 2 4-5" /></>),
  marquee: svg(<><path d="M2 12h3M19 12h3" /><rect x="7" y="8" width="4" height="8" rx="1" /><rect x="13" y="8" width="4" height="8" rx="1" /></>),
  circle: svg(<><circle cx="12" cy="12" r="8" strokeDasharray="3 2.5" /><circle cx="12" cy="12" r="2.5" /></>),
  orb: svg(<><circle cx="12" cy="12" r="8" /><path d="M8.5 9.5a4 4 0 0 1 3-2.5" /><path d="m15 15 1.5 1.5M6 17l1-1" /></>),
  coverflow: svg(<><rect x="8" y="5" width="8" height="14" rx="1.5" /><path d="M5 7v10M19 7v10M2 9v6M22 9v6" /></>),
  ring: svg(<><ellipse cx="12" cy="12" rx="9" ry="4" /><rect x="9.5" y="9" width="5" height="7" rx="1" /></>),
  globe: svg(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>),
  rotcards: svg(<><ellipse cx="12" cy="13" rx="9.5" ry="3.5" /><rect x="9" y="6" width="6" height="9" rx="1.2" /><path d="M4.5 9.5v4M19.5 9.5v4" /></>),
  shadercard: svg(<><rect x="5" y="3" width="14" height="18" rx="2.5" /><path d="M12 19c-2.5 0-4-1.6-4-3.6 0-2.4 2.4-3.4 2.4-6.4 2 1.4 3.6 3.2 3.6 5.2.6-.5 1-1.2 1-2 1 1 1 2 1 3.2 0 2-1.5 3.6-4 3.6z" /></>),
  ribbon: svg(<><path d="M3 15c3-6 6 2 9-2s6-6 9 0" /><rect x="5" y="9.5" width="3.5" height="3.5" rx=".6" /><rect x="15" y="6.5" width="3.5" height="3.5" rx=".6" /></>),
  albumrail: svg(<><rect x="7" y="5" width="10" height="10" rx="1.5" /><circle cx="17.5" cy="10" r="4" /><path d="M3 19h18M6 17.5v3M12 17.5v3M18 17.5v3" /></>),
  reel: svg(<path d="M4 8v8M7.5 6v12M11.5 4v16M15.5 6v12M19 8v8" />),
  sticker: svg(<path d="M5 4h14v9l-6 7H5z M13 20v-5a2 2 0 0 1 2-2h4" />),
  bend: svg(<><path d="M8 3c-2 3-2 15 0 18M16 3c2 3 2 15 0 18" /><path d="M8 8h8M8 16h8" /></>),
  depthcard: svg(<><rect x="4" y="4" width="13" height="16" rx="2" /><rect x="8" y="7" width="12" height="13" rx="2" /></>),
  lenticular: svg(<><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M8 4v16M11 4v16M14 4v16M17 4v16" /></>),
  textpath: svg(<><path d="M3 15c3-6 6-6 9 0s6 6 9 0" strokeDasharray="1.5 2.5" /><path d="M7 5h6M10 5v6" /></>),
  cursor: svg(<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="1.8" fill="currentColor" /></>),
  pills: svg(<><rect x="2.5" y="5" width="10" height="5" rx="2.5" /><rect x="10" y="12" width="11" height="5" rx="2.5" transform="rotate(-8 15.5 14.5)" /><rect x="3" y="15" width="6" height="5" rx="2.5" /></>)
}

/** Motion components that show a list of pictures. */
const PICTURE_LISTS = ['rotcards', 'ribbon', 'albumrail', 'reel', 'bend', 'lenticular']

// ---------- Geometry ----------

function snapMove(b: Box, others: Box[], W: number, H: number): { box: Box; gx: number[]; gy: number[] } {
  const xs = [0, W / 2, W, ...others.flatMap((o) => [o.x, o.x + o.w / 2, o.x + o.w])]
  const ys = [0, H / 2, H, ...others.flatMap((o) => [o.y, o.y + o.h / 2, o.y + o.h])]
  const best = (edges: number[], targets: number[]): { d: number; line: number } | null => {
    let found: { d: number; line: number } | null = null
    for (const e of edges)
      for (const t of targets) {
        const d = t - e
        if (Math.abs(d) <= SNAP && (!found || Math.abs(d) < Math.abs(found.d))) found = { d, line: t }
      }
    return found
  }
  const sx = best([b.x, b.x + b.w / 2, b.x + b.w], xs)
  const sy = best([b.y, b.y + b.h / 2, b.y + b.h], ys)
  return {
    box: { ...b, x: b.x + (sx?.d ?? 0), y: b.y + (sy?.d ?? 0) },
    gx: sx ? [sx.line] : [],
    gy: sy ? [sy.line] : []
  }
}

function resize(start: Box, handle: Handle, dx: number, dy: number, keepRatio: boolean): Box {
  let { x, y, w, h } = start
  if (handle.includes('e')) w = start.w + dx
  if (handle.includes('w')) { x = start.x + dx; w = start.w - dx }
  if (handle.includes('s')) h = start.h + dy
  if (handle.includes('n')) { y = start.y + dy; h = start.h - dy }
  if (keepRatio && handle.length === 2) {
    const ratio = start.w / start.h
    if (w / h > ratio) w = h * ratio
    else h = w / ratio
    if (handle.includes('w')) x = start.x + start.w - w
    if (handle.includes('n')) y = start.y + start.h - h
  }
  if (w < 20) { if (handle.includes('w')) x -= 20 - w; w = 20 }
  if (h < 20) { if (handle.includes('n')) y -= 20 - h; h = 20 }
  return { x, y, w, h }
}

const round = (b: Box): Box => ({ x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h) })

/** Reads a picture and shrinks big ones, so decks stay small. */
function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Not an image'))
      img.onload = () => {
        const s = Math.min(1, 1600 / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * s)
        c.height = Math.round(img.height * s)
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/webp', 0.86))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

/** A theme color as the app can show it, for the color swatches. */
function themeVar(deck: Deck, name: string): string {
  const m = new RegExp(`--${name}:([^;}]+)`).exec(getTheme(deck.themeId).css)
  return m ? m[1] : '#888'
}

// ---------- The slide behind the overlay ----------

/**
 * Shows the slide in an iframe. A new version loads in a hidden frame and is
 * swapped in when ready, so editing never flashes.
 */
function LiveFrame({ doc, scale, interactive, frameRef, width: W, height: H }: {
  doc: string
  scale: number
  width: number
  height: number
  interactive: boolean
  frameRef: { current: HTMLIFrameElement | null }
}) {
  const [frames, setFrames] = useState([{ key: 0, doc }])
  const [shown, setShown] = useState(0)
  const nextKey = useRef(1)
  const nodes = useRef(new Map<number, HTMLIFrameElement>())

  useEffect(() => {
    setFrames((fs) => (fs[fs.length - 1].doc === doc ? fs : [...fs.filter((f) => f.key === shown), { key: nextKey.current++, doc }]))
  }, [doc, shown])

  return (
    <>
      {frames.map((f) => (
        <iframe
          key={f.key}
          title="Slide"
          sandbox="allow-scripts"
          srcDoc={f.doc}
          tabIndex={-1}
          ref={(n) => {
            if (n) nodes.current.set(f.key, n)
            else nodes.current.delete(f.key)
          }}
          onLoad={() => {
            // Swap only after the new frame has painted, or it shows black for a moment.
            const swap = (): void => {
              if (!nodes.current.has(f.key)) return
              setShown(f.key)
              frameRef.current = nodes.current.get(f.key) ?? null
              setFrames((fs) => fs.filter((x) => x.key >= f.key))
            }
            window.setTimeout(swap, 90)
          }}
          style={{
            width: W,
            height: H,
            transform: `scale(${scale})`,
            opacity: f.key === shown ? 1 : 0,
            pointerEvents: interactive && f.key === shown ? 'auto' : 'none'
          }}
        />
      ))}
    </>
  )
}

// ---------- Designer ----------

interface DesignerProps {
  deck: Deck
  index: number
  readOnly: boolean
  onChange: (slideId: string, elements: SlideElement[]) => void
  /** Changes the slide itself, e.g. its background classes. */
  onSlideChange: (slideId: string, patch: Partial<Slide>) => void
}

export function Designer({ deck, index, readOnly, onChange, onSlideChange }: DesignerProps) {
  const slide: Slide | undefined = deck.slides[index]
  const { width: W, height: H } = slideSize(deck)
  const elements = useMemo(() => slide?.elements ?? [], [slide])
  const [selected, setSelected] = useState<string | null>(null)
  const [draft, setDraft] = useState<SlideElement[] | null>(null)
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] })
  const [mapMode, setMapMode] = useState<string | null>(null)
  const [scale, setScale] = useState(0.5)
  const wrapRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLIFrameElement | null>(null)
  const history = useRef<{ slideId: string; elements: SlideElement[] }[]>([])
  const pending = useRef<{ timer: number; slideId: string; elements: SlideElement[] } | null>(null)
  const mapView = useRef<{ id: string; lat: number; lng: number; zoom: number } | null>(null)
  const drag = useRef<{ mode: 'move' | Handle; id: string; sx: number; sy: number; start: Box; moved: boolean } | null>(null)

  const shown = draft ?? elements
  const sel = shown.find((e) => e.id === selected) ?? null

  const commit = useCallback(
    (next: SlideElement[], slideId = slide?.id) => {
      if (!slideId) return
      const before = slideId === slide?.id ? elements : undefined
      if (before) history.current = [...history.current, { slideId, elements: before }].slice(-60)
      onChange(slideId, next)
    },
    [slide?.id, elements, onChange]
  )

  const flush = useCallback(() => {
    const p = pending.current
    if (!p) return
    window.clearTimeout(p.timer)
    pending.current = null
    commit(p.elements, p.slideId)
    setDraft(null)
  }, [commit])

  // Moving to another slide saves what was being typed and clears the selection.
  useEffect(() => {
    setSelected(null)
    setMapMode(null)
    setDraft(null)
    return () => flush()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide?.id])

  useEffect(() => {
    const host = wrapRef.current
    if (!host) return
    const measure = (): void => {
      const r = host.getBoundingClientRect()
      setScale(Math.max(0.1, Math.min((r.width - 40) / W, (r.height - 40) / H)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(host)
    return () => ro.disconnect()
  }, [W, H])

  const doc = useMemo(
    () => buildSlideDocument(deck, index, { edit: true }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slide, deck.themeId, deck.css, deck.kind, deck.format, index]
  )

  /** Shows a change in the slide right away, before it is saved. */
  const preview = (el: SlideElement): void => {
    frameRef.current?.contentWindow?.postMessage({ lv: 'html', id: el.id, html: renderElement(el), x: el.x, y: el.y, w: el.w, h: el.h }, '*')
  }

  /** Edits from the properties panel: shown at once, saved after a short pause. */
  const change = (id: string, patch: Partial<SlideElement>, props?: Props): void => {
    if (!slide || readOnly) return
    const base = pending.current?.elements ?? draft ?? elements
    const next = base.map((e) => (e.id === id ? { ...e, ...patch, props: props ? { ...e.props, ...props } : e.props } : e))
    setDraft(next)
    const el = next.find((e) => e.id === id)
    if (el) preview(el)
    if (pending.current) window.clearTimeout(pending.current.timer)
    const slideId = slide.id
    pending.current = {
      slideId,
      elements: next,
      timer: window.setTimeout(() => {
        pending.current = null
        commit(next, slideId)
        setDraft(null)
      }, 450)
    }
  }

  const add = (kind: string, at?: { x: number; y: number }, props?: Props): void => {
    if (!slide || readOnly) return
    flush()
    // Without a drop point, new components go in the middle of the slide.
    const el = newElement(kind, at ?? { x: W / 2, y: H / 2 })
    if (props) el.props = { ...el.props, ...props }
    commit([...(slide.elements ?? []), el])
    setSelected(el.id)
    wrapRef.current?.focus()
  }

  const remove = (id: string): void => {
    flush()
    commit(elements.filter((e) => e.id !== id))
    setSelected(null)
  }

  const duplicate = (id: string): void => {
    flush()
    const el = elements.find((e) => e.id === id)
    if (!el) return
    const copy = { ...el, id: newId('e'), x: el.x + 24, y: el.y + 24, props: { ...el.props } }
    commit([...elements, copy])
    setSelected(copy.id)
  }

  const reorder = (id: string, toFront: boolean): void => {
    flush()
    const el = elements.find((e) => e.id === id)
    if (!el) return
    const rest = elements.filter((e) => e.id !== id)
    commit(toFront ? [...rest, el] : [el, ...rest])
  }

  const undo = (): void => {
    flush()
    const last = history.current.pop()
    if (last && slide && last.slideId === slide.id) onChange(slide.id, last.elements)
  }

  // ----- Map mode: pan and zoom the real map, then keep that view -----

  useEffect(() => {
    const onMessage = (e: MessageEvent): void => {
      const d = e.data as { lv?: string; id?: string; lat?: number; lng?: number; zoom?: number }
      if (d?.lv === 'map' && d.id && d.id === mapMode) mapView.current = { id: d.id, lat: d.lat!, lng: d.lng!, zoom: d.zoom! }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [mapMode])

  const endMapMode = (): void => {
    const v = mapView.current
    mapView.current = null
    setMapMode(null)
    if (v) {
      flush()
      commit(elements.map((e) => (e.id === v.id ? { ...e, props: { ...e.props, lat: v.lat, lng: v.lng, zoom: v.zoom } } : e)))
    }
  }

  // ----- Mouse: select, move, resize -----

  const startDrag = (e: ReactPointerEvent, el: SlideElement, mode: 'move' | Handle): void => {
    if (e.button !== 0) return
    e.stopPropagation()
    setSelected(el.id)
    wrapRef.current?.focus()
    if (readOnly) return
    flush()
    overlayRef.current?.setPointerCapture(e.pointerId)
    drag.current = { mode, id: el.id, sx: e.clientX, sy: e.clientY, start: { x: el.x, y: el.y, w: el.w, h: el.h }, moved: false }
  }

  const onPointerMove = (e: ReactPointerEvent): void => {
    const d = drag.current
    if (!d) return
    const dx = (e.clientX - d.sx) / scale
    const dy = (e.clientY - d.sy) / scale
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 2) return
    d.moved = true
    let box: Box
    let gx: number[] = []
    let gy: number[] = []
    if (d.mode === 'move') {
      const moved = { ...d.start, x: d.start.x + dx, y: d.start.y + dy }
      if (e.altKey) box = moved
      else ({ box, gx, gy } = snapMove(moved, elements.filter((o) => o.id !== d.id), W, H))
    } else {
      const el = elements.find((o) => o.id === d.id)
      const keep = e.shiftKey || el?.type === 'icon' || el?.type === 'image'
      box = resize(d.start, d.mode, dx, dy, keep && !(e.shiftKey && el?.type === 'image'))
    }
    box = round(box)
    const next = elements.map((o) => (o.id === d.id ? { ...o, ...box } : o))
    setDraft(next)
    setGuides({ x: gx, y: gy })
    const el = next.find((o) => o.id === d.id)
    if (el) preview(el)
  }

  const onPointerUp = (): void => {
    const d = drag.current
    drag.current = null
    setGuides({ x: [], y: [] })
    if (d?.moved && draft) {
      commit(draft)
      setDraft(null)
    }
  }

  // ----- Keyboard -----

  const onKeyDown = (e: ReactKeyboardEvent): void => {
    const mod = e.ctrlKey || e.metaKey
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      undo()
      return
    }
    if (e.key === 'Escape') {
      if (mapMode) endMapMode()
      else setSelected(null)
      return
    }
    if (!sel || readOnly) return
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      remove(sel.id)
    } else if (mod && e.key.toLowerCase() === 'd') {
      e.preventDefault()
      duplicate(sel.id)
    } else if (e.key.startsWith('Arrow')) {
      e.preventDefault()
      const step = e.shiftKey ? 10 : 1
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
      change(sel.id, { x: sel.x + dx, y: sel.y + dy })
    }
  }

  // ----- Drop from the Insert bar, or an image file from the computer -----

  const toSlide = (e: DragEvent): { x: number; y: number } => {
    const r = overlayRef.current!.getBoundingClientRect()
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale }
  }
  const onDragOver = (e: DragEvent): void => {
    if (readOnly) return
    if (e.dataTransfer.types.includes(KIND_MIME) || e.dataTransfer.types.includes('Files')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  }
  const onDrop = (e: DragEvent): void => {
    if (readOnly) return
    e.preventDefault()
    const at = toSlide(e)
    const kind = e.dataTransfer.getData(KIND_MIME)
    if (kind) return add(kind, at)
    const file = [...e.dataTransfer.files].find((f) => f.type.startsWith('image/'))
    if (file) void readImage(file).then((src) => add('image', at, { src }))
  }

  if (!slide) return null
  const isEmpty = !elements.length && !slide.html.trim()

  return (
    <div className="designer">
      <div className="insert-bar" role="toolbar" aria-label="Insert">
        <span className="insert-label">Insert</span>
        {ELEMENT_KINDS.map((k, i) => (
          <Fragment key={k.kind}>
          {k.group === 'motion' && ELEMENT_KINDS[i - 1]?.group !== 'motion' && <span className="insert-sep">Motion</span>}
          <button
            className="insert-item"
            draggable={!readOnly}
            disabled={readOnly}
            title={`Drag onto the slide, or click to add a ${k.label.toLowerCase()}`}
            onDragStart={(e) => {
              e.dataTransfer.setData(KIND_MIME, k.kind)
              e.dataTransfer.effectAllowed = 'copy'
            }}
            onClick={() => add(k.kind)}
          >
            {KIND_ICONS[k.kind]}
            <span>{k.label}</span>
          </button>
          </Fragment>
        ))}
      </div>

      <div className="designer-main">
        <div className="canvas-wrap" ref={wrapRef} tabIndex={0} onKeyDown={onKeyDown}>
          <div className="canvas" style={{ width: W * scale, height: H * scale }}>
            <LiveFrame doc={doc} scale={scale} interactive={!!mapMode} frameRef={frameRef} width={W} height={H} />
            <div
              ref={overlayRef}
              className={`overlay${mapMode ? ' passthrough' : ''}`}
              onPointerDown={() => setSelected(null)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onDragOver={onDragOver}
              onDrop={onDrop}
            >
              {isEmpty && (
                <div className="canvas-hint">
                  <strong>Drag components here</strong>
                  <span>from the Insert bar above, or drop a picture from your computer</span>
                </div>
              )}
              {shown.map((el) => (
                <div
                  key={el.id}
                  className={`d-box${el.id === selected ? ' on' : ''}`}
                  style={{ left: el.x * scale, top: el.y * scale, width: el.w * scale, height: el.h * scale }}
                  onPointerDown={(e) => startDrag(e, el, 'move')}
                  onDoubleClick={() => {
                    if (el.type === 'map') setMapMode(el.id)
                    else document.getElementById('d-main-input')?.focus()
                  }}
                >
                  {el.id === selected && !readOnly &&
                    HANDLES.map((h) => <span key={h} className={`d-handle ${h}`} onPointerDown={(e) => startDrag(e, el, h)} />)}
                </div>
              ))}
              {guides.x.map((x) => <div key={'x' + x} className="guide v" style={{ left: x * scale }} />)}
              {guides.y.map((y) => <div key={'y' + y} className="guide h" style={{ top: y * scale }} />)}
            </div>
            {mapMode && (
              <div className="map-banner">
                Drag and zoom the map to the view you want
                <button className="btn accent" onClick={endMapMode}>Done</button>
              </div>
            )}
          </div>
        </div>

        <aside className="inspector">
          {sel ? (
            <Inspector
              key={sel.id}
              deck={deck}
              el={sel}
              readOnly={readOnly}
              onChange={(patch, props) => change(sel.id, patch, props)}
              onDelete={() => remove(sel.id)}
              onDuplicate={() => duplicate(sel.id)}
              onFront={() => reorder(sel.id, true)}
              onBack={() => reorder(sel.id, false)}
              onMoveMap={() => setMapMode(sel.id)}
            />
          ) : (
            <div className="inspector-help">
              <SlidePanel slide={slide} readOnly={readOnly} onChange={(patch) => onSlideChange(slide.id, patch)} />
              <h4>Design</h4>
              <p>Drag a component from the Insert bar onto the slide, or click it to add it in the middle.</p>
              <p>Click a component to change it. Drag to move, drag the corners to resize. It snaps to the center and to other components (hold Alt to stop snapping).</p>
              <p className="keys">
                <kbd>Delete</kbd> remove · <kbd>Ctrl</kbd>+<kbd>D</kbd> duplicate · <kbd>Ctrl</kbd>+<kbd>Z</kbd> undo · arrows nudge
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

// ---------- Properties panel ----------

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`d-field${wide ? ' wide' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

function Num({ value, onChange, min, max, step }: { value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const n = parseFloat(e.target.value)
        if (Number.isFinite(n)) onChange(n)
      }}
    />
  )
}

function Select({ value, options, onChange }: { value: string; options: { id: string; name: string }[]; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.name}</option>
      ))}
    </select>
  )
}

function ColorPick({ deck, value, auto, onChange }: { deck: Deck; value: string; auto: string; onChange: (v: string) => void }) {
  const swatches = [
    { v: '', label: auto, show: themeVar(deck, auto === 'Accent' ? 'accent' : 'fg') },
    { v: 'var(--fg)', label: 'Text', show: themeVar(deck, 'fg') },
    { v: 'var(--muted)', label: 'Muted', show: themeVar(deck, 'muted') },
    { v: 'var(--accent)', label: 'Accent', show: themeVar(deck, 'accent') }
  ]
  return (
    <div className="d-colors">
      {swatches.map((s) => (
        <button
          key={s.label}
          title={s.label}
          className={`d-swatch${value === s.v ? ' on' : ''}`}
          style={{ background: s.show }}
          onClick={(e) => {
            e.preventDefault()
            onChange(s.v)
          }}
        />
      ))}
      <input
        type="color"
        title="Custom color"
        value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

/** A small spreadsheet for chart and table data (stored as comma-separated lines). */
function DataGrid({ value, onChange, firstRowLabel }: { value: string; onChange: (v: string) => void; firstRowLabel: string }) {
  const rows = parseCsv(value)
  const cols = Math.max(2, ...rows.map((r) => r.length))
  const grid = (rows.length ? rows : [['', '']]).map((r) => Array.from({ length: cols }, (_, i) => r[i] ?? ''))
  const save = (g: string[][]): void => onChange(g.map((r) => r.map((c) => c.replace(/,/g, ' ')).join(',')).join('\n'))
  const set = (ri: number, ci: number, v: string): void => save(grid.map((r, i) => (i === ri ? r.map((c, j) => (j === ci ? v : c)) : r)))
  return (
    <div className="d-grid-wrap">
      <table className="d-grid">
        <tbody>
          {grid.map((r, ri) => (
            <tr key={ri} className={ri === 0 ? 'head' : ''}>
              {r.map((c, ci) => (
                <td key={ci}>
                  <input value={c} onChange={(e) => set(ri, ci, e.target.value)} placeholder={ri === 0 ? firstRowLabel : ''} />
                </td>
              ))}
              <td className="d-grid-x">
                {ri > 0 && grid.length > 2 && (
                  <button title="Remove row" onClick={() => save(grid.filter((_, i) => i !== ri))}>×</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="d-grid-actions">
        <button className="btn" onClick={() => save([...grid, Array(cols).fill('')])}>+ Row</button>
        <button className="btn" onClick={() => save(grid.map((r, i) => [...r, i === 0 ? `Series ${cols}` : '0']))}>+ Column</button>
        {cols > 2 && <button className="btn" onClick={() => save(grid.map((r) => r.slice(0, -1)))}>− Column</button>}
      </div>
    </div>
  )
}

function Inspector({ deck, el, readOnly, onChange, onDelete, onDuplicate, onFront, onBack, onMoveMap }: {
  deck: Deck
  el: SlideElement
  readOnly: boolean
  onChange: (patch: Partial<SlideElement>, props?: Props) => void
  onDelete: () => void
  onDuplicate: () => void
  onFront: () => void
  onBack: () => void
  onMoveMap: () => void
}) {
  const p = el.props
  const set = (props: Props): void => onChange({}, props)
  const str = (k: string): string => String(p[k] ?? '')
  const n = (k: string, d: number): number => (typeof p[k] === 'number' ? (p[k] as number) : Number(p[k] ?? d))
  const name = ELEMENT_KINDS.find((k) => k.type === el.type && (el.type !== 'text' || (k.kind === 'title') === (p.font === 'heading')))?.label ?? el.type

  return (
    <fieldset className="d-inspector" disabled={readOnly}>
      <div className="d-head">
        <h4>{name}</h4>
        <div className="d-head-actions">
          <button className="icon-btn small" title="Bring to front" onClick={onFront}>⤒</button>
          <button className="icon-btn small" title="Send to back" onClick={onBack}>⤓</button>
          <button className="icon-btn small" title="Duplicate (Ctrl+D)" onClick={onDuplicate}>⧉</button>
          <button className="icon-btn small danger" title="Delete (Delete)" onClick={onDelete}>🗑</button>
        </div>
      </div>

      {el.type === 'text' && (
        <>
          <Field label="Text" wide>
            <textarea id="d-main-input" dir="auto" rows={4} value={str('text')} onChange={(e) => set({ text: e.target.value })} />
          </Field>
          <Field label="Size"><Num value={n('size', 28)} min={8} max={200} onChange={(v) => set({ size: v })} /></Field>
          <Field label="Weight">
            <Select value={String(n('weight', 400))} options={[{ id: '400', name: 'Regular' }, { id: '600', name: 'Semibold' }, { id: '700', name: 'Bold' }, { id: '800', name: 'Black' }]} onChange={(v) => set({ weight: Number(v) })} />
          </Field>
          <Field label="Align">
            <div className="d-seg">
              {[['start', 'Start'], ['center', 'Center'], ['end', 'End']].map(([v, l]) => (
                <button key={v} className={str('align') === v || (!p.align && v === 'start') ? 'on' : ''} onClick={(e) => { e.preventDefault(); set({ align: v }) }}>{l}</button>
              ))}
            </div>
          </Field>
          <Field label="Font">
            <Select value={str('font') || 'body'} options={[{ id: 'body', name: 'Body' }, { id: 'heading', name: 'Heading' }]} onChange={(v) => set({ font: v })} />
          </Field>
          <Field label="Color" wide><ColorPick deck={deck} value={str('color')} auto="Theme" onChange={(v) => set({ color: v })} /></Field>
          <Field label="Text effect" wide><Select value={str('fx')} options={TEXT_EFFECTS} onChange={(v) => set({ fx: v })} /></Field>
          {(str('fx') === 'fx-rotate' || str('fx') === 'fx-type') && (
            <Field label="Words (separate with |)" wide>
              <input dir="auto" value={str('words')} placeholder="faster|smarter|simpler" onChange={(e) => set({ words: e.target.value })} />
            </Field>
          )}
        </>
      )}

      {el.type === 'marquee' && (
        <>
          <Field label="Items (separate with |)" wide>
            <textarea id="d-main-input" dir="auto" rows={3} value={str('items')} onChange={(e) => set({ items: e.target.value })} />
          </Field>
          <Field label="Size"><Num value={n('size', 30)} min={10} max={120} onChange={(v) => set({ size: v })} /></Field>
          <Field label="Gap"><Num value={n('gap', 72)} min={0} max={300} onChange={(v) => set({ gap: v })} /></Field>
          <Field label="Seconds per loop"><Num value={n('speed', 22)} min={4} max={120} onChange={(v) => set({ speed: v })} /></Field>
        </>
      )}

      {el.type === 'orb' && (
        <>
          <Field label="Energy on the rim" wide>
            <input type="range" min={0} max={1} step={0.05} value={n('energy', 0.8)} onChange={(e) => set({ energy: Number(e.target.value) })} />
          </Field>
          <Field label="Color" wide><ColorPick deck={deck} value={str('color')} auto="Accent" onChange={(v) => set({ color: v.startsWith('var(') ? '' : v })} /></Field>
          <p className="d-note">A glass ball drawn live with WebGL. Dust inside follows the mouse while presenting.</p>
        </>
      )}

      {(el.type === 'coverflow' || el.type === 'ring') && (
        <>
          <Field label="Cards: emoji or image URL | title | subtitle" wide>
            <textarea id="d-main-input" dir="auto" rows={6} value={str('items')} onChange={(e) => set({ items: e.target.value })} />
          </Field>
          {el.type === 'coverflow' ? (
            <Field label="Seconds per card"><Num value={n('interval', 3)} min={1} max={20} step={0.5} onChange={(v) => set({ interval: v })} /></Field>
          ) : (
            <>
              <Field label="Spin"><Select value={str('axis') || 'x'} options={[{ id: 'x', name: 'Sideways' }, { id: 'y', name: 'Up and down' }]} onChange={(v) => set({ axis: v })} /></Field>
              <Field label="Autoplay"><Select value={str('mode') || 'step'} options={[{ id: 'step', name: 'Card by card' }, { id: 'drift', name: 'Slow drift' }, { id: 'off', name: 'Off' }]} onChange={(v) => set({ mode: v })} /></Field>
            </>
          )}
          <p className="d-note">While presenting: drag or flick it, scroll the wheel, or click a card.</p>
        </>
      )}

      {el.type === 'globe' && (
        <>
          <Field label="Places (lat, lng, label)" wide>
            <textarea id="d-main-input" dir="auto" rows={5} value={str('places')} onChange={(e) => set({ places: e.target.value })} />
          </Field>
          <Field label="Add a place" wide>
            <select
              value=""
              onChange={(e) => {
                const pl = PLACES.find((x) => x.name === e.target.value)
                if (pl) set({ places: (str('places') ? str('places') + '\n' : '') + `${pl.lat}, ${pl.lng}, ${pl.name}` })
              }}
            >
              <option value="">Choose a place…</option>
              {PLACES.filter((pl) => pl.zoom > 4).map((pl) => <option key={pl.name}>{pl.name}</option>)}
            </select>
          </Field>
          <Field label="Seconds per turn"><Num value={n('speed', 40)} min={0} max={240} onChange={(v) => set({ speed: v })} /></Field>
          <div className="d-checks">
            <label><input type="checkbox" checked={p.arcs !== false} onChange={(e) => set({ arcs: e.target.checked })} /> Arcs</label>
            <label><input type="checkbox" checked={p.labels !== false} onChange={(e) => set({ labels: e.target.checked })} /> Labels</label>
          </div>
          <Field label="Color" wide><ColorPick deck={deck} value={str('color')} auto="Accent" onChange={(v) => set({ color: v.startsWith('var(') ? '' : v })} /></Field>
          <p className="d-note">The globe turns to face the first place, and arcs fly from it to the others. Drag it while presenting; 0 seconds stops the spin.</p>
        </>
      )}

      {PICTURE_LISTS.includes(el.type) && (
        <>
          <Field
            label={
              el.type === 'lenticular'
                ? 'Slides: front picture URL | back picture URL | label'
                : el.type === 'rotcards'
                  ? 'Cards: emoji or picture URL | title | subtitle'
                  : 'Pictures: picture URL | title | subtitle'
            }
            wide
          >
            <textarea id="d-main-input" dir="auto" rows={6} value={str('items')} placeholder="Leave empty for sample artwork" onChange={(e) => set({ items: e.target.value })} />
          </Field>
          <p className="d-note">One per line. A line without a picture gets generated artwork, and an empty box shows sample pictures.</p>
        </>
      )}

      {el.type === 'rotcards' && (
        <>
          <Field label="Seconds per turn"><Num value={n('speed', 20)} min={0} max={120} onChange={(v) => set({ speed: v })} /></Field>
          <Field label="Direction"><Select value={str('dir') || 'forward'} options={[{ id: 'forward', name: 'Forward' }, { id: 'reverse', name: 'Reverse' }]} onChange={(v) => set({ dir: v })} /></Field>
          <p className="d-note">While presenting: drag or scroll to spin it, click a card to bring it to the front. 0 seconds stops the spin.</p>
        </>
      )}

      {el.type === 'shadercard' && (
        <>
          <Field label="Title" wide><input id="d-main-input" dir="auto" value={str('title')} onChange={(e) => set({ title: e.target.value })} /></Field>
          <Field label="Text" wide><textarea dir="auto" rows={3} value={str('text')} onChange={(e) => set({ text: e.target.value })} /></Field>
          <Field label="Button label (empty hides it)" wide><input dir="auto" value={str('cta')} onChange={(e) => set({ cta: e.target.value })} /></Field>
          <Field label="Flame color" wide><ColorPick deck={deck} value={str('color')} auto="Accent" onChange={(v) => set({ color: v.startsWith('var(') ? '' : v })} /></Field>
          <p className="d-note">A live WebGL flame rises behind the text. While presenting, hover to tilt the card and stoke the flame.</p>
        </>
      )}

      {el.type === 'ribbon' && (
        <>
          <Field label="Path"><Select value={str('path') || 'loop'} options={[{ id: 'loop', name: 'Figure eight' }, { id: 'knot', name: 'Knot' }, { id: 'wave', name: 'Wavy ring' }]} onChange={(v) => set({ path: v })} /></Field>
          <Field label="Camera"><Select value={str('tour') || 'cycle'} options={[{ id: 'cycle', name: 'Ride, then pull back' }, { id: 'ride', name: 'Ride only' }, { id: 'overview', name: 'Whole path' }]} onChange={(v) => set({ tour: v })} /></Field>
          <Field label="Cards"><Num value={n('count', 48)} min={8} max={240} onChange={(v) => set({ count: v })} /></Field>
          <Field label="Cards per second"><Num value={n('speed', 0.6)} min={-3} max={3} step={0.1} onChange={(v) => set({ speed: v })} /></Field>
          <Field label="Thread color" wide><ColorPick deck={deck} value={str('color')} auto="Accent" onChange={(v) => set({ color: v.startsWith('var(') ? '' : v })} /></Field>
          <p className="d-note">While presenting: click a card to fly to it, press and hold to see the whole path, drag or scroll to travel.</p>
        </>
      )}

      {el.type === 'albumrail' && (
        <>
          <Field label="Seconds per cover"><Num value={n('interval', 4)} min={1} max={30} step={0.5} onChange={(v) => set({ interval: v })} /></Field>
          <div className="d-checks">
            <label><input type="checkbox" checked={p.vinyl !== false} onChange={(e) => set({ vinyl: e.target.checked })} /> Vinyl records</label>
            <label><input type="checkbox" checked={p.autoplay !== false} onChange={(e) => set({ autoplay: e.target.checked })} /> Autoplay</label>
          </div>
          <p className="d-note">While presenting: drag, scroll or use the ruler. Click the centre cover to slide its record out and spin it.</p>
        </>
      )}

      {el.type === 'reel' && (
        <>
          <Field label="Autoplay"><Select value={str('mode') || 'sweep'} options={[{ id: 'sweep', name: 'Sweep across' }, { id: 'cycle', name: 'Open each in turn' }, { id: 'off', name: 'Off' }]} onChange={(v) => set({ mode: v })} /></Field>
          <p className="d-note">While presenting: hover to magnify, click a bar to open its picture, click again to close.</p>
        </>
      )}

      {el.type === 'sticker' && (
        <>
          <Field label="Picture" wide>
            <input
              id="d-main-input"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void readImage(f).then((src) => set({ src }))
              }}
            />
          </Field>
          {str('src') ? (
            <Field label="Picture"><button className="btn" onClick={(e) => { e.preventDefault(); set({ src: '' }) }}>Use sample art</button></Field>
          ) : (
            <Field label="Sample art"><Num value={n('art', 1)} min={0} max={11} onChange={(v) => set({ art: v })} /></Field>
          )}
          <Field label="Finish"><Select value={str('finish') || 'gloss'} options={[{ id: 'gloss', name: 'Gloss' }, { id: 'matte', name: 'Matte' }, { id: 'holo', name: 'Holographic' }]} onChange={(v) => set({ finish: v })} /></Field>
          <Field label="Shape"><Select value={str('shape') || 'rounded'} options={[{ id: 'rounded', name: 'Rounded' }, { id: 'circle', name: 'Circle' }]} onChange={(v) => set({ shape: v })} /></Field>
          <Field label="Angle"><Num value={n('rotation', -6)} min={-45} max={45} onChange={(v) => set({ rotation: v })} /></Field>
          <Field label="White border"><Num value={n('border', 8)} min={0} max={40} onChange={(v) => set({ border: v })} /></Field>
          <p className="d-note">While presenting: pick it up and throw it around the slide, or hover a corner to peel it.</p>
        </>
      )}

      {el.type === 'bend' && (
        <>
          <Field label="Direction"><Select value={str('orientation') || 'vertical'} options={[{ id: 'vertical', name: 'Up and down' }, { id: 'horizontal', name: 'Sideways' }]} onChange={(v) => set({ orientation: v })} /></Field>
          <Field label="Drift (px per second)"><Num value={n('drift', 50)} min={-300} max={300} onChange={(v) => set({ drift: v })} /></Field>
          <p className="d-note">While presenting: drag or scroll fast and the strip bends like a lens. 0 drift makes it snap to each picture.</p>
        </>
      )}

      {el.type === 'depthcard' && (
        <>
          <Field label="Title" wide><input id="d-main-input" dir="auto" value={str('title')} onChange={(e) => set({ title: e.target.value })} /></Field>
          <Field label="Text" wide><textarea dir="auto" rows={3} value={str('text')} onChange={(e) => set({ text: e.target.value })} /></Field>
          <Field label="Picture" wide>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void readImage(f).then((src) => set({ src }))
              }}
            />
          </Field>
          {str('src') && <Field label="Picture"><button className="btn" onClick={(e) => { e.preventDefault(); set({ src: '' }) }}>Use sample art</button></Field>}
          <p className="d-note">While presenting: the card tilts toward the pointer, its layers drift apart and a spotlight follows.</p>
        </>
      )}

      {el.type === 'lenticular' && (
        <>
          <div className="d-checks">
            <label><input type="checkbox" checked={!!p.loop} onChange={(e) => set({ loop: e.target.checked })} /> Loop around</label>
          </div>
          <p className="d-note">While presenting: move across the centre slide and it flips, rib by rib, to its back picture. Drag or use the arrows to move.</p>
        </>
      )}

      {el.type === 'textpath' && (
        <>
          <Field label="Text" wide><input id="d-main-input" dir="auto" value={str('text')} onChange={(e) => set({ text: e.target.value })} /></Field>
          <Field label="Path"><Select value={str('path') || 'wave'} options={[{ id: 'wave', name: 'Wave' }, { id: 'circle', name: 'Circle' }, { id: 'loop', name: 'Figure eight' }, { id: 'arch', name: 'Arch' }]} onChange={(v) => set({ path: v })} /></Field>
          <Field label="Size"><Num value={n('size', 30)} min={8} max={160} onChange={(v) => set({ size: v })} /></Field>
          <Field label="Seconds per lap"><Num value={n('speed', 18)} min={0} max={240} onChange={(v) => set({ speed: v })} /></Field>
          <div className="d-checks">
            <label><input type="checkbox" checked={!!p.reversed} onChange={(e) => set({ reversed: e.target.checked })} /> Reverse</label>
          </div>
          <Field label="Color" wide><ColorPick deck={deck} value={str('color')} auto="Theme" onChange={(v) => set({ color: v })} /></Field>
          <p className="d-note">End the text with a separator like • so it loops nicely. 0 seconds keeps it still.</p>
        </>
      )}

      {el.type === 'cursor' && (
        <>
          <Field label="Wraps around"><Select value={str('targets') || 'cards'} options={[{ id: 'cards', name: 'Buttons and cards' }, { id: 'buttons', name: 'Buttons only' }, { id: 'none', name: 'Nothing' }]} onChange={(v) => set({ targets: v })} /></Field>
          <Field label="Ring size"><Num value={n('size', 40)} min={12} max={160} onChange={(v) => set({ size: v })} /></Field>
          <div className="d-checks">
            <label><input type="checkbox" checked={p.elastic !== false} onChange={(e) => set({ elastic: e.target.checked })} /> Stretch when moving</label>
          </div>
          <Field label="Color" wide><ColorPick deck={deck} value={str('color')} auto="Theme" onChange={(v) => set({ color: v.startsWith('var(') ? '' : v })} /></Field>
          <p className="d-note">Replaces the pointer on this whole slide while presenting. The dashed circle only shows here in the editor.</p>
        </>
      )}

      {el.type === 'pills' && (
        <>
          <Field label="Labels (separate with |)" wide><input id="d-main-input" dir="auto" value={str('items')} onChange={(e) => set({ items: e.target.value })} /></Field>
          <Field label="Pill height"><Num value={n('size', 64)} min={24} max={160} onChange={(v) => set({ size: v })} /></Field>
          <Field label="Drift with pointer"><Num value={n('strength', 24)} min={0} max={80} onChange={(v) => set({ strength: v })} /></Field>
          <div className="d-checks">
            <label><input type="checkbox" checked={p.extras !== false} onChange={(e) => set({ extras: e.target.checked })} /> Background pills</label>
          </div>
          <p className="d-note">The pills drop in with a bounce each time the slide is shown, then drift with the pointer.</p>
        </>
      )}

      {el.type === 'circle' && (
        <>
          <Field label="Text" wide><input id="d-main-input" dir="auto" value={str('text')} onChange={(e) => set({ text: e.target.value })} /></Field>
          <Field label="Color" wide><ColorPick deck={deck} value={str('color')} auto="Theme" onChange={(v) => set({ color: v })} /></Field>
          <p className="d-note">The text goes around the circle once; end it with a separator like • so it loops nicely.</p>
        </>
      )}

      {el.type === 'image' && (
        <>
          <Field label="Picture" wide>
            <input
              id="d-main-input"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void readImage(f).then((src) => set({ src }))
              }}
            />
          </Field>
          <Field label="Fit"><Select value={str('fit') || 'cover'} options={[{ id: 'cover', name: 'Fill (crop)' }, { id: 'contain', name: 'Fit whole picture' }]} onChange={(v) => set({ fit: v })} /></Field>
          <Field label="Corners"><Num value={n('radius', 16)} min={0} max={400} onChange={(v) => set({ radius: v })} /></Field>
        </>
      )}

      {el.type === 'shape' && (
        <>
          <Field label="Shape">
            <Select value={str('shape') || 'rect'} options={[{ id: 'rect', name: 'Rectangle' }, { id: 'circle', name: 'Circle' }, { id: 'pill', name: 'Pill' }]} onChange={(v) => set({ shape: v })} />
          </Field>
          {str('shape') === 'rect' && <Field label="Corners"><Num value={n('radius', 20)} min={0} max={400} onChange={(v) => set({ radius: v })} /></Field>}
          <Field label="Opacity"><input type="range" min={0.05} max={1} step={0.05} value={n('opacity', 1)} onChange={(e) => set({ opacity: Number(e.target.value) })} /></Field>
          <Field label="Fill" wide><ColorPick deck={deck} value={str('fill')} auto="Accent" onChange={(v) => set({ fill: v })} /></Field>
        </>
      )}

      {el.type === 'button' && (
        <>
          <Field label="Label" wide><input id="d-main-input" dir="auto" value={str('text')} onChange={(e) => set({ text: e.target.value })} /></Field>
          <Field label="Style"><Select value={str('variant') || 'solid'} options={[{ id: 'solid', name: 'Filled' }, { id: 'ghost', name: 'Outline' }]} onChange={(v) => set({ variant: v })} /></Field>
        </>
      )}

      {el.type === 'icon' && (
        <Field label="Emoji" wide>
          <input id="d-main-input" value={str('emoji')} onChange={(e) => set({ emoji: e.target.value })} />
          <div className="d-emojis">
            {['🚀', '📈', '💡', '✅', '⭐', '🎯', '🔒', '⚡', '🌍', '🤝', '📊', '🏆', '💰', '🧠', '📱', '❤️'].map((em) => (
              <button key={em} onClick={(e) => { e.preventDefault(); set({ emoji: em }) }}>{em}</button>
            ))}
          </div>
        </Field>
      )}

      {el.type === 'chart' && (
        <>
          <Field label="Title" wide><input dir="auto" value={str('title')} placeholder="Optional" onChange={(e) => set({ title: e.target.value })} /></Field>
          <Field label="Chart type"><Select value={str('chartType') || 'bar'} options={CHART_TYPES} onChange={(v) => set({ chartType: v })} /></Field>
          <Field label="Data" wide><DataGrid value={str('data')} firstRowLabel="Series" onChange={(v) => set({ data: v })} /></Field>
          <div className="d-checks">
            <label><input type="checkbox" checked={p.legend !== false} onChange={(e) => set({ legend: e.target.checked })} /> Legend</label>
            <label><input type="checkbox" checked={!!p.card} onChange={(e) => set({ card: e.target.checked })} /> Card</label>
            {['bar', 'hbar', 'line', 'area'].includes(str('chartType') || 'bar') && (
              <label><input type="checkbox" checked={!!p.stacked} onChange={(e) => set({ stacked: e.target.checked })} /> Stacked</label>
            )}
          </div>
          <p className="d-note">First row: series names. First column: labels. Hover the chart while presenting to see values.</p>
        </>
      )}

      {el.type === 'map' && (
        <>
          <Field label="Go to" wide>
            <select
              value=""
              onChange={(e) => {
                const pl = PLACES.find((x) => x.name === e.target.value)
                if (pl) set({ lat: pl.lat, lng: pl.lng, zoom: pl.zoom })
              }}
            >
              <option value="">Choose a place…</option>
              {PLACES.map((pl) => <option key={pl.name}>{pl.name}</option>)}
            </select>
          </Field>
          <button className="btn accent d-wide-btn" onClick={(e) => { e.preventDefault(); onMoveMap() }}>Move the map by hand…</button>
          <Field label="Zoom"><Num value={n('zoom', 11)} min={1} max={19} step={0.5} onChange={(v) => set({ zoom: v })} /></Field>
          <Field label="Style"><Select value={str('style') || 'auto'} options={[{ id: 'auto', name: 'Match theme' }, { id: 'light', name: 'Light' }, { id: 'dark', name: 'Dark' }, { id: 'streets', name: 'Streets' }, { id: 'satellite', name: 'Satellite' }]} onChange={(v) => set({ style: v })} /></Field>
          <Field label="Pins (lat, lng, label)" wide>
            <textarea rows={3} dir="ltr" value={str('markers')} onChange={(e) => set({ markers: e.target.value })} />
          </Field>
          <button
            className="btn d-wide-btn"
            onClick={(e) => {
              e.preventDefault()
              set({ markers: (str('markers') ? str('markers') + '\n' : '') + `${n('lat', 0)}, ${n('lng', 0)}, Pin` })
            }}
          >
            + Pin at the map center
          </button>
          <p className="d-note">Maps need internet to load. Double-click the map on the slide to move it.</p>
        </>
      )}

      {el.type === 'table' && (
        <>
          <Field label="Cells" wide><DataGrid value={str('data')} firstRowLabel="Header" onChange={(v) => set({ data: v })} /></Field>
          <div className="d-checks">
            <label><input type="checkbox" checked={p.header !== false} onChange={(e) => set({ header: e.target.checked })} /> Header row</label>
            <label><input type="checkbox" checked={!!p.card} onChange={(e) => set({ card: e.target.checked })} /> Card</label>
          </div>
        </>
      )}

      {el.type === 'kpi' && (
        <>
          <Field label="Label" wide><input id="d-main-input" dir="auto" value={str('label')} onChange={(e) => set({ label: e.target.value })} /></Field>
          <Field label="Value"><input dir="auto" value={str('value')} onChange={(e) => set({ value: e.target.value })} /></Field>
          <Field label="Change"><input dir="auto" value={str('delta')} placeholder="+12%" onChange={(e) => set({ delta: e.target.value })} /></Field>
          <Field label="Direction">
            <Select value={p.up === false ? 'down' : 'up'} options={[{ id: 'up', name: 'Up' }, { id: 'down', name: 'Down' }]} onChange={(v) => set({ up: v === 'up' })} />
          </Field>
          <Field label="Color">
            <Select value={str('tone') || 'auto'} options={[{ id: 'auto', name: 'By direction' }, { id: 'good', name: 'Good (green)' }, { id: 'bad', name: 'Bad (red)' }]} onChange={(v) => set({ tone: v === 'auto' ? '' : v })} />
          </Field>
        </>
      )}

      {['kpi', 'shape', 'image', 'button', 'icon', 'chart', 'table'].includes(el.type) && (
        <Field label="Hover effect" wide><Select value={str('hover')} options={HOVER_EFFECTS} onChange={(v) => set({ hover: v })} /></Field>
      )}

      <div className="d-section">Position and size</div>
      <div className="d-geo">
        <Field label="X"><Num value={el.x} onChange={(v) => onChange({ x: v })} /></Field>
        <Field label="Y"><Num value={el.y} onChange={(v) => onChange({ y: v })} /></Field>
        <Field label="W"><Num value={el.w} min={20} onChange={(v) => onChange({ w: Math.max(20, v) })} /></Field>
        <Field label="H"><Num value={el.h} min={20} onChange={(v) => onChange({ h: Math.max(20, v) })} /></Field>
      </div>
      <Field label="Animation"><Select value={el.anim ?? ''} options={ANIMATIONS} onChange={(v) => onChange({ anim: v })} /></Field>
      <Field label="Delay (s)"><Num value={el.delay ?? 0} min={0} max={10} step={0.1} onChange={(v) => onChange({ delay: v })} /></Field>
    </fieldset>
  )
}

/** Settings for the slide itself, shown when no component is selected. */
function SlidePanel({ slide, readOnly, onChange }: { slide: Slide; readOnly: boolean; onChange: (patch: Partial<Slide>) => void }) {
  const classes = (slide.className ?? '').split(/\s+/).filter(Boolean)
  const bgIds = BACKGROUNDS.map((b) => b.id).filter(Boolean)
  const current = classes.find((c) => bgIds.includes(c)) ?? ''
  const noise = classes.includes('bg-noise')
  const save = (next: string[]): void => onChange({ className: next.join(' ') || undefined })
  return (
    <fieldset className="d-slide" disabled={readOnly}>
      <h4>Slide</h4>
      <Field label="Animated background" wide>
        <Select value={current} options={BACKGROUNDS} onChange={(v) => save([...classes.filter((c) => !bgIds.includes(c)), ...(v ? [v] : [])])} />
      </Field>
      <label className="d-checks">
        <input type="checkbox" checked={noise} onChange={(e) => save(e.target.checked ? [...classes, 'bg-noise'] : classes.filter((c) => c !== 'bg-noise'))} />
        Film grain
      </label>
    </fieldset>
  )
}

// ---------- Ready-made slides ----------

/** "New slide" picker: ready-made layouts drawn in the deck's own theme. */
export function LayoutPicker({ deck, onPick, onClose }: { deck: Deck; onPick: (slide: Omit<Slide, 'id'>) => void; onClose: () => void }) {
  const rtl = deck.slides.filter(isRtlSlide).length * 2 > deck.slides.length
  const made = useMemo(() => LAYOUTS.map((l) => ({ layout: l, elements: l.make() })), [])
  const previews = useMemo(
    (): Deck => ({ ...deck, slides: made.map((m, i) => ({ id: 'layout-' + i, html: '', className: rtl ? 'rtl' : undefined, elements: m.elements })) }),
    [deck, made, rtl]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onPointerDown={onClose}>
      <div className="layout-picker" onPointerDown={(e) => e.stopPropagation()}>
        <div className="layout-head">
          <h3>New slide</h3>
          <span className="muted small">Pick a ready-made layout, then drag things around and edit them.</span>
          <button className="icon-btn" onClick={onClose} title="Close">×</button>
        </div>
        <div className="layout-grid">
          {made.map((m, i) => (
            <button
              key={m.layout.id}
              className="layout-card"
              onClick={() => onPick({ html: '', className: rtl ? 'rtl' : undefined, elements: m.layout.make() })}
            >
              <SlideFrame deck={previews} index={i} width={220} />
              <span>{m.layout.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
