import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { SAMPLES, clamp, lerp, loadImage, reducedMotion, smooth, spr, spring, useFrame, useSize, useWheel } from './shared'

interface Item {
  src: string
  alt?: string
  title?: string
  subtitle?: string
}

type PathKind = 'loop' | 'knot' | 'wave'
type Tour = 'cycle' | 'ride' | 'overview'

interface Props {
  items?: Item[]
  /** Number of cards along the path. */
  count?: number
  path?: PathKind
  tour?: Tour
  /** Seconds of riding between pull-backs (cycle tour). */
  interval?: number
  /** Cards per second. Negative rides backwards. */
  speed?: number
  /** Card height as a fraction of card spacing. */
  cardSize?: number
  /** Card width divided by height. */
  aspect?: number
  /** Corner rounding, 0..1. */
  radius?: number
  fov?: number
  fog?: number
  /** Opacity of the line through the cards. */
  thread?: number
  shadow?: number
  accentColor?: string
  backgroundColor?: string
  focusOnClick?: boolean
  holdToReveal?: boolean
  captions?: boolean
  draggable?: boolean
  wheel?: boolean
  pauseOnHover?: boolean
  paused?: boolean
  dpr?: number
  children?: ReactNode
  className?: string
}

type V3 = [number, number, number]
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k]
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}
const mix3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]

/** Unit-sized paths, s in [0, 1). */
function rawPath(kind: PathKind, s: number): V3 {
  const t = s * Math.PI * 2
  if (kind === 'knot') {
    const x = Math.sin(t) + 2 * Math.sin(2 * t), y = Math.cos(t) - 2 * Math.cos(2 * t)
    return [x / 3, (-Math.sin(3 * t) / 3) * 0.9, y / 3]
  }
  if (kind === 'wave') return [Math.cos(t), 0.22 * Math.sin(4 * t), Math.sin(t)]
  // A figure-eight that passes over itself.
  return [Math.sin(t), 0.32 * Math.cos(t), Math.sin(t) * Math.cos(t) * 1.15]
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, Math.max(0, r))
}

