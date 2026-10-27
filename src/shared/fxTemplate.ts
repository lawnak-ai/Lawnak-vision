import type { ElementType, Slide, SlideElement } from './types'
import type { Template } from './templates'
import { newId } from './ids'

/** "Effects showcase" deck: every text, background and card effect in use. */

const el = (type: ElementType, x: number, y: number, w: number, h: number, props: SlideElement['props'], anim = 'fade-up', delay?: number): SlideElement =>
  ({ id: newId('e'), type, x, y, w, h, anim, delay, props })

const CSS = `/* Effects showcase */
.slide .abs{position:absolute}
.slide .demo{justify-content:space-between;gap:14px;padding:26px 28px}
.slide .demo small{font-size:14px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}
.slide .demo h3{font-size:38px;line-height:1.2}
.slide .hcard{gap:12px;padding:30px;justify-content:flex-end}
.slide .hcard h3{font-size:30px}
.slide .hcard p{font-size:19px}
.slide .hint{font-size:17px;color:var(--muted)}
.slide .huge{font-size:104px;line-height:1.05;margin:0}
.slide .pills{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;max-width:900px}
.slide .pills span{padding:8px 18px;border-radius:999px;border:1px solid var(--border);background:color-mix(in srgb,var(--bg-solid) 60%,transparent);font-size:18px;color:var(--fg)}
.slide blockquote{margin:0;font-size:54px;font-weight:800;line-height:1.25;max-width:1000px}
`

