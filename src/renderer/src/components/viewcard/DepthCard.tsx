import { useRef, type ReactNode } from 'react'
import { SAMPLES, reducedMotion, useFrame } from './shared'

interface Layer {
  image: string
  /** 0 = flat with the card, 1 = moves the most. */
  depth: number
}

interface Props {
  image?: string
  layers?: Layer[]
  title?: string
  description?: ReactNode
  width?: number
  height?: number
  /** Maximum tilt in degrees. */
  maxRotation?: number
  /** Maximum parallax shift in pixels. */
  maxTranslation?: number
  borderRadius?: string
  spotlight?: boolean
  spotlightColor?: string
  /** Delay between content elements, in ms. */
  staggerDelay?: number
  revealAnimation?: 'slide' | 'fade' | 'scale' | 'none'
  onClick?: () => void
  className?: string
}

// A floating shape with a transparent background, for the front layer.
const FRONT = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="520" viewBox="0 0 400 520">
<defs><radialGradient id="g" cx=".35" cy=".3"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#b19eef"/><stop offset="1" stop-color="#5227ff"/></radialGradient></defs>
<circle cx="270" cy="150" r="70" fill="url(#g)"/><circle cx="110" cy="250" r="26" fill="url(#g)" opacity=".9"/><circle cx="300" cy="300" r="14" fill="#fff" opacity=".8"/></svg>`
)}`

/** A card that tilts toward the cursor, with image layers floating at different depths and a spotlight. */
export function DepthCard({
  image = SAMPLES[5].src,
  layers = [{ image: FRONT, depth: 1 }],
  title = 'Depth Card',
  description = 'Move the pointer over the card to see its layers drift apart.',
  width = 240,
  height = 320,
  maxRotation = 20,
  maxTranslation = 20,
  borderRadius = '10px',
  spotlight = true,
  spotlightColor = 'rgba(255, 255, 255, 0.5)',
  staggerDelay = 100,
  revealAnimation = 'slide',
  onClick,
  className = ''
}: Props) {
  const card = useRef<HTMLDivElement>(null)
  const bg = useRef<HTMLDivElement>(null)
  const layerEls = useRef<(HTMLDivElement | null)[]>([])
  const spot = useRef<HTMLDivElement>(null)
  const still = reducedMotion()
  const st = useRef({ tx: 0, ty: 0, x: 0, y: 0, sx: 50, sy: 50, on: 0, inside: false })

  useFrame((dt) => {
    const s = st.current
    const k = Math.min(1, dt * 8)
    s.x += ((s.inside ? s.tx : 0) - s.x) * k
    s.y += ((s.inside ? s.ty : 0) - s.y) * k
    s.on += ((s.inside ? 1 : 0) - s.on) * k
    if (card.current) card.current.style.transform = `perspective(800px) rotateX(${-s.y * maxRotation}deg) rotateY(${s.x * maxRotation}deg) scale(${1 + s.on * 0.03})`
    if (bg.current) bg.current.style.transform = `translate(${-s.x * maxTranslation * 0.5}px, ${-s.y * maxTranslation * 0.5}px) scale(1.12)`
    layerEls.current.forEach((el, i) => {
      if (el) el.style.transform = `translate(${s.x * maxTranslation * layers[i].depth}px, ${s.y * maxTranslation * layers[i].depth}px)`
    })
    if (spot.current) {
      spot.current.style.opacity = String(s.on)
      spot.current.style.background = `radial-gradient(circle at ${s.sx}% ${s.sy}%, ${spotlightColor}, transparent 55%)`
    }
  }, !still)

  return (
    <div
      ref={card}
      className={`vc-depth ${className} reveal-${revealAnimation}`}
      style={{ width, height, borderRadius, cursor: onClick ? 'pointer' : undefined }}
      onClick={onClick}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height
        Object.assign(st.current, { tx: px * 2 - 1, ty: py * 2 - 1, sx: px * 100, sy: py * 100, inside: true })
      }}
      onPointerLeave={() => (st.current.inside = false)}
    >
      <div ref={bg} className="vc-depth-bg" style={{ backgroundImage: `url("${image}")` }} />
      {layers.map((l, i) => (
        <div
          key={i}
          ref={(el) => {
            layerEls.current[i] = el
          }}
          className="vc-depth-layer"
          style={{ backgroundImage: `url("${l.image}")` }}
        />
      ))}
      {spotlight && <div ref={spot} className="vc-depth-spot" />}
      <div className="vc-depth-content">
        <h3 style={{ animationDelay: `${staggerDelay}ms` }}>{title}</h3>
        {description && <p style={{ animationDelay: `${staggerDelay * 2}ms` }}>{description}</p>}
      </div>
    </div>
  )
}
