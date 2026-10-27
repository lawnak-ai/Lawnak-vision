import type { ElementType, SlideElement } from './types'
import { newId } from './ids'

/**
 * Designer components: the catalog shown in the Insert bar, the ready-made slide
 * layouts, and how each component turns into HTML inside a slide.
 */

export interface ElementKind {
  /** Catalog key; "title" and "text" are both text components. */
  kind: string
  type: ElementType
  label: string
  w: number
  h: number
  props: SlideElement['props']
  /** "motion" puts it in the Motion group of the Insert bar. */
  group?: 'motion'
}

export const ELEMENT_KINDS: ElementKind[] = [
  { kind: 'title', type: 'text', label: 'Title', w: 900, h: 100,
    props: { text: 'Your title', size: 60, weight: 800, font: 'heading', align: 'start', color: '' } },
  { kind: 'text', type: 'text', label: 'Text', w: 560, h: 120,
    props: { text: 'Write something here', size: 28, weight: 400, font: 'body', align: 'start', color: '' } },
  { kind: 'image', type: 'image', label: 'Image', w: 480, h: 320, props: { src: '', fit: 'cover', radius: 16 } },
  { kind: 'shape', type: 'shape', label: 'Shape', w: 300, h: 200, props: { shape: 'rect', fill: '', opacity: 1, radius: 20 } },
  { kind: 'button', type: 'button', label: 'Button', w: 240, h: 64, props: { text: 'Get started', variant: 'solid' } },
  { kind: 'icon', type: 'icon', label: 'Icon', w: 120, h: 120, props: { emoji: '🚀' } },
  { kind: 'chart', type: 'chart', label: 'Chart', w: 640, h: 400,
    props: { chartType: 'bar', data: 'Month,2025,2026\nJan,12,18\nFeb,15,22\nMar,19,30\nApr,24,37', stacked: false, legend: true, title: '', card: false } },
  { kind: 'map', type: 'map', label: 'Map', w: 640, h: 400,
    props: { lat: 24.7136, lng: 46.6753, zoom: 11, markers: '24.7136, 46.6753, Riyadh', style: 'auto' } },
  { kind: 'table', type: 'table', label: 'Table', w: 640, h: 240,
    props: { data: 'Plan,Users,Price\nStarter,1-5,$9\nTeam,6-50,$29\nEnterprise,50+,Custom', header: true, title: '', card: false } },
  { kind: 'kpi', type: 'kpi', label: 'KPI card', w: 280, h: 170, props: { label: 'Revenue', value: '$4.2M', delta: '+12%', up: true } },
  { kind: 'marquee', type: 'marquee', label: 'Logo loop', w: 1000, h: 90,
    props: { items: 'Riyadh|Jeddah|Dubai|Cairo|Doha|Kuwait', size: 30, gap: 72, speed: 22 } },
  { kind: 'circle', type: 'circle', label: 'Circle text', w: 200, h: 200, props: { text: 'LAWNAK • VISION • 2026 • ', color: '' } },
  { kind: 'orb', type: 'orb', label: 'Crystal orb', w: 340, h: 340, props: { energy: 0.8, color: '' } },
  { kind: 'coverflow', type: 'coverflow', label: 'Coverflow', w: 1000, h: 440,
    props: { items: '🚀|Launch|Q1 2027\n📊|Analytics|Real-time dashboards\n🔒|Security|ISO 27001\n🌍|Markets|6 countries\n🤝|Partners|120 integrations', interval: 3 } },
  { kind: 'ring', type: 'ring', label: '3D ring', w: 1000, h: 440,
    props: { items: '⚡|Fast|Under a second\n🧠|Smart|AI insights\n🔗|Connected|120+ apps\n🛡️|Secure|Bank-grade\n📱|Mobile|iOS and Android\n🌙|Dark mode|Easy on the eyes', axis: 'x', mode: 'step' } },
  { kind: 'globe', type: 'globe', label: 'Globe', w: 520, h: 520,
    props: { places: '24.7136, 46.6753, Riyadh\n30.0444, 31.2357, Cairo\n51.5072, -0.1276, London\n35.6762, 139.6503, Tokyo\n40.7128, -74.006, New York', speed: 40, arcs: true, labels: true, color: '' } },
  // Motion components: picture lists are "picture URL | title | subtitle" lines; empty pictures get artwork.
  { kind: 'rotcards', type: 'rotcards', label: 'Card ring', w: 1000, h: 460, group: 'motion',
    props: { items: '🚀|Launch|Q1 2027\n📊|Analytics|Live dashboards\n🔒|Security|ISO 27001\n🌍|Markets|6 countries\n🤝|Partners|120 apps\n⚡|Speed|Under a second\n🧠|AI|Smart insights\n📱|Mobile|iOS & Android', speed: 20, dir: 'forward' } },
  { kind: 'shadercard', type: 'shadercard', label: 'Flame card', w: 340, h: 440, group: 'motion',
    props: { title: 'Lawnak Pro', text: 'Decks that move. Shaders, 3D and motion, ready for your next pitch.', cta: 'Get started →', color: '' } },
  { kind: 'ribbon', type: 'ribbon', label: 'Depth ribbon', w: 1100, h: 560, group: 'motion',
    props: { items: '', path: 'loop', tour: 'cycle', count: 48, speed: 0.6, color: '' } },
  { kind: 'albumrail', type: 'albumrail', label: 'Album rail', w: 1000, h: 520, group: 'motion',
    props: { items: '', vinyl: true, autoplay: true, interval: 4 } },
  { kind: 'reel', type: 'reel', label: 'Photo reel', w: 1000, h: 480, group: 'motion', props: { items: '', mode: 'sweep' } },
  { kind: 'sticker', type: 'sticker', label: 'Sticker', w: 220, h: 220, group: 'motion',
    props: { src: '', art: 1, finish: 'gloss', shape: 'rounded', rotation: -6, border: 8 } },
  { kind: 'bend', type: 'bend', label: 'Lens strip', w: 520, h: 640, group: 'motion', props: { items: '', orientation: 'vertical', drift: 50 } },
  { kind: 'depthcard', type: 'depthcard', label: 'Depth card', w: 300, h: 400, group: 'motion',
    props: { src: '', title: 'Depth Card', text: 'Move the pointer over the card to see its layers drift apart.' } },
  { kind: 'lenticular', type: 'lenticular', label: 'Lenticular', w: 1000, h: 470, group: 'motion', props: { items: '', loop: false } },
  { kind: 'textpath', type: 'textpath', label: 'Text path', w: 900, h: 260, group: 'motion',
    props: { text: 'LAWNAK VISION • DECKS THAT MOVE • ', path: 'wave', size: 30, speed: 18, reversed: false, color: '' } },
  { kind: 'cursor', type: 'cursor', label: 'Cursor', w: 120, h: 120, group: 'motion', props: { targets: 'cards', size: 40, elastic: true, color: '' } },
  { kind: 'pills', type: 'pills', label: 'Pills', w: 900, h: 420, group: 'motion',
    props: { items: 'Design|Motion|3D & Shaders|Story|Data', size: 64, strength: 24, extras: true } }
]

