import { useRef, useState } from 'react'
import { SAMPLES, clamp, lerp, reducedMotion, spr, spring, useFrame, useSize, useWheel, type Spr } from './shared'

interface Item {
  src: string
  alt?: string
  title?: string
  subtitle?: string
}

interface Props {
  items?: Item[]
  defaultOpen?: number
  /** Resting bar width in pixels. */
  barWidth?: number
  /** Resting bar height as a fraction of the component height. */
  barHeight?: number
  gap?: number
  radius?: number
  /** How much wider the hovered bar grows. */
  magnify?: number
  /** How much taller the hovered bar grows. */
  lift?: number
  /** Distance in pixels over which nearby bars magnify. */
  influence?: number
  align?: 'center' | 'bottom'
  /** Open photo height as a fraction of the space above its caption. */
  openSize?: number
  /** Open photo width divided by height. */
  openAspect?: number
  /** 0 smooth .. 1 bouncy. */
  elasticity?: number
  blur?: number
  dim?: number
  shadow?: number
  autoplay?: 'sweep' | 'cycle' | 'off'
  /** Sweep speed in bars per second. */
  speed?: number
  /** Seconds between photos in cycle mode. */
  interval?: number
  pauseOnHover?: boolean
  draggable?: boolean
  wheel?: boolean
  captions?: boolean
  labels?: boolean
  backgroundColor?: string
  className?: string
}

