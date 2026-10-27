import type { ElementType, Slide, SlideElement } from './types'
import type { Template } from './templates'
import { newId } from './ids'

/**
 * "Annual report" sample deck (fictional company and numbers).
 * Text and layout are HTML; charts, the map and KPI cards are designer
 * components, so they can be dragged and edited in the Design tab.
 * Content area: x 64..1216, y 172..652 (slide pixels).
 */

const el = (
  type: ElementType,
  x: number,
  y: number,
  w: number,
  h: number,
  props: SlideElement['props'],
  anim = 'fade-up',
  delay?: number
): SlideElement => ({ id: newId('e'), type, x, y, w, h, anim, delay, props })

const chart = (x: number, y: number, w: number, h: number, chartType: string, title: string, data: string[], delay = 0.2,
  extra: SlideElement['props'] = {}): SlideElement =>
  el('chart', x, y, w, h, { chartType, title, data: data.join('\n'), card: true, legend: true, stacked: false, ...extra }, 'fade-up', delay)

const kpi = (x: number, y: number, w: number, h: number, label: string, value: string, delta: string, delay: number,
  extra: SlideElement['props'] = {}, anim = 'flip-up'): SlideElement =>
  el('kpi', x, y, w, h, { label, value, delta, up: true, ...extra }, anim, delay)

const head = (chip: string, title: string): string =>
  `<div class="rep-head"><span class="chip fade-in">${chip}</span><h2 class="fade-up">${title}</h2></div>`

const frame = (n: number, body: string): string =>
  `<div class="rep-mark">${String(n).padStart(2, '0')}</div>
${body}
<div class="footer rep-foot"><span><b>Namaa Tech</b> · Annual Report 2026</span><span>${n} / 12</span></div>`

const box = (x: number, y: number, w: number, h: number, cls: string, inner: string, delay?: number): string =>
  `<div class="${cls} abs" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px${delay != null ? `;--d:${delay}s` : ''}">${inner}</div>`

const meterRow = (name: string, value: string, pct: number, delay: number): string =>
  `<div class="reg"><div class="reg-top"><span>${name}</span><b data-count>${value}</b></div><div class="meter"><i style="--v:${pct}%;--d:${delay}s"></i></div></div>`

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const REV_2026 = [15.2, 16.1, 17.4, 18.0, 19.3, 20.1, 20.8, 21.9, 22.6, 24.0, 25.4, 27.2]
const REV_2025 = [12.1, 12.6, 13.4, 13.9, 14.5, 14.9, 15.3, 15.8, 16.2, 16.9, 17.0, 17.4]
const PAGE = 'page'

