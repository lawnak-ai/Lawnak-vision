import type { Slide } from './types'
import { ELEMENT_KINDS, newElement, renderElement, renderElements } from './elements'
import { TEMPLATES } from './templates'
import cardFan from '../../examples/components/card-fan.html?raw'
import kineticTitle from '../../examples/components/kinetic-title.html?raw'
import marqueeBand from '../../examples/components/marquee-band.html?raw'
import ringStats from '../../examples/components/ring-stats.html?raw'
import timelineDraw from '../../examples/components/timeline-draw.html?raw'

/**
 * The component gallery the AI can browse while it designs. Each entry is a
 * working piece of slide HTML; the app renders it with the deck's theme so the
 * AI can see what it looks like before using it.
 */

export type CatalogCategory = 'layouts' | 'data' | 'text' | 'backgrounds' | 'cards' | '3d' | 'motion' | 'examples'

export const CATALOG_CATEGORIES: { id: CatalogCategory; about: string }[] = [
  { id: 'layouts', about: 'Whole-slide compositions: heroes, bento grids, timelines, comparisons, quotes, closings' },
  { id: 'data', about: 'Live charts, KPI tiles, counters, progress meters, tables' },
  { id: 'text', about: 'Animated headline effects: letters rising, words revealed, decrypt, glitch, rotating words, typing, keyword bands' },
  { id: 'backgrounds', about: 'Animated and shader backgrounds, a class on <slide>' },
  { id: 'cards', about: 'Cards and buttons that react to the mouse' },
  { id: '3d', about: 'WebGL orb, globe, coverflow and 3D ring carousels' },
  { id: 'motion', about: 'Motion components: card rings, flame cards, ribbons, reels, stickers, text on a path' },
  { id: 'examples', about: 'Finished slides from the built-in templates, for inspiration' }
]

export interface CatalogItem {
  id: string
  name: string
  category: CatalogCategory
  /** When to reach for it. */
  use: string
  /** Classes for the <slide> that shows it. For backgrounds this is the class to use. */
  slideClass?: string
  /** Inner HTML of a slide that shows it; the AI copies and adapts this. */
  html: string
  /** Extra deck CSS the HTML relies on (examples from templates). */
  css?: string
  /** The slide as stored, when it has designer components (examples from templates). */
  slide?: Omit<Slide, 'id'>
}

// ---------- Layouts ----------

