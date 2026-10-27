import type { ElementType, Slide, SlideElement } from './types'
import type { Template } from './templates'
import { newId } from './ids'

/**
 * "Business proposal" sample deck (fictional company and numbers).
 * Built from the card tools: glass cards with hover effects, KPI cards,
 * chart and table cards, the flame card and the card ring.
 * Content area: x 64..1216, y 172..652 (slide pixels).
 */

const el = (type: ElementType, x: number, y: number, w: number, h: number, props: SlideElement['props'], anim = 'fade-up', delay?: number): SlideElement =>
  ({ id: newId('e'), type, x, y, w, h, anim, delay, props })

const kpi = (x: number, label: string, value: string, delta: string, delay: number, extra: SlideElement['props'] = {}): SlideElement =>
  el('kpi', x, 506, 273, 146, { label, value, delta, up: true, hover: 'fx-tilt', ...extra }, 'flip-up', delay)

const TOTAL = 10

const head = (n: number, kicker: string, title: string): string =>
  `<div class="pro-head"><span class="pro-kicker fade-in"><b>${String(n).padStart(2, '0')}</b>${kicker}</span><h2 class="fade-up">${title}</h2></div>`

const foot = (n: number): string =>
  `<div class="footer pro-foot"><span><b>Vertex Advisory</b> · Growth Partnership Proposal</span><span>${String(n).padStart(2, '0')} / ${TOTAL}</span></div>`

const CSS = `/* Business proposal */
.slide .abs{position:absolute}
.slide .pro-head{display:flex;flex-direction:column;align-items:flex-start;gap:12px;flex:none}
.slide .pro-head h2{font-size:44px;letter-spacing:-.02em}
.slide .pro-kicker{display:inline-flex;align-items:center;gap:12px;font-size:15px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.slide .pro-kicker b{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;font-size:14px;letter-spacing:0;
  color:var(--accent-fg);background:var(--accent)}
.slide .pro-foot{bottom:20px;inset-inline:64px;font-size:15px}
.slide .pro-foot b{color:var(--fg);font-weight:600}
.slide .glass h3{font-size:24px}
.slide .glass p{font-size:18px;line-height:1.5}
.slide .pro-pillar{gap:14px;padding:28px}
.slide .pro-pillar .tag{font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.slide .pro-cover-stats{display:flex;gap:40px;margin-top:8px;padding-top:24px;border-top:1px solid var(--border)}
.slide .pro-cover-stats b{display:block;font:800 36px/1.1 var(--heading-font);color:var(--fg)}
.slide .pro-cover-stats span{font-size:15px;color:var(--muted)}
.slide .pro-tiers{display:flex;flex-direction:column;gap:14px}
.slide .pro-tier{flex-direction:row;align-items:center;gap:20px;padding:20px 24px}
.slide .pro-tier .v{font:800 38px/1 var(--heading-font);color:var(--fg);min-width:132px}
.slide .pro-tier h3{font-size:20px}
.slide .pro-tier p{font-size:16px}
.slide .pro-case{gap:14px;padding:28px}
.slide .pro-case .client{display:flex;align-items:center;gap:12px;font-size:16px;font-weight:700;color:var(--muted)}
.slide .pro-case .big{font:800 58px/1 var(--heading-font);color:var(--accent);letter-spacing:-.02em}
.slide .pro-case blockquote{margin:auto 0 0;padding-top:16px;border-top:1px solid var(--border);font-size:17px;font-style:italic;color:var(--fg);line-height:1.5}
.slide .pro-price{gap:14px;padding:30px 30px 26px}
.slide .pro-price .tier{font-size:14px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}
.slide .pro-price .amt{font:800 50px/1 var(--heading-font);color:var(--fg);letter-spacing:-.02em}
.slide .pro-price .amt small{font-size:17px;font-weight:600;color:var(--muted);letter-spacing:0}
.slide .pro-price ul{list-style:none;padding:0;margin:6px 0 0;gap:11px;font-size:18px;color:var(--fg)}
.slide .pro-price li::before{content:"✓";display:inline-block;width:24px;font-weight:800;color:var(--good)}
.slide .pro-price .btn{margin-top:auto;width:100%;justify-content:center;font-size:18px;padding:12px}
.slide .pro-price.featured{border-color:color-mix(in srgb,var(--accent) 55%,transparent);
  background:linear-gradient(160deg,color-mix(in srgb,var(--accent) 20%,transparent),color-mix(in srgb,var(--fg) 3%,transparent))}
.slide .pro-ribbon{position:absolute;top:22px;right:22px;padding:5px 12px;border-radius:999px;font-size:13px;font-weight:800;
  letter-spacing:.06em;color:var(--accent-fg);background:var(--accent)}
.slide .pro-person{align-items:center;text-align:center;gap:10px;padding:28px 22px}
.slide .pro-avatar{width:96px;height:96px;border-radius:50%;display:grid;place-items:center;margin-bottom:6px;
  font:800 32px/1 var(--heading-font);color:var(--accent-fg);
  background:linear-gradient(135deg,var(--accent),color-mix(in srgb,var(--accent) 40%,var(--fg)));
  box-shadow:0 0 0 6px color-mix(in srgb,var(--accent) 18%,transparent)}
.slide .pro-person h3{font-size:22px}
.slide .pro-person .role{font-size:15px;font-weight:700;color:var(--accent);letter-spacing:.04em}
.slide .pro-person p{font-size:16px}
.slide .pro-tags{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:auto;padding-top:16px;width:100%;border-top:1px solid var(--border)}
.slide .pro-tags span{padding:4px 12px;border-radius:999px;font-size:14px;font-weight:600;color:var(--fg);
  background:color-mix(in srgb,var(--accent) 14%,transparent);border:1px solid color-mix(in srgb,var(--accent) 30%,transparent)}
.slide .pro-case p{font-size:17px}
.slide .steps>div h3{font-size:20px;color:var(--accent)}
.slide .steps>div h4{margin:0;font-size:22px;color:var(--fg)}
.slide .pro-check{display:flex;flex-direction:column;gap:12px;font-size:18px;color:var(--fg)}
.slide .pro-check div{display:flex;gap:12px;align-items:flex-start}
.slide .pro-check div::before{content:"✓";flex:none;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;
  font-size:13px;font-weight:900;color:var(--accent-fg);background:var(--good)}
.slide .pro-contact{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;width:100%;max-width:980px;text-align:start}
.slide .pro-contact .glass{flex-direction:row;align-items:center;gap:16px;padding:20px 22px}
.slide .pro-contact small{display:block;font-size:14px;color:var(--muted)}
.slide .pro-contact b{font-size:18px;color:var(--fg)}
`

