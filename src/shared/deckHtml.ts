import type { Deck, Slide } from './types'
import { hasType, renderElements } from './elements'
import { CHART_LIB_JS, MAP_LIB_CSS, MAP_LIB_JS } from './libs'
import { FX_JS } from './effects'
import { FX3D_JS, GLOBE_LAND_JS } from './effects3d'
import { PRO_CSS, PRO_JS, PRO_TYPES } from './effectsPro'
import { BASE_CSS, DEFAULT_TRANSITION, STATIC_MOTION_CSS, TRANSITIONS, getTheme } from './themes'
import { AUDIO_FADE_SECONDS, FRAME_MARK_PX, isVideo, sceneSeconds, slideSize, VIRTUAL_TIME_JS } from './video'

/** The presentation slide size. Videos can be other sizes: use slideSize(deck). */
export const SLIDE_WIDTH = 1280
export const SLIDE_HEIGHT = 720

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/** Only allow simple class names so a class attribute can't break out of the tag. */
function safeClass(className?: string): string {
  return (className ?? '').replace(/[^\w\- ]/g, '').trim()
}

// Letters of right-to-left scripts (Hebrew, Arabic, Persian, Urdu...) and of Latin ones.
const RTL_LETTERS = /[֐-ࣿיִ-﷿ﹰ-﻿]/g
const LATIN_LETTERS = /[A-Za-zÀ-ɏ]/g

