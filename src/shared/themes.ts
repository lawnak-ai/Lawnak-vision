import type { Theme } from './types'
import { FX_CSS } from './effects'
import { FX3D_CSS } from './effects3d'

/**
 * Entrance animations. An element with one of these classes is hidden until its
 * slide is shown, then animates in. They replay every time the slide is shown.
 */
export const ENTRANCES = [
  'fade-up', 'fade-down', 'fade-in', 'zoom-in', 'zoom-out', 'slide-start', 'slide-end',
  'blur-in', 'pop', 'flip-up', 'reveal'
] as const

/** Looping animations that run while the slide is shown. */
export const LOOPS = ['float', 'pulse', 'spin', 'glow', 'shimmer'] as const

const ANIM_SEL = ENTRANCES.map((c) => '.' + c).join(',')

/**
 * Shows every animation at its end, without motion: for thumbnails, print and the pictures the AI checks.
 * Jumping to the end rather than turning animations off also shows elements that a deck's own CSS hides
 * (opacity:0) until their animation brings them in. Loops stop at their last frame.
 */
export const STATIC_MOTION_CSS = `.slide *,.slide *::before,.slide *::after,.slide::before,.slide::after{
  animation-duration:0s!important;animation-delay:0s!important;animation-iteration-count:1!important;
  animation-direction:normal!important;animation-fill-mode:both!important;animation-play-state:running!important}
.slide :is(${ANIM_SEL}),.slide .stagger>*{opacity:1!important}`