const LAYOUTS: CatalogItem[] = [
  {
    id: 'hero-split',
    name: 'Landing-page hero',
    category: 'layouts',
    use: 'Opening slide that looks like a product website: nav bar, big headline, buttons, and a browser mockup with a live chart.',
    slideClass: 'page aurora',
    html: `<nav class="nav fade-down"><span class="logo">Brand</span><span>Product</span><span>Pricing</span><span>Customers</span><a class="btn">Book a demo</a></nav>
<div class="split">
  <div style="display:flex;flex-direction:column;gap:24px">
    <span class="chip fade-up">Q3 report · 2026</span>
    <h1 class="blur-in" style="font-size:64px">Growing <span class="gradient-text">faster</span> than ever</h1>
    <p class="lead fade-up" style="font-size:26px">One analytics platform that helps teams decide with data, in real time.</p>
    <div class="row fade-up"><a class="btn fx-magnet">Watch the demo</a><a class="btn ghost">Read the report</a></div>
  </div>
  <div class="float"><div class="browser zoom-in" style="height:420px;--d:.5s"><div class="body">
    <div class="row" style="justify-content:space-between">
      <div class="kpi"><span class="label">Monthly revenue</span><span class="value" data-count>$482K</span></div>
      <span class="delta up">+24%</span>
    </div>
    <div class="chart" data-chart='{"type":"area","labels":["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep"],"series":[{"name":"Revenue","data":[210,236,251,298,320,355,402,441,482]}],"prefix":"$","unit":"K"}'></div>
  </div></div></div>
</div>`
  },
  {
    id: 'title-portal',
    name: 'Cinematic title',
    category: 'layouts',
    use: 'Title or closing slide with drama: centered headline over a glowing shader portal.',
    slideClass: 'center bg-portal',
    html: `<span class="chip fade-up">Annual keynote · 2026</span>
<h1 class="fx-split" style="font-size:96px">Into the next decade</h1>
<p class="lead fade-up" style="--d:.9s">Three bets that will define how we build, sell and grow.</p>`
  },
  {
    id: 'bento-overview',
    name: 'Bento dashboard',
    category: 'layouts',
    use: 'Many numbers at a glance: KPI tiles and a chart in a 4-column bento grid, like a SaaS dashboard.',
    slideClass: 'page grid-bg',
    html: `<span class="chip fade-in">Overview</span>
<h2 class="fade-up">The quarter at a glance</h2>
<div class="bento" style="grid-template-rows:auto 1fr">
  <div class="glass kpi flip-up"><span class="label">Revenue</span><span class="value" data-count>$4.2M</span><span class="delta up">+12%</span></div>
  <div class="glass kpi flip-up"><span class="label">Customers</span><span class="value" data-count>1,840</span><span class="delta up">+9%</span></div>
  <div class="glass kpi flip-up"><span class="label">Churn</span><span class="value" data-count>2.1%</span><span class="delta down good">-0.4pt</span></div>
  <div class="glass kpi flip-up"><span class="label">NPS</span><span class="value" data-count>62</span><span class="delta up">+5</span></div>
  <div class="glass span-2 fade-up"><h3>Revenue by month</h3>
    <div class="chart" data-chart='{"type":"bar","labels":["Jul","Aug","Sep"],"series":[{"name":"2025","data":[1.1,1.2,1.3]},{"name":"2026","data":[1.3,1.4,1.5]}],"prefix":"$","unit":"M"}'></div></div>
  <div class="glass span-2 fade-up"><h3>Customers by channel</h3>
    <div class="chart" data-chart='{"type":"donut","labels":["Web","Mobile","API"],"series":[{"name":"Customers","data":[960,570,310]}],"center":"customers"}'></div></div>
</div>`
  },
  {
    id: 'feature-trio',
    name: 'Three feature cards',
    category: 'layouts',
    use: 'Three ideas, features or pillars side by side, each with an icon, title and one line.',
    slideClass: 'page',
    html: `<span class="chip fade-in">Why us</span>
<h2 class="fade-up">Built for teams that move fast</h2>
<div class="grid-3 stagger">
  <div class="glass fx-spotlight" style="justify-content:space-between;padding:32px"><div class="icon" style="width:72px;height:72px;font-size:36px">⚡</div><div style="display:flex;flex-direction:column;gap:10px"><h3>Instant</h3><p>Answers in under a second, on any data size.</p></div></div>
  <div class="glass fx-spotlight" style="justify-content:space-between;padding:32px"><div class="icon" style="width:72px;height:72px;font-size:36px">🧠</div><div style="display:flex;flex-direction:column;gap:10px"><h3>Smart</h3><p>AI finds the trend before you ask for it.</p></div></div>
  <div class="glass fx-spotlight" style="justify-content:space-between;padding:32px"><div class="icon" style="width:72px;height:72px;font-size:36px">🔒</div><div style="display:flex;flex-direction:column;gap:10px"><h3>Secure</h3><p>Bank-grade encryption and ISO 27001.</p></div></div>
</div>`
  },
  {
    id: 'stat-hero',
    name: 'One big number',
    category: 'layouts',
    use: 'When one number is the story: a huge counting stat beside a short explanation and a donut.',
    slideClass: 'page',
    html: `<div class="split" style="grid-template-columns:1fr 1.15fr">
  <div style="display:flex;flex-direction:column;gap:18px">
    <span class="chip fade-up">Market</span>
    <div class="gradient-text blur-in" style="font-family:var(--heading-font);font-size:160px;font-weight:800;line-height:1" data-count>$48B</div>
    <p class="lead fade-up" style="--d:.6s;font-size:28px">Spent every year on the problem we solve, growing 18% a year.</p>
  </div>
  <div class="glass zoom-in" style="height:340px;padding:28px;--d:.4s"><h3>Who spends it</h3>
    <div class="chart" data-chart='{"type":"donut","labels":["Retail","Health","Finance","Other"],"series":[{"name":"Spend","data":[18.2,13,10.1,6.7]}],"prefix":"$","unit":"B","center":"per year"}'></div></div>
</div>`
  },
  {
    id: 'timeline-steps',
    name: 'Roadmap timeline',
    category: 'layouts',
    use: 'Plans, history or a process in 3-5 steps along a glowing line.',
    slideClass: 'page',
    html: `<span class="chip fade-in">Roadmap</span>
<h2 class="fade-up">From launch to scale in four quarters</h2>
<div class="spacer"></div>
<div class="steps stagger">
  <div><h3>Q1</h3><p>Public launch in Riyadh and Jeddah</p></div>
  <div><h3>Q2</h3><p>Mobile app and payments</p></div>
  <div><h3>Q3</h3><p>Expand to the UAE and Qatar</p></div>
  <div><h3>Q4</h3><p>Enterprise plan and API</p></div>
</div>
<div class="spacer"></div>`
  },
  {
    id: 'before-after',
    name: 'Before / after comparison',
    category: 'layouts',
    use: 'Contrast two states, options or competitors in two cards.',
    slideClass: 'page',
    html: `<span class="chip fade-in">The shift</span>
<h2 class="fade-up">What changes for your team</h2>
<div class="grid-2">
  <div class="glass slide-start" style="padding:40px;justify-content:center;gap:22px;opacity:.85"><span class="muted" style="font-size:20px;font-weight:700">TODAY</span>
    <ul style="font-size:30px;gap:22px"><li>Reports take a week</li><li>Five tools, no single truth</li><li>Decisions by gut feeling</li></ul></div>
  <div class="glass fx-border slide-end" style="padding:40px;justify-content:center;gap:22px"><span class="accent" style="font-size:20px;font-weight:700">WITH US</span>
    <ul style="font-size:30px;gap:22px"><li>Live dashboards, always fresh</li><li>One platform for every team</li><li>Every decision backed by data</li></ul></div>
</div>`
  },
  {
    id: 'big-quote',
    name: 'Big quote',
    category: 'layouts',
    use: 'A customer quote, a principle or a provocative statement, with lots of space.',
    slideClass: 'center bg-mesh',
    html: `<div class="fade-in" style="font-size:160px;line-height:.6;color:var(--accent);font-family:Georgia,serif">“</div>
<h2 class="fx-blur" style="max-width:1000px;font-size:56px;line-height:1.25">We cut our reporting time from a week to <span class="gradient-text">ten minutes</span>.</h2>
<p class="muted fade-up" style="--d:1.2s;font-size:24px">Sara Al-Harbi · Head of Operations, Nama</p>`
  },
  {
    id: 'section-divider',
    name: 'Section divider',
    category: 'layouts',
    use: 'Between chapters: a huge chapter number and title on an energetic background.',
    slideClass: 'center bg-warp',
    html: `<div class="gradient-text zoom-out" style="font-family:var(--heading-font);font-size:200px;font-weight:800;line-height:1">02</div>
<h1 class="fx-decrypt">The market</h1>`
  },
  {
    id: 'agenda-numbers',
    name: 'Numbered agenda',
    category: 'layouts',
    use: 'Agenda or a list of 4 points, with big numerals instead of bullets.',
    slideClass: 'page',
    html: `<span class="chip fade-in">Agenda</span>
<h2 class="fade-up">Today we cover</h2>
<div class="grid-2 stagger" style="grid-auto-rows:1fr">
  <div class="row" style="flex-wrap:nowrap;gap:24px"><span class="stat" style="font-size:72px;opacity:.9">01</span><div><h3>Where we are</h3><p class="muted" style="font-size:20px">Results of the last 12 months</p></div></div>
  <div class="row" style="flex-wrap:nowrap;gap:24px"><span class="stat" style="font-size:72px;opacity:.9">02</span><div><h3>What we learned</h3><p class="muted" style="font-size:20px">Three lessons from customers</p></div></div>
  <div class="row" style="flex-wrap:nowrap;gap:24px"><span class="stat" style="font-size:72px;opacity:.9">03</span><div><h3>Where we go</h3><p class="muted" style="font-size:20px">The plan for 2027</p></div></div>
  <div class="row" style="flex-wrap:nowrap;gap:24px"><span class="stat" style="font-size:72px;opacity:.9">04</span><div><h3>What we need</h3><p class="muted" style="font-size:20px">Budget, people and decisions</p></div></div>
</div>`
  },
  {
    id: 'closing-cta',
    name: 'Closing call to action',
    category: 'layouts',
    use: 'Last slide: thank you, one clear next step, buttons and a spinning circle badge.',
    slideClass: 'center aurora',
    html: `<div class="fx-circle spin" data-text="LET'S BUILD • 2026 • LET'S BUILD • 2026 • " style="width:150px;height:150px"></div>
<h1 class="blur-in" style="font-size:84px">Let's build it <span class="gradient-text">together</span></h1>
<p class="lead fade-up" style="--d:.7s">Pilot starts in two weeks. All we need is your yes.</p>
<div class="row fade-up" style="--d:1s;justify-content:center"><a class="btn glow fx-magnet">hello@brand.com</a><a class="btn ghost">brand.com/pilot</a></div>`
  }
]

