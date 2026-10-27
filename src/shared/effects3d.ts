/**
 * 3D components and shader backgrounds, written for Lawnak Vision in plain CSS,
 * WebGL and browser JS (no libraries), so they work offline in exported decks.
 *
 *   Components:  fx3-orb  fx3-cover  fx3-ring  fx3-globe
 *   Backgrounds: on <slide>: bg-silk  bg-liquid  bg-plasma  bg-blob  bg-portal
 *   Cards:       fx3-depth (tilts, and its contents float apart in layers)
 *
 * The orb, coverflow, ring, silk and liquid strings were restored from
 * examples/3d-shaders.html after this file was overwritten by mistake.
 */

// ---------- More shader backgrounds ----------
// Same contract as the shaders inside FX3D_JS: uRes, uTime, uMouse (0..1, y up),
// uA = theme accent, uB = theme background. They paint an opaque background.

const GLSL_COMMON = `precision highp float;
uniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;uniform vec3 uA;uniform vec3 uB;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),u.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*vnoise(p);p=p*2.02+vec2(1.7,9.2);a*=.5;}return v;}
// Turns a color around the hue wheel, to get partner colors from the accent.
vec3 hue(vec3 c,float a){vec3 k=vec3(.57735);float ca=cos(a);return c*ca+cross(k,c)*sin(a)+k*dot(k,c)*(1.-ca);}
float edge(vec2 uv){return smoothstep(1.25,.2,length(uv-.5));}
`

const MORE_SHADERS: Record<string, string> = {
  // Slow plasma bands in the accent and two partner hues.
  plasma: GLSL_COMMON + `
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;vec2 p=(gl_FragCoord.xy-.5*uRes)/uRes.y*2.2+(uMouse-.5)*.25;float t=uTime*.22;
  float v=sin(p.x*2.1+t)+sin((p.y*2.3+t)*1.1)+sin((p.x+p.y)*1.7+t*1.3)
    +sin(length(p*1.6+vec2(sin(t*.7),cos(t*.5))*1.5)*3.-t);
  v*=.25;
  vec3 col=mix(uA,hue(uA,.9),.5+.5*sin(v*3.1416+t*.3));
  col=mix(col,hue(uA,-.75),.5+.5*sin(v*6.2832-1.));
  float k=(.42+.3*sin(v*9.42+t))*edge(uv);
  gl_FragColor=vec4(mix(uB,col,clamp(k,0.,1.)*.65),1.);
}`,
  // A soft gradient blob that stretches toward the mouse.
  blob: GLSL_COMMON + `
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;float k=uRes.x/uRes.y;vec2 p=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  vec2 m=(uMouse-.5)*vec2(k,1.);float t=uTime*.5,d=0.;
  for(int i=0;i<5;i++){float fi=float(i);
    vec2 c=m*(.3+.14*fi)+vec2(.24,.17)*vec2(sin(t*(.5+.11*fi)+fi*1.7),cos(t*(.45+.09*fi)+fi*2.3));
    float r=.12+.02*sin(t*1.3+fi*2.);d+=r*r/max(dot(p-c,p-c),1e-4);}
  float body=smoothstep(.9,2.6,d),halo=clamp(d*.1,0.,1.);
  float ang=atan(p.y-m.y*.5,p.x-m.x*.5);
  vec3 col=mix(uA,hue(uA,1.9),.5+.5*sin(ang*2.+t));
  col=mix(col,hue(uA,-1.4),smoothstep(2.,7.,d)*.55);
  float a=max(body*.6,halo*halo*.45);
  gl_FragColor=vec4(mix(uB,col,clamp(a,0.,1.)),1.);
}`,
  // A glowing portal with light streaking out of it.
  portal: GLSL_COMMON + `
void main(){
  vec2 p=(gl_FragCoord.xy-.5*uRes)/uRes.y;p-=(uMouse-.5)*.08;float r=length(p),a=atan(p.y,p.x)+uTime*.05;
  float z=.22/(r+.015)+uTime*.9,k=a/6.2832*56.,id=floor(k),fk=fract(k);
  float rnd=h21(vec2(id,3.7)),f=fract(z*(.25+.4*rnd)+rnd*7.);
  float streak=pow(max(0.,1.-abs(fk-.5)*2.),5.)*smoothstep(.55,1.,f)*smoothstep(.04,.28,r)*step(.35,rnd);
  float ring=exp(-pow((r-.17-.006*sin(uTime*2.))*22.,2.));
  float core=min(1.,.018/(r*r*8.+.02));
  float swirl=fbm(vec2(a*3.,.08/(r+.02)-uTime*.6))*smoothstep(.32,.08,r);
  vec3 C=hue(uA,1.2),D=hue(uA,-1.);
  vec3 add=uA*streak*.9+mix(uA,C,.5)*ring*.6+mix(uA,vec3(1.),.5)*core*.28+D*swirl*.38;
  float al=clamp(streak*.9+ring*.6+core*.28+swirl*.38,0.,1.);
  gl_FragColor=vec4(mix(uB,add/max(al,.001),al),1.);
}`
}

// ---------- Globe land outlines ----------

/**
 * Coarse outlines of the land, as [lng, lat] pairs, for the dotted globe.
 * Drawn by hand at about 1–3° detail: good for dots, not for maps.
 */
