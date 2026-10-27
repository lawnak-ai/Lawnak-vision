import { useRef, useState } from 'react'
import { SAMPLES, clamp, spr, spring, useFrame, type Spr } from './shared'

interface Item {
  /** Face shown at rest. */
  front: string
  /** Face revealed when the slide turns. */
  back: string
  label?: string
}

interface Props {
  items?: Item[]
  initialIndex?: number
  cardWidth?: number
  /** Width / height. */
  aspectRatio?: number
  gap?: number
  borderRadius?: number
  /** Lens ribs per slide. */
  strips?: number
  /** How much the turn lags across the slide (0..1). */
  sweep?: number
  /** Depth shift between the two faces. */
  refraction?: number
  /** Rib shading strength. */
  ridge?: number
  /** Holographic foil strength. */
  foil?: number
  /** Degrees the slide leans while turning. */
  tilt?: number
  /** Cursor distance for a full turn, as a fraction of slide width. */
  travel?: number
  /** Pixels toward the viewer while turning. */
  lift?: number
  perspective?: number
  inactiveScale?: number
  inactiveDim?: number
  showLabels?: boolean
  showControls?: boolean
  loop?: boolean
  autoplay?: boolean
  autoplayDelay?: number
  onIndexChange?: (index: number) => void
  className?: string
}

const DEFAULT_ITEMS: Item[] = Array.from({ length: 8 }, (_, i) => ({
  front: SAMPLES[i].src,
  back: SAMPLES[(i + 4) % SAMPLES.length].src,
  label: SAMPLES[i].title
}))

