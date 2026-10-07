"use strict";

/* ============================================================
   ⭐ SPLASH SCREEN TIMING — EDIT THESE TWO NUMBERS ⭐
   ------------------------------------------------------------
   SPLASH_HOLD_MS : how long the logo stays fully visible  (550 ms)
   SPLASH_FADE_MS : how long the fade-out animation takes  (450 ms)
   Total splash duration = SPLASH_HOLD_MS + SPLASH_FADE_MS = 1000 ms

   Example: for a faster splash use  300 / 250
            for a slower splash use  1200 / 700
   ============================================================ */
const SPLASH_HOLD_MS = 550;   // ← change me
const SPLASH_FADE_MS = 450;   // ← change me

/* Logo file path — served from Flask static folder */
const LOGO_SRC = '/static/img/logo.png';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ============================================================
   LOGO + SPLASH BOOTSTRAP
   ============================================================ */
function bindLogo(imgId, fallbackId){
  const img = document.getElementById(imgId);
  const fb  = document.getElementById(fallbackId);
  if(!img) return;
  img.src = LOGO_SRC;
  const fail = () => { img.style.display = 'none'; if(fb) fb.style.display = 'flex'; };
  const ok   = () => { img.style.display = 'block'; if(fb) fb.style.display = 'none'; };
  img.addEventListener('error', fail);
  img.addEventListener('load', ok);
  if(img.complete){
    if(img.naturalWidth === 0) fail(); else ok();
  }
}

function initSplash(){
  const splash = document.getElementById('splash');
  document.body.classList.add('splash-active');
  if(!splash){ document.body.classList.remove('splash-active'); return; }

  splash.style.setProperty('--splash-fade', SPLASH_FADE_MS + 'ms');

  const bar = document.getElementById('splashBar');
  if(bar){
    requestAnimationFrame(() => {
      bar.style.transition = 'width ' + (SPLASH_HOLD_MS + SPLASH_FADE_MS) + 'ms cubic-bezier(.35,0,.25,1)';
      bar.style.width = '100%';
    });
  }

  let finished = false;
  const closeSplash = () => {
    if(finished) return;
    finished = true;
    splash.classList.add('hide');
    document.body.classList.remove('splash-active');
    window.setTimeout(() => { if(splash.parentNode) splash.parentNode.removeChild(splash); }, SPLASH_FADE_MS + 80);
  };

  const timer = window.setTimeout(closeSplash, SPLASH_HOLD_MS);

  const skip = () => { window.clearTimeout(timer); closeSplash(); };
  splash.addEventListener('click', skip, { once:true });
  window.addEventListener('keydown', skip, { once:true });
}

const els = {
  uploadZone: $('#uploadZone'), fileInput: $('#fileInput'),
  studio: $('#studio'),
  previewCanvas: $('#previewCanvas'), previewImg: $('#previewImg'),
  layerWallPaint: $('#layerWallPaint'), layerWallpaper: $('#layerWallpaper'),
  layerWallTiles: $('#layerWallTiles'), layerFloor: $('#layerFloor'),
  floorPattern: $('#floorPattern'),
  curtainL: $('#curtainL'), curtainR: $('#curtainR'),
  paletteStrip: $('#paletteStrip'), swatchList: $('#swatchList'),
  themeTabs: $('#themeTabs'), themeDesc: $('#themeDesc'), themeGrid: $('#themeGrid'),
  curtainSuggestions: $('#curtainSuggestions'),
  activeCount: $('#activeCount'), customCount: $('#customCount'),
  loader: $('#loader'), loaderMsg: $('#loaderMsg'),
  smartSuggestionsCard: $('#smartSuggestionsCard'),
  suggestionList: $('#suggestionList')
};

/* ===== COLOR MATH ===== */
function rgbToHex(r,g,b){const f=v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0');return '#'+f(r)+f(g)+f(b);}
function hexToRgb(hex){const h=hex.replace('#','');return{r:parseInt(h.substring(0,2),16),g:parseInt(h.substring(2,4),16),b:parseInt(h.substring(4,6),16)};}
function rgbToHsl(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b);const l=(max+min)/2;let h=0,s=0;const d=max-min;if(d>0){s=l>.5?d/(2-max-min):d/(max+min);switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4;}h*=60;}return{h,s:s*100,l:l*100};}
function hexToHsl(hex){const c=hexToRgb(hex);return rgbToHsl(c.r,c.g,c.b);}
function hslToHex(h,s,l){h=((h%360)+360)%360;s=clamp(s,0,100)/100;l=clamp(l,0,100)/100;const c=(1-Math.abs(2*l-1))*s;const x=c*(1-Math.abs(((h/60)%2)-1));const m=l-c/2;let r=0,g=0,b=0;if(h<60){r=c;g=x;}else if(h<120){r=x;g=c;}else if(h<180){g=c;b=x;}else if(h<240){g=x;b=c;}else if(h<300){r=x;b=c;}else{r=c;b=x;}return rgbToHex((r+m)*255,(g+m)*255,(b+m)*255);}
function shadeColor(hex,amt){const{r,g,b}=hexToRgb(hex);const f=v=>clamp(Math.round(v+amt),0,255);return rgbToHex(f(r),f(g),f(b));}
function hueName(h,s,l){h=((h%360)+360)%360;if(s<11){if(l>88)return'Ivory';if(l>72)return'Greige';if(l>52)return'Taupe';if(l>30)return'Slate';if(l>15)return'Charcoal';return'Ink';}if(h<14||h>=346)return l>62?'Blush':'Terracotta';if(h<40)return l>62?'Sand':'Amber';if(h<66)return l>62?'Butter':'Ochre';if(h<92)return l>62?'Pale Olive':'Olive';if(h<150)return l>62?'Sage':'Forest';if(h<186)return l>62?'Mint':'Emerald';if(h<212)return l>62?'Sky':'Teal';if(h<256)return l>62?'Powder Blue':'Navy';if(h<288)return l>62?'Lavender':'Indigo';if(h<322)return l>62?'Lilac':'Plum';return l>62?'Rose':'Burgundy';}

/* ===== K-MEANS ===== */
function kmeans(points,k,iters=15){
  if(points.length<=k)return points.map(p=>({...p}));
  const centroids=[];
  let first=points[0];for(const p of points)if(p.n>first.n)first=p;
  centroids.push({r:first.r,g:first.g,b:first.b});
  while(centroids.length<k){
    let best=null,bs=-1;
    for(const p of points){
      let d=Infinity;
      for(const c of centroids){const dd=(p.r-c.r)**2+(p.g-c.g)**2+(p.b-c.b)**2;if(dd<d)d=dd;}
      const score=d*Math.sqrt(p.n);if(score>bs){bs=score;best=p;}
    }
    if(!best)break;
    centroids.push({r:best.r,g:best.g,b:best.b});
  }
  const assign=new Array(points.length).fill(0);
  for(let it=0;it<iters;it++){
    let moved=false;
    for(let i=0;i<points.length;i++){
      const p=points[i];let bi=0,bd=Infinity;
      for(let j=0;j<centroids.length;j++){const c=centroids[j];const d=(p.r-c.r)**2+(p.g-c.g)**2+(p.b-c.b)**2;if(d<bd){bd=d;bi=j;}}
      if(assign[i]!==bi){assign[i]=bi;moved=true;}
    }
    const sums=centroids.map(()=>({r:0,g:0,b:0,n:0}));
    for(let i=0;i<points.length;i++){const p=points[i],s=sums[assign[i]];s.r+=p.r*p.n;s.g+=p.g*p.n;s.b+=p.b*p.n;s.n+=p.n;}
    for(let j=0;j<centroids.length;j++){if(sums[j].n>0){centroids[j]={r:sums[j].r/sums[j].n,g:sums[j].g/sums[j].n,b:sums[j].b/sums[j].n};}}
    if(!moved&&it>0)break;
  }
  const weights=new Array(centroids.length).fill(0);
  for(let i=0;i<points.length;i++)weights[assign[i]]+=points[i].n;
  const total=weights.reduce((a,b)=>a+b,0)||1;
  let out=centroids.map((c,j)=>({r:c.r,g:c.g,b:c.b,n:weights[j],pct:weights[j]/total})).filter(c=>c.n>0).sort((a,b)=>b.n-a.n);
  const merged=[];
  for(const c of out){
    const twin=merged.find(m=>Math.sqrt((m.r-c.r)**2+(m.g-c.g)**2+(m.b-c.b)**2)<22);
    if(twin){const w=twin.pct+c.pct;twin.r=(twin.r*twin.pct+c.r*c.pct)/w;twin.g=(twin.g*twin.pct+c.g*c.pct)/w;twin.b=(twin.b*twin.pct+c.b*c.pct)/w;twin.pct=w;}
    else merged.push({...c});
  }
  merged.sort((a,b)=>b.pct-a.pct);
  return merged;
}
function extractPalette(img,k=7){
  const MAX=180;let w=img.naturalWidth||img.width;let h=img.naturalHeight||img.height;
  if(!w||!h)return[];
  const scale=Math.min(1,MAX/Math.max(w,h));
  w=Math.max(1,Math.round(w*scale));h=Math.max(1,Math.round(h*scale));
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;
  const ctx=cv.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(img,0,0,w,h);
  let data;try{data=ctx.getImageData(0,0,w,h).data;}catch(e){return[];}
  const buckets=new Map();
  for(let i=0;i<data.length;i+=4){
    if(data[i+3]<125)continue;
    const r=data[i],g=data[i+1],b=data[i+2];
    const key=((r>>3)<<10)|((g>>3)<<5)|(b>>3);
    let e=buckets.get(key);
    if(!e){e={r:0,g:0,b:0,n:0};buckets.set(key,e);}
    e.r+=r;e.g+=g;e.b+=b;e.n++;
  }
  if(!buckets.size)return[];
  let pts=[...buckets.values()].map(e=>({r:e.r/e.n,g:e.g/e.n,b:e.b/e.n,n:e.n}));
  pts.sort((a,b)=>b.n-a.n);pts=pts.slice(0,30);
  const clusters=kmeans(pts,k);
  const total=clusters.reduce((s,c)=>s+c.pct,0)||1;
  return clusters.map(c=>{
    const R=Math.round(c.r),G=Math.round(c.g),B=Math.round(c.b);
    const hsl=rgbToHsl(R,G,B);
    return{r:R,g:G,b:B,hex:rgbToHex(R,G,B),pct:c.pct/total,hsl,name:hueName(hsl.h,hsl.s,hsl.l)};
  });
}
function pickBaseColor(palette){
  if(!palette.length)return{hex:'#dcd6cc',hsl:{h:34,s:12,l:86},name:'Ivory',pct:1};
  const cands=palette.slice(0,4);let best=cands[0],bs=-Infinity;
  for(const c of cands){const{s,l}=c.hsl;let sc=l*.9+(100-Math.min(s,60))*.22+c.pct*85;if(l>93)sc-=30;if(l<12)sc-=30;if(sc>bs){bs=sc;best=c;}}
  return best;
}