function motionCss(): string {
  // Animations run while the slide is shown, and keep their end state while it leaves.
  const on = '.slide:is(.active,.lv-leave)'
  const notEntrance = `:not(${ANIM_SEL})`
  return `
.slide{isolation:isolate;--lv-ease:cubic-bezier(.22,1,.36,1);--lv-step:.12s;--lv-start:.12s;--sx:-1}
.slide.rtl{--sx:1}
${Array.from({ length: 12 }, (_, i) => `.slide :nth-child(${i + 1}){--i:${i}}`).join('\n')}
.slide :is(.grid-2,.grid-3,.stagger){--lv-start:.42s}
.slide :is(${ANIM_SEL}),.slide .stagger>*{opacity:0}
${on} :is(${ANIM_SEL}),${on} .stagger>*{animation-name:lv-fade-up;animation-duration:var(--dur,.8s);
  animation-timing-function:var(--lv-ease);animation-fill-mode:both;
  animation-delay:calc(var(--lv-base,0s) + var(--d,calc(var(--lv-start) + var(--i,0) * var(--lv-step))))}
${ENTRANCES.map((c) => `${on} .${c}{animation-name:lv-${c}}`).join('\n')}
${on} .pop{animation-timing-function:cubic-bezier(.34,1.56,.64,1)}
.slide.rtl:is(.active,.lv-leave) .reveal{animation-name:lv-reveal-rtl}
@keyframes lv-fade-up{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}
@keyframes lv-fade-down{from{opacity:0;transform:translateY(-40px)}to{opacity:1;transform:none}}
@keyframes lv-fade-in{from{opacity:0}to{opacity:1}}
@keyframes lv-zoom-in{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:none}}
@keyframes lv-zoom-out{from{opacity:0;transform:scale(1.2)}to{opacity:1;transform:none}}
@keyframes lv-slide-start{from{opacity:0;transform:translateX(calc(var(--sx) * 90px))}to{opacity:1;transform:none}}
@keyframes lv-slide-end{from{opacity:0;transform:translateX(calc(var(--sx) * -90px))}to{opacity:1;transform:none}}
@keyframes lv-blur-in{from{opacity:0;filter:blur(18px);transform:scale(1.06)}to{opacity:1;filter:none;transform:none}}
@keyframes lv-pop{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:none}}
@keyframes lv-flip-up{from{opacity:0;transform:perspective(900px) rotateX(75deg) translateY(30px)}to{opacity:1;transform:none}}
@keyframes lv-reveal{from{opacity:1;clip-path:inset(0 100% 0 0)}to{opacity:1;clip-path:inset(0)}}
@keyframes lv-reveal-rtl{from{opacity:1;clip-path:inset(0 0 0 100%)}to{opacity:1;clip-path:inset(0)}}
${on} .float${notEntrance}{animation:lv-float 5s ease-in-out infinite}
${on} .pulse${notEntrance}{animation:lv-pulse 2.4s ease-in-out infinite}
${on} .spin${notEntrance}{animation:lv-spin 20s linear infinite}
${on} .glow${notEntrance}{animation:lv-glow 3s ease-in-out infinite}
${on} .shimmer${notEntrance}{animation:lv-shimmer 6s linear infinite}
@keyframes lv-float{50%{transform:translateY(-16px)}}
@keyframes lv-pulse{50%{transform:scale(1.06)}}
@keyframes lv-spin{to{transform:rotate(360deg)}}
@keyframes lv-glow{50%{box-shadow:0 0 56px -4px color-mix(in srgb,var(--accent) 70%,transparent)}}
@keyframes lv-shimmer{to{background-position:-220% center}}
.slide .gradient-text{background:linear-gradient(100deg,var(--accent),color-mix(in srgb,var(--accent) 35%,var(--fg)),var(--accent));
  background-size:220% auto;-webkit-background-clip:text;background-clip:text;color:transparent}
.slide.aurora::before{content:"";position:absolute;inset:-25%;z-index:-1;pointer-events:none;filter:blur(36px);
  background:radial-gradient(circle at 25% 30%,color-mix(in srgb,var(--accent) 40%,transparent),transparent 36%),
    radial-gradient(circle at 78% 72%,color-mix(in srgb,var(--accent) 28%,transparent),transparent 40%),
    radial-gradient(circle at 62% 18%,color-mix(in srgb,var(--fg) 12%,transparent),transparent 32%)}
.slide.aurora.active::before{animation:lv-aurora 14s ease-in-out infinite alternate}
@keyframes lv-aurora{to{transform:rotate(12deg) scale(1.15) translate(4%,-3%)}}
.slide .meter{height:16px;border-radius:999px;background:var(--surface);border:1px solid var(--border);overflow:hidden;flex:none}
.slide .meter>i{display:block;height:100%;width:var(--v,50%);border-radius:inherit;background:var(--accent)}
${on} .meter>i{animation:lv-grow 1.4s var(--lv-ease) calc(var(--lv-base,0s) + var(--d,.5s)) both}
@keyframes lv-grow{from{width:0}}
.slide .typewriter.lv-typing::after{content:"";display:inline-block;width:3px;height:1em;margin-inline-start:4px;
  vertical-align:-.12em;background:var(--accent);animation:lv-blink .8s steps(1) infinite}
@keyframes lv-blink{50%{opacity:0}}
@media (prefers-reduced-motion:reduce){
  .slide *,.slide::before{animation-duration:1ms!important;animation-delay:0s!important;animation-iteration-count:1!important}
}
`
}

/**
 * Web-page building blocks: nav bar, buttons, chips, glass cards, browser window,
 * KPI tiles, bento grid, steps and tables, so slides can look like a modern site.
 */