const SERVICES = [
  '📊|Strategy|Growth roadmap & market entry',
  '⚙️|Operations|Lean processes & cost control',
  '🤖|AI & Data|Analytics, forecasting, automation',
  '💳|Finance|Fundraising & investor readiness',
  '🧭|Leadership|Executive coaching & org design',
  '🌍|Expansion|New markets across the GCC',
  '🛡️|Risk|Governance & compliance',
  '📣|Brand|Positioning & go-to-market'
].join('\n')

const slides: Omit<Slide, 'id'>[] = [
  // 1. Cover
  {
    className: 'page aurora grid-bg',
    html: `<nav class="nav fade-down"><span class="logo">Vertex Advisory</span><span>Approach</span><span>Services</span><span>Results</span><span>Team</span><a class="btn">Proposal · 2027</a></nav>
<div class="split" style="grid-template-columns:1.25fr 1fr;gap:40px">
  <div style="display:flex;flex-direction:column;gap:22px">
    <span class="chip fade-up">Prepared for Horizon Retail Group</span>
    <h1 class="blur-in" style="font-size:68px;line-height:1.06">A partnership to <span class="gradient-text shimmer">double your growth</span></h1>
    <p class="lead fade-up" style="font-size:24px;--d:.5s">A 12-month program covering strategy, operations and data, with results measured every quarter.</p>
    <div class="pro-cover-stats stagger" style="--lv-start:.8s">
      <div><b data-count>180+</b><span>Clients served</span></div>
      <div><b data-count>3.2×</b><span>Average ROI</span></div>
      <div><b data-count>14</b><span>Years of experience</span></div>
    </div>
  </div>
  <div></div>
</div>`,
    elements: [
      el('shadercard', 840, 150, 360, 470, {
        title: 'Growth Program 2027',
        text: 'Strategy, operations and data working as one plan, with a dedicated team from day one.',
        cta: 'Start the journey →', color: ''
      }, 'zoom-in', 0.4)
    ],
    notes: 'Open with the outcome: a plan to double growth in 12 months. The card on the right reacts to the mouse.'
  },

  // 2. Executive summary
  {
    className: 'page',
    html: `${head(1, 'Executive summary', 'Three moves that unlock the next stage')}
<div class="grid-3 stagger" style="flex:none;height:300px;--lv-start:.3s">
  <div class="glass pro-pillar fx-spotlight"><div class="icon">🎯</div><span class="tag">Focus</span><h3>Sharpen the core offer</h3><p>Concentrate investment on the 20% of products that drive 70% of margin.</p></div>
  <div class="glass pro-pillar fx-spotlight"><div class="icon">⚡</div><span class="tag">Speed</span><h3>Run leaner operations</h3><p>Cut order-to-delivery time in half with automated supply planning.</p></div>
  <div class="glass pro-pillar fx-spotlight"><div class="icon">📈</div><span class="tag">Scale</span><h3>Grow with data</h3><p>Use live dashboards and forecasting to open two new markets.</p></div>
</div>
${foot(2)}`,
    elements: [
      kpi(64, 'Revenue target', '+100%', 'in 12 months', 0.7),
      kpi(357, 'Cost savings', '18%', 'operating costs', 0.8, { up: false, tone: 'good' }),
      kpi(650, 'Delivery time', '−50%', 'order to door', 0.9, { up: false, tone: 'good' }),
      kpi(943, 'Payback period', '7 mo', 'on program fees', 1.0)
    ],
    notes: 'Hover the cards for the spotlight; the KPI cards tilt toward the pointer.'
  },

  // 3. Market opportunity
  {
    className: 'page',
    html: `${head(2, 'Market opportunity', 'A large market that is still growing fast')}
<div class="abs pro-tiers stagger" style="left:824px;top:172px;width:392px;height:480px;--lv-start:.4s">
  <div class="glass pro-tier"><span class="v" data-count>$42B</span><div><h3>Total market</h3><p>GCC retail, 2027</p></div></div>
  <div class="glass pro-tier"><span class="v" data-count>$9.6B</span><div><h3>Serviceable market</h3><p>Mid-size chains, online + stores</p></div></div>
  <div class="glass pro-tier"><span class="v" data-count>$1.1B</span><div><h3>Reachable in 3 years</h3><p>With the plan in this proposal</p></div></div>
</div>
${foot(3)}`,
    elements: [
      el('chart', 64, 172, 740, 480, {
        chartType: 'bar', title: 'GCC retail market (USD billions)', card: true, legend: true, stacked: true,
        data: ['Year,In-store,Online', '2023,28.4,4.1', '2024,29.6,5.3', '2025,30.5,6.8', '2026,31.2,8.6', '2027,31.9,10.4'].join('\n')
      }, 'fade-up', 0.2)
    ]
  },

  // 4. Services
  {
    className: 'page bg-mesh',
    html: `${head(3, 'What we do', 'Eight practices, one integrated team')}
<p class="hint fade-in" style="position:absolute;bottom:22px;left:0;right:0;text-align:center;font-size:15px;color:var(--muted);--d:1.2s">Drag the ring to explore every practice</p>`,
    elements: [el('rotcards', 64, 176, 1152, 470, { items: SERVICES, speed: 22, dir: 'forward' }, 'fade-in', 0.3)],
    notes: 'The card ring turns on its own. Drag it to spin it faster.'
  },

  // 5. Why us
  {
    className: 'page',
    html: `${head(4, 'Why Vertex', 'How we compare with other firms')}
<div class="abs glass fade-up" style="left:824px;top:172px;width:392px;height:480px;padding:28px;gap:18px;--d:.45s">
  <h3>What you get with us</h3>
  <div class="pro-check">
    <div>Senior partners on every engagement</div>
    <div>Fees linked to measured results</div>
    <div>In-house data and AI team</div>
    <div>Offices in Riyadh, Dubai and Cairo</div>
    <div>Hands-on delivery, not just slides</div>
  </div>
</div>
${foot(5)}`,
    elements: [
      el('table', 64, 172, 740, 480, {
        title: 'Side-by-side comparison', card: true, header: true,
        data: [',Vertex,Global firm,Local boutique', 'Senior partner time,60%,15%,40%', 'Results-based fees,Yes,No,Partial', 'Data & AI team,In-house,Outsourced,None',
          'Time to first results,6 weeks,4 months,3 months', 'Client satisfaction,9.4 / 10,7.8 / 10,7.1 / 10', 'Typical cost,$$,$$$$,$'].join('\n')
      }, 'fade-up', 0.25)
    ]
  },

  // 6. Case studies
  {
    className: 'page',
    html: `${head(5, 'Proven results', 'What we delivered for clients like you')}
<div class="grid-3 stagger" style="margin-bottom:40px;--lv-start:.3s">
  <div class="glass pro-case fx-glare"><span class="client"><span class="icon">🛒</span>Nova Markets · Retail</span><span class="big" data-count>+64%</span><h3>Online revenue in 9 months</h3><p>New pricing, a faster checkout and same-day delivery in three cities.</p><blockquote>“They rebuilt our e-commerce playbook and stayed until it worked.”</blockquote></div>
  <div class="glass pro-case fx-glare"><span class="client"><span class="icon">🏭</span>Gulf Foods · Manufacturing</span><span class="big" data-count>−22%</span><h3>Production costs in one year</h3><p>Lean lines, smarter purchasing and predictive maintenance.</p><blockquote>“The savings paid for the whole program twice over.”</blockquote></div>
  <div class="glass pro-case fx-glare"><span class="client"><span class="icon">🏦</span>Sanad Finance · Fintech</span><span class="big" data-count>$40M</span><h3>Series B raised with our support</h3><p>Equity story, financial model and a data room investors trusted.</p><blockquote>“Investor-ready in eight weeks. Exceptional team.”</blockquote></div>
</div>
${foot(6)}`
  },

  // 7. Roadmap
  {
    className: 'page',
    html: `${head(6, 'The plan', 'A 12-month program in four phases')}
<div class="abs steps stagger" style="left:64px;top:200px;width:1152px;height:200px;--lv-start:.35s">
  <div><h3>Months 1–2</h3><h4>Diagnose</h4><p>Data audit, interviews and a clear baseline</p></div>
  <div><h3>Months 3–5</h3><h4>Design</h4><p>Target model, quick wins and the business case</p></div>
  <div><h3>Months 6–10</h3><h4>Deliver</h4><p>Roll out across stores, supply chain and online</p></div>
  <div><h3>Months 11–12</h3><h4>Sustain</h4><p>Hand over dashboards, playbooks and training</p></div>
</div>
<div class="abs grid-3 stagger" style="left:64px;top:430px;width:1152px;height:222px;gap:18px;--lv-start:.9s">
  <div class="glass fx-tilt"><div class="icon">🗓️</div><h3>Monthly steering</h3><p>Progress review with your leadership team.</p></div>
  <div class="glass fx-tilt"><div class="icon">📊</div><h3>Live scorecard</h3><p>Every KPI tracked in one shared dashboard.</p></div>
  <div class="glass fx-tilt"><div class="icon">🤝</div><h3>Joint team</h3><p>Your people learn by doing, alongside ours.</p></div>
</div>
${foot(7)}`
  },

  // 8. Investment
  {
    className: 'page',
    html: `${head(7, 'Investment', 'Choose the package that fits your goals')}
<div class="grid-3 stagger" style="margin-bottom:40px;--lv-start:.3s">
  <div class="glass pro-price"><span class="tier">Essentials</span><span class="amt">$180K<small> / program</small></span><p>Strategy and roadmap for one business unit.</p>
    <ul><li>Diagnostic &amp; baseline</li><li>Growth strategy</li><li>Quarterly reviews</li></ul><a class="btn ghost">Select</a></div>
  <div class="glass pro-price featured fx-border"><span class="pro-ribbon">Recommended</span><span class="tier">Growth</span><span class="amt">$420K<small> / program</small></span><p>Full 12-month program with delivery support.</p>
    <ul><li>Everything in Essentials</li><li>Operations &amp; supply chain</li><li>Data &amp; AI dashboards</li><li>Results-based fee</li></ul><a class="btn">Select</a></div>
  <div class="glass pro-price"><span class="tier">Enterprise</span><span class="amt">Custom</span><p>Group-wide transformation across markets.</p>
    <ul><li>Everything in Growth</li><li>Multi-country rollout</li><li>Dedicated partner team</li></ul><a class="btn ghost">Talk to us</a></div>
</div>
${foot(8)}`,
    notes: 'Lead with Growth: it carries the results-based fee, which lowers the client’s risk.'
  },

  // 9. Team
  {
    className: 'page',
    html: `${head(8, 'Your team', 'Senior people, fully committed')}
<div class="stagger" style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px;flex:1;margin-bottom:40px;--lv-start:.3s">
  <div class="glass pro-person fx-tilt"><div class="pro-avatar">SA</div><h3>Sara Al-Amri</h3><span class="role">Engagement Partner</span><p>18 years in retail strategy across the GCC.</p><div class="pro-tags"><span>Strategy</span><span>Retail</span></div></div>
  <div class="glass pro-person fx-tilt"><div class="pro-avatar">OK</div><h3>Omar Khalid</h3><span class="role">Operations Lead</span><p>Supply chain expert, ex-head of logistics.</p><div class="pro-tags"><span>Supply chain</span><span>Lean</span></div></div>
  <div class="glass pro-person fx-tilt"><div class="pro-avatar">LM</div><h3>Lina Mansour</h3><span class="role">Data &amp; AI Lead</span><p>Built forecasting for 40+ retail brands.</p><div class="pro-tags"><span>AI</span><span>Forecasting</span></div></div>
  <div class="glass pro-person fx-tilt"><div class="pro-avatar">JR</div><h3>James Reed</h3><span class="role">Finance Advisor</span><p>Former investment banker, 12 IPOs.</p><div class="pro-tags"><span>M&amp;A</span><span>IPO</span></div></div>
</div>
${foot(9)}`
  },

  // 10. Closing
  {
    className: 'page aurora grid-bg',
    html: `<nav class="nav fade-down"><span class="logo">Vertex Advisory</span><span>Approach</span><span>Services</span><span>Results</span><span>Team</span><a class="btn">Proposal · 2027</a></nav>
<div class="center" style="flex:1;gap:24px">
  <span class="chip fade-up">Next steps</span>
  <h1 class="blur-in" style="font-size:80px;line-height:1.06">Let's build <span class="gradient-text shimmer">what's next</span>, together</h1>
  <p class="lead fade-up" style="font-size:24px;--d:.5s">Approve the proposal by December 15 and we start with the diagnostic in January.</p>
  <div class="pro-contact stagger" style="--lv-start:.8s">
    <div class="glass fx-spotlight"><div class="icon">✉️</div><div><small>Email</small><b>hello@vertex.example</b></div></div>
    <div class="glass fx-spotlight"><div class="icon">📞</div><div><small>Phone</small><b>+966 11 000 0000</b></div></div>
    <div class="glass fx-spotlight"><div class="icon">📍</div><div><small>Office</small><b>Riyadh · Dubai · Cairo</b></div></div>
  </div>
</div>`
  }
]

export const PRO_TEMPLATE: Template = {
  id: 'proposal',
  name: 'Business proposal',
  description: '10 polished slides built from cards: KPI, chart, table, pricing, team and the card ring',
  themeId: 'midnight',
  transition: 'rise',
  css: CSS,
  slides
}
