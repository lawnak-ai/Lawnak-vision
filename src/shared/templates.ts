import type { Slide } from './types'

export interface Template {
  id: string
  name: string
  description: string
  themeId: string
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
  {
    id: 'pitch',
    name: 'Startup pitch',
    description: 'Problem, solution, market, team, ask',
    themeId: 'sunset',
    slides: [
      {
        className: 'center',
        html: '<span class="kicker fade-up">Seed round · 2026</span>\n<h1 class="fade-up">Acme Robotics</h1>\n<p class="lead fade-up">Robots that fold your laundry while you sleep.</p>',
        notes: 'Open with the one-line vision.'
      },
      {
        html: '<span class="kicker">The problem</span>\n<h2>Households spend 6 hours a week on laundry</h2>\n<div class="grid-3">\n<div class="card fade-up"><div class="stat">6h</div><p class="muted">per household, every week</p></div>\n<div class="card fade-up"><div class="stat">82%</div><p class="muted">say it is their least liked chore</p></div>\n<div class="card fade-up"><div class="stat">$0</div><p class="muted">spent on automating it today</p></div>\n</div>'
      },
      {
        html: '<span class="kicker">Our solution</span>\n<h2>A folding robot the size of a dishwasher</h2>\n<ul>\n<li class="fade-up">Drop clothes in, get folded stacks out</li>\n<li class="fade-up">Learns your folding style in one week</li>\n<li class="fade-up">Works with any washer and dryer</li>\n</ul>'
      },
      {
        className: 'center',
        html: '<span class="kicker">The ask</span>\n<h1>$3M seed</h1>\n<p class="lead">18 months of runway to ship 1,000 units.</p>'
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