/* ===== THEMES ===== */
function buildThemes(base){
  const H=((base.hsl.h%360)+360)%360;const S=clamp(base.hsl.s,0,100);const L=clamp(base.hsl.l,0,100);
  const col=(role,dH,s,l)=>({role,hex:hslToHex(H+dH,s,l)});
  return [
    {id:'mono',name:'Tone-on-Tone',desc:'One hue through many depths — serene and seamless.',
      colors:[col('Wall',0,clamp(S*.42,7,26),91),col('Trim',0,clamp(S*.38,7,24),78),col('Curtain',0,clamp(S*.72,17,46),clamp(L*.78,48,66)),col('Accent',0,clamp(S*.95,28,58),clamp(L*.62,38,50)),col('Deep',0,clamp(S*.80,18,48),25)]},
    {id:'analogous',name:'Analogous',desc:'Neighbouring hues — soft, natural, calming.',
      colors:[col('Wall',-20,clamp(S*.34,6,24),90),col('Secondary',0,clamp(S*.50,12,36),74),col('Curtain',+18,clamp(S*.82,22,54),clamp(L*.80,50,64)),col('Accent',+36,clamp(S*1.05,32,64),48),col('Deep',+12,clamp(S*.70,16,44),26)]},
    {id:'complementary',name:'Complementary',desc:'The opposite hue — maximum impact.',
      colors:[col('Wall',0,clamp(S*.30,6,22),91),col('Secondary',0,clamp(S*.46,12,34),73),col('Curtain',+180,clamp(S*.78,20,50),clamp(L*.82,50,66)),col('Accent',+180,clamp(S*1.10,36,70),48),col('Deep',0,clamp(S*.62,16,42),24)]},
    {id:'split',name:'Split-Comp.',desc:'Two accents flanking the opposite hue.',
      colors:[col('Wall',0,clamp(S*.30,6,22),91),col('Secondary',+150,clamp(S*.55,16,42),71),col('Curtain',+150,clamp(S*.76,22,50),clamp(L*.82,50,65)),col('Accent',+210,clamp(S*1.00,34,66),50),col('Deep',+180,clamp(S*.50,14,38),25)]},
    {id:'triadic',name:'Triadic',desc:'Three hues evenly spaced — vivid and playful.',
      colors:[col('Wall',0,clamp(S*.28,6,20),92),col('Secondary',+120,clamp(S*.50,14,40),69),col('Curtain',+120,clamp(S*.70,20,48),clamp(L*.84,52,66)),col('Accent',+240,clamp(S*1.00,32,64),52),col('Deep',0,clamp(S*.55,14,40),25)]}
  ];
}
function buildCurtainSuggestions(base){
  const H=((base.hsl.h%360)+360)%360;const S=clamp(base.hsl.s,0,100);const L=clamp(base.hsl.l,0,100);
  const specs=[
    {tag:'Tone-on-tone',h:H,s:clamp(S*.88,16,46),l:clamp(L*.66,42,64),reason:'Deepens the room\'s dominant tone — calm and seamless.'},
    {tag:'Soft neutral',h:H,s:8,l:88,reason:'A quiet greige that lets furniture and art lead.'},
    {tag:'Warm contrast',h:H+32,s:clamp(S*.90,22,52),l:58,reason:'Adds gentle warmth — ideal for cool rooms.'},
    {tag:'Complementary',h:H+180,s:clamp(S*1.08,30,60),l:52,reason:'The opposite hue. A deliberate gallery-style statement.'},
    {tag:'Deep anchor',h:H,s:clamp(S*.72,14,40),l:25,reason:'Rich and dramatic. Grounds bright rooms.'},
    {tag:'Sheer light',h:H,s:clamp(S*.50,10,30),l:81,reason:'Airy and diffused. Layer behind a heavier drape.'}
  ];
  return specs.map(sp=>{
    const hsl={h:((sp.h%360)+360)%360,s:sp.s,l:sp.l};
    return{tag:sp.tag,hex:hslToHex(hsl.h,hsl.s,hsl.l),name:hueName(hsl.h,hsl.s,hsl.l),reason:sp.reason};
  });
}

/* ===== TILE TEXTURES ===== */
const tileCache=new Map();
function makeTileTexture(pattern,color,size=640){
  const key=`${pattern}|${color}|${size}`;
  if(tileCache.has(key))return tileCache.get(key);
  const cv=document.createElement('canvas');cv.width=size;cv.height=size;
  const ctx=cv.getContext('2d');
  const grout=shadeColor(color,-70);
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,size,size);
  if(pattern==='grid'){
    const n=4,cell=size/n,g=5;
    ctx.fillStyle=grout;ctx.fillRect(0,0,size,size);
    ctx.fillStyle=color;
    for(let i=0;i<n;i++)for(let j=0;j<n;j++)ctx.fillRect(i*cell+g,j*cell+g,cell-g*2,cell-g*2);
  }else if(pattern==='subway'){
    const rows=6,cols=3,w=size/cols,h=size/rows,g=4;
    ctx.fillStyle=grout;ctx.fillRect(0,0,size,size);
    ctx.fillStyle=color;
    for(let r=0;r<rows;r++){const off=(r%2)*(w/2);for(let c=-1;c<=cols;c++)ctx.fillRect(c*w+off+g,r*h+g,w-g*2,h-g*2);}
  }else if(pattern==='basketweave'){
    const unit=size/6,g=3;
    ctx.fillStyle=grout;ctx.fillRect(0,0,size,size);ctx.fillStyle=color;
    for(let j=0;j<12;j++)for(let i=0;i<12;i++){
      const x=i*unit,y=j*unit;
      if((i+j)%2===0){ctx.fillRect(x,y,unit-g,unit/2-g);ctx.fillRect(x,y+unit/2,unit-g,unit/2-g);}
      else{ctx.fillRect(x,y,unit/2-g,unit-g);ctx.fillRect(x+unit/2,y,unit/2-g,unit-g);}
    }
  }else if(pattern==='hexagon'){
    const r=size/14,h=Math.sqrt(3)*r;
    ctx.fillStyle=grout;ctx.fillRect(0,0,size,size);ctx.fillStyle=color;
    const rr=r*.94;
    for(let row=-1;row<18;row++)for(let col=-1;col<18;col++){
      const cx=col*r*1.5,cy=row*h+(col%2)*h/2;
      ctx.beginPath();
      for(let i=0;i<6;i++){const a=Math.PI/3*i;const x=cx+rr*Math.cos(a),y=cy+rr*Math.sin(a);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
      ctx.closePath();ctx.fill();
    }
  }else if(pattern==='large'){
    const n=2,cell=size/n,g=6;
    ctx.fillStyle=grout;ctx.fillRect(0,0,size,size);ctx.fillStyle=color;
    for(let i=0;i<n;i++)for(let j=0;j<n;j++)ctx.fillRect(i*cell+g,j*cell+g,cell-g*2,cell-g*2);
  }else if(pattern==='wood'){
    const planks=8,ph=size/planks,g=2;
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,size,size);
    for(let r=0;r<planks;r++){
      const off=(r%3)*(size/3);
      ctx.save();ctx.fillStyle=color;
      ctx.fillRect(off+g,r*ph+g,size-off-g,ph-g);
      if(off>0)ctx.fillRect(0,r*ph+g,off-g,ph-g);
      ctx.strokeStyle='rgba(0,0,0,0.14)';ctx.lineWidth=1;
      for(let gg=0;gg<6;gg++){const y=r*ph+g+(gg+1)*(ph-g)/7;ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(size*.3,y+(Math.random()-.5)*3,size*.7,y+(Math.random()-.5)*3,size,y);ctx.stroke();}
      ctx.strokeStyle='rgba(0,0,0,0.35)';ctx.beginPath();ctx.moveTo(off+.5,r*ph+g);ctx.lineTo(off+.5,r*ph+ph-g);ctx.stroke();ctx.restore();
    }
  }else if(pattern==='marble'){
    const n=3,cell=size/n,g=4;
    ctx.fillStyle=grout;ctx.fillRect(0,0,size,size);ctx.fillStyle=color;
    for(let i=0;i<n;i++)for(let j=0;j<n;j++)ctx.fillRect(i*cell+g,j*cell+g,cell-g*2,cell-g*2);
    ctx.save();ctx.strokeStyle='rgba(0,0,0,0.14)';ctx.lineWidth=1.2;
    for(let v=0;v<20;v++){ctx.beginPath();let x=Math.random()*size,y=Math.random()*size;ctx.moveTo(x,y);for(let s=0;s<4;s++){x+=(Math.random()-.5)*120;y+=(Math.random()-.5)*120;ctx.lineTo(x,y);}ctx.stroke();}
    ctx.restore();
  }
  const dataUrl=cv.toDataURL();tileCache.set(key,dataUrl);return dataUrl;
}

