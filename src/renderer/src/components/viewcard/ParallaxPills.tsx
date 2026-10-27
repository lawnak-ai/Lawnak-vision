import { useMemo, useRef } from 'react'
import { reducedMotion, spr, spring, useFrame, type Spr } from './shared'

export interface Pill {
  label?: string
  /** Left edge, in % of the container. */
  x: number
  /** Top edge, in % of the container. */
  y: number
  /** Width, in % of the container. */
  width: number
  rotate?: number
  bg?: string
  color?: string
}

interface Props {
  pills?: Pill[]
  backgroundPills?: Pill[]
  width?: number | string
  height?: number | string
  pillHeight?: number
  pillRadius?: number
  fontSize?: number
  fontWeight?: number
  /** Most the pills drift with the cursor, in px. */
  parallaxStrength?: number
  disableParallax?: boolean
  /** Hides the decorative pills. */
  disableEmptyPills?: boolean
  disableEntry?: boolean
  /** Seconds between pill entries. */
  entryStagger?: number
  entryStiffness?: number
  /** Lower overshoots more. */
  entryDamping?: number
  /** Drop height as a percent of pill height. */
  entryDistance?: number
  /** Chance of a hinge tilt on entry (0..1). */
  hingeChance?: number
  hingeAngle?: number
  parallaxStiffness?: number
  parallaxDamping?: number
  className?: string
}

const PILLS: Pill[] = [
  { label: 'Design', x: 8, y: 18, width: 26, rotate: -6, bg: '#5227FF', color: '#fff' },
  { label: 'Motion', x: 44, y: 12, width: 24, rotate: 4, bg: '#ff5f6d', color: '#fff' },
  { label: '3D & Shaders', x: 22, y: 44, width: 36, rotate: 2, bg: '#ffffff', color: '#141414' },
  { label: 'Story', x: 64, y: 40, width: 22, rotate: -8, bg: '#00c9a7', color: '#062b27' },
  { label: 'Data', x: 40, y: 70, width: 22, rotate: 6, bg: '#ffbe0b', color: '#2b2100' }
]
const BG_PILLS: Pill[] = [
  { x: 2, y: 64, width: 20, rotate: 12 }, { x: 72, y: 8, width: 18, rotate: -14 }, { x: 76, y: 72, width: 20, rotate: 8 },
  { x: 30, y: 4, width: 12, rotate: -4 }, { x: 4, y: 40, width: 10, rotate: 20 }, { x: 60, y: 84, width: 14, rotate: -10 }
]

interface Live {
  y: Spr
  r: Spr
  px: Spr
  py: Spr
  depth: number
  start: number
  hinge: number
  origin: string
}

/** Labelled pills that drop in with a springy bounce and drift with the cursor. */
export function ParallaxPills({
  pills = PILLS,
  backgroundPills = BG_PILLS,
  width = '100%',
  height = 480,
  pillHeight = 64,
  pillRadius = 18,
  fontSize = 18,
  fontWeight = 500,
  parallaxStrength = 24,
  disableParallax = false,
  disableEmptyPills = true,
  disableEntry = false,
  entryStagger = 0.08,
  entryStiffness = 140,
  entryDamping = 11,
  entryDistance = 220,
  hingeChance = 0.5,
  hingeAngle = 18,
  parallaxStiffness = 60,
  parallaxDamping = 18,
  className = ''
}: Props) {
  const all = useMemo(() => [...(disableEmptyPills ? [] : backgroundPills.map((p) => ({ ...p, bg: p.bg ?? 'rgba(255,255,255,.08)', label: undefined }))), ...pills], [pills, backgroundPills, disableEmptyPills])
  const nBg = all.length - pills.length
  const els = useRef<(HTMLDivElement | null)[]>([])
  const mouse = useRef({ x: 0, y: 0 })
  const clock = useRef(0)
  const still = reducedMotion() || disableEntry
  const live = useMemo<Live[]>(() => {
    let seed = 11
    const rnd = (): number => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    return all.map((_, i) => {
      const hinge = rnd() < hingeChance ? (rnd() < 0.5 ? -1 : 1) : 0
      const drop = -(entryDistance / 100) * pillHeight - 40
      return {
        y: spr(still ? 0 : drop), r: spr(still ? 0 : hinge * hingeAngle), px: spr(), py: spr(),
        depth: i < nBg ? 0.35 + rnd() * 0.25 : 0.6 + rnd() * 0.5,
        start: still ? 0 : Math.max(0, i - nBg) * entryStagger + (i < nBg ? 0.15 : 0),
        hinge,
        origin: hinge < 0 ? '0% 50%' : '100% 50%'
      }
    })
  }, [all, nBg, still, entryDistance, pillHeight, hingeChance, hingeAngle, entryStagger])

  useFrame((dt) => {
    clock.current += dt
    live.forEach((L, i) => {
      const el = els.current[i]
      if (!el) return
      const started = clock.current >= L.start
      const y = started ? spring(L.y, 0, entryStiffness, entryDamping, dt) : L.y.x
      const r = started ? spring(L.r, 0, entryStiffness * 0.8, entryDamping * 0.8, dt) : L.r.x
      const tx = disableParallax ? 0 : mouse.current.x * parallaxStrength * L.depth
      const ty = disableParallax ? 0 : mouse.current.y * parallaxStrength * L.depth
      const px = spring(L.px, tx, parallaxStiffness, parallaxDamping, dt)
      const py = spring(L.py, ty, parallaxStiffness, parallaxDamping, dt)
      const base = all[i].rotate ?? 0
      el.style.opacity = started ? '1' : '0'
      el.style.transformOrigin = L.origin
      el.style.transform = `translate(${px}px, ${y + py}px) rotate(${base + r}deg)`
    })
  })

  return (
    <div
      className={`vc-pills ${className}`}
      style={{ width, height }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        mouse.current = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: ((e.clientY - r.top) / r.height) * 2 - 1 }
      }}
      onPointerLeave={() => (mouse.current = { x: 0, y: 0 })}
    >
      {all.map((p, i) => (
        <div
          key={i}
          ref={(el) => {
            els.current[i] = el
          }}
          className={`vc-pill ${p.label ? '' : 'empty'}`}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.width}%`,
            height: pillHeight,
            borderRadius: pillRadius,
            background: p.bg ?? '#ffffff',
            color: p.color ?? '#141414',
            fontSize,
            fontWeight,
            opacity: 0
          }}
        >
          {p.label}
        </div>
      ))}
    </div>
  )
}