// ---------- Data ----------

const chartCard = (title: string, json: string, h = 460): string =>
  `<h2 class="fade-up">${title}</h2>
<div class="glass fade-up" style="height:${h}px;--d:.3s"><div class="chart" data-chart='${json}'></div></div>`

const DATA: CatalogItem[] = [
  {
    id: 'chart-bar',
    name: 'Bar chart',
    category: 'data',
    use: 'Compare categories or periods (up to 4 series). Bars grow in; hover shows values.',
    slideClass: 'page',
    html: chartCard('Revenue by quarter', '{"type":"bar","labels":["Q1","Q2","Q3","Q4"],"series":[{"name":"2025","data":[12,18,25,29]},{"name":"2026","data":[16,24,31,38]}],"prefix":"$","unit":"M"}')
  },
  {
    id: 'chart-line',
    name: 'Line chart',
    category: 'data',
    use: 'Change over time, several series. The lines draw themselves in.',
    slideClass: 'page',
    html: chartCard('Active users', '{"type":"line","labels":["Jan","Feb","Mar","Apr","May","Jun"],"series":[{"name":"Web","data":[120,150,170,210,260,320]},{"name":"Mobile","data":[80,95,130,170,240,310]}],"unit":"K"}')
  },
  {
    id: 'chart-area',
    name: 'Area chart',
    category: 'data',
    use: 'One or two series over time, when the volume matters.',
    slideClass: 'page',
    html: chartCard('Monthly recurring revenue', '{"type":"area","labels":["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"],"series":[{"name":"MRR","data":[210,236,251,298,320,355,402,441]}],"prefix":"$","unit":"K"}')
  },
  {
    id: 'chart-donut',
    name: 'Donut chart',
    category: 'data',
    use: 'Parts of a whole, 2-6 parts, with a legend and an optional center caption.',
    slideClass: 'page',
    html: chartCard('Where revenue comes from', '{"type":"donut","labels":["Enterprise","Mid-market","Small business","Partners"],"series":[{"name":"Share","data":[46,28,18,8]}],"unit":"%","center":"of revenue"}')
  },
  {
    id: 'kpi-row',
    name: 'KPI tiles',
    category: 'data',
    use: 'Three or four headline numbers that count up, each with a change badge.',
    slideClass: 'page',
    html: `<span class="chip fade-in">Results</span>
<h2 class="fade-up">A record quarter</h2>
<div class="grid-3" style="flex:none">
  <div class="glass kpi flip-up"><span class="label">Revenue</span><span class="value" data-count>$4.2M</span><span class="delta up">+12%</span></div>
  <div class="glass kpi flip-up"><span class="label">New customers</span><span class="value" data-count>312</span><span class="delta up">+28%</span></div>
  <div class="glass kpi flip-up"><span class="label">Cost per customer</span><span class="value" data-count>$41</span><span class="delta down good">-9%</span></div>
</div>`
  },
  {
    id: 'meters',
    name: 'Progress meters',
    category: 'data',
    use: 'Progress toward goals, survey results or skill levels, as bars that grow in.',
    slideClass: 'page',
    html: `<h2 class="fade-up">Goals for 2026</h2>
<div class="glass stagger" style="gap:26px;padding:36px">
  <div><div class="row" style="justify-content:space-between"><b>Customers</b><span class="accent">72%</span></div><div class="meter"><i style="--v:72%"></i></div></div>
  <div><div class="row" style="justify-content:space-between"><b>Revenue</b><span class="accent">58%</span></div><div class="meter"><i style="--v:58%"></i></div></div>
  <div><div class="row" style="justify-content:space-between"><b>New markets</b><span class="accent">40%</span></div><div class="meter"><i style="--v:40%"></i></div></div>
</div>`
  },
  {
    id: 'table-data',
    name: 'Data table',
    category: 'data',
    use: 'Exact values in rows: pricing plans, comparisons, rankings (up to about 6 rows).',
    slideClass: 'page',
    html: `<h2 class="fade-up">Plans and pricing</h2>
<div class="glass fade-up" style="padding:28px 32px"><table class="data">
  <tr><th>Plan</th><th>Users</th><th>Storage</th><th>Price</th></tr>
  <tr><td>Starter</td><td>1-5</td><td>50 GB</td><td>$9</td></tr>
  <tr><td>Team</td><td>6-50</td><td>1 TB</td><td>$29</td></tr>
  <tr><td><b>Business</b> <span class="chip">Popular</span></td><td>51-500</td><td>10 TB</td><td>$79</td></tr>
  <tr><td>Enterprise</td><td>500+</td><td>Unlimited</td><td>Custom</td></tr>
</table></div>`
  }
]