export const CHART_TYPES = [
  { id: 'bar', name: 'Bar' },
  { id: 'hbar', name: 'Horizontal bar' },
  { id: 'line', name: 'Line' },
  { id: 'area', name: 'Area' },
  { id: 'pie', name: 'Pie' },
  { id: 'doughnut', name: 'Doughnut' },
  { id: 'radar', name: 'Radar' },
  { id: 'polarArea', name: 'Polar area' }
]

export const ANIMATIONS = [
  { id: '', name: 'None' },
  { id: 'fade-up', name: 'Fade up' },
  { id: 'fade-in', name: 'Fade in' },
  { id: 'zoom-in', name: 'Zoom in' },
  { id: 'pop', name: 'Pop' },
  { id: 'blur-in', name: 'Blur in' },
  { id: 'flip-up', name: 'Flip up' },
  { id: 'slide-start', name: 'Slide in' },
  { id: 'reveal', name: 'Wipe' }
]

/** Places for the map picker, so a map can be set without typing coordinates. */
export const PLACES: { name: string; lat: number; lng: number; zoom: number }[] = [
  { name: 'Riyadh', lat: 24.7136, lng: 46.6753, zoom: 11 },
  { name: 'Jeddah', lat: 21.4858, lng: 39.1925, zoom: 11 },
  { name: 'Makkah', lat: 21.4225, lng: 39.8262, zoom: 13 },
  { name: 'Madinah', lat: 24.4672, lng: 39.6111, zoom: 12 },
  { name: 'Dammam', lat: 26.4207, lng: 50.0888, zoom: 11 },
  { name: 'Saudi Arabia', lat: 23.9, lng: 45.1, zoom: 5 },
  { name: 'Dubai', lat: 25.2048, lng: 55.2708, zoom: 11 },
  { name: 'Doha', lat: 25.2854, lng: 51.531, zoom: 11 },
  { name: 'Kuwait City', lat: 29.3759, lng: 47.9774, zoom: 11 },
  { name: 'Cairo', lat: 30.0444, lng: 31.2357, zoom: 11 },
  { name: 'Middle East', lat: 26, lng: 45, zoom: 4 },
  { name: 'London', lat: 51.5072, lng: -0.1276, zoom: 11 },
  { name: 'New York', lat: 40.7128, lng: -74.006, zoom: 11 },
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503, zoom: 11 },
  { name: 'World', lat: 25, lng: 10, zoom: 2 }
]

