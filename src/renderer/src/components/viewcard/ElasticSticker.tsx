import { useRef, type CSSProperties } from 'react'
import { SAMPLES, clamp, reducedMotion, spr, spring, useFrame } from './shared'

type Corner = 'tl' | 'tr' | 'br' | 'bl'

interface Props {
  src?: string
  alt?: string
  width?: number
  /** Height in pixels. Defaults to square. */
  height?: number
  radius?: number
  /** White border width in pixels. */
  border?: number
  borderColor?: string
  /** Colour of the back, seen when a corner curls. */
  backColor?: string
  sheenColor?: string
  finish?: 'gloss' | 'matte' | 'holo'
  sheen?: number
  /** Resting angle in degrees. */
  rotation?: number
  /** How far it rises toward the viewer while held (px). */
  lift?: number
  /** Maximum lean in degrees during fast moves. */
  tilt?: number
  /** How long it wobbles after stopping (0..1). */
  elasticity?: number
  shadow?: number
  /** Hover curl of the nearest corner (0 disables). */
  hoverPeel?: number
  /** Now and then lifts a corner to show it can be peeled. */
  idleHint?: boolean
  draggable?: boolean
  bounds?: 'parent' | 'none'
  snapBack?: boolean
  raiseOnDrag?: boolean
  defaultPosition?: { x: number; y: number }
  onDragEnd?: (pos: { x: number; y: number }) => void
  className?: string
  style?: CSSProperties
}

let topZ = 10

const clipFor = (c: Corner, W: number, H: number, f: number): string => {
  if (f < 0.5) return 'none'
  const P = (pts: number[][]): string => `polygon(${pts.map(([x, y]) => `${x}px ${y}px`).join(',')})`
  if (c === 'tr') return P([[0, 0], [W - f, 0], [W, f], [W, H], [0, H]])
  if (c === 'tl') return P([[f, 0], [W, 0], [W, H], [0, H], [0, f]])
  if (c === 'br') return P([[0, 0], [W, 0], [W, H - f], [W - f, H], [0, H]])
  return P([[0, 0], [W, 0], [W, H], [f, H], [0, H - f]])
}

// The folded-over corner is the cut-off triangle mirrored across the fold line.
const FLAP: Record<Corner, { tri: string; grad: string; at: (W: number, H: number, f: number) => [number, number] }> = {
  tr: { tri: 'polygon(0 0, 100% 100%, 0 100%)', grad: 'to bottom left', at: (W, _H, f) => [W - f, 0] },
  tl: { tri: 'polygon(100% 0, 0 100%, 100% 100%)', grad: 'to bottom right', at: () => [0, 0] },
  br: { tri: 'polygon(100% 0, 0 100%, 0 0)', grad: 'to top left', at: (W, H, f) => [W - f, H - f] },
  bl: { tri: 'polygon(0 0, 100% 100%, 100% 0)', grad: 'to top right', at: (_W, H, f) => [0, H - f] }
}