const WEB_CSS = `
.slide.page{padding:28px 64px 52px;gap:22px}
.slide.grid-bg{background:
  linear-gradient(color-mix(in srgb,var(--fg) 5%,transparent) 1px,transparent 1px) 0 0/56px 56px,
  linear-gradient(90deg,color-mix(in srgb,var(--fg) 5%,transparent) 1px,transparent 1px) 0 0/56px 56px,var(--bg)}
.slide .nav{display:flex;align-items:center;gap:28px;flex:none;font-size:18px;color:var(--muted);
  padding:10px 12px 10px 22px;border:1px solid var(--border);border-radius:16px;
  background:color-mix(in srgb,var(--bg-solid) 60%,transparent);backdrop-filter:blur(14px)}
.slide.rtl .nav{padding:10px 22px 10px 12px}
.slide .nav .logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:22px;color:var(--fg);margin-inline-end:auto}
.slide .nav .logo::before{content:"";width:26px;height:26px;border-radius:8px;
  background:linear-gradient(135deg,var(--accent),color-mix(in srgb,var(--accent) 35%,var(--fg)))}
.slide .btn{display:inline-flex;align-items:center;gap:10px;width:fit-content;padding:14px 26px;border-radius:12px;
  background:var(--accent);color:var(--accent-fg);font-weight:700;font-size:22px;text-decoration:none;border:1px solid transparent;
  box-shadow:0 10px 28px -10px color-mix(in srgb,var(--accent) 80%,transparent)}
.slide .btn.ghost{background:color-mix(in srgb,var(--fg) 4%,transparent);color:var(--fg);border-color:var(--border);box-shadow:none}
.slide .nav .btn{padding:9px 18px;font-size:17px;border-radius:10px}
.slide .row{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.slide .chip{display:inline-flex;align-items:center;gap:9px;width:fit-content;padding:6px 16px 6px 12px;border-radius:999px;
  font-size:17px;font-weight:600;color:var(--fg);background:color-mix(in srgb,var(--accent) 14%,transparent);
  border:1px solid color-mix(in srgb,var(--accent) 38%,transparent)}
.slide .chip::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--accent);
  box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 25%,transparent)}
.slide .glass{display:flex;flex-direction:column;gap:10px;min-width:0;min-height:0;padding:24px;border-radius:22px;
  background:linear-gradient(160deg,color-mix(in srgb,var(--fg) 8%,transparent),color-mix(in srgb,var(--fg) 2%,transparent));
  border:1px solid color-mix(in srgb,var(--fg) 12%,transparent);backdrop-filter:blur(16px);
  box-shadow:0 24px 60px -24px rgba(0,0,0,.45),inset 0 1px 0 color-mix(in srgb,var(--fg) 10%,transparent)}
.slide .glass h3{font-size:26px}
.slide .glass p{font-size:19px;color:var(--muted)}
.slide .browser{display:flex;flex-direction:column;min-height:0;min-width:0;border-radius:18px;overflow:hidden;
  background:var(--bg-solid);border:1px solid var(--border);box-shadow:0 34px 90px -28px rgba(0,0,0,.6)}
.slide .browser::before{content:"";flex:none;height:40px;border-bottom:1px solid var(--border);direction:ltr;
  background:radial-gradient(circle at 22px 20px,#ff5f57 6px,transparent 7px),radial-gradient(circle at 44px 20px,#febc2e 6px,transparent 7px),
    radial-gradient(circle at 66px 20px,#28c840 6px,transparent 7px),color-mix(in srgb,var(--fg) 4%,transparent)}
.slide .browser>.body{flex:1;min-height:0;padding:22px;display:flex;flex-direction:column;gap:14px}
.slide .split{display:grid;grid-template-columns:1.05fr 1fr;gap:48px;align-items:center;flex:1;min-height:0}
.slide .bento{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:1fr;gap:18px;flex:1;min-height:0}
.slide .span-2{grid-column:span 2}
.slide .span-3{grid-column:span 3}
.slide .span-4{grid-column:span 4}
.slide .row-2{grid-row:span 2}
.slide .kpi{display:flex;flex-direction:column;gap:6px;min-width:0}
.slide .kpi .label{font-size:18px;font-weight:600;color:var(--muted)}
.slide .kpi .value{font-family:var(--heading-font);font-size:46px;font-weight:800;line-height:1.05;color:var(--fg);letter-spacing:-.02em}
.slide .delta{direction:ltr;unicode-bidi:isolate;display:inline-flex;align-items:center;gap:6px;width:fit-content;padding:3px 10px;border-radius:999px;font-size:16px;font-weight:700}
.slide .delta.up{color:var(--good);background:color-mix(in srgb,var(--good) 15%,transparent)}
.slide .delta.down{color:var(--bad);background:color-mix(in srgb,var(--bad) 15%,transparent)}
.slide .delta.good{color:var(--good);background:color-mix(in srgb,var(--good) 15%,transparent)}
.slide .delta.bad{color:var(--bad);background:color-mix(in srgb,var(--bad) 15%,transparent)}
.slide .delta.up::before{content:"\\25B2";font-size:11px}
.slide .delta.down::before{content:"\\25BC";font-size:11px}
.slide .icon{flex:none;display:grid;place-items:center;width:52px;height:52px;border-radius:14px;font-size:26px;
  background:color-mix(in srgb,var(--accent) 16%,transparent);border:1px solid color-mix(in srgb,var(--accent) 32%,transparent)}
.slide .steps{position:relative;display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:24px}
.slide .steps::before{content:"";position:absolute;top:12px;inset-inline:0;height:2px;
  background:linear-gradient(to right,var(--accent),var(--border))}
.slide.rtl .steps::before{background:linear-gradient(to left,var(--accent),var(--border))}
.slide .steps>*{position:relative;padding-top:40px;display:flex;flex-direction:column;gap:6px}
.slide .steps>*::before{content:"";position:absolute;top:5px;inset-inline-start:0;width:16px;height:16px;border-radius:50%;
  background:var(--accent);box-shadow:0 0 0 6px color-mix(in srgb,var(--accent) 22%,transparent)}
.slide .steps p{font-size:19px;color:var(--muted)}
.slide table.data{width:100%;border-collapse:collapse;font-size:20px}
.slide table.data th{text-align:start;padding:10px 14px;font-size:16px;font-weight:600;color:var(--muted);border-bottom:1px solid var(--border)}
.slide table.data td{padding:12px 14px;border-bottom:1px solid var(--border);unicode-bidi:plaintext;text-align:match-parent}
`

