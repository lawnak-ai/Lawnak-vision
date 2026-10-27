import { useRef, useState } from 'react'
import { SAMPLES, clamp, reducedMotion, spr, spring, useFrame, useSize, useWheel } from './shared'

interface Item {
  src: string
  alt?: string
  title?: string
  subtitle?: string
  /** Accent colour for this cover. */
  color?: string
}

interface Props {
  items?: Item[]
  startIndex?: number
  /** Cover width divided by height. */
  aspect?: number
  /** Focused cover height as a share of the space above the caption. */
  size?: number
  /** Gap from the focused cover to its neighbours, in cover widths. */
  spread?: number
  /** How tightly distant covers pack together. */
  stack?: number
  /** Neighbour tilt in degrees. */
  fan?: number
  /** How far neighbours turn away, in degrees. */
  turn?: number
  depth?: number
  /** Covers shown per side (1..5). */
  visible?: number
  radius?: number
  dim?: number
  shadow?: number
  vinyl?: boolean
  vinylColor?: string
  /** "auto" follows the focused cover. */
  accentColor?: string
  rpm?: number
  autoplay?: boolean
  interval?: number
  pauseOnHover?: boolean
  loop?: boolean
  draggable?: boolean
  wheel?: boolean
  captions?: boolean
  controls?: boolean
  backgroundColor?: string
  onIndexChange?: (index: number) => void
  className?: string
}