const LAND: number[][] = [
  // North America
  [-168,66,-162,70,-156,71.3,-140,70,-128,70,-115,68.5,-95,72,-82,73,-80,63,-94,59,-92,57,-82,55,-79,52,-77,60,-71,61,-65,60,-60,55,-56,52,-60,47,-66,45,-70,43,-74,40.5,-76,37,-75.5,35,-81,31.5,-80,27,-80.5,25.2,-82.5,28,-84,30,-89,30.2,-94,29.5,-97.5,26,-97.5,22,-96,19,-91,18.5,-90.5,21,-87,21.5,-88,16,-83.5,15,-83.5,11,-81,8.5,-77.5,8.5,-79.5,7.5,-82,8,-86,11.5,-91,14,-94.5,16,-98,16,-105,19.5,-110,23,-115,30,-117,32.5,-120.5,34.5,-122.5,37.5,-124,40.5,-124.5,43,-124,46,-124.7,48.4,-127,50.5,-130.5,54.5,-134,58,-140,60,-146,60.5,-152,59,-156,57,-164,54.6,-158,58,-162,60,-165,62.5,-166,64.5],
  // Arctic islands of Canada
  [-125,71,-120,76,-105,78,-90,80.5,-70,83,-62,82,-75,78,-80,73.5,-90,72,-105,73,-115,71],
  // Greenland
  [-73,78,-60,82,-30,83.5,-20,82,-18,77,-20,72,-22,70,-32,68,-40,65,-43,60,-48,61,-52,65,-54,68,-56,72,-66,76],
  // Iceland
  [-24,65.5,-22,66.4,-16,66.5,-13.5,65.2,-15,64.3,-18.7,63.4,-22.7,63.8],
  // Cuba, Hispaniola
  [-84.9,21.9,-82,23.2,-77.5,22.5,-74.2,20.2,-77.7,19.9,-80.5,21.9,-84.5,21.3],
  [-74.4,18.5,-72.8,19.9,-69.9,19.6,-68.4,18.5,-71.5,17.6],
  // South America
  [-77.5,8.5,-75,11,-72,12,-68,11,-62,10.7,-60,8.5,-57,6,-52,5,-50,2,-49,0,-44,-2.5,-38.5,-3.7,-35,-5.5,-35,-9,-38.5,-13,-39,-17.5,-41,-22,-44,-23,-48,-26,-49,-28.5,-53,-33.5,-56,-34.8,-58,-38.5,-62,-39,-65,-41,-65,-45,-67.5,-46.5,-66,-48,-69,-51,-68.5,-53,-71,-54.5,-74.5,-52,-75.5,-47,-73.5,-42,-73.5,-37,-71.5,-30,-70.5,-23,-70.3,-18,-75,-15.5,-76.5,-12.5,-79,-8,-81.2,-5.5,-80.5,-2.5,-80,0,-78.8,1.5,-77.5,3.5,-77.3,7],
  // Africa
  [-17,21,-16,24,-13,27.8,-9.8,30,-9.5,32,-6,35.8,-2,35.1,3,36.8,10,37.2,11,35,10.5,33.6,15,32.3,20,30.9,20,32.2,25,31.8,29,30.9,32.3,31.2,34.2,31.2,34.5,28,33,27.5,35,24,37,20,38.5,18,41,15,43.3,12.7,45,10.5,51,11.8,51.2,10.5,49,6,46,2,42,-1,40,-3,39.3,-6.5,39.7,-10.5,40.6,-15,37,-17.5,35.3,-22,35.5,-24,32.6,-26,32.5,-29,30,-31.5,27,-33.8,23,-34,20,-34.8,18.3,-34,18,-31.5,16.5,-28.6,15,-26.5,14.5,-23,13,-20,11.8,-17,12.2,-14,13.5,-11,12.3,-6,11.8,-3.5,9.3,-1,9.5,2,9.7,4,8.5,4.5,6,4.3,4,6.3,1.5,6.1,-2,4.8,-4.5,5.2,-7.5,4.4,-9,5,-11.5,6.9,-13.3,8.6,-15,11,-16.7,12.5,-17.2,14.7,-16.5,16.5,-16.2,19.2],
  // Madagascar
  [49.3,-12,50.4,-15.5,49.8,-17,47.5,-24.8,45.2,-25.5,43.6,-23,44.3,-20,44,-17,46.3,-15.8,48,-13.5],
  // Europe and Asia
  [-6,36,-9,37,-9.5,39,-8.8,42,-9.3,43.2,-8,43.7,-2,43.4,-1.5,46,-2.5,47.3,-4.7,48.4,-1.5,48.7,1.5,50.2,3,51.2,4.5,52.5,5,53.4,8.5,53.6,8.5,55.5,8.2,57,10.5,57.7,10.5,56,12,54.2,14.2,53.9,18.5,54.8,21,55.2,21,57,24,58.3,23.5,59.2,28,59.5,30,60,26,60.4,22,60.5,21.4,61.5,21.5,63.5,25,65,25.3,65.8,22,65.7,21,64,18,62.5,17.3,61,18.8,59.8,18,59,16.5,57,16,56,14,55.4,12.8,55.6,12.4,56.5,11.8,58,11,59,10.5,59.5,8,58,6,58.2,5,59.3,5,61,5.3,62.5,8,63.5,10.5,64.5,12.5,66,14,67.5,16,68.6,19,70,23,70.5,26,71,30,70,31,69.7,33,69.3,36,69,41,67.5,40.5,66.2,37,66,35,64.5,37,64,40,64.5,44,66,44,68.5,46,68,53,68.5,60,68.8,60,69.8,66,69.5,68,71,69,73,72.5,72.8,73.5,71.5,78,72.4,80.5,73.5,86,74,87,75,95,76,100,77,104,77.7,107,76.8,112,76.4,113.5,73.5,120,73,127,73.5,131,71,140,72.5,150,71.5,159,70.8,161,69.6,170,70,176,69.8,180,69,186,66,190,65.5,187,64.5,183,64.5,179,62.5,175,62,170,60,164,59.8,162,58,163,56,160,54,156.5,51,156,57.5,155,59.3,151,59.2,143,59.3,140.5,57.5,138,54,141,52.5,140.4,48,135.5,43.5,132,43,130.7,42.3,129.5,40.5,129.4,36,128.5,35,126.5,34.5,126.2,37,125,38,125.3,39.5,124,39.8,121.5,39,121,40.8,118,39,117.7,38.5,119,37.2,121,37.7,122.5,37,120.5,36,119.2,34.8,120.8,32.5,121.8,31,121.9,30,121.4,28.5,119.5,25.5,117,23.5,114,22.3,110.5,21.2,110.3,20.3,108.5,21.6,106.7,20.7,105.7,18.8,108.8,15.4,109.3,12,107,10.5,105,8.6,104.9,9.9,103,10.5,102.5,12.1,100.5,13.5,100,12.2,99.2,10,100.2,8.4,101,6.9,103.3,5,103.4,4,104.2,1.4,103.5,1.3,101.2,2.8,100.2,5.5,98.3,8,98.6,11.8,97.7,16.5,95.4,15.8,94.2,16,94.5,19,93,20,92.3,21.5,91.8,22.5,90.5,22,89,21.8,86.9,21.3,85,19.5,82.3,17,80.2,15.4,80.3,13,79.8,10.3,78,8.9,77.2,8.1,76.3,9.5,75,12.5,74,15.5,72.9,19,72.7,21,70.5,20.8,69,22.4,70.4,23,68.5,23.7,67,24.8,64.5,25.2,61.6,25.2,57.4,25.7,56.4,27.1,54.8,26.5,51.6,27.9,50.1,30.1,48.6,30,47.9,29.5,48.5,28.3,49.6,27,50.2,26,50.8,24.8,51.6,25.9,51.3,24.3,54,24.1,55.5,25.4,56.3,26.2,56.3,24.9,57.4,23.9,58.8,23.6,59.8,22.4,58.5,20.4,57.7,19,56.6,18.5,55.3,17.4,52.2,15.6,49.5,14.6,45,13,43.4,12.7,42.7,15.5,42.8,16.4,41.2,19,39.1,21.5,38.4,24,37.4,25.4,35.5,28,34.9,29.5,34.5,31.5,35,33,35.9,35.2,36,36.7,34.5,36.8,32.5,36.1,30.5,36.5,28,36.7,27.3,37.8,26.3,39.2,26.5,40.3,29,41,31.3,41.1,34,42,38,41,41.5,41.5,41.5,42.6,39,44.5,37,46.5,35,45.2,33.5,44.5,32.5,45.4,33.5,46.1,31,46.6,30,45.5,28.7,44.3,28,43,28,41.5,26,40.8,23.5,40.2,22.6,40,23,39,24,38,23,36.5,21.7,36.8,21,38.3,19.5,40.5,19.4,41.8,16,43.5,13.7,45.2,12.3,45.3,12.5,44,14,42.5,16,41.4,18.5,40.1,17,39,16.6,38,15.7,38,15.6,40,14,41,12,41.8,10.5,43,8.8,44.4,7.5,43.8,5,43.3,3.1,43,3.2,41.9,0.9,41,0.1,39.5,-0.5,38.5,-2,36.7,-4.5,36.6],
  // Britain, Ireland
  [-5.7,50,1.4,51.2,1.7,52.7,0.2,53.5,-1.5,55,-2,56,-1.8,57.6,-3.4,58.6,-5,58.6,-6.2,57.5,-5.6,56,-4.8,54.8,-3.2,54.5,-3.2,53.4,-4.6,52.8,-4.2,51.6,-5.3,51.7,-3.3,51.2],
  [-6,52,-6,53.9,-5.5,54.6,-7.4,55.3,-8.4,55.2,-10,54.2,-9.8,53,-10.5,51.8,-9.5,51.5,-6.3,52.2],
  // Svalbard, Novaya Zemlya, Sakhalin
  [11,78.8,16,80,27,80.1,22,78.2,17,76.6,13,78],
  [52,71.5,56,74,64,76.5,68,76.7,58,74.2,56,72],
  [142,46,143.5,46.5,143,49.5,144.5,49,142.8,54.3,142,51.5],
  // Japan
  [130,31.5,131.5,31.5,132,33.8,135,33.5,136.8,34.5,139,34.8,140.8,35.7,141,38,142,39.5,141.4,41.4,140,40.6,140,39,139.4,38.1,137,37,136,36,133,35.5,131,34.4,130,33.5],
  [140,41.5,141.5,42.5,143.3,42,145.5,43.3,144.5,44,141.9,45.5,141.6,44,141,43,140,42.4],
  // Taiwan, Hainan, Sri Lanka, Philippines
  [120.1,23,121,25.2,122,25,120.8,21.9],
  [108.6,19.2,110.5,20.1,111,19.6,109.6,18.2],
  [79.8,8.2,80.2,9.8,81.8,7.5,81.2,6.2,80,6],
  [120.6,18.5,122.3,18.5,122,16.3,124,13.8,123.8,12.8,121.8,13.9,120.6,14.4,120,16],
  [122,7,126.5,6.4,126.2,9.3,125.4,9.8,123.6,8.6],
  // Indonesia, New Guinea
  [95.3,5.6,97.5,5.2,100.4,2.2,103.8,-1,106,-3,106,-5.9,104.5,-5.9,102.3,-4,100.3,-1,98.6,1.7],
  [105.2,-6.8,106.4,-6,108.6,-6.7,110.6,-6.9,112.7,-6.9,114.5,-7.8,114.3,-8.7,110.8,-8.2,106.4,-7.4],
  [109,1.5,109.6,-1,110.2,-3,114.5,-3.8,116.5,-3.3,116,-1,117.9,1,117.8,4.2,119,5.3,117,7,115.5,5.2,113.9,4.5,111.4,2.5,110,1.7],
  [119.4,-5.5,120.4,-5.5,120.8,-2.6,123.3,-0.9,125,1.5,124.4,0.4,121,1.2,120,0.5,119.7,-0.6],
  [131,-1.3,134,-0.9,138,-1.6,141,-2.6,145,-4.4,147.5,-6,147.8,-8,146,-8.1,143.5,-9.2,141,-9.1,138.5,-8.3,137.8,-5.3,135,-4.4,132.8,-4,132,-2.8],
  // Australia, Tasmania, New Zealand
  [113.5,-22,114,-26.5,115,-30,115,-34.3,118,-35,123.5,-33.9,126,-32.3,131,-31.5,134,-32.8,137.8,-35.6,139.5,-35.7,140.7,-38,143.5,-38.8,146.5,-39,150,-37.5,150.8,-34.6,153.1,-30.5,153.5,-28,153,-25,150.8,-22.5,148.5,-20,146,-18,145.3,-15,143.5,-14,142.5,-10.8,141.5,-13.5,141.5,-17,140,-17.7,136,-15.5,136.8,-12.2,133,-11.3,131,-12,130,-13,129.5,-15,127.8,-14,126,-14,125,-15.5,122.3,-17,121,-19.5,117,-20.7],
  [144.6,-40.7,148.3,-40.9,148,-43.2,146.5,-43.6,145.2,-42.2],
  [172.7,-34.4,174.5,-36,176,-37.6,178.5,-37.7,177,-39.5,176,-41.3,174.7,-41.3,175,-39.8,173.8,-39.2,174.6,-37],
  [172.7,-40.5,174.2,-41.7,173,-43.7,171.2,-44.4,169,-46.6,166.5,-46,168.4,-44,171.5,-41.8]
]
const WATER: number[][] = [
  [-95,59,-94,61,-87,64,-81,64,-77,60,-79,55,-82,52.5,-87,55.5,-92.5,57], // Hudson Bay
  [49,46.5,53,47,54,45,51,44.5,52.8,42,54,40.5,53.5,37.3,51,36.7,49,37.6,49.5,40.5,47.5,43,47,44.8] // Caspian Sea
]

