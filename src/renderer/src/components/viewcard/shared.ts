/**
 * Helpers shared by the View Card components: sample artwork (generated SVGs, so
 * everything works offline), an animation-frame hook, springs, sizing and WebGL.
 *
 * These components are Lawnak Vision's own versions of effects shown in the
 * React Bits Pro catalog. They are written from the public descriptions only.
 */
import { useEffect, useRef, useState, type RefObject } from 'react'

// ---------- Sample artwork ----------

const PALETTES: [string, string, string][] = [
  ['#ff5f6d', '#ffc371', '#2a1b3d'],
  ['#5227ff', '#b19eef', '#0e0b1f'],
  ['#00c9a7', '#c4fcef', '#073b3a'],
  ['#f72585', '#4cc9f0', '#1a0b2e'],
  ['#ffbe0b', '#fb5607', '#22223b'],
  ['#3a86ff', '#8338ec', '#0b132b'],
  ['#06d6a0', '#ffd166', '#1b2021'],
  ['#ef476f', '#ffd6e0', '#2b0f1a'],
  ['#90e0ef', '#0077b6', '#03045e'],
  ['#e9c46a', '#2a9d8f', '#264653'],
  ['#ff99c8', '#fcf6bd', '#3c1642'],
  ['#a7c957', '#f2e8cf', '#386641']
]

const TITLES = [
  'Neon Dunes', 'Quiet Orbit', 'Saffron Hour', 'Night Market', 'Glass Garden', 'Low Tide',
  'Desert Bloom', 'Paper Moon', 'Copper Sky', 'Soft Static', 'Blue Hour', 'Mint Signal'
]
const ARTISTS = ['Studio Lawnak', 'Nora Vale', 'The Palms', 'Sami & Co.', 'Lumen', 'Atlas Club']

function rng(seed: number): () => number {
  let s = (seed * 9301 + 49297) % 233280 || 1
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/** An abstract poster as an SVG data URL. Six styles, twelve palettes. */
export function artSvg(i: number, w = 480, h = 480): string {
  const [a, b, bg] = PALETTES[i % PALETTES.length]
  const r = rng(i * 31 + 5)
  const style = i % 6
  let g = ''
  if (style === 0) {
    // Sunset with sliced sun
    g += `<rect width="${w}" height="${h}" fill="url(#lg)"/>`
    g += `<circle cx="${w / 2}" cy="${h * 0.55}" r="${w * 0.28}" fill="${b}"/>`
    for (let k = 0; k < 6; k++) g += `<rect x="0" y="${h * 0.58 + k * k * 3 + k * 10}" width="${w}" height="${3 + k * 1.6}" fill="${bg}"/>`
    g += `<rect y="${h * 0.8}" width="${w}" height="${h * 0.2}" fill="${bg}"/>`
  } else if (style === 1) {
    // Soft blobs
    g += `<rect width="${w}" height="${h}" fill="${bg}"/>`
    for (let k = 0; k < 6; k++)
      g += `<circle cx="${r() * w}" cy="${r() * h}" r="${w * (0.15 + r() * 0.25)}" fill="${[a, b, '#ffffff'][k % 3]}" opacity="${0.55 + r() * 0.4}" filter="url(#blur)"/>`
  } else if (style === 2) {
    // Rings
    g += `<rect width="${w}" height="${h}" fill="${bg}"/>`
    const cx = w * (0.3 + r() * 0.4), cy = h * (0.3 + r() * 0.4)
    for (let k = 9; k > 0; k--) g += `<circle cx="${cx}" cy="${cy}" r="${k * w * 0.075}" fill="${k % 2 ? a : b}" opacity="${0.4 + k * 0.06}"/>`
  } else if (style === 3) {
    // Nested arches
    g += `<rect width="${w}" height="${h}" fill="${b}"/>`
    const cols = [bg, a, b, '#ffffff', a]
    for (let k = 0; k < 5; k++) {
      const aw = w * (0.8 - k * 0.14), x = (w - aw) / 2, y = h * (0.22 + k * 0.1)
      g += `<path d="M${x} ${h} V${y + aw / 2} A${aw / 2} ${aw / 2} 0 0 1 ${x + aw} ${y + aw / 2} V${h} Z" fill="${cols[k]}"/>`
    }
  } else if (style === 4) {
    // Diagonal stripes
    g += `<rect width="${w}" height="${h}" fill="${bg}"/><g transform="rotate(-35 ${w / 2} ${h / 2})">`
    for (let k = -6; k < 14; k++) g += `<rect x="${-w}" y="${k * h * 0.09}" width="${w * 3}" height="${h * 0.045}" fill="${k % 2 ? a : b}"/>`
    g += `</g><circle cx="${w * 0.68}" cy="${h * 0.32}" r="${w * 0.16}" fill="${bg}" stroke="#fff" stroke-width="6"/>`
  } else {
    // Bauhaus tiles
    const n = 3, s = w / n
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const c1 = [a, b, bg][(x + y) % 3], c2 = [b, bg, a][(x + 2 * y) % 3]
        g += `<rect x="${x * s}" y="${y * s}" width="${s}" height="${s}" fill="${c1}"/>`
        const t = Math.floor(r() * 3)
        if (t === 0) g += `<circle cx="${x * s + s / 2}" cy="${y * s + s / 2}" r="${s * 0.38}" fill="${c2}"/>`
        else if (t === 1) g += `<path d="M${x * s} ${y * s + s} A${s} ${s} 0 0 1 ${x * s + s} ${y * s}V${y * s + s}Z" fill="${c2}"/>`
        else g += `<path d="M${x * s} ${y * s}H${x * s + s}L${x * s} ${y * s + s}Z" fill="${c2}"/>`
      }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset=".7" stop-color="${a}"/></linearGradient>
<filter id="blur"><feGaussianBlur stdDeviation="${w * 0.05}"/></filter></defs>${g}
<rect width="${w}" height="${h}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="2"/></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export interface Sample {
  src: string
  alt: string
  title: string
  subtitle: string
  /** The poster's main colour, used as an accent. */
  color: string
}

export const SAMPLES: Sample[] = TITLES.map((title, i) => ({
  src: artSvg(i),
  alt: title,
  title,
  subtitle: ARTISTS[i % ARTISTS.length],
  color: PALETTES[i % PALETTES.length][0]
}))

const imageCache = new Map<string, Promise<HTMLImageElement>>()
/** Loads an image once and keeps it for canvas drawing. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = imageCache.get(src)
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
    imageCache.set(src, p)
  }
  return p
}

// ---------- Animation ----------

/** Calls `cb(dt, time)` every animation frame while mounted (and `active`). */
export function useFrame(cb: (dt: number, t: number) => void, active = true): void {
  const ref = useRef(cb)
  ref.current = cb
  useEffect(() => {
    if (!active) return
    let id = 0
    let last = performance.now()
    const start = last
    const loop = (now: number): void => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      ref.current(dt, (now - start) / 1000)
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [active])
}

export interface Spr {
  x: number
  v: number
}
export const spr = (x = 0): Spr => ({ x, v: 0 })

/** Steps a damped spring toward `target`. k = stiffness, d = damping (mass 1). */
export function spring(s: Spr, target: number, k: number, d: number, dt: number): number {
  const n = Math.max(1, Math.ceil(dt * 240))
  const h = dt / n
  for (let i = 0; i < n; i++) {
    s.v += (-k * (s.x - target) - d * s.v) * h
    s.x += s.v * h
  }
  return s.x
}

export const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v))
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
export const smooth = (t: number): number => t * t * (3 - 2 * t)