/** A fanned row of album sleeves. Drag, scroll or use the ruler; click the centre cover to play its record. */
export function AlbumRail({
  items = SAMPLES,
  startIndex = 0,
  aspect = 1,
  size = 0.62,
  spread = 0.58,
  stack = 0.5,
  fan = 6,
  turn = 22,
  depth = 0.5,
  visible = 3,
  radius = 14,
  dim = 0.45,
  shadow = 0.6,
  vinyl = true,
  vinylColor = '#131116',
  accentColor = 'auto',
  rpm = 33,
  autoplay = true,
  interval = 4,
  pauseOnHover = true,
  loop = true,
  draggable = true,
  wheel = false,
  captions = true,
  controls = true,
  backgroundColor = 'transparent',
  onIndexChange,
  className = ''
}: Props) {
  const root = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const covers = useRef<(HTMLDivElement | null)[]>([])
  const discs = useRef<(HTMLDivElement | null)[]>([])
  const marker = useRef<HTMLDivElement>(null)
  const [, sz] = useSize(stage)
  const n = items.length
  const [index, setIndex] = useState(startIndex)
  const [playing, setPlaying] = useState(false)
  const still = reducedMotion()
  const st = useRef({
    pos: spr(startIndex), target: startIndex, drag: false, x0: 0, p0: 0, lastX: 0, vel: 0, moved: 0, downOn: -1,
    hover: false, hoverFocus: false, timer: 0, idx: startIndex, playing: false, spin: 0, slide: spr(0)
  })

  const wrap = (i: number): number => (loop ? ((i % n) + n) % n : clamp(i, 0, n - 1))
  const go = (t: number): void => {
    const s = st.current
    s.target = loop ? t : clamp(t, 0, n - 1)
    s.timer = 0
  }

  useWheel(root, wheel, (dy, dx) => {
    const d = Math.abs(dy) > Math.abs(dx) ? dy : dx
    if (Math.abs(d) > 2) go(st.current.target + Math.sign(d))
  })

  useFrame((dt) => {
    const s = st.current
    const { w: W, h: H } = sz.current
    if (!W || !H) return
    const ch = Math.min(H * size, (W / aspect) * 0.42)
    const cw = ch * aspect
    // Autoplay
    if (autoplay && !s.drag && !s.playing && !(pauseOnHover && s.hover)) {
      s.timer += dt
      if (s.timer > interval) go(s.target + 1)
    }
    const pos = s.drag ? s.pos.x : still ? (s.pos.x = s.target) : spring(s.pos, s.target, 120, 22, dt)
    const idx = wrap(Math.round(pos))
    if (idx !== s.idx) {
      s.idx = idx
      s.playing = false
      setPlaying(false)
      setIndex(idx)
      onIndexChange?.(idx)
    }
    if (s.playing && !still) s.spin += dt * rpm * 6
    const slideGoal = s.playing ? 0.52 : s.hoverFocus ? 0.14 : 0
    const slide = spring(s.slide, slideGoal, 90, 16, dt)
    const vis = clamp(visible, 1, 5)
    for (let i = 0; i < n; i++) {
      const el = covers.current[i]
      if (!el) continue
      let d = i - pos
      if (loop) d = ((((d + n / 2) % n) + n) % n) - n / 2
      const ad = Math.abs(d), sg = Math.sign(d)
      if (ad > vis + 1) {
        el.style.visibility = 'hidden'
        continue
      }
      el.style.visibility = 'visible'
      const near = Math.min(ad, 1), far = Math.max(0, ad - 1)
      const x = sg * (near * spread * cw * 1.25 + far * stack * cw * 0.55)
      const z = -near * depth * cw * 0.9 - far * depth * cw * 0.3
      const rotY = -sg * near * turn - sg * far * 4
      const rotZ = sg * (near * fan + far * fan * 0.35)
      const y = near * ch * 0.035 + far * ch * 0.03
      const sc = 1 - near * depth * 0.2 - far * 0.05
      const op = ad > vis ? Math.max(0, 1 - (ad - vis)) : 1
      el.style.width = `${cw}px`
      el.style.height = `${ch}px`
      el.style.marginLeft = `${-cw / 2}px`
      el.style.marginTop = `${-ch / 2}px`
      el.style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${sc})`
      el.style.opacity = String(op)
      el.style.filter = `brightness(${1 - dim * Math.min(ad / vis, 1)})`
      el.style.zIndex = String(1000 - Math.round(ad * 10))
      const disc = discs.current[i]
      if (disc) {
        const mine = i === idx
        disc.style.transform = `translateX(${(mine ? slide : 0) * cw}px) rotate(${mine ? s.spin : 0}deg)`
      }
    }
    if (marker.current) marker.current.style.left = `${(n > 1 ? wrap(pos) / (n - 1) : 0) * 100}%`
  })

  const accent = accentColor === 'auto' ? items[index]?.color ?? '#B19EEF' : accentColor
  const togglePlay = (): void => {
    const s = st.current
    if (!vinyl) return
    s.playing = !s.playing
    setPlaying(s.playing)
  }
  const scrub = (clientX: number, el: HTMLElement): void => {
    const r = el.getBoundingClientRect()
    const t = Math.round(clamp((clientX - r.left) / r.width, 0, 1) * (n - 1))
    const cur = st.current.target
    // Move to that cover by the nearest route.
    go(cur + (t - wrap(cur)))
  }

  return (
    <div
      ref={root}
      className={`vc-album ${className}`}
      style={{ background: backgroundColor }}
      tabIndex={0}
      aria-label="Album rail. Drag or use the arrow keys to browse, Enter to play."
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(st.current.target + 1)
        else if (e.key === 'ArrowLeft') go(st.current.target - 1)
        else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          togglePlay()
        }
      }}
      onPointerEnter={() => (st.current.hover = true)}
      onPointerLeave={() => {
        st.current.hover = false
        st.current.hoverFocus = false
      }}
    >
      <div
        ref={stage}
        className="vc-album-stage"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={(e) => {
          const s = st.current
          const c = (e.target as HTMLElement).closest('[data-i]')
          s.downOn = c ? Number(c.getAttribute('data-i')) : -1
          s.moved = 0
          if (!draggable) return
          s.drag = true
          s.x0 = s.lastX = e.clientX
          s.p0 = s.pos.x
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          const s = st.current
          if (!s.drag) {
            const c = (e.target as HTMLElement).closest('[data-i]')
            s.hoverFocus = !!c && Number(c.getAttribute('data-i')) === s.idx
            return
          }
          const W = sz.current.w
          const cw = Math.min(sz.current.h * size, (W / aspect) * 0.42) * aspect
          const dx = e.clientX - s.x0
          s.moved = Math.max(s.moved, Math.abs(dx))
          s.pos.x = s.p0 - dx / (spread * cw * 1.25)
          s.vel = -(e.clientX - s.lastX) / (spread * cw * 1.25) * 60
          s.lastX = e.clientX
        }}
        onPointerUp={() => {
          const s = st.current
          if (s.drag) {
            s.drag = false
            s.pos.v = 0
            go(Math.round(s.pos.x + s.vel * 0.18))
          }
          if (s.moved < 5 && s.downOn >= 0) {
            if (s.downOn === s.idx) togglePlay()
            else {
              const cur = s.target
              let d = s.downOn - wrap(cur)
              if (loop && Math.abs(d) > n / 2) d -= Math.sign(d) * n
              go(cur + d)
            }
          }
        }}
      >
        {items.map((it, i) => (
          <div
            key={i}
            data-i={i}
            ref={(el) => {
              covers.current[i] = el
            }}
            className="vc-album-cover"
          >
            {vinyl && (
              <div
                ref={(el) => {
                  discs.current[i] = el
                }}
                className="vc-album-disc"
                style={{ background: `radial-gradient(circle, ${it.color ?? accent} 0 16%, ${vinylColor} 17% 19%, transparent 20%), repeating-radial-gradient(circle, ${vinylColor} 0 2px, #26232c 3px 4px)` }}
              />
            )}
            <div
              className="vc-album-sleeve"
              style={{ borderRadius: radius, backgroundImage: `url("${it.src}")`, boxShadow: `0 ${18 * shadow}px ${40 * shadow}px rgba(0,0,0,${0.55 * shadow})` }}
            />
          </div>
        ))}
      </div>
      {captions && (
        <div className="vc-album-caption" key={index}>
          <strong>{items[index]?.title}</strong>
          <span>{items[index]?.subtitle}</span>
        </div>
      )}
      {controls && (
        <div className="vc-album-controls">
          <button aria-label="Previous" onClick={() => go(st.current.target - 1)}>‹</button>
          <div
            className="vc-album-ruler"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              scrub(e.clientX, e.currentTarget)
            }}
            onPointerMove={(e) => {
              if (e.buttons) scrub(e.clientX, e.currentTarget)
            }}
          >
            {items.map((_, i) => (
              <span key={i} className={i === index ? 'on' : ''} />
            ))}
            <div ref={marker} className="vc-album-marker" style={{ background: accent }} />
          </div>
          {vinyl && (
            <button className="vc-album-play" style={{ background: accent }} aria-label={playing ? 'Stop' : 'Play'} onClick={togglePlay}>
              {playing ? '❚❚' : '▶'}
            </button>
          )}
          <button aria-label="Next" onClick={() => go(st.current.target + 1)}>›</button>
        </div>
      )}
    </div>
  )
}