/**
 * Charts drawn by the chart script from data-chart JSON. Series colors are
 * --c1..--c8 from the theme; text stays in the text colors.
 */
const CHART_CSS = `
.slide .chart{position:relative;display:flex;flex-direction:column;gap:14px;flex:1;min-height:0;min-width:0;font-size:16px;color:var(--muted)}
.slide .chart .lv-plot{position:relative;flex:1;min-height:0;min-width:0}
.slide .chart .lv-plot>svg{position:absolute;inset:0;overflow:visible;direction:ltr}
.slide .chart.donut{flex-direction:row;align-items:center;gap:36px}
.slide .chart.donut .lv-plot{flex:none;height:100%;aspect-ratio:1}
.slide .chart text{fill:var(--muted);font-size:15px;font-family:var(--font)}
.slide .chart .lv-legend{display:flex;flex-wrap:wrap;gap:8px 22px;font-size:17px;color:var(--fg)}
.slide .chart .lv-key{display:flex;align-items:center;gap:8px}
.slide .chart .lv-key i{flex:none;width:12px;height:12px;border-radius:3px;background:var(--k)}
.slide .chart.donut .lv-legend{flex:1;max-width:520px;flex-direction:column;gap:14px;font-size:20px}
.slide .chart.donut .lv-key b{margin-inline-start:auto;font-weight:700}
.slide .chart.donut .lv-key small{min-width:3.2em;text-align:end;color:var(--muted);font-size:16px}
.slide .chart .lv-grid line{stroke:var(--border);stroke-width:1}
.slide .chart .lv-grid line.lv-base{stroke:color-mix(in srgb,var(--fg) 35%,transparent)}
.slide .chart .lv-endlabel{fill:var(--fg);font-weight:700;font-size:16px}
.slide .chart .lv-total{fill:var(--fg);font-family:var(--heading-font);font-weight:800}
.slide .chart :is(.lv-bar,.lv-seg,.lv-line,.lv-fill){transition:opacity .2s}
.slide .chart .lv-dim{opacity:.3}
.slide .chart .lv-bar{transform-box:fill-box;transform-origin:50% 100%}
.slide .chart .lv-center{transform-box:fill-box;transform-origin:center}
.slide .chart .lv-hair{stroke:color-mix(in srgb,var(--fg) 40%,transparent);stroke-width:1;stroke-dasharray:4 4}
.slide .chart .lv-dot{stroke:var(--bg-solid);stroke-width:2}
.slide .chart .lv-tip{position:absolute;z-index:5;pointer-events:none;opacity:0;transform:translateY(6px);
  transition:opacity .15s,transform .15s;white-space:nowrap;padding:10px 14px;border-radius:12px;font-size:16px;color:var(--fg);
  background:color-mix(in srgb,var(--bg-solid) 90%,var(--fg));border:1px solid var(--border);box-shadow:0 14px 34px rgba(0,0,0,.35)}
.slide .chart .lv-tip.on{opacity:1;transform:none}
.slide .chart .lv-tip b{display:block;margin-bottom:4px;font-size:15px;color:var(--muted);font-weight:600}
.slide .chart .lv-tip div{display:flex;align-items:center;gap:8px}
.slide .chart .lv-tip i{width:10px;height:10px;border-radius:3px;background:var(--k)}
.slide .chart .lv-tip span{margin-inline-start:auto;padding-inline-start:16px;font-weight:700}
.slide .lv-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.slide .chart.lv-play :is(.lv-grid,.lv-axis){animation:lv-fade-in .6s ease both;animation-delay:var(--lv-base,0s)}
.slide .chart.lv-play .lv-bar{animation:lv-bar .9s var(--lv-ease) both;animation-delay:calc(var(--lv-base,0s) + .25s + var(--k-i,0) * 70ms)}
.slide .chart.lv-play .lv-line{stroke-dasharray:1;animation:lv-dash 1.6s cubic-bezier(.65,0,.35,1) both;
  animation-delay:calc(var(--lv-base,0s) + .25s + var(--k-i,0) * 160ms)}
.slide .chart.lv-play :is(.lv-fill,.lv-end){animation:lv-fade-in .8s ease both;animation-delay:calc(var(--lv-base,0s) + 1.3s + var(--k-i,0) * 160ms)}
.slide .chart.lv-play .lv-seg{animation:lv-sweep 1s var(--lv-ease) both;animation-delay:calc(var(--lv-base,0s) + .25s + var(--k-i,0) * 110ms)}
.slide .chart.lv-play .lv-center{animation:lv-zoom-in .8s var(--lv-ease) both;animation-delay:calc(var(--lv-base,0s) + .6s)}
@keyframes lv-bar{from{transform:scaleY(0)}}
@keyframes lv-dash{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes lv-sweep{from{stroke-dasharray:0 var(--C)}}
`

