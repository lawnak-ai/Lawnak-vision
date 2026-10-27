import type { Slide } from './types'
import { REPORT_TEMPLATE } from './reportTemplate'
import { FX_TEMPLATE } from './fxTemplate'
import { FX3D_TEMPLATE } from './fx3dTemplate'
import { PRO_TEMPLATE } from './proTemplate'

export interface Template {
  id: string
  name: string
  description: string
  themeId: string
  /** Slide transition for decks made from this template. */
  transition?: string
  /** Extra deck CSS. */
  css?: string
  slides: Omit<Slide, 'id'>[]
}

export const TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'One empty title slide',
    themeId: 'midnight',
    slides: [{ className: 'center', html: '<h1>Untitled presentation</h1>\n<p class="lead">Click Edit HTML or ask the AI to start.</p>' }]
  },
  PRO_TEMPLATE,
  REPORT_TEMPLATE,
  FX3D_TEMPLATE,
  FX_TEMPLATE,
  {
    id: 'web-report',
    name: 'Web-style report',
    description: 'Slides that look like a modern website, with live charts',
    themeId: 'glass',
    transition: 'zoom',
    slides: [
      {
        className: 'page aurora',
        html: `<nav class="nav fade-down"><span class="logo">Lawnak</span><span>Product</span><span>Solutions</span><span>Pricing</span><a class="btn">Get started</a></nav>
<div class="split">
  <div style="display:flex;flex-direction:column;gap:24px">
    <span class="chip fade-up">Q3 report · 2026</span>
    <h1 class="blur-in" style="font-size:64px">Growing <span class="gradient-text">faster</span> than ever</h1>
    <p class="lead fade-up" style="font-size:26px">An analytics platform that helps teams make data-driven decisions, in real time.</p>
    <div class="row fade-up"><a class="btn">Watch the demo</a><a class="btn ghost">Download report</a></div>
  </div>
  <div class="float"><div class="browser zoom-in" style="height:420px;--d:.5s"><div class="body">
    <div class="row" style="justify-content:space-between">
      <div class="kpi"><span class="label">Monthly revenue</span><span class="value" data-count>$482K</span></div>
      <span class="delta up">+24%</span>
    </div>
    <div class="chart" data-chart='{"type":"area","labels":["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep"],"series":[{"name":"Revenue","data":[210,236,251,298,320,355,402,441,482]}],"prefix":"$","unit":"K"}'></div>
  </div></div></div>
</div>`,
        notes: 'Slides here are web pages: charts are live, hover them to see the numbers.'
      },
      {
        className: 'page',
        html: `<span class="chip fade-in">Overview</span>
<h2 class="fade-up">The quarter at a glance</h2>
<div class="bento" style="grid-template-rows:auto 1fr">
  <div class="glass kpi flip-up"><span class="label">Active users</span><span class="value" data-count>128,400</span><span class="delta up">+18%</span></div>
  <div class="glass kpi flip-up"><span class="label">Retention rate</span><span class="value" data-count>94.2%</span><span class="delta up">+3.1 pts</span></div>
  <div class="glass kpi flip-up"><span class="label">Avg. session</span><span class="value" data-count>12.5 min</span><span class="delta up">+9%</span></div>
  <div class="glass kpi flip-up"><span class="label">Acquisition cost</span><span class="value" data-count>$38</span><span class="delta down good">−6%</span></div>
  <div class="glass span-4 fade-up" style="--d:.7s">
    <h3>Weekly active users</h3>
    <div class="chart" data-chart='{"type":"line","labels":["1","2","3","4","5","6","7","8","9","10","11","12"],"series":[{"name":"2026","data":[92,96,99,104,103,110,114,117,119,123,126,128]},{"name":"2025","data":[70,72,71,75,77,76,80,82,81,85,86,88]}],"unit":"K"}'></div>
  </div>
</div>`
      },
      {
        className: 'page',
        html: `<span class="chip fade-in">Revenue</span>
<h2 class="fade-up">Revenue by quarter, year over year</h2>
<div class="split" style="grid-template-columns:1.6fr 1fr;align-items:stretch;gap:24px">
  <div class="glass fade-up" style="--d:.3s">
    <div class="chart" data-chart='{"type":"bar","labels":["Q1","Q2","Q3","Q4"],"series":[{"name":"2025","data":[1.2,1.5,1.7,2.1]},{"name":"2026","data":[1.8,2.3,2.9,3.4]}],"prefix":"$","unit":"M"}'></div>
  </div>
  <div class="stagger" style="display:flex;flex-direction:column;gap:16px">
    <div class="glass" style="flex-direction:row;align-items:center;gap:18px"><div class="icon">📈</div><div><h3 data-count>62%</h3><p>Year-over-year revenue growth</p></div></div>
    <div class="glass" style="flex-direction:row;align-items:center;gap:18px"><div class="icon">🌍</div><div><h3 data-count>3</h3><p>New markets this year</p></div></div>
    <div class="glass" style="flex-direction:row;align-items:center;gap:18px"><div class="icon">🤝</div><div><h3 data-count>41</h3><p>New enterprise customers</p></div></div>
  </div>
</div>`
      },
      {
        className: 'page',
        html: `<span class="chip fade-in">Traffic sources</span>
<h2 class="fade-up">Where do our users come from?</h2>
<div class="glass fade-up" style="flex:1;padding:36px 44px;--d:.3s">
  <div class="chart" data-chart='{"type":"donut","labels":["Search","Direct","Social","Referrals","Email"],"series":[{"name":"Visits","data":[42000,28500,21000,9800,6200]}],"center":"visits"}'></div>
</div>`
      },
      {
        className: 'page grid-bg',
        html: `<span class="chip fade-in">Features</span>
<h2 class="fade-up">Everything your team needs in one place</h2>
<div class="bento stagger">
  <div class="glass span-2 row-2"><div class="icon">📊</div><h3>Live dashboards</h3><p>Updated every second, shared with a single link.</p>
    <div class="chart" data-chart='{"type":"bar","labels":["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],"series":[{"name":"Queries","data":[52,61,58,72,66,44,38]}],"unit":"K"}'></div>
  </div>
  <div class="glass"><div class="icon">⚡</div><h3>Fast</h3><p>Queries in under a second</p></div>
  <div class="glass"><div class="icon">🔒</div><h3>Secure</h3><p>End-to-end data encryption</p></div>
  <div class="glass"><div class="icon">🤖</div><h3>Smart</h3><p>AI-powered automatic alerts</p></div>
  <div class="glass"><div class="icon">🔗</div><h3>Connected</h3><p>120+ ready-made integrations</p></div>
</div>`
      },
      {
        className: 'page aurora',
        html: `<nav class="nav fade-down"><span class="logo">Lawnak</span><span>Product</span><span>Solutions</span><span>Pricing</span><a class="btn">Get started</a></nav>
<div class="center" style="flex:1;gap:22px">
  <span class="chip fade-up">What's next</span>
  <h1 class="blur-in" style="font-size:66px">Ready for <span class="gradient-text shimmer">the next stage</span></h1>
  <div class="steps stagger" style="width:100%;margin:18px 0;text-align:start">
    <div><h3>Q4</h3><p>Launch the mobile app</p></div>
    <div><h3>Q1</h3><p>Expand to the Gulf region</p></div>
    <div><h3>Q2</h3><p>AI analysis assistant</p></div>
    <div><h3>Q3</h3><p>10,000 customers</p></div>
  </div>
  <div class="row fade-up" style="--d:1.1s"><a class="btn glow">Book a demo</a><a class="btn ghost">Contact us</a></div>
</div>`
      }
    ]
  },
  {
    id: 'pitch',
    name: 'Startup pitch',
    description: 'Problem, solution, market, team, ask',
    themeId: 'sunset',
    slides: [
      {
        className: 'center aurora',
        html: '<span class="badge pop">Seed round · 2026</span>\n<h1 class="blur-in gradient-text" style="font-size:96px">Acme Robotics</h1>\n<p class="lead fade-up typewriter" style="--d:.9s">Robots that fold your laundry while you sleep.</p>',
        notes: 'Open with the one-line vision.'
      },
      {
        html: '<span class="kicker fade-in">The problem</span>\n<h2 class="reveal">Households spend 6 hours a week on laundry</h2>\n<div class="grid-3">\n<div class="card flip-up"><div class="stat" data-count>6h</div><p class="muted">per household, every week</p></div>\n<div class="card flip-up"><div class="stat" data-count>82%</div><p class="muted">say it is their least liked chore</p></div>\n<div class="card flip-up"><div class="stat" data-count>$0</div><p class="muted">spent on automating it today</p></div>\n</div>'
      },
      {
        html: '<span class="kicker fade-in">Our solution</span>\n<h2 class="fade-up">A folding robot the size of a dishwasher</h2>\n<ul class="stagger">\n<li>Drop clothes in, get folded stacks out</li>\n<li>Learns your folding style in one week</li>\n<li>Works with any washer and dryer</li>\n</ul>'
      },
      {
        html: '<span class="kicker fade-in">Traction</span>\n<h2 class="fade-up">Pre-orders grew 8× in six months</h2>\n<div class="grid-2" style="grid-template-columns:1.4fr 1fr;align-items:center">\n<svg class="draw fade-in" viewBox="0 0 600 300" fill="none" stroke-linecap="round" stroke-linejoin="round">\n<path d="M20 280H580" stroke="var(--border)" stroke-width="2"/>\n<path d="M20 260 L120 240 L220 210 L320 190 L420 120 L520 70 L580 30" stroke="var(--accent)" stroke-width="8"/>\n<circle cx="580" cy="30" r="10" stroke="var(--accent)" stroke-width="6"/>\n</svg>\n<div class="stagger" style="display:flex;flex-direction:column;gap:22px">\n<div><p>Pre-orders <b data-count>2,400</b></p><div class="meter"><i style="--v:80%"></i></div></div>\n<div><p>Repeat buyers <b data-count>64%</b></p><div class="meter"><i style="--v:64%"></i></div></div>\n<div><p>Return rate <b data-count>3%</b></p><div class="meter"><i style="--v:3%"></i></div></div>\n</div>\n</div>',
        notes: 'Slides run JavaScript: the chart draws itself and the numbers count up.'
      },
      {
        className: 'center aurora',
        html: '<span class="kicker fade-in">The ask</span>\n<div class="pulse"><h1 class="zoom-in" style="font-size:120px" data-count>$3M</h1></div>\n<p class="lead fade-up">18 months of runway to ship 1,000 units.</p>'
      }
    ]
  },
  {
    id: 'lesson',
    name: 'Lesson',
    description: 'Teach a topic with steps and a quiz',
    themeId: 'paper',
    slides: [
      {
        className: 'center',
        html: '<span class="kicker">Lesson 1</span>\n<h1>How the web works</h1>\n<p class="lead">From typing a URL to seeing a page.</p>'
      },
      {
        html: '<h2>Four steps</h2>\n<div class="grid-2">\n<div class="card"><h3>1 · DNS</h3><p class="muted">The name is turned into an address.</p></div>\n<div class="card"><h3>2 · Connect</h3><p class="muted">The browser opens a secure connection.</p></div>\n<div class="card"><h3>3 · Request</h3><p class="muted">It asks the server for the page.</p></div>\n<div class="card"><h3>4 · Render</h3><p class="muted">HTML, CSS and JS become pixels.</p></div>\n</div>'
      },
      {
        html: '<h2>Quick quiz</h2>\n<p class="lead">Which step turns a name into an address?</p>\n<div class="grid-3" id="quiz">\n<button class="card" data-ok="1">DNS</button>\n<button class="card">Render</button>\n<button class="card">Request</button>\n</div>\n<p id="quiz-result" class="accent"></p>\n<script>\ndocument.querySelectorAll("#quiz button").forEach(function(b){\n  b.style.font="inherit";b.style.color="inherit";b.style.cursor="pointer";\n  b.onclick=function(){document.getElementById("quiz-result").textContent=b.dataset.ok?"Correct!":"Try again"};\n});\n</script>',
        notes: 'Slides can run JavaScript: this quiz is interactive in Present mode.'
      }
    ]
  }
]
