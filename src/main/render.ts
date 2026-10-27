import { BrowserWindow } from 'electron'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import type { Deck, Slide } from '@shared/types'
import { buildSlideDocument, SLIDE_HEIGHT, SLIDE_WIDTH } from '@shared/deckHtml'
import { slideSize } from '@shared/video'
import { setViewport } from './viewport'

export interface RenderedSlide {
  /** JPEG, base64. */
  jpeg: string
  /** Layout problems found by measuring the rendered slide. */
  issues: string[]
}

/**
 * Measures the rendered slide and lists layout problems a person would notice:
 * content running off the slide, clipped text, overlapping text, tiny text, an empty slide.
 * Runs inside the hidden window.
 */
const CHECK_JS = String.raw`(function(){
  var s=document.querySelector('.slide');if(!s)return['The slide did not render.'];
  var W=s.offsetWidth||${SLIDE_WIDTH},H=s.offsetHeight||${SLIDE_HEIGHT},out=[];
  // Widgets that draw their own content, or scroll on purpose, are checked as a whole.
  var WIDGET='.fx-marquee,.cx-mq,.fx-circle,.fx3-orb,.fx3-cover,.fx3-ring,.fx3-globe,.leaflet-container,.lv-sr,[class*="fxp-"],svg';
  var BOX='.glass,.card,.browser,.kpi,.btn,.chip,.badge';
  function label(el){
    var t=(el.innerText||el.textContent||'').replace(/\s+/g,' ').trim();
    var c=typeof el.className==='string'?el.className.trim().split(/\s+/).slice(0,3).join(' '):'';
    return '<'+el.tagName.toLowerCase()+(c?' class="'+c+'"':'')+'>'+(t?' "'+(t.length>40?t.slice(0,40)+'…':t)+'"':'');
  }
  function ownText(el){for(var n=el.firstChild;n;n=n.nextSibling)if(n.nodeType===3&&n.textContent.trim())return true;return false}
  function outside(r,b){return r.left<b.left-4||r.right>b.right+4||r.top<b.top-4||r.bottom>b.bottom+4}
  var texts=[],off=[],clipped=[],spill=[],tiny=[];
  var all=s.querySelectorAll('*');
  for(var i=0;i<all.length;i++){
    var el=all[i];
    if(el.parentElement&&el.parentElement.closest(WIDGET))continue;
    var r=el.getBoundingClientRect();if(r.width<2||r.height<2)continue;
    var cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0)continue;
    var hasText=ownText(el);
    if(!hasText&&!el.matches(WIDGET+',img,canvas,'+BOX))continue;
    // Off the slide: more than a quarter of it, so a decoration that peeks over the edge is fine.
    var vis=Math.max(0,Math.min(r.right,W)-Math.max(r.left,0))*Math.max(0,Math.min(r.bottom,H)-Math.max(r.top,0));
    if(vis<r.width*r.height*.75&&(cs.position!=='absolute'||hasText))
      off.push(label(el)+' reaches x '+Math.round(r.left)+'..'+Math.round(r.right)+', y '+Math.round(r.top)+'..'+Math.round(r.bottom));
    if(!hasText)continue;
    texts.push({el:el,r:r});
    var fs=parseFloat(cs.fontSize);if(fs<14)tiny.push(label(el)+' '+Math.round(fs)+'px');
    // Text cut off by a box that hides overflow, or spilling out of its card.
    for(var p=el.parentElement;p&&p!==s;p=p.parentElement){
      var ps=getComputedStyle(p);
      if(/hidden|clip/.test(ps.overflowX+ps.overflowY)&&outside(r,p.getBoundingClientRect())){clipped.push(label(el)+' inside '+label(p));break}
      if(p.matches(BOX)){if(outside(r,p.getBoundingClientRect()))spill.push(label(el)+' spills out of '+label(p));break}
    }
  }
  var lap=[];
  for(var a=0;a<texts.length&&lap.length<4;a++)for(var b=a+1;b<texts.length&&lap.length<4;b++){
    var A=texts[a],B=texts[b];if(A.el.contains(B.el)||B.el.contains(A.el))continue;
    var w=Math.min(A.r.right,B.r.right)-Math.max(A.r.left,B.r.left),h=Math.min(A.r.bottom,B.r.bottom)-Math.max(A.r.top,B.r.top);
    if(w<=4||h<=4)continue;
    var small=Math.min(A.r.width*A.r.height,B.r.width*B.r.height);
    if(w*h>small*.25)lap.push(label(A.el)+' and '+label(B.el));
  }
  // Only content in the normal flow counts: background layers may reach past the edges on purpose.
  var bottom=0;
  for(var k=0;k<s.children.length;k++){
    var c=s.children[k],p=getComputedStyle(c).position;
    if(p!=='absolute'&&p!=='fixed')bottom=Math.max(bottom,c.getBoundingClientRect().bottom);
  }
  var inner=Math.round(bottom-H);
  if(inner>6)out.push('The content is '+inner+'px taller than the slide, so the bottom is cut off. Shorten it, use less space, or split the slide.');
  if(off.length)out.push('Runs off the slide: '+off.slice(0,4).join('; ')+'.');
  if(clipped.length)out.push('Text cut off: '+clipped.slice(0,3).join('; ')+'.');
  if(spill.length)out.push('Text outside its card: '+spill.slice(0,3).join('; ')+'.');
  if(lap.length)out.push('Text overlaps: '+lap.join('; ')+'.');
  if(tiny.length)out.push('Text too small to read from the back of a room: '+tiny.slice(0,3).join('; ')+'.');
  if(!texts.length&&!s.querySelector('img,canvas,svg,.chart,[class*="fx3-"],[class*="fxp-"]'))out.push('The slide looks empty.');
  return out;
})()`