export const FX3D_CSS = String.raw`
/* ---- 3D components ---- */
.slide .fx3-orb:not(.el){position:relative}
.slide .fx3-orb>canvas,.slide .fx3-orb>img{position:absolute;inset:-12%;width:124%;height:124%;pointer-events:none}
.slide :is(.fx3-cover,.fx3-ring):not(.el){position:relative}
.slide .fx3-cover,.slide .fx3-ring{user-select:none;-webkit-user-select:none;touch-action:none;cursor:grab}
.slide .fx3-cover:active,.slide .fx3-ring:active{cursor:grabbing}
.slide .fx3-stage{position:absolute;inset:0;perspective:1500px;perspective-origin:50% 45%}
.slide .fx3-wheel{position:absolute;inset:0;transform-style:preserve-3d}
.slide .fx3-card{position:absolute;left:50%;top:50%;border-radius:22px;overflow:hidden;color:#fff;
  box-shadow:0 26px 60px -18px rgba(0,0,0,.6),inset 0 0 0 1px rgba(255,255,255,.14);backface-visibility:hidden;will-change:transform,filter}
.slide .fx3-face{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;gap:.2em;padding:1.1em 1.2em;
  background:radial-gradient(120% 90% at 20% 0%,color-mix(in srgb,var(--k) 85%,#fff 15%),color-mix(in srgb,var(--k) 55%,#000 45%) 70%)}
.slide .fx3-face.photo{background:#000}
.slide .fx3-face img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.slide .fx3-face.photo::after{content:"";position:absolute;inset:0;background:linear-gradient(transparent 45%,rgba(0,0,0,.7))}
.slide .fx3-face>*{position:relative;z-index:1}
.slide .fx3-face .em{position:absolute;top:.55em;inset-inline-start:.6em;font-size:2.6em;line-height:1;filter:drop-shadow(0 6px 14px rgba(0,0,0,.35))}
.slide .fx3-face b{font-size:1.15em;line-height:1.25}
.slide .fx3-face span{font-size:.75em;opacity:.82}
.slide .fx3-sw{position:absolute;inset:-10%;z-index:2;pointer-events:none;opacity:0;mix-blend-mode:screen;
  background:linear-gradient(100deg,transparent 28%,#ff2d7a 38%,#ffb800 45%,#29f19c 52%,#2ab4ff 59%,#9b4dff 66%,transparent 76%)}
.slide .fx3-card.fx3-arrive .fx3-sw{animation:fx3-sweep 1.15s cubic-bezier(.3,.6,.3,1)}
@keyframes fx3-sweep{0%{opacity:.9;translate:-90% 0}100%{opacity:0;translate:90% 0}}
.slide .fx3-cap{position:absolute;left:0;right:0;bottom:0;text-align:center;font-size:20px;color:var(--fg);pointer-events:none}
.slide .fx3-cap small{display:block;font-size:15px;color:var(--muted)}
.slide .fx3-ring[data-axis=y] .fx3-cap{left:auto;right:0;top:50%;bottom:auto;width:34%;translate:0 -50%;text-align:start}
.slide.rtl .fx3-ring[data-axis=y] .fx3-cap{right:auto;left:0}
.slide canvas.fx-bg.fx3-gl,.slide img.fx-bg.fx3-gl{width:100%;height:100%}
/* ---- 3D globe ---- */
.slide .fx3-globe:not(.el){position:relative}
.slide .fx3-globe{touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none}
.slide .fx3-globe:active{cursor:grabbing}
.slide .fx3-globe>canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
/* ---- 3D depth card ---- */
.slide :has(> .fx3-depth),.slide:has(> .fx3-depth){perspective:1400px}
.slide .fx3-depth{transition:rotate .35s ease-out,scale .35s ease-out,box-shadow .35s ease-out}
.slide .fx3-depth:not(.el):not(.abs){position:relative}
.slide .fx3-depth>*{transition:translate .35s ease-out;translate:calc(var(--fx3-px,0) * var(--fx3-z,16px)) calc(var(--fx3-py,0) * var(--fx3-z,16px))}
.slide .fx3-depth>:nth-child(2){--fx3-z:24px}
.slide .fx3-depth>:nth-child(3){--fx3-z:32px}
.slide .fx3-depth>:nth-child(n+4){--fx3-z:40px}
.slide .fx3-depth>img{--fx3-z:-8px}
.slide .fx3-depth::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .35s;
  background:radial-gradient(70% 60% at var(--fx3-lx,50%) var(--fx3-ly,0%),rgba(255,255,255,.22),transparent 70%)}
.slide .fx3-depth.fx3-on{box-shadow:0 40px 70px -30px rgba(0,0,0,.6)}
.slide .fx3-depth.fx3-on::after{opacity:1}
`

