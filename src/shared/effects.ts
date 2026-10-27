/**
 * Slide effects: animated text, animated backgrounds and interactive cards.
 * Written for Lawnak Vision (plain CSS and browser JS, no libraries), so they
 * work in exported decks. Used as classes in slide HTML and by the designer.
 *
 *   Text:        fx-split  fx-blur  fx-shiny  fx-decrypt  fx-glitch
 *                <span class="fx-rotate" data-words="a|b|c">  <span class="fx-type" data-words="a|b">
 *                <div class="fx-circle" data-text="TEXT • ">
 *   Backgrounds: on <slide>: bg-particles bg-dots bg-waves bg-stars bg-warp bg-grid bg-beams bg-mesh bg-noise
 *   Cards:       fx-spotlight  fx-tilt  fx-glare  fx-border  fx-magnet
 *   Logo loop:   <div class="fx-marquee"><div class="fx-mq"><span>A</span><span>B</span></div></div>
 */

export const TEXT_EFFECTS = [
  { id: '', name: 'None' },
  { id: 'fx-split', name: 'Letters rise' },
  { id: 'fx-blur', name: 'Blur-in words' },
  { id: 'fx-shiny', name: 'Shine' },
  { id: 'fx-decrypt', name: 'Decrypt' },
  { id: 'fx-glitch', name: 'Glitch' },
  { id: 'fx-rotate', name: 'Rotating words' },
  { id: 'fx-type', name: 'Typing loop' }
]

export const HOVER_EFFECTS = [
  { id: '', name: 'None' },
  { id: 'fx-spotlight', name: 'Spotlight' },
  { id: 'fx-tilt', name: '3D tilt' },
  { id: 'fx-glare', name: 'Glare' },
  { id: 'fx-border', name: 'Glowing border' },
  { id: 'fx-magnet', name: 'Magnet' },
  { id: 'fx3-depth', name: '3D depth' }
]

export const BACKGROUNDS = [
  { id: '', name: 'Theme only' },
  { id: 'bg-particles', name: 'Particles' },
  { id: 'bg-dots', name: 'Dot grid' },
  { id: 'bg-waves', name: 'Waves' },
  { id: 'bg-stars', name: 'Stars' },
  { id: 'bg-warp', name: 'Hyperspeed' },
  { id: 'bg-grid', name: 'Grid floor' },
  { id: 'bg-beams', name: 'Light beams' },
  { id: 'bg-mesh', name: 'Mesh gradient' },
  { id: 'aurora', name: 'Aurora' },
  { id: 'bg-silk', name: 'Silk (3D shader)' },
  { id: 'bg-liquid', name: 'Liquid (3D shader)' },
  { id: 'bg-plasma', name: 'Plasma (3D shader)' },
  { id: 'bg-blob', name: 'Gradient blob (3D shader)' },
  { id: 'bg-portal', name: 'Portal (3D shader)' }
]

const NOISE_SVG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>"