/** Image cards winding along a 3D path while the camera rides it. Click a card to fly to it; press and hold to see the whole path. */
export function DepthRibbon({
  items = SAMPLES,
  count = 48,
  path = 'loop',
  tour = 'cycle',
  interval = 9,
  speed = 0.6,
  cardSize = 0.72,
  aspect = 1,
  radius = 0.12,
  fov = 60,
  fog = 1,
  thread = 0.3,
  shadow = 0.5,
  accentColor = '#B19EEF',
  backgroundColor = 'transparent',
  focusOnClick = true,
  holdToReveal = true,
  captions = true,
  draggable = true,
  wheel = false,
  pauseOnHover = true,
  paused = false,
  dpr = 2,
  children,
  className = ''
}: Props) {
  const root = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const kids = useRef<HTMLDivElement>(null)
  const [, size] = useSize(root)
  const [focused, setFocused] = useState(-1)
  const imgs = useRef<(HTMLImageElement | null)[]>([])
  const n = Math.min(240, Math.max(4, Math.round(count)))
  const still = reducedMotion()

  useEffect(() => {
    imgs.current = items.map(() => null)
    items.forEach((it, i) => void loadImage(it.src).then((im) => (imgs.current[i] = im)))
  }, [items])

  // Scale the path so cards sit one unit apart.
  const geo = useMemo(() => {
    let len = 0
    let prev = rawPath(path, 0)
    let ext = 0
    for (let i = 1; i <= 600; i++) {
      const p = rawPath(path, i / 600)
      len += Math.hypot(...sub(p, prev))
      ext = Math.max(ext, Math.abs(p[0]), Math.abs(p[1]), Math.abs(p[2]))
      prev = p
    }
    const k = n / len
    return { k, ext: ext * k }
  }, [path, n])

  const pt = (s: number): V3 => mul(rawPath(path, ((s % 1) + 1) % 1), geo.k)
  const order = useMemo(() => {
    // Shuffle the images in passes so neighbours differ.
    const out: number[] = []
    let seed = 7
    while (out.length < n) {
      const pass = items.map((_, i) => i)
      for (let i = pass.length - 1; i > 0; i--) {
        seed = (seed * 16807) % 2147483647
        const j = seed % (i + 1)
        ;[pass[i], pass[j]] = [pass[j], pass[i]]
      }
      out.push(...pass)
    }
    return out.slice(0, n)
  }, [items, n])

  const st = useRef({
    u: 0, vel: 0, m: spr(tour === 'overview' ? 1 : 0), mGoal: tour === 'overview' ? 1 : 0, clock: 0, ang: 0,
    hover: -1, focus: -1, lastFocus: 0, fo: spr(0), goalU: null as number | null,
    down: false, downX: 0, downY: 0, lastY: 0, lastX: 0, moved: 0, holdT: 0, revealing: false, downAt: -1,
    rects: [] as { i: number; x: number; y: number; w: number; h: number }[]
  })

  useWheel(root, wheel, (dy) => {
    const s = st.current
    if (s.focus >= 0) return
    s.vel += dy * 0.01
  })

  useFrame((dt) => {
    const c = canvas.current
    const s = st.current
    const { w: W, h: H } = size.current
    if (!c || !W || !H) return
    const ratio = Math.min(dpr, window.devicePixelRatio || 1)
    if (c.width !== Math.round(W * ratio)) c.width = Math.round(W * ratio)
    if (c.height !== Math.round(H * ratio)) c.height = Math.round(H * ratio)
    const ctx = c.getContext('2d')!
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)

    // ---- Motion ----
    const stop = paused || still || s.focus >= 0 || (pauseOnHover && s.hover >= 0) || s.down
    if (s.goalU !== null) {
      s.u += (s.goalU - s.u) * Math.min(1, dt * 3.5)
    } else {
      if (!stop) s.u += speed * dt
      s.u += s.vel * dt
      s.vel *= Math.pow(0.08, dt)
    }
    if (tour === 'cycle' && !stop && s.goalU === null) {
      s.clock += dt
      const phase = s.clock % (interval + 4)
      s.mGoal = phase > interval ? 1 : 0
    } else if (tour === 'ride') s.mGoal = 0
    else if (tour === 'overview') s.mGoal = 1
    if (s.revealing) s.mGoal = 1
    if (s.focus >= 0) s.mGoal = 0
    const mm = smooth(clamp(spring(s.m, s.mGoal, 9, 6, dt), 0, 1))
    if (!s.revealing) s.ang += dt * 0.12

    // ---- Camera ----
    const up: V3 = [0, 1, 0]
    const cs = s.u / n
    const p0 = pt(cs)
    const tg = norm(sub(pt(cs + 0.002), p0))
    let side = cross(tg, up)
    side = Math.hypot(...side) < 1e-3 ? [1, 0, 0] : norm(side)
    // Ride a little behind, above and beside the path, so cards stream past off-centre.
    const rideP = add(add(sub(p0, mul(tg, 2.2)), mul(up, 0.75)), mul(side, 0.75))
    let rideT = add(pt(cs + 3 / n), mul(up, 0.05))
    // While a card is focused, turn to look straight at it.
    const fo = spring(s.fo, s.focus >= 0 ? 1 : 0, 30, 11, dt)
    if (s.focus >= 0 || fo > 0.001) rideT = mix3(rideT, pt((s.focus >= 0 ? s.focus : s.lastFocus) / n), clamp(fo, 0, 1))
    const D = geo.ext * 1.45
    const overP: V3 = [Math.sin(s.ang) * D, D * 0.55, Math.cos(s.ang) * D]
    const P = mix3(rideP, overP, mm)
    const T = mix3(rideT, [0, 0, 0], mm)
    const f = norm(sub(T, P))
    const r = norm(cross(f, up))
    const uu = cross(r, f)
    const focal = H / 2 / Math.tan(((fov * Math.PI) / 180) / 2)
    const project = (X: V3): [number, number, number] => {
      const d = sub(X, P)
      const z = dot(d, f)
      return [W / 2 + (dot(d, r) / z) * focal, H / 2 - (dot(d, uu) / z) * focal, z]
    }

    // ---- Draw ----
    ctx.clearRect(0, 0, W, H)
    if (backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, W, H)
    }
    const fogK = fog * 0.05 * (1 - mm * 0.75)
    if (thread > 0) {
      ctx.strokeStyle = accentColor
      ctx.lineWidth = 1.2
      ctx.globalAlpha = thread
      ctx.beginPath()
      let pen = false
      for (let i = 0; i <= 500; i++) {
        const [x, y, z] = project(pt(i / 500))
        if (z < 0.2) {
          pen = false
          continue
        }
        if (pen) ctx.lineTo(x, y)
        else ctx.moveTo(x, y)
        pen = true
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    const list: { i: number; x: number; y: number; z: number }[] = []
    for (let i = 0; i < n; i++) {
      const [x, y, z] = project(pt(i / n))
      if (z > 0.25) list.push({ i, x, y, z })
    }
    list.sort((a, b) => b.z - a.z)
    const rects: typeof s.rects = []
    for (const q of list) {
      const hpx = (cardSize / q.z) * focal
      if (hpx < 1.5) continue
      const wpx = hpx * aspect
      const hov = q.i === s.hover
      const lift = hov ? hpx * 0.06 : 0
      const sc = hov ? 1.06 : 1
      const w = wpx * sc, h = hpx * sc
      const x = q.x - w / 2, y = q.y - h / 2 - lift
      // Cards fade with distance, and also right in front of the lens so they never fill the view.
      const near = q.i === s.focus ? 1 : smooth(clamp((q.z - 1.8) / 0.7, 0, 1))
      const a = clamp(Math.exp(-q.z * fogK), 0, 1) * near
      if (a < 0.01) continue
      if (shadow > 0) {
        ctx.globalAlpha = a * shadow * 0.5
        ctx.fillStyle = '#000'
        ctx.beginPath()
        ctx.ellipse(q.x, q.y + hpx * 0.62, w * 0.42, hpx * 0.07, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = a
      ctx.save()
      roundRect(ctx, x, y, w, h, Math.min(w, h) * 0.5 * radius)
      ctx.clip()
      const im = imgs.current[order[q.i]]
      if (im) ctx.drawImage(im, x, y, w, h)
      else {
        ctx.fillStyle = '#2a2a33'
        ctx.fillRect(x, y, w, h)
      }
      ctx.restore()
      rects.push({ i: q.i, x, y, w, h })
    }
    ctx.globalAlpha = 1
    s.rects = rects
    if (kids.current) kids.current.style.opacity = String(s.focus >= 0 ? 0 : 0.35 + mm * 0.65)
  })

  const hit = (cx: number, cy: number): number => {
    const r = root.current!.getBoundingClientRect()
    const x = cx - r.left, y = cy - r.top
    const rects = st.current.rects
    for (let k = rects.length - 1; k >= 0; k--) {
      const q = rects[k]
      if (x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h) return q.i
    }
    return -1
  }

  const release = (): void => {
    const s = st.current
    s.focus = -1
    s.goalU = null
    setFocused(-1)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && st.current.focus >= 0) release()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const item = focused >= 0 ? items[order[focused]] : null

  return (
    <div
      ref={root}
      className={`vc-ribbon ${className}`}
      tabIndex={0}
      aria-label="Depth ribbon gallery. Click a card to bring it close, hold to see the whole path."
      style={{ touchAction: 'none' }}
      onPointerMove={(e) => {
        const s = st.current
        if (s.down) {
          const dy = e.clientY - s.lastY, dx = e.clientX - s.lastX
          s.lastY = e.clientY
          s.lastX = e.clientX
          s.moved += Math.abs(dx) + Math.abs(dy)
          if (s.revealing) s.ang -= dx * 0.006
          else if (draggable && s.focus < 0) {
            const d = e.pointerType === 'touch' ? -dx : dy
            s.u += d * 0.02
            s.vel = d * 0.02 * 60
          }
          return
        }
        s.hover = hit(e.clientX, e.clientY)
      }}
      onPointerLeave={() => (st.current.hover = -1)}
      onPointerDown={(e) => {
        const s = st.current
        s.down = true
        s.moved = 0
        s.lastX = s.downX = e.clientX
        s.lastY = s.downY = e.clientY
        s.downAt = hit(e.clientX, e.clientY)
        e.currentTarget.setPointerCapture(e.pointerId)
        const id = window.setTimeout(() => {
          if (s.down && s.moved < 8 && holdToReveal && s.focus < 0) s.revealing = true
        }, 380)
        s.holdT = id
      }}
      onPointerUp={() => {
        const s = st.current
        window.clearTimeout(s.holdT)
        s.down = false
        if (s.revealing) {
          s.revealing = false
          return
        }
        if (s.moved > 6) return
        if (s.focus >= 0) release()
        else if (focusOnClick && s.downAt >= 0) {
          const i = s.downAt
          // Ride to just before the card, the shortest way round.
          let goal = i + 0.1
          const k = Math.round((s.u - goal) / n)
          goal += k * n
          s.goalU = goal
          s.focus = s.lastFocus = i
          s.vel = 0
          setFocused(i)
        }
      }}
    >
      <canvas ref={canvas} />
      {children && (
        <div ref={kids} className="vc-ribbon-kids">
          {children}
        </div>
      )}
      {captions && item && (
        <div className="vc-ribbon-caption">
          <strong>{item.title}</strong>
          <span>{item.subtitle}</span>
        </div>
      )}
    </div>
  )
}
