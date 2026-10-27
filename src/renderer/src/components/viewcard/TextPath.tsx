import { useId, useLayoutEffect, useRef, useState } from 'react'
import { reducedMotion, useFrame } from './shared'

export const TEXT_PATHS = {
  wave: { d: 'M10,120 C70,30 130,30 190,120 S310,210 370,120 S490,30 550,120', viewBox: '0 0 560 240' },
  circle: { d: 'M120,20 a100,100 0 1,1 0,200 a100,100 0 1,1 0,-200', viewBox: '0 0 240 240' },
  loop: { d: 'M60,120 C60,40 180,40 240,120 S420,200 420,120 S300,40 240,120 S60,200 60,120 Z', viewBox: '0 0 480 240' },
  arch: { d: 'M20,210 Q240,-60 460,210', viewBox: '0 0 480 240' }
} as const

interface Props {
  text?: string
  /** SVG path data, or one of the presets: wave, circle, loop, arch. */
  path?: keyof typeof TEXT_PATHS | string
  /** Should match the path when you pass your own. */
  viewBox?: string
  /** Seconds per lap. */
  duration?: number
  reversed?: boolean
  fontSize?: string
  letterSpacing?: string
  /** Scales the path. Above 1 enlarges, below 1 shrinks. */
  pathScale?: number
  /** Draws the path faintly under the text. */
  showPath?: boolean
  color?: string
  className?: string
}

/** Text that runs around a curved line, endlessly. */
export function TextPath({
  text = 'Your text goes here',
  path = 'wave',
  viewBox,
  duration = 21,
  reversed = false,
  fontSize = '17px',
  letterSpacing = 'normal',
  pathScale = 1,
  showPath = false,
  color = 'currentColor',
  className = ''
}: Props) {
  const id = useId().replace(/:/g, '')
  const preset = path in TEXT_PATHS ? TEXT_PATHS[path as keyof typeof TEXT_PATHS] : null
  const d = preset ? preset.d : path
  const vb = viewBox ?? preset?.viewBox ?? '0 0 240 240'
  const [vx, vy, vw, vh] = vb.split(/[\s,]+/).map(Number)
  const pathEl = useRef<SVGPathElement>(null)
  const measure = useRef<SVGTextElement>(null)
  const tp = useRef<SVGTextPathElement>(null)
  const [m, setM] = useState({ copy: 0, len: 0 })
  const sep = text.endsWith(' ') ? text : `${text} · `

  useLayoutEffect(() => {
    const copy = measure.current?.getComputedTextLength() ?? 0
    const len = pathEl.current?.getTotalLength() ?? 0
    setM({ copy, len })
  }, [sep, d, fontSize, letterSpacing])

  const copies = m.copy > 0 ? Math.ceil(m.len / m.copy) + 2 : 1
  const off = useRef(0)
  useFrame((dt) => {
    if (!tp.current || !m.copy) return
    off.current = (off.current + (m.len / duration) * dt) % m.copy
    const o = reversed ? -m.copy + off.current : -off.current
    tp.current.setAttribute('startOffset', String(o))
  }, !reducedMotion())

  return (
    <svg className={`vc-textpath ${className}`} viewBox={vb} preserveAspectRatio="xMidYMid meet" style={{ color }}>
      <defs>
        <path id={id} ref={pathEl} d={d} />
      </defs>
      <g transform={`translate(${vx + vw / 2} ${vy + vh / 2}) scale(${pathScale}) translate(${-(vx + vw / 2)} ${-(vy + vh / 2)})`}>
        {showPath && <use href={`#${id}`} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeDasharray="3 5" />}
        <text ref={measure} style={{ fontSize, letterSpacing }} opacity={0} aria-hidden="true">
          {sep}
        </text>
        <text style={{ fontSize, letterSpacing }} fill="currentColor">
          <textPath ref={tp} href={`#${id}`}>
            {Array.from({ length: copies }, () => sep).join('')}
          </textPath>
        </text>
      </g>
    </svg>
  )
}