/** Designer components (elements.ts): absolutely placed boxes on top of the slide. */
const ELEMENT_CSS = `
.slide .el{position:absolute;margin:0;min-width:0;min-height:0}
.slide .el-text{overflow-wrap:break-word;line-height:1.3}
.slide .el-image img{display:block;width:100%;height:100%}
.slide .el-placeholder{width:100%;height:100%;display:grid;place-items:center;border:2px dashed var(--border);border-radius:16px;
  color:var(--muted);font-size:22px;background:color-mix(in srgb,var(--fg) 3%,transparent)}
.slide .el-button{display:flex}
.slide .el-button .btn{width:100%;height:100%;justify-content:center;padding:0 18px}
.slide .el-icon{display:grid;place-items:center;line-height:1}
.slide .el-chart{padding:6px;display:flex;flex-direction:column;gap:8px}
.slide .el-chart.el-card{padding:20px 22px 16px}
.slide .el-cv{position:relative;flex:1;min-height:0}
.slide .el-title{flex:none;font-size:19px;font-weight:700;color:var(--fg)}
.slide .el-table.el-card{padding:18px 20px;gap:8px}
.slide .el-map{border-radius:18px;overflow:hidden;border:1px solid var(--border);background:var(--surface);z-index:0}
.slide .el-map .leaflet-container,.slide .el-map.leaflet-container{font-family:var(--font);background:var(--surface)}
.slide .el-table{overflow:hidden}
.slide .el.kpi{justify-content:center;padding:22px}
.slide .lv-pin i{display:block;width:24px;height:24px;border-radius:50%;background:var(--accent);border:4px solid var(--bg-solid);
  box-shadow:0 0 0 6px color-mix(in srgb,var(--accent) 35%,transparent)}
.slide .lv-maptip{background:var(--bg-solid);color:var(--fg);border:1px solid var(--border);border-radius:8px;padding:4px 10px;
  font:600 15px var(--font);box-shadow:0 6px 18px rgba(0,0,0,.3)}
.slide .lv-maptip::before{display:none}
`