// ---------- Text effects ----------

const TEXT: CatalogItem[] = [
  {
    id: 'text-effects',
    name: 'Headline effects',
    category: 'text',
    use: 'Animated headlines: fx-split (letters rise), fx-blur (words blur in), fx-shiny (light sweep), fx-decrypt (scramble then resolve), fx-glitch. Use on one key heading per slide, not on an element that already has an entrance class. The picture shows their final state.',
    slideClass: 'page',
    html: `<h2 class="fx-split">fx-split: letters rise in</h2>
<h2 class="fx-blur">fx-blur: words blur into focus</h2>
<h2 class="fx-shiny">fx-shiny: a light sweeps across</h2>
<h2 class="fx-decrypt">fx-decrypt: scrambles, then resolves</h2>
<h2 class="fx-glitch">fx-glitch: glitches now and then</h2>`
  },
  {
    id: 'rotating-words',
    name: 'Rotating and typed words',
    category: 'text',
    use: 'A headline where one word keeps changing (fx-rotate) or is typed and erased (fx-type). Great for taglines.',
    slideClass: 'center',
    html: `<h1 style="font-size:84px">Decks that are <span class="fx-rotate gradient-text" data-words="faster|smarter|alive">faster</span></h1>
<p class="lead">Built for <span class="fx-type accent" data-words="founders|teachers|analysts">founders</span></p>`
  },
  {
    id: 'logo-loop',
    name: 'Logo loop',
    category: 'text',
    use: 'An endless row of client or partner names scrolling by. Use for social proof.',
    slideClass: 'center',
    html: `<span class="chip fade-up">Trusted by</span>
<h2 class="fade-up">120 companies across the region</h2>
<div class="fx-marquee" style="width:100%;font-size:34px;font-weight:700"><div class="fx-mq"><span>Nama</span><span>Riyad Labs</span><span>Gulf Air</span><span>Souq+</span><span>Masar</span><span>Tamkeen</span></div></div>`
  }
]

