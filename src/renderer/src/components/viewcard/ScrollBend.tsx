import { useEffect, useRef } from 'react'
import { SAMPLES, clamp, loadImage, makeGL, reducedMotion, spr, spring, useFrame, useSize, useWheel, type GL } from './shared'

type Item = string | { src: string; alt?: string }

interface Props {
  items?: Item[]
  orientation?: 'vertical' | 'horizontal'
  /** Swell, pinch, or swell going forward and pinch going back. */
  bend?: 'convex' | 'concave' | 'direction'
  /** How quickly bend builds with speed. */
  strength?: number
  /** Most bend speed can add (0..0.45). */
  maxBend?: number
  /** Bend held at rest. Positive bulges, negative pinches. */
  restBend?: number
  /** Stretch along the strip. 0 widens only; 1 is a full fisheye. */
  axisBias?: number
  /** Lens size relative to the visible strip. */
  lensRadius?: number
  /** Seconds for the bend to follow speed changes. */
  response?: number
  /** Overshoot when the bend springs back (0..1). */
  wobble?: number
  /** Tile size as a fraction of the shorter side. */
  itemSize?: number
  /** Tile width divided by height. */
  aspectRatio?: number
  gap?: number
  radius?: number
  /** Idle drift in px per second. 0 disables. */
  autoScroll?: number
  pauseOnHover?: boolean
  wheelSpeed?: number
  dragSpeed?: number
  /** Seconds of momentum after a flick. */
  inertia?: number
  snap?: boolean
  /** Transparent fade at each end, as a fraction of the strip. */
  fade?: number
  /** Darkening toward the ends (0..1). */
  shade?: number
  /** Colour fringing as the lens bends (0..1). */
  aberration?: number
  paused?: boolean
  /** Render resolution scale. */
  quality?: number
  onIndexChange?: (index: number) => void
  className?: string
}

const FRAG = `precision highp float;
uniform vec2 uRes;uniform sampler2D uTex;uniform float uScroll;uniform float uCount;uniform float uPitch;uniform float uTileW;
uniform float uBend;uniform float uAxis;uniform float uLens;uniform float uFade;uniform float uShade;uniform float uAber;uniform float uHoriz;
vec4 tap(vec2 d,float k){
  float L=(uHoriz>.5?uRes.x:uRes.y)*.5*uLens;
  float a=clamp(d.y/L,-1.,1.);
  float b=k*(1.-a*a);
  float across=d.x*(1.-b);
  float along=d.y*(1.-b*uAxis);
  float u=across/uTileW+.5;
  float s=uScroll-along/uPitch;
  float v=mod(s,uCount)/uCount;
  if(u<0.||u>1.)return vec4(0.);
  return texture2D(uTex,vec2(u,v));
}
void main(){
  vec2 d=gl_FragCoord.xy-uRes*.5;
  if(uHoriz>.5)d=vec2(-d.y,-d.x);
  float A=uAber*abs(uBend)*.25;
  vec4 c=tap(d,uBend);
  float r=tap(d,uBend*(1.+A)).r;
  float bl=tap(d,uBend*(1.-A)).b;
  c.r=mix(c.r,r,step(.001,A));c.b=mix(c.b,bl,step(.001,A));
  float Ls=(uHoriz>.5?uRes.x:uRes.y)*.5;
  float e=abs(d.y)/Ls;
  c*=1.-smoothstep(1.-uFade*2.,1.,e);
  c.rgb*=1.-uShade*smoothstep(.2,1.,e);
  gl_FragColor=c;
}`

