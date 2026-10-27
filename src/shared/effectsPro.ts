import type { ElementType } from './types'

/**
 * Motion components for the designer, modelled on effects from the React Bits Pro
 * catalog and written from their public descriptions for Lawnak Vision. Plain CSS,
 * Canvas, WebGL and browser JS, so exported decks work offline in any browser.
 *
 * Each component is a designer element with the class fxp-<type> and its settings
 * in data-* attributes. The runtime below brings it to life. Like the 3D runtime it
 * only animates while its slide is shown, draws one still frame for thumbnails
 * (html.lv-static), and marks interactive components data-no-advance so a click on
 * them does not change slides.
 *
 * Picture lists ("data-items") are one item per line: picture URL | title | subtitle.
 * An empty picture gets generated artwork, so every component looks good at once.
 */

export const PRO_TYPES: ElementType[] = [
  'rotcards', 'shadercard', 'ribbon', 'albumrail', 'reel', 'sticker',
  'bend', 'depthcard', 'lenticular', 'textpath', 'cursor', 'pills'
]

// ---------- Shaders ----------

const NOISE = `
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),u.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*vn(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
`

/** A flame rising from the bottom of the card, with contour lines and grain. */
const FLAME = `precision highp float;
uniform vec2 uRes;uniform float uTime;uniform vec3 uColor;uniform vec3 uHi;uniform vec3 uBg;uniform float uRise;uniform float uHover;
${NOISE}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;float asp=uRes.x/uRes.y;vec2 p=vec2((uv.x-.5)*asp,uv.y);float t=uTime;
  float top=(.62+.2*uHover)*uRise;float y=uv.y/max(top,.001);
  vec2 q=vec2(p.x*2.2,uv.y*1.6-t*1.1);float n=fbm(q*1.4);float n2=fbm(q*3.1+vec2(n*1.6,-t*.6));
  float x=p.x+(n-.5)*.55*uv.y+sin(t*1.3+uv.y*4.)*.05*uv.y;
  float w=mix(.46,.05,clamp(y,0.,1.))*.95+.05;
  float f=exp(-pow(abs(x)/w,2.)*1.6)*(1.-smoothstep(.5,1.15,y+(n2-.5)*.8))*(.55+.9*n2);
  f=smoothstep(.12,.95,f);f*=1.-smoothstep(.64,1.,uv.y);f*=.9+.1*sin(t*6.+n*7.);
  float core=smoothstep(.55,1.,f),band=smoothstep(.22,.42,f)*(1.-smoothstep(.42,.72,f));
  float lines=pow(abs(sin(f*42.)),36.)*smoothstep(.05,.3,f)*.4;
  vec3 col=uColor*f*1.05+uHi*(core*.6+band*.5+lines)+uColor*pow(f,3.)*.55;
  col*=1.+uHover*.25;col+=(h21(gl_FragCoord.xy+fract(t*.37)*311.)-.5)*.12*f;
  // Soft tone-mapping keeps the hue when a bright accent would burn out to white.
  col=1.-exp(-max(col,0.)*1.15);
  gl_FragColor=vec4(uBg+col,1.);
}`

/** A strip of tiles seen through a lens that swells or pinches with scroll speed. */
const LENS = `precision highp float;
uniform vec2 uRes;uniform sampler2D uTex;uniform float uScroll;uniform float uCount;uniform float uPitch;uniform float uTileW;
uniform float uBend;uniform float uHoriz;
vec4 tap(vec2 d,float k){
  float L=(uHoriz>.5?uRes.x:uRes.y)*.5;float a=clamp(d.y/L,-1.,1.);float b=k*(1.-a*a);
  float u=d.x*(1.-b)/uTileW+.5;float s=uScroll-d.y*(1.-b*.75)/uPitch;
  if(u<0.||u>1.)return vec4(0.);
  return texture2D(uTex,vec2(u,mod(s,uCount)/uCount));
}
void main(){
  vec2 d=gl_FragCoord.xy-uRes*.5;if(uHoriz>.5)d=vec2(-d.y,-d.x);
  float A=.1*abs(uBend);vec4 c=tap(d,uBend);
  if(A>.001){c.r=tap(d,uBend*(1.+A)).r;c.b=tap(d,uBend*(1.-A)).b;}
  float e=abs(d.y)/((uHoriz>.5?uRes.x:uRes.y)*.5);
  c*=1.-smoothstep(.68,1.,e);c.rgb*=1.-.22*smoothstep(.2,1.,e);
  gl_FragColor=c;
}`

// ---------- CSS ----------

const BUBBLES = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="520" viewBox="0 0 400 520"><defs><radialGradient id="g" cx=".35" cy=".3"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#cbbcff"/><stop offset="1" stop-color="#6b4dff"/></radialGradient></defs><circle cx="270" cy="150" r="70" fill="url(#g)"/><circle cx="110" cy="250" r="26" fill="url(#g)" opacity=".9"/><circle cx="300" cy="300" r="14" fill="#fff" opacity=".8"/></svg>'
)}`

export const PRO_CSS = String.raw`
/* ---- Motion components (fxp-*) ---- */
.slide .fxp-in{position:absolute;inset:0}
.slide :is(.fxp-rotcards,.fxp-ribbon,.fxp-albumrail,.fxp-reel,.fxp-bend,.fxp-lenticular,.fxp-sticker){user-select:none;-webkit-user-select:none;touch-action:none}
.slide .fxp-rotcards,.slide .fxp-ribbon,.slide .fxp-bend,.slide .fxp-sticker{cursor:grab}
.slide .fxp-rc-stage{position:absolute;inset:0;perspective:1100px}
.slide .fxp-rc-ring{position:absolute;left:50%;top:50%;transform-style:preserve-3d}
.slide .fxp-rc-card{position:absolute;left:0;top:0;border-radius:18px;overflow:hidden;color:#fff;background:#222 center/cover;display:flex;flex-direction:column;justify-content:flex-end;gap:.15em;padding:.8em .9em;
  box-shadow:0 18px 40px -12px rgba(0,0,0,.55),inset 0 0 0 1px rgba(255,255,255,.14);cursor:pointer}