export const reducedMotion = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Element size, kept fresh with a ResizeObserver. Returns state (for render) and a ref (for frame loops). */
export function useSize(ref: RefObject<HTMLElement | null>): [{ w: number; h: number }, RefObject<{ w: number; h: number }>] {
  const [size, setSize] = useState({ w: 0, h: 0 })
  const live = useRef({ w: 0, h: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth, h = el.clientHeight
      live.current = { w, h }
      setSize({ w, h })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return [size, live]
}

/** A non-passive wheel listener, so the component can stop the page from scrolling. */
export function useWheel(ref: RefObject<HTMLElement | null>, enabled: boolean, cb: (dy: number, dx: number) => void): void {
  const cbr = useRef(cb)
  cbr.current = cb
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    const h = (e: WheelEvent): void => {
      e.preventDefault()
      cbr.current(e.deltaY, e.deltaX)
    }
    el.addEventListener('wheel', h, { passive: false })
    return () => el.removeEventListener('wheel', h)
  }, [enabled, ref])
}

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h.slice(0, 6), 16) || 0
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

// ---------- WebGL ----------

export interface GL {
  gl: WebGLRenderingContext
  set: (name: string, ...v: number[]) => void
  texture: (name: string, unit: number, source: TexImageSource) => void
  draw: () => void
  resize: (w: number, h: number, dpr: number) => void
  destroy: () => void
}

/** A full-screen fragment shader on a canvas. Returns null when WebGL is not available. */
export function makeGL(canvas: HTMLCanvasElement, frag: string, opts: WebGLContextAttributes = {}): GL | null {
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: true, alpha: true, ...opts })
  if (!gl) return null
  const sh = (type: number, src: string): WebGLShader => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(s))
    return s
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'))
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag))
  gl.linkProgram(prog)
  gl.useProgram(prog)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const locs = new Map<string, WebGLUniformLocation | null>()
  const u = (n: string): WebGLUniformLocation | null => {
    if (!locs.has(n)) locs.set(n, gl.getUniformLocation(prog, n))
    return locs.get(n)!
  }
  const textures = new Map<string, WebGLTexture>()
  return {
    gl,
    set(name, ...v) {
      const l = u(name)
      if (!l) return
      if (v.length === 1) gl.uniform1f(l, v[0])
      else if (v.length === 2) gl.uniform2f(l, v[0], v[1])
      else if (v.length === 3) gl.uniform3f(l, v[0], v[1], v[2])
      else gl.uniform4f(l, v[0], v[1], v[2], v[3])
    },
    texture(name, unit, source) {
      let t = textures.get(name)
      if (!t) {
        t = gl.createTexture()!
        textures.set(name, t)
      }
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, t)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      const l = u(name)
      if (l) gl.uniform1i(l, unit)
    },
    draw() {
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
    resize(w, h, dpr) {
      const W = Math.max(1, Math.round(w * dpr)), H = Math.max(1, Math.round(h * dpr))
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W
        canvas.height = H
      }
      gl.viewport(0, 0, W, H)
      this.set('uRes', W, H)
    },
    destroy() {
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }
}

/** Shared GLSL noise. */
export const GLSL_NOISE = `
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),u.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*vn(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
`