/** A row of photo slices that bulge around the pointer like a dock, and swell open into a full photo on click. */
export function ElasticReel({
  items = SAMPLES,
  defaultOpen = -1,
  barWidth = 44,
  barHeight = 0.5,
  gap = 10,
  radius = 12,
  magnify = 2.4,
  lift = 1.15,
  influence = 200,
  align = 'center',
  openSize = 0.72,
  openAspect = 1,
  elasticity = 0.35,
  blur = 0.5,
  dim = 0.45,
  shadow = 0.35,
  autoplay = 'sweep',
  speed = 1.4,
  interval = 4,
  pauseOnHover = true,
  draggable = true,
  wheel = false,
  captions = true,
  labels = true,
  backgroundColor = 'transparent',
  className = ''
}: Props) {
  const root = useRef<HTMLDivElement>(null)
  const bars = useRef<(HTMLDivElement | null)[]>([])
  const big = useRef<HTMLDivElement>(null)
  const [, sz] = useSize(root)
  const n = items.length
  const [open, setOpen] = useState(defaultOpen)
  const [label, setLabel] = useState(-1)
  const still = reducedMotion()
  const st = useRef({
    w: items.map(() => spr(0)) as Spr[], h: items.map(() => spr(0)) as Spr[],
    px: null as number | null, sweep: 0, dir: 1, hover: false,
    open: defaultOpen, shown: defaultOpen, p: spr(defaultOpen >= 0 ? 1 : 0), timer: 0, label: -1,
    downX: 0, swiped: false, wheelFocus: null as number | null, rests: [] as number[]
  })

  const openAt = (i: number): void => {
    const s = st.current
    if (i < 0) {
      s.open = -1
    } else {
      if (s.shown >= 0 && s.p.x > 0.5) s.p.x = 0.82
      s.open = s.shown = ((i % n) + n) % n
    }
    s.timer = 0
    setOpen(s.open)
  }

  useWheel(root, wheel, (dy, dx) => {
    const s = st.current
    const d = Math.sign(Math.abs(dy) > Math.abs(dx) ? dy : dx)
    if (!d) return
    if (s.open >= 0) openAt(s.open + d)
    else s.wheelFocus = clamp((s.wheelFocus ?? Math.floor(n / 2)) + d, 0, n - 1)
  })

  useFrame((dt) => {
    const s = st.current
    const { w: W, h: H } = sz.current
    if (!W || !H) return
    const captionH = 70
    const bw = Math.max(6, Math.min(barWidth, (W * 0.9 - gap * (n - 1)) / n))
    const bh = barHeight * (H - captionH)
    // Resting centres, used to measure the pointer so the bulge does not chase itself.
    const total = bw * n + gap * (n - 1)
    const start = (W - total) / 2
    const rests = items.map((_, i) => start + i * (bw + gap) + bw / 2)
    s.rests = rests

    // Where the magnifying focus is.
    let fx: number | null = s.px
    if (s.wheelFocus !== null && fx === null) fx = rests[s.wheelFocus]
    const idle = !(pauseOnHover && s.hover)
    if (fx === null && autoplay === 'sweep' && idle && !still && s.open < 0) {
      s.sweep += s.dir * speed * dt
      if (s.sweep > n - 1) (s.sweep = n - 1), (s.dir = -1)
      if (s.sweep < 0) (s.sweep = 0), (s.dir = 1)
      fx = lerp(rests[0], rests[n - 1], n > 1 ? s.sweep / (n - 1) : 0)
    }
    if (autoplay === 'cycle' && idle && !still) {
      s.timer += dt
      if (s.timer > interval) openAt(s.open < 0 ? 0 : s.open + 1)
    }

    // Spring each bar toward its size.
    const k = 260
    const d = 2 * Math.sqrt(k) * (1 - elasticity * 0.78)
    let nearest = -1, best = 1e9
    const ws: number[] = [], hs: number[] = []
    for (let i = 0; i < n; i++) {
      const g = fx === null ? 0 : Math.exp(-Math.pow((rests[i] - fx) / influence, 2) * 2.2)
      const dist = fx === null ? 1e9 : Math.abs(rests[i] - fx)
      if (dist < best) (best = dist), (nearest = i)
      ws.push(still ? (st.current.w[i].x = bw * (1 + (magnify - 1) * g)) : spring(s.w[i], bw * (1 + (magnify - 1) * g), k, d, dt))
      hs.push(still ? (st.current.h[i].x = bh * (1 + (lift - 1) * g)) : spring(s.h[i], bh * (1 + (lift - 1) * g), k, d, dt))
    }
    const lab = s.px !== null || s.wheelFocus !== null ? nearest : -1
    if (lab !== s.label) {
      s.label = lab
      setLabel(lab)
    }

    // Lay the bars out from the middle so the row grows evenly both ways.
    const sum = ws.reduce((a, b) => a + b, 0) + gap * (n - 1)
    let x = (W - sum) / 2
    const midY = (H - captionH) / 2
    const baseY = midY + bh / 2
    const p = still ? (s.p.x = s.open >= 0 ? 1 : 0) : clamp(spring(s.p, s.open >= 0 ? 1 : 0, 170, 2 * Math.sqrt(170) * (1 - elasticity * 0.6), dt), 0, 1.08)
    if (s.open < 0 && p < 0.01 && s.shown >= 0) s.shown = -1
    let from = { x: 0, y: 0, w: 0, h: 0 }
    for (let i = 0; i < n; i++) {
      const el = bars.current[i]
      const w = ws[i], h = hs[i]
      const y = align === 'bottom' ? baseY - h : midY - h / 2
      if (i === s.shown) from = { x, y, w, h }
      if (el) {
        el.style.transform = `translate(${x}px, ${y}px)`
        el.style.width = `${w}px`
        el.style.height = `${h}px`
        el.style.borderRadius = `${Math.min(radius, w / 2)}px`
        const pp = Math.min(1, p)
        el.style.filter = s.shown >= 0 && pp > 0.01 ? `blur(${pp * blur * 8}px)` : ''
        el.style.opacity = i === s.shown && pp > 0.02 ? '0' : String(1 - (s.shown >= 0 ? pp * dim : 0))
      }
      x += w + gap
    }

    // The open photo grows out of its bar.
    const b = big.current
    if (b) {
      if (s.shown < 0) b.style.display = 'none'
      else {
        const oh = openSize * (H - captionH)
        const ow = Math.min(W * 0.92, oh * (openAspect || 1))
        const to = { x: (W - ow) / 2, y: (H - captionH - oh) / 2, w: ow, h: oh }
        b.style.display = 'block'
        b.style.backgroundImage = `url("${items[s.shown].src}")`
        b.style.transform = `translate(${lerp(from.x, to.x, p)}px, ${lerp(from.y, to.y, p)}px)`
        b.style.width = `${Math.max(1, lerp(from.w, to.w, p))}px`
        b.style.height = `${Math.max(1, lerp(from.h, to.h, p))}px`
        b.style.borderRadius = `${lerp(Math.min(radius, from.w / 2), radius * 1.4, Math.min(1, p))}px`
      }
    }
  })

  const nearestBar = (clientX: number): number => {
    const r = root.current!.getBoundingClientRect()
    const x = clientX - r.left
    let best = 0
    st.current.rests.forEach((c, i) => {
      if (Math.abs(c - x) < Math.abs(st.current.rests[best] - x)) best = i
    })
    return best
  }

  const shownItem = open >= 0 ? items[open] : null

  return (
    <div
      ref={root}
      className={`vc-reel ${className}`}
      style={{ background: backgroundColor, touchAction: 'pan-y', ['--vc-shadow' as string]: String(shadow) }}
      tabIndex={0}
      aria-label="Elastic reel. Hover to magnify, click to open, arrow keys to move."
      onKeyDown={(e) => {
        const s = st.current
        if (e.key === 'Escape') openAt(-1)
        else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          const d = e.key === 'ArrowRight' ? 1 : -1
          if (s.open >= 0) openAt(s.open + d)
          else s.wheelFocus = clamp((s.wheelFocus ?? -1) + d, 0, n - 1)
        } else if (e.key === 'Enter' && s.wheelFocus !== null) openAt(s.wheelFocus)
      }}
      onPointerEnter={() => (st.current.hover = true)}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        st.current.px = e.clientX - r.left
        st.current.wheelFocus = null
      }}
      onPointerLeave={() => {
        st.current.hover = false
        st.current.px = null
      }}
      onPointerDown={(e) => {
        st.current.downX = e.clientX
        st.current.swiped = false
      }}
      onPointerUp={(e) => {
        const s = st.current
        const dx = e.clientX - s.downX
        if (draggable && s.open >= 0 && Math.abs(dx) > 50) {
          openAt(s.open + (dx < 0 ? 1 : -1))
          return
        }
        if (Math.abs(dx) > 6) return
        if (s.open >= 0) openAt(-1)
        else openAt(nearestBar(e.clientX))
      }}
    >
      {items.map((it, i) => (
        <div
          key={i}
          ref={(el) => {
            bars.current[i] = el
          }}
          className="vc-reel-bar"
          role="button"
          aria-label={it.title ?? it.alt}
          style={{ backgroundImage: `url("${it.src}")` }}
        />
      ))}
      <div ref={big} className="vc-reel-big" />
      <div className="vc-reel-caption">
        {captions && shownItem ? (
          <>
            <strong>{shownItem.title}</strong>
            <span>{shownItem.subtitle}</span>
          </>
        ) : labels && label >= 0 ? (
          <span>{items[label].title}</span>
        ) : null}
      </div>
    </div>
  )
}