/** A sticker you can pick up and throw around. It lifts, leans with speed, wobbles to a stop, and its corner curls on hover. */
export function ElasticSticker({
  src = SAMPLES[1].src,
  alt = 'Sticker',
  width = 180,
  height,
  radius = 20,
  border = 8,
  borderColor = '#FFFFFF',
  backColor = '#E9E7EF',
  sheenColor = '#FFFFFF',
  finish = 'gloss',
  sheen = 0.6,
  rotation = 0,
  lift = 80,
  tilt = 28,
  elasticity = 0.5,
  shadow = 0.5,
  hoverPeel = 0.5,
  idleHint = true,
  draggable = true,
  bounds = 'parent',
  snapBack = false,
  raiseOnDrag = true,
  defaultPosition = { x: 0, y: 0 },
  onDragEnd,
  className = '',
  style
}: Props) {
  const W = width, H = height ?? width
  const root = useRef<HTMLDivElement>(null)
  const shadowEl = useRef<HTMLDivElement>(null)
  const tiltEl = useRef<HTMLDivElement>(null)
  const clipEl = useRef<HTMLDivElement>(null)
  const flapBox = useRef<HTMLDivElement>(null)
  const flap = useRef<HTMLDivElement>(null)
  const gloss = useRef<HTMLDivElement>(null)
  const still = reducedMotion()
  const st = useRef({
    x: spr(defaultPosition.x), y: spr(defaultPosition.y), gx: defaultPosition.x, gy: defaultPosition.y,
    lift: spr(0), rx: spr(0), ry: spr(0), peel: spr(0), peelGoal: 0, corner: 'tr' as Corner,
    held: false, hover: false, ox: 0, oy: 0, vx: 0, vy: 0, lastX: 0, lastY: 0, lastT: 0,
    idle: 0, hint: 0, z: 1
  })

  const limits = (): { x0: number; x1: number; y0: number; y1: number } | null => {
    const el = root.current
    const parent = el?.offsetParent as HTMLElement | null
    if (!el || !parent || bounds === 'none') return null
    return { x0: -el.offsetLeft, x1: parent.clientWidth - el.offsetLeft - W, y0: -el.offsetTop, y1: parent.clientHeight - el.offsetTop - H }
  }
  const rubber = (v: number, a: number, b: number): number => (v < a ? a - (a - v) * 0.3 : v > b ? b + (v - b) * 0.3 : v)

  useFrame((dt) => {
    const s = st.current
    const k = 300, damp = 2 * Math.sqrt(k) * (1 - elasticity * 0.8)
    if (!s.held) {
      spring(s.x, s.gx, 160, 22, dt)
      spring(s.y, s.gy, 160, 22, dt)
      s.vx *= Math.pow(0.001, dt)
      s.vy *= Math.pow(0.001, dt)
    }
    const lf = spring(s.lift, s.held ? 1 : 0, 220, 20, dt)
    const rx = spring(s.rx, clamp(-s.vy * 0.03, -tilt, tilt), k, damp, dt)
    const ry = spring(s.ry, clamp(s.vx * 0.03, -tilt, tilt), k, damp, dt)
    // Idle hint: now and then lift a corner.
    s.idle += dt
    if (idleHint && !still && !s.held && !s.hover) {
      s.hint -= dt
      if (s.idle > 3.5 && s.hint <= 0) {
        s.hint = 4 + Math.random() * 3
        s.corner = (['tr', 'br', 'tl', 'bl'] as Corner[])[Math.floor(Math.random() * 4)]
        s.peelGoal = 0.2
        window.setTimeout(() => (st.current.hover || st.current.held ? null : (st.current.peelGoal = 0)), 700)
      }
    }
    const f = Math.max(0, spring(s.peel, s.peelGoal * Math.min(W, H), 180, 16, dt))

    const sc = 1 + lf * (lift / 1000)
    if (root.current) root.current.style.transform = `translate3d(${s.x.x}px, ${s.y.x}px, 0) rotate(${rotation}deg)`
    if (tiltEl.current) tiltEl.current.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${sc})`
    if (shadowEl.current) {
      const a = 0.18 + shadow * 0.35 - lf * 0.1
      shadowEl.current.style.filter = `drop-shadow(${ry * 0.4}px ${3 + lf * lift * 0.35}px ${4 + lf * lift * 0.4}px rgba(0,0,0,${a}))`
    }
    if (clipEl.current) clipEl.current.style.clipPath = clipFor(s.corner, W, H, f)
    if (flapBox.current && flap.current) {
      const fl = FLAP[s.corner]
      const [fx, fy] = fl.at(W, H, f)
      flapBox.current.style.display = f < 0.5 ? 'none' : 'block'
      flapBox.current.style.left = `${fx}px`
      flapBox.current.style.top = `${fy}px`
      flapBox.current.style.width = flapBox.current.style.height = `${f}px`
      flap.current.style.clipPath = fl.tri
      flap.current.style.background = `linear-gradient(${fl.grad}, #fff 0%, ${backColor} 50%, ${backColor} 62%, #b9b6c4 100%)`
    }
    if (gloss.current) {
      const shift = 50 + ry * 2.2 - rx * 1.2 + f * 0.25
      gloss.current.style.backgroundPosition = `${shift}% ${50 + rx * 2}%`
    }
  })

  const nearestCorner = (lx: number, ly: number): [Corner, number] => {
    const c: Corner = ly < H / 2 ? (lx < W / 2 ? 'tl' : 'tr') : lx < W / 2 ? 'bl' : 'br'
    const cx = c[1] === 'l' ? 0 : W, cy = c[0] === 't' ? 0 : H
    const close = clamp(1 - Math.hypot(lx - cx, ly - cy) / (Math.min(W, H) * 0.75), 0, 1)
    return [c, close]
  }

  const sheenBg =
    finish === 'holo'
      ? 'linear-gradient(115deg, #ff0080, #ffd000, #00ff9c, #00c8ff, #8a2bff, #ff0080)'
      : `linear-gradient(115deg, transparent 35%, ${sheenColor} 50%, transparent 65%)`

  return (
    <div
      ref={root}
      className={`vc-sticker ${className}`}
      style={{ width: W, height: H, touchAction: 'none', cursor: draggable ? 'grab' : undefined, ...style }}
      tabIndex={draggable ? 0 : -1}
      role="img"
      aria-label={alt}
      onKeyDown={(e) => {
        if (!draggable) return
        const s = st.current
        const step = e.shiftKey ? 40 : 12
        const m: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
        const d = m[e.key]
        if (!d) return
        e.preventDefault()
        const L = limits()
        s.gx = L ? clamp(s.gx + d[0], L.x0, L.x1) : s.gx + d[0]
        s.gy = L ? clamp(s.gy + d[1], L.y0, L.y1) : s.gy + d[1]
        s.vx = d[0] * 30
        s.vy = d[1] * 30
        onDragEnd?.({ x: s.gx, y: s.gy })
      }}
      onPointerEnter={() => (st.current.hover = true)}
      onPointerLeave={() => {
        const s = st.current
        s.hover = false
        if (!s.held) s.peelGoal = 0
      }}
      onPointerDown={(e) => {
        if (!draggable) return
        const s = st.current
        s.held = true
        s.idle = 0
        s.ox = e.clientX - s.x.x
        s.oy = e.clientY - s.y.x
        s.lastX = e.clientX
        s.lastY = e.clientY
        s.lastT = performance.now()
        s.peelGoal = 0.06
        if (raiseOnDrag && root.current) root.current.style.zIndex = String(++topZ)
        e.currentTarget.style.cursor = 'grabbing'
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        const s = st.current
        s.idle = 0
        if (!s.held) {
          if (hoverPeel <= 0) return
          const r = tiltEl.current!.getBoundingClientRect()
          const [c, close] = nearestCorner(((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H)
          if (c !== s.corner && s.peel.x > 4) {
            s.peelGoal = 0
            return
          }
          s.corner = c
          s.peelGoal = hoverPeel * (0.08 + 0.3 * close)
          return
        }
        const now = performance.now()
        const dtm = Math.max(1, now - s.lastT) / 1000
        s.vx = s.vx * 0.6 + ((e.clientX - s.lastX) / dtm) * 0.4
        s.vy = s.vy * 0.6 + ((e.clientY - s.lastY) / dtm) * 0.4
        s.lastX = e.clientX
        s.lastY = e.clientY
        s.lastT = now
        let nx = e.clientX - s.ox, ny = e.clientY - s.oy
        const L = limits()
        if (L) {
          nx = rubber(nx, L.x0, L.x1)
          ny = rubber(ny, L.y0, L.y1)
        }
        s.x.x = s.gx = nx
        s.y.x = s.gy = ny
        s.x.v = s.y.v = 0
      }}
      onPointerUp={(e) => {
        const s = st.current
        if (!s.held) return
        s.held = false
        s.peelGoal = 0
        e.currentTarget.style.cursor = 'grab'
        const L = limits()
        if (snapBack) {
          s.gx = defaultPosition.x
          s.gy = defaultPosition.y
        } else if (L) {
          s.gx = clamp(s.gx, L.x0, L.x1)
          s.gy = clamp(s.gy, L.y0, L.y1)
        }
        onDragEnd?.({ x: s.gx, y: s.gy })
      }}
    >
      <div ref={shadowEl} className="vc-sticker-shadow">
        <div ref={tiltEl} className="vc-sticker-tilt">
          <div ref={clipEl} className="vc-sticker-clip">
            <div
              className="vc-sticker-face"
              style={{ borderRadius: radius, border: `${border}px solid ${borderColor}`, backgroundImage: `url("${src}")` }}
            >
              {finish !== 'matte' && (
                <div
                  ref={gloss}
                  className={`vc-sticker-gloss ${finish}`}
                  style={{ backgroundImage: sheenBg, opacity: finish === 'holo' ? sheen * 0.55 : sheen * 0.45, borderRadius: Math.max(0, radius - border) }}
                />
              )}
            </div>
          </div>
          <div ref={flapBox} className="vc-sticker-flapbox">
            <div ref={flap} className="vc-sticker-flap" />
          </div>
        </div>
      </div>
    </div>
  )
}
