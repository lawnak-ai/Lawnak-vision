import type { Deck, Slide } from './types'
import { BASE_CSS, getTheme } from './themes'

export const SLIDE_WIDTH = 1280
export const SLIDE_HEIGHT = 720

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/** Only allow simple class names so a class attribute can't break out of the tag. */
function safeClass(className?: string): string {
  return (className ?? '').replace(/[^\w\- ]/g, '').trim()
}

function sectionHtml(slide: Slide, index: number, active: boolean): string {
  const cls = ['slide', safeClass(slide.className), active ? 'active' : ''].filter(Boolean).join(' ')
  return `<section class="${cls}" data-index="${index}" dir="auto">${slide.html}</section>`
}

function deckCss(deck: Deck): string {
  // A stray "</style>" in user CSS would end the style block early.
  const custom = deck.css.replace(/<\/style/gi, '<\\/style')
  return BASE_CSS + '\n' + getTheme(deck.themeId).css + '\n' + custom
}

/**
 * A single slide as a full document, for the editor preview and thumbnails.
 * The parent scales the 1280x720 iframe to fit.
 */
export function buildSlideDocument(deck: Deck, index: number, opts: { animate?: boolean } = {}): string {
  const slide = deck.slides[index]
  const staticCss = opts.animate
    ? ''
    : '.slide .fade-up{opacity:1!important;transform:none!important;animation:none!important}'
  return `<!doctype html><html><head><meta charset="utf-8">
<style>${deckCss(deck)}
html,body{margin:0;width:${SLIDE_WIDTH}px;height:${SLIDE_HEIGHT}px;overflow:hidden;background:#000}
${staticCss}</style></head><body>${slide ? sectionHtml(slide, index, true) : ''}</body></html>`
}

const RUNTIME_CSS = `
html,body{margin:0;height:100%;background:#000;overflow:hidden}
.lv-stage{position:fixed;inset:0}
.lv-stage>.slide{position:absolute;left:50%;top:50%;margin:0;
  transform:translate(-50%,-50%) scale(var(--lv-scale,1));
  opacity:0;visibility:hidden;transition:opacity .35s ease,visibility .35s}
.lv-stage>.slide.active{opacity:1;visibility:visible}
.lv-progress{position:fixed;left:0;bottom:0;height:4px;background:rgba(255,255,255,.15);width:100%;z-index:10}
.lv-progress i{display:block;height:100%;width:0;background:#7c9cff;transition:width .3s}
.lv-counter{position:fixed;right:16px;bottom:12px;font:13px system-ui,sans-serif;color:rgba(255,255,255,.6);z-index:10;
  background:rgba(0,0,0,.35);padding:3px 9px;border-radius:999px}
.lv-notes{position:fixed;left:16px;right:16px;bottom:24px;max-height:30vh;overflow:auto;z-index:11;
  background:rgba(10,10,14,.92);color:#eee;font:18px/1.5 system-ui,sans-serif;padding:16px 20px;border-radius:12px;white-space:pre-wrap}
.lv-help{position:fixed;top:12px;right:16px;font:12px system-ui,sans-serif;color:rgba(255,255,255,.45);z-index:10}
body.lv-idle{cursor:none}
body.lv-idle .lv-help{opacity:0}
@media print{
  @page{size:${SLIDE_WIDTH}px ${SLIDE_HEIGHT}px;margin:0}
  html,body{height:auto;overflow:visible;background:none}
  .lv-stage{position:static}
  .lv-stage>.slide{position:relative;left:auto;top:auto;transform:none;opacity:1;visibility:visible;
    break-after:page;page-break-after:always;transition:none}
  .slide .fade-up{opacity:1!important;transform:none!important;animation:none!important}
  .lv-progress,.lv-counter,.lv-notes,.lv-help{display:none!important}
}`