/** True when most of the visible text in this HTML is written in a right-to-left script. */
export function isRtlText(html: string): boolean {
  const text = html
    .replace(/<(style|script|notes)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[#\w]+;/g, ' ')
  const rtl = text.match(RTL_LETTERS)?.length ?? 0
  return rtl > 0 && rtl > (text.match(LATIN_LETTERS)?.length ?? 0)
}

/**
 * The slide's classes. A slide written mostly in Arabic (or another right-to-left script) gets "rtl" even when
 * the AI forgot it or misspelled it, because the theme's right-to-left rules hang on that class. "ltr" opts out.
 */
export function slideClasses(slide: Pick<Slide, 'className' | 'html'>, elementsHtml = ''): string {
  const own = safeClass(slide.className)
  const names = own.split(/\s+/)
  const rtl = !names.includes('rtl') && !names.includes('ltr') && isRtlText(slide.html + elementsHtml)
  return [own, rtl ? 'rtl' : ''].filter(Boolean).join(' ')
}

/** True when the slide shows right-to-left: marked "rtl", or written mostly in a right-to-left script. */
export function isRtlSlide(slide: Pick<Slide, 'className' | 'html' | 'elements'>): boolean {
  return /(^|\s)rtl(\s|$)/.test(slideClasses(slide, renderElements(slide.elements)))
}

function sectionHtml(slide: Slide, index: number, active: boolean): string {
  const elements = renderElements(slide.elements)
  const cls = ['slide', slideClasses(slide, elements), active ? 'active' : ''].filter(Boolean).join(' ')
  return `<section class="${cls}" data-index="${index}" dir="auto">${slide.html}${elements}</section>`
}

/** Canvas size and padding for slides that are not 1280x720 (vertical and square videos). */
function sizeCss(deck: Deck): string {
  const { width, height } = slideSize(deck)
  if (width === SLIDE_WIDTH && height === SLIDE_HEIGHT) return ''
  const pad = height > width ? '112px 56px 96px' : '64px 60px'
  return `.slide{width:${width}px;height:${height}px;padding:${pad}}
.slide .footer{inset-inline:56px}
.slide .lead{font-size:30px}`
}

function deckCss(deck: Deck): string {
  // A stray "</style>" in user CSS would end the style block early.
  const custom = deck.css.replace(/<\/style/gi, '<\\/style')
  return BASE_CSS + '\n' + sizeCss(deck) + '\n' + getTheme(deck.themeId).css + '\n' + custom
}

/**
 * Draws charts from <div class="chart" data-chart='{"type":"bar","labels":[...],"series":[{"name":"...","data":[...]}]}'>.
 * Types: bar, line, area, donut. Charts have hover tooltips and animate on slideenter.
 * Plain browser JS, no libraries, so exported decks work offline.
 */
const CHART_JS = String.raw`
(function(){
  var NS='http://www.w3.org/2000/svg',uid=0;
  var still=document.documentElement.classList.contains('lv-static')||!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  function mk(tag,a,parent){var e=document.createElementNS(NS,tag);for(var k in a)e.setAttribute(k,a[k]);if(parent)parent.appendChild(e);return e}
  function div(cls,parent,text){var e=document.createElement('div');if(cls)e.className=cls;if(text!=null)e.textContent=text;if(parent)parent.appendChild(e);return e}
  function compact(v){
    var a=Math.abs(v);
    if(a>=1e9)return +(v/1e9).toFixed(1)+'B';
    if(a>=1e6)return +(v/1e6).toFixed(1)+'M';
    if(a>=1e3)return +(v/1e3).toFixed(1)+'K';
    var p=String(+v.toFixed(2)).split('.');p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g,',');return p.join('.');
  }
  function color(i){return 'var(--c'+(Math.min(i,7)+1)+')'}
  function niceStep(span,n){var raw=span/n,p=Math.pow(10,Math.floor(Math.log(raw)/Math.LN10)),m=raw/p;return (m<=1?1:m<=2?2:m<=2.5?2.5:m<=5?5:10)*p}
  function local(svg,e){var pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;return pt.matrixTransform(svg.getScreenCTM().inverse())}
  function dim(list,keep){list.forEach(function(el){el.classList.toggle('lv-dim',keep.indexOf(el)<0)})}
  function undim(list){list.forEach(function(el){el.classList.remove('lv-dim')})}
  function key(parent,c,name){var k=div('lv-key',parent);var i=document.createElement('i');i.style.setProperty('--k',c);k.appendChild(i);k.appendChild(document.createTextNode(name));return k}
  function tipShow(plot,tip,x,y,title,rows){
    tip.innerHTML='';
    var b=document.createElement('b');b.textContent=title;tip.appendChild(b);
    rows.forEach(function(r){
      var d=div('',tip),i=document.createElement('i'),v=document.createElement('span');
      i.style.setProperty('--k',r[0]);v.textContent=r[2];
      d.appendChild(i);d.appendChild(document.createTextNode(r[1]));d.appendChild(v);
    });
    tip.classList.add('on');
    var tw=tip.offsetWidth,th=tip.offsetHeight,left=x+18;
    if(left+tw>plot.offsetWidth)left=x-18-tw;
    tip.style.left=Math.max(0,left)+'px';
    tip.style.top=Math.max(0,Math.min(y-th/2,plot.offsetHeight-th))+'px';
  }

  function render(box){
    var cfg;
    try{cfg=JSON.parse(box.getAttribute('data-chart'))}catch(err){box.textContent='Chart: data-chart is not valid JSON';return}
    var type=cfg.type||'bar',labels=cfg.labels||[];
    var series=(cfg.series||[{name:cfg.name||'',data:cfg.data||[]}]).map(function(x){return {name:x.name||'',data:(x.data||[]).map(Number)}});
    var fmt=function(v){return (cfg.prefix||'')+compact(+v||0)+(cfg.unit||'')};
    box.innerHTML='';
    box.classList.toggle('donut',type==='donut');
    box.setAttribute('data-no-advance','');
    var plot;
    if(type!=='donut'&&series.length>1){
      var lg=div('lv-legend',box);series.forEach(function(se,j){key(lg,color(j),se.name)});
    }
    plot=div('lv-plot',box);
    if(plot.offsetHeight<60)plot.style.height='320px';
    if(type==='donut'&&plot.offsetWidth<60)plot.style.width=plot.offsetHeight+'px';
    var tip=div('lv-tip',plot);
    var W=plot.offsetWidth,H=plot.offsetHeight;
    var svg=mk('svg',{width:W,height:H,viewBox:'0 0 '+W+' '+H,role:'img','aria-label':cfg.title||type+' chart'},plot);
    // The same numbers as a table, for screen readers.
    var t=document.createElement('table');t.className='lv-sr';
    var head='<tr><th></th>'+series.map(function(se){return '<th>'+esc(se.name)+'</th>'}).join('')+'</tr>';
    t.innerHTML=head+labels.map(function(l,i){return '<tr><th>'+esc(l)+'</th>'+series.map(function(se){return '<td>'+esc(fmt(se.data[i]))+'</td>'}).join('')+'</tr>'}).join('');
    box.appendChild(t);
    if(type==='donut')donut(box,plot,svg,tip,cfg,labels,series[0],fmt,W,H);
    else cartesian(plot,svg,tip,cfg,type,labels,series,fmt,W,H);
  }
  function esc(x){return String(x).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]})}

  function cartesian(plot,svg,tip,cfg,type,labels,series,fmt,W,H){
    var n=Math.max(labels.length,Math.max.apply(null,series.map(function(x){return x.data.length})));
    if(!n)return;
    var isLine=type==='line'||type==='area',endLabels=isLine&&series.length<=4;
    // Bars always start at zero; lines zoom in on their range so change is visible.
    var vals=isLine?[]:[0];series.forEach(function(x){vals=vals.concat(x.data)});
    var max=cfg.max!=null?+cfg.max:Math.max.apply(null,vals),min=cfg.min!=null?+cfg.min:Math.min.apply(null,vals);
    if(isLine&&cfg.min==null&&min>0)min=Math.max(0,min-(max-min)*.15);
    var step=niceStep((max-min)||1,4),top=Math.ceil(max/step)*step||step,bot=Math.floor(min/step)*step;
    var padL=Math.max(fmt(top).length,fmt(bot).length)*9+18,padR=endLabels?76:14,padT=14,padB=36;
    var pw=W-padL-padR,ph=H-padT-padB,band=pw/n;
    function X(i){return padL+band*(i+.5)}
    function Y(v){return padT+ph*(1-(v-bot)/(top-bot))}
    var grid=mk('g',{'class':'lv-grid'},svg);
    for(var v=bot;v<=top+step/2;v=+(v+step).toFixed(10)){
      var y=Y(v);
      mk('line',{x1:padL,x2:W-padR,y1:y,y2:y,'class':v===0?'lv-base':''},grid);
      mk('text',{x:padL-12,y:y+5,'text-anchor':'end'},grid).textContent=fmt(v);
    }
    var axis=mk('g',{'class':'lv-axis'},svg),every=Math.ceil(n/Math.max(1,Math.floor(pw/80)));
    labels.forEach(function(l,i){if(i%every===0)mk('text',{x:X(i),y:H-8,'text-anchor':'middle'},axis).textContent=l});
    var marks=[],y0=Y(Math.max(0,bot));
    function rows(i){return series.map(function(se,j){return [color(j),se.name||labels[i],fmt(se.data[i])]})}

    if(!isLine){
      var k=series.length,gw=band*Math.min(.74,.4+k*.12),bw=(gw-(k-1)*2)/k,byBand=[];
      series.forEach(function(se,j){se.data.forEach(function(val,i){
        var x=X(i)-gw/2+j*(bw+2),y=Y(Math.max(val,bot)),r=Math.min(4,bw/2,Math.max(0,y0-y));
        var d='M'+x+','+y0+'V'+(y+r)+'Q'+x+','+y+' '+(x+r)+','+y+'H'+(x+bw-r)+'Q'+(x+bw)+','+y+' '+(x+bw)+','+(y+r)+'V'+y0+'Z';
        var bar=mk('path',{d:d,fill:color(j),'class':'lv-bar'},svg);
        bar.style.setProperty('--k-i',i);
        marks.push(bar);(byBand[i]=byBand[i]||[]).push(bar);
      })});
      if(k===1&&n){
        // Label only the tallest bar; the rest are on hover.
        var data=series[0].data,mi=data.indexOf(Math.max.apply(null,data));
        var lbl=mk('text',{x:X(mi),y:Y(data[mi])-10,'text-anchor':'middle','class':'lv-endlabel lv-end'},svg);
        lbl.textContent=fmt(data[mi]);
      }
      for(var i=0;i<n;i++)(function(i){
        var hit=mk('rect',{x:X(i)-band/2,y:padT,width:band,height:ph,fill:'transparent'},svg);
        hit.addEventListener('mouseenter',function(){
          dim(marks,byBand[i]||[]);
          var peak=Math.max.apply(null,series.map(function(se){return se.data[i]||0}));
          tipShow(plot,tip,X(i)+gw/2,Y(peak),labels[i]||'',rows(i));
        });
        hit.addEventListener('mouseleave',function(){undim(marks);tip.classList.remove('on')});
      })(i);
      return;
    }

    var defs=mk('defs',{},svg),ends=[];
    series.forEach(function(se,j){
      var pts=se.data.map(function(v,i){return [X(i),Y(v)]});
      if(!pts.length)return;
      var d=pts.map(function(p,i){return (i?'L':'M')+p[0].toFixed(1)+','+p[1].toFixed(1)}).join('');
      if(type==='area'){
        var gid='lvg'+(++uid),g=mk('linearGradient',{id:gid,x1:0,y1:0,x2:0,y2:1},defs);
        mk('stop',{offset:0,style:'stop-color:'+color(j)+';stop-opacity:'+(series.length>1?.22:.38)},g);
        mk('stop',{offset:1,style:'stop-color:'+color(j)+';stop-opacity:0'},g);
        var fill=mk('path',{d:d+'L'+pts[pts.length-1][0]+','+y0+'L'+pts[0][0]+','+y0+'Z',fill:'url(#'+gid+')','class':'lv-fill'},svg);
        fill.style.setProperty('--k-i',j);marks.push(fill);
      }
      var line=mk('path',{d:d,fill:'none',stroke:color(j),'stroke-width':3,'stroke-linejoin':'round','stroke-linecap':'round',pathLength:1,'class':'lv-line'},svg);
      line.style.setProperty('--k-i',j);marks.push(line);
      var last=pts[pts.length-1],end=mk('g',{'class':'lv-end'},svg);
      end.style.setProperty('--k-i',j);
      mk('circle',{cx:last[0],cy:last[1],r:5.5,fill:color(j),'class':'lv-dot'},end);
      if(endLabels){
        var tx=mk('text',{x:last[0]+12,y:last[1]+5,'class':'lv-endlabel'},end);
        tx.textContent=fmt(se.data[se.data.length-1]);ends.push(tx);
      }
    });
    // Keep end labels from overlapping.
    ends.sort(function(a,b){return a.getAttribute('y')-b.getAttribute('y')});
    for(var e=1;e<ends.length;e++){
      var py=+ends[e-1].getAttribute('y'),cy=+ends[e].getAttribute('y');
      if(cy-py<20)ends[e].setAttribute('y',py+20);
    }
    var hair=mk('line',{'class':'lv-hair',y1:padT,y2:padT+ph,x1:0,x2:0,opacity:0},svg);
    var dots=series.map(function(se,j){return mk('circle',{r:6,fill:color(j),'class':'lv-dot',opacity:0},svg)});
    var over=mk('rect',{x:padL,y:padT,width:pw,height:ph,fill:'transparent'},svg);
    over.addEventListener('mousemove',function(ev){
      var p=local(svg,ev),i=Math.max(0,Math.min(n-1,Math.round((p.x-padL)/band-.5))),x=X(i);
      hair.setAttribute('x1',x);hair.setAttribute('x2',x);hair.setAttribute('opacity',1);
      var ys=[];
      dots.forEach(function(dot,j){
        var v=series[j].data[i];
        if(v==null){dot.setAttribute('opacity',0);return}
        dot.setAttribute('cx',x);dot.setAttribute('cy',Y(v));dot.setAttribute('opacity',1);ys.push(Y(v));
      });
      tipShow(plot,tip,x,ys.length?Math.min.apply(null,ys):padT,labels[i]||'',rows(i));
    });
    over.addEventListener('mouseleave',function(){
      hair.setAttribute('opacity',0);dots.forEach(function(d){d.setAttribute('opacity',0)});tip.classList.remove('on');
    });
  }

  function donut(box,plot,svg,tip,cfg,labels,se,fmt,W,H){
    var vals=se.data,total=vals.reduce(function(a,b){return a+b},0)||1;
    var S=Math.min(W,H),c=S/2,sw=S*.15,r=c-sw/2-6,C=2*Math.PI*r,gap=vals.length>1?3:0,acc=0,segs=[];
    var lg=div('lv-legend',box),g=mk('g',{transform:'rotate(-90 '+c+' '+c+')'},svg);
    vals.forEach(function(v,i){
      var len=Math.max(0,v/total*C-gap),mid=(acc+len/2)/r;
      var seg=mk('circle',{cx:c,cy:c,r:r,fill:'none',stroke:color(i),'stroke-width':sw,
        'stroke-dasharray':len+' '+C,'stroke-dashoffset':-acc,'class':'lv-seg'},g);
      seg.style.setProperty('--k-i',i);seg.style.setProperty('--C',C+'px');
      segs.push(seg);acc+=v/total*C;
      var pct=Math.round(v/total*100)+'%',k=key(lg,color(i),labels[i]||'');
      var b=document.createElement('b');b.textContent=fmt(v);k.appendChild(b);
      var sm=document.createElement('small');sm.textContent=pct;k.appendChild(sm);
      function on(){
        dim(segs,[seg]);seg.setAttribute('stroke-width',sw+10);
        tipShow(plot,tip,c+Math.cos(mid-Math.PI/2)*r,c+Math.sin(mid-Math.PI/2)*r,labels[i]||'',[[color(i),pct,fmt(v)]]);
      }
      function off(){undim(segs);seg.setAttribute('stroke-width',sw);tip.classList.remove('on')}
      seg.addEventListener('mouseenter',on);seg.addEventListener('mouseleave',off);
      k.addEventListener('mouseenter',on);k.addEventListener('mouseleave',off);
    });
    var center=mk('g',{'class':'lv-center'},svg);
    var tt=mk('text',{x:c,y:c+S*.03,'text-anchor':'middle','class':'lv-total',style:'font-size:'+Math.round(S*.13)+'px'},center);
    tt.textContent=cfg.total!=null?cfg.total:fmt(total);
    mk('text',{x:c,y:c+S*.03+Math.round(S*.09),'text-anchor':'middle',style:'font-size:'+Math.round(S*.055)+'px'},center).textContent=cfg.center||'Total';
  }

  [].forEach.call(document.querySelectorAll('.chart[data-chart]'),render);
  if(!still)document.addEventListener('slideenter',function(e){
    var sl=e.target;if(!sl||!sl.querySelectorAll)return;
    [].forEach.call(sl.querySelectorAll('.chart[data-chart]'),function(b){b.classList.remove('lv-play');void b.offsetWidth;b.classList.add('lv-play')});
  });
})();`

/**
 * Slide effects that need script: counters ([data-count]), SVG line drawing (.draw)
 * and typing text (.typewriter). They start on each slideenter. Plain browser JS.
 */
const SLIDE_FX_JS = String.raw`
(function(){
  if(document.documentElement.classList.contains('lv-static'))return;
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  function ms(v){v=(v||'').trim();var n=parseFloat(v);return isNaN(n)?null:(/ms$/.test(v)?n:n*1000)}
  function delayOf(el,fallback){
    var cs=getComputedStyle(el),d=ms(cs.getPropertyValue('--d'));
    return (ms(cs.getPropertyValue('--lv-base'))||0)+(d===null?fallback:d);
  }
  function count(el){
    if(el.__lvText===undefined)el.__lvText=el.textContent;
    var src=el.__lvText,m=/-?\d[\d,]*(\.\d+)?/.exec(src);
    if(!m)return;
    var target=parseFloat(m[0].replace(/,/g,'')),dec=m[1]?m[1].length-1:0,group=m[0].indexOf(',')>=0;
    var pre=src.slice(0,m.index),post=src.slice(m.index+m[0].length);
    var dur=parseFloat(el.getAttribute('data-duration'))||1800,token={},start=null;
    function fmt(v){var s=v.toFixed(dec);if(group){var p=s.split('.');p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g,',');s=p.join('.')}return pre+s+post}
    el.__lvToken=token;el.textContent=fmt(0);
    setTimeout(function(){requestAnimationFrame(function step(t){
      if(el.__lvToken!==token)return;
      if(start===null)start=t;
      var p=Math.min(1,(t-start)/dur);
      el.textContent=fmt(target*(1-Math.pow(1-p,4)));
      if(p<1)requestAnimationFrame(step);
    })},delayOf(el,300));
  }
  var SHAPES='path,line,polyline,polygon,circle,ellipse,rect';
  function draw(root){
    var shapes=root.matches(SHAPES)?[root]:[].slice.call(root.querySelectorAll(SHAPES));
    var base=delayOf(root,300),dur=parseFloat(root.getAttribute('data-duration'))||1600;
    shapes.forEach(function(p,k){
      var len;try{len=p.getTotalLength()}catch(e){return}
      if(!len)return;
      p.style.transition='none';p.style.strokeDasharray=len;p.style.strokeDashoffset=len;
      p.getBoundingClientRect();
      p.style.transition='stroke-dashoffset '+dur+'ms cubic-bezier(.65,0,.35,1) '+(base+k*150)+'ms';
      p.style.strokeDashoffset='0';
    });
  }
  function type(el){
    if(el.__lvText===undefined)el.__lvText=el.textContent;
    var chars=Array.from(el.__lvText),speed=parseFloat(el.getAttribute('data-speed'))||40,token={},i=0;
    el.__lvToken=token;el.textContent='';el.classList.add('lv-typing');
    setTimeout(function tick(){
      if(el.__lvToken!==token)return;
      el.textContent=chars.slice(0,++i).join('');
      if(i<chars.length)setTimeout(tick,speed);else setTimeout(function(){if(el.__lvToken===token)el.classList.remove('lv-typing')},1200);
    },delayOf(el,400));
  }
  document.addEventListener('slideenter',function(e){
    var s=e.target;if(!s||!s.querySelectorAll)return;
    [].forEach.call(s.querySelectorAll('[data-count]'),count);
    [].forEach.call(s.querySelectorAll('.draw'),draw);
    [].forEach.call(s.querySelectorAll('.typewriter'),type);
  });
})();`

/** Builds Chart.js charts from the designer's chart components ([data-chartjs]). */
const CHARTJS_INIT = String.raw`
(function(){
  if(!window.Chart)return;
  var still=document.documentElement.classList.contains('lv-static')||!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  var cs=getComputedStyle(document.querySelector('.slide')||document.body);
  function v(n,d){return cs.getPropertyValue(n).trim()||d}
  function alpha(c,a){return /^#[0-9a-f]{6}$/i.test(c)?c+('0'+Math.round(a*255).toString(16)).slice(-2):c}
  var pal=[];for(var i=1;i<=8;i++)pal.push(v('--c'+i,'#3987e5'));
  var fg=v('--fg','#fff'),grid=v('--border','#333'),solid=v('--bg-solid','#111');
  Chart.defaults.color=v('--muted','#999');Chart.defaults.borderColor=grid;
  Chart.defaults.font.family=v('--font','sans-serif');Chart.defaults.font.size=16;
  function csv(t){return String(t||'').split(/\r?\n/).map(function(l){return l.split(',').map(function(c){return c.trim()})}).filter(function(r){return r.some(function(c){return c!==''})})}
  var made=[];
  [].forEach.call(document.querySelectorAll('[data-chartjs]'),function(box){
    var cfg;try{cfg=JSON.parse(box.getAttribute('data-chartjs'))}catch(e){return}
    var rows=csv(cfg.data);if(rows.length<2)return;
    var head=rows.shift(),labels=rows.map(function(r){return r[0]});
    var kind=cfg.type||'bar',type=kind==='hbar'?'bar':kind==='area'?'line':kind;
    var round=type==='pie'||type==='doughnut'||type==='polarArea',cart=type==='bar'||type==='line';
    var sets=head.slice(1).map(function(name,j){
      var data=rows.map(function(r){return parseFloat(String(r[j+1]||'').replace(/[^\d.\-]/g,''))||0});
      var c=pal[Math.min(j,7)];
      if(round)return {label:name,data:data,backgroundColor:labels.map(function(_,k){return type==='polarArea'?alpha(pal[Math.min(k,7)],.75):pal[Math.min(k,7)]}),
        borderColor:solid,borderWidth:2,hoverOffset:14};
      if(type==='line'){
        var fill=kind==='area'&&j===0,compare=kind==='area'&&j>0;
        return {label:name,data:data,borderColor:c,backgroundColor:fill?alpha(c,.24):c,fill:fill?'origin':false,borderDash:compare?[7,6]:[],
          tension:.35,borderWidth:compare?2.5:3,pointRadius:0,pointHoverRadius:6,pointBackgroundColor:c,pointBorderColor:solid,pointBorderWidth:2};
      }
      if(type==='radar')return {label:name,data:data,borderColor:c,backgroundColor:alpha(c,.2),borderWidth:2,pointRadius:3,pointBackgroundColor:c};
      return {label:name,data:data,backgroundColor:c,borderRadius:6,borderSkipped:'start',maxBarThickness:64};
    });
    var rtl=getComputedStyle(box).direction==='rtl';
    var opts={responsive:true,maintainAspectRatio:false,indexAxis:kind==='hbar'?'y':'x',
      animation:still?false:{duration:1100,easing:'easeOutQuart'},
      interaction:{mode:cart?'index':'nearest',intersect:!cart},
      plugins:{
        legend:{display:cfg.legend!==false&&(round||sets.length>1),position:'bottom',rtl:rtl,
          labels:{usePointStyle:true,pointStyle:'rectRounded',padding:18,color:fg}},
        tooltip:{rtl:rtl,backgroundColor:solid,titleColor:fg,bodyColor:fg,borderColor:grid,borderWidth:1,padding:12,cornerRadius:10,boxPadding:6,usePointStyle:true}
      },
      scales:cart?{
        // Right-to-left slides read from the right: time runs right to left, bars grow leftwards.
        x:{stacked:!!cfg.stacked,reverse:rtl,beginAtZero:kind==='hbar',grid:{display:kind==='hbar'},border:{display:false}},
        y:{stacked:!!cfg.stacked,beginAtZero:true,position:rtl?'right':'left',grid:{display:kind!=='hbar'},border:{display:false}}
      }:(type==='radar'||type==='polarArea')?{
        r:{beginAtZero:true,grid:{color:grid},angleLines:{color:grid},pointLabels:{color:fg,font:{size:15}},ticks:{display:false}}
      }:{}
    };
    if(type==='doughnut')opts.cutout='62%';
    made.push({box:box,chart:new Chart(box.querySelector('canvas'),{type:type,data:{labels:labels,datasets:sets},options:opts})});
  });
  function delay(el){
    var c=getComputedStyle(el),t=function(v){v=(v||'').trim();var n=parseFloat(v);return isNaN(n)?0:/ms$/.test(v)?n:n*1000};
    return t(c.getPropertyValue('--lv-base'))+t(c.getPropertyValue('--d'))+150;
  }
  if(!still)document.addEventListener('slideenter',function(e){
    made.forEach(function(m){
      if(!e.target.contains(m.box))return;
      m.chart.reset();m.chart.draw();
      clearTimeout(m.t);m.t=setTimeout(function(){m.chart.update()},delay(m.box.closest('[data-el]')||m.box));
    });
  });
})();`

/** Builds Leaflet maps from the designer's map components ([data-map]). Tiles need internet. */
const MAP_INIT = String.raw`
(function(){
  if(!window.L)return;
  var root=document.documentElement,still=root.classList.contains('lv-static'),edit=root.classList.contains('lv-edit');
  var reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  function dark(){
    var c=getComputedStyle(document.querySelector('.slide')||document.body).getPropertyValue('--bg-solid').trim();
    var m=/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(c);
    return !m||parseInt(m[1],16)*.299+parseInt(m[2],16)*.587+parseInt(m[3],16)*.114<128;
  }
  var maps=[],live=!still||edit;
  [].forEach.call(document.querySelectorAll('[data-map]'),function(box){
    var cfg;try{cfg=JSON.parse(box.getAttribute('data-map'))}catch(e){return}
    var esri='https://server.arcgisonline.com/ArcGIS/rest/services/',tail='/MapServer/tile/{z}/{y}/{x}';
    var night=cfg.style==='dark'||(cfg.style!=='light'&&cfg.style!=='streets'&&cfg.style!=='satellite'&&dark());
    var base=cfg.style==='streets'?'World_Street_Map':cfg.style==='satellite'?'World_Imagery':night?'Canvas/World_Dark_Gray_Base':'Canvas/World_Light_Gray_Base';
    var labels=cfg.style==='streets'?null:cfg.style==='satellite'?'Reference/World_Boundaries_and_Places':night?'Canvas/World_Dark_Gray_Reference':'Canvas/World_Light_Gray_Reference';
    var map=L.map(box,{zoomControl:live,dragging:live,doubleClickZoom:live,scrollWheelZoom:edit,touchZoom:live,
      boxZoom:false,keyboard:false,zoomSnap:.25,fadeAnimation:live,zoomAnimation:live});
    map.setView([cfg.lat,cfg.lng],cfg.zoom);
    L.tileLayer(esri+base+tail,{maxZoom:19,maxNativeZoom:cfg.style==='satellite'||cfg.style==='streets'?19:16,attribution:'Tiles &copy; Esri'}).addTo(map);
    if(labels)L.tileLayer(esri+labels+tail,{maxZoom:19,maxNativeZoom:16,pane:'overlayPane'}).addTo(map);
    String(cfg.markers||'').split(/\r?\n/).forEach(function(line){
      var p=line.split(','),la=parseFloat(p[0]),ln=parseFloat(p[1]);
      if(isNaN(la)||isNaN(ln))return;
      var m=L.marker([la,ln],{icon:L.divIcon({className:'lv-pin',html:'<i></i>',iconSize:[24,24],iconAnchor:[12,12]})}).addTo(map);
      var label=p.slice(2).join(',').trim();
      if(label){var t=document.createElement('span');t.textContent=label;m.bindTooltip(t,{permanent:true,direction:'top',offset:[0,-14],className:'lv-maptip'})}
    });
    if(edit)map.on('moveend',function(){
      var c=map.getCenter(),el=box.closest('[data-el]');
      parent.postMessage({lv:'map',id:el&&el.getAttribute('data-el'),lat:+c.lat.toFixed(5),lng:+c.lng.toFixed(5),zoom:map.getZoom()},'*');
    });
    maps.push({box:box,map:map,cfg:cfg});
  });
  if(!still&&!reduce)document.addEventListener('slideenter',function(e){
    maps.forEach(function(m){
      if(!e.target.contains(m.box))return;
      m.map.invalidateSize();
      m.map.setView([m.cfg.lat,m.cfg.lng],Math.max(1,m.cfg.zoom-3),{animate:false});
      setTimeout(function(){m.map.flyTo([m.cfg.lat,m.cfg.lng],m.cfg.zoom,{duration:1.8})},450);
    });
  });
})();`

/**
 * Lets the designer move and change components without reloading the slide:
 * {lv:'geom'} moves one, {lv:'html'} swaps in its new HTML (not charts or maps,
 * which keep their live state and are rebuilt when the change is saved).
 */
const EDIT_BRIDGE_JS = String.raw`
(function(){
  addEventListener('message',function(e){
    var d=e.data;if(!d||!d.lv||!d.id)return;
    var el=document.querySelector('[data-el="'+CSS.escape(d.id)+'"]');if(!el)return;
    var live=el.hasAttribute('data-map')||el.hasAttribute('data-chartjs');
    if(d.lv==='geom'||(d.lv==='html'&&live)){
      el.style.left=d.x+'px';el.style.top=d.y+'px';el.style.width=d.w+'px';el.style.height=d.h+'px';
    }else if(d.lv==='html'){
      var t=document.createElement('template');t.innerHTML=d.html;
      var n=t.content.firstElementChild;if(n){el.replaceWith(n);var sc=n.parentNode||document;if(window.__lvFx)window.__lvFx(sc);if(window.__lvFx3)window.__lvFx3(sc)}
    }
  });
})();`

/** Chart and map libraries, only for documents that use them. */
function libraries(slides: Slide[], edit = false): { css: string; js: string } {
  const charts = slides.some((s) => hasType(s.elements, 'chart'))
  const maps = slides.some((s) => hasType(s.elements, 'map'))
  // The globe's land outlines; slide HTML written by hand or by the AI can use a globe too.
  const globes = slides.some((s) => hasType(s.elements, 'globe') || s.html.includes('fx3-globe'))
  // Motion components; slide HTML written by hand or by the AI can use them too.
  const pro = slides.some((s) => PRO_TYPES.some((t) => hasType(s.elements, t)) || s.html.includes('fxp-'))
  return {
    css: (maps ? MAP_LIB_CSS : '') + (pro ? PRO_CSS : ''),
    js:
      (globes ? `<script>${GLOBE_LAND_JS}</script>` : '') +
      (pro ? `<script>${PRO_JS}</script>` : '') +
      (charts ? `<script>${CHART_LIB_JS}</script><script>${CHARTJS_INIT}</script>` : '') +
      (maps ? `<script>${MAP_LIB_JS}</script><script>${MAP_INIT}</script>` : '') +
      (edit ? `<script>${EDIT_BRIDGE_JS}</script>` : '')
  }
}

// The preview shows one slide, so tell its scripts it is on screen, as the presenter does.
const PREVIEW_ENTER_JS =
  "<script>document.querySelector('.slide').dispatchEvent(new CustomEvent('slideenter',{bubbles:true}))</script>"

/**
 * A single slide as a full document, for the editor preview and thumbnails.
 * The parent scales the iframe (slideSize(deck), usually 1280x720) to fit.
 */
export function buildSlideDocument(
  deck: Deck,
  index: number,
  opts: { animate?: boolean; edit?: boolean } = {}
): string {
  const slide = deck.slides[index]
  // Thumbnails show every element in its final place, with nothing moving.
  const animate = opts.animate && !opts.edit
  const staticCss = animate ? '' : STATIC_MOTION_CSS
  const classes = [animate ? '' : 'lv-static', opts.edit ? 'lv-edit' : ''].filter(Boolean).join(' ')
  const libs = libraries(slide ? [slide] : [], opts.edit)
  const { width, height } = slideSize(deck)
  return `<!doctype html><html${classes ? ` class="${classes}"` : ''}><head><meta charset="utf-8">
<style>${deckCss(deck)}
${libs.css}
html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;background:#000}
${staticCss}</style></head><body>${
    slide
      ? sectionHtml(slide, index, true) + `<script>${CHART_JS}${SLIDE_FX_JS}${FX_JS}</script><script>${FX3D_JS}</script>` + libs.js + PREVIEW_ENTER_JS
      : ''
  }</body></html>`
}

/**
 * Slide transitions. Each slide is placed by --tx/--ty (move), --sc (scale) and --ry (3D turn).
 * A hidden slide waits where the next slide comes in from; .lv-leave is where the old one goes.
 * --lv-dir is -1 when going back (or in a right-to-left deck), which mirrors the movement.
 * Hidden slides have no transition, so they jump to the right side before animating in.
 */
const TRANSITION_CSS = `
.lv-stage{position:fixed;inset:0;overflow:hidden;--lv-dir:1;--lv-base:.3s;
  --lv-tdur:.8s;--lv-tease:cubic-bezier(.77,0,.18,1)}
.lv-stage>.slide{position:absolute;left:50%;top:50%;margin:0;--tx:0px;--ty:0%;--sc:1;--ry:0deg;
  transform:translate(-50%,-50%) scale(var(--lv-scale,1)) perspective(2200px)
    translate(calc(var(--tx) * var(--lv-dir)),var(--ty)) scale(var(--sc)) rotateY(calc(var(--ry) * var(--lv-dir)));
  opacity:0;visibility:hidden;transition:none}
.lv-stage[data-transition=slide]>.slide{--tx:var(--lv-push,1280px);opacity:1}
.lv-stage[data-transition=slide]>.slide.lv-leave{--tx:calc(var(--lv-push,1280px) * -1);opacity:1}
.lv-stage[data-transition=zoom]{--lv-tdur:.7s;--lv-tease:cubic-bezier(.22,1,.36,1)}
.lv-stage[data-transition=zoom]>.slide{--sc:.82}
.lv-stage[data-transition=zoom]>.slide.lv-leave{--sc:1.18}
.lv-stage[data-transition=rotate]{--lv-tdur:.95s;--lv-tease:cubic-bezier(.65,0,.35,1)}
.lv-stage[data-transition=rotate]>.slide{--tx:640px;--ry:55deg;--sc:.8}
.lv-stage[data-transition=rotate]>.slide.lv-leave{--tx:-640px;--ry:-55deg;--sc:.8}
.lv-stage[data-transition=rise]{--lv-tdur:.8s;--lv-tease:cubic-bezier(.22,1,.36,1)}
.lv-stage[data-transition=rise]>.slide{--ty:16%;--sc:.97}
.lv-stage[data-transition=rise]>.slide.lv-leave{--ty:-6%;--sc:.94}
.lv-stage[data-transition=fade]{--lv-tdur:.6s;--lv-tease:ease;--lv-base:.15s}
.lv-stage[data-transition=none]{--lv-base:0s}
.lv-stage>.slide.active{--tx:0px;--ty:0%;--sc:1;--ry:0deg;opacity:1;visibility:visible;z-index:2;
  transition:transform var(--lv-tdur) var(--lv-tease),opacity var(--lv-tdur) ease}
.lv-stage>.slide.lv-leave{visibility:visible;opacity:0;z-index:1;
  transition:transform var(--lv-tdur) var(--lv-tease),opacity var(--lv-tdur) ease,visibility 0s linear var(--lv-tdur)}
.lv-stage[data-transition=none]>.slide{transition:none!important}`

const runtimeCss = (w: number, h: number): string => `
html,body{margin:0;height:100%;background:#000;overflow:hidden}
${TRANSITION_CSS}
.lv-progress{position:fixed;left:0;bottom:0;height:4px;background:rgba(255,255,255,.15);width:100%;z-index:10}
.lv-progress i{display:block;height:100%;width:0;background:#7c9cff;transition:width .3s}
.lv-counter{position:fixed;right:16px;bottom:12px;font:13px system-ui,sans-serif;color:rgba(255,255,255,.6);z-index:10;
  background:rgba(0,0,0,.35);padding:3px 9px;border-radius:999px}
.lv-notes{position:fixed;left:16px;right:16px;bottom:24px;max-height:30vh;overflow:auto;z-index:11;
  background:rgba(10,10,14,.92);color:#eee;font:18px/1.5 system-ui,sans-serif;padding:16px 20px;border-radius:12px;white-space:pre-wrap}
.lv-help{position:fixed;top:12px;right:16px;font:12px system-ui,sans-serif;color:rgba(255,255,255,.45);z-index:10}
body.lv-idle{cursor:none}
body.lv-idle .lv-help{opacity:0}
.lv-video .lv-progress i{transition:none}
.lv-paused{position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:12;pointer-events:none}
.lv-paused i{width:96px;height:96px;border-radius:50%;background:rgba(0,0,0,.55);position:relative}
.lv-paused i::before,.lv-paused i::after{content:"";position:absolute;top:30px;width:10px;height:36px;background:#fff;border-radius:3px}
.lv-paused i::before{left:34px}.lv-paused i::after{right:34px}
body.lv-is-paused .lv-paused{display:flex}
body.lv-capture .lv-progress,body.lv-capture .lv-counter,body.lv-capture .lv-help,body.lv-capture .lv-notes,body.lv-capture .lv-paused{display:none!important}
body.lv-capture{cursor:none}
body.lv-capture .lv-stage{bottom:${FRAME_MARK_PX}px}
@media print{
  @page{size:${w}px ${h}px;margin:0}
  html,body{height:auto;overflow:visible;background:none}
  .lv-stage{position:static}
  .lv-stage>.slide{position:relative;left:auto;top:auto;transform:none!important;opacity:1!important;
    visibility:visible!important;break-after:page;page-break-after:always;transition:none!important}
  ${STATIC_MOTION_CSS}
  .lv-progress,.lv-counter,.lv-notes,.lv-help,.lv-paused{display:none!important}
}`

// Plain browser JS, kept dependency-free so the exported file works anywhere.
const RUNTIME_JS = `
(function(){
  var cfg=JSON.parse(document.getElementById('lv-config').textContent||'{}');
  var W=cfg.w||${SLIDE_WIDTH},H=cfg.h||${SLIDE_HEIGHT},V=cfg.video||null;
  var slides=[].slice.call(document.querySelectorAll('.lv-stage>.slide'));
  var notes=JSON.parse(document.getElementById('lv-notes-data').textContent||'[]');
  var bar=document.querySelector('.lv-progress i'),counter=document.querySelector('.lv-counter');
  var notesBox=document.querySelector('.lv-notes');
  var stage=document.querySelector('.lv-stage');
  var rtl=stage.getAttribute('data-rtl')==='1';
  var cur=-1,leaveTimer;
  // Videos: each scene stays for its duration, then the next one comes in.
  var starts=[],total=0,playing=!!V,sceneTimer,sceneLeft=0,sceneT0=null;
  var audio=document.getElementById('lv-audio');
  if(V){V.durations.forEach(function(d){starts.push(total);total+=d});document.body.classList.add('lv-video');if(V.capture)document.body.classList.add('lv-capture')}
  function elapsed(){
    if(!V||cur<0)return 0;
    var used=V.durations[cur]*1000-sceneLeft+(sceneT0===null?0:performance.now()-sceneT0);
    return Math.min(total,starts[cur]+Math.max(0,used)/1000);
  }
  function schedule(){
    clearTimeout(sceneTimer);
    if(sceneT0!==null)sceneLeft-=performance.now()-sceneT0;
    sceneT0=null;
    if(!V||!playing)return;
    sceneT0=performance.now();
    sceneTimer=setTimeout(function(){
      sceneLeft=0;sceneT0=null;
      if(cur<slides.length-1)go(cur+1);
      else if(V.loop)go(0,false,true);
      else setPlaying(false);
    },Math.max(0,sceneLeft));
  }
  function syncAudio(){
    if(!audio)return;
    var t=elapsed(),d=audio.duration;
    if(d&&isFinite(d))audio.currentTime=t%d;
    if(playing){var p=audio.play();if(p&&p.catch)p.catch(function(){})}else audio.pause();
  }
  function setPlaying(on){
    if(!V||on===playing)return;
    schedule();
    playing=on;
    document.body.classList.toggle('lv-is-paused',!on&&!V.capture);
    if(!V.capture)document.getAnimations().forEach(function(a){try{on?a.play():a.pause()}catch(e){}});
    schedule();syncAudio();
  }
  function enterScene(i){sceneLeft=V.durations[i]*1000;sceneT0=null;schedule();syncAudio()}
  if(V&&!V.capture){
    setInterval(function(){
      var t=elapsed();
      bar.style.width=(total?t/total*100:0)+'%';
      if(audio){var left=total-t,fade=${AUDIO_FADE_SECONDS};audio.volume=Math.max(0,Math.min(1,V.volume*(left<fade?left/fade:1)))}
    },50);
    if(audio)audio.addEventListener('loadedmetadata',syncAudio);
  }
  function fit(){
    // The stage fills the window, except while recording a video (see FRAME_MARK_PX).
    var w=stage.clientWidth||innerWidth,h=stage.clientHeight||innerHeight;
    var s=Math.min(w/W,h/H),st=document.documentElement.style;
    st.setProperty('--lv-scale',s);
    // How far a slide moves to leave the screen completely, in slide pixels.
    st.setProperty('--lv-push',Math.ceil((w/s+W)/2)+'px');
  }
  function fire(el,name){el.dispatchEvent(new CustomEvent(name,{bubbles:true}))}
  // A deck's own CSS may animate elements without waiting for their slide, so the animation would be over
  // before anyone sees it. Start the slide's one-off animations again as it comes in (loops keep running).
  function replay(sl){
    if(!sl.getAnimations||typeof CSSAnimation==='undefined')return;
    sl.getAnimations({subtree:true}).forEach(function(a){
      if(!(a instanceof CSSAnimation)||!a.effect||a.effect.getTiming().iterations===Infinity)return;
      if(window.__lvRestartAnimation)window.__lvRestartAnimation(a);else a.currentTime=0;
    });
  }
  function go(i,fromHash,forward){
    if(!slides.length)return;
    i=Math.max(0,Math.min(slides.length-1,i));
    if(i===cur)return;
    // The start slide is marked active in the HTML, so track the shown slide in cur rather than the
    // class: that way the first slide also gets its slideenter event.
    var prev=slides[cur];
    clearTimeout(leaveTimer);
    slides.forEach(function(el){el.classList.remove('lv-leave')});
    // Going back mirrors the transition; so does a right-to-left deck.
    stage.style.setProperty('--lv-dir',String((cur>=0&&i<cur&&!forward?-1:1)*(rtl?-1:1)));
    void stage.offsetWidth;
    slides.forEach(function(el,k){if(k!==i)el.classList.remove('active')});
    if(prev){prev.classList.add('lv-leave');fire(prev,'slideleave')}
    slides[i].classList.add('active');
    leaveTimer=setTimeout(function(){
      slides.forEach(function(el){if(!el.classList.contains('active'))el.classList.remove('lv-leave')});
    },1200);
    replay(slides[i]);
    fire(slides[i],'slideenter');
    cur=i;
    if(!V)bar.style.width=((i+1)/slides.length*100)+'%';
    counter.textContent=(i+1)+' / '+slides.length;
    notesBox.textContent=notes[i]||'(no notes for this slide)';
    if(!fromHash&&!(V&&V.capture))history.replaceState(null,'','#'+(i+1));
    if(V)enterScene(i);
  }
  function fromHash(){var n=parseInt(location.hash.slice(1),10);return isNaN(n)?0:n-1}
  addEventListener('resize',fit);
  addEventListener('hashchange',function(){go(fromHash(),true)});
  addEventListener('keydown',function(e){
    if(e.target&&(e.target.isContentEditable||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)))return;
    var k=e.key;
    if(V&&(k===' '||k==='k'||k==='K')){e.preventDefault();setPlaying(!playing);return}
    if(V&&(k==='r'||k==='R'||k==='Home')){e.preventDefault();if(cur===0)enterScene(0);else go(0,false,true);setPlaying(true);return}
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
    if(V){setPlaying(!playing);return}
    if(e.clientX<innerWidth/4)go(cur-1);else go(cur+1);
  });
  var tx=null;
  addEventListener('touchstart',function(e){tx=e.touches[0].clientX},{passive:true});
  addEventListener('touchend',function(e){if(tx===null)return;var dx=e.changedTouches[0].clientX-tx;if(Math.abs(dx)>50)go(cur+(dx<0?1:-1));tx=null});
  var idle;addEventListener('mousemove',function(){document.body.classList.remove('lv-idle');clearTimeout(idle);idle=setTimeout(function(){document.body.classList.add('lv-idle')},2500)});
  fit();go(fromHash(),true);
})();`

export interface DeckDocumentOptions {
  startIndex?: number
  /**
   * For videos: 'play' plays the scenes by themselves in a loop, with the music at `audioUrl`;
   * 'capture' is for exporting: no controls, no loop, no sound, and a virtual clock (VIRTUAL_TIME_JS).
   * Unset, a video plays once without music, as in an exported HTML file.
   */
  videoMode?: 'play' | 'capture'
  audioUrl?: string
}

/** A self-contained HTML presentation: open it in any browser, or print it to PDF. Videos play by themselves. */
export function buildDeckDocument(deck: Deck, opts: DeckDocumentOptions = {}): string {
  const start = opts.startIndex ?? 0
  const video = isVideo(deck)
  const capture = video && opts.videoMode === 'capture'
  const { width, height } = slideSize(deck)
  const config = {
    w: width,
    h: height,
    video: video
      ? { durations: deck.slides.map(sceneSeconds), loop: opts.videoMode === 'play', capture, volume: deck.audio?.volume ?? 1 }
      : null
  }
  const audio =
    video && !capture && opts.audioUrl
      ? `<audio id="lv-audio" src="${escapeHtml(opts.audioUrl)}" preload="auto" loop></audio>\n`
      : ''
  const help = video ? 'Space pause · ← → scenes · R restart · F fullscreen' : '← → navigate · F fullscreen · N notes'
  const sections = deck.slides.map((s, i) => sectionHtml(s, i, i === start)).join('\n')
  const libs = libraries(deck.slides)
  // JSON inside <script type="application/json"> must not contain "</script".
  const notesJson = JSON.stringify(deck.slides.map((s) => s.notes ?? '')).replace(/</g, '\\u003c')
  const transition = TRANSITIONS.some((t) => t.id === deck.transition) ? deck.transition! : DEFAULT_TRANSITION
  // Slides move the other way in a right-to-left deck.
  const rtlSlides = deck.slides.filter(isRtlSlide).length
  const rtl = rtlSlides * 2 > deck.slides.length ? '1' : '0'
  return `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="generator" content="Lawnak Vision">
<title>${escapeHtml(deck.title)}</title>
${capture ? `<script>${VIRTUAL_TIME_JS}</script>\n` : ''}<style>${deckCss(deck)}
${libs.css}
${runtimeCss(width, height)}</style>
</head><body>
<div class="lv-stage" data-transition="${transition}" data-rtl="${rtl}">
${sections}
</div>
<div class="lv-progress"><i></i></div>
<div class="lv-counter"></div>
<div class="lv-help">${help}</div>
<div class="lv-paused"><i></i></div>
<aside class="lv-notes" hidden></aside>
${audio}<script type="application/json" id="lv-notes-data">${notesJson}</script>
<script type="application/json" id="lv-config">${JSON.stringify(config).replace(/</g, '\\u003c')}</script>
<script>${CHART_JS}${SLIDE_FX_JS}${FX_JS}</script>
<script>${FX3D_JS}</script>
${libs.js}
<script>${RUNTIME_JS}</script>
</body></html>`
}