// ---------- Backgrounds ----------

const BG_INFO: [string, string, string][] = [
  ['bg-particles', 'Particles', 'Drifting particles that link up; techy, calm.'],
  ['bg-dots', 'Dot grid', 'A quiet dot grid that ripples; subtle for content slides.'],
  ['bg-waves', 'Waves', 'Slow flowing lines at the bottom; calm and elegant.'],
  ['bg-stars', 'Stars', 'A starfield; for vision, space, closing slides.'],
  ['bg-warp', 'Hyperspeed', 'Stars rushing past; energy, speed, section dividers.'],
  ['bg-grid', 'Grid floor', 'A glowing retro grid floor; tech and gaming.'],
  ['bg-beams', 'Light beams', 'Soft light beams sweeping; stage, launch moments.'],
  ['bg-mesh', 'Mesh gradient', 'Soft moving color mesh; friendly, modern, good behind text.'],
  ['aurora', 'Aurora', 'A soft animated glow; safe default for title and closing slides.'],
  ['bg-silk', 'Silk shader', 'Flowing silk (WebGL); luxurious, premium brands.'],
  ['bg-liquid', 'Liquid shader', 'Iridescent liquid (WebGL); bold product launches.'],
  ['bg-plasma', 'Plasma shader', 'Slow color bands in theme colors (WebGL).'],
  ['bg-blob', 'Gradient blob', 'A soft blob that follows the mouse (WebGL); playful.'],
  ['bg-portal', 'Portal shader', 'Light streaming from a glowing ring (WebGL); put a centered title over it.']
]

