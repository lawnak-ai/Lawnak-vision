import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { GLSL_NOISE, hexToRgb, makeGL, reducedMotion, spr, spring, useFrame, type GL } from './shared'

interface Props {
  width?: number | string
  height?: number | string
  borderRadius?: string
  /** Flame colour. */
  color?: string
  /** Edge and contour colour. Defaults to a lighter, warmer tone of `color`. */
  highlightColor?: string
  backgroundColor?: string
  speed?: number
  /** Strength of the fine contour lines. */
  contours?: number
  grain?: number
  /** Soft focus on the flame, in pixels. */
  blur?: number
  /** How far below the top the flame fades out (0..1). */
  fade?: number
  intensity?: number
  /** Hover tilts the card and stokes the flame. */
  interactive?: boolean
  tiltStrength?: number
  parallax?: number
  /** The flame rises into the card when it appears. */
  intro?: boolean
  paused?: boolean
  dpr?: number
  children?: ReactNode
  className?: string
  style?: CSSProperties
}

const FRAG = `precision highp float;
uniform vec2 uRes;uniform float uTime;uniform vec3 uColor;uniform vec3 uHi;uniform vec3 uBg;
uniform float uRise;uniform float uHover;uniform float uGrain;uniform float uContours;uniform float uFade;uniform float uInt;
${GLSL_NOISE}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  float asp=uRes.x/uRes.y;
  vec2 p=vec2((uv.x-.5)*asp,uv.y);
  float t=uTime;
  float top=(.62+.2*uHover)*uRise;
  float y=uv.y/max(top,.001);
  vec2 q=vec2(p.x*2.2,uv.y*1.6-t*1.1);
  float n=fbm(q*1.4);
  float n2=fbm(q*3.1+vec2(n*1.6,-t*.6));
  float sway=(n-.5)*.55*uv.y+sin(t*1.3+uv.y*4.)*.05*uv.y;
  float x=p.x+sway;
  float w=mix(.46,.05,clamp(y,0.,1.))*.75+.04;
  float body=exp(-pow(abs(x)/w,2.)*1.6);
  float vert=1.-smoothstep(.5,1.15,y+(n2-.5)*.8);
  float f=body*vert*(.55+.9*n2);
  f=smoothstep(.12,.95,f);
  f*=1.-smoothstep(1.-uFade*.6,1.,uv.y);
  f*=.9+.1*sin(t*6.+n*7.);
  float core=smoothstep(.55,1.,f);
  float band=smoothstep(.22,.42,f)*(1.-smoothstep(.42,.72,f));
  float lines=pow(abs(sin(f*42.)),36.)*smoothstep(.05,.3,f)*uContours*.4;
  vec3 col=uColor*f*1.05+uHi*(core*.6+band*.5+lines);
  col+=uColor*pow(f,3.)*.55;
  col*=uInt*(1.+uHover*.25);
  col+=(h21(gl_FragCoord.xy+fract(t*.37)*311.)-.5)*uGrain*.5*f;
  gl_FragColor=vec4(uBg+col,1.);
}`

function lighten(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  const mix = (c: number, w: number): number => Math.round((c * 0.45 + w * 0.55) * 255)
  return `#${[mix(r, 1), mix(g, 0.85), mix(b, 0.7)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** A card with an animated WebGL flame behind its content. Hover tilts it and stokes the flame. */
export function ShaderCard({
  width = 300,
  height = 380,
  borderRadius = '14px',
  color = '#5227FF',
  highlightColor,
  backgroundColor = '#0d0b16',
  speed = 0.5,
  contours = 1,
  grain = 0.25,
  blur = 3,
  fade = 0.6,
  intensity = 1,
  interactive = true,
  tiltStrength = 8,
  parallax = 1,
  intro = true,
  paused = false,
  dpr = 2,
  children,
  className = '',
  style
}: Props) {
  const card = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const glRef = useRef<GL | null>(null)
  const st = useRef({ t: 0, rise: intro ? 0 : 1, hover: spr(), tx: spr(), ty: spr(), mx: 0, my: 0, inside: false })
  const still = reducedMotion()

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const g = makeGL(c, FRAG, { alpha: false })
    glRef.current = g
    return () => {
      g?.destroy()
      glRef.current = null
    }
  }, [])

  useFrame((dt) => {
    const g = glRef.current
    const s = st.current
    const el = card.current
    if (!g || !el) return
    if (!paused && !still) s.t += dt * speed * (1 + s.hover.x * 0.8)
    s.rise = Math.min(1, s.rise + dt / 1.4)
    const hv = spring(s.hover, s.inside ? 1 : 0, 60, 14, dt)
    const tx = spring(s.tx, s.inside ? s.my * -tiltStrength : 0, 120, 18, dt)
    const ty = spring(s.ty, s.inside ? s.mx * tiltStrength : 0, 120, 18, dt)
    el.style.transform = `perspective(900px) rotateX(${tx}deg) rotateY(${ty}deg)`
    if (canvas.current) canvas.current.style.transform = `translate(${-ty * 1.4 * parallax}px, ${tx * 1.4 * parallax}px) scale(1.08)`
    if (content.current) content.current.style.transform = `translate(${ty * 0.8 * parallax}px, ${-tx * 0.8 * parallax}px)`
    g.resize(el.clientWidth, el.clientHeight, Math.min(dpr, window.devicePixelRatio || 1))
    const rise = still ? 1 : 1 - Math.pow(1 - s.rise, 3)
    g.set('uTime', s.t * 2)
    g.set('uRise', rise)
    g.set('uHover', hv)
    g.set('uColor', ...hexToRgb(color))
    g.set('uHi', ...hexToRgb(highlightColor ?? lighten(color)))
    g.set('uBg', ...hexToRgb(backgroundColor))
    g.set('uGrain', grain)
    g.set('uContours', contours)
    g.set('uFade', fade)
    g.set('uInt', intensity)
    g.draw()
  })

  return (
    <div
      ref={card}
      className={`vc-shader-card ${className}`}
      style={{ width, height, borderRadius, background: backgroundColor, ...style }}
      onPointerMove={(e) => {
        if (!interactive) return
        const r = e.currentTarget.getBoundingClientRect()
        st.current.mx = ((e.clientX - r.left) / r.width) * 2 - 1
        st.current.my = ((e.clientY - r.top) / r.height) * 2 - 1
        st.current.inside = true
      }}
      onPointerLeave={() => (st.current.inside = false)}
    >
      <canvas ref={canvas} style={{ filter: blur ? `blur(${blur}px)` : undefined }} />
      <div ref={content} className="vc-shader-content">
        {children}
      </div>
    </div>
  )
}