/* ===== SEAMLESS TILE (from upload) ===== */
function makeSeamlessTile(img,size=512){
  const cv=document.createElement('canvas');cv.width=size;cv.height=size;
  const ctx=cv.getContext('2d');const half=size/2;
  const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
  const scale=Math.max(half/iw,half/ih);
  const sw=iw*scale,sh=ih*scale;const sx=(half-sw)/2,sy=(half-sh)/2;
  ctx.drawImage(img,sx,sy,sw,sh);
  ctx.save();ctx.translate(size,0);ctx.scale(-1,1);ctx.drawImage(img,sx,sy,sw,sh);ctx.restore();
  ctx.save();ctx.translate(0,size);ctx.scale(1,-1);ctx.drawImage(img,sx,sy,sw,sh);ctx.restore();
  ctx.save();ctx.translate(size,size);ctx.scale(-1,-1);ctx.drawImage(img,sx,sy,sw,sh);ctx.restore();
  return cv.toDataURL('image/png');
}

/* ===== PATTERN ANALYSIS ===== */
function analyzePattern(img,size=96){
  const cv=document.createElement('canvas');cv.width=size;cv.height=size;
  const ctx=cv.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(img,0,0,size,size);
  let data;try{data=ctx.getImageData(0,0,size,size).data;}catch(e){return null;}
  let sumR=0,sumG=0,sumB=0,minL=255,maxL=0;
  const n=size*size;
  for(let i=0;i<data.length;i+=4){
    const r=data[i],g=data[i+1],b=data[i+2];
    sumR+=r;sumG+=g;sumB+=b;
    const l=.299*r+.587*g+.114*b;
    if(l<minL)minL=l;if(l>maxL)maxL=l;
  }
  const avgR=sumR/n,avgG=sumG/n,avgB=sumB/n;
  const avgL=.299*avgR+.587*avgG+.114*avgB;
  const contrast=maxL-minL;
  let edgeCount=0;
  for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++){
    const i=(y*size+x)*4;
    const iR=((y-1)*size+x)*4,iL=((y+1)*size+x)*4;
    const iU=(y*size+(x-1))*4,iD=(y*size+(x+1))*4;
    const gx=Math.abs(data[iR]-data[iL]);
    const gy=Math.abs(data[iU]-data[iD]);
    if(Math.sqrt(gx*gx+gy*gy)>28)edgeCount++;
  }
  const edgeDensity=edgeCount/n;
  let type='texture',typeLabel='Textured';
  if(edgeDensity<.025){type='solid';typeLabel='Solid / smooth';}
  else if(edgeDensity<.06){type='subtle';typeLabel='Subtle texture';}
  else if(edgeDensity<.14){type='pattern';typeLabel='Repeating pattern';}
  else{type='bold';typeLabel='Bold / busy';}
  let scale=1;
  if(type==='bold')scale=.75;else if(type==='pattern')scale=1;else if(type==='subtle')scale=1.3;else scale=1.5;
  const patternPalette=extractPalette(img,5);
  return{type,typeLabel,avgL,contrast,edgeDensity,recommendedScale:scale,colorCount:patternPalette.length,palette:patternPalette,isLight:avgL>140,isDark:avgL<80};
}

/* ===== CATALOGS ===== */
const CURTAIN_STYLES=[
  {id:'straight',    name:'Straight'},
  {id:'pleat',       name:'Pleat'},
  {id:'empire',      name:'Empire'},
  {id:'overlapping', name:'Overlapping Swags'},
  {id:'cafe',        name:'Cafe Style'},
  {id:'sandglass',   name:'Sandglass'},
  {id:'french',      name:'French'},
  {id:'roller',      name:'Roller'},
  {id:'asymmetric',  name:'Asymmetric'},
  {id:'italian',     name:'Italian'},
  {id:'vertical',    name:'Vertical Blinds'},
  {id:'drapery',     name:'Drapery'},
  {id:'london',      name:'London'},
  {id:'threads',     name:'Threads'},
  {id:'austrian',    name:'Austrian'},
  {id:'japanese',    name:'Japanese'}
];
const TILE_PATTERNS=[
  {id:'grid',name:'Square'},{id:'subway',name:'Subway'},{id:'basketweave',name:'Basketweave'},
  {id:'hexagon',name:'Hexagon'},{id:'large',name:'Large'},{id:'marble',name:'Marble'}
];
const FLOOR_PATTERNS=[
  {id:'wood',name:'Wood'},{id:'grid',name:'Square'},{id:'subway',name:'Subway'},
  {id:'basketweave',name:'Basketweave'},{id:'hexagon',name:'Hexagon'},
  {id:'large',name:'Large'},{id:'marble',name:'Marble'}
];
const WALLPAPER_STYLES=[
  {id:'stripes',name:'Stripes'},{id:'damask',name:'Damask'},{id:'geometric',name:'Geometric'},
  {id:'polka',name:'Polka Dots'},{id:'chevron',name:'Chevron'},{id:'solid',name:'Textured'}
];

/* ===== STATE ===== */
const state={
  palette:[],base:null,themes:[],curtainSuggestions:[],activeTheme:0,objectUrl:null,
  layers:{
    curtains:{enabled:true,mode:'preset',style:'straight',color:'#b0a08c',opacity:1,width:18,scale:1,custom:null},
    wallpaint:{enabled:false,color:'#d8cdb8',opacity:.70},
    walltiles:{enabled:false,mode:'preset',pattern:'subway',color:'#e8e2d5',scale:1,opacity:.88,custom:null},
    floor:{enabled:false,mode:'preset',pattern:'wood',color:'#8b6b4a',scale:1,opacity:.90,custom:null},
    wallpaper:{enabled:false,mode:'preset',pattern:'stripes',color:'#d5cbb8',opacity:.75,custom:null}
  }
};

/* ===== RENDER PALETTE ===== */
function renderPalette(){
  els.paletteStrip.innerHTML='';els.swatchList.innerHTML='';
  state.palette.forEach(c=>{
    const seg=document.createElement('div');seg.className='seg';seg.style.background=c.hex;
    seg.title=`${c.hex} · ${Math.round(c.pct*100)}% · ${c.name}`;
    seg.innerHTML=`<span style="color:${c.hsl.l>58?'rgba(0,0,0,.7)':'rgba(255,255,255,.85)'}">${Math.round(c.pct*100)}%</span>`;
    seg.addEventListener('click',()=>copyHex(c.hex));
    els.paletteStrip.appendChild(seg);
    const b=document.createElement('button');b.className='swatch';
    b.innerHTML=`<span class="swatch-chip" style="background:${c.hex}"></span><span class="swatch-hex">${c.hex.toUpperCase()}</span><span class="swatch-name">${c.name}</span>`;
    b.addEventListener('click',()=>copyHex(c.hex));
    els.swatchList.appendChild(b);
  });
}

/* ===== HELPERS FOR CURTAIN MINI PREVIEW ===== */
function curtainMiniStyle(styleId,color){
  const b=shadeColor(color,-60);const d=shadeColor(color,20);
  const w='rgba(255,255,255,.4)';const sh='rgba(0,0,0,.5)';
  const bg=color;
  switch(styleId){
    case 'straight':
      return `background-color:${bg};background-image:linear-gradient(180deg,${sh} 0%,transparent 10%,transparent 88%,${sh} 100%),repeating-linear-gradient(90deg,${sh} 0px,rgba(0,0,0,.05) 3px,${w} 6px,${w} 8px,rgba(0,0,0,.05) 11px,${sh} 14px)`;
    case 'pleat':
      return `background-color:${bg};background-image:repeating-linear-gradient(90deg,${sh} 0px,rgba(0,0,0,.05) 2px,${w} 4px,${w} 7px,rgba(0,0,0,.05) 9px,${sh} 11px)`;
    case 'empire':
      return `background-color:transparent;background-image:radial-gradient(ellipse 50% 40% at 50% 0%,${bg} 55%,transparent 70%),linear-gradient(90deg,${bg} 0%,${bg} 22%,transparent 28%,transparent 72%,${bg} 78%,${bg} 100%),radial-gradient(ellipse 40% 20% at 50% 8%,${w} 0%,transparent 60%)`;
    case 'overlapping':
      return `background-color:transparent;background-image:radial-gradient(ellipse 25% 40% at 22% 20%,${bg} 55%,transparent 75%),radial-gradient(ellipse 25% 40% at 50% 20%,${bg} 55%,transparent 75%),radial-gradient(ellipse 25% 40% at 78% 20%,${bg} 55%,transparent 75%),radial-gradient(ellipse 25% 45% at 36% 55%,${bg} 55%,transparent 75%),radial-gradient(ellipse 25% 45% at 64% 55%,${bg} 55%,transparent 75%)`;
    case 'cafe':
      return `background-color:${bg};background-image:linear-gradient(180deg,${sh} 0%,transparent 20%,transparent 80%,${sh} 100%),repeating-linear-gradient(90deg,${sh} 0px,${w} 6px,${sh} 12px);background-size:100% 100%,12px 100%`;
    case 'sandglass':
      return `background-color:${bg};background-image:repeating-linear-gradient(90deg,${sh} 0px,${w} 5px,${sh} 10px);clip-path:polygon(0 0,100% 0,100% 30%,40% 50%,100% 70%,100% 100%,0 100%,0 70%,60% 50%,0 30%)`;
    case 'french':
      return `background-color:${bg};background-image:repeating-linear-gradient(0deg,${w} 0px,rgba(255,255,255,.05) 4px,${sh} 10px,rgba(0,0,0,.08) 14px,${w} 20px),repeating-linear-gradient(90deg,rgba(255,255,255,.15) 0px,transparent 5px,rgba(0,0,0,.15) 10px,transparent 15px)`;
    case 'roller':
      return `background-color:${bg};background-image:linear-gradient(90deg,${sh} 0%,transparent 4%,transparent 96%,${sh} 100%)`;
    case 'asymmetric':
      return `background-color:${bg};background-image:linear-gradient(180deg,${sh} 0%,transparent 10%,transparent 88%,${sh} 100%);clip-path:polygon(0 0,100% 0,100% 30%,0 100%)`;
    case 'italian':
      return `background-color:${bg};background-image:repeating-linear-gradient(90deg,${sh} 0px,${w} 5px,${sh} 10px);clip-path:polygon(0 0,100% 0,100% 35%,45% 50%,100% 65%,100% 100%,0 100%)`;
    case 'vertical':
      return `background-color:${bg};background-image:repeating-linear-gradient(90deg,${w} 0px,${w} 1.5px,${sh} 3px,${sh} 5px,transparent 5px,transparent 7px)`;
    case 'drapery':
      return `background-color:${bg};background-image:radial-gradient(ellipse 70% 40% at 50% 0%,${w} 0%,transparent 60%),repeating-linear-gradient(90deg,${sh} 0px,${w} 5px,${sh} 10px)`;
    case 'london':
      return `background-color:${bg};background-image:linear-gradient(180deg,${w} 0%,transparent 25%,transparent 30%,${sh} 30%,transparent 35%),repeating-linear-gradient(90deg,${sh} 0px,${w} 6px,${sh} 12px)`;
    case 'threads':
      return `background-color:transparent;background-image:repeating-linear-gradient(90deg,${bg} 0px,${bg} 1px,transparent 1px,transparent 3px)`;
    case 'austrian':
      return `background-color:${bg};background-image:radial-gradient(ellipse 20% 12% at 15% 15%,${w} 0%,transparent 60%),radial-gradient(ellipse 20% 12% at 40% 15%,${w} 0%,transparent 60%),radial-gradient(ellipse 20% 12% at 65% 15%,${w} 0%,transparent 60%),radial-gradient(ellipse 20% 12% at 90% 15%,${w} 0%,transparent 60%),radial-gradient(ellipse 20% 14% at 20% 50%,${w} 0%,transparent 60%),radial-gradient(ellipse 20% 14% at 50% 50%,${w} 0%,transparent 60%),radial-gradient(ellipse 20% 14% at 80% 50%,${w} 0%,transparent 60%),radial-gradient(ellipse 20% 16% at 25% 85%,${w} 0%,transparent 60%),radial-gradient(ellipse 20% 16% at 55% 85%,${w} 0%,transparent 60%),radial-gradient(ellipse 20% 16% at 85% 85%,${w} 0%,transparent 60%)`;
    case 'japanese':
      return `background-color:${bg};background-image:repeating-linear-gradient(0deg,${w} 0px,${w} 1px,transparent 1px,transparent 4px,${sh} 4px,${sh} 5px,transparent 5px,transparent 8px)`;
    default:return `background-color:${bg}`;
  }
}