const BACKGROUND_ITEMS: CatalogItem[] = BG_INFO.map(([cls, name, use]) => ({
  id: cls,
  name,
  category: 'backgrounds',
  use: `${use} Add "${cls}" to the <slide> class (add bg-noise for film grain).`,
  slideClass: `center ${cls}`,
  html: `<span class="chip">${cls}</span>\n<h1 style="font-size:80px">${name}</h1>\n<p class="lead">A headline over the ${name.toLowerCase()} background.</p>`
}))

// ---------- Cards ----------

const CARDS: CatalogItem[] = [
  {
    id: 'hover-cards',
    name: 'Mouse-reactive cards',
    category: 'cards',
    use: 'Add one class to a .glass or .card: fx-spotlight (light follows the mouse), fx-tilt (tilts in 3D), fx-glare (glossy glare), fx-border (a glowing border travels around), fx3-depth (layers float apart). fx-magnet on buttons pulls toward the mouse. Use one kind per slide.',
    slideClass: 'page',
    html: `<h2>Cards that react to the mouse</h2>
<div class="grid-3" style="grid-template-columns:repeat(5,1fr)">
  <div class="glass fx-spotlight" style="justify-content:flex-end"><div class="icon">🔦</div><h3>Spotlight</h3><p>fx-spotlight</p></div>
  <div class="glass fx-tilt" style="justify-content:flex-end"><div class="icon">🪟</div><h3>Tilt</h3><p>fx-tilt</p></div>
  <div class="glass fx-glare" style="justify-content:flex-end"><div class="icon">✨</div><h3>Glare</h3><p>fx-glare</p></div>
  <div class="glass fx-border" style="justify-content:flex-end"><div class="icon">💫</div><h3>Border</h3><p>fx-border</p></div>
  <div class="glass fx3-depth" style="justify-content:flex-end"><div class="icon">🧊</div><h3>Depth</h3><p>fx3-depth</p></div>
</div>
<div class="row"><a class="btn fx-magnet">fx-magnet button</a><a class="btn ghost fx-magnet">Ghost button</a></div>`
  }
]

// ---------- 3D ----------

const THREE_D: CatalogItem[] = [
  {
    id: 'orb',
    name: 'Crystal orb',
    category: '3d',
    use: 'A live WebGL glass sphere with an electric rim. A wow visual beside a hero headline (AI, energy, innovation).',
    slideClass: 'page',
    html: `<div class="split">
  <div style="display:flex;flex-direction:column;gap:20px"><span class="chip fade-up">AI inside</span><h1 class="fx-blur" style="font-size:68px">Energy you can see</h1><p class="lead fade-up">A short line that explains the idea.</p></div>
  <div style="display:grid;place-items:center"><div class="fx3-orb zoom-in" data-energy="0.85" style="width:400px;height:400px"></div></div>
</div>`
  },
  {
    id: 'globe',
    name: 'Dotted globe',
    category: '3d',
    use: 'Global reach, markets, offices or routes: a 3D dotted globe with arcs flying from the first place to the others. One "lat, lng, label" per line.',
    slideClass: 'page',
    html: `<div class="split">
  <div style="display:flex;flex-direction:column;gap:20px"><span class="chip fade-up">Expansion</span><h2 class="fade-up">From Riyadh to the <span class="gradient-text">world</span></h2><p class="lead fade-up" style="font-size:24px">Five markets, one platform.</p></div>
  <div style="display:grid;place-items:center"><div class="fx3-globe zoom-in" style="width:480px;height:480px" data-places="24.71, 46.68, Riyadh&#10;30.04, 31.24, Cairo&#10;51.51, -0.13, London&#10;35.68, 139.65, Tokyo&#10;40.71, -74.01, New York"></div></div>
</div>`
  },
  {
    id: 'coverflow',
    name: 'Coverflow carousel',
    category: '3d',
    use: 'Showcase 4-8 projects, products or milestones; the center card is in color, neighbors gray. One "emoji or image URL | title | subtitle" per line.',
    slideClass: 'page',
    html: `<span class="chip fade-in">Highlights</span>
<h2 class="fade-up">Our best projects of 2026</h2>
<div class="fx3-cover fade-up" style="height:440px" data-items="🚀|Launch|Version 4 shipped&#10;📊|Dashboards|Live analytics&#10;🛡️|Security|ISO 27001&#10;🌍|Expansion|6 new markets&#10;🤖|AI assistant|Ask your data"></div>`
  },
  {
    id: 'ring',
    name: '3D ring',
    category: '3d',
    use: 'Services, features or values on a spinning cylinder like a slot reel. data-axis="x" spins sideways, "y" up and down; data-mode step, drift or off.',
    slideClass: 'page',
    html: `<span class="chip fade-in">Services</span>
<h2 class="fade-up">Everything in one platform</h2>
<div class="fx3-ring fade-in" data-axis="x" data-mode="step" style="height:420px" data-items="⚡|Fast|Under a second&#10;🧠|Smart|AI insights&#10;🔗|Connected|120+ apps&#10;🛡️|Secure|Bank-grade&#10;📱|Mobile|iOS and Android&#10;🌙|Dark mode|Easy on the eyes"></div>`
  }
]