const REPORT_CSS = `/* Annual report */
.slide .rep-head{display:flex;flex-direction:column;align-items:flex-start;gap:10px;flex:none}
.slide .rep-head h2{font-size:44px}
.slide .rep-mark{position:absolute;right:40px;top:-22px;z-index:-1;font:900 190px/1 var(--heading-font);color:transparent;
  -webkit-text-stroke:1.5px color-mix(in srgb,var(--fg) 9%,transparent);direction:ltr;pointer-events:none}
.slide .rep-foot{bottom:20px;inset-inline:64px;font-size:15px}
.slide .rep-foot b{color:var(--fg);font-weight:600}
.slide .rep-foot span:last-child{direction:ltr;unicode-bidi:isolate}
.slide .abs{position:absolute}
.slide .hero-stats{display:flex;gap:44px;margin-top:6px}
.slide .hero-stats b{display:block;font:800 42px/1.1 var(--heading-font);color:var(--fg);text-align:left}
.slide .hero-stats span{font-size:16px;color:var(--muted)}
.slide .cover-art{position:relative;height:500px}
.slide .orbit{position:absolute;left:50%;top:50%;border-radius:50%;border:1px dashed color-mix(in srgb,var(--fg) 18%,transparent)}
.slide .orbit::after{content:"";position:absolute;top:-6px;left:calc(50% - 6px);width:12px;height:12px;border-radius:50%;
  background:var(--accent);box-shadow:0 0 18px var(--accent)}
.slide .core{position:absolute;left:50%;top:50%;width:170px;height:170px;margin:-85px 0 0 -85px;border-radius:50%;display:grid;
  place-items:center;font:900 76px/1 var(--heading-font);color:#fff;
  background:radial-gradient(circle at 32% 28%,color-mix(in srgb,var(--accent) 50%,#fff),var(--accent) 48%,color-mix(in srgb,var(--accent) 45%,#000));
  box-shadow:0 0 100px color-mix(in srgb,var(--accent) 55%,transparent),inset 0 -14px 30px rgba(0,0,0,.25)}
.slide .float-card{position:absolute}
.slide .float-card .glass{padding:14px 18px;gap:4px;min-width:190px;background:color-mix(in srgb,var(--bg-solid) 70%,transparent)}
.slide .fc-row{display:flex;align-items:center;gap:8px;font-size:15px;color:var(--muted)}
.slide .fc-val{font:800 30px/1.15 var(--heading-font);color:var(--fg)}
.slide .ag{flex-direction:row;align-items:center;gap:20px;padding:24px 26px}
.slide .ag .n{font:900 56px/1 var(--heading-font);color:transparent;-webkit-text-stroke:1.5px var(--accent);direction:ltr;min-width:84px}
.slide .ag h3{font-size:26px}
.slide .ag p{font-size:17px;margin-top:4px}
.slide .reg{display:flex;flex-direction:column;gap:8px}
.slide .reg-top{display:flex;justify-content:space-between;align-items:baseline;font-size:19px;color:var(--fg)}
.slide .reg-top b{font-weight:800;font-size:22px;direction:ltr;unicode-bidi:isolate}
.slide .meter{height:10px}
.slide .side{padding:26px;gap:22px}
.slide .side h3{font-size:22px}
.slide .stat{font-size:40px;color:var(--fg);direction:ltr;unicode-bidi:isolate;align-self:flex-start}
.slide .stat-card{justify-content:center;gap:6px;padding:20px 22px}
.slide .stat-card .icon{width:46px;height:46px;font-size:23px;margin-bottom:6px}
.slide .stat-card p{font-size:16px}
.slide .note{flex-direction:row;align-items:center;gap:16px;padding:22px 24px}
.slide .note p{font-size:19px;color:var(--fg);line-height:1.55}
.slide .steps>div h3{font-size:22px;color:var(--accent)}
.slide .steps>div h4{margin:0;font-size:22px;color:var(--fg)}
.slide .targets{flex-direction:row;justify-content:space-around;align-items:center;padding:20px 28px}
.slide .targets>div{display:flex;flex-direction:column;align-items:center;gap:4px}
.slide .targets b{font:800 46px/1.1 var(--heading-font);color:var(--fg);direction:ltr;unicode-bidi:isolate}
.slide .targets span{font-size:17px;color:var(--muted)}
.slide .contact{display:flex;gap:28px;font-size:18px;color:var(--muted)}
`

const COVER = `<nav class="nav fade-down"><span class="logo">Namaa</span><span>Company</span><span>Performance</span><span>Markets</span><span>Vision 2027</span><a class="btn">Annual Report 2026</a></nav>
<div class="split" style="grid-template-columns:1.12fr 1fr;gap:24px">
  <div style="display:flex;flex-direction:column;gap:20px">
    <span class="chip fade-up">Annual report · Fiscal year 2026</span>
    <h1 class="blur-in" style="font-size:72px;line-height:1.08">A year of <span class="gradient-text shimmer">accelerated growth</span></h1>
    <p class="lead fade-up" style="font-size:24px;--d:.5s">Namaa Tech's financial and operating results, and what we plan for 2027.</p>
    <div class="hero-stats stagger" style="--lv-start:.75s">
      <div><b data-count>248M</b><span>Revenue (SAR)</span></div>
      <div><b data-count>+38%</b><span>Annual growth</span></div>
      <div><b data-count>1.1M</b><span>Active users</span></div>
    </div>
  </div>
  <div class="cover-art">
    <div class="orbit spin" style="width:440px;height:440px;margin:-220px 0 0 -220px;animation-duration:38s"></div>
    <div class="orbit spin" style="width:300px;height:300px;margin:-150px 0 0 -150px;animation-duration:24s;animation-direction:reverse"></div>
    <div class="zoom-in" style="--d:.3s;position:absolute;inset:0"><div class="core pulse">N</div></div>
    <div class="float-card pop" style="right:-6px;top:40px;--d:.9s"><div class="glass float">
      <div class="fc-row">📈 Revenue</div><div class="fc-val">+38%</div>
      <svg class="draw" viewBox="0 0 160 40" width="160" height="40"><path d="M3 34 L26 30 L48 32 L72 22 L96 24 L120 12 L157 5" fill="none" stroke="var(--good)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div></div>
    <div class="float-card pop" style="left:0;top:210px;--d:1.1s"><div class="glass float" style="animation-delay:-2s">
      <div class="fc-row">👥 Users</div><div class="fc-val">1.1 million</div><span class="delta up">+82%</span>
    </div></div>
    <div class="float-card pop" style="right:40px;bottom:16px;--d:1.3s"><div class="glass float" style="animation-delay:-3.5s">
      <div class="fc-row">🏆 Award</div><div class="fc-val" style="font-size:22px">Best Fintech Platform 2026</div>
    </div></div>
  </div>
</div>`