export const FX3D_JS = String.raw`
(function(){
  var root=document.documentElement,still=root.classList.contains('lv-static');
  var reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches),calm=still||reduce;
  var SHADERS={orb:"precision highp float;\nuniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;uniform vec3 uA;uniform vec3 uB;uniform float uEnergy;\n\nfloat h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}\nfloat vnoise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);\n  return mix(mix(h21(i),h21(i+vec2(1,0)),u.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x),u.y);}\nfloat fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*vnoise(p);p=p*2.02+vec2(1.7,9.2);a*=.5;}return v;}\nvoid main(){\n  vec2 uv=(gl_FragCoord.xy-.5*uRes)/min(uRes.x,uRes.y)*2.5;\n  float r=length(uv);\n  vec2 m=(uMouse-.5)*2.;\n  float glow=exp(-max(r-1.,0.)*5.)*.6*(.7+.3*sin(uTime*1.7));\n  vec3 col=vec3(0.);float a=0.;\n  if(r<1.){\n    float z=sqrt(1.-r*r);vec3 n=vec3(uv,z);\n    // Dust inside the glass: swirling noise, magnified like a lens, pulled toward the pointer.\n    float s=uTime*.18;mat2 R=mat2(cos(s),-sin(s),sin(s),cos(s));\n    vec2 q=R*(uv*(1.25+.5*z))+m*.45*(1.-r*.6);\n    float d=fbm(q*2.2+vec2(uTime*.07,-uTime*.05));\n    float d2=fbm(q*4.6+d*1.8-vec2(uTime*.11,uTime*.06));\n    float dust=smoothstep(.5,.92,d2);\n    float spark=pow(h21(floor(q*70.)+floor(uTime*4.)),55.)*2.;\n    vec3 inner=mix(uB*.18,uA*.75,d)*(.35+.65*z)+mix(uA,vec3(1.),.35)*dust*1.1+vec3(1.)*spark*z;\n    // Glass: rim light, electric arcs along the edge, highlight.\n    float fres=pow(1.-z,2.6);\n    float ang=atan(uv.y,uv.x);\n    float e=fbm(vec2(ang*2.6+uTime*1.6,uTime*.9+r*6.));\n    float arc=smoothstep(.035,0.,abs(e-.52))*smoothstep(.68,.97,r)*uEnergy;\n    float e2=fbm(vec2(ang*4.1-uTime*2.1,uTime*1.4));\n    arc+=smoothstep(.025,0.,abs(e2-.5))*smoothstep(.8,.99,r)*uEnergy*.8;\n    vec3 L=normalize(vec3(-.45,.6,.75));\n    float spec=pow(max(dot(reflect(-L,n),vec3(0.,0.,1.)),0.),36.);\n    float spec2=pow(max(dot(reflect(-normalize(vec3(.6,-.5,.6)),n),vec3(0.,0.,1.)),0.),18.)*.25;\n    col=inner+mix(uA,vec3(1.),.45)*fres*1.3+mix(uA,vec3(.85,.95,1.),.55)*arc*2.4+vec3(spec*.95+spec2);\n    a=smoothstep(1.,.982,r);\n  }\n  vec3 outc=mix(uA*1.2,col,a);\n  float oa=max(a,glow);\n  gl_FragColor=vec4(outc,oa);\n}",silk:"precision highp float;\nuniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;uniform vec3 uA;uniform vec3 uB;\n\nfloat h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}\nfloat vnoise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);\n  return mix(mix(h21(i),h21(i+vec2(1,0)),u.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x),u.y);}\nfloat fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*vnoise(p);p=p*2.02+vec2(1.7,9.2);a*=.5;}return v;}\nvoid main(){\n  vec2 uv=gl_FragCoord.xy/uRes;vec2 p=uv*vec2(uRes.x/uRes.y,1.);\n  float t=uTime*.22;\n  p+=(uMouse-.5)*.12;\n  // Long diagonal folds, bent by slow noise, lit like satin.\n  float n=fbm(p*1.3+vec2(t*.3,-t*.18));\n  float a=(p.x*1.1+p.y*.55)*9.5+t*1.7+n*2.6;\n  float b=(p.x*.5-p.y*1.1)*6.-t*1.1+n*1.5;\n  float s=.7*sin(a+.6*sin(b))+.3*sin(b);\n  float light=smoothstep(-.75,1.,s);\n  float spec=pow(light,14.)*1.3;\n  vec3 col=mix(uB*1.1,mix(uB,uA,.55),light*.85)+spec*mix(vec3(1.),uA,.55)*.38;\n  col*=.62+.38*smoothstep(1.25,.15,length(uv-vec2(.5,.42)));\n  gl_FragColor=vec4(mix(uB,col,.9),1.);\n}",liquid:"precision highp float;\nuniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;uniform vec3 uA;uniform vec3 uB;\n\nfloat h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}\nfloat vnoise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);\n  return mix(mix(h21(i),h21(i+vec2(1,0)),u.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x),u.y);}\nfloat fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*vnoise(p);p=p*2.02+vec2(1.7,9.2);a*=.5;}return v;}\nvec3 pal(float t){return .5+.5*cos(6.2831*(t+vec3(0.,.33,.67)));}\nvoid main(){\n  vec2 uv=gl_FragCoord.xy/uRes;vec2 p=uv*vec2(uRes.x/uRes.y,1.)*1.8;\n  float t=uTime*.1;\n  vec2 m=(uMouse-.5)*vec2(uRes.x/uRes.y,1.);\n  p+=m*.3*exp(-length(uv-uMouse)*3.);\n  vec2 q=vec2(fbm(p+t),fbm(p+vec2(5.2,1.3)-t));\n  vec2 r=vec2(fbm(p+3.*q+vec2(1.7,9.2)+t*1.5),fbm(p+3.*q+vec2(8.3,2.8)-t));\n  float v=fbm(p+3.5*r);\n  vec3 irid=pal(v*1.3+r.x*.6+t);\n  vec3 col=mix(uB,uA*.7,smoothstep(.35,.95,v));\n  col=mix(col,irid*mix(vec3(.6),uA,.5)*.7,.22*smoothstep(.45,.95,length(r)));\n  col+=pow(smoothstep(.6,1.,v),3.)*.3*mix(vec3(1.),uA,.5);\n  col*=.45+.4*smoothstep(1.4,.2,length(uv-.5));\n  col=mix(uB,col,.85);\n  gl_FragColor=vec4(col,1.);\n}"};
  var MORE=${JSON.stringify(MORE_SHADERS)};for(var mk in MORE)SHADERS[mk]=MORE[mk];
  function on(s){return !!s&&(s.classList.contains('active')||s.classList.contains('lv-leave'))}
  function hex(v){var m=/^#?([0-9a-f]{6})$/i.exec((v||'').trim());if(!m)return null;var n=parseInt(m[1],16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]}
  function themeColor(el,name,d){return hex(getComputedStyle(el).getPropertyValue(name))||d}

  // ---- WebGL: one full-screen triangle and a fragment shader ----
  function gl(canvas,fs){
    var g=canvas.getContext('webgl',{premultipliedAlpha:false,alpha:true,antialias:false,preserveDrawingBuffer:still});
    if(!g)return null;
    function sh(type,src){var s=g.createShader(type);g.shaderSource(s,src);g.compileShader(s);return g.getShaderParameter(s,g.COMPILE_STATUS)?s:null}
    var vs=sh(g.VERTEX_SHADER,'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'),f=sh(g.FRAGMENT_SHADER,fs);
    if(!vs||!f)return null;
    var pr=g.createProgram();g.attachShader(pr,vs);g.attachShader(pr,f);g.linkProgram(pr);g.useProgram(pr);
    var b=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,b);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),g.STATIC_DRAW);
    var loc=g.getAttribLocation(pr,'p');g.enableVertexAttribArray(loc);g.vertexAttribPointer(loc,2,g.FLOAT,false,0,0);
    var u={};['uRes','uTime','uMouse','uA','uB','uEnergy'].forEach(function(n){u[n]=g.getUniformLocation(pr,n)});
    g.enable(g.BLEND);g.blendFunc(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA);
    return {g:g,u:u};
  }

  /** Runs a shader in a canvas while its slide is shown. In thumbnails it leaves a still image instead. */
  function shader(host,canvas,kind,opts){
    var slide=host.closest('.slide'),started=false,mouse=[.5,.5],t0=performance.now()-(opts.offset||0)*1000;
    var A=themeColor(slide||host,'--accent',[.55,.6,1]),B=themeColor(slide||host,'--bg-solid',[.05,.05,.08]);
    if(opts.color)A=hex(opts.color)||A;
    (opts.mouseEl||host).addEventListener('mousemove',function(e){var r=canvas.getBoundingClientRect();mouse=[(e.clientX-r.left)/r.width,1-(e.clientY-r.top)/r.height]});
    (opts.mouseEl||host).addEventListener('mouseleave',function(){mouse=[.5,.5]});
    function start(){
      if(started)return;started=true;
      var ctx=gl(canvas,SHADERS[kind]);if(!ctx){canvas.style.display='none';return}
      var g=ctx.g,u=ctx.u;
      function frame(now){
        g.viewport(0,0,canvas.width,canvas.height);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);
        g.uniform2f(u.uRes,canvas.width,canvas.height);g.uniform1f(u.uTime,(now-t0)/1000);g.uniform2f(u.uMouse,mouse[0],mouse[1]);
        g.uniform3fv(u.uA,A);g.uniform3fv(u.uB,B);if(u.uEnergy)g.uniform1f(u.uEnergy,opts.energy==null?.8:opts.energy);
        g.drawArrays(g.TRIANGLES,0,3);
      }
      if(calm){
        frame(t0+4200);
        if(still){
          // Keep a picture and free the WebGL context, so many thumbnails don't run out of them.
          var img=new Image();img.className=canvas.className;img.src=canvas.toDataURL();canvas.replaceWith(img);
          var lose=g.getExtension('WEBGL_lose_context');if(lose)lose.loseContext();
        }
        return;
      }
      (function loop(now){if(on(slide))frame(now);requestAnimationFrame(loop)})(performance.now());
    }
    if(calm||on(slide))start();
    else if(slide)slide.addEventListener('slideenter',start);
  }

  function orb(host){
    if(host.querySelector('canvas,img'))return;
    var c=document.createElement('canvas'),s=Math.min(2,(window.devicePixelRatio||1)*1.25);
    c.width=Math.round(host.offsetWidth*1.24*s);c.height=Math.round(host.offsetHeight*1.24*s);host.appendChild(c);
    var e=parseFloat(host.getAttribute('data-energy'));
    shader(host,c,'orb',{energy:isNaN(e)?.8:e,color:host.getAttribute('data-color'),mouseEl:host.closest('.slide')||host});
  }
  function shaderBg(slide,kind){
    if(slide.querySelector(':scope>.fx3-gl'))return;
    var c=document.createElement('canvas');c.className='fx-bg fx3-gl';c.width=768;c.height=432;
    slide.insertBefore(c,slide.firstChild);
    shader(slide,c,kind,{offset:7});
  }

  // ---- Cards for the coverflow and the ring ----
  function items(host){
    return (host.getAttribute('data-items')||'').split(/\n/).map(function(l){
      var p=l.split('|').map(function(s){return s.trim()});return {lead:p[0]||'',title:p[1]||'',sub:p[2]||''};
    }).filter(function(i){return i.lead||i.title});
  }
  function card(it,i,w,h){
    var c=document.createElement('div');c.className='fx3-card';
    c.style.width=w+'px';c.style.height=h+'px';c.style.margin=(-h/2)+'px 0 0 '+(-w/2)+'px';c.style.fontSize=Math.round(Math.min(w,h*1.3)*.085)+'px';
    c.style.setProperty('--k','var(--c'+(i%8+1)+')');
    var f=document.createElement('div');f.className='fx3-face';
    if(/^(https?:|data:image\/)/.test(it.lead)){f.classList.add('photo');var img=document.createElement('img');img.src=it.lead;img.alt='';img.draggable=false;f.appendChild(img)}
    else if(it.lead){var em=document.createElement('div');em.className='em';em.textContent=it.lead;f.appendChild(em)}
    if(it.title){var b=document.createElement('b');b.textContent=it.title;f.appendChild(b)}
    if(it.sub){var s=document.createElement('span');s.textContent=it.sub;f.appendChild(s)}
    var sw=document.createElement('i');sw.className='fx3-sw';
    c.appendChild(f);c.appendChild(sw);return c;
  }
  function caption(host){var cap=document.createElement('div');cap.className='fx3-cap';host.appendChild(cap);return cap}
  function setCap(cap,it){cap.textContent=it.title;if(it.sub){var s=document.createElement('small');s.textContent=it.sub;cap.appendChild(s)}}
  function wrap(d,n){d=((d%n)+n)%n;return d>n/2?d-n:d}

  /** Shared motion: a position that springs to a target; drag, wheel, autoplay. */
  function motion(host,n,span,opts,render){
    var slide=host.closest('.slide'),pos=0,vel=0,target=0,drag=null,hover=false,last=-1,lastT=performance.now();
    host.setAttribute('data-no-advance','');
    host.addEventListener('pointerenter',function(){hover=true});
    host.addEventListener('pointerleave',function(){hover=false});
    host.addEventListener('pointerdown',function(e){drag={x:e.clientX,y:e.clientY,p:pos,v:0,t:performance.now(),moved:0};host.setPointerCapture(e.pointerId)});
    host.addEventListener('pointermove',function(e){
      if(!drag)return;var r=host.getBoundingClientRect(),k=host.offsetWidth/r.width;
      var d=(opts.vertical?(e.clientY-drag.y):(e.clientX-drag.x))*k,rtl=opts.rtl&&!opts.vertical?-1:1;
      var np=drag.p-d/span*rtl,now=performance.now();drag.v=(np-pos)/Math.max(1,now-drag.t)*16;drag.t=now;drag.moved=Math.max(drag.moved,Math.abs(d));
      pos=np;target=np;vel=0;
    });
    host.addEventListener('pointerup',function(e){
      if(!drag)return;var v=drag.v,moved=drag.moved;drag=null;
      if(moved<6&&opts.onClick)return opts.onClick(e);
      target=Math.round(pos+v*7);vel=v*.5;
    });
    host.addEventListener('wheel',function(e){e.preventDefault();target=Math.round(target)+(Math.sign(e.deltaY||e.deltaX))},{passive:false});
    var api={go:function(i){target=Math.round(pos)+wrap(i-pos,n)},pos:function(){return pos}};
    render(pos,0);
    if(calm)return api;
    var next=performance.now()+(opts.interval||2800);
    (function loop(now){
      if(on(slide)&&!drag){
        if(opts.mode==='drift'&&!hover)target+=.004;
        else if(opts.mode!=='off'&&!hover&&now>next){target=Math.round(target)+1;next=now+(opts.interval||2800)}
        if(hover||drag)next=now+(opts.interval||2800);
        vel+=(target-pos)*.075;vel*=.74;pos+=vel;
      }
      if(on(slide)){
        var idx=((Math.round(pos)%n)+n)%n;
        render(pos,Math.abs(vel)+(drag?Math.abs(drag.v):0));
        if(idx!==last&&Math.abs(vel)<.02&&!drag){last=idx;if(opts.onSettle)opts.onSettle(idx)}
      }
      lastT=now;requestAnimationFrame(loop);
    })(performance.now());
    return api;
  }

  function cover(host){
    if(host.querySelector('.fx3-stage'))return;
    var list=items(host);if(!list.length)return;
    var n=list.length,W=host.offsetWidth,H=host.offsetHeight,ch=H*.74,cw=Math.min(W*.36,ch*.78),span=cw*.74;
    var stage=document.createElement('div');stage.className='fx3-stage';var wheel=document.createElement('div');wheel.className='fx3-wheel';
    stage.appendChild(wheel);host.appendChild(stage);
    var cards=list.map(function(it,i){var c=card(it,i,cw,ch);c.style.top=(H*.44)+'px';wheel.appendChild(c);return c});
    var cap=caption(host),rtl=getComputedStyle(host).direction==='rtl';
    var api=motion(host,n,span,{interval:parseFloat(host.getAttribute('data-interval'))*1000||3000,rtl:rtl,
      onClick:function(e){var hit=document.elementFromPoint(e.clientX,e.clientY),t=hit&&hit.closest('.fx3-card');if(t)api.go(cards.indexOf(t))},
      onSettle:function(i){setCap(cap,list[i]);var c=cards[i];c.classList.remove('fx3-arrive');void c.offsetWidth;c.classList.add('fx3-arrive')}},
      function(pos,speed){
        var split=Math.min(6,speed*90);
        cards.forEach(function(c,i){
          var d=wrap(i-pos,n),ad=Math.abs(d),dir=rtl?-1:1;
          var x=d*span*dir*(ad<1?1:1+(ad-1)*-.18),s=1-Math.min(ad,3)*.17;
          c.style.transform='translateX('+x+'px) translateZ('+(-ad*140)+'px) rotateY('+(-Math.max(-1,Math.min(1,d))*dir*24)+'deg) scale('+s+')';
          c.style.zIndex=String(100-Math.round(ad*10));
          c.style.opacity=ad>3.2?'0':'1';
          c.style.filter='grayscale('+Math.min(1,ad)+') brightness('+(1-Math.min(ad,2.5)*.25)+')'+(split>.4?' drop-shadow('+split+'px 0 rgba(255,40,120,.55)) drop-shadow('+(-split)+'px 0 rgba(40,190,255,.55))':'');
        });
      });
    setCap(cap,list[0]);
  }

  function ring(host){
    if(host.querySelector('.fx3-stage'))return;
    var list=items(host);if(!list.length)return;
    var vertical=host.getAttribute('data-axis')==='y',n=Math.max(list.length,3),W=host.offsetWidth,H=host.offsetHeight;
    var cw=vertical?W*.46:Math.min(W*.24,H*.5),ch=vertical?H*.32:H*.62,step=360/n;
    var R=(vertical?ch:cw)/2/Math.tan(Math.PI/n)*1.12;
    var stage=document.createElement('div');stage.className='fx3-stage';stage.style.perspective=(R*(vertical?2.4:3.2))+'px';
    var wheel=document.createElement('div');wheel.className='fx3-wheel';stage.appendChild(wheel);host.appendChild(stage);
    var rtl=getComputedStyle(host).direction==='rtl',cx=vertical?(rtl?W*.64:W*.36):W/2,cy=vertical?H/2:H*.44;
    var cards=list.map(function(it,i){
      var c=card(it,i,cw,ch);c.style.left=cx+'px';c.style.top=cy+'px';
      c.style.transform=vertical?'rotateX('+(-i*step)+'deg) translateZ('+R+'px)':'rotateY('+(i*step)+'deg) translateZ('+R+'px)';
      wheel.appendChild(c);return c;
    });
    wheel.style.transformOrigin=cx+'px '+cy+'px';stage.style.perspectiveOrigin=cx+'px '+cy+'px';
    var cap=caption(host);
    motion(host,list.length,vertical?ch*.9:cw*.9,{vertical:vertical,mode:host.getAttribute('data-mode')||'step',interval:2600,
      onSettle:function(i){setCap(cap,list[i])}},
      function(pos,speed){
        wheel.style.transform='translateZ('+(-R)+'px) '+(vertical?'rotateX('+(pos*step)+'deg)':'rotateY('+(-pos*step)+'deg)');
        wheel.style.filter=speed>.015?'blur('+Math.min(5,speed*40).toFixed(2)+'px)':'';
        cards.forEach(function(c,i){
          var a=wrap(i-pos,list.length)*step*Math.PI/180,f=Math.cos(a);
          c.style.opacity=String(Math.max(0,.15+.85*f));
          c.style.filter='brightness('+(.45+.55*Math.max(0,f))+')';
        });
      });
    setCap(cap,list[0]);
  }

  // ---- Dotted globe: drag to turn it; arcs fly from the first place to the others ----
  // Land outlines come from GLOBE_LAND_JS, which decks include only when they have a globe.
  var DOTS=null;
  function inPoly(x,y,pg){
    var c=false;
    for(var i=0,j=pg.length-2;i<pg.length;j=i,i+=2){
      var xi=pg[i],yi=pg[i+1],xj=pg[j],yj=pg[j+1];
      if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c;
    }
    return c;
  }
  function isLand(geo,lng,lat){
    if(lat<-66)return true;
    function any(list,x){for(var i=0;i<list.length;i++)if(inPoly(x,lat,list[i]))return true;return false}
    return (any(geo.land,lng)||(lng<-150&&any(geo.land,lng+360)))&&!any(geo.water,lng);
  }
  function vec(lat,lng){var a=lat*Math.PI/180,b=lng*Math.PI/180;return [Math.cos(a)*Math.sin(b),Math.sin(a),Math.cos(a)*Math.cos(b)]}
  function landDots(){
    if(DOTS)return DOTS;DOTS=[];
    var geo=window.__lvLand,step=geo?1.9:4.5;
    for(var lat=-88;lat<=88;lat+=step){
      var count=Math.max(1,Math.round(Math.cos(lat*Math.PI/180)*360/step));
      for(var i=0;i<count;i++){var lng=-180+(i+.5)*360/count;if(!geo||isLand(geo,lng,lat))DOTS.push(vec(lat,lng))}
    }
    return DOTS;
  }
  function places(txt){
    return String(txt||'').split(/\r?\n|\|/).map(function(line){
      var p=line.split(','),la=parseFloat(p[0]),ln=parseFloat(p[1]);
      return isNaN(la)||isNaN(ln)?null:{lat:la,lng:ln,v:vec(la,ln),label:p.slice(2).join(',').trim()};
    }).filter(Boolean);
  }
  function rgba(c,a){return 'rgba('+Math.round(c[0]*255)+','+Math.round(c[1]*255)+','+Math.round(c[2]*255)+','+a+')'}
  function globe(host){
    if(host.querySelector('canvas'))return;
    // The land data script comes later in the page, so wait until the page has loaded.
    if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){globe(host)});return}
    var slide=host.closest('.slide'),cv=document.createElement('canvas');cv.setAttribute('aria-hidden','true');host.appendChild(cv);
    var ctx=cv.getContext('2d'),cs=getComputedStyle(host),ref=slide||host;
    var A=hex(host.getAttribute('data-color'))||themeColor(ref,'--accent',[.55,.6,1]),B=themeColor(ref,'--c2',[.3,.8,.95]),C=themeColor(ref,'--c3',[1,.5,.6]);
    var bg=themeColor(ref,'--bg-solid',[.05,.05,.08]),dark=(.2126*bg[0]+.7152*bg[1]+.0722*bg[2])<.5;
    var m=/(\d+)\D+(\d+)\D+(\d+)/.exec(cs.color),fg=m?[m[1]/255,m[2]/255,m[3]/255]:[1,1,1];
    var P=places(host.getAttribute('data-places')),arcs=host.getAttribute('data-arcs')!=='false',labels=host.getAttribute('data-labels')!=='false';
    var secs=parseFloat(host.getAttribute('data-speed'));secs=isNaN(secs)?40:secs;var spin=secs>0?2*Math.PI/secs:0;
    var yaw=P.length?-P[0].lng*Math.PI/180+.35:0,pitch=P.length?Math.max(-.5,Math.min(.5,P[0].lat*Math.PI/180*.7)):.3;
    var D=landDots(),pairs=[];if(arcs)for(var i=1;i<P.length;i++)pairs.push([P[0].v,P[i].v]);
    var font=cs.fontFamily,drag=null,hover=false;
    function rot(v){
      var cy=Math.cos(yaw),sy=Math.sin(yaw),x=v[0]*cy+v[2]*sy,z=v[2]*cy-v[0]*sy,cp=Math.cos(pitch),sp=Math.sin(pitch);
      return [x,v[1]*cp-z*sp,v[1]*sp+z*cp];
    }
    function arcPoint(a,b,s){
      var d=Math.max(-1,Math.min(1,a[0]*b[0]+a[1]*b[1]+a[2]*b[2])),w=Math.acos(d),k=Math.sin(w)||1;
      var f1=Math.sin((1-s)*w)/k,f2=Math.sin(s*w)/k,lift=1+(.08+.22*w/Math.PI)*Math.sin(Math.PI*s);
      return [(a[0]*f1+b[0]*f2)*lift,(a[1]*f1+b[1]*f2)*lift,(a[2]*f1+b[2]*f2)*lift];
    }
    function seen(p){return p[2]>0||p[0]*p[0]+p[1]*p[1]>1}
    function draw(t){
      var W=host.offsetWidth||400,H=host.offsetHeight||400,res=Math.min(2,1600/Math.max(W,H));
      var w=Math.round(W*res),h=Math.round(H*res);if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}
      ctx.setTransform(res,0,0,res,0,0);ctx.clearRect(0,0,W,H);
      var cx=W/2,cy=H/2,R=Math.min(W,H)*.4,tt=t/1000;
      var g=ctx.createRadialGradient(cx,cy,R*.92,cx,cy,R*1.25);g.addColorStop(0,rgba(A,dark?.35:.22));g.addColorStop(1,rgba(A,0));
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,R*1.25,0,7);ctx.fill();
      g=ctx.createRadialGradient(cx-R*.35,cy-R*.4,R*.1,cx,cy,R);g.addColorStop(0,rgba(A,dark?.1:.07));g.addColorStop(1,rgba(A,dark?.03:.02));
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,R,0,7);ctx.fill();
      // Land dots: the far side faintly, then the near side.
      var ds=Math.max(1.4,R/105);
      for(var pass=0;pass<2;pass++){
        ctx.fillStyle=pass?rgba(A,1):rgba(fg,dark?.1:.12);
        for(var i=0;i<D.length;i++){
          var p=rot(D[i]);if((p[2]>0)!==(pass===1))continue;
          if(pass)ctx.globalAlpha=.35+.65*p[2];
          var s=pass?ds*(.75+.35*p[2]):ds*.8;ctx.fillRect(cx+p[0]*R-s/2,cy-p[1]*R-s/2,s,s);
        }
        ctx.globalAlpha=1;
      }
      pairs.forEach(function(pr,k){
        var steps=48,pts=[];for(var i=0;i<=steps;i++)pts.push(rot(arcPoint(pr[0],pr[1],i/steps)));
        ctx.lineWidth=Math.max(1,R/220);ctx.strokeStyle=rgba(B,.22);ctx.beginPath();
        var down=false;
        pts.forEach(function(p){if(!seen(p)){down=false;return}var x=cx+p[0]*R,y=cy-p[1]*R;if(down)ctx.lineTo(x,y);else ctx.moveTo(x,y);down=true});
        ctx.stroke();
        var cyc=(tt*.45+k*.37)%1.6,head=Math.min(1,cyc),tail=Math.max(0,cyc-.45);
        ctx.lineWidth=Math.max(1.5,R/120);ctx.lineCap='round';
        for(var i=Math.floor(tail*steps);i<Math.ceil(head*steps);i++){
          var a=pts[i],b=pts[i+1];if(!b||!seen(a)||!seen(b))continue;
          ctx.strokeStyle=rgba(B,Math.max(0,Math.min(1,(i/steps-tail)/Math.max(.01,head-tail)))*.95);
          ctx.beginPath();ctx.moveTo(cx+a[0]*R,cy-a[1]*R);ctx.lineTo(cx+b[0]*R,cy-b[1]*R);ctx.stroke();
        }
      });
      ctx.font='700 '+Math.round(Math.max(11,R*.065))+'px '+font;ctx.textBaseline='middle';
      P.forEach(function(pl,k){
        var p=rot(pl.v);if(p[2]<=.02)return;
        var x=cx+p[0]*R,y=cy-p[1]*R,pulse=(tt*.8+k*.3)%1;
        ctx.strokeStyle=rgba(C,(1-pulse)*.8);ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,R*.02+pulse*R*.07,0,7);ctx.stroke();
        ctx.fillStyle=rgba(C,1);ctx.beginPath();ctx.arc(x,y,Math.max(2.5,R*.018),0,7);ctx.fill();
        if(labels&&pl.label){
          ctx.globalAlpha=Math.min(1,p[2]*3);ctx.fillStyle=rgba(fg,.95);ctx.textAlign=p[0]<0?'right':'left';
          ctx.fillText(pl.label,x+(p[0]<0?-1:1)*R*.05,y);ctx.globalAlpha=1;
        }
      });
    }
    draw(4000);if(calm)return;
    host.setAttribute('data-no-advance','');
    ['touchstart','touchend'].forEach(function(t){host.addEventListener(t,function(e){e.stopPropagation()},{passive:true})});
    host.addEventListener('pointerenter',function(){hover=true});
    host.addEventListener('pointerleave',function(){hover=false});
    host.addEventListener('pointerdown',function(e){
      if(e.button)return;drag={x:e.clientX,y:e.clientY,yaw:yaw,pitch:pitch,k:host.offsetWidth/(host.getBoundingClientRect().width||1)};
      try{host.setPointerCapture(e.pointerId)}catch(_){}
    });
    host.addEventListener('pointermove',function(e){
      if(!drag)return;var k=Math.PI/(host.offsetWidth||400)*drag.k;
      yaw=drag.yaw+(e.clientX-drag.x)*k;pitch=Math.max(-1.2,Math.min(1.2,drag.pitch+(e.clientY-drag.y)*k));
    });
    host.addEventListener('pointerup',function(){drag=null});host.addEventListener('pointercancel',function(){drag=null});
    var last=0;
    (function loop(t){
      var dt=last?Math.min(.05,(t-last)/1000):0;last=t;
      if(on(slide)&&host.isConnected){if(!drag&&!hover)yaw+=spin*dt;draw(t)}
      if(host.isConnected)requestAnimationFrame(loop);
    })(0);
  }

  // ---- Depth card: tilts toward the mouse and its contents float apart ----
  function depth(el){
    if(el.__fx3d||calm)return;el.__fx3d=1;
    el.addEventListener('mousemove',function(e){
      var r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5,a=Math.min(14,Math.hypot(x,y)*28);
      el.style.rotate=(-y)+' '+x+' 0 '+a+'deg';el.style.scale='1.03';
      el.style.setProperty('--fx3-px',(x*2).toFixed(3));el.style.setProperty('--fx3-py',(y*2).toFixed(3));
      el.style.setProperty('--fx3-lx',((x+.5)*100)+'%');el.style.setProperty('--fx3-ly',((y+.5)*100)+'%');
      el.classList.add('fx3-on');
    });
    el.addEventListener('mouseleave',function(){
      el.style.rotate='';el.style.scale='';el.style.removeProperty('--fx3-px');el.style.removeProperty('--fx3-py');el.classList.remove('fx3-on');
    });
  }

  function init(scope){
    [].forEach.call(scope.querySelectorAll('.fx3-orb'),orb);
    [].forEach.call(scope.querySelectorAll('.fx3-cover'),cover);
    [].forEach.call(scope.querySelectorAll('.fx3-ring'),ring);
    [].forEach.call(scope.querySelectorAll('.fx3-globe'),globe);
    [].forEach.call(scope.querySelectorAll('.fx3-depth'),depth);
  }
  [].forEach.call(document.querySelectorAll('.slide'),function(s){
    if(/(^|\s)bg-silk(\s|$)/.test(s.className))shaderBg(s,'silk');
    if(/(^|\s)bg-liquid(\s|$)/.test(s.className))shaderBg(s,'liquid');
    ['plasma','blob','portal'].forEach(function(k){if(s.classList.contains('bg-'+k))shaderBg(s,k)});
  });
  init(document);
  window.__lvFx3=init;
})();`

/** Land outlines for the globe; deckHtml adds this script only to decks that have a globe. */
export const GLOBE_LAND_JS = `window.__lvLand=${JSON.stringify({ land: LAND, water: WATER })};`