// Plain browser JS, kept dependency-free so the exported file works anywhere.
const RUNTIME_JS = `
(function(){
  var W=${SLIDE_WIDTH},H=${SLIDE_HEIGHT};
  var slides=[].slice.call(document.querySelectorAll('.lv-stage>.slide'));
  var notes=JSON.parse(document.getElementById('lv-notes-data').textContent||'[]');
  var bar=document.querySelector('.lv-progress i'),counter=document.querySelector('.lv-counter');
  var notesBox=document.querySelector('.lv-notes');
  var cur=0;
  function fit(){var s=Math.min(innerWidth/W,innerHeight/H);document.documentElement.style.setProperty('--lv-scale',s)}
  function go(i,fromHash){
    if(!slides.length)return;
    i=Math.max(0,Math.min(slides.length-1,i));
    slides.forEach(function(el,k){
      var on=k===i;
      if(on&&!el.classList.contains('active')){el.classList.add('active');el.dispatchEvent(new CustomEvent('slideenter',{bubbles:true}))}
      else if(!on&&el.classList.contains('active')){el.classList.remove('active');el.dispatchEvent(new CustomEvent('slideleave',{bubbles:true}))}
    });
    cur=i;
    bar.style.width=((i+1)/slides.length*100)+'%';
    counter.textContent=(i+1)+' / '+slides.length;
    notesBox.textContent=notes[i]||'(no notes for this slide)';
    if(!fromHash)history.replaceState(null,'','#'+(i+1));
  }
  function fromHash(){var n=parseInt(location.hash.slice(1),10);return isNaN(n)?0:n-1}
  addEventListener('resize',fit);
  addEventListener('hashchange',function(){go(fromHash(),true)});
  addEventListener('keydown',function(e){
    if(e.target&&(e.target.isContentEditable||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)))return;
    var k=e.key;
    if(k==='ArrowRight'||k==='ArrowDown'||k==='PageDown'||k===' '||k==='Enter'){e.preventDefault();go(cur+1)}
    else if(k==='ArrowLeft'||k==='ArrowUp'||k==='PageUp'||k==='Backspace'){e.preventDefault();go(cur-1)}
    else if(k==='Home'){go(0)}
    else if(k==='End'){go(slides.length-1)}
    else if(k==='f'||k==='F'){if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen().catch(function(){})}
    else if(k==='n'||k==='N'){notesBox.hidden=!notesBox.hidden}
    else if(k==='Escape'&&!document.fullscreenElement){window.close()}
  });
  document.addEventListener('click',function(e){
    if(e.target.closest('a,button,input,textarea,select,label,[data-no-advance]'))return;
    if(e.clientX<innerWidth/4)go(cur-1);else go(cur+1);
  });
  var tx=null;
  addEventListener('touchstart',function(e){tx=e.touches[0].clientX},{passive:true});
  addEventListener('touchend',function(e){if(tx===null)return;var dx=e.changedTouches[0].clientX-tx;if(Math.abs(dx)>50)go(cur+(dx<0?1:-1));tx=null});
  var idle;addEventListener('mousemove',function(){document.body.classList.remove('lv-idle');clearTimeout(idle);idle=setTimeout(function(){document.body.classList.add('lv-idle')},2500)});
  fit();go(fromHash(),true);
})();`

/** A self-contained HTML presentation: open it in any browser, or print it to PDF. */
export function buildDeckDocument(deck: Deck, opts: { startIndex?: number } = {}): string {
  const start = opts.startIndex ?? 0
  const sections = deck.slides.map((s, i) => sectionHtml(s, i, i === start)).join('\n')
  // JSON inside <script type="application/json"> must not contain "</script".
  const notesJson = JSON.stringify(deck.slides.map((s) => s.notes ?? '')).replace(/</g, '\\u003c')
  return `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="generator" content="Lawnak Vision">
<title>${escapeHtml(deck.title)}</title>
<style>${deckCss(deck)}
${RUNTIME_CSS}</style>
</head><body>
<div class="lv-stage">
${sections}
</div>
<div class="lv-progress"><i></i></div>
<div class="lv-counter"></div>
<div class="lv-help">← → navigate · F fullscreen · N notes</div>
<aside class="lv-notes" hidden></aside>
<script type="application/json" id="lv-notes-data">${notesJson}</script>
<script>${RUNTIME_JS}</script>
</body></html>`
}