export function newElement(kind: string, at?: { x: number; y: number }): SlideElement {
  const k = ELEMENT_KINDS.find((e) => e.kind === kind) ?? ELEMENT_KINDS[1]
  const x = Math.round((at?.x ?? 640) - k.w / 2)
  const y = Math.round((at?.y ?? 360) - k.h / 2)
  return { id: newId('e'), type: k.type, x, y, w: k.w, h: k.h, anim: 'fade-up', props: { ...k.props } }
}

// ---------- HTML ----------

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
const num = (v: unknown, d: number): number => (typeof v === 'number' && isFinite(v) ? v : isFinite(Number(v)) && v !== '' ? Number(v) : d)
const r = (n: number): number => Math.round(n * 10) / 10
/** Only plain colors or theme variables, so a value can't break out of the style attribute. */
function color(v: unknown, fallback: string): string {
  const s = String(v ?? '').trim()
  if (/^#[0-9a-f]{3,8}$/i.test(s) || /^var\(--[\w-]+\)$/.test(s)) return s
  return fallback
}
function safeSrc(v: unknown): string {
  const s = String(v ?? '')
  return /^data:image\/[\w.+-]+;base64,[\w+/=]+$/.test(s) || /^https?:\/\/[^\s"'<>]+$/.test(s) ? s : ''
}

/** Reads "label,series A,series B" lines. Commas inside a cell are not supported. */
export function parseCsv(text: unknown): string[][] {
  return String(text ?? '')
    .split(/\r?\n/)
    .map((l) => l.split(',').map((c) => c.trim()))
    .filter((row) => row.some((c) => c !== ''))
}

/** The curve a text path runs along, drawn to fit the element (w x h). */
export function textPathD(kind: string, w: number, h: number, size: number): string {
  const m = size * 0.9
  const pts = (n: number, f: (t: number) => [number, number], close = false): string =>
    Array.from({ length: n + 1 }, (_, i) => f(i / n))
      .map(([x, y], i) => `${i ? 'L' : 'M'}${r(x)},${r(y)}`)
      .join('') + (close ? 'Z' : '')
  if (kind === 'circle') {
    const rad = Math.max(10, Math.min(w, h) / 2 - m)
    return `M${r(w / 2)},${r(h / 2 - rad)}a${r(rad)},${r(rad)} 0 1,1 0,${r(2 * rad)}a${r(rad)},${r(rad)} 0 1,1 0,${r(-2 * rad)}`
  }
  if (kind === 'arch') return `M${r(m)},${r(h - m)}Q${r(w / 2)},${r(-h + 3 * m)} ${r(w - m)},${r(h - m)}`
  if (kind === 'loop')
    return pts(160, (t) => {
      const a = t * Math.PI * 2
      return [w / 2 + (w / 2 - m) * Math.sin(a), h / 2 + (h / 2 - m) * Math.sin(a) * Math.cos(a) * 2]
    }, true)
  // Wave: one and a half swings across the element.
  return pts(120, (t) => [m + t * (w - 2 * m), h / 2 + (h / 2 - m) * Math.sin(t * Math.PI * 3)])
}

/** A colour for a data attribute: a plain hex colour only (the runtime can't read theme variables there). */
const hexColor = (v: unknown): string => (/^#[0-9a-f]{6}$/i.test(String(v ?? '')) ? String(v) : '')

export function renderElement(el: SlideElement): string {
  const p = el.props
  const classes = ['el', 'el-' + el.type]
  const anim = (el.anim ?? '').replace(/[^\w-]/g, '')
  if (anim) classes.push(anim)
  let style = `left:${r(el.x)}px;top:${r(el.y)}px;width:${r(el.w)}px;height:${r(el.h)}px`
  if (typeof el.delay === 'number' && isFinite(el.delay)) style += `;--d:${Math.max(0, el.delay)}s`
  let inner = ''
  let data = ''
  switch (el.type) {
    case 'text': {
      const align = ['start', 'center', 'end'].includes(String(p.align)) ? String(p.align) : 'start'
      style += `;font-size:${num(p.size, 28)}px;font-weight:${num(p.weight, 400)};text-align:${align}`
      if (p.color) style += `;color:${color(p.color, 'inherit')}`
      if (p.font === 'heading') style += ';font-family:var(--heading-font);line-height:1.15;letter-spacing:-.01em'
      inner = esc(p.text).replace(/\n/g, '<br>')
      const fx = String(p.fx ?? '').replace(/[^\w-]/g, '')
      if (fx === 'fx-rotate' || fx === 'fx-type') {
        const words = String(p.words ?? '').split('|').map((w) => w.trim()).filter(Boolean)
        inner += `${inner ? ' ' : ''}<span class="${fx}" data-words="${esc(words.join('|'))}">${esc(words[0] ?? '')}</span>`
      } else if (fx) {
        const c = fx === 'fx-shiny' && p.color ? ` style="--fx-c:${color(p.color, 'var(--fg)')}"` : ''
        inner = `<span class="${fx}"${c}>${inner}</span>`
      }
      break
    }
    case 'image': {
      const src = safeSrc(p.src)
      const fit = p.fit === 'contain' ? 'contain' : 'cover'
      inner = src
        ? `<img src="${esc(src)}" alt="" style="object-fit:${fit};border-radius:${num(p.radius, 0)}px">`
        : '<div class="el-placeholder">Image</div>'
      break
    }
    case 'shape': {
      const radius = p.shape === 'circle' ? '50%' : p.shape === 'pill' ? '999px' : num(p.radius, 0) + 'px'
      style += `;background:${color(p.fill, 'var(--accent)')};opacity:${Math.min(1, Math.max(0, num(p.opacity, 1)))};border-radius:${radius}`
      break
    }
    case 'button':
      inner = `<span class="btn${p.variant === 'ghost' ? ' ghost' : ''}">${esc(p.text)}</span>`
      break
    case 'icon':
      style += `;font-size:${Math.round(Math.min(el.w, el.h) * 0.8)}px`
      inner = esc(p.emoji)
      break
    case 'chart':
      data = ` data-chartjs="${esc(JSON.stringify({ type: p.chartType, data: p.data, stacked: !!p.stacked, legend: p.legend !== false }))}"`
      if (p.card) classes.push('glass', 'el-card')
      inner = (p.title ? `<div class="el-title">${esc(p.title)}</div>` : '') + '<div class="el-cv"><canvas></canvas></div>'
      break
    case 'map':
      data = ` data-map="${esc(JSON.stringify({ lat: num(p.lat, 0), lng: num(p.lng, 0), zoom: num(p.zoom, 3), markers: p.markers ?? '', style: p.style ?? 'auto' }))}"`
      break
    case 'table': {
      const rows = parseCsv(p.data)
      const head = p.header !== false && rows.length ? rows.shift()! : null
      if (p.card) classes.push('glass', 'el-card')
      inner =
        (p.title ? `<div class="el-title">${esc(p.title)}</div>` : '') +
        '<table class="data">' +
        (head ? '<tr>' + head.map((c) => `<th>${esc(c)}</th>`).join('') + '</tr>' : '') +
        rows.map((row) => '<tr>' + row.map((c) => `<td>${esc(c)}</td>`).join('') + '</tr>').join('') +
        '</table>'
      break
    }
    case 'marquee': {
      const items = String(p.items ?? '').split('|').map((w) => w.trim()).filter(Boolean)
      classes.push('fx-marquee')
      style += `;font-size:${num(p.size, 30)}px;--gap:${num(p.gap, 64)}px;--mqd:${Math.max(4, num(p.speed, 22))}s`
      inner = `<div class="fx-mq">${items.map((i) => `<span>${esc(i)}</span>`).join('')}</div>`
      break
    }
    case 'orb':
      classes.push('fx3-orb')
      data = ` data-energy="${Math.min(1, Math.max(0, num(p.energy, 0.8)))}"` + (p.color ? ` data-color="${esc(color(p.color, ''))}"` : '')
      break
    case 'coverflow':
      classes.push('fx3-cover')
      data = ` data-items="${esc(p.items)}" data-interval="${Math.max(1, num(p.interval, 3))}"`
      break
    case 'ring':
      classes.push('fx3-ring')
      data = ` data-items="${esc(p.items)}" data-axis="${p.axis === 'y' ? 'y' : 'x'}" data-mode="${['step', 'drift', 'off'].includes(String(p.mode)) ? p.mode : 'step'}"`
      break
    case 'globe': {
      // Places are "lat, lng, label" lines; keep only lines that start with two numbers.
      const places = String(p.places ?? '')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => /^-?[\d.]+\s*,\s*-?[\d.]+/.test(l))
      classes.push('fx3-globe')
      data =
        ` data-places="${esc(places.join('\n'))}" data-speed="${Math.max(0, num(p.speed, 40))}"` +
        (p.arcs === false ? ' data-arcs="false"' : '') +
        (p.labels === false ? ' data-labels="false"' : '') +
        (color(p.color, '') ? ` data-color="${esc(color(p.color, ''))}"` : '')
      break
    }
    case 'circle':
      classes.push('fx-circle')
      if (p.color) style += `;color:${color(p.color, 'inherit')}`
      data = ` data-text="${esc(p.text)}"`
      break
    case 'shadercard':
      classes.push('fxp-shadercard')
      style += `;font-size:${r(Math.max(10, el.w * 0.055))}px`
      if (hexColor(p.color)) data = ` data-color="${hexColor(p.color)}"`
      inner =
        `<div class="fxp-in"><div class="fxp-sc-body"><h3>${esc(p.title)}</h3>` +
        (p.text ? `<p>${esc(p.text)}</p>` : '') +
        (p.cta ? `<span class="fxp-sc-cta">${esc(p.cta)}</span>` : '') +
        '</div></div>'
      break
    case 'depthcard': {
      classes.push('fxp-depthcard')
      style += `;font-size:${r(Math.max(10, el.w * 0.06))}px`
      const src = safeSrc(p.src)
      inner =
        `<div class="fxp-in"><div class="fxp-dc-bg"${src ? ` style="background-image:url('${esc(src)}')"` : ''}></div>` +
        '<div class="fxp-dc-layer"></div><div class="fxp-dc-spot"></div>' +
        `<div class="fxp-dc-body"><h3>${esc(p.title)}</h3>${p.text ? `<p>${esc(p.text)}</p>` : ''}</div></div>`
      break
    }
    case 'sticker': {
      classes.push('fxp-sticker')
      const src = safeSrc(p.src)
      data =
        (src ? ` data-src="${esc(src)}"` : '') +
        ` data-art="${Math.round(num(p.art, 1))}" data-finish="${['gloss', 'matte', 'holo'].includes(String(p.finish)) ? p.finish : 'gloss'}"` +
        ` data-shape="${p.shape === 'circle' ? 'circle' : 'rounded'}" data-rotation="${num(p.rotation, -6)}" data-border="${Math.max(0, num(p.border, 8))}"`
      break
    }
    case 'textpath': {
      classes.push('fxp-textpath')
      const size = Math.max(8, num(p.size, 30))
      const kind = ['wave', 'circle', 'loop', 'arch'].includes(String(p.path)) ? String(p.path) : 'wave'
      const id = 'fxp-tp-' + String(el.id).replace(/[^\w-]/g, '')
      const text = String(p.text ?? '') || 'Your text goes here • '
      if (p.color) style += `;color:${color(p.color, 'inherit')}`
      data =
        ` data-speed="${Math.max(0, num(p.speed, 18))}"` +
        (p.reversed ? ' data-reversed="true"' : '') +
        (kind === 'circle' || kind === 'loop' ? ' data-closed="true"' : '')
      // The runtime measures the text and fills the path; this first fill is for the still picture.
      const copies = Math.max(2, Math.ceil((el.w * 1.6) / Math.max(1, text.length * size * 0.55)) + 1)
      inner =
        `<svg viewBox="0 0 ${r(el.w)} ${r(el.h)}" role="img" aria-label="${esc(text)}"><defs><path id="${id}" d="${textPathD(kind, el.w, el.h, size)}"/></defs>` +
        `<text class="fxp-tp-m" style="font-size:${size}px;font-weight:600;letter-spacing:.06em" opacity="0" aria-hidden="true">${esc(text)}</text>` +
        `<text style="font-size:${size}px;font-weight:600;letter-spacing:.06em"><textPath href="#${id}">${esc(text.repeat(copies))}</textPath></text></svg>`
      break
    }
    case 'cursor':
      classes.push('fxp-cursor')
      data =
        ` data-targets="${['buttons', 'cards', 'none'].includes(String(p.targets)) ? p.targets : 'cards'}" data-size="${Math.max(12, num(p.size, 40))}"` +
        (p.elastic === false ? ' data-elastic="false"' : '') +
        (hexColor(p.color) ? ` data-color="${hexColor(p.color)}"` : '')
      break
    case 'pills':
      classes.push('fxp-pills')
      data =
        ` data-items="${esc(p.items)}" data-size="${Math.max(24, num(p.size, 64))}" data-strength="${Math.max(0, num(p.strength, 24))}"` +
        (p.extras === false ? ' data-extras="false"' : '')
      break
    case 'rotcards':
    case 'ribbon':
    case 'albumrail':
    case 'reel':
    case 'bend':
    case 'lenticular': {
      classes.push('fxp-' + el.type)
      data = ` data-items="${esc(p.items)}"`
      const opt = (k: string, allowed: string[]): void => {
        if (allowed.includes(String(p[k]))) data += ` data-${k}="${p[k]}"`
      }
      if (el.type === 'rotcards') {
        data += ` data-speed="${Math.max(0, num(p.speed, 20))}"`
        if (p.dir === 'reverse') data += ' data-dir="reverse"'
      } else if (el.type === 'ribbon') {
        opt('path', ['loop', 'knot', 'wave'])
        opt('tour', ['cycle', 'ride', 'overview'])
        data += ` data-count="${Math.min(240, Math.max(4, Math.round(num(p.count, 48))))}" data-speed="${num(p.speed, 0.6)}"`
        if (hexColor(p.color)) data += ` data-color="${hexColor(p.color)}"`
      } else if (el.type === 'albumrail') {
        data += ` data-interval="${Math.max(1, num(p.interval, 4))}"`
        if (p.vinyl === false) data += ' data-vinyl="false"'
        if (p.autoplay === false) data += ' data-autoplay="false"'
      } else if (el.type === 'reel') opt('mode', ['sweep', 'cycle', 'off'])
      else if (el.type === 'bend') {
        opt('orientation', ['vertical', 'horizontal'])
        data += ` data-drift="${num(p.drift, 50)}"`
      } else if (el.type === 'lenticular' && p.loop) data += ' data-loop="true"'
      break
    }
    case 'kpi':
      classes.push('glass', 'kpi')
      inner =
        `<span class="label">${esc(p.label)}</span><span class="value" data-count>${esc(p.value)}</span>` +
        (p.delta
          ? `<span class="delta ${p.up === false ? 'down' : 'up'}${p.tone === 'good' ? ' good' : p.tone === 'bad' ? ' bad' : ''}">${esc(p.delta)}</span>`
          : '')
      break
  }
  const hover = String(p.hover ?? '').replace(/[^\w-]/g, '')
  if (hover) classes.push(hover)
  return `<div class="${classes.join(' ')}" data-el="${esc(el.id)}"${data} style="${style}">${inner}</div>`
}

export function renderElements(elements?: SlideElement[]): string {
  return elements?.length ? '\n' + elements.map(renderElement).join('\n') : ''
}

export const hasType = (elements: SlideElement[] | undefined, type: ElementType): boolean =>
  !!elements?.some((e) => e.type === type)

// ---------- Ready-made slide layouts ----------

export interface Layout {
  id: string
  name: string
  make: () => SlideElement[]
}

type Spec = [kind: string, x: number, y: number, w: number, h: number, props?: SlideElement['props'], anim?: string]

function build(specs: Spec[]): SlideElement[] {
  return specs.map(([kind, x, y, w, h, props, anim]) => {
    const el = newElement(kind)
    return { ...el, x, y, w, h, anim: anim ?? el.anim, props: { ...el.props, ...props } }
  })
}

const MUTED = 'var(--muted)'
const title = (text: string, y = 64, extra: SlideElement['props'] = {}): Spec =>
  ['title', 88, y, 1104, 84, { text, size: 52, ...extra }, 'fade-up']

export const LAYOUTS: Layout[] = [
  {
    id: 'title',
    name: 'Title',
    make: () =>
      build([
        ['shape', 590, 200, 100, 8, { shape: 'pill' }, 'zoom-in'],
        ['title', 140, 240, 1000, 120, { text: 'Presentation title', size: 76, align: 'center' }, 'blur-in'],
        ['text', 240, 380, 800, 60, { text: 'A short subtitle about the topic', size: 30, align: 'center', color: MUTED }]
      ])
  },
  {
    id: 'title-text',
    name: 'Title and text',
    make: () =>
      build([
        title('Slide title'),
        ['text', 88, 180, 1104, 460, { text: '• First point\n• Second point\n• Third point', size: 32 }]
      ])
  },
  {
    id: 'two-columns',
    name: 'Two columns',
    make: () =>
      build([
        title('Compare two things'),
        ['title', 88, 180, 520, 56, { text: 'Before', size: 34 }],
        ['text', 88, 244, 520, 380, { text: '• Point one\n• Point two\n• Point three', size: 28, color: MUTED }],
        ['title', 672, 180, 520, 56, { text: 'After', size: 34 }],
        ['text', 672, 244, 520, 380, { text: '• Point one\n• Point two\n• Point three', size: 28, color: MUTED }]
      ])
  },
  {
    id: 'chart',
    name: 'Chart',
    make: () => build([title('Growth this year'), ['chart', 88, 170, 1104, 490, {}, 'fade-up']])
  },
  {
    id: 'chart-text',
    name: 'Chart and text',
    make: () =>
      build([
        title('What the numbers say'),
        ['chart', 88, 170, 700, 490, { chartType: 'line' }],
        ['text', 830, 190, 362, 400, { text: 'Sales grew every month.\n\nApril was the best month so far.', size: 26, color: MUTED }]
      ])
  },
  {
    id: 'pie',
    name: 'Pie chart',
    make: () =>
      build([
        title('Where users come from'),
        ['chart', 240, 160, 800, 510, { chartType: 'doughnut', data: 'Source,Visits\nSearch,42\nDirect,28\nSocial,21\nReferral,9' }]
      ])
  },
  {
    id: 'map',
    name: 'Map',
    make: () => build([title('Where we are'), ['map', 88, 170, 1104, 490, {}, 'zoom-in']])
  },
  {
    id: 'image-text',
    name: 'Image and text',
    make: () =>
      build([
        ['image', 0, 0, 600, 720, { radius: 0 }, 'fade-in'],
        ['title', 664, 200, 540, 150, { text: 'A picture says a lot', size: 52 }, 'fade-up'],
        ['text', 664, 370, 540, 200, { text: 'Add a short line that explains the picture.', size: 28, color: MUTED }],
        ['button', 664, 560, 240, 64, {}, 'pop']
      ])
  },
  {
    id: 'kpis',
    name: 'KPI dashboard',
    make: () =>
      build([
        title('Results at a glance'),
        ['kpi', 88, 170, 255, 160, { label: 'Revenue', value: '$4.2M', delta: '+12%' }, 'flip-up'],
        ['kpi', 371, 170, 255, 160, { label: 'Users', value: '128,400', delta: '+18%' }, 'flip-up'],
        ['kpi', 654, 170, 255, 160, { label: 'Retention', value: '94%', delta: '+3%' }, 'flip-up'],
        ['kpi', 937, 170, 255, 160, { label: 'Satisfaction', value: '4.8', delta: '+0.3' }, 'flip-up'],
        ['chart', 88, 360, 1104, 310, { chartType: 'area', data: 'Month,Users\nJan,92\nFeb,99\nMar,104\nApr,110\nMay,117\nJun,128', legend: false }]
      ])
  },
  {
    id: 'section',
    name: 'Section',
    make: () =>
      build([
        ['text', 88, 250, 400, 40, { text: 'PART 2', size: 22, weight: 700, color: 'var(--accent)' }, 'fade-in'],
        ['title', 88, 296, 1104, 120, { text: 'Section title', size: 84 }, 'reveal'],
        ['shape', 88, 440, 160, 8, { shape: 'pill' }, 'slide-start']
      ])
  },
  {
    id: 'table',
    name: 'Table',
    make: () => build([title('Plans and prices'), ['table', 88, 180, 1104, 300, {}, 'fade-up']])
  },
  { id: 'blank', name: 'Blank', make: () => [] }
]