/**
 * Base stylesheet for every deck. Slides are a fixed 1280x720 canvas; the
 * runtime scales them to fit. Themes only change the CSS variables.
 * The utility classes below are also described to the AI in the system prompt.
 */
export const BASE_CSS = `
*,*::before,*::after{box-sizing:border-box}
.slide{position:relative;width:1280px;height:720px;overflow:hidden;
  padding:72px 88px;display:flex;flex-direction:column;gap:24px;
  background:var(--bg);color:var(--fg);font-family:var(--font);font-size:28px;line-height:1.4}
.slide h1{font-family:var(--heading-font);font-size:72px;line-height:1.05;margin:0;font-weight:800;letter-spacing:-.02em}
.slide h2{font-family:var(--heading-font);font-size:52px;line-height:1.1;margin:0;font-weight:750;letter-spacing:-.01em}
.slide h3{font-family:var(--heading-font);font-size:32px;margin:0;font-weight:700}
.slide p{margin:0}
.slide ul,.slide ol{margin:0;padding-inline-start:1.2em;display:flex;flex-direction:column;gap:14px}
.slide li::marker{color:var(--accent)}
.slide a{color:var(--accent)}
.slide code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.85em;
  background:var(--surface);padding:.1em .35em;border-radius:6px}
.slide pre{margin:0;background:var(--surface);padding:24px;border-radius:14px;font-size:22px;overflow:hidden}
.slide pre code{background:none;padding:0}
.slide img,.slide svg{max-width:100%}
.slide.center,.slide .center{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.slide.rtl{direction:rtl}
.slide.rtl h1,.slide.rtl h2,.slide.rtl h3{line-height:1.35;letter-spacing:0}
.slide .muted{color:var(--muted)}
.slide .accent{color:var(--accent)}
.slide .kicker{font-size:22px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.slide .lead{font-size:32px;color:var(--muted);max-width:900px}
.slide .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:32px;flex:1;min-height:0}
.slide .grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;flex:1;min-height:0}
.slide .card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:28px;
  display:flex;flex-direction:column;gap:12px}
.slide .stat{font-family:var(--heading-font);font-size:84px;font-weight:800;color:var(--accent);line-height:1}
.slide .badge{display:inline-block;padding:6px 16px;border-radius:999px;background:var(--accent);color:var(--accent-fg);
  font-size:20px;font-weight:700;width:fit-content}
.slide .spacer{flex:1}
.slide .footer{position:absolute;inset-inline:88px;bottom:36px;font-size:18px;color:var(--muted);display:flex;justify-content:space-between}
${WEB_CSS}
${CHART_CSS}
${ELEMENT_CSS}
${FX_CSS}
${FX3D_CSS}
${motionCss()}`

/** Transitions between slides when presenting. */
export const TRANSITIONS: { id: string; name: string }[] = [
  { id: 'slide', name: 'Slide' },
  { id: 'zoom', name: 'Zoom' },
  { id: 'rotate', name: '3D turn' },
  { id: 'rise', name: 'Rise' },
  { id: 'fade', name: 'Fade' },
  { id: 'none', name: 'None' }
]
export const DEFAULT_TRANSITION = 'slide'

// Chart series colors (a colorblind-checked order), stepped for dark and for light backgrounds.
const DARK_SERIES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
const LIGHT_SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948']

/**
 * CSS variables for a theme. `solid` is a plain color close to the background,
 * for places that need one (chart gaps, tooltips, browser windows).
 */
function vars(mode: 'dark' | 'light', v: Record<string, string>): string {
  const series = mode === 'dark' ? DARK_SERIES : LIGHT_SERIES
  const all: Record<string, string> = {
    good: mode === 'dark' ? '#3ccf7e' : '#16803c',
    bad: mode === 'dark' ? '#f26d6a' : '#c42b2b',
    ...v
  }
  series.forEach((c, i) => (all[`c${i + 1}`] = c))
  return ':root{' + Object.entries(all).map(([k, val]) => `--${k}:${val}`).join(';') + '}'
}