/** Wait for fonts, charts and WebGL to draw their first frame. */
const SETTLE_MS = 700

/**
 * Renders single slides in a hidden window and takes pictures of them, so the AI
 * can see what it designed. One window is reused; renders run one at a time.
 */
export class SlideRenderer {
  private win: BrowserWindow | null = null
  private queue: Promise<unknown> = Promise.resolve()
  private errors: string[] = []
  private file: string

  constructor(tmpDir: string) {
    this.file = join(tmpDir, `lv-render-${process.pid}-${Math.random().toString(36).slice(2)}.html`)
  }

  private window(): BrowserWindow {
    if (this.win && !this.win.isDestroyed()) return this.win
    const win = new BrowserWindow({
      show: false,
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      useContentSize: true,
      paintWhenInitiallyHidden: true,
      webPreferences: { sandbox: true, contextIsolation: true, backgroundThrottling: false }
    })
    // Slides are untrusted HTML: never let them navigate or open windows.
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    win.webContents.on('will-navigate', (e) => e.preventDefault())
    win.webContents.on('console-message', (...args: unknown[]) => {
      // Newer Electron passes one details object; older versions pass (event, level, message).
      const first = args[0] as { level?: unknown; message?: unknown }
      const level = typeof first?.level === 'string' ? first.level : args[1] === 3 ? 'error' : ''
      const message = typeof first?.message === 'string' ? first.message : String(args[2] ?? '')
      if (level === 'error' && this.errors.length < 3) this.errors.push(message.slice(0, 200))
    })
    this.win = win
    return win
  }

  /** Renders one slide with the deck's theme and CSS; `width` is the picture's longer side in pixels. */
  render(deck: Deck, slide: Omit<Slide, 'id'>, width = 768): Promise<RenderedSlide> {
    const job = this.queue.then(() => this.renderNow(deck, slide, width))
    this.queue = job.catch(() => undefined)
    return job
  }

  private async renderNow(deck: Deck, slide: Omit<Slide, 'id'>, width: number): Promise<RenderedSlide> {
    const one: Deck = { ...deck, slides: [{ id: 'preview', ...slide }] }
    await fs.writeFile(this.file, buildSlideDocument(one, 0, { animate: false }), 'utf8')
    const win = this.window()
    this.errors = []
    await win.loadFile(this.file)
    // Vertical and square video scenes may not fit in a window on this screen.
    const size = slideSize(deck)
    if (size.width !== SLIDE_WIDTH || size.height !== SLIDE_HEIGHT || win.webContents.debugger.isAttached()) {
      await setViewport(win, size.width, size.height)
    }
    await new Promise((r) => setTimeout(r, SETTLE_MS))
    const issues = ((await win.webContents.executeJavaScript(CHECK_JS, true)) as string[]) ?? []
    if (this.errors.length) issues.push(`Script error: ${this.errors.join(' | ')}`)
    const image = await win.webContents.capturePage({ x: 0, y: 0, width: size.width, height: size.height })
    const fit = size.width >= size.height ? { width } : { height: width }
    const jpeg = image.resize({ ...fit, quality: 'best' }).toJPEG(80).toString('base64')
    return { jpeg, issues }
  }

  async close(): Promise<void> {
    await this.queue
    if (this.win && !this.win.isDestroyed()) this.win.destroy()
    this.win = null
    await fs.rm(this.file, { force: true })
  }
}