const slides: Omit<Slide, 'id'>[] = [
  {
    className: 'page center bg-particles bg-noise',
    html: `<span class="chip fade-up">Effects library · Lawnak Vision</span>
<h1 class="huge fx-split" style="letter-spacing:.03em">LAWNAK FX</h1>
<p class="lead" style="font-size:34px;max-width:none">Presentations that are <span class="fx-rotate" data-words="faster|smarter|beautiful|alive">faster</span>, with zero code</p>
<div class="row fade-up" style="--d:1.1s;margin-top:10px"><a class="btn fx-magnet">Get started</a><a class="btn ghost fx-magnet">See the effects</a></div>
<p class="hint fade-in" style="--d:1.4s">Move the mouse over the background and the buttons</p>`,
    elements: [el('circle', 1050, 500, 160, 160, { text: 'LAWNAK • VISION • 2026 • ', color: 'var(--muted)' }, 'zoom-in', 0.9)],
    notes: 'The background particles move away from the mouse, the title letters rise one by one, and the colored word changes every two seconds.'
  },
  {
    className: 'page bg-dots',
    html: `<span class="chip fade-in">Text effects</span>
<h2 class="fade-up">Six ways to bring words in</h2>
<div class="grid-3 stagger" style="grid-template-rows:1fr 1fr;margin-bottom:8px">
  <div class="glass demo"><small>Letters rise</small><h3 class="fx-split">Hello World</h3></div>
  <div class="glass demo"><small>Blur-in words</small><h3 class="fx-blur">Every word fades in softly</h3></div>
  <div class="glass demo"><small>Shine</small><h3 class="fx-shiny">A shine sweeps the text</h3></div>
  <div class="glass demo"><small>Decrypt</small><h3 class="fx-decrypt">ACCESS GRANTED</h3></div>
  <div class="glass demo"><small>Glitch</small><h3 class="fx-glitch">SYSTEM 2026</h3></div>
  <div class="glass demo"><small>Typing loop</small><h3>We design <span class="fx-type" data-words="decks|reports|stories">decks</span></h3></div>
</div>`
  },
  {
    className: 'page bg-mesh',
    html: `<span class="chip fade-in">Interactive cards</span>
<h2 class="fade-up">Hover over each card</h2>
<div class="grid-2 stagger" style="grid-template-rows:1fr 1fr;margin-bottom:8px">
  <div class="glass hcard fx-spotlight"><div class="icon">🔦</div><h3>Spotlight</h3><p>A pool of light follows the pointer inside the card.</p></div>
  <div class="glass hcard fx-tilt"><div class="icon">🧊</div><h3>3D tilt</h3><p>The card leans toward the pointer as if it were real.</p></div>
  <div class="glass hcard fx-glare"><div class="icon">✨</div><h3>Glass glare</h3><p>A light reflection sweeps across on hover.</p></div>
  <div class="glass hcard fx-border"><div class="icon">💫</div><h3>Glowing border</h3><p>Light keeps circling the edges of the card.</p></div>
</div>`
  },
  {
    className: 'page center bg-stars',
    html: `<span class="chip fade-up">Live backgrounds</span>
<h1 class="huge fx-blur">A sky full of stars</h1>
<p class="lead fade-up" style="--d:.8s">Nine animated backgrounds. Pick one from the slide panel in the Design tab.</p>
<div class="pills stagger" style="--lv-start:1s">
  <span>Particles</span><span>Dot grid</span><span>Waves</span><span>Stars</span><span>Warp speed</span><span>Retro grid</span><span>Beams</span><span>Moving gradient</span><span>Aurora</span>
</div>`
  },
  {
    className: 'page center bg-grid',
    html: `<span class="chip fade-up">Retro grid</span>
<h1 class="huge fx-shiny" style="--fx-c:#ffffff">The future starts here</h1>
<p class="lead fade-up" style="--d:.6s">An '80s-style floor that keeps rolling toward you.</p>`
  },
  {
    className: 'page bg-waves',
    html: `<span class="chip fade-in">Numbers and waves</span>
<h2 class="fade-up">Our <span class="fx-rotate" data-words="revenue|users|profit">revenue</span> grew this year</h2>`,
    elements: [
      el('kpi', 64, 200, 273, 160, { label: 'Revenue', value: '248M', delta: '+38%', up: true, hover: 'fx-tilt' }, 'flip-up', 0.3),
      el('kpi', 357, 200, 273, 160, { label: 'Users', value: '1.1M', delta: '+82%', up: true, hover: 'fx-tilt' }, 'flip-up', 0.4),
      el('kpi', 650, 200, 273, 160, { label: 'Markets', value: '6', delta: '+2', up: true, hover: 'fx-tilt' }, 'flip-up', 0.5),
      el('kpi', 943, 200, 273, 160, { label: 'Customer satisfaction', value: '72', delta: '+9', up: true, hover: 'fx-tilt' }, 'flip-up', 0.6),
      el('text', 64, 440, 1152, 40, { text: 'Trusted by customers across the region', size: 20, weight: 600, align: 'center', color: 'var(--muted)', font: 'body' }, 'fade-in', 0.8),
      el('marquee', 64, 500, 1152, 90, { items: 'Riyadh|Jeddah|Dubai|Cairo|Doha|Kuwait|Manama|Muscat', size: 34, gap: 80, speed: 20 }, 'fade-in', 0.9)
    ]
  },
  {
    className: 'page center bg-beams',
    html: `<span class="chip fade-up">Quote</span>
<blockquote class="fx-blur">“Good design is not seen, it is felt.”</blockquote>
<p class="lead fade-up" style="--d:1.2s">Light beams turn slowly behind the words</p>`
  },
  {
    className: 'page center bg-warp',
    html: `<span class="chip fade-up">What's next</span>
<h1 class="huge fx-split">Launch now</h1>
<p class="lead fade-up" style="--d:.8s">Add any effect from the Design tab, or ask the AI for it.</p>
<div class="row fade-up" style="--d:1s"><a class="btn glow fx-magnet">Create your deck</a><a class="btn ghost fx-magnet">More templates</a></div>`
  }
]

export const FX_TEMPLATE: Template = {
  id: 'effects',
  name: 'Effects showcase',
  description: 'Animated text, live backgrounds and interactive cards',
  themeId: 'glass',
  transition: 'zoom',
  css: CSS,
  slides
}