export const FX_CSS = `
/* ---- Effects: backgrounds ---- */
.slide .fx-bg{position:absolute;inset:0;z-index:-1;pointer-events:none;overflow:hidden}
.slide canvas.fx-bg{width:100%;height:100%}
.slide .fx-bg-grid{perspective:520px}
.slide .fx-bg-grid i{position:absolute;left:-60%;right:-60%;top:60%;height:120%;transform:rotateX(64deg);transform-origin:top;
  background-image:linear-gradient(color-mix(in srgb,var(--accent) 55%,transparent) 1.5px,transparent 1.5px),
    linear-gradient(90deg,color-mix(in srgb,var(--accent) 55%,transparent) 1.5px,transparent 1.5px);
  background-size:72px 72px;-webkit-mask-image:linear-gradient(transparent,#000 25%,#000 60%,transparent);mask-image:linear-gradient(transparent,#000 25%,#000 60%,transparent)}
.slide .fx-bg-grid b{position:absolute;left:0;right:0;top:48%;height:26%;background:radial-gradient(ellipse at 50% 60%,color-mix(in srgb,var(--accent) 45%,transparent),transparent 70%)}
.slide.active .fx-bg-grid i{animation:fx-grid 1.8s linear infinite}
@keyframes fx-grid{to{background-position:0 72px}}
.slide .fx-bg-beams i{position:absolute;left:50%;top:-95%;width:2200px;height:2200px;margin-left:-1100px;opacity:.9;
  background:repeating-conic-gradient(from 0deg,color-mix(in srgb,var(--accent) 20%,transparent) 0 3deg,transparent 3deg 15deg);
  -webkit-mask-image:radial-gradient(circle,#000 8%,transparent 46%);mask-image:radial-gradient(circle,#000 8%,transparent 46%)}
.slide.active .fx-bg-beams i{animation:fx-turn 90s linear infinite}
.slide .fx-bg-mesh i{position:absolute;width:70%;aspect-ratio:1;border-radius:50%;filter:blur(80px);opacity:.5}
.slide .fx-bg-mesh i:nth-child(1){background:var(--accent);left:-18%;top:-35%}
.slide .fx-bg-mesh i:nth-child(2){background:var(--c3);right:-20%;top:-10%;opacity:.35}
.slide .fx-bg-mesh i:nth-child(3){background:var(--c5);left:25%;bottom:-60%;opacity:.35}
.slide.active .fx-bg-mesh i{animation:fx-drift 16s ease-in-out infinite alternate}
.slide.active .fx-bg-mesh i:nth-child(2){animation-duration:21s;animation-delay:-6s}
.slide.active .fx-bg-mesh i:nth-child(3){animation-duration:19s;animation-delay:-11s}
@keyframes fx-drift{33%{translate:12% 10%;scale:1.15}66%{translate:-8% 14%;scale:.9}100%{translate:6% -10%;scale:1.05}}
@keyframes fx-turn{to{rotate:360deg}}
.slide .fx-bg-noise{opacity:.09;background-image:url("${NOISE_SVG}");mix-blend-mode:overlay}

/* ---- Effects: text ---- */
.slide .fx-u{display:inline-block;white-space:pre}
/* A text fill (gradient-text, fx-shiny) only paints text it holds directly, and split words sit in boxes of
   their own, so they would turn transparent. Each word takes the fill itself. */
.slide :is(.gradient-text,.fx-shiny) .fx-u{background:inherit;-webkit-background-clip:text;background-clip:text;color:transparent}
.slide:is(.active,.lv-leave) .fx-split .fx-u{animation:fx-rise .8s cubic-bezier(.2,.9,.25,1.12) both;
  animation-delay:calc(var(--lv-base,0s) + var(--d,0s) + .1s + var(--k) * 38ms)}
@keyframes fx-rise{from{opacity:0;transform:translateY(.75em) rotate(10deg)}}
.slide:is(.active,.lv-leave) .fx-blur .fx-u{animation:fx-blurw 1s ease both;animation-delay:calc(var(--lv-base,0s) + var(--d,0s) + .1s + var(--k) * 110ms)}
@keyframes fx-blurw{from{opacity:0;filter:blur(14px);transform:translateY(-.3em)}60%{opacity:.6;filter:blur(3px)}}
.slide .fx-shiny{color:transparent!important;-webkit-background-clip:text;background-clip:text;background-size:250% 100%;background-position:100% 0;
  background-image:linear-gradient(110deg,color-mix(in srgb,var(--fx-c,var(--fg)) 50%,transparent) 0 40%,var(--fx-c,var(--fg)) 50%,color-mix(in srgb,var(--fx-c,var(--fg)) 50%,transparent) 60% 100%)}
.slide.active .fx-shiny{animation:fx-shine 3.4s linear infinite}
@keyframes fx-shine{from{background-position:140% 0}to{background-position:-40% 0}}
.slide .fx-glitch{position:relative;display:inline-block}
.slide .fx-glitch::before,.slide .fx-glitch::after{content:attr(data-text);position:absolute;inset:0;opacity:0;pointer-events:none}
.slide .fx-glitch::before{color:#ff3d7f;translate:3px 0}
.slide .fx-glitch::after{color:#2ee6ff;translate:-3px 0}
.slide.active .fx-glitch::before{animation:fx-gl 3.2s steps(1) infinite}
.slide.active .fx-glitch::after{animation:fx-gl 3.2s steps(1) infinite reverse}
@keyframes fx-gl{
  0%,70%,100%{opacity:0;clip-path:inset(0 0 100% 0)}
  72%{opacity:.85;clip-path:inset(10% 0 60% 0)}74%{clip-path:inset(55% 0 20% 0);translate:-4px 0}
  76%{clip-path:inset(30% 0 45% 0);translate:5px 0}78%{clip-path:inset(75% 0 5% 0)}80%{opacity:.85;clip-path:inset(5% 0 80% 0)}82%{opacity:0}}
.slide .fx-rotate{display:inline-flex;overflow:hidden;vertical-align:bottom;padding:0 .3em;border-radius:.22em;
  background:var(--accent);color:var(--accent-fg);transition:width .45s cubic-bezier(.6,0,.2,1)}
.slide .fx-rotate>span{display:inline-block;white-space:nowrap;transition:transform .5s cubic-bezier(.6,0,.2,1),opacity .5s}
.slide .fx-rotate>span.fx-out{transform:translateY(-110%);opacity:0}
.slide .fx-rotate>span.fx-in{transform:translateY(110%);opacity:0;transition:none}
.slide .fx-type::after{content:"";display:inline-block;width:.07em;height:.95em;margin-inline-start:.06em;vertical-align:-.1em;background:var(--accent)}
.slide.active .fx-type::after{animation:lv-blink .9s steps(1) infinite}
.slide .fx-circle svg{width:100%;height:100%;overflow:visible;direction:ltr}
.slide .fx-circle text{fill:currentColor;font-weight:700;letter-spacing:.06em}
.slide.active .fx-circle svg{animation:fx-turn 18s linear infinite}

/* ---- Effects: cards ---- */
.slide :is(.fx-spotlight,.fx-glare,.fx-border):not(.el):not(.abs){position:relative}
.slide :is(.fx-spotlight,.fx-glare){overflow:hidden}
.slide .fx-spotlight::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .3s;
  background:radial-gradient(380px circle at var(--mx,50%) var(--my,50%),color-mix(in srgb,var(--accent) 30%,transparent),transparent 65%)}
.slide .fx-spotlight:hover::after{opacity:1}
.slide .fx-glare::before{content:"";position:absolute;inset:-60%;pointer-events:none;z-index:1;translate:-70% 0;transition:translate .9s ease;
  background:linear-gradient(115deg,transparent 42%,rgba(255,255,255,.3) 50%,transparent 58%)}
.slide .fx-glare:hover::before{translate:70% 0}
@property --fx-a{syntax:'<angle>';inherits:false;initial-value:0deg}
.slide .fx-border::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:2px;pointer-events:none;
  background:conic-gradient(from var(--fx-a),transparent 0 60%,var(--accent) 80%,color-mix(in srgb,var(--accent) 35%,#fff) 88%,transparent 96%);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
.slide.active .fx-border::before{animation:fx-orbit 4s linear infinite}
@keyframes fx-orbit{to{--fx-a:360deg}}
.slide :has(> .fx-tilt),.slide:has(> .fx-tilt){perspective:1400px}
.slide .fx-tilt{transition:rotate .3s ease-out,scale .3s ease-out}
.slide .fx-magnet{transition:translate .35s cubic-bezier(.2,.8,.2,1)}

/* ---- Effects: logo loop ---- */
.slide .fx-marquee{display:flex;align-items:center;overflow:hidden;
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent);mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}
.slide .fx-mq{display:flex;align-items:center;flex:none;min-width:100%;justify-content:space-around;gap:var(--gap,64px);padding-inline-end:var(--gap,64px)}
.slide .fx-mq>*{flex:none;white-space:nowrap;font-weight:800;color:var(--muted)}
.slide.active .fx-mq{animation:fx-mq var(--mqd,24s) linear infinite}
.slide.rtl.active .fx-mq{animation-name:fx-mq-rtl}
@keyframes fx-mq{to{transform:translateX(-100%)}}
@keyframes fx-mq-rtl{to{transform:translateX(100%)}}
`