/* ===== RENDER CONTROL PANEL ===== */
function getAllColors(){
  const paletteColors=state.palette.map(p=>p.hex);
  const themeColors=state.themes[state.activeTheme]?state.themes[state.activeTheme].colors.map(c=>c.hex):[];
  return [...new Set([...paletteColors,...themeColors])].slice(0,14);
}
function swatchRowHTML(currentColor,colors,layerKey){
  const swatches=colors.map(c=>`
    <button class="color-swatch${c.toLowerCase()===currentColor.toLowerCase()?' active':''}"
            data-color="${c}" data-layer="${layerKey}" title="${c}">
      <span style="position:absolute;inset:0;background:${c};border-radius:7px;"></span>
    </button>`).join('');
  return swatches+`
    <label class="custom-color" for="customColor-${layerKey}">
      <span class="cc-preview" style="background:${currentColor}"></span>
      <span>Custom</span>
      <input type="color" id="customColor-${layerKey}" value="${currentColor}" data-custom-color="${layerKey}">
    </label>`;
}
function wallpaperBg(pattern,hex){
  const dark=shadeColor(hex,-55);const light=shadeColor(hex,25);
  switch(pattern){
    case 'stripes':return `repeating-linear-gradient(90deg,${hex} 0px,${hex} 12px,${light} 12px,${light} 14px,${hex} 14px,${hex} 26px,${dark} 26px,${dark} 28px)`;
    case 'damask':return `radial-gradient(circle at 50% 50%,${dark} 0 3px,transparent 4px),radial-gradient(circle at 0 0,${light} 0 4px,transparent 5px),radial-gradient(circle at 100% 100%,${light} 0 4px,transparent 5px),${hex}`;
    case 'geometric':return `linear-gradient(135deg,transparent 0 45%,${dark} 45% 55%,transparent 55%),linear-gradient(45deg,transparent 0 45%,${light} 45% 55%,transparent 55%),${hex}`;
    case 'polka':return `radial-gradient(circle,${dark} 0 3px,transparent 3.5px),radial-gradient(circle,${light} 0 2px,transparent 2.5px),${hex}`;
    case 'chevron':return `repeating-linear-gradient(45deg,${hex} 0px,${hex} 6px,${dark} 6px,${dark} 8px,${hex} 8px,${hex} 14px,${light} 14px,${light} 16px)`;
    default:return `radial-gradient(circle at 30% 30%,${light},${hex} 60%,${dark})`;
  }
}

function renderAllControls(){
  const cs=state.layers.curtains;
  $('#curtainStyleName').textContent=CURTAIN_STYLES.find(s=>s.id===cs.style)?.name||'';
  const styleGrid=$('#curtainStyleGrid');
  styleGrid.innerHTML=CURTAIN_STYLES.map(s=>`
    <div class="pattern-chip${s.id===cs.style?' active':''}" data-curtain-style="${s.id}">
      <div class="pc-preview">
        <div class="pc-mini" style="${curtainMiniStyle(s.id,cs.color)}"></div>
      </div>
      <div class="pc-name">${s.name}</div>
    </div>`).join('');
  $('#curtainSwatches').innerHTML=swatchRowHTML(cs.color,getAllColors(),'curtains');

  const wp=state.layers.wallpaint;
  $('#paintSwatches').innerHTML=swatchRowHTML(wp.color,getAllColors(),'wallpaint');

  const wt=state.layers.walltiles;
  $('#tilePatternGrid').innerHTML=TILE_PATTERNS.map(p=>{
    const url=makeTileTexture(p.id,wt.color,220);
    return `<div class="pattern-chip${p.id===wt.pattern?' active':''}" data-tile-pattern="${p.id}">
      <div class="pc-preview" style="background-image:url('${url}');background-size:42px 42px;"></div>
      <div class="pc-name">${p.name}</div></div>`;
  }).join('');
  $('#tileSwatches').innerHTML=swatchRowHTML(wt.color,getAllColors(),'walltiles');

  const fl=state.layers.floor;
  $('#floorPatternGrid').innerHTML=FLOOR_PATTERNS.map(p=>{
    const url=makeTileTexture(p.id,fl.color,220);
    return `<div class="pattern-chip${p.id===fl.pattern?' active':''}" data-floor-pattern="${p.id}">
      <div class="pc-preview" style="background-image:url('${url}');background-size:42px 42px;"></div>
      <div class="pc-name">${p.name}</div></div>`;
  }).join('');
  $('#floorSwatches').innerHTML=swatchRowHTML(fl.color,getAllColors(),'floor');

  const pp=state.layers.wallpaper;
  $('#paperPatternGrid').innerHTML=WALLPAPER_STYLES.map(p=>`
    <div class="pattern-chip${p.id===pp.pattern?' active':''}" data-paper-pattern="${p.id}">
      <div class="pc-preview" style="background:${wallpaperBg(p.id,pp.color)};background-size:22px 22px;background-repeat:repeat;"></div>
      <div class="pc-name">${p.name}</div>
    </div>`).join('');
  $('#paperSwatches').innerHTML=swatchRowHTML(pp.color,getAllColors(),'wallpaper');

  $$('.layer-card').forEach(card=>{
    const key=card.dataset.layer;const L=state.layers[key];
    card.classList.toggle('enabled',L.enabled);
    card.classList.toggle('custom',!!(L.custom&&L.mode==='custom'));
    const toggle=card.querySelector('input[data-toggle]');
    if(toggle)toggle.checked=L.enabled;
  });

  Object.keys(state.layers).forEach(key=>{
    if(state.layers[key].custom)renderCustomPreview(key);
  });

  Object.keys(state.layers).forEach(key=>{
    const L=state.layers[key];
    const card=document.querySelector(`.layer-card[data-layer="${key}"]`);
    if(!card)return;
    const tabs=card.querySelector('.source-tabs');
    if(tabs)tabs.querySelectorAll('.source-tab').forEach(t=>t.classList.toggle('active',t.dataset.source===L.mode));
    card.querySelectorAll('.source-view').forEach(v=>v.classList.toggle('is-hidden',v.dataset.view!==L.mode));
  });

  updateCounters();
  attachLayerEvents();
}

function renderCustomPreview(key){
  const L=state.layers[key];
  const preview=document.querySelector(`.pattern-preview[data-preview="${key}"]`);
  const zone=document.querySelector(`.upload-pattern-zone[data-upload="${key}"]`);
  if(!preview||!zone)return;
  if(!L.custom){preview.classList.add('is-hidden');zone.classList.remove('is-hidden');return;}
  zone.classList.add('is-hidden');preview.classList.remove('is-hidden');
  const thumb=preview.querySelector(`[data-thumb="${key}"]`);
  thumb.style.backgroundImage=`url('${L.custom.dataUrl}')`;
  preview.querySelector(`[data-name="${key}"]`).textContent=L.custom.name||'Custom pattern';
  const a=L.custom.analysis;
  preview.querySelector(`[data-meta="${key}"]`).textContent=a?`${a.typeLabel} · ${a.colorCount} colors · ${Math.round(L.custom.size/1024)} KB`:'Analysed';
  const badges=preview.querySelector(`[data-analysis="${key}"]`);
  if(a){
    badges.innerHTML=`
      <span class="analysis-badge good"><i class="fas fa-check-circle"></i> ${a.typeLabel}</span>
      <span class="analysis-badge"><i class="fas fa-ruler-combined"></i> Scale ${a.recommendedScale.toFixed(1)}×</span>
      <span class="analysis-badge"><i class="fas fa-circle-half-stroke"></i> Contrast ${Math.round(a.contrast)}</span>
      ${a.isLight?'<span class="analysis-badge good"><i class="fas fa-sun"></i> Light tones</span>':''}
      ${a.isDark?'<span class="analysis-badge"><i class="fas fa-moon"></i> Dark tones</span>':''}
    `;
  }else badges.innerHTML='';
  const colors=preview.querySelector(`[data-colors="${key}"]`);
  if(a&&a.palette&&a.palette.length){
    colors.innerHTML=a.palette.map(c=>`<div class="ac-swatch" style="background:${c.hex}" title="${c.hex} ${c.name}" data-hex="${c.hex}"></div>`).join('');
    colors.querySelectorAll('.ac-swatch').forEach(el=>el.addEventListener('click',()=>copyHex(el.dataset.hex)));
  }else colors.innerHTML='';
}