const SANS = `"Inter","Segoe UI","Noto Sans Arabic","Noto Sans",system-ui,-apple-system,sans-serif`
const SERIF = `"Georgia","Noto Naskh Arabic","Times New Roman",serif`

export const THEMES: Theme[] = [
  {
    id: 'glass',
    name: 'Glass',
    swatch: ['#0a0b10', '#8b7bff'],
    css: vars('dark', {
      bg: 'radial-gradient(900px 520px at 88% -8%,rgba(124,92,255,.32),transparent 60%),radial-gradient(800px 480px at -8% 108%,rgba(18,160,200,.24),transparent 60%),#0a0b10',
      'bg-solid': '#0d0f16', fg: '#f4f5fb', muted: '#9ca3b8', accent: '#8b7bff', 'accent-fg': '#0a0b10',
      surface: 'rgba(255,255,255,.05)', border: 'rgba(255,255,255,.1)', font: SANS, 'heading-font': SANS
    })
  },
  {
    id: 'clean',
    name: 'Clean',
    swatch: ['#f6f7fb', '#4f46e5'],
    css: vars('light', {
      bg: 'radial-gradient(900px 520px at 90% -10%,rgba(79,70,229,.12),transparent 60%),#f6f7fb',
      'bg-solid': '#ffffff', fg: '#0f172a', muted: '#5b6478', accent: '#4f46e5', 'accent-fg': '#ffffff',
      surface: '#ffffff', border: '#e3e6ee', font: SANS, 'heading-font': SANS
    })
  },
  {
    id: 'midnight',
    name: 'Midnight',
    swatch: ['#0f1117', '#7c9cff'],
    css: vars('dark', {
      bg: '#0f1117', 'bg-solid': '#0f1117', fg: '#f3f4f8', muted: '#9aa1b5', accent: '#7c9cff', 'accent-fg': '#0f1117',
      surface: '#1a1d27', border: '#2a2f3d', font: SANS, 'heading-font': SANS
    })
  },
  {
    id: 'paper',
    name: 'Paper',
    swatch: ['#faf8f3', '#c2410c'],
    css: vars('light', {
      bg: '#faf8f3', 'bg-solid': '#faf8f3', fg: '#1c1917', muted: '#6b645c', accent: '#c2410c', 'accent-fg': '#fff',
      surface: '#f1ede4', border: '#e3ddd0', font: SANS, 'heading-font': SERIF
    })
  },
  {
    id: 'ocean',
    name: 'Ocean',
    swatch: ['#06283d', '#47b5ff'],
    css: vars('dark', {
      bg: 'linear-gradient(135deg,#06283d,#0b3d5c)', 'bg-solid': '#08304a', fg: '#eaf6ff', muted: '#9cc3dc', accent: '#47b5ff',
      'accent-fg': '#06283d', surface: 'rgba(255,255,255,.07)', border: 'rgba(255,255,255,.14)',
      font: SANS, 'heading-font': SANS
    })
  },
  {
    id: 'sunset',
    name: 'Sunset',
    swatch: ['#2b1331', '#ff8a5b'],
    css: vars('dark', {
      bg: 'linear-gradient(140deg,#2b1331,#5b1f3a 60%,#8a3b2e)', 'bg-solid': '#3a1735', fg: '#fff4ec', muted: '#e7c1b3',
      accent: '#ff8a5b', 'accent-fg': '#2b1331', surface: 'rgba(255,255,255,.08)',
      border: 'rgba(255,255,255,.16)', font: SANS, 'heading-font': SANS
    })
  },
  {
    id: 'mono',
    name: 'Mono',
    swatch: ['#ffffff', '#111111'],
    css: vars('light', {
      bg: '#ffffff', 'bg-solid': '#ffffff', fg: '#111111', muted: '#666666', accent: '#111111', 'accent-fg': '#ffffff',
      surface: '#f4f4f4', border: '#e2e2e2', font: SANS, 'heading-font': SANS
    })
  }
]

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}
