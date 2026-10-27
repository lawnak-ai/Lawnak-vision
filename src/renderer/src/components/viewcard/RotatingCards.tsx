import { useRef, type ReactNode } from 'react'
import { SAMPLES, useFrame, useWheel } from './shared'

export interface RotatingCard {
  id: string | number
  content?: ReactNode
  background?: string
  image?: string
}

interface Props {
  cards?: RotatingCard[]
  /** Circle radius in pixels. */
  radius?: number
  /** Seconds per full turn. */
  duration?: number
  cardWidth?: number
  cardHeight?: number
  pauseOnHover?: boolean
  reverse?: boolean
  draggable?: boolean
  autoPlay?: boolean
  mouseWheel?: boolean
  onCardClick?: (card: RotatingCard, index: number) => void
  initialRotation?: number
  className?: string
}

const DEFAULT_CARDS: RotatingCard[] = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, content: i + 1, image: SAMPLES[i].src }))

/** A ring of cards turning in 3D. Drag or scroll to spin it; click a card to bring it to the front. */
export function RotatingCards({
  cards = DEFAULT_CARDS,
  radius = 260,
  duration = 20,
  cardWidth = 120,
  cardHeight = 150,
  pauseOnHover = true,
  reverse = false,
  draggable = true,
  autoPlay = true,
  mouseWheel = false,
  onCardClick,
  initialRotation = 0,
  className = ''
}: Props) {
  const root = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const items = useRef<(HTMLDivElement | null)[]>([])
  const s = useRef({ angle: initialRotation, vel: 0, hover: false, drag: false, lastX: 0, moved: 0, down: -1, goal: null as number | null, hold: 0 })
  const step = 360 / Math.max(1, cards.length)

  useFrame((dt) => {
    const st = s.current
    if (st.goal !== null) {
      st.angle += (st.goal - st.angle) * Math.min(1, dt * 6)
      if (Math.abs(st.goal - st.angle) < 0.05) st.goal = null
    } else if (!st.drag) {
      st.angle += st.vel * dt
      st.vel *= Math.pow(0.05, dt)
      st.hold = Math.max(0, st.hold - dt)
      if (autoPlay && st.hold === 0 && !(pauseOnHover && st.hover)) st.angle += ((reverse ? -1 : 1) * 360 / duration) * dt
    }
    if (ring.current) ring.current.style.transform = `translateZ(${-radius}px) rotateX(-8deg) rotateY(${st.angle}deg)`
    // Cards facing away get dimmer, so the ring reads as 3D.
    items.current.forEach((el, i) => {
      if (!el) return
      const face = Math.cos(((st.angle + i * step) * Math.PI) / 180)
      el.style.opacity = String(0.35 + 0.65 * (face + 1) / 2)
    })
  })

  useWheel(root, mouseWheel, (dy, dx) => {
    s.current.goal = null
    s.current.vel += (dy + dx) * 0.8
  })

  return (
    <div
      ref={root}
      className={`vc-rot ${className}`}
      style={{ touchAction: 'none', cursor: draggable ? 'grab' : undefined }}
      onPointerEnter={() => (s.current.hover = true)}
      onPointerLeave={() => (s.current.hover = false)}
      onPointerDown={(e) => {
        const st = s.current
        const card = (e.target as HTMLElement).closest('[data-i]')
        st.down = card ? Number(card.getAttribute('data-i')) : -1
        st.moved = 0
        st.lastX = e.clientX
        if (draggable) {
          st.drag = true
          st.goal = null
          st.vel = 0
          e.currentTarget.setPointerCapture(e.pointerId)
        }
      }}
      onPointerMove={(e) => {
        const st = s.current
        if (!st.drag) return
        const dx = e.clientX - st.lastX
        st.lastX = e.clientX
        st.moved += Math.abs(dx)
        st.angle += dx * 0.35
        st.vel = dx * 0.35 * 60
      }}
      onPointerUp={() => {
        const st = s.current
        st.drag = false
        if (st.moved < 5 && st.down >= 0) {
          const i = st.down
          if (onCardClick) onCardClick(cards[i], i)
          else {
            // Turn the shortest way so this card faces the viewer.
            const target = -i * step
            const k = Math.round((st.angle - target) / 360)
            st.goal = target + k * 360
            st.vel = 0
            st.hold = 2
          }
        }
      }}
    >
      <div ref={ring} className="vc-rot-ring">
        {cards.map((c, i) => (
          <div
            key={c.id}
            data-i={i}
            ref={(el) => {
              items.current[i] = el
            }}
            className="vc-rot-card"
            style={{
              width: cardWidth,
              height: cardHeight,
              marginLeft: -cardWidth / 2,
              marginTop: -cardHeight / 2,
              transform: `rotateY(${i * step}deg) translateZ(${radius}px)`,
              background: c.background,
              backgroundImage: c.image ? `url("${c.image}")` : undefined
            }}
          >
            <span>{c.content}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
