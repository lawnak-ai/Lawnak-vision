import { useRef, type CSSProperties, type ReactNode } from 'react'
import { spr, spring, useFrame } from './shared'

interface Props {
  /** The area the cursor works in. */
  children?: ReactNode
  circleSize?: number
  dotSize?: number
  circleBorderWidth?: number
  circleColor?: string
  dotColor?: string
  circleStiffness?: number
  circleDamping?: number
  dotStiffness?: number
  dotDamping?: number
  /** CSS selectors the ring wraps around on hover. */
  targets?: string[]
  /** Image shown inside the ring for each target, matched by position. */
  images?: string[]
  imageScale?: number
  imageAnimationDuration?: number
  /** Gap between the ring and a target, in pixels. */
  targetPadding?: number
  /** Stretches the ring in the direction it moves. */
  elastic?: boolean
  mixBlendMode?: CSSProperties['mixBlendMode']
  /** Content drawn inside the ring. */
  cursorContent?: ReactNode
  className?: string
}

/**
 * A two-part cursor: a ring that trails behind and a dot that keeps up. Over a
 * target the ring wraps around it. Works inside its own area only, so the rest of
 * the app keeps the normal pointer.
 */
export function CustomCursor({
  children,
  circleSize = 40,
  dotSize = 6,
  circleBorderWidth = 2,
  circleColor = '#ffffff',
  dotColor = '#ffffff',
  circleStiffness = 150,
  circleDamping = 20,
  dotStiffness = 300,
  dotDamping = 30,
  targets = [],
  images = [],
  imageScale = 0.9,
  imageAnimationDuration = 0.6,
  targetPadding = 0,
  elastic = false,
  mixBlendMode,
  cursorContent,
  className = ''
}: Props) {
  const root = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const dot = useRef<HTMLDivElement>(null)
  const img = useRef<HTMLDivElement>(null)
  const st = useRef({
    px: 0, py: 0, inside: false, seen: false,
    rx: spr(), ry: spr(), rw: spr(circleSize), rh: spr(circleSize), rr: spr(circleSize / 2), dx: spr(), dy: spr(), vis: spr(0),
    target: null as null | { x: number; y: number; w: number; h: number; r: number; img: string | null }
  })

  const findTarget = (el: Element | null): void => {
    const s = st.current
    const box = root.current
    if (!box || !el || !targets.length) {
      s.target = null
      return
    }
    for (let i = 0; i < targets.length; i++) {
      const hit = el.closest(targets[i])
      if (hit && box.contains(hit)) {
        const a = hit.getBoundingClientRect(), b = box.getBoundingClientRect()
        const r = parseFloat(getComputedStyle(hit).borderTopLeftRadius) || 8
        s.target = { x: a.left - b.left - targetPadding, y: a.top - b.top - targetPadding, w: a.width + targetPadding * 2, h: a.height + targetPadding * 2, r: r + targetPadding, img: images[i] ?? null }
        return
      }
    }
    s.target = null
  }

  useFrame((dt) => {
    const s = st.current
    if (!s.seen) return
    const t = s.target
    const cx = t ? t.x + t.w / 2 : s.px, cy = t ? t.y + t.h / 2 : s.py
    const x = spring(s.rx, cx, circleStiffness, circleDamping, dt)
    const y = spring(s.ry, cy, circleStiffness, circleDamping, dt)
    const w = spring(s.rw, t ? t.w : circleSize, circleStiffness, circleDamping, dt)
    const h = spring(s.rh, t ? t.h : circleSize, circleStiffness, circleDamping, dt)
    const r = spring(s.rr, t ? t.r : circleSize / 2, circleStiffness, circleDamping, dt)
    const dx = spring(s.dx, s.px, dotStiffness, dotDamping, dt)
    const dy = spring(s.dy, s.py, dotStiffness, dotDamping, dt)
    const vis = spring(s.vis, s.inside ? 1 : 0, 200, 26, dt)
    let stretch = ''
    if (elastic && !t) {
      const speed = Math.hypot(s.rx.v, s.ry.v)
      const k = Math.min(0.45, speed / 2600)
      stretch = ` rotate(${Math.atan2(s.ry.v, s.rx.v)}rad) scale(${1 + k}, ${1 - k * 0.6}) rotate(${-Math.atan2(s.ry.v, s.rx.v)}rad)`
    }
    if (ring.current) {
      ring.current.style.transform = `translate(${x - w / 2}px, ${y - h / 2}px)${stretch}`
      ring.current.style.width = `${w}px`
      ring.current.style.height = `${h}px`
      ring.current.style.borderRadius = `${r}px`
      ring.current.style.opacity = String(vis)
    }
    if (dot.current) {
      dot.current.style.transform = `translate(${dx - dotSize / 2}px, ${dy - dotSize / 2}px)`
      dot.current.style.opacity = String(vis)
    }
    if (img.current) {
      const on = !!t?.img
      if (on) img.current.style.backgroundImage = `url("${t!.img}")`
      img.current.style.opacity = on ? '1' : '0'
      img.current.style.transform = `scale(${on ? imageScale : 1.15})`
    }
  })

  return (
    <div
      ref={root}
      className={`vc-cursor ${className}`}
      onPointerMove={(e) => {
        const s = st.current
        const b = e.currentTarget.getBoundingClientRect()
        s.px = e.clientX - b.left
        s.py = e.clientY - b.top
        if (!s.seen) {
          s.rx.x = s.dx.x = s.px
          s.ry.x = s.dy.x = s.py
          s.seen = true
        }
        s.inside = e.pointerType !== 'touch'
        findTarget(e.target as Element)
      }}
      onPointerLeave={() => {
        st.current.inside = false
        st.current.target = null
      }}
    >
      {children}
      <div
        ref={ring}
        className="vc-cursor-ring"
        style={{ border: `${circleBorderWidth}px solid ${circleColor}`, mixBlendMode }}
      >
        <div ref={img} className="vc-cursor-img" style={{ transition: `transform ${imageAnimationDuration}s cubic-bezier(.2,.8,.2,1), opacity .25s` }} />
        {cursorContent}
      </div>
      <div ref={dot} className="vc-cursor-dot" style={{ width: dotSize, height: dotSize, background: dotColor, mixBlendMode }} />
    </div>
  )
}