export const FX_JS = String.raw`
(function(){
  var root=document.documentElement,still=root.classList.contains('lv-static');
  var reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  var calm=still||reduce,uid=0;
  var RTL_SCRIPT=/[֐-ࣿיִ-ﻼ]/;
  function on(s){return s.classList.contains('active')||s.classList.contains('lv-leave')}
  function slideOf(el){return el.closest('.slide')}
  function ms(v){v=(v||'').trim();var n=parseFloat(v);return isNaN(n)?0:/ms$/.test(v)?n:n*1000}
  function delay(el){var c=getComputedStyle(el);return ms(c.getPropertyValue('--lv-base'))+ms(c.getPropertyValue('--d'))}
  function hex(v,d){var m=/^#?([0-9a-f]{6})$/i.exec((v||'').trim());if(!m)return d;var n=parseInt(m[1],16);return [n>>16&255,n>>8&255,n&255]}
  function rgba(c,a){return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'}

  // ---- Text: split into letters (or words for Arabic and Hebrew) ----
  function split(el,byWord){
    var k=0;
    (function walk(node){
      [].slice.call(node.childNodes).forEach(function(n){
        if(n.nodeType===3){
          var parts=(byWord||RTL_SCRIPT.test(n.nodeValue))?n.nodeValue.split(/(\s+)/):Array.from(n.nodeValue);
          var f=document.createDocumentFragment();
          parts.forEach(function(p){
            if(!p)return;
            if(/^\s+$/.test(p)){f.appendChild(document.createTextNode(p));return}
            var s=document.createElement('span');s.className='fx-u';s.textContent=p;s.style.setProperty('--k',k++);f.appendChild(s);
          });
          n.replaceWith(f);
        }else if(n.nodeType===1&&!n.classList.contains('fx-u'))walk(n);
      });
    })(el);
  }
  function decrypt(el){
    if(el.__t==null)el.__t=el.textContent;
    var txt=el.__t,pool=RTL_SCRIPT.test(txt)?'ابتثجحخدذرزسشصضطظعغفقكلمنهوي':'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*',
      chars=Array.from(txt),n=chars.length,dur=Math.max(900,n*55),start=performance.now()+delay(el)+150,tok=el.__k={};
    function rnd(){return pool.charAt(Math.floor(Math.random()*pool.length))}
    (function step(now){
      if(el.__k!==tok)return;
      var p=Math.min(1,Math.max(0,(now-start)/dur)),shown=Math.floor(p*n);
      el.textContent=chars.map(function(c,i){return i<shown||/\s/.test(c)?c:rnd()}).join('');
      if(p<1)requestAnimationFrame(step);else el.textContent=txt;
    })(performance.now());
  }
  function rotate(el){
    var words=(el.getAttribute('data-words')||el.textContent).split('|').map(function(w){return w.trim()}).filter(Boolean);
    if(!words.length)return;
    el.textContent='';var span=document.createElement('span');span.textContent=words[0];el.appendChild(span);
    if(calm)return;
    var i=0;
    function fit(){el.style.width=(span.offsetWidth+parseFloat(getComputedStyle(el).paddingLeft)*2)+'px'}
    fit();
    setInterval(function(){
      if(!on(slideOf(el)))return;
      span.classList.add('fx-out');
      setTimeout(function(){
        i=(i+1)%words.length;span.classList.remove('fx-out');span.classList.add('fx-in');span.textContent=words[i];fit();
        span.getBoundingClientRect();span.classList.remove('fx-in');
      },450);
    },2400);
  }
  function typeLoop(el){
    var words=(el.getAttribute('data-words')||el.textContent).split('|').map(function(w){return w.trim()}).filter(Boolean);
    if(!words.length)return;
    el.textContent=words[0];
    if(calm)return;
    var w=0,c=Array.from(words[0]).length,del=true,hold=1800;
    function tick(){
      var next=90;
      if(on(slideOf(el))){
        if(del){c--;next=35;if(c<=0){del=false;w=(w+1)%words.length;next=300}}
        else{c++;next=70;if(c>=Array.from(words[w]).length){del=true;next=hold}}
        el.textContent=Array.from(words[w]).slice(0,Math.max(0,c)).join('');
      }
      setTimeout(tick,next);
    }
    setTimeout(tick,hold);
  }
  function circle(el){
    var txt=el.getAttribute('data-text')||'',id='fxc'+(++uid),NS='http://www.w3.org/2000/svg';
    var svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 200 200');
    var path=document.createElementNS(NS,'path');path.setAttribute('id',id);path.setAttribute('fill','none');
    path.setAttribute('d','M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0');
    var t=document.createElementNS(NS,'text');t.setAttribute('font-size','17');
    var tp=document.createElementNS(NS,'textPath');tp.setAttribute('href','#'+id);tp.setAttribute('textLength','488');tp.setAttribute('lengthAdjust','spacing');
    tp.textContent=txt;t.appendChild(tp);svg.appendChild(path);svg.appendChild(t);el.textContent='';el.appendChild(svg);
  }
  function marquee(el){
    var track=el.querySelector('.fx-mq');if(!track||el.querySelectorAll('.fx-mq').length>1)return;
    var copy=track.cloneNode(true);copy.setAttribute('aria-hidden','true');el.appendChild(copy);
  }

  // ---- Cards that react to the mouse ----
  function pointer(el,e){var r=el.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height}}
  function cards(scope){
    [].forEach.call(scope.querySelectorAll('.fx-spotlight'),function(el){
      el.addEventListener('mousemove',function(e){var p=pointer(el,e);el.style.setProperty('--mx',p.x*100+'%');el.style.setProperty('--my',p.y*100+'%')});
    });
    [].forEach.call(scope.querySelectorAll('.fx-tilt'),function(el){
      el.addEventListener('mousemove',function(e){
        var p=pointer(el,e),x=p.x-.5,y=p.y-.5,a=Math.min(16,Math.hypot(x,y)*32);
        el.style.rotate=(-y)+' '+x+' 0 '+a+'deg';el.style.scale='1.03';
      });
      el.addEventListener('mouseleave',function(){el.style.rotate='';el.style.scale=''});
    });
    [].forEach.call(scope.querySelectorAll('.slide'),function(s){
      var mags=s.querySelectorAll('.fx-magnet');if(!mags.length)return;
      s.addEventListener('mousemove',function(e){
        [].forEach.call(mags,function(el){
          var r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy;
          var scale=r.width/(el.offsetWidth||1),reach=Math.max(r.width,r.height)*.9;
          el.style.translate=Math.hypot(dx,dy)<reach?(dx*.28/scale)+'px '+(dy*.28/scale)+'px':'';
        });
      });
      s.addEventListener('mouseleave',function(){[].forEach.call(mags,function(el){el.style.translate=''})});
    });
  }

  // ---- Animated backgrounds ----
  // The canvas size: 1280x720 for presentations, other sizes for vertical and square videos.
  var firstSlide=document.querySelector('.slide'),W=(firstSlide&&firstSlide.offsetWidth)||1280,H=(firstSlide&&firstSlide.offsetHeight)||720;
  var PAINT={
    particles:function(ctx,a,f,m){
      var p=[];for(var i=0;i<85;i++)p.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.4,vy:(Math.random()-.5)*.4,r:Math.random()*1.8+.7});
      return function(){
        ctx.clearRect(0,0,W,H);
        p.forEach(function(q){
          q.x+=q.vx;q.y+=q.vy;
          var dx=q.x-m.x,dy=q.y-m.y,d=Math.hypot(dx,dy);
          if(d<140&&d>0){q.x+=dx/d*1.6;q.y+=dy/d*1.6}
          if(q.x<-10)q.x=W+10;if(q.x>W+10)q.x=-10;if(q.y<-10)q.y=H+10;if(q.y>H+10)q.y=-10;
        });
        for(var i=0;i<p.length;i++)for(var j=i+1;j<p.length;j++){
          var d=Math.hypot(p[i].x-p[j].x,p[i].y-p[j].y);
          if(d<135){ctx.strokeStyle=rgba(a,(1-d/135)*.4);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p[i].x,p[i].y);ctx.lineTo(p[j].x,p[j].y);ctx.stroke()}
        }
        p.forEach(function(q){ctx.fillStyle=rgba(a,.9);ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,7);ctx.fill()});
      };
    },
    dots:function(ctx,a,f,m){
      return function(t){
        ctx.clearRect(0,0,W,H);var g=30;
        for(var y=g/2;y<H;y+=g)for(var x=g/2;x<W;x+=g){
          var dc=Math.hypot(x-W/2,y-H/2),wave=Math.max(0,Math.sin(dc/55-t/700))*.55;
          var dm=Math.hypot(x-m.x,y-m.y),near=Math.max(0,1-dm/170);
          var k=Math.min(1,wave*(1-dc/900)+near);
          ctx.fillStyle=k>.05?rgba(a,.18+k*.8):rgba(f,.12);
          ctx.beginPath();ctx.arc(x,y,1.3+k*2.4,0,7);ctx.fill();
        }
      };
    },
    waves:function(ctx,a,f,m){
      return function(t){
        ctx.clearRect(0,0,W,H);
        for(var i=0;i<9;i++){
          ctx.beginPath();
          for(var x=0;x<=W;x+=8){
            var y=H*.62+Math.sin(x*.0045+t*.00055*(1+i*.12)+i*.7)*(28+i*9)+Math.sin(x*.011-t*.0004+i)*10-i*14;
            if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
          }
          ctx.strokeStyle=rgba(a,.08+i*.045);ctx.lineWidth=1.6;ctx.stroke();
        }
      };
    },
    stars:function(ctx,a,f,m){
      var s=[];for(var i=0;i<300;i++)s.push({x:Math.random()*W,y:Math.random()*H,z:Math.random()*.9+.1,ph:Math.random()*6});
      return function(t){
        ctx.clearRect(0,0,W,H);
        var ox=(m.x>-1?(m.x-W/2):0)*.03,oy=(m.y>-1?(m.y-H/2):0)*.03;
        s.forEach(function(q){
          q.x-=q.z*.25;if(q.x<0)q.x+=W;
          var tw=.45+.55*Math.sin(t/600+q.ph);
          ctx.fillStyle=q.z>.75?rgba(a,tw):rgba(f,tw*.8);
          ctx.beginPath();ctx.arc(q.x+ox*q.z,q.y+oy*q.z,q.z*1.6,0,7);ctx.fill();
        });
      };
    },
    warp:function(ctx,a,f,m){
      var s=[];function seed(q){q.x=(Math.random()-.5)*W*2;q.y=(Math.random()-.5)*H*2;q.z=Math.random()*W;q.pz=q.z;return q}
      for(var i=0;i<260;i++)s.push(seed({}));
      return function(){
        ctx.fillStyle='rgba(0,0,0,0)';ctx.clearRect(0,0,W,H);
        s.forEach(function(q){
          q.pz=q.z;q.z-=14;if(q.z<1){seed(q);q.z=W;q.pz=q.z}
          var sx=W/2+q.x/q.z*300,sy=H/2+q.y/q.z*300,px=W/2+q.x/q.pz*300,py=H/2+q.y/q.pz*300;
          ctx.strokeStyle=rgba(q.z<W/3?a:f,Math.min(1,(1-q.z/W)*1.4));ctx.lineWidth=(1-q.z/W)*2.6+.3;
          ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(sx,sy);ctx.stroke();
        });
      };
    }
  };
  function background(slide){
    var cls=slide.className,kind=null;
    ['particles','dots','waves','stars','warp'].forEach(function(k){if(new RegExp('(^|\\s)bg-'+k+'(\\s|$)').test(cls))kind=k});
    ['grid','beams','mesh'].forEach(function(k){
      if(!new RegExp('(^|\\s)bg-'+k+'(\\s|$)').test(cls)||slide.querySelector(':scope>.fx-bg-'+k))return;
      var d=document.createElement('div');d.className='fx-bg fx-bg-'+k;
      d.innerHTML=k==='grid'?'<b></b><i></i>':k==='beams'?'<i></i>':'<i></i><i></i><i></i>';
      slide.insertBefore(d,slide.firstChild);
    });
    if(/(^|\s)bg-noise(\s|$)/.test(cls)&&!slide.querySelector(':scope>.fx-bg-noise')){
      var n=document.createElement('div');n.className='fx-bg fx-bg-noise';slide.appendChild(n);
    }
    if(!kind||slide.querySelector(':scope>canvas.fx-bg'))return;
    var cv=document.createElement('canvas'),R=1.5;cv.className='fx-bg';cv.width=W*R;cv.height=H*R;
    slide.insertBefore(cv,slide.firstChild);
    var ctx=cv.getContext('2d');ctx.scale(R,R);
    var cs=getComputedStyle(slide),acc=hex(cs.getPropertyValue('--accent'),[124,156,255]),fg=hex(cs.getPropertyValue('--fg'),[240,240,240]);
    var mouse={x:-9999,y:-9999};
    slide.addEventListener('mousemove',function(e){var r=slide.getBoundingClientRect();mouse.x=(e.clientX-r.left)*W/r.width;mouse.y=(e.clientY-r.top)*H/r.height});
    slide.addEventListener('mouseleave',function(){mouse.x=mouse.y=-9999});
    var paint=PAINT[kind](ctx,acc,fg,mouse);
    paint(1200);
    if(calm)return;
    (function loop(t){if(on(slide))paint(t);requestAnimationFrame(loop)})(0);
  }

  // ---- Start ----
  function init(scope){
    [].forEach.call(scope.querySelectorAll('.fx-glitch'),function(el){el.setAttribute('data-text',el.textContent)});
    [].forEach.call(scope.querySelectorAll('.fx-circle'),circle);
    [].forEach.call(scope.querySelectorAll('.fx-marquee'),marquee);
    [].forEach.call(scope.querySelectorAll('.fx-rotate'),rotate);
    [].forEach.call(scope.querySelectorAll('.fx-type'),typeLoop);
    if(!calm){
      [].forEach.call(scope.querySelectorAll('.fx-split'),function(el){split(el,false)});
      [].forEach.call(scope.querySelectorAll('.fx-blur'),function(el){split(el,true)});
    }
    cards(scope);
  }
  [].forEach.call(document.querySelectorAll('.slide'),background);
  init(document);
  window.__lvFx=init;
  if(!calm)document.addEventListener('slideenter',function(e){
    var s=e.target;if(!s||!s.querySelectorAll)return;
    [].forEach.call(s.querySelectorAll('.fx-decrypt'),decrypt);
  });
})();`