const AGENDA_ITEMS: [string, string, string][] = [
  ['01', 'Year in review', 'Key numbers and milestones'],
  ['02', 'Financial performance', 'Revenue, profit and expenses'],
  ['03', 'Customers and growth', 'Users and retention'],
  ['04', 'Markets', 'Our regional footprint'],
  ['05', 'Product and team', 'Quality and people'],
  ['06', 'Vision 2027', 'Plan and targets']
]

const slides: Omit<Slide, 'id'>[] = [
  // 1. Cover
  {
    className: 'page aurora grid-bg',
    html: COVER,
    notes: 'Welcome the audience. Key message: 38% revenue growth with improving profitability.'
  },

  // 2. Agenda
  {
    className: PAGE,
    html: `${head('Contents', 'What is in this report?')}
<div class="grid-3 stagger" style="grid-template-rows:1fr 1fr;margin-bottom:44px">
${AGENDA_ITEMS.map(([n, t, s]) => `  <div class="glass ag"><span class="n">${n}</span><div><h3>${t}</h3><p>${s}</p></div></div>`).join('\n')}
</div>`
  },

  // 3. Year at a glance
  {
    className: PAGE,
    html: frame(3, head('01 · Year in review', 'The numbers that defined our year')),
    elements: [
      kpi(64, 172, 273, 148, 'Revenue (SAR)', '248M', '+38%', 0.15),
      kpi(357, 172, 273, 148, 'Net profit (SAR)', '61M', '+52%', 0.25),
      kpi(650, 172, 273, 148, 'Business customers', '18,400', '+27%', 0.35),
      kpi(943, 172, 273, 148, 'Customer satisfaction (NPS)', '72', '+9 pts', 0.45),
      chart(64, 340, 1152, 312, 'area', 'Monthly revenue (SAR millions)',
        ['Month,2026,2025', ...MONTHS.map((m, i) => `${m},${REV_2026[i]},${REV_2025[i]}`)], 0.55)
    ],
    notes: 'Every month of 2026 beat the same month of 2025. December was the highest at 27.2 million.'
  },

  // 4. Quarterly revenue
  {
    className: PAGE,
    html: frame(4, head('02 · Financial performance', 'Growth in every quarter of the year')),
    elements: [
      chart(64, 172, 740, 480, 'bar', 'Quarterly revenue (SAR millions)',
        ['Quarter,2025,2026', 'Q1,38.1,48.7', 'Q2,43.3,57.4', 'Q3,47.3,65.3', 'Q4,51.3,76.6']),
      kpi(824, 172, 392, 146, 'Best quarter in our history', '76.6M', '+49% YoY', 0.4, {}, 'fade-up'),
      kpi(824, 339, 392, 146, 'Gross margin', '68%', '+4 pts', 0.5, {}, 'fade-up'),
      kpi(824, 506, 392, 146, 'Free cash flow (SAR)', '44M', '+61%', 0.6, {}, 'fade-up')
    ]
  },

  // 5. Revenue mix
  {
    className: PAGE,
    html: frame(5, `${head('02 · Financial performance', 'More diverse sources of income')}
${box(660, 506, 556, 146, 'glass note fade-up', '<div class="icon">💡</div><p>Analytics is the fastest-growing line at <b class="accent">58%</b>, and payments are now our second-largest revenue source after subscriptions.</p>', 0.55)}`),
    elements: [
      chart(64, 172, 576, 480, 'doughnut', 'Revenue mix 2026 (SAR millions)',
        ['Segment,Revenue', 'Subscriptions,114', 'Payments,67', 'Professional services,37', 'Analytics,30']),
      el('table', 660, 172, 556, 316, {
        title: 'Revenue by segment (SAR millions)', card: true, header: true,
        data: ['Segment,2025,2026,Growth', 'Subscriptions,86,114,+33%', 'Payments,44,67,+52%', 'Professional services,31,37,+19%', 'Analytics,19,30,+58%'].join('\n')
      }, 'fade-up', 0.35)
    ]
  },

  // 6. Efficiency
  {
    className: PAGE,
    html: frame(6, `${head('02 · Financial performance', 'Revenue growing faster than expenses')}
${box(824, 172, 392, 480, 'glass side fade-up', `<h3>Efficiency indicators</h3>
${meterRow('Revenue growth', '38%', 38, 0.6)}
${meterRow('Expense growth', '20%', 20, 0.7)}
${meterRow('Operating margin', '24.6%', 24.6, 0.8)}
${meterRow('R&amp;D share of revenue', '21%', 21, 0.9)}
<p style="font-size:17px;color:var(--fg)">✅ Every extra riyal spent brought in <b class="accent">2.6</b> riyals of revenue.</p>`, 0.35)}`),
    elements: [
      chart(64, 172, 740, 480, 'hbar', 'Operating expenses by line (SAR millions)',
        ['Line,2025,2026', 'R&D,38,52', 'Sales & marketing,35,41', 'Operations,24,28', 'Infrastructure,20,22', 'General & admin,16,17'])
    ]
  },

  // 7. Customers
  {
    className: PAGE,
    html: frame(7, head('03 · Customers and growth', 'Users doubled in two years')),
    elements: [
      chart(64, 172, 740, 480, 'line', 'Active users and subscribers (thousands)',
        ['Quarter,Active users,Subscribers', 'Q1 25,420,60', 'Q2 25,480,72', 'Q3 25,545,85', 'Q4 25,610,98',
          'Q1 26,700,118', 'Q2 26,820,140', 'Q3 26,960,166', 'Q4 26,1120,195']),
      kpi(824, 172, 392, 146, 'Customer retention', '94%', '+3 pts', 0.4, {}, 'fade-up'),
      kpi(824, 339, 392, 146, 'Avg. revenue per customer (SAR)', '13.5K', '+9%', 0.5, {}, 'fade-up'),
      kpi(824, 506, 392, 146, 'Customer acquisition cost (SAR)', '820', '−11%', 0.6, { up: false, tone: 'good' }, 'fade-up')
    ]
  },

  // 8. Markets
  {
    className: PAGE,
    html: frame(8, `${head('04 · Markets', 'Present in 6 markets across the region')}
${box(824, 172, 392, 480, 'glass side fade-up', `<h3>Revenue by market</h3>
${meterRow('Saudi Arabia', '58%', 58, 0.5)}
${meterRow('UAE', '17%', 17, 0.6)}
${meterRow('Egypt', '11%', 11, 0.7)}
${meterRow('Qatar', '6%', 6, 0.8)}
${meterRow('Kuwait', '5%', 5, 0.9)}
${meterRow('Bahrain', '3%', 3, 1)}`, 0.35)}`),
    elements: [
      el('map', 64, 172, 740, 480, {
        lat: 26.2, lng: 43.2, zoom: 4.75, style: 'auto',
        markers: ['24.7136, 46.6753, Riyadh (HQ)', '21.4858, 39.1925, Jeddah', '25.2048, 55.2708, Dubai', '30.0444, 31.2357, Cairo',
          '25.2854, 51.531, Doha', '29.3759, 47.9774, Kuwait City', '26.2285, 50.586, Manama'].join('\n')
      }, 'zoom-in', 0.2)
    ],
    notes: 'The map needs an internet connection. HQ is in Riyadh; the fastest growth was in the UAE.'
  },

  // 9. Product
  {
    className: PAGE,
    html: frame(9, `${head('05 · Product', 'A product that beats the market average')}
<div class="abs stagger" style="left:660px;top:172px;width:556px;height:480px;display:grid;grid-template-columns:1fr 1fr;gap:18px;--lv-start:.35s">
  <div class="glass stat-card"><div class="icon">⚡</div><span class="stat" data-count>99.98%</span><p>Service uptime all year</p></div>
  <div class="glass stat-card"><div class="icon">🔒</div><span class="stat">ISO 27001</span><p>Information security certified</p></div>
  <div class="glass stat-card"><div class="icon">🔗</div><span class="stat" data-count>120+</span><p>Ready-made integrations</p></div>
  <div class="glass stat-card"><div class="icon">🚀</div><span class="stat" data-count>46</span><p>New releases this year</p></div>
</div>`),
    elements: [
      chart(64, 172, 576, 480, 'radar', 'Customer ratings (out of 100)',
        ['Criterion,Namaa,Market average', 'Speed,92,70', 'Security,95,75', 'Ease of use,88,65', 'Integrations,84,72', 'Support,90,68', 'Price,78,74'])
    ]
  },

  // 10. Team
  {
    className: PAGE,
    html: frame(10, `${head('05 · Team', 'A growing team with one culture')}
<div class="abs stagger" style="left:660px;top:172px;width:556px;height:480px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,1fr);gap:16px;--lv-start:.35s">
  <div class="glass stat-card"><span class="stat" data-count>640</span><p>Employees</p></div>
  <div class="glass stat-card"><span class="stat" data-count>34</span><p>Nationalities</p></div>
  <div class="glass stat-card"><span class="stat" data-count>38%</span><p>Women on the team</p></div>
  <div class="glass stat-card"><span class="stat" data-count>4.6/5</span><p>Employee satisfaction</p></div>
  <div class="glass stat-card"><span class="stat" data-count>12,000</span><p>Training hours</p></div>
  <div class="glass stat-card"><span class="stat" data-count>92%</span><p>Employee retention</p></div>
</div>`),
    elements: [
      chart(64, 172, 576, 480, 'polarArea', 'Team by department',
        ['Department,Employees', 'Engineering,269', 'Sales,134', 'Support,90', 'Product & design,77', 'Management,70'])
    ]
  },

  // 11. Roadmap
  {
    className: PAGE,
    html: frame(11, `${head('06 · Vision 2027', 'Our plan for next year')}
${box(64, 196, 1152, 230, 'steps stagger', `
  <div><h3>Q1</h3><h4>Launch “Namaa AI”</h4><p>A smart analytics assistant for every customer</p></div>
  <div><h3>Q2</h3><h4>Morocco and Jordan</h4><p>Enter two new markets</p></div>
  <div><h3>Q3</h3><h4>Stock market listing</h4><p>Initial public offering on Tadawul</p></div>
  <div><h3>Q4</h3><h4>Two million users</h4><p>Double today's user base</p></div>`)}
${box(64, 452, 1152, 200, 'glass targets fade-up', `
  <div><b data-count>350M</b><span>Target revenue (SAR)</span></div>
  <div><b data-count>2M</b><span>Active users</span></div>
  <div><b data-count>8</b><span>Markets</span></div>
  <div><b data-count>30%</b><span>Operating margin</span></div>`, 0.9)}`),
    notes: 'The IPO depends on regulatory approval.'
  },

  // 12. Closing
  {
    className: 'page aurora grid-bg',
    html: `<nav class="nav fade-down"><span class="logo">Namaa</span><span>Company</span><span>Performance</span><span>Markets</span><span>Vision 2027</span><a class="btn">Annual Report 2026</a></nav>
<div class="center" style="flex:1;gap:22px">
  <span class="chip fade-up">Thank you</span>
  <h1 class="blur-in" style="font-size:92px;line-height:1.08">Together toward <span class="gradient-text shimmer">a bigger year</span></h1>
  <p class="lead fade-up" style="font-size:26px;--d:.5s">For questions and the full report, contact our investor relations team.</p>
  <div class="row fade-up" style="--d:.7s"><a class="btn glow">Download full report</a><a class="btn ghost">Investor relations</a></div>
  <div class="contact fade-in" style="--d:.9s"><span>ir@namaa.example</span><span>·</span><span>namaa.example</span></div>
</div>`
  }
]

export const REPORT_TEMPLATE: Template = {
  id: 'annual-report',
  name: 'Annual report',
  description: '12 animated slides: KPIs, Chart.js charts, a map and a roadmap (sample data)',
  themeId: 'glass',
  transition: 'zoom',
  css: REPORT_CSS,
  slides
}