/** A strip of image tiles that bulges or pinches like a lens as you scroll it. */
export function ScrollBend({
  items = SAMPLES.slice(0, 8).map((s) => s.src),
  orientation = 'vertical',
  bend = 'direction',
  strength = 1,
  maxBend = 0.38,
  restBend = 0,
  axisBias = 0.75,
  lensRadius = 1,
  response = 0.32,
  wobble = 0.25,
  itemSize = 0.68,
  aspectRatio,
  gap = 16,
  radius = 18,
  autoScroll = 50,
  pauseOnHover = false,
  wheelSpeed = 1,
  dragSpeed = 1,
  inertia = 0.55,
  snap = true,
  fade = 0.16,
  shade = 0.22,
  aberration = 0.4,
  paused = false,
  quality = 1,
  onIndexChange,
  className = ''
}: Props) {
  const root = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<GL | null>(null)
  const [, sz] = useSize(root)
  const horiz = orientation === 'horizontal'
  const ar = aspectRatio ?? (horiz ? 0.78 : 1.35)
  const still = reducedMotion()
  const st = useRef({ pos: 0, vel: 0, bend: spr(restBend), ready: false, hover: false, drag: false, last: 0, quiet: 1, idx: -1, pitchRatio: 1.07 })
  const srcs = items.map((it) => (typeof it === 'string' ? it : it.src))

  useEffect(() => {
    const g = makeGL(canvas.current!, FRAG)
    glRef.current = g
    return () => {
      g?.destroy()
      glRef.current = null
    }
  }, [])

  // Paint every tile, with its gap and rounded corners, into one tall texture.
  const key = srcs.join('|') + ar + gap + radius
  useEffect(() => {
    let dead = false
    st.current.ready = false
    void Promise.all(srcs.map(loadImage)).then((imgs) => {
      const g = glRef.current
      if (dead || !g) return
      const tw = 512, th = Math.round(tw / ar)
      const tile = horiz ? { w: th, h: tw } : { w: tw, h: th }
      // The gap is measured against a 240px tile, then scales with the tile.
      const gpx = Math.round((gap / 240) * tile.h)
      const pitch = tile.h + gpx
      st.current.pitchRatio = pitch / tile.h
      const atlas = document.createElement('canvas')
      atlas.width = tile.w
      atlas.height = pitch * imgs.length
      const ctx = atlas.getContext('2d')!
      imgs.forEach((im, i) => {
        const y = i * pitch + gpx / 2
        ctx.save()
        ctx.beginPath()
        ctx.roundRect(0, y, tile.w, tile.h, (radius / 240) * Math.min(tile.w, tile.h))
        ctx.clip()
        // Cover-fit the image.
        const s = Math.max(tile.w / im.width, tile.h / im.height)
        const w = im.width * s, h = im.height * s
        if (horiz) {
          // Horizontal strips read the texture transposed, so draw the image transposed too.
          ctx.translate(tile.w / 2, y + tile.h / 2)
          ctx.transform(0, 1, 1, 0, 0, 0)
          const s2 = Math.max(tile.h / im.width, tile.w / im.height)
          ctx.drawImage(im, (-im.width * s2) / 2, (-im.height * s2) / 2, im.width * s2, im.height * s2)
        } else ctx.drawImage(im, (tile.w - w) / 2, y + (tile.h - h) / 2, w, h)
        ctx.restore()
      })
      g.texture('uTex', 0, atlas)
      st.current.ready = true
    })
    return () => {
      dead = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, horiz])

  useWheel(root, wheelSpeed > 0, (dy, dx) => {
    const s = st.current
    s.vel += (horiz ? dx || dy : dy) * wheelSpeed * 6
    s.quiet = 0
  })

  useFrame((dt) => {
    const g = glRef.current
    const s = st.current
    const { w: W, h: H } = sz.current
    if (!g || !s.ready || !W || !H) return
    // Tile size on screen: "across" is the strip's width, "along" its scrolling direction.
    const across = itemSize * Math.min(W, H)
    const along = horiz ? across * ar : across / ar
    const pitch = along * s.pitchRatio

    s.quiet += dt
    if (!s.drag) {
      s.pos += s.vel * dt
      s.vel *= Math.pow(0.02, dt / Math.max(0.1, inertia))
      const drift = !paused && !still && !(pauseOnHover && s.hover) && s.quiet > 0.8 ? autoScroll : 0
      s.pos += drift * dt
      if (snap && autoScroll === 0 && s.quiet > 0.15 && Math.abs(s.vel) < 40) {
        const t = Math.round(s.pos / pitch) * pitch
        s.pos += (t - s.pos) * Math.min(1, dt * 8)
      }
    }
    const v = s.drag ? s.vel : s.vel + (s.quiet > 0.8 && !paused ? autoScroll : 0)
    const amt = Math.min(maxBend, (Math.abs(v) / 1000) * strength * 0.6)
    const sign = bend === 'convex' ? 1 : bend === 'concave' ? -1 : Math.sign(v) || 1
    const goal = still ? 0 : restBend + sign * amt
    const k = 40 / (response * response)
    const b = spring(s.bend, goal, k, 2 * Math.sqrt(k) * (1 - wobble * 0.8), dt)

    const n = srcs.length
    const idx = ((Math.round(s.pos / pitch) % n) + n) % n
    if (idx !== s.idx) {
      s.idx = idx
      onIndexChange?.(idx)
    }

    const dpr = Math.min(2, window.devicePixelRatio || 1) * clamp(quality, 0.25, 1)
    g.resize(W, H, dpr)
    g.set('uScroll', s.pos / pitch + 0.5)
    g.set('uCount', n)
    g.set('uPitch', pitch * dpr)
    g.set('uTileW', across * dpr)
    g.set('uBend', b)
    g.set('uAxis', axisBias)
    g.set('uLens', lensRadius)
    g.set('uFade', fade)
    g.set('uShade', shade)
    g.set('uAber', aberration)
    g.set('uHoriz', horiz ? 1 : 0)
    g.gl.clearColor(0, 0, 0, 0)
    g.gl.clear(g.gl.COLOR_BUFFER_BIT)
    g.draw()
  })

  const move = (d: number): void => {
    const s = st.current
    s.vel += d
    s.quiet = 0
  }

  return (
    <div
      ref={root}
      className={`vc-bend ${className}`}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Image gallery"
      style={{ touchAction: 'none' }}
      onKeyDown={(e) => {
        const step = 900
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown') move(step)
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') move(-step)
      }}
      onPointerEnter={() => (st.current.hover = true)}
      onPointerLeave={() => (st.current.hover = false)}
      onPointerDown={(e) => {
        if (dragSpeed <= 0) return
        const s = st.current
        s.drag = true
        s.last = horiz ? e.clientX : e.clientY
        s.vel = 0
        s.quiet = 0
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        const s = st.current
        if (!s.drag) return
        const p = horiz ? e.clientX : e.clientY
        const d = (s.last - p) * dragSpeed
        s.last = p
        s.pos += d
        s.vel = s.vel * 0.5 + d * 60 * 0.5
        s.quiet = 0
      }}
      onPointerUp={() => {
        st.current.drag = false
        st.current.quiet = 0
      }}
    >
      <canvas ref={canvas} />
    </div>
  )
}