.slide .fxp-rc-card::after{content:"";position:absolute;inset:0;background:linear-gradient(transparent 40%,rgba(0,0,0,.65))}
.slide .fxp-rc-card>*{position:relative;z-index:1}
.slide .fxp-rc-card .fxp-em{position:absolute;top:.35em;inset-inline-start:.45em;font-size:2.4em;line-height:1}
.slide .fxp-rc-card b{font-size:1.1em;line-height:1.2}
.slide .fxp-rc-card small{font-size:.75em;opacity:.8}
.slide .fxp-shadercard .fxp-in{border-radius:inherit;overflow:hidden;background:#0d0b16;color:#fff;box-shadow:0 30px 70px -20px rgba(0,0,0,.6),inset 0 0 0 1px rgba(255,255,255,.08)}
.slide .fxp-shadercard{border-radius:18px}
.slide .fxp-sc-cv{position:absolute;inset:0;width:100%;height:100%;filter:blur(3px)}
.slide .fxp-sc-body{position:relative;z-index:1;height:100%;box-sizing:border-box;display:flex;flex-direction:column;gap:.45em;padding:1.3em}
.slide .fxp-sc-body h3{margin:0;font-size:1.5em;line-height:1.15;font-family:var(--heading-font);color:#fff}
.slide .fxp-sc-body p{margin:0;font-size:.85em;line-height:1.5;color:rgba(255,255,255,.75)}
.slide .fxp-sc-cta{margin-top:auto;align-self:flex-start;padding:.5em 1em;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);font-size:.8em;backdrop-filter:blur(8px)}
.slide .fxp-ribbon>canvas,.slide .fxp-bend>canvas,.slide .fxp-bend>img{position:absolute;inset:0;width:100%;height:100%;display:block}
.slide .fxp-rb-cap{position:absolute;left:50%;bottom:4%;translate:-50% 0;display:flex;flex-direction:column;align-items:center;padding:10px 20px;border-radius:14px;background:rgba(0,0,0,.5);color:#fff;backdrop-filter:blur(8px);font-size:20px;pointer-events:none}
.slide .fxp-rb-cap small{font-size:14px;opacity:.75}
.slide .fxp-albumrail{display:flex;flex-direction:column}
.slide .fxp-ar-stage{position:relative;flex:1;perspective:1200px;cursor:grab}
.slide .fxp-ar-cover{position:absolute;left:50%;top:50%;transform-style:preserve-3d;cursor:pointer}
.slide .fxp-ar-sleeve{position:absolute;inset:0;border-radius:14px;background:#222 center/cover;box-shadow:0 18px 40px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,255,255,.1)}
.slide .fxp-ar-disc{position:absolute;left:4%;top:4%;width:92%;height:92%;border-radius:50%;box-shadow:0 6px 20px rgba(0,0,0,.5)}
.slide .fxp-ar-cap{display:flex;flex-direction:column;align-items:center;font-size:20px;color:var(--fg);padding:6px 0}
.slide .fxp-ar-cap small{font-size:15px;color:var(--muted)}
.slide .fxp-ar-ctl{display:flex;align-items:center;gap:12px;padding:4px 6% 8px}
.slide .fxp-ar-ctl button{width:34px;height:34px;border-radius:50%;border:1px solid color-mix(in srgb,var(--fg) 25%,transparent);background:color-mix(in srgb,var(--fg) 8%,transparent);color:var(--fg);font-size:18px;line-height:1;cursor:pointer;display:grid;place-items:center;padding:0}
.slide .fxp-ar-ctl .fxp-ar-play{width:40px;height:40px;border:0;color:#111;font-size:14px}
.slide .fxp-ar-ruler{position:relative;flex:1;height:28px;display:flex;align-items:center;justify-content:space-between;cursor:pointer}
.slide .fxp-ar-ruler span{width:2px;height:9px;border-radius:1px;background:color-mix(in srgb,var(--fg) 30%,transparent)}
.slide .fxp-ar-ruler span.on{height:16px;background:var(--fg)}
.slide .fxp-ar-ruler i{position:absolute;top:50%;width:12px;height:12px;border-radius:50%;translate:-50% -50%;pointer-events:none}
.slide .fxp-re-bar{position:absolute;left:0;top:0;background:#222 center/cover;cursor:pointer;box-shadow:0 10px 24px rgba(0,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.12)}
.slide .fxp-re-big{position:absolute;left:0;top:0;display:none;z-index:3;background:#222 center/cover;box-shadow:0 30px 70px rgba(0,0,0,.5),inset 0 0 0 1px rgba(255,255,255,.12);cursor:zoom-out}
.slide .fxp-re-cap{position:absolute;left:0;right:0;bottom:0;height:56px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:20px;color:var(--fg);pointer-events:none}
.slide .fxp-re-cap small{font-size:15px;color:var(--muted)}
.slide .fxp-sticker .fxp-in{will-change:transform}
.slide .fxp-st-shadow,.slide .fxp-st-tilt,.slide .fxp-st-clip{position:absolute;inset:0}
.slide .fxp-st-face{position:absolute;inset:0;box-sizing:border-box;background:#fff center/cover;background-clip:padding-box;overflow:hidden}
.slide .fxp-st-gloss{position:absolute;inset:0;background-size:300% 300%;pointer-events:none;border-radius:inherit}
.slide .fxp-st-gloss.holo{mix-blend-mode:color-dodge}
.slide .fxp-st-flapbox{position:absolute;display:none;filter:drop-shadow(-2px 3px 3px rgba(0,0,0,.35));pointer-events:none}
.slide .fxp-st-flap{width:100%;height:100%}
.slide .fxp-depthcard{border-radius:16px}
.slide .fxp-depthcard .fxp-in{border-radius:inherit;overflow:hidden;color:#fff;background:#222;box-shadow:0 26px 60px -18px rgba(0,0,0,.55),inset 0 0 0 1px rgba(255,255,255,.1)}
.slide .fxp-dc-bg,.slide .fxp-dc-layer{position:absolute;inset:-6%;background:center/cover no-repeat}
.slide .fxp-dc-layer{background-image:url("${BUBBLES}");background-size:contain;pointer-events:none}
.slide .fxp-dc-spot{position:absolute;inset:0;mix-blend-mode:soft-light;pointer-events:none;opacity:0}
.slide .fxp-dc-body{position:absolute;left:0;right:0;bottom:0;padding:3.5em 1.1em 1.1em;background:linear-gradient(transparent,rgba(0,0,0,.75))}
.slide .fxp-dc-body h3{margin:0 0 .25em;font-size:1.4em;font-family:var(--heading-font);color:#fff}
.slide .fxp-dc-body p{margin:0;font-size:.85em;line-height:1.5;color:rgba(255,255,255,.78)}
.slide:is(.active,.lv-leave) .fxp-dc-body>*{animation:fxp-up .7s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--d,0s) + .25s)}
.slide:is(.active,.lv-leave) .fxp-dc-body>p{animation-delay:calc(var(--d,0s) + .38s)}
.lv-static .slide .fxp-dc-body>*{animation:none!important}
@keyframes fxp-up{from{opacity:0;transform:translateY(14px)}}
.slide .fxp-lenticular{display:flex;flex-direction:column;justify-content:center}
.slide .fxp-le-view{position:relative;overflow:hidden;display:flex;align-items:center}
.slide .fxp-le-track{display:flex;flex:none;margin-left:50%;align-items:center;transition:transform .55s cubic-bezier(.2,.8,.2,1)}
.slide .fxp-le-slide{position:relative;flex:none;transition:transform .45s cubic-bezier(.2,.8,.2,1),filter .45s;cursor:pointer}
.slide .fxp-le-inner{position:absolute;inset:0;transform-style:preserve-3d;border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.45)}
.slide .fxp-le-strip{position:absolute;top:0;bottom:0;transform-style:preserve-3d}
.slide .fxp-le-face{position:absolute;inset:0;backface-visibility:hidden;background-repeat:no-repeat}
.slide .fxp-le-face.back{transform:rotateY(180deg)}
.slide .fxp-le-ribs,.slide .fxp-le-foil{position:absolute;inset:0;pointer-events:none;border-radius:inherit;transform:translateZ(1px)}
.slide .fxp-le-foil{background-image:linear-gradient(110deg,transparent 20%,rgba(255,0,170,.5) 32%,rgba(255,230,0,.5) 42%,rgba(0,255,190,.5) 52%,rgba(0,170,255,.5) 62%,transparent 75%);background-size:260% 100%;mix-blend-mode:overlay;opacity:.12}
.slide .fxp-le-label{position:absolute;left:0;right:0;bottom:0;padding:44px 16px 14px;font-size:18px;font-weight:600;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.75));transform:translateZ(2px);border-radius:0 0 14px 14px}
.slide .fxp-le-ctl{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:10px}
.slide .fxp-le-ctl button{width:34px;height:34px;border-radius:50%;border:1px solid color-mix(in srgb,var(--fg) 25%,transparent);background:color-mix(in srgb,var(--fg) 8%,transparent);color:var(--fg);font-size:18px;cursor:pointer;padding:0}
.slide .fxp-le-ctl button:disabled{opacity:.3;cursor:default}
.slide .fxp-le-rail{display:flex;gap:5px}
.slide .fxp-le-rail span{width:20px;height:4px;border-radius:2px;background:color-mix(in srgb,var(--fg) 25%,transparent);cursor:pointer;transition:width .3s,background .3s}
.slide .fxp-le-rail span.on{width:34px;background:var(--fg)}
.slide .fxp-textpath svg{width:100%;height:100%;overflow:visible;display:block}
.slide .fxp-textpath text{fill:currentColor}
.slide .fxp-cursor{pointer-events:none;visibility:hidden}
.lv-static .slide .fxp-cursor{visibility:visible;border:2px dashed color-mix(in srgb,var(--fg) 45%,transparent);border-radius:50%;display:grid;place-items:center;color:var(--muted);font-size:14px}
.lv-static .slide .fxp-cursor::before{content:"";width:22%;height:22%;border-radius:50%;background:var(--fg)}
.slide.fxp-cur-on,.slide.fxp-cur-on *{cursor:none!important}
.slide .fxp-cur-ring,.slide .fxp-cur-dot{position:absolute;left:0;top:0;pointer-events:none;opacity:0;z-index:9999;box-sizing:border-box;will-change:transform}
.slide .fxp-cur-ring{border:2px solid;overflow:hidden}
.slide .fxp-cur-dot{border-radius:50%}
.slide .fxp-pill{position:absolute;left:0;top:0;display:flex;align-items:center;justify-content:center;white-space:nowrap;font-weight:600;
  box-shadow:0 10px 30px rgba(0,0,0,.25),inset 0 -3px 0 rgba(0,0,0,.12);will-change:transform;opacity:0}
.slide .fxp-pill.fxp-pill-empty{background:color-mix(in srgb,var(--fg) 7%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--fg) 12%,transparent)}
`

// ---------- Runtime ----------

export const PRO_JS = String.raw`
(function(){
  var root=document.documentElement,still=root.classList.contains('lv-static');
  var reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches),calm=still||reduce;
  var FLAME=${JSON.stringify(FLAME)},LENS=${JSON.stringify(LENS)};

  // ---- Small helpers ----
  function on(s){return !s||s.classList.contains('active')||s.classList.contains('lv-leave')}
  function hex(v){var m=/^#?([0-9a-f]{6})$/i.exec((v||'').trim());if(!m)return null;var n=parseInt(m[1],16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]}
  function theme(el,name,d){return hex(getComputedStyle(el).getPropertyValue(name))||d}
  function rgb(c,a){return 'rgba('+Math.round(c[0]*255)+','+Math.round(c[1]*255)+','+Math.round(c[2]*255)+','+(a==null?1:a)+')'}
  function clamp(v,a,b){return v<a?a:v>b?b:v}
  function lerp(a,b,t){return a+(b-a)*t}
  function sm(t){return t*t*(3-2*t)}
  function spr(x){return {x:x||0,v:0}}
  function spring(s,t,k,d,dt){var n=Math.max(1,Math.ceil(dt*240)),h=dt/n;for(var i=0;i<n;i++){s.v+=(-k*(s.x-t)-d*s.v)*h;s.x+=s.v*h}return s.x}
  function num(h,n,d){var v=parseFloat(h.getAttribute('data-'+n));return isNaN(v)?d:v}
  function attr(h,n,d){var v=h.getAttribute('data-'+n);return v==null||v===''?d:v}
  function flag(h,n,d){var v=h.getAttribute('data-'+n);return v==null?d:v!=='false'}
  // Slides are scaled to fit the window: this turns screen pixels into slide pixels.
  function scale(h){return h.offsetWidth/(h.getBoundingClientRect().width||1)}
  function local(h,e){var r=h.getBoundingClientRect(),s=scale(h);return [(e.clientX-r.left)*s,(e.clientY-r.top)*s]}
  function mk(tag,cls,parent){var n=document.createElement(tag);if(cls)n.className=cls;if(parent)parent.appendChild(n);return n}
  function bg(src){return 'url("'+src+'")'}
  function interactive(h){
    h.setAttribute('data-no-advance','');
    ['touchstart','touchend'].forEach(function(t){h.addEventListener(t,function(e){e.stopPropagation()},{passive:true})});
  }
  function capture(h,e){try{h.setPointerCapture(e.pointerId)}catch(_){}}
  function wheel(h,fn){h.addEventListener('wheel',function(e){e.preventDefault();fn(e.deltaY,e.deltaX)},{passive:false})}
  /** Calls fn(dt, seconds) every frame while the slide is shown, until the element leaves the page. */
  function run(h,fn){
    var slide=h.closest('.slide'),last=0;
    (function f(t){var dt=last?Math.min(.05,(t-last)/1000):0;last=t;if(on(slide))fn(dt,t/1000);if(h.isConnected)requestAnimationFrame(f)})(performance.now());
  }

  // ---- Sample artwork, for items without a picture ----
  var PAL=[['#ff5f6d','#ffc371','#2a1b3d'],['#5227ff','#b19eef','#0e0b1f'],['#00c9a7','#c4fcef','#073b3a'],['#f72585','#4cc9f0','#1a0b2e'],
    ['#ffbe0b','#fb5607','#22223b'],['#3a86ff','#8338ec','#0b132b'],['#06d6a0','#ffd166','#1b2021'],['#ef476f','#ffd6e0','#2b0f1a'],
    ['#90e0ef','#0077b6','#03045e'],['#e9c46a','#2a9d8f','#264653'],['#ff99c8','#fcf6bd','#3c1642'],['#a7c957','#f2e8cf','#386641']];
  var TITLES=['Neon Dunes','Quiet Orbit','Saffron Hour','Night Market','Glass Garden','Low Tide','Desert Bloom','Paper Moon','Copper Sky','Soft Static','Blue Hour','Mint Signal'];
  var ARTISTS=['Studio Lawnak','Nora Vale','The Palms','Sami & Co.','Lumen','Atlas Club'];
  var ART={};
  function art(i){
    i=((i%12)+12)%12;if(ART[i])return ART[i];
    var c=PAL[i],a=c[0],b=c[1],k=c[2],w=480,h=480,s=i*31+5,g='',x,y,j;
    function r(){s=(s*16807)%2147483647;return (s-1)/2147483646}
    var st=i%6;
    if(st===0){g+='<rect width="480" height="480" fill="url(#lg)"/><circle cx="240" cy="264" r="134" fill="'+b+'"/>';
      for(j=0;j<6;j++)g+='<rect y="'+(278+j*j*3+j*10)+'" width="480" height="'+(3+j*1.6)+'" fill="'+k+'"/>';g+='<rect y="384" width="480" height="96" fill="'+k+'"/>'}
    else if(st===1){g+='<rect width="480" height="480" fill="'+k+'"/>';for(j=0;j<6;j++)g+='<circle cx="'+r()*w+'" cy="'+r()*h+'" r="'+w*(.15+r()*.25)+'" fill="'+[a,b,'#fff'][j%3]+'" opacity="'+(.55+r()*.4)+'" filter="url(#bl)"/>'}
    else if(st===2){g+='<rect width="480" height="480" fill="'+k+'"/>';x=w*(.3+r()*.4);y=h*(.3+r()*.4);for(j=9;j>0;j--)g+='<circle cx="'+x+'" cy="'+y+'" r="'+j*36+'" fill="'+(j%2?a:b)+'" opacity="'+(.4+j*.06)+'"/>'}
    else if(st===3){g+='<rect width="480" height="480" fill="'+b+'"/>';var cs=[k,a,b,'#fff',a];for(j=0;j<5;j++){var aw=w*(.8-j*.14),ax=(w-aw)/2,ay=h*(.22+j*.1);g+='<path d="M'+ax+' 480V'+(ay+aw/2)+'A'+aw/2+' '+aw/2+' 0 0 1 '+(ax+aw)+' '+(ay+aw/2)+'V480Z" fill="'+cs[j]+'"/>'}}
    else if(st===4){g+='<rect width="480" height="480" fill="'+k+'"/><g transform="rotate(-35 240 240)">';for(j=-6;j<14;j++)g+='<rect x="-480" y="'+j*43+'" width="1440" height="22" fill="'+(j%2?a:b)+'"/>';g+='</g><circle cx="326" cy="154" r="77" fill="'+k+'" stroke="#fff" stroke-width="6"/>'}
    else{for(y=0;y<3;y++)for(x=0;x<3;x++){var c1=[a,b,k][(x+y)%3],c2=[b,k,a][(x+2*y)%3],X=x*160,Y=y*160,t=Math.floor(r()*3);
      g+='<rect x="'+X+'" y="'+Y+'" width="160" height="160" fill="'+c1+'"/>';
      g+=t===0?'<circle cx="'+(X+80)+'" cy="'+(Y+80)+'" r="61" fill="'+c2+'"/>':t===1?'<path d="M'+X+' '+(Y+160)+'A160 160 0 0 1 '+(X+160)+' '+Y+'V'+(Y+160)+'Z" fill="'+c2+'"/>':'<path d="M'+X+' '+Y+'H'+(X+160)+'L'+X+' '+(Y+160)+'Z" fill="'+c2+'"/>'}}
    var svg='<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480"><defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+k+'"/><stop offset=".7" stop-color="'+a+'"/></linearGradient><filter id="bl"><feGaussianBlur stdDeviation="24"/></filter></defs>'+g+'</svg>';
    return ART[i]='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  }
  var URL_RE=/^(https?:\/\/[^\s"'()<>\\]+|data:image\/[\w.+-]+;base64,[\w+\/=]+)$/;
  function pic(s){s=(s||'').trim();return URL_RE.test(s)?s:''}
  /** Reads "picture | title | subtitle" lines. Items without a picture get artwork. */
  function items(h,count){
    var out=[];
    (h.getAttribute('data-items')||'').split(/\n/).forEach(function(l){
      if(!l.trim())return;var p=l.split('|').map(function(s){return s.trim()}),src=pic(p[0]);
      out.push({src:src,lead:src?'':(p[0]||''),title:p[1]||'',sub:p[2]||'',more:p.slice(3)});
    });
    if(!out.length)for(var i=0;i<count;i++)out.push({src:'',lead:'',title:TITLES[i%12],sub:ARTISTS[i%6],more:[]});
    out.forEach(function(it,i){it.art=!it.src;if(!it.src)it.src=art(i);it.color=PAL[i%12][0]});
    return out;
  }
  var IMG={};
  function load(src,cors){
    var key=(cors?'c:':'')+src;
    if(!IMG[key])IMG[key]=new Promise(function(res){var im=new Image();if(cors)im.crossOrigin='anonymous';im.onload=function(){res(im)};im.onerror=function(){res(null)};im.src=src});
    return IMG[key];
  }

  // ---- WebGL: one full-screen triangle and a fragment shader ----
  function glx(cv,fs){
    var g=cv.getContext('webgl',{premultipliedAlpha:true,alpha:true,antialias:false,preserveDrawingBuffer:still});if(!g)return null;
    function sh(t,src){var s=g.createShader(t);g.shaderSource(s,src);g.compileShader(s);return g.getShaderParameter(s,g.COMPILE_STATUS)?s:null}
    var vs=sh(g.VERTEX_SHADER,'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'),f=sh(g.FRAGMENT_SHADER,fs);if(!vs||!f)return null;
    var pr=g.createProgram();g.attachShader(pr,vs);g.attachShader(pr,f);g.linkProgram(pr);g.useProgram(pr);
    var b=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,b);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),g.STATIC_DRAW);
    var loc=g.getAttribLocation(pr,'p');g.enableVertexAttribArray(loc);g.vertexAttribPointer(loc,2,g.FLOAT,false,0,0);
    var U={};function u(n){if(!(n in U))U[n]=g.getUniformLocation(pr,n);return U[n]}
    return {g:g,
      set:function(n,v){g.uniform1f(u(n),v)},
      set3:function(n,v){g.uniform3f(u(n),v[0],v[1],v[2])},
      size:function(w,h,d){var W=Math.max(1,Math.round(w*d)),H=Math.max(1,Math.round(h*d));if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}g.viewport(0,0,W,H);g.uniform2f(u('uRes'),W,H)},
      tex:function(n,src){var t=g.createTexture();g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,t);g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
        g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,src);
        g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);
        g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.uniform1i(u(n),0)},
      draw:function(){g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);g.drawArrays(g.TRIANGLES,0,3)}};
  }
  // Thumbnails keep a picture and free the WebGL context, so many of them don't run out.
  function freeze(cv,ctx){var img=new Image();img.className=cv.className;img.style.cssText=cv.style.cssText;img.src=cv.toDataURL();cv.replaceWith(img);var l=ctx.g.getExtension('WEBGL_lose_context');if(l)l.loseContext()}

  // ================= Rotating cards =================
  function rotcards(h){
    var its=items(h,8),n=its.length,W=h.offsetWidth||900,H=h.offsetHeight||420;
    var ch=H*.62,cw=ch*.78,need=n*1.1/Math.PI;
    if(cw*(1+need)>W*.92){cw=W*.92/(1+need);ch=cw/.78}
    var R=Math.max(cw*n*1.1/(2*Math.PI),Math.min((W-cw)/2*.92,cw*1.6)),step=360/n;
    var secs=num(h,'speed',20),dir=attr(h,'dir','')==='reverse'?-1:1;
    var stage=mk('div','fxp-rc-stage',h),ring=mk('div','fxp-rc-ring',stage),cards=[];
    its.forEach(function(it,i){
      var c=mk('div','fxp-rc-card',ring);c.setAttribute('data-i',i);
      c.style.width=cw+'px';c.style.height=ch+'px';c.style.marginLeft=(-cw/2)+'px';c.style.marginTop=(-ch/2)+'px';
      c.style.fontSize=Math.round(cw*.1)+'px';c.style.backgroundImage=bg(it.src);
      c.style.transform='rotateY('+(i*step)+'deg) translateZ('+R+'px)';
      if(it.lead)mk('span','fxp-em',c).textContent=it.lead;
      if(it.title)mk('b',null,c).textContent=it.title;
      if(it.sub)mk('small',null,c).textContent=it.sub;
      cards.push(c);
    });
    var a=0,vel=0,goal=null,hold=0,hover=false,drag=null;
    function paint(){
      ring.style.transform='translateZ('+(-R)+'px) rotateX(-8deg) rotateY('+a+'deg)';
      cards.forEach(function(c,i){c.style.opacity=(.3+.35*(Math.cos((a+i*step)*Math.PI/180)+1)).toFixed(3)});
    }
    paint();if(calm)return;interactive(h);
    h.addEventListener('pointerenter',function(){hover=true});
    h.addEventListener('pointerleave',function(){hover=false});
    h.addEventListener('pointerdown',function(e){
      if(e.button)return;var c=e.target.closest('.fxp-rc-card');
      drag={last:e.clientX,moved:0,i:c?+c.getAttribute('data-i'):-1,k:scale(h)};goal=null;vel=0;capture(h,e);
    });
    h.addEventListener('pointermove',function(e){if(!drag)return;var dx=(e.clientX-drag.last)*drag.k;drag.last=e.clientX;drag.moved+=Math.abs(dx);a+=dx*.3;vel=dx*.3*60});
    function up(){
      if(!drag)return;
      // A click turns the shortest way to bring that card to the front.
      if(drag.moved<5&&drag.i>=0){var t=-drag.i*step;goal=t+Math.round((a-t)/360)*360;vel=0;hold=2.5}
      drag=null;
    }
    h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up);
    wheel(h,function(dy,dx){goal=null;vel+=(dy+dx)*.6});
    run(h,function(dt){
      if(goal!==null){a+=(goal-a)*Math.min(1,dt*6);if(Math.abs(goal-a)<.05)goal=null}
      else if(!drag){a+=vel*dt;vel*=Math.pow(.05,dt);hold=Math.max(0,hold-dt);if(secs>0&&!hold&&!hover)a+=dir*360/secs*dt}
      paint();
    });
  }

  // ================= Shader card =================
  function shadercard(h){
    var inn=h.querySelector('.fxp-in');if(!inn)return;
    var slide=h.closest('.slide'),body=inn.querySelector('.fxp-sc-body'),cv=mk('canvas','fxp-sc-cv');inn.insertBefore(cv,inn.firstChild);
    var A=hex(h.getAttribute('data-color'))||theme(slide||h,'--accent',[.32,.15,1]);
    var Hi=[A[0]*.45+.55,A[1]*.45+.47,A[2]*.45+.38],BG=[.05,.045,.085];
    var ctx=glx(cv,FLAME);if(!ctx){cv.remove();return}
    var t=3,rise=calm?1:0,hov=spr(),tx=spr(),ty=spr(),mx=0,my=0,inside=false;
    function frame(){
      ctx.size(h.offsetWidth,h.offsetHeight,Math.min(2,window.devicePixelRatio||1));
      ctx.set('uTime',t);ctx.set('uRise',1-Math.pow(1-rise,3));ctx.set('uHover',hov.x);
      ctx.set3('uColor',A);ctx.set3('uHi',Hi);ctx.set3('uBg',BG);ctx.draw();
    }
    if(calm){frame();if(still)freeze(cv,ctx);return}
    h.addEventListener('pointermove',function(e){var p=local(h,e);mx=p[0]/h.offsetWidth*2-1;my=p[1]/h.offsetHeight*2-1;inside=true});
    h.addEventListener('pointerleave',function(){inside=false});
    if(slide)slide.addEventListener('slideenter',function(){rise=0});
    run(h,function(dt){
      spring(hov,inside?1:0,60,14,dt);
      t+=dt*(1+hov.x*.8);rise=Math.min(1,rise+dt/1.4);
      var rx=spring(tx,inside?-my*8:0,120,18,dt),ry=spring(ty,inside?mx*8:0,120,18,dt);
      inn.style.transform='perspective(900px) rotateX('+rx+'deg) rotateY('+ry+'deg)';
      cv.style.transform='translate('+(-ry*1.4)+'px,'+(rx*1.4)+'px) scale(1.08)';
      if(body)body.style.transform='translate('+(ry*.8)+'px,'+(-rx*.8)+'px)';
      frame();
    });
  }

  // ================= Depth ribbon =================
  function sub(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]}
  function add(a,b){return [a[0]+b[0],a[1]+b[1],a[2]+b[2]]}
  function mul(a,k){return [a[0]*k,a[1]*k,a[2]*k]}
  function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
  function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
  function norm(a){var l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l]}
  function mix3(a,b,t){return [lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)]}
  function ribbon(h){
    var its=items(h,12),n=Math.max(4,Math.min(240,Math.round(num(h,'count',48)))),kind=attr(h,'path','loop'),tour=attr(h,'tour','cycle'),speed=num(h,'speed',.6);
    var slide=h.closest('.slide'),A=hex(h.getAttribute('data-color'))||theme(slide||h,'--accent',[.69,.62,.94]);
    var cv=mk('canvas',null,h),ctx=cv.getContext('2d'),cap=mk('div','fxp-rb-cap',h),capB=mk('b',null,cap),capS=mk('small',null,cap),imgs=[];cap.hidden=true;
    var loads=its.map(function(it,i){return load(it.src).then(function(im){imgs[i]=im})});
    function raw(s){
      var t=s*Math.PI*2;
      if(kind==='knot'){var x=Math.sin(t)+2*Math.sin(2*t),y=Math.cos(t)-2*Math.cos(2*t);return [x/3,-Math.sin(3*t)/3*.9,y/3]}
      if(kind==='wave')return [Math.cos(t),.22*Math.sin(4*t),Math.sin(t)];
      return [Math.sin(t),.32*Math.cos(t),Math.sin(t)*Math.cos(t)*1.15];
    }
    // Scale the path so neighbouring cards sit one unit apart.
    var len=0,ext=0,prev=raw(0),i,j;
    for(i=1;i<=600;i++){var q=raw(i/600);len+=Math.hypot(q[0]-prev[0],q[1]-prev[1],q[2]-prev[2]);ext=Math.max(ext,Math.abs(q[0]),Math.abs(q[1]),Math.abs(q[2]));prev=q}
    var S=n/len;ext*=S;
    function pt(s){var p=raw(((s%1)+1)%1);return [p[0]*S,p[1]*S,p[2]*S]}
    // Shuffle the pictures in passes so neighbours differ.
    var order=[],seed=7;
    while(order.length<n){var pass=its.map(function(_,k){return k});for(j=pass.length-1;j>0;j--){seed=seed*16807%2147483647;var r=seed%(j+1),tmp=pass[j];pass[j]=pass[r];pass[r]=tmp}order=order.concat(pass)}
    order.length=n;
    var s={u:0,vel:0,m:spr(calm||tour==='overview'?1:0),mGoal:tour==='overview'?1:0,clock:0,ang:.6,hover:-1,focus:-1,lastFocus:0,fo:spr(),goalU:null,down:null,reveal:false,rects:[]};
    function draw(dt){
      var W=h.offsetWidth,H=h.offsetHeight;if(!W||!H)return;
      var d=Math.min(2,window.devicePixelRatio||1);if(cv.width!==Math.round(W*d))cv.width=Math.round(W*d);if(cv.height!==Math.round(H*d))cv.height=Math.round(H*d);
      ctx.setTransform(d,0,0,d,0,0);
      if(dt){
        var stop=s.focus>=0||s.hover>=0||s.down;
        if(s.goalU!==null)s.u+=(s.goalU-s.u)*Math.min(1,dt*3.5);
        else{if(!stop)s.u+=speed*dt;s.u+=s.vel*dt;s.vel*=Math.pow(.08,dt)}
        if(tour==='cycle'&&!stop&&s.goalU===null){s.clock+=dt;s.mGoal=s.clock%13>9?1:0}
        if(s.reveal)s.mGoal=1;if(s.focus>=0)s.mGoal=0;
        spring(s.m,s.mGoal,9,6,dt);if(!s.reveal)s.ang+=dt*.12;
      }
      var mm=sm(clamp(s.m.x,0,1)),up=[0,1,0],cs=s.u/n,p0=pt(cs),tg=norm(sub(pt(cs+.002),p0)),side=cross(tg,up);
      side=Math.hypot(side[0],side[1],side[2])<1e-3?[1,0,0]:norm(side);
      // Ride behind, above and beside the path so the cards stream past off-centre.
      var rideP=add(add(sub(p0,mul(tg,2.2)),mul(up,.75)),mul(side,.75)),rideT=add(pt(cs+3/n),mul(up,.05));
      var fo=spring(s.fo,s.focus>=0?1:0,30,11,dt||1);
      if(fo>.001)rideT=mix3(rideT,pt((s.focus>=0?s.focus:s.lastFocus)/n),clamp(fo,0,1));
      var D=ext*1.45,P=mix3(rideP,[Math.sin(s.ang)*D,D*.55,Math.cos(s.ang)*D],mm),T=mix3(rideT,[0,0,0],mm);
      var f=norm(sub(T,P)),rr=norm(cross(f,up)),uu=cross(rr,f),focal=H/2/Math.tan(Math.PI/6);
      function proj(X){var v=sub(X,P),z=dot(v,f);return [W/2+dot(v,rr)/z*focal,H/2-dot(v,uu)/z*focal,z]}
      ctx.clearRect(0,0,W,H);
      ctx.strokeStyle=rgb(A,.3);ctx.lineWidth=1.2;ctx.beginPath();var pen=false;
      for(i=0;i<=500;i++){var a=proj(pt(i/500));if(a[2]<.2){pen=false;continue}if(pen)ctx.lineTo(a[0],a[1]);else ctx.moveTo(a[0],a[1]);pen=true}
      ctx.stroke();
      var list=[];for(i=0;i<n;i++){var b=proj(pt(i/n));if(b[2]>.25)list.push({i:i,x:b[0],y:b[1],z:b[2]})}
      list.sort(function(x,y){return y.z-x.z});
      var fogK=.05*(1-mm*.75),rects=[];
      list.forEach(function(q){
        var hp=.72/q.z*focal;if(hp<1.5)return;
        var near=q.i===s.focus?1:sm(clamp((q.z-1.8)/.7,0,1)),al=clamp(Math.exp(-q.z*fogK),0,1)*near;if(al<.01)return;
        var hov=q.i===s.hover,sc=hov?1.06:1,w=hp*sc,hh=hp*sc,x=q.x-w/2,y=q.y-hh/2-(hov?hp*.06:0);
        ctx.globalAlpha=al*.25;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(q.x,q.y+hp*.62,w*.42,hp*.07,0,0,7);ctx.fill();
        ctx.globalAlpha=al;ctx.save();ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,hh,w*.06);else ctx.rect(x,y,w,hh);ctx.clip();
        var im=imgs[order[q.i]];if(im)ctx.drawImage(im,x,y,w,hh);else{ctx.fillStyle='#2a2a33';ctx.fillRect(x,y,w,hh)}
        ctx.restore();rects.push({i:q.i,x:x,y:y,w:w,h:hh});
      });
      ctx.globalAlpha=1;s.rects=rects;
    }
    if(calm){draw(0);Promise.all(loads).then(function(){draw(0)});return}
    interactive(h);
    function hit(e){var p=local(h,e);for(var k=s.rects.length-1;k>=0;k--){var q=s.rects[k];if(p[0]>=q.x&&p[0]<=q.x+q.w&&p[1]>=q.y&&p[1]<=q.y+q.h)return q.i}return -1}
    function release(){s.focus=-1;s.goalU=null;cap.hidden=true}
    h.addEventListener('pointermove',function(e){
      if(!s.down){s.hover=hit(e);return}
      var k=scale(h),dx=(e.clientX-s.down.x)*k,dy=(e.clientY-s.down.y)*k;s.down.x=e.clientX;s.down.y=e.clientY;s.down.moved+=Math.abs(dx)+Math.abs(dy);
      if(s.reveal)s.ang-=dx*.006;
      else if(s.focus<0){var dd=e.pointerType==='touch'?-dx:dy;s.u+=dd*.02;s.vel=dd*.02*60}
    });
    h.addEventListener('pointerleave',function(){s.hover=-1});
    h.addEventListener('pointerdown',function(e){
      if(e.button)return;s.down={x:e.clientX,y:e.clientY,moved:0,at:hit(e)};capture(h,e);
      clearTimeout(s.timer);s.timer=setTimeout(function(){if(s.down&&s.down.moved<8&&s.focus<0)s.reveal=true},380);
    });
    function up(){
      var d=s.down;clearTimeout(s.timer);s.down=null;if(!d)return;
      if(s.reveal){s.reveal=false;return}
      if(d.moved>6)return;
      if(s.focus>=0)release();
      else if(d.at>=0){
        // Fly to the card, the shortest way round, and show its caption.
        var goal=d.at+.1;goal+=Math.round((s.u-goal)/n)*n;s.goalU=goal;s.focus=s.lastFocus=d.at;s.vel=0;
        var it=its[order[d.at]];capB.textContent=it.title;capS.textContent=it.sub;cap.hidden=!(it.title||it.sub);
      }
    }
    h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up);
    wheel(h,function(dy){if(s.focus<0)s.vel+=dy*.01});
    if(slide)slide.addEventListener('slideleave',release);
    run(h,draw);
  }

  // ================= Album rail =================
  function albumrail(h){
    var its=items(h,10),n=its.length,W=h.offsetWidth||900,H=h.offsetHeight||460;
    var vinyl=flag(h,'vinyl',true),auto=flag(h,'autoplay',true),every=num(h,'interval',4);
    var stage=mk('div','fxp-ar-stage',h),capEl=mk('div','fxp-ar-cap',h),capB=mk('b',null,capEl),capS=mk('small',null,capEl);
    var ctl=mk('div','fxp-ar-ctl',h),prevB=mk('button',null,ctl),ruler=mk('div','fxp-ar-ruler',ctl),ticks=its.map(function(){return mk('span',null,ruler)}),mark=mk('i',null,ruler);
    var play=vinyl?mk('button','fxp-ar-play',ctl):null,nextB=mk('button',null,ctl);
    prevB.textContent='‹';nextB.textContent='›';prevB.setAttribute('aria-label','Previous');nextB.setAttribute('aria-label','Next');
    var ch=Math.min((H-110)*.78,W*.36),cw=ch,covers=[],discs=[];
    its.forEach(function(it,i){
      var c=mk('div','fxp-ar-cover',stage);c.setAttribute('data-i',i);
      c.style.width=cw+'px';c.style.height=ch+'px';c.style.marginLeft=(-cw/2)+'px';c.style.marginTop=(-ch/2)+'px';
      if(vinyl){var d=mk('div','fxp-ar-disc',c);d.style.background='radial-gradient(circle,'+it.color+' 0 16%,#131116 17% 19%,transparent 20%),repeating-radial-gradient(circle,#131116 0 2px,#26232c 3px 4px)';discs.push(d)}
      mk('div','fxp-ar-sleeve',c).style.backgroundImage=bg(it.src);covers.push(c);
    });
    var pos=spr(0),target=0,idx=-1,playing=false,spin=0,out=spr(0),peek=false,hover=false,timer=0,drag=null;
    function wrap(i){return ((i%n)+n)%n}
    function go(t){target=t;timer=0}
    function setIdx(i){
      idx=i;playing=false;capB.textContent=its[i].title;capS.textContent=its[i].sub;
      ticks.forEach(function(t,k){t.className=k===i?'on':''});mark.style.background=its[i].color;
      if(play){play.style.background=its[i].color;play.textContent='▶'}
    }
    function setPlay(v){playing=v;if(play)play.textContent=v?'❚❚':'▶'}
    function layout(p){
      for(var i=0;i<n;i++){
        var c=covers[i],d=i-p;d=((((d+n/2)%n)+n)%n)-n/2;var ad=Math.abs(d),sg=d<0?-1:d>0?1:0;
        if(ad>4){c.style.visibility='hidden';continue}c.style.visibility='';
        var near=Math.min(ad,1),far=Math.max(0,ad-1);
        c.style.transform='translate3d('+(sg*(near*.72*cw+far*.27*cw))+'px,'+(near*ch*.035+far*ch*.03)+'px,'+(-near*.45*cw-far*.15*cw)+'px) rotateY('+(-sg*(near*22+far*4))+'deg) rotateZ('+(sg*(near*6+far*2))+'deg) scale('+(1-near*.1-far*.05)+')';
        c.style.opacity=ad>3?Math.max(0,1-(ad-3)):1;c.style.filter='brightness('+(1-.45*Math.min(ad/3,1))+')';c.style.zIndex=1000-Math.round(ad*10);
        if(vinyl)discs[i].style.transform=i===idx?'translateX('+out.x*cw+'px) rotate('+spin+'deg)':'';
      }
      mark.style.left=(n>1?wrap(p)/(n-1)*100:0)+'%';
    }
    setIdx(0);layout(0);if(calm)return;interactive(h);
    h.addEventListener('pointerenter',function(){hover=true});
    h.addEventListener('pointerleave',function(){hover=false;peek=false});
    stage.addEventListener('pointerdown',function(e){if(e.button)return;var c=e.target.closest('.fxp-ar-cover');drag={x:e.clientX,last:e.clientX,p0:pos.x,vel:0,moved:0,on:c?+c.getAttribute('data-i'):-1,k:scale(h)};capture(stage,e)});
    stage.addEventListener('pointermove',function(e){
      if(!drag){var c=e.target.closest('.fxp-ar-cover');peek=!!c&&+c.getAttribute('data-i')===idx;return}
      var dx=(e.clientX-drag.x)*drag.k;drag.moved=Math.max(drag.moved,Math.abs(dx));pos.x=drag.p0-dx/(.72*cw);
      drag.vel=-(e.clientX-drag.last)*drag.k/(.72*cw)*60;drag.last=e.clientX;
    });
    function up(){
      var d=drag;drag=null;if(!d)return;pos.v=0;
      if(d.moved<5&&d.on>=0){if(d.on===idx){if(vinyl)setPlay(!playing)}else{var k=d.on-wrap(target);if(Math.abs(k)>n/2)k-=(k>0?1:-1)*n;go(target+k)}return}
      go(Math.round(pos.x+d.vel*.18));
    }
    stage.addEventListener('pointerup',up);stage.addEventListener('pointercancel',up);
    prevB.addEventListener('click',function(){go(target-1)});nextB.addEventListener('click',function(){go(target+1)});
    if(play)play.addEventListener('click',function(){setPlay(!playing)});
    function scrub(e){var r=ruler.getBoundingClientRect(),t=Math.round(clamp((e.clientX-r.left)/r.width,0,1)*(n-1));go(target+(t-wrap(target)))}
    ruler.addEventListener('pointerdown',function(e){capture(ruler,e);scrub(e)});
    ruler.addEventListener('pointermove',function(e){if(e.buttons)scrub(e)});
    wheel(h,function(dy,dx){var d=Math.abs(dy)>Math.abs(dx)?dy:dx;if(Math.abs(d)>2)go(target+(d>0?1:-1))});
    run(h,function(dt){
      if(auto&&!drag&&!playing&&!hover){timer+=dt;if(timer>every)go(target+1)}
      var p=drag?pos.x:spring(pos,target,120,22,dt),i=wrap(Math.round(p));if(i!==idx)setIdx(i);
      if(playing)spin+=dt*33*6;spring(out,playing?.52:peek?.14:0,90,16,dt);layout(p);
    });
  }

  // ================= Elastic reel =================
  function reel(h){
    var its=items(h,12),n=its.length,mode=attr(h,'mode','sweep'),gap=10,radius=12,mag=2.4,lift=1.15,inf=num(h,'influence',200),capH=56;
    var bars=its.map(function(it){var b=mk('div','fxp-re-bar',h);b.style.backgroundImage=bg(it.src);return b});
    var big=mk('div','fxp-re-big',h),cap=mk('div','fxp-re-cap',h),capB=mk('b',null,cap),capS=mk('small',null,cap);
    var ws=its.map(function(){return spr(0)}),hs=its.map(function(){return spr(0)}),px=null,sweep=0,dir=1,hover=false,open=-1,shown=-1,p=spr(0),timer=0,rests=[],down=0;
    function openAt(i){if(i<0)open=-1;else{if(shown>=0&&p.x>.5)p.x=.82;open=shown=((i%n)+n)%n}timer=0}
    function frame(dt){
      var W=h.offsetWidth,H=h.offsetHeight;if(!W||!H)return;
      var bw=Math.max(6,Math.min(44,(W*.9-gap*(n-1))/n)),bh=.5*(H-capH),start=(W-(bw*n+gap*(n-1)))/2,i;
      rests=its.map(function(_,k){return start+k*(bw+gap)+bw/2});
      var fx=px;
      if(fx===null&&mode==='sweep'&&!hover&&open<0&&dt){sweep+=dir*1.4*dt;if(sweep>n-1){sweep=n-1;dir=-1}if(sweep<0){sweep=0;dir=1}}
      if(fx===null&&mode==='sweep'&&open<0)fx=lerp(rests[0],rests[n-1],n>1?sweep/(n-1):0);
      if(mode==='cycle'&&!hover&&dt){timer+=dt;if(timer>4)openAt(open<0?0:open+1)}
      var near=-1,best=1e9,W2=[],H2=[];
      for(i=0;i<n;i++){
        var g=fx===null?0:Math.exp(-Math.pow((rests[i]-fx)/inf,2)*2.2),dd=fx===null?1e9:Math.abs(rests[i]-fx);
        if(dd<best){best=dd;near=i}
        var tw=bw*(1+(mag-1)*g),th=bh*(1+(lift-1)*g);
        W2.push(dt?spring(ws[i],tw,260,20,dt):(ws[i].x=tw));H2.push(dt?spring(hs[i],th,260,20,dt):(hs[i].x=th));
      }
      var showing=open>=0?open:shown;
      if(showing>=0){capB.textContent=its[showing].title;capS.textContent=its[showing].sub}
      else if(px!==null&&near>=0){capB.textContent=its[near].title;capS.textContent=''}
      else{capB.textContent='';capS.textContent=''}
      var sum=W2.reduce(function(a,b){return a+b},0)+gap*(n-1),x=(W-sum)/2,mid=(H-capH)/2,pp=dt?clamp(spring(p,open>=0?1:0,170,18,dt),0,1.08):(p.x=open>=0?1:0);
      if(open<0&&pp<.01)shown=-1;
      var from=null;
      for(i=0;i<n;i++){
        var w=W2[i],hh=H2[i],y=mid-hh/2,el=bars[i],q=Math.min(1,pp);
        if(i===shown)from={x:x,y:y,w:w,h:hh};
        el.style.transform='translate('+x+'px,'+y+'px)';el.style.width=w+'px';el.style.height=hh+'px';el.style.borderRadius=Math.min(radius,w/2)+'px';
        el.style.filter=shown>=0&&q>.01?'blur('+(q*4)+'px)':'';
        el.style.opacity=i===shown&&q>.02?0:1-(shown>=0?q*.45:0);
        x+=w+gap;
      }
      if(shown<0||!from){big.style.display='none';return}
      var oh=.72*(H-capH),ow=Math.min(W*.92,oh),to={x:(W-ow)/2,y:(H-capH-oh)/2,w:ow,h:oh};
      big.style.display='block';big.style.backgroundImage=bg(its[shown].src);
      big.style.transform='translate('+lerp(from.x,to.x,pp)+'px,'+lerp(from.y,to.y,pp)+'px)';
      big.style.width=Math.max(1,lerp(from.w,to.w,pp))+'px';big.style.height=Math.max(1,lerp(from.h,to.h,pp))+'px';
      big.style.borderRadius=lerp(Math.min(radius,from.w/2),radius*1.4,Math.min(1,pp))+'px';
    }
    if(calm){frame(0);return}
    interactive(h);
    function nearest(x){var b=0;rests.forEach(function(c,i){if(Math.abs(c-x)<Math.abs(rests[b]-x))b=i});return b}
    h.addEventListener('pointerenter',function(){hover=true});
    h.addEventListener('pointermove',function(e){px=local(h,e)[0]});
    h.addEventListener('pointerleave',function(){hover=false;px=null});
    h.addEventListener('pointerdown',function(e){down=e.clientX});
    h.addEventListener('pointerup',function(e){
      var dx=(e.clientX-down)*scale(h);
      if(open>=0&&Math.abs(dx)>50){openAt(open+(dx<0?1:-1));return}
      if(Math.abs(dx)>6)return;
      if(open>=0)openAt(-1);else openAt(nearest(local(h,e)[0]));
    });
    wheel(h,function(dy,dx){var d=(Math.abs(dy)>Math.abs(dx)?dy:dx)>0?1:-1;if(open>=0)openAt(open+d)});
    var slide=h.closest('.slide');if(slide)slide.addEventListener('slideleave',function(){openAt(-1)});
    run(h,frame);
  }

  // ================= Elastic sticker =================
  var topZ=50;
  var FLAPS={
    tr:{tri:'polygon(0 0,100% 100%,0 100%)',grad:'to bottom left',at:function(W,H,f){return [W-f,0]}},
    tl:{tri:'polygon(100% 0,0 100%,100% 100%)',grad:'to bottom right',at:function(){return [0,0]}},
    br:{tri:'polygon(100% 0,0 100%,0 0)',grad:'to top left',at:function(W,H,f){return [W-f,H-f]}},
    bl:{tri:'polygon(0 0,100% 100%,100% 0)',grad:'to top right',at:function(W,H,f){return [0,H-f]}}
  };
  function clipFor(c,W,H,f){
    if(f<.5)return 'none';
    var P=function(pts){return 'polygon('+pts.map(function(q){return q[0]+'px '+q[1]+'px'}).join(',')+')'};
    if(c==='tr')return P([[0,0],[W-f,0],[W,f],[W,H],[0,H]]);
    if(c==='tl')return P([[f,0],[W,0],[W,H],[0,H],[0,f]]);
    if(c==='br')return P([[0,0],[W,0],[W,H-f],[W-f,H],[0,H]]);
    return P([[0,0],[W,0],[W,H],[f,H],[0,H-f]]);
  }
  function sticker(h){
    var W=h.offsetWidth||200,H=h.offsetHeight||200,finish=attr(h,'finish','gloss'),rot=num(h,'rotation',-6),border=num(h,'border',8);
    var round=attr(h,'shape','rounded')==='circle',radius=round?Math.min(W,H)/2:Math.min(W,H)*.1,back='#E9E7EF';
    var src=pic(h.getAttribute('data-src'))||art(num(h,'art',1));
    var inn=mk('div','fxp-in',h),shadow=mk('div','fxp-st-shadow',inn),tilt=mk('div','fxp-st-tilt',shadow),clip=mk('div','fxp-st-clip',tilt);
    var face=mk('div','fxp-st-face',clip);face.style.borderRadius=radius+'px';face.style.border=border+'px solid #fff';face.style.backgroundImage=bg(src);
    var gloss=null;
    if(finish!=='matte'){
      gloss=mk('div','fxp-st-gloss'+(finish==='holo'?' holo':''),face);
      gloss.style.backgroundImage=finish==='holo'?'linear-gradient(115deg,#ff0080,#ffd000,#00ff9c,#00c8ff,#8a2bff,#ff0080)':'linear-gradient(115deg,transparent 35%,#fff 50%,transparent 65%)';
      gloss.style.opacity=finish==='holo'?.33:.27;
    }
    var flapBox=mk('div','fxp-st-flapbox',tilt),flap=mk('div','fxp-st-flap',flapBox);
    var x=spr(),y=spr(),gx=0,gy=0,lf=spr(),rx=spr(),ry=spr(),peel=spr(),peelGoal=0,corner='tr',held=false,hover=false,o=null,vx=0,vy=0,idle=0,hint=0;
    function paint(){
      inn.style.transform='translate3d('+x.x+'px,'+y.x+'px,0) rotate('+rot+'deg)';
      tilt.style.transform='perspective(700px) rotateX('+rx.x+'deg) rotateY('+ry.x+'deg) scale('+(1+lf.x*.08)+')';
      shadow.style.filter='drop-shadow('+(ry.x*.4)+'px '+(3+lf.x*28)+'px '+(4+lf.x*32)+'px rgba(0,0,0,'+(.35-lf.x*.1)+'))';
      var f=Math.max(0,peel.x),fl=FLAPS[corner],at=fl.at(W,H,f);
      clip.style.clipPath=clipFor(corner,W,H,f);
      flapBox.style.display=f<.5?'none':'block';flapBox.style.left=at[0]+'px';flapBox.style.top=at[1]+'px';flapBox.style.width=flapBox.style.height=f+'px';
      flap.style.clipPath=fl.tri;flap.style.background='linear-gradient('+fl.grad+',#fff 0%,'+back+' 50%,'+back+' 62%,#b9b6c4 100%)';
      if(gloss)gloss.style.backgroundPosition=(50+ry.x*2.2-rx.x*1.2+f*.25)+'% '+(50+rx.x*2)+'%';
    }
    paint();if(calm)return;interactive(h);
    var slide=h.closest('.slide')||h.parentElement;
    function bounds(){return {x0:-h.offsetLeft,x1:slide.offsetWidth-h.offsetLeft-W,y0:-h.offsetTop,y1:slide.offsetHeight-h.offsetTop-H}}
    function rubber(v,a,b){return v<a?a-(a-v)*.3:v>b?b+(v-b)*.3:v}
    function nearCorner(lx,ly){
      var c=(ly<H/2?'t':'b')+(lx<W/2?'l':'r'),cx=c[1]==='l'?0:W,cy=c[0]==='t'?0:H;
      return [c,clamp(1-Math.hypot(lx-cx,ly-cy)/(Math.min(W,H)*.75),0,1)];
    }
    h.addEventListener('pointerenter',function(){hover=true});
    h.addEventListener('pointerleave',function(){hover=false;if(!held)peelGoal=0});
    h.addEventListener('pointerdown',function(e){
      if(e.button)return;held=true;idle=0;var k=scale(slide);
      o={k:k,x:e.clientX,y:e.clientY,bx:x.x,by:y.x,lx:e.clientX,ly:e.clientY,t:performance.now()};
      peelGoal=.06;h.style.zIndex=String(++topZ);capture(h,e);
    });
    h.addEventListener('pointermove',function(e){
      idle=0;
      if(!held){
        var r=tilt.getBoundingClientRect(),c=nearCorner((e.clientX-r.left)/r.width*W,(e.clientY-r.top)/r.height*H);
        if(c[0]!==corner&&peel.x>4){peelGoal=0;return}
        corner=c[0];peelGoal=.5*(.08+.3*c[1]);return;
      }
      var now=performance.now(),dts=Math.max(1,now-o.t)/1000;
      vx=vx*.6+(e.clientX-o.lx)*o.k/dts*.4;vy=vy*.6+(e.clientY-o.ly)*o.k/dts*.4;o.lx=e.clientX;o.ly=e.clientY;o.t=now;
      var B=bounds(),nx=rubber(o.bx+(e.clientX-o.x)*o.k,B.x0,B.x1),ny=rubber(o.by+(e.clientY-o.y)*o.k,B.y0,B.y1);
      x.x=gx=nx;y.x=gy=ny;x.v=y.v=0;
    });
    function up(){if(!held)return;held=false;peelGoal=0;var B=bounds();gx=clamp(gx,B.x0,B.x1);gy=clamp(gy,B.y0,B.y1)}
    h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up);
    run(h,function(dt){
      var damp=2*Math.sqrt(300)*.6;
      if(!held){spring(x,gx,160,22,dt);spring(y,gy,160,22,dt);vx*=Math.pow(.001,dt);vy*=Math.pow(.001,dt)}
      spring(lf,held?1:0,220,20,dt);spring(rx,clamp(-vy*.03,-28,28),300,damp,dt);spring(ry,clamp(vx*.03,-28,28),300,damp,dt);
      // Now and then lift a corner, to show it can be peeled.
      idle+=dt;
      if(!held&&!hover){hint-=dt;if(idle>3.5&&hint<=0){hint=4+Math.random()*3;corner=['tr','br','tl','bl'][Math.floor(Math.random()*4)];peelGoal=.2;setTimeout(function(){if(!hover&&!held)peelGoal=0},700)}}
      spring(peel,peelGoal*Math.min(W,H),180,16,dt);paint();
    });
  }

  // ================= Scroll bend =================
  function bend(h){
    var its=items(h,8),horiz=attr(h,'orientation','vertical')==='horizontal',drift=num(h,'drift',50),ar=horiz?.78:1.35;
    var cv=mk('canvas',null,h),ctx=glx(cv,LENS);if(!ctx){cv.remove();return}
    var s={pos:0,vel:0,b:spr(0),ready:false,drag:null,quiet:1,ratio:1.07,hover:false};
    function frame(dt){
      var W=h.offsetWidth,H=h.offsetHeight;if(!W||!H||!s.ready)return;
      var across=.68*Math.min(W,H),along=horiz?across*ar:across/ar,pitch=along*s.ratio;
      if(dt){
        s.quiet+=dt;
        if(!s.drag){s.pos+=s.vel*dt;s.vel*=Math.pow(.02,dt/.55);if(s.quiet>.8)s.pos+=drift*dt;
          if(drift===0&&s.quiet>.15&&Math.abs(s.vel)<40){var t=Math.round(s.pos/pitch)*pitch;s.pos+=(t-s.pos)*Math.min(1,dt*8)}}
        var v=s.drag?s.vel:s.vel+(s.quiet>.8?drift:0),amt=Math.min(.38,Math.abs(v)/1000*.6);
        spring(s.b,(v<0?-1:1)*amt,40/(.32*.32),2*Math.sqrt(40/(.32*.32))*.8,dt);
      }
      var d=Math.min(2,window.devicePixelRatio||1);ctx.size(W,H,d);
      ctx.set('uScroll',s.pos/pitch+.5);ctx.set('uCount',its.length);ctx.set('uPitch',pitch*d);ctx.set('uTileW',across*d);
      ctx.set('uBend',s.b.x);ctx.set('uHoriz',horiz?1:0);ctx.draw();
    }
    // Paint every tile, with its gap and rounded corners, into one tall texture.
    Promise.all(its.map(function(it,i){return load(it.src,true).then(function(im){return im||load(art(i),true)})})).then(function(imgs){
      var tw=512,th=Math.round(tw/ar),tile=horiz?{w:th,h:tw}:{w:tw,h:th},gp=Math.round(16/240*tile.h),pitch=tile.h+gp;
      var a=document.createElement('canvas');a.width=tile.w;a.height=pitch*imgs.length;var c=a.getContext('2d');
      imgs.forEach(function(im,i){
        if(!im)return;var y=i*pitch+gp/2;c.save();c.beginPath();if(c.roundRect)c.roundRect(0,y,tile.w,tile.h,18/240*Math.min(tile.w,tile.h));else c.rect(0,y,tile.w,tile.h);c.clip();
        if(horiz){c.translate(tile.w/2,y+tile.h/2);c.transform(0,1,1,0,0,0);var s2=Math.max(tile.h/im.width,tile.w/im.height);c.drawImage(im,-im.width*s2/2,-im.height*s2/2,im.width*s2,im.height*s2)}
        else{var k=Math.max(tile.w/im.width,tile.h/im.height);c.drawImage(im,(tile.w-im.width*k)/2,y+(tile.h-im.height*k)/2,im.width*k,im.height*k)}
        c.restore();
      });
      try{ctx.tex('uTex',a)}catch(_){return}
      s.ratio=pitch/tile.h;s.ready=true;
      if(calm){frame(0);if(still)freeze(cv,ctx)}
    });
    if(calm)return;interactive(h);
    function move(d){s.vel+=d;s.quiet=0}
    h.addEventListener('pointerenter',function(){s.hover=true});
    h.addEventListener('pointerleave',function(){s.hover=false});
    h.addEventListener('pointerdown',function(e){if(e.button)return;s.drag={last:horiz?e.clientX:e.clientY,k:scale(h)};s.vel=0;s.quiet=0;capture(h,e)});
    h.addEventListener('pointermove',function(e){if(!s.drag)return;var p=horiz?e.clientX:e.clientY,d=(s.drag.last-p)*s.drag.k;s.drag.last=p;s.pos+=d;s.vel=s.vel*.5+d*30;s.quiet=0});
    function up(){s.drag=null;s.quiet=0}
    h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up);
    wheel(h,function(dy,dx){move((horiz?dx||dy:dy)*6)});
    run(h,frame);
  }

  // ================= Depth card =================
  function depthcard(h){
    var inn=h.querySelector('.fxp-in');if(!inn)return;
    var bgEl=inn.querySelector('.fxp-dc-bg'),layer=inn.querySelector('.fxp-dc-layer'),spot=inn.querySelector('.fxp-dc-spot');
    if(bgEl&&!bgEl.style.backgroundImage)bgEl.style.backgroundImage=bg(art(5));
    if(calm)return;
    var tx=0,ty=0,x=0,y=0,on1=0,sx=50,sy=50,inside=false,M=20,R=18;
    h.addEventListener('pointermove',function(e){var p=local(h,e),px=p[0]/h.offsetWidth,py=p[1]/h.offsetHeight;tx=px*2-1;ty=py*2-1;sx=px*100;sy=py*100;inside=true});
    h.addEventListener('pointerleave',function(){inside=false});
    run(h,function(dt){
      var k=Math.min(1,dt*8);x+=((inside?tx:0)-x)*k;y+=((inside?ty:0)-y)*k;on1+=((inside?1:0)-on1)*k;
      inn.style.transform='perspective(800px) rotateX('+(-y*R)+'deg) rotateY('+(x*R)+'deg) scale('+(1+on1*.03)+')';
      if(bgEl)bgEl.style.transform='translate('+(-x*M*.5)+'px,'+(-y*M*.5)+'px) scale(1.08)';
      if(layer)layer.style.transform='translate('+(x*M)+'px,'+(y*M)+'px)';
      if(spot){spot.style.opacity=on1;spot.style.background='radial-gradient(circle at '+sx+'% '+sy+'%,rgba(255,255,255,.5),transparent 55%)'}
    });
  }

  // ================= Lenticular carousel =================
  function lenticular(h){
    var lines=(h.getAttribute('data-items')||'').split(/\n/).filter(function(l){return l.trim()}),list=[];
    lines.forEach(function(l,i){var p=l.split('|').map(function(s){return s.trim()});list.push({front:pic(p[0])||art(i),back:pic(p[1])||art(i+4),label:p[2]||''})});
    if(!list.length)for(var i=0;i<8;i++)list.push({front:art(i),back:art(i+4),label:TITLES[i]});
    var n=list.length,loop=flag(h,'loop',false),W=h.offsetWidth||900,H=h.offsetHeight||460;
    var ch=Math.max(80,H-70),cw=ch*.75,gap=Math.round(cw*.13),S=Math.max(8,Math.min(48,Math.round(cw/7))),sw=cw/S,index=Math.min(2,n-1);
    if(cw*1.2>W){cw=W/1.2;ch=cw/.75;sw=cw/S}
    var view=mk('div','fxp-le-view',h);view.style.height=(ch+30)+'px';
    var track=mk('div','fxp-le-track',view);track.style.gap=gap+'px';
    var slides=[],rows=[],inners=[],foils=[],turns=list.map(function(){return spr(0)}),goals=list.map(function(){return 0});
    list.forEach(function(it,i){
      var sl=mk('div','fxp-le-slide',track);sl.style.width=cw+'px';sl.style.height=ch+'px';sl.style.perspective='1200px';
      var inner=mk('div','fxp-le-inner',sl),row=[];
      for(var j=0;j<S;j++){
        var st=mk('div','fxp-le-strip',inner);st.style.left=(j*sw)+'px';st.style.width=(sw+.6)+'px';
        var a=mk('div','fxp-le-face',st);a.style.backgroundImage=bg(it.front);a.style.backgroundSize=cw+'px '+ch+'px';a.style.backgroundPosition=(-j*sw)+'px 0';
        var b=mk('div','fxp-le-face back',st);b.style.backgroundImage=bg(it.back);b.style.backgroundSize=(cw*1.025)+'px '+(ch*1.025)+'px';b.style.backgroundPosition=(-j*sw-cw*.013)+'px '+(-ch*.013)+'px';
        row.push(st);
      }
      var ribs=mk('div','fxp-le-ribs',inner);ribs.style.backgroundImage='repeating-linear-gradient(90deg,rgba(0,0,0,.11) 0,rgba(255,255,255,.06) '+(sw*.45)+'px,rgba(0,0,0,.11) '+sw+'px)';
      foils.push(mk('div','fxp-le-foil',inner));
      if(it.label)mk('div','fxp-le-label',inner).textContent=it.label;
      slides.push(sl);rows.push(row);inners.push(inner);
      sl.addEventListener('pointermove',function(e){var r=sl.getBoundingClientRect();goals[i]=i===index?clamp((e.clientX-r.left)/r.width/.64,0,1):0});
      sl.addEventListener('pointerleave',function(){goals[i]=0});
      sl.addEventListener('click',function(){if(i!==index)go(i)});
    });
    var ctl=mk('div','fxp-le-ctl',h),prevB=mk('button',null,ctl),rail=mk('div','fxp-le-rail',ctl),nextB=mk('button',null,ctl);
    prevB.textContent='‹';nextB.textContent='›';
    var dots=list.map(function(_,i){var d=mk('span',null,rail);d.addEventListener('click',function(){go(i)});return d});
    function go(i){
      index=loop?((i%n)+n)%n:clamp(i,0,n-1);
      track.style.transform='translateX('+(-(index*(cw+gap)+cw/2))+'px)';
      slides.forEach(function(s,k){s.style.transform='scale('+(k===index?1:.9)+')';s.style.filter=k===index?'':'brightness(.56)'});
      dots.forEach(function(d,k){d.className=k===index?'on':''});
      prevB.disabled=!loop&&index===0;nextB.disabled=!loop&&index===n-1;
    }
    go(index);if(calm)return;interactive(h);
    prevB.addEventListener('click',function(){go(index-1)});nextB.addEventListener('click',function(){go(index+1)});
    var dx0=null;
    view.addEventListener('pointerdown',function(e){dx0=e.clientX});
    view.addEventListener('pointerup',function(e){if(dx0===null)return;var d=(e.clientX-dx0)*scale(h);dx0=null;if(Math.abs(d)>40)go(index+(d<0?1:-1))});
    run(h,function(dt){
      for(var i=0;i<n;i++){
        var sp=turns[i],before=sp.x,t=spring(sp,goals[i],90,17,dt);
        if(Math.abs(t-before)<1e-5&&Math.abs(sp.v)<1e-4)continue;
        var bump=Math.sin(Math.PI*clamp(t,0,1));
        inners[i].style.transform='translateZ('+(bump*40)+'px) rotateY('+((t-.5)*28*bump)+'deg)';
        for(var j=0;j<S;j++)rows[i][j].style.transform='rotateY('+(clamp(t*1.6-j/S*.6,0,1)*180)+'deg)';
        foils[i].style.opacity=(.5*(.25+bump*.75)).toFixed(3);foils[i].style.backgroundPosition=(t*160)+'% 50%';
      }
    });
  }

  // ================= Text path =================
  function textpath(h){
    var tp=h.querySelector('textPath'),path=h.querySelector('path'),m=h.querySelector('.fxp-tp-m');if(!tp||!path||!m)return;
    var unit=m.textContent,copy=m.getComputedTextLength(),L=path.getTotalLength();if(!copy||!L)return;
    if(flag(h,'closed',false)){
      // Around a closed path, stretch the spacing so a whole number of copies meets itself without a seam.
      var k=Math.max(1,Math.round(L/copy)),tx=tp.parentNode,chars=Math.max(1,unit.length);
      var ls=(parseFloat(getComputedStyle(tx).fontSize)||16)*.06+(L/k-copy)/chars;
      tp.textContent=new Array(k+2).join(unit);tx.style.letterSpacing=ls+'px';
      // Text on a curve loses kerning, so measure it there and correct twice.
      for(var it=0;it<2;it++){ls+=(L/k-tx.getComputedTextLength()/(k+1))/chars;tx.style.letterSpacing=ls+'px'}
      copy=L/k;
    }else tp.textContent=new Array(Math.ceil(L/copy)+3).join(unit);
    var secs=num(h,'speed',18),rev=flag(h,'reversed',false),off=0;
    tp.setAttribute('startOffset',String(rev?-copy:0));
    if(calm||secs<=0)return;
    run(h,function(dt){off=(off+L/secs*dt)%copy;tp.setAttribute('startOffset',String(rev?-copy+off:-off))});
  }

  // ================= Custom cursor =================
  var TARGETS={buttons:'a,button,.btn,.el-button',cards:'a,button,.btn,.el-button,.kpi,.glass,.card,.fx3-card,.fxp-rc-card,.el-icon',none:''};
  function cursor(h){
    if(calm)return;
    var slide=h.closest('.slide');if(!slide||slide.__fxpCursor)return;slide.__fxpCursor=1;
    var size=num(h,'size',40),elastic=flag(h,'elastic',true),sel=TARGETS[attr(h,'targets','cards')];if(sel==null)sel=TARGETS.cards;
    var col=hex(h.getAttribute('data-color'))||theme(slide,'--fg',[1,1,1]);
    var ring=mk('div','fxp-cur-ring',slide),dot=mk('div','fxp-cur-dot',slide);
    ring.style.borderColor=rgb(col);dot.style.background=rgb(col);dot.style.width=dot.style.height=Math.max(4,size*.15)+'px';
    slide.classList.add('fxp-cur-on');
    var px=0,py=0,inside=false,seen=false,T=null,rx=spr(),ry=spr(),rw=spr(size),rh=spr(size),rr=spr(size/2),dx=spr(),dy=spr(),vis=spr(0);
    slide.addEventListener('pointermove',function(e){
      var r=slide.getBoundingClientRect(),s=slide.offsetWidth/(r.width||1);px=(e.clientX-r.left)*s;py=(e.clientY-r.top)*s;
      if(!seen){rx.x=dx.x=px;ry.x=dy.x=py;seen=true}inside=e.pointerType!=='touch';
      var t=sel&&e.target.closest?e.target.closest(sel):null;
      if(t&&t!==slide&&slide.contains(t)){var a=t.getBoundingClientRect(),pad=6;T={x:(a.left-r.left)*s-pad,y:(a.top-r.top)*s-pad,w:a.width*s+pad*2,h:a.height*s+pad*2,r:(parseFloat(getComputedStyle(t).borderTopLeftRadius)||10)+pad}}
      else T=null;
    });
    slide.addEventListener('pointerleave',function(){inside=false;T=null});
    slide.addEventListener('slideleave',function(){inside=false;T=null});
    run(h,function(dt){
      if(!seen)return;
      var cx=T?T.x+T.w/2:px,cy=T?T.y+T.h/2:py,x=spring(rx,cx,150,20,dt),y=spring(ry,cy,150,20,dt);
      var w=spring(rw,T?T.w:size,150,20,dt),hh=spring(rh,T?T.h:size,150,20,dt),r=spring(rr,T?T.r:size/2,150,20,dt);
      var ddx=spring(dx,px,300,30,dt),ddy=spring(dy,py,300,30,dt),v=spring(vis,inside?1:0,200,26,dt),st='';
      if(elastic&&!T){var sp=Math.hypot(rx.v,ry.v),k=Math.min(.45,sp/2600),an=Math.atan2(ry.v,rx.v);st=' rotate('+an+'rad) scale('+(1+k)+','+(1-k*.6)+') rotate('+(-an)+'rad)'}
      ring.style.transform='translate('+(x-w/2)+'px,'+(y-hh/2)+'px)'+st;ring.style.width=w+'px';ring.style.height=hh+'px';ring.style.borderRadius=r+'px';ring.style.opacity=v;
      var ds=dot.offsetWidth;dot.style.transform='translate('+(ddx-ds/2)+'px,'+(ddy-ds/2)+'px)';dot.style.opacity=v;
    });
  }

  // ================= Parallax pills =================
  function pills(h){
    var labels=(h.getAttribute('data-items')||'').split('|').map(function(s){return s.trim()}).filter(Boolean);
    var W=h.offsetWidth||900,H=h.offsetHeight||400,ph=num(h,'size',64),strength=num(h,'strength',24),extras=flag(h,'extras',true);
    var slide=h.closest('.slide'),ref=slide||h,seed=11;
    function rnd(){seed=seed*16807%2147483647;return (seed-1)/2147483646}
    var cols=[theme(ref,'--accent',[.32,.15,1]),theme(ref,'--c2',[1,.37,.43]),theme(ref,'--c3',[0,.79,.65]),[1,1,1],[1,.75,.04]];
    var list=[];
    if(extras)for(var e=0;e<6;e++){
      var bp=mk('div','fxp-pill fxp-pill-empty',h),bw=ph*(1.6+rnd()*1.6);bp.style.width=bw+'px';bp.style.height=ph+'px';bp.style.borderRadius=ph*.3+'px';
      list.push({el:bp,x:rnd()*(W-bw),y:rnd()*(H-ph),rot:(rnd()-.5)*30,depth:.35+rnd()*.25,start:e*.04});
    }
    var made=labels.map(function(t,i){
      var p=mk('div','fxp-pill',h),c=cols[i%cols.length];p.textContent=t;p.style.background=rgb(c);
      p.style.color=(.2126*c[0]+.7152*c[1]+.0722*c[2])>.6?'#141414':'#fff';
      p.style.height=ph+'px';p.style.fontSize=Math.round(ph*.32)+'px';p.style.padding='0 '+Math.round(ph*.45)+'px';p.style.borderRadius=Math.round(ph*.3)+'px';
      return p;
    });
    // Lay the labelled pills out in loose rows, centred, with a little tilt.
    var widths=made.map(function(p){return p.offsetWidth||ph*3}),gap=ph*.35,rows=[[]],rw=0;
    widths.forEach(function(w,i){if(rows[rows.length-1].length&&rw+w>W*.9){rows.push([]);rw=0}rows[rows.length-1].push(i);rw+=w+gap});
    var rowH=ph*1.55,top=(H-rows.length*rowH)/2+(rowH-ph)/2,order=0;
    rows.forEach(function(r,ri){
      var tw=r.reduce(function(s,i){return s+widths[i]},0)+gap*(r.length-1),x=(W-tw)/2;
      r.forEach(function(i){list.push({el:made[i],x:x+(rnd()-.5)*gap,y:top+ri*rowH+(rnd()-.5)*ph*.3,rot:(rnd()-.5)*14,depth:.6+rnd()*.5,start:.2+order++*.08});x+=widths[i]+gap});
    });
    var clock=0,mx=0,my=0;
    function reset(){
      clock=0;
      list.forEach(function(L){
        var hinge=rnd()<.5?(rnd()<.5?-1:1):0;
        L.ys=spr(calm?0:-ph*2.2-40);L.rs=spr(calm?0:hinge*18);L.px=spr();L.py=spr();
        L.el.style.transformOrigin=hinge<0?'0% 50%':'100% 50%';
      });
    }
    function paint(dt){
      clock+=dt;
      list.forEach(function(L){
        var go=calm||clock>=L.start;
        if(go&&dt){spring(L.ys,0,140,11,dt);spring(L.rs,0,112,9,dt);spring(L.px,mx*strength*L.depth,60,18,dt);spring(L.py,my*strength*L.depth,60,18,dt)}
        L.el.style.opacity=go?1:0;
        L.el.style.transform='translate('+(L.x+L.px.x)+'px,'+(L.y+L.ys.x+L.py.x)+'px) rotate('+(L.rot+L.rs.x)+'deg)';
      });
    }
    reset();paint(0);if(calm)return;
    h.addEventListener('pointermove',function(e){var p=local(h,e);mx=p[0]/h.offsetWidth*2-1;my=p[1]/h.offsetHeight*2-1});
    h.addEventListener('pointerleave',function(){mx=my=0});
    if(slide)slide.addEventListener('slideenter',reset);
    run(h,paint);
  }

  var KINDS={rotcards:rotcards,shadercard:shadercard,ribbon:ribbon,albumrail:albumrail,reel:reel,sticker:sticker,bend:bend,depthcard:depthcard,lenticular:lenticular,textpath:textpath,cursor:cursor,pills:pills};
  // Builders that make their own contents start from an empty element.
  var BUILT={rotcards:1,ribbon:1,albumrail:1,reel:1,sticker:1,bend:1,lenticular:1,pills:1};
  function init(scope){
    Object.keys(KINDS).forEach(function(k){
      [].forEach.call(scope.querySelectorAll('.fxp-'+k),function(h){
        if(h.__fxp)return;h.__fxp=1;if(BUILT[k])h.textContent='';
        try{KINDS[k](h)}catch(err){if(window.console)console.warn('fxp-'+k,err)}
      });
    });
  }
  // The designer swaps a changed element in and calls window.__lvFx3 on its slide.
  var prev=window.__lvFx3;window.__lvFx3=function(s){if(prev)prev(s);init(s)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){init(document)});else init(document);
})();`