function renderThemes(){
  els.themeTabs.innerHTML='';
  state.themes.forEach((t,i)=>{
    const tab=document.createElement('button');
    tab.className='theme-tab'+(i===state.activeTheme?' active':'');
    tab.textContent=t.name;
    tab.addEventListener('click',()=>{state.activeTheme=i;renderThemes();renderAllControls();});
    els.themeTabs.appendChild(tab);
  });
  const theme=state.themes[state.activeTheme];if(!theme)return;
  els.themeDesc.textContent=theme.desc;
  els.themeGrid.innerHTML='';
  theme.colors.forEach(c=>{
    const col=document.createElement('div');col.className='theme-col';col.title=`Copy ${c.hex}`;
    col.innerHTML=`<div class="theme-chip" style="background:${c.hex}"></div><div class="theme-role">${c.role}</div><div class="theme-hex">${c.hex.toUpperCase()}</div>`;
    col.addEventListener('click',()=>copyHex(c.hex));
    els.themeGrid.appendChild(col);
  });
}

function renderCurtainSuggestions(){
  els.curtainSuggestions.innerHTML='';
  state.curtainSuggestions.forEach((c,i)=>{
    const item=document.createElement('button');
    item.className='curtain-item'+(i===0&&state.layers.curtains.mode==='preset'?' selected':'');
    item.innerHTML=`
      <span class="curtain-chip" style="background-color:${c.hex}"></span>
      <span class="curtain-meta">
        <span class="curtain-tag">${c.tag}</span>
        <span class="curtain-name">${c.name} <span>${c.hex.toUpperCase()}</span></span>
        <span class="curtain-reason">${c.reason}</span>
      </span>
      <i class="fas fa-check curtain-check"></i>`;
    item.addEventListener('click',()=>{
      state.layers.curtains.color=c.hex;state.layers.curtains.enabled=true;
      state.layers.curtains.opacity=1;state.layers.curtains.mode='preset';
      $$('.curtain-item').forEach(el=>el.classList.remove('selected'));item.classList.add('selected');
      renderAllControls();applyAllLayers();
      showToast(`🎨 ${c.name} curtain applied`);
    });
    els.curtainSuggestions.appendChild(item);
  });
}

/* ===== ATTACH EVENTS ===== */
function attachLayerEvents(){
  $$('input[data-toggle]').forEach(inp=>{
    inp.addEventListener('change',e=>{
      const key=e.target.dataset.toggle;
      state.layers[key].enabled=e.target.checked;
      applyAllLayers();renderAllControls();
    });
  });
  $$('.layer-head').forEach(head=>{
    head.addEventListener('click',e=>{
      if(e.target.closest('.switch'))return;
      const card=head.closest('.layer-card');const key=card.dataset.layer;
      state.layers[key].enabled=!state.layers[key].enabled;
      applyAllLayers();renderAllControls();
    });
  });
  $$('.source-tabs').forEach(tabs=>{
    const key=tabs.dataset.sources;
    tabs.querySelectorAll('.source-tab').forEach(t=>{
      t.addEventListener('click',()=>{state.layers[key].mode=t.dataset.source;renderAllControls();});
    });
  });
  $$('.upload-pattern-zone').forEach(zone=>{
    const key=zone.dataset.upload;
    zone.addEventListener('click',()=>{const f=document.querySelector(`input[data-file="${key}"]`);if(f)f.click();});
    ['dragenter','dragover'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();e.stopPropagation();zone.classList.add('dragover');}));
    ['dragleave','drop'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();e.stopPropagation();zone.classList.remove('dragover');}));
    zone.addEventListener('drop',e=>{const dt=e.dataTransfer;const f=dt&&dt.files&&dt.files[0];if(f)processPatternFile(key,f);});
  });
  $$('input[data-file]').forEach(inp=>{
    inp.addEventListener('change',e=>{
      const f=e.target.files&&e.target.files[0];
      if(f)processPatternFile(inp.dataset.file,f);
      inp.value='';
    });
  });
  $$('[data-apply]').forEach(btn=>{
    btn.addEventListener('click',e=>{
      e.stopPropagation();
      const key=btn.dataset.apply;
      state.layers[key].enabled=true;state.layers[key].mode='custom';
      applyAllLayers();renderAllControls();
      showToast('✨ Custom pattern applied');
    });
  });
  $$('[data-replace]').forEach(btn=>{
    btn.addEventListener('click',e=>{
      e.stopPropagation();
      const key=btn.dataset.replace;
      const f=document.querySelector(`input[data-file="${key}"]`);if(f)f.click();
    });
  });
  $$('[data-remove]').forEach(btn=>{
    btn.addEventListener('click',e=>{
      e.stopPropagation();
      const key=btn.dataset.remove;
      state.layers[key].custom=null;state.layers[key].mode='preset';
      renderAllControls();applyAllLayers();
      showToast('🗑 Custom pattern removed');
    });
  });
  $$('[data-curtain-style]').forEach(el=>{
    el.addEventListener('click',()=>{
      state.layers.curtains.style=el.dataset.curtainStyle;
      state.layers.curtains.mode='preset';
      renderAllControls();applyAllLayers();
    });
  });
  $$('[data-tile-pattern]').forEach(el=>{
    el.addEventListener('click',()=>{
      state.layers.walltiles.pattern=el.dataset.tilePattern;
      state.layers.walltiles.mode='preset';
      renderAllControls();applyAllLayers();
    });
  });
  $$('[data-floor-pattern]').forEach(el=>{
    el.addEventListener('click',()=>{
      state.layers.floor.pattern=el.dataset.floorPattern;
      state.layers.floor.mode='preset';
      renderAllControls();applyAllLayers();
    });
  });
  $$('[data-paper-pattern]').forEach(el=>{
    el.addEventListener('click',()=>{
      state.layers.wallpaper.pattern=el.dataset.paperPattern;
      state.layers.wallpaper.mode='preset';
      renderAllControls();applyAllLayers();
    });
  });
  $$('.color-swatch').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const key=btn.dataset.layer;
      state.layers[key].color=btn.dataset.color;
      state.layers[key].mode='preset';
      renderAllControls();applyAllLayers();
    });
  });
  $$('input[data-custom-color]').forEach(inp=>{
    inp.addEventListener('input',e=>{state.layers[e.target.dataset.customColor].color=e.target.value;applyAllLayers();});
    inp.addEventListener('change',()=>renderAllControls());
  });
  bindSlider('curtainWidth',v=>state.layers.curtains.width=v,'curtainWidthVal','%',v=>v);
  bindSlider('curtainOpacity',v=>state.layers.curtains.opacity=v,'curtainOpacityVal','',v=>v.toFixed(2));
  bindSlider('curtainScale',v=>state.layers.curtains.scale=v,'curtainScaleVal','×',v=>v.toFixed(2));
  bindSlider('paintOpacity',v=>state.layers.wallpaint.opacity=v,'paintOpacityVal','',v=>v.toFixed(2));
  bindSlider('tileScale',v=>state.layers.walltiles.scale=v,'tileScaleVal','×',v=>v.toFixed(2));
  bindSlider('tileOpacity',v=>state.layers.walltiles.opacity=v,'tileOpacityVal','',v=>v.toFixed(2));
  bindSlider('floorScale',v=>state.layers.floor.scale=v,'floorScaleVal','×',v=>v.toFixed(2));
  bindSlider('floorOpacity',v=>state.layers.floor.opacity=v,'floorOpacityVal','',v=>v.toFixed(2));
  bindSlider('paperOpacity',v=>state.layers.wallpaper.opacity=v,'paperOpacityVal','',v=>v.toFixed(2));

  const ct=$('#curtainToggleBtn');if(ct)ct.addEventListener('click',e=>{e.stopPropagation();state.layers.curtains.opacity=state.layers.curtains.opacity>0?0:1;renderAllControls();applyAllLayers();});
  const af=$('#curtainAutoFit');if(af)af.addEventListener('click',e=>{
    e.stopPropagation();
    const L=state.layers.curtains;
    if(L.custom&&L.custom.analysis){
      L.scale=L.custom.analysis.recommendedScale;
      const sl=document.getElementById('curtainScale');
      sl.value=L.scale;document.getElementById('curtainScaleVal').textContent=L.scale.toFixed(2)+'×';
      sl.style.setProperty('--p',((sl.value-sl.min)/(sl.max-sl.min))*100+'%');
      applyAllLayers();showToast('✨ Auto-fit applied');
    }
  });

  const pt=$('#paintThemeBtn');if(pt)pt.addEventListener('click',e=>{e.stopPropagation();const t=state.themes[state.activeTheme];state.layers.wallpaint.color=t.colors[0].hex;state.layers.wallpaint.opacity=.75;state.layers.wallpaint.enabled=true;renderAllControls();applyAllLayers();});
  const pc=$('#paintClearBtn');if(pc)pc.addEventListener('click',e=>{e.stopPropagation();state.layers.wallpaint.enabled=false;renderAllControls();applyAllLayers();});
  const tt=$('#tileThemeBtn');if(tt)tt.addEventListener('click',e=>{e.stopPropagation();const t=state.themes[state.activeTheme];state.layers.walltiles.color=t.colors[1].hex;state.layers.walltiles.opacity=.9;state.layers.walltiles.enabled=true;state.layers.walltiles.mode='preset';renderAllControls();applyAllLayers();});
  const tc=$('#tileClearBtn');if(tc)tc.addEventListener('click',e=>{e.stopPropagation();state.layers.walltiles.enabled=false;renderAllControls();applyAllLayers();});
  const ft=$('#floorThemeBtn');if(ft)ft.addEventListener('click',e=>{e.stopPropagation();const t=state.themes[state.activeTheme];state.layers.floor.color=t.colors[4].hex;state.layers.floor.opacity=.9;state.layers.floor.enabled=true;state.layers.floor.mode='preset';renderAllControls();applyAllLayers();});
  const fc=$('#floorClearBtn');if(fc)fc.addEventListener('click',e=>{e.stopPropagation();state.layers.floor.enabled=false;renderAllControls();applyAllLayers();});
  const ppt=$('#paperThemeBtn');if(ppt)ppt.addEventListener('click',e=>{e.stopPropagation();const t=state.themes[state.activeTheme];state.layers.wallpaper.color=t.colors[0].hex;state.layers.wallpaper.opacity=.8;state.layers.wallpaper.enabled=true;state.layers.wallpaper.mode='preset';renderAllControls();applyAllLayers();});
  const ppc=$('#paperClearBtn');if(ppc)ppc.addEventListener('click',e=>{e.stopPropagation();state.layers.wallpaper.enabled=false;renderAllControls();applyAllLayers();});
}