/** Portrait slides printed like lenticular cards: hover one and it flips, rib by rib, to a second picture. */
export function LenticularCarousel({
  items = DEFAULT_ITEMS,
  initialIndex = 2,
  cardWidth = 200,
  aspectRatio = 3 / 4,
  gap = 26,
  borderRadius = 14,
  strips = 32,
  sweep = 0.6,
  refraction = 0.32,
  ridge = 0.5,
  foil = 0.5,
  tilt = 14,
  travel = 0.64,
  lift = 40,
  perspective = 1200,
  inactiveScale = 0.9,
  inactiveDim = 0.55,
  showLabels = true,
  showControls = true,
  loop = false,
  autoplay = false,
  autoplayDelay = 3200,
  onIndexChange,
  className = ''
}: Props) {
  const n = items.length
  const [index, setIndexState] = useState(clamp(initialIndex, 0, n - 1))
  const cardH = cardWidth / aspectRatio
  const S = Math.max(4, Math.round(strips))
  const sw = cardWidth / S
  const turns = useRef<Spr[]>(items.map(() => spr(0)))
  const goals = useRef<number[]>(items.map(() => 0))
  const inner = useRef<(HTMLDivElement | null)[]>([])
  const stripEls = useRef<(HTMLDivElement | null)[][]>(items.map(() => []))
  const foilEls = useRef<(HTMLDivElement | null)[]>([])
  const drag = useRef({ x: 0, on: false, timer: 0 })

  const setIndex = (i: number): void => {
    const next = loop ? ((i % n) + n) % n : clamp(i, 0, n - 1)
    drag.current.timer = 0
    setIndexState(next)
    onIndexChange?.(next)
  }

  useFrame((dt) => {
    if (autoplay) {
      drag.current.timer += dt * 1000
      if (drag.current.timer > autoplayDelay) setIndex(index + 1)
    }
    for (let i = 0; i < n; i++) {
      const sp = turns.current[i]
      const before = sp.x
      const t = spring(sp, goals.current[i], 90, 17, dt)
      if (Math.abs(t - before) < 1e-5 && Math.abs(sp.v) < 1e-4) continue
      const el = inner.current[i]
      const bump = Math.sin(Math.PI * clamp(t, 0, 1))
      if (el) el.style.transform = `translateZ(${bump * lift}px) rotateY(${(t - 0.5) * 2 * tilt * bump}deg)`
      const row = stripEls.current[i]
      for (let j = 0; j < S; j++) {
        const p = clamp(t * (1 + sweep) - (j / S) * sweep, 0, 1)
        const s = row[j]
        if (s) s.style.transform = `rotateY(${p * 180}deg)`
      }
      const f = foilEls.current[i]
      if (f) {
        f.style.opacity = String(foil * (0.25 + bump * 0.75))
        f.style.backgroundPosition = `${t * 160}% 50%`
      }
    }
  })

  return (
    <div
      className={`vc-lenti ${className}`}
      tabIndex={0}
      aria-label="Lenticular carousel. Use the arrow keys to move between slides."
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') setIndex(index + 1)
        else if (e.key === 'ArrowLeft') setIndex(index - 1)
      }}
    >
      <div
        className="vc-lenti-view"
        style={{ height: cardH + 60, touchAction: 'pan-y' }}
        onPointerDown={(e) => {
          drag.current = { ...drag.current, x: e.clientX, on: true }
        }}
        onPointerUp={(e) => {
          if (!drag.current.on) return
          drag.current.on = false
          const dx = e.clientX - drag.current.x
          if (Math.abs(dx) > 40) setIndex(index + (dx < 0 ? 1 : -1))
        }}
      >
        <div className="vc-lenti-track" style={{ transform: `translateX(${-(index * (cardWidth + gap) + cardWidth / 2)}px)`, gap }}>
          {items.map((it, i) => {
            const active = i === index
            return (
              <div
                key={i}
                className="vc-lenti-slide"
                style={{
                  width: cardWidth,
                  height: cardH,
                  perspective,
                  transform: `scale(${active ? 1 : inactiveScale})`,
                  filter: active ? 'none' : `brightness(${1 - inactiveDim * 0.8})`
                }}
                onClick={() => !active && setIndex(i)}
                onPointerMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect()
                  goals.current[i] = clamp((e.clientX - r.left) / r.width / travel, 0, 1)
                }}
                onPointerLeave={() => (goals.current[i] = 0)}
              >
                <div
                  ref={(el) => {
                    inner.current[i] = el
                  }}
                  className="vc-lenti-inner"
                  style={{ borderRadius }}
                >
                  {Array.from({ length: S }, (_, j) => (
                    <div
                      key={j}
                      ref={(el) => {
                        stripEls.current[i][j] = el
                      }}
                      className="vc-lenti-strip"
                      style={{ left: j * sw, width: sw + 0.6 }}
                    >
                      <div
                        className="vc-lenti-face"
                        style={{ backgroundImage: `url("${it.front}")`, backgroundSize: `${cardWidth}px ${cardH}px`, backgroundPosition: `${-j * sw}px 0` }}
                      />
                      <div
                        className="vc-lenti-face back"
                        style={{
                          backgroundImage: `url("${it.back}")`,
                          backgroundSize: `${cardWidth * (1 + refraction * 0.08)}px ${cardH * (1 + refraction * 0.08)}px`,
                          backgroundPosition: `${-j * sw - cardWidth * refraction * 0.04}px ${-cardH * refraction * 0.04}px`
                        }}
                      />
                    </div>
                  ))}
                  <div
                    className="vc-lenti-ribs"
                    style={{ backgroundImage: `repeating-linear-gradient(90deg, rgba(0,0,0,${0.22 * ridge}) 0, rgba(255,255,255,${0.12 * ridge}) ${sw * 0.45}px, rgba(0,0,0,${0.22 * ridge}) ${sw}px)` }}
                  />
                  <div
                    ref={(el) => {
                      foilEls.current[i] = el
                    }}
                    className="vc-lenti-foil"
                    style={{ opacity: foil * 0.25 }}
                  />
                  {showLabels && it.label && <div className="vc-lenti-label">{it.label}</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {showControls && (
        <div className="vc-lenti-controls">
          <button aria-label="Previous" disabled={!loop && index === 0} onClick={() => setIndex(index - 1)}>‹</button>
          <div className="vc-lenti-rail">
            {items.map((_, i) => (
              <span key={i} className={i === index ? 'on' : ''} onClick={() => setIndex(i)} />
            ))}
          </div>
          <button aria-label="Next" disabled={!loop && index === n - 1} onClick={() => setIndex(index + 1)}>›</button>
        </div>
      )}
    </div>
  )
}
