// Videos: a deck whose slides are timed scenes that play by themselves, in one of three sizes.
import type { Deck, Slide, VideoFormat } from './types'

export interface VideoFormatInfo {
  id: VideoFormat
  name: string
  /** Where this size is used, shown under the name. */
  hint: string
  /** The scene canvas in CSS pixels (the slide size). */
  width: number
  height: number
  /** The exported video in pixels: the canvas at 1.5x. */
  outWidth: number
  outHeight: number
}

export const VIDEO_FORMATS: VideoFormatInfo[] = [
  { id: '16:9', name: 'Landscape 16:9', hint: 'YouTube, screens', width: 1280, height: 720, outWidth: 1920, outHeight: 1080 },
  { id: '9:16', name: 'Vertical 9:16', hint: 'Reels, TikTok, Shorts, Stories', width: 720, height: 1280, outWidth: 1080, outHeight: 1920 },
  { id: '1:1', name: 'Square 1:1', hint: 'Instagram and X posts', width: 720, height: 720, outWidth: 1080, outHeight: 1080 }
]

export const DEFAULT_VIDEO_FORMAT: VideoFormat = '16:9'

/** Frames per second of exported videos. */
export const VIDEO_FPS = 30

/** How long a scene stays on screen when it has no duration of its own, in seconds. */
export const DEFAULT_SCENE_SECONDS = 3.5
export const MIN_SCENE_SECONDS = 1
export const MAX_SCENE_SECONDS = 20

/** Seconds the music fades out at the end of the video. */
export const AUDIO_FADE_SECONDS = 1.5

export function isVideo(deck: Pick<Deck, 'kind'>): boolean {
  return deck.kind === 'video'
}

export function videoFormat(deck: Pick<Deck, 'kind' | 'format'>): VideoFormatInfo {
  const id = isVideo(deck) ? deck.format : undefined
  return VIDEO_FORMATS.find((f) => f.id === id) ?? VIDEO_FORMATS[0]
}

/** The slide canvas size in CSS pixels: 1280x720 for presentations, the format's size for videos. */
export function slideSize(deck: Pick<Deck, 'kind' | 'format'>): { width: number; height: number } {
  const f = videoFormat(deck)
  return { width: f.width, height: f.height }
}

export function clampSceneSeconds(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_SCENE_SECONDS
  return Math.round(Math.min(MAX_SCENE_SECONDS, Math.max(MIN_SCENE_SECONDS, v)) * 10) / 10
}

export function sceneSeconds(slide: Pick<Slide, 'duration'>): number {
  return slide.duration === undefined ? DEFAULT_SCENE_SECONDS : clampSceneSeconds(slide.duration)
}

/** The whole video's length in seconds. */
export function videoSeconds(deck: Pick<Deck, 'slides'>): number {
  return deck.slides.reduce((t, s) => t + sceneSeconds(s), 0)
}

/** "0:42" */
export function formatSeconds(total: number): string {
  const s = Math.round(total)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Height in CSS pixels of the strip under the picture while recording. Its color is the frame
 * number, so the recorder can tell a fresh picture from one the browser has not redrawn yet.
 * It is cut off the video.
 */
export const FRAME_MARK_PX = 8

/** The frame-number color of the strip under the picture: [r, g, b]. */
export function frameMarkColor(frame: number): [number, number, number] {
  return [frame & 255, (frame >> 8) & 255, 128]
}

/**
 * Makes time in the page virtual for exporting, so every frame is drawn exactly on time however
 * slow the capture is. Timers, requestAnimationFrame, performance.now, Date.now and CSS / Web
 * animations all follow the clock, which only moves when the exporter calls
 * __lvAdvanceTo(ms, frame) (or __lvAdvance(ms)). Runs first in <head>, before any other script.
 */
export const VIRTUAL_TIME_JS = `(function(){
  var realRaf=window.requestAnimationFrame.bind(window),now=0,dateBase=Date.now();
  var rafs=[],rafId=0,timers=[],timerId=0,born=new WeakMap();
  window.requestAnimationFrame=function(cb){var id=++rafId;rafs.push({id:id,cb:cb});return id};
  window.cancelAnimationFrame=function(id){rafs=rafs.filter(function(r){return r.id!==id})};
  performance.now=function(){return now};
  Date.now=function(){return dateBase+now};
  function add(fn,ms,args,every){
    var id=++timerId,d=Math.max(0,Number(ms)||0);
    timers.push({id:id,at:now+d,fn:fn,args:args,every:every?Math.max(1,d):0});return id;
  }
  window.setTimeout=function(fn,ms){return add(fn,ms,[].slice.call(arguments,2),false)};
  window.setInterval=function(fn,ms){return add(fn,ms,[].slice.call(arguments,2),true)};
  window.clearTimeout=window.clearInterval=function(id){timers=timers.filter(function(t){return t.id!==id})};
  function run(fn,args){try{typeof fn==='function'?fn.apply(window,args):(0,eval)(String(fn))}catch(e){console.error(e)}}
  // The presenter restarts a scene's animations as it comes in: they count from now on the virtual clock.
  window.__lvRestartAnimation=function(a){born.set(a,now);a.currentTime=0};
  function syncAnimations(){
    document.getAnimations().forEach(function(a){
      var b=born.get(a);if(b===undefined){b=now;born.set(a,b)}
      if(a.playState!=='paused')a.pause();
      a.currentTime=now-b;
    });
  }
  var mark=null;
  // Moves the clock to an exact time (so frame times don't drift) and shows the frame number.
  window.__lvAdvanceTo=function(end,frame){
    if(mark&&frame!==undefined)mark.style.background='rgb('+(frame&255)+','+((frame>>8)&255)+',128)';
    return window.__lvAdvance(Math.max(0,end-now),end);
  };
  window.__lvAdvance=function(ms,exact){
    var end=exact!==undefined?exact:now+ms,guard=0;
    // Run the timers that fall due, in order, each at its own time.
    while(guard++<10000){
      var next=null;
      timers.forEach(function(t){if(t.at<=end&&(!next||t.at<next.at))next=t});
      if(!next)break;
      now=Math.max(now,next.at);
      if(next.every)next.at+=next.every;else timers=timers.filter(function(t){return t!==next});
      run(next.fn,next.args);
    }
    now=end;
    var list=rafs;rafs=[];
    list.forEach(function(r){try{r.cb(now)}catch(e){console.error(e)}});
    syncAnimations();
    // Resolve once the browser has painted the new state.
    return new Promise(function(done){realRaf(function(){realRaf(function(){done(true)})})});
  };
  window.__lvReady=function(){
    if(!mark&&document.body){
      mark=document.createElement('div');
      mark.style.cssText='position:fixed;left:0;right:0;bottom:0;height:${FRAME_MARK_PX}px;z-index:2147483647;background:rgb(0,0,128)';
      document.body.appendChild(mark);
    }
    var fonts=document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve();
    return fonts.then(function(){syncAnimations();return true});
  };
})();`