function bindSlider(id,cb,valId,suffix,fmt){
  const el=document.getElementById(id);if(!el)return;
  const vEl=document.getElementById(valId);
  const initPct=((parseFloat(el.value)-el.min)/(el.max-el.min))*100;
  el.style.setProperty('--p',initPct+'%');
  if(vEl)vEl.textContent=(fmt?fmt(parseFloat(el.value)):el.value)+suffix;
  el.addEventListener('input',e=>{
    const v=parseFloat(e.target.value);cb(v);
    const pct=((v-el.min)/(el.max-el.min))*100;
    el.style.setProperty('--p',pct+'%');
    if(vEl)vEl.textContent=(fmt?fmt(v):v)+suffix;
    applyAllLayers();
  });
}

/* ===== APPLY LAYERS ===== */
const FULL_WIDTH_STYLES=['empire','overlapping','french','roller','vertical','threads','austrian','japanese'];
function applyAllLayers(){
  const L=state.layers;

  const c=L.curtains;
  els.curtainL.dataset.style=c.style;
  els.curtainR.dataset.style=c.style;
  els.previewCanvas.style.setProperty('--curtain-color',c.color);

  const isFull=FULL_WIDTH_STYLES.includes(c.style);

  if(isFull){
    els.curtainL.style.width='100%';
    els.curtainL.style.left='0';
    els.curtainL.style.right='0';
    els.curtainL.style.display='';
    els.curtainR.style.display='none';
  }else{
    els.curtainL.style.width=c.width+'%';
    els.curtainL.style.left='0';
    els.curtainL.style.right='';
    els.curtainR.style.width=c.width+'%';
    els.curtainR.style.right='0';
    els.curtainR.style.display='';
    els.curtainL.style.display='';
  }

  const effOpacity=c.style==='sheer'?Math.min(c.opacity,.6):c.opacity;
  els.curtainL.style.setProperty('--curtain-opacity',c.enabled?effOpacity:0);
  els.curtainR.style.setProperty('--curtain-opacity',c.enabled?effOpacity:0);
  els.previewCanvas.classList.toggle('curtains-on',c.enabled&&c.opacity>0);

  if(c.mode==='custom'&&c.custom){
    const size=(110*c.scale)+'px '+(110*c.scale)+'px';
    els.curtainL.classList.add('custom-fabric');
    els.curtainR.classList.add('custom-fabric');
    els.curtainL.style.setProperty('--curtain-fabric',`url('${c.custom.dataUrl}')`);
    els.curtainR.style.setProperty('--curtain-fabric',`url('${c.custom.dataUrl}')`);
    els.curtainL.style.setProperty('--curtain-fabric-size',size);
    els.curtainR.style.setProperty('--curtain-fabric-size',size);
  }else{
    els.curtainL.classList.remove('custom-fabric');
    els.curtainR.classList.remove('custom-fabric');
    els.curtainL.style.removeProperty('--curtain-fabric');
    els.curtainR.style.removeProperty('--curtain-fabric');
  }

  const wp=L.wallpaint;
  els.layerWallPaint.style.background=wp.color;
  els.layerWallPaint.style.opacity=wp.enabled?wp.opacity:0;

  const wpp=L.wallpaper;
  if(wpp.mode==='custom'&&wpp.custom){
    els.layerWallpaper.style.backgroundImage=`url('${wpp.custom.dataUrl}')`;
    els.layerWallpaper.style.backgroundSize=(220*1)+'px '+(220*1)+'px';
  }else{
    els.layerWallpaper.style.backgroundImage='';
    els.layerWallpaper.style.background=wallpaperBg(wpp.pattern,wpp.color);
    els.layerWallpaper.style.backgroundSize=
      wpp.pattern==='stripes'?'28px 100%':
      wpp.pattern==='polka'?'26px 26px':
      wpp.pattern==='damask'?'34px 34px':
      wpp.pattern==='geometric'?'30px 30px':
      wpp.pattern==='chevron'?'22px 22px':'120px 120px';
  }
  els.layerWallpaper.style.backgroundRepeat='repeat';
  els.layerWallpaper.style.opacity=wpp.enabled?wpp.opacity:0;

  const wt=L.walltiles;
  if(wt.mode==='custom'&&wt.custom){
    els.layerWallTiles.style.backgroundImage=`url('${wt.custom.dataUrl}')`;
    els.layerWallTiles.style.backgroundSize=(170*wt.scale)+'px '+(170*wt.scale)+'px';
  }else{
    const tileUrl=makeTileTexture(wt.pattern,wt.color,640);
    els.layerWallTiles.style.backgroundImage=`url('${tileUrl}')`;
    els.layerWallTiles.style.backgroundSize=(180*wt.scale)+'px '+(180*wt.scale)+'px';
  }
  els.layerWallTiles.style.opacity=wt.enabled?wt.opacity:0;

  const fl=L.floor;
  if(fl.mode==='custom'&&fl.custom){
    els.floorPattern.style.backgroundImage=`url('${fl.custom.dataUrl}')`;
    els.floorPattern.style.backgroundSize=(230*fl.scale)+'px '+(230*fl.scale)+'px';
  }else{
    const floorUrl=makeTileTexture(fl.pattern,fl.color,640);
    els.floorPattern.style.backgroundImage=`url('${floorUrl}')`;
    els.floorPattern.style.backgroundSize=(220*fl.scale)+'px '+(220*fl.scale)+'px';
  }
  els.layerFloor.style.opacity=fl.enabled?fl.opacity:0;

  updateCounters();
}

function updateCounters(){
  const L=state.layers;
  els.activeCount.textContent=Object.values(L).filter(l=>l.enabled).length;
  const cc=Object.values(L).filter(l=>l.custom&&l.mode==='custom').length;
  els.customCount.textContent=cc;
  if(cc>0||state.palette.length){
    els.smartSuggestionsCard.style.display='block';
    renderSmartSuggestions();
  }
}

/* ===== SMART SUGGESTIONS ===== */
function renderSmartSuggestions(){
  const L=state.layers;const suggestions=[];
  Object.keys(L).forEach(key=>{
    if(!L[key].custom||!L[key].custom.analysis)return;
    const a=L[key].custom.analysis;
    if(key==='curtains'&&a.type==='bold'){
      suggestions.push({icon:'fa-scroll',name:'Curtains: bold pattern',
        reason:`Bold patterns drape beautifully — try ${a.recommendedScale.toFixed(1)}× scale.`,
        action:()=>{L.curtains.scale=a.recommendedScale;applyAllLayers();renderAllControls();}});
    }
    if(key==='walltiles'&&(a.type==='pattern'||a.type==='subtle')){
      suggestions.push({icon:'fa-th-large',name:'Tiles: ideal density',
        reason:`${a.typeLabel} tiles read cleanly on walls.`,
        action:()=>{L.walltiles.scale=a.recommendedScale;applyAllLayers();renderAllControls();}});
    }
    if(key==='floor'&&a.avgL<100){
      suggestions.push({icon:'fa-border-all',name:'Floor: darker tone',
        reason:'Dark floors ground bright rooms. Lower intensity to 0.75.',
        action:()=>{L.floor.opacity=.75;applyAllLayers();renderAllControls();}});
    }
    if(key==='wallpaper'&&a.isLight){
      suggestions.push({icon:'fa-scroll',name:'Wallpaper: keep it airy',
        reason:'Light papers open up the room. Set opacity 0.65.',
        action:()=>{L.wallpaper.opacity=.65;applyAllLayers();renderAllControls();}});
    }
  });
  if(state.base&&state.base.hsl.s>40){
    suggestions.push({icon:'fa-palette',name:'Room is saturated',
      reason:'Try a Tone-on-Tone theme for harmony.',
      action:()=>{state.activeTheme=0;renderThemes();renderAllControls();}});
  }
  if(!suggestions.length){
    els.suggestionList.innerHTML=`<div style="text-align:center;color:var(--text-muted);font-size:.72rem;padding:14px;">Upload a pattern to see smart suggestions.</div>`;
    return;
  }
  els.suggestionList.innerHTML='';
  suggestions.slice(0,4).forEach(s=>{
    const el=document.createElement('button');el.className='suggestion';
    el.innerHTML=`
      <span class="sg-icon"><i class="fas ${s.icon}"></i></span>
      <span class="sg-meta">
        <span class="sg-name">${s.name}</span>
        <span class="sg-reason">${s.reason}</span>
      </span>
      <span class="sg-go">Apply</span>`;
    el.addEventListener('click',s.action);
    els.suggestionList.appendChild(el);
  });
}

/* ===== IMAGE PIPELINE ===== */
function showLoader(show,msg){if(msg)els.loaderMsg.textContent=msg;els.loader.classList.toggle('show',show);}
function loadImage(src){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>res(img);img.onerror=()=>rej(new Error('bad'));img.src=src;});}

