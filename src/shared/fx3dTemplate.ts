import type { ElementType, Slide, SlideElement } from './types'
import type { Template } from './templates'
import { newId } from './ids'

/** "3D & Shaders" showcase: crystal orb, coverflow, 3D rings, globe, depth cards and shader backgrounds. */

const el = (type: ElementType, x: number, y: number, w: number, h: number, props: SlideElement['props'], anim = 'fade-up', delay?: number): SlideElement =>
  ({ id: newId('e'), type, x, y, w, h, anim, delay, props })

const CSS = `/* 3D & Shaders showcase */
.slide .huge{font-size:84px;line-height:1.08;margin:0}
.slide .hint{font-size:16px;color:var(--muted)}
.slide .x-head{display:flex;flex-direction:column;align-items:flex-start;gap:10px}
.slide .x-head h2{font-size:46px}
.slide .dcard{display:flex;flex-direction:column;justify-content:flex-end;gap:12px;padding:30px}
.slide .dcard h3{font-size:30px}
.slide .dcard p{font-size:19px;color:var(--muted)}
`

const PROJECTS = [
  '🚀|Namaa Platform|Version 4 launch', '📊|Live dashboards|Real-time analytics', '🛡️|Security|ISO 27001 certified', '🌍|Expansion|6 new markets',
  '🤖|Namaa AI|Smart analytics assistant', '💳|Payments|SAR 67 million', '📱|Mobile app|1 million downloads'
].join('\n')

const SERVICES = ['⚡|Speed|Under a second', '🧠|Intelligence|Automatic insights', '🔗|Integrations|120+ apps', '🛡️|Protection|Full encryption',
  '📱|Mobile|iOS and Android', '🌙|Dark mode|Easy on the eyes'].join('\n')

const slides: Omit<Slide, 'id'>[] = [
  {
    className: 'page bg-liquid',
    html: `<div class="split" style="grid-template-columns:1.1fr 1fr">
  <div style="display:flex;flex-direction:column;gap:22px">
    <span class="chip fade-up">3D · Shaders · WebGL</span>
    <h1 class="huge fx-blur">Presentations with real 3D depth</h1>
    <p class="lead fade-up" style="--d:.9s;font-size:26px">A living glass orb, 3D carousels, and backgrounds drawn in real time on the graphics card.</p>
    <div class="row fade-up" style="--d:1.1s"><a class="btn fx-magnet">Try it</a><a class="btn ghost fx-magnet">How does it work?</a></div>
    <p class="hint fade-in" style="--d:1.4s">Move the mouse over the orb and the background</p>
  </div>
  <div></div>
</div>`,
    elements: [el('orb', 744, 150, 440, 440, { energy: 0.85, color: '' }, 'zoom-in', 0.3)],
    notes: 'The orb and the background are drawn with WebGL every frame. The dust inside the orb follows the mouse.'
  },
  {
    className: 'page bg-mesh',
    html: `<div class="x-head"><span class="chip fade-in">Coverflow</span><h2 class="fade-up">Highlights of 2026</h2></div>`,
    elements: [el('coverflow', 64, 168, 1152, 500, { items: PROJECTS, interval: 3 }, 'fade-up', 0.3)],
    notes: 'Drag the cards, use the mouse wheel, or click a side card.'
  },
  {
    className: 'page',
    html: `<div class="x-head"><span class="chip fade-in">3D ring · vertical</span><h2 class="fade-up">Our services spin like a slot machine</h2></div>`,
    elements: [el('ring', 64, 150, 1152, 520, { items: SERVICES, axis: 'y', mode: 'step' }, 'fade-in', 0.3)]
  },
  {
    className: 'page bg-silk',
    html: `<div class="x-head"><span class="chip fade-in">3D ring · horizontal</span><h2 class="fade-up">A ring drifting slowly over silk</h2></div>`,
    elements: [el('ring', 64, 160, 1152, 500, { items: PROJECTS, axis: 'x', mode: 'drift' }, 'fade-in', 0.3)],
    notes: 'The background is a silk shader that keeps rippling, and the ring drifts slowly. Drag it to spin it.'
  },
  {
    className: 'page bg-blob',
    html: `<div class="split" style="grid-template-columns:1fr 1.05fr">
  <div style="display:flex;flex-direction:column;gap:20px">
    <span class="chip fade-up">Globe</span>
    <h2 class="fade-up" style="font-size:50px">From Riyadh to <span class="gradient-text">the world</span></h2>
    <p class="lead fade-up" style="--d:.5s;font-size:24px">Five markets linked by live arcs. Drag the globe to spin it; the background follows the mouse.</p>
  </div>
  <div></div>
</div>`,
    elements: [
      el('globe', 690, 110, 500, 500, {
        places: '24.7136, 46.6753, Riyadh\n30.0444, 31.2357, Cairo\n51.5072, -0.1276, London\n35.6762, 139.6503, Tokyo\n40.7128, -74.006, New York',
        speed: 40, arcs: true, labels: true, color: ''
      }, 'zoom-in', 0.3)
    ],
    notes: 'The globe is dots shaped like the continents, and the arcs start from Riyadh. The background is a shader that stretches toward the mouse.'
  },
  {
    className: 'page center bg-portal',
    html: `<span class="chip fade-up">Portal shader</span>
<h1 class="huge fx-blur">Step through the portal</h1>
<p class="lead fade-up" style="--d:.8s">Light rushes from the center toward you, drawn live on the graphics card.</p>`
  },
  {
    className: 'page bg-plasma',
    html: `<div class="x-head"><span class="chip fade-in">3D depth</span><h2 class="fade-up">Cards whose layers float under the mouse</h2></div>
<div class="grid-3 stagger" style="margin-top:28px">
  <div class="glass dcard fx3-depth"><div class="icon">🧭</div><h3>Vision</h3><p>One platform for all your company's data.</p></div>
  <div class="glass dcard fx3-depth"><div class="icon">⚙️</div><h3>Execution</h3><p>Automation that turns weeks of work into hours.</p></div>
  <div class="glass dcard fx3-depth"><div class="icon">📈</div><h3>Results</h3><p>Growth you can measure every quarter.</p></div>
</div>`,
    notes: 'Hover the cards: they lean toward you while the icon, title and text move at different depths. The background is plasma in the theme colors.'
  },
  {
    className: 'page center bg-stars',
    html: `<span class="chip fade-up" style="margin-top:250px">Thank you</span>
<h1 class="huge fx-split">The future is 3D</h1>
<p class="lead fade-up" style="--d:.9s">All of this is HTML and JavaScript, running in any browser.</p>`,
    elements: [el('orb', 560, 40, 160, 160, { energy: 1, color: '' }, 'zoom-in', 0.2)]
  }
]

export const FX3D_TEMPLATE: Template = {
  id: '3d-shaders',
  name: '3D & Shaders',
  description: 'WebGL crystal orb, coverflow, 3D rings and shader backgrounds',
  themeId: 'glass',
  transition: 'zoom',
  css: CSS,
  slides
}