// ---------- Motion components (designer components that also work as slide HTML) ----------

const MOTION_USE: Record<string, string> = {
  rotcards: 'A ring of cards turning in 3D; a showcase of many items (team, products, features).',
  shadercard: 'A product or plan card with a live flame rising inside; pricing, a hero offer.',
  ribbon: 'A ribbon of tiles flying through 3D space; a striking opener or portfolio.',
  albumrail: 'Album covers with vinyl records sliding out; media, music, portfolios.',
  reel: 'A reel of photos sweeping by; portfolios and galleries.',
  sticker: 'A glossy die-cut sticker that peels on hover; playful badge or logo.',
  bend: 'A strip of tiles seen through a lens that bends while moving; galleries.',
  depthcard: 'A card whose layers drift apart under the mouse; a feature highlight.',
  lenticular: 'Cards that change like a lenticular print as they move; before/after, versions.',
  textpath: 'Text flowing along a wave or circle path; a tagline as decoration.',
  pills: 'Big word pills that float and react to the mouse; values, keywords, topics.'
}

const MOTION: CatalogItem[] = ELEMENT_KINDS.filter((k) => k.group === 'motion' && MOTION_USE[k.kind]).map((k) => {
  const el = { ...newElement(k.kind), anim: 'zoom-in' }
  return {
    id: k.kind,
    name: k.label,
    category: 'motion' as const,
    use: `${MOTION_USE[k.kind]} It is absolutely placed: change left/top/width/height in its style to fit your layout, and keep text clear of it. Picture lists are "picture URL | title | subtitle" lines; empty pictures get generated artwork.`,
    slideClass: 'page',
    html: renderElement(el)
  }
})

// ---------- Components from examples/components ----------

/**
 * The part of an examples/components file between its COMPONENT markers: one <style> block
 * (classes start with cx-) plus the markup. The rest of the file is only for previewing it in a browser.
 */
export function componentBlock(file: string, id: string): string {
  const start = `<!-- COMPONENT ${id}: copy from here -->`
  const end = `<!-- /COMPONENT ${id} -->`
  const a = file.indexOf(start)
  const b = file.indexOf(end)
  return a >= 0 && b > a ? file.slice(a + start.length, b).trim() : ''
}

const KEEP_STYLE = 'Copy its <style> block with the HTML and keep the cx- class names.'

const FILE_ITEMS: CatalogItem[] = [
  {
    id: 'kinetic-title',
    name: 'Kinetic title',
    category: 'text',
    use: `Title or section slide: headline words rise out of a mask one by one, then a highlight sweeps behind the key word. Wrap each word in <span class="cx-kt-w" style="--cx-w:N"><span>word</span></span>; the marked word holds <i class="cx-kt-hl"></i>. Works per word, so Arabic stays joined.`,
    html: componentBlock(kineticTitle, 'kinetic-title')
  },
  {
    id: 'ring-stats',
    name: 'Ring stats',
    category: 'data',
    use: 'Two to four percentages: progress rings draw themselves while the number inside counts up. Set each ring with --cx-p (0-100) and its color with --cx-c.',
    html: componentBlock(ringStats, 'ring-stats')
  },
  {
    id: 'timeline-draw',
    name: 'Drawing timeline',
    category: 'layouts',
    use: 'History, roadmap or process in 3-6 steps: a line draws across and each milestone pops in as the line reaches it; the current one pulses. Set --cx-n to the number of steps and --cx-i on each step.',
    html: componentBlock(timelineDraw, 'timeline-draw')
  },
  {
    id: 'marquee-band',
    name: 'Keyword bands',
    category: 'text',
    use: 'Features, clients or topics as two tilted bands of big words looping in opposite directions; a lively closing or overview slide. Write each list twice in its track (the second copy aria-hidden). Use on a slide without the "page" class: the bands reach the slide edges through its default padding.',
    html: componentBlock(marqueeBand, 'marquee-band')
  },
  {
    id: 'card-fan',
    name: 'Card fan',
    category: 'cards',
    use: 'Three plans, options or people: a stack of cards fans out, then floats gently; hovering lifts a card. Text sits on the left. Place each card with --cx-x and --cx-r.',
    html: componentBlock(cardFan, 'card-fan')
  }
]

const FILE_COMPONENTS: CatalogItem[] = FILE_ITEMS.filter((c) => c.html).map((c) => ({ ...c, use: `${c.use} ${KEEP_STYLE}` }))

// ---------- Examples from the templates ----------

/** A short name for a slide: its first heading, without tags. */
function headingOf(html: string): string {
  const m = html.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i)
  return (m?.[1] ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 60)
}

const EXAMPLES: CatalogItem[] = TEMPLATES.filter((t) => t.id !== 'blank').flatMap((t) =>
  t.slides.map((s, i) => {
    // Charts, maps and tables placed in the designer need the designer, so they are left out of the HTML.
    const portable = (s.elements ?? []).filter((e) => !['chart', 'map', 'table'].includes(e.type))
    const dropped = (s.elements?.length ?? 0) - portable.length
    const html =
      s.html +
      (portable.length ? '\n' + renderElements(portable) : '') +
      (dropped ? `\n<!-- ${dropped} designer chart/map/table component(s) not shown; use <div class="chart" data-chart=...> or table.data instead -->` : '')
    return {
      id: `${t.id}-${i + 1}`,
      name: `${t.name} · ${headingOf(s.html) || `slide ${i + 1}`}`,
      category: 'examples' as const,
      use: `Slide ${i + 1} of the "${t.name}" template (${t.description}).`,
      slideClass: s.className,
      html,
      css: t.css,
      slide: s
    }
  })
)

export const CATALOG: CatalogItem[] = [
  ...LAYOUTS,
  ...DATA,
  ...TEXT,
  ...BACKGROUND_ITEMS,
  ...CARDS,
  ...THREE_D,
  ...MOTION,
  ...FILE_COMPONENTS,
  ...EXAMPLES
]

export function findCatalogItem(id: string): CatalogItem | undefined {
  const key = id.trim().toLowerCase()
  return CATALOG.find((c) => c.id === key)
}

/** The gallery as text: one line per component, grouped by category. */
export function describeCatalog(category?: string): string {
  const cats = CATALOG_CATEGORIES.filter((c) => !category || c.id === category)
  if (!cats.length) return `Unknown category "${category}". Categories: ${CATALOG_CATEGORIES.map((c) => c.id).join(', ')}.`
  return cats
    .map((c) => {
      const items = CATALOG.filter((i) => i.category === c.id)
      return `## ${c.id}: ${c.about}\n${items.map((i) => `- ${i.id}: ${i.name}. ${c.id === 'examples' ? '' : i.use}`.trim()).join('\n')}`
    })
    .join('\n\n')
}

/** The slide that shows a catalog item, for rendering its picture. */
export function catalogSlide(item: CatalogItem): Omit<Slide, 'id'> {
  return item.slide ?? { html: item.html, className: item.slideClass }
}