async function processFile(file){
  if(!file)return;
  if(!file.type.startsWith('image/')){showToast('⚠️ Please choose an image file');return;}
  if(file.size>15*1024*1024){showToast('⚠️ Image larger than 15 MB');return;}
  if(state.objectUrl)URL.revokeObjectURL(state.objectUrl);
  state.objectUrl=URL.createObjectURL(file);
  await runAnalysis(state.objectUrl);
}
async function runAnalysis(src){
  showLoader(true,'Reading colors from your room…');
  try{
    const img=await loadImage(src);
    els.previewImg.src=src;
    const palette=extractPalette(img,7);
    if(!palette.length){showLoader(false);showToast('😕 Could not read colors');return;}
    state.palette=palette;
    state.base=pickBaseColor(palette);
    state.themes=buildThemes(state.base);
    state.curtainSuggestions=buildCurtainSuggestions(state.base);
    state.activeTheme=0;
    const baseHsl=state.base.hsl;
    state.layers.wallpaint.color=hslToHex(baseHsl.h,clamp(baseHsl.s*.4,6,24),90);
    state.layers.walltiles.color=hslToHex(baseHsl.h,clamp(baseHsl.s*.5,8,30),88);
    state.layers.floor.color=hslToHex(baseHsl.h,clamp(baseHsl.s*.7,12,40),45);
    state.layers.wallpaper.color=hslToHex(baseHsl.h,clamp(baseHsl.s*.4,6,24),82);
    state.layers.curtains.color=state.curtainSuggestions[0].hex;
    state.layers.curtains.enabled=true;
    renderPalette();renderThemes();renderCurtainSuggestions();renderAllControls();applyAllLayers();
    els.uploadZone.classList.add('is-hidden');
    els.studio.classList.remove('is-hidden');
    showLoader(false);
    setTimeout(()=>els.studio.scrollIntoView({behavior:'smooth',block:'start'}),80);
    showToast('✨ Room ready — pick a curtain style!');
  }catch(err){showLoader(false);showToast('⚠️ Something went wrong');console.error(err);}
}

async function processPatternFile(key,file){
  if(!file)return;
  if(!file.type.startsWith('image/')){showToast('⚠️ Please choose an image file');return;}
  if(file.size>15*1024*1024){showToast('⚠️ Image larger than 15 MB');return;}
  showLoader(true,`Analyzing ${key} pattern…`);
  try{
    const src=URL.createObjectURL(file);
    const img=await loadImage(src);
    const analysis=analyzePattern(img,96);
    const seamlessDataUrl=makeSeamlessTile(img,512);
    state.layers[key].custom={
      dataUrl:seamlessDataUrl,originalUrl:src,analysis,
      name:file.name.replace(/\.[^.]+$/,'').substring(0,30)||'Custom pattern',
      size:file.size,filename:file.name
    };
    if(analysis&&analysis.recommendedScale){
      if(key==='curtains')state.layers[key].scale=analysis.recommendedScale;
      if(key==='walltiles')state.layers[key].scale=analysis.recommendedScale;
      if(key==='floor')state.layers[key].scale=analysis.recommendedScale;
    }
    state.layers[key].mode='custom';
    state.layers[key].enabled=true;
    renderAllControls();applyAllLayers();
    const scaleId=key==='curtains'?'curtainScale':key==='walltiles'?'tileScale':key==='floor'?'floorScale':null;
    if(scaleId){
      const sl=document.getElementById(scaleId);
      if(sl){sl.value=state.layers[key].scale;
        sl.style.setProperty('--p',((sl.value-sl.min)/(sl.max-sl.min))*100+'%');
        const vEl=document.getElementById(scaleId+'Val');if(vEl)vEl.textContent=parseFloat(sl.value).toFixed(2)+'×';}
    }
    showLoader(false);
    showToast(`✨ ${analysis?analysis.typeLabel:'Pattern'} applied!`);
  }catch(err){showLoader(false);showToast('⚠️ Could not process pattern');console.error(err);}
}

/* ===== UI ACTIONS ===== */
function copyHex(hex){
  const done=()=>showToast(`📋 Copied ${hex.toUpperCase()}`);
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(hex).then(done).catch(()=>fbCopy(hex,done));
  else fbCopy(hex,done);
}
function fbCopy(text,cb){const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');cb();}catch(e){}ta.remove();}
function showToast(msg){
  const old=document.querySelector('.custom-toast');if(old)old.remove();
  const t=document.createElement('div');t.className='custom-toast';t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),450);},2500);
}
function resetApp(){
  if(state.objectUrl){URL.revokeObjectURL(state.objectUrl);state.objectUrl=null;}
  state.palette=[];state.base=null;state.themes=[];state.curtainSuggestions=[];
  els.previewImg.removeAttribute('src');
  els.studio.classList.add('is-hidden');
  els.uploadZone.classList.remove('is-hidden');
  els.fileInput.value='';
  els.previewCanvas.classList.remove('show-original');
  window.scrollTo({top:0,behavior:'smooth'});
}
function clearAllLayers(){
  Object.keys(state.layers).forEach(k=>state.layers[k].enabled=false);
  renderAllControls();applyAllLayers();
  showToast('🧹 All layers disabled');
}

/* ===== EXPORT PNG ===== */
async function exportMockup(){
  if(!els.previewImg.src){showToast('⚠️ Upload a room photo first');return;}
  showLoader(true,'Rendering mockup…');
  try{
    const img=await loadImage(els.previewImg.src);
    const W=img.naturalWidth,H=img.naturalHeight;
    const cv=document.createElement('canvas');cv.width=W;cv.height=H;
    const ctx=cv.getContext('2d');
    ctx.drawImage(img,0,0,W,H);
    const L=state.layers;

    if(L.wallpaint.enabled&&L.wallpaint.opacity>0){
      const{r,g,b}=hexToRgb(L.wallpaint.color);
      ctx.save();ctx.globalCompositeOperation='color';ctx.globalAlpha=L.wallpaint.opacity;
      ctx.fillStyle=`rgb(${r},${g},${b})`;ctx.fillRect(0,0,W,H);ctx.restore();
    }
    if(L.wallpaper.enabled&&L.wallpaper.opacity>0){
      const cvp=document.createElement('canvas');cvp.width=W;cvp.height=H;
      const cp=cvp.getContext('2d');
      if(L.wallpaper.mode==='custom'&&L.wallpaper.custom){
        await drawPatternOnCanvas(cp,L.wallpaper.custom.dataUrl,W,H,H*.58,1,220);
      }else drawWallpaperOnCanvas(cp,L.wallpaper.pattern,L.wallpaper.color,W,H,H*.58);
      ctx.save();ctx.globalCompositeOperation='multiply';ctx.globalAlpha=L.wallpaper.opacity;
      ctx.drawImage(cvp,0,0);ctx.restore();
    }
    if(L.walltiles.enabled&&L.walltiles.opacity>0){
      ctx.save();ctx.globalCompositeOperation='multiply';ctx.globalAlpha=L.walltiles.opacity;
      const url=L.walltiles.mode==='custom'&&L.walltiles.custom?L.walltiles.custom.dataUrl:makeTileTexture(L.walltiles.pattern,L.walltiles.color,640);
      const baseSize=L.walltiles.mode==='custom'?170:180;
      const tex=await loadImage(url);const pattern=ctx.createPattern(tex,'repeat');
      const scale=baseSize*L.walltiles.scale*(W/1000);
      pattern.setTransform(new DOMMatrix().scale(scale/512));
      ctx.fillStyle=pattern;ctx.fillRect(0,0,W,H*.56);ctx.restore();
    }
    if(L.floor.enabled&&L.floor.opacity>0){
      ctx.save();ctx.globalCompositeOperation='multiply';ctx.globalAlpha=L.floor.opacity;
      const url=L.floor.mode==='custom'&&L.floor.custom?L.floor.custom.dataUrl:makeTileTexture(L.floor.pattern,L.floor.color,640);
      const baseSize=L.floor.mode==='custom'?230:220;
      const tex=await loadImage(url);const pattern=ctx.createPattern(tex,'repeat');
      const scale=baseSize*L.floor.scale*(W/1000);
      pattern.setTransform(new DOMMatrix().scale(scale/512,scale/512*.7));
      ctx.fillStyle=pattern;ctx.fillRect(0,H*.48,W,H*.52);ctx.restore();
    }
    if(L.curtains.enabled&&L.curtains.opacity>0){
      if(L.curtains.mode==='custom'&&L.curtains.custom)await drawCurtainsWithFabric(ctx,W,H,L.curtains);
      else drawCurtainsOnCanvas(ctx,W,H,L.curtains);
    }

    cv.toBlob(blob=>{
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);
      a.download=`helaberry-mockup-${Date.now()}.png`;
      document.body.appendChild(a);a.click();a.remove();
      showLoader(false);showToast('💾 Mockup saved');
    },'image/png');
  }catch(err){showLoader(false);showToast('⚠️ Could not export');console.error(err);}
}

async function drawPatternOnCanvas(ctx,url,W,H,regionH,scale,baseSize){
  const tex=await loadImage(url);const pattern=ctx.createPattern(tex,'repeat');
  const s=baseSize*scale*(W/1000);
  pattern.setTransform(new DOMMatrix().scale(s/512));
  ctx.fillStyle=pattern;ctx.fillRect(0,0,W,regionH);
}

async function drawCurtainsWithFabric(ctx,W,H,c){
  const fullWidth=FULL_WIDTH_STYLES.includes(c.style);
  const width=fullWidth?W:W*(c.width/100);
  const tex=await loadImage(c.custom.dataUrl);
  const draw=(x0)=>{
    ctx.save();
    ctx.beginPath();ctx.rect(x0,0,width,H);ctx.clip();
    const pattern=ctx.createPattern(tex,'repeat');
    const s=110*c.scale*(W/1000);
    pattern.setTransform(new DOMMatrix().scale(s/512));
    ctx.fillStyle=pattern;ctx.fillRect(x0,0,width,H);
    ctx.restore();
    ctx.save();ctx.globalCompositeOperation='multiply';ctx.globalAlpha=.55;
    const gap=32;
    for(let x=0;x<width;x+=gap){
      const g2=ctx.createLinearGradient(x0+x,0,x0+x+gap,0);
      g2.addColorStop(0,'rgba(0,0,0,.55)');
      g2.addColorStop(.5,'rgba(255,255,255,.3)');
      g2.addColorStop(1,'rgba(0,0,0,.55)');
      ctx.fillStyle=g2;ctx.fillRect(x0+x,0,gap,H);
    }
    ctx.restore();
    ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(x0,0,width,H*.045);
  };
  if(fullWidth){draw(0);}
  else{draw(0);draw(W-width);}
}

function drawWallpaperOnCanvas(ctx,pattern,hex,W,H,regionH){
  const dark=shadeColor(hex,-55);const light=shadeColor(hex,25);
  ctx.save();ctx.beginPath();ctx.rect(0,0,W,regionH);ctx.clip();
  if(pattern==='stripes'){for(let x=0;x<W;x+=26){ctx.fillStyle=hex;ctx.fillRect(x,0,12,regionH);ctx.fillStyle=light;ctx.fillRect(x+12,0,2,regionH);ctx.fillStyle=hex;ctx.fillRect(x+14,0,12,regionH);ctx.fillStyle=dark;ctx.fillRect(x+26,0,2,regionH);}}
  else if(pattern==='polka'){ctx.fillStyle=hex;ctx.fillRect(0,0,W,regionH);ctx.fillStyle=dark;for(let y=0;y<regionH;y+=26)for(let x=0;x<W;x+=26){ctx.beginPath();ctx.arc(x+(y/26%2)*13,y,3,0,Math.PI*2);ctx.fill();}}
  else if(pattern==='damask'){ctx.fillStyle=hex;ctx.fillRect(0,0,W,regionH);ctx.fillStyle=dark;for(let y=0;y<regionH;y+=34)for(let x=0;x<W;x+=34){ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();}}
  else if(pattern==='geometric'){ctx.fillStyle=hex;ctx.fillRect(0,0,W,regionH);ctx.fillStyle=dark;for(let y=0;y<regionH;y+=30)for(let x=0;x<W;x+=30){ctx.beginPath();ctx.moveTo(x,y+15);ctx.lineTo(x+15,y);ctx.lineTo(x+30,y+15);ctx.lineTo(x+15,y+30);ctx.closePath();ctx.fill();}}
  else if(pattern==='chevron'){ctx.fillStyle=hex;ctx.fillRect(0,0,W,regionH);ctx.strokeStyle=dark;ctx.lineWidth=3;for(let y=0;y<regionH;y+=22){ctx.beginPath();for(let x=0;x<W;x+=22){ctx.lineTo(x,y+((x/22)%2)*22);ctx.lineTo(x+11,y+((x/22)%2)*22+11);}ctx.stroke();}}
  else{ctx.fillStyle=hex;ctx.fillRect(0,0,W,regionH);ctx.fillStyle='rgba(255,255,255,.04)';for(let i=0;i<400;i++){const x=Math.random()*W,y=Math.random()*regionH;ctx.fillRect(x,y,2,2);}}
  ctx.restore();
}

function drawCurtainsOnCanvas(ctx,W,H,c){
  const fullWidth=FULL_WIDTH_STYLES.includes(c.style);
  const width=fullWidth?W:W*(c.width/100);
  const draw=(x0)=>{
    const grd=ctx.createLinearGradient(x0,0,x0+width,0);
    grd.addColorStop(0,shadeColor(c.color,-30));
    grd.addColorStop(.5,c.color);
    grd.addColorStop(1,shadeColor(c.color,10));
    ctx.fillStyle=grd;ctx.fillRect(x0,0,width,H);
    ctx.save();ctx.globalAlpha=.55;
    for(let x=0;x<width;x+=32){
      const g2=ctx.createLinearGradient(x0+x,0,x0+x+32,0);
      g2.addColorStop(0,'rgba(0,0,0,.45)');g2.addColorStop(.5,'rgba(255,255,255,.35)');g2.addColorStop(1,'rgba(0,0,0,.45)');
      ctx.fillStyle=g2;ctx.fillRect(x0+x,0,32,H);
    }
    ctx.restore();
    ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(x0,0,width,H*.045);
    const hem=ctx.createLinearGradient(0,H*.94,0,H);
    hem.addColorStop(0,'rgba(0,0,0,0)');hem.addColorStop(1,'rgba(0,0,0,.55)');
    ctx.fillStyle=hem;ctx.fillRect(x0,H*.94,width,H*.06);
  };
  if(fullWidth)draw(0);else{draw(0);draw(W-width);}
}

/* ===== EVENT WIRING ===== */
els.uploadZone.addEventListener('click',()=>els.fileInput.click());
els.uploadZone.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();els.fileInput.click();}});
els.fileInput.addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];if(f)processFile(f);});
['dragenter','dragover'].forEach(evt=>els.uploadZone.addEventListener(evt,e=>{e.preventDefault();e.stopPropagation();els.uploadZone.classList.add('dragover');}));
['dragleave','drop'].forEach(evt=>els.uploadZone.addEventListener(evt,e=>{e.preventDefault();e.stopPropagation();els.uploadZone.classList.remove('dragover');}));
els.uploadZone.addEventListener('drop',e=>{const dt=e.dataTransfer;const f=dt&&dt.files&&dt.files[0];if(f)processFile(f);});
['dragover','drop'].forEach(evt=>window.addEventListener(evt,e=>{if(!els.uploadZone.contains(e.target))e.preventDefault();}));
window.addEventListener('paste',e=>{
  const items=e.clipboardData&&e.clipboardData.items;if(!items)return;
  for(const item of items){if(item.type&&item.type.startsWith('image/')){const f=item.getAsFile();if(f){processFile(f);showToast('📋 Room pasted');}break;}}
});

$('#btnCompare').addEventListener('click',()=>{
  els.previewCanvas.classList.toggle('show-original');
  const on=els.previewCanvas.classList.contains('show-original');
  $('#btnCompare').classList.toggle('active',on);
  $('#barCompare').classList.toggle('primary',on);
});
$('#barCompare').addEventListener('click',()=>$('#btnCompare').click());
$('#btnCurtainToggle').addEventListener('click',()=>{state.layers.curtains.enabled=!state.layers.curtains.enabled;renderAllControls();applyAllLayers();});
$('#btnRandom').addEventListener('click',()=>{
  const st=CURTAIN_STYLES[Math.floor(Math.random()*CURTAIN_STYLES.length)];
  const c=state.palette[Math.floor(Math.random()*state.palette.length)]||{hex:'#b0a08c',name:'Sand'};
  state.layers.curtains.style=st.id;
  state.layers.curtains.color=c.hex;
  state.layers.curtains.mode='preset';
  state.layers.curtains.enabled=true;
  state.layers.curtains.opacity=1;
  renderAllControls();applyAllLayers();
  showToast(`🎲 ${st.name} · ${c.name}`);
});
$('#barClear').addEventListener('click',clearAllLayers);
$('#barNew').addEventListener('click',()=>els.fileInput.click());
$('#barExport').addEventListener('click',exportMockup);
$('#navReset').addEventListener('click',resetApp);
$('#navSave').addEventListener('click',exportMockup);

$('#themeCurtain').addEventListener('click',()=>{
  const t=state.themes[state.activeTheme];const cur=t.colors.find(c=>c.role==='Curtain');if(!cur)return;
  state.layers.curtains.color=cur.hex;state.layers.curtains.mode='preset';
  state.layers.curtains.enabled=true;state.layers.curtains.opacity=1;
  renderAllControls();applyAllLayers();showToast('🎨 Theme curtain applied');
});
$('#themePaint').addEventListener('click',()=>{
  const t=state.themes[state.activeTheme];
  state.layers.wallpaint.color=t.colors[0].hex;state.layers.wallpaint.opacity=.7;state.layers.wallpaint.enabled=true;
  renderAllControls();applyAllLayers();showToast('🎨 Theme paint applied');
});
$('#themeFloor').addEventListener('click',()=>{
  const t=state.themes[state.activeTheme];
  state.layers.floor.color=t.colors[4].hex;state.layers.floor.opacity=.9;state.layers.floor.enabled=true;state.layers.floor.mode='preset';
  renderAllControls();applyAllLayers();showToast('🎨 Theme floor applied');
});
$('#themeTiles').addEventListener('click',()=>{
  const t=state.themes[state.activeTheme];
  state.layers.walltiles.color=t.colors[1].hex;state.layers.walltiles.opacity=.9;state.layers.walltiles.enabled=true;state.layers.walltiles.mode='preset';
  renderAllControls();applyAllLayers();showToast('🎨 Theme tiles applied');
});

document.addEventListener('click',e=>{
  const el=e.target.closest('.btn,.tool-btn,.nav-btn,.bar-btn,.mini-btn,.theme-tab,.pattern-chip,.source-tab,.suggestion');
  if(!el)return;
  const rect=el.getBoundingClientRect();const size=Math.max(rect.width,rect.height);
  const r=document.createElement('span');r.className='ripple';
  r.style.width=r.style.height=size+'px';
  r.style.left=(e.clientX-rect.left-size/2)+'px';
  r.style.top=(e.clientY-rect.top-size/2)+'px';
  el.appendChild(r);setTimeout(()=>r.remove(),700);
});

window.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!els.studio.classList.contains('is-hidden'))resetApp();
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){
    if(!els.studio.classList.contains('is-hidden')){e.preventDefault();exportMockup();}
  }
});

/* ===== BOOT ===== */
bindLogo('splashLogo','splashFallback');
bindLogo('navLogo','navLogoFallback');
initSplash();

console.log('%c🍓 Helaberry · Interior Studio Pro', 'color:#a29bfe;font-weight:800;font-size:14px');
console.log('%c16 curtain styles · fabric upload · smart analysis', 'color:#6c85a0;font-size:11px');
console.log('%c⏱ Splash timing → HOLD ' + SPLASH_HOLD_MS + 'ms + FADE ' + SPLASH_FADE_MS + 'ms', 'color:#4ade80;font-size:11px');