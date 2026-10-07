/* ================================================================
   MANDALA STUDIO — full engine + per-layer animation
   Assets → /src/   |   Model → /model/
   ================================================================ */
(function(){
'use strict';

const SIZE = 1000, CX = 500, CY = 500, TAU = Math.PI * 2;
const MAX_HIST = 20;

/* ================================================================
   ★★★ SPLASH SCREEN TIMING — EDIT THESE TWO VALUES ★★★
   ----------------------------------------------------------------
   SPLASH_HOLD_MS : how long the logo stays fully visible  (550 ms)
   SPLASH_FADE_MS : how long the fade-out takes            (450 ms)
   Total on-screen time ≈ SPLASH_HOLD_MS + SPLASH_FADE_MS
   ================================================================ */
const SPLASH_HOLD_MS = 550;
const SPLASH_FADE_MS = 450;

const clamp = (v,a,b) => Math.min(b, Math.max(a, v));
const rad = d => d * Math.PI / 180;
const dist = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);

/* ---------- DOM ---------- */
const view = document.getElementById('viewCanvas');
const vctx = view.getContext('2d');
const guideCv = document.getElementById('guideCanvas');
const gctx = guideCv.getContext('2d');
const refCv = document.getElementById('refCanvas');
const rctx = refCv.getContext('2d');
const stage = document.getElementById('stage');
const viewport = document.getElementById('viewport');
const sbPos = document.getElementById('sbPos');
const sbSeg = document.getElementById('sbSeg');
const sbMirror = document.getElementById('sbMirror');
const sbLayer = document.getElementById('sbLayer');
const sbVec = document.getElementById('sbVec');
const sbTool = document.getElementById('sbTool');

/* offscreen */
const strokeCv = document.createElement('canvas');
strokeCv.width = strokeCv.height = SIZE;
const sctx = strokeCv.getContext('2d');
const refSource = document.createElement('canvas');
refSource.width = refSource.height = SIZE;
const refSrcCtx = refSource.getContext('2d');

/* ================================================================
   STATE
   ================================================================ */
const S = {
  segments: 12, mirror: true, rotation: 0, snap: false,
  symMode: 'dihedral', spiralFactor: 0.92,
  tool: 'brush', color: '#a29bfe', size: 6, opacity: 1, glow: 0,
  smooth: 0.35, style: 'solid', taper: true, rainbow: false,
  sides: 6, points: 5, inset: 0.45, petalW: 0.40,
  spacing: 18, dotSize: 6, sprayR: 60, sprayD: 24, fill: false,
  fontSize: 72, font: 'Inter, sans-serif', bold: false, italic: false,
  guides: true, axes: true, centerMark: true, polarGrid: false, golden: false,
  guideRings: 6, bg: '#0b1020', transparent: false, refOpacity: 0.35,
  ringR: 320, ringSize: 46, ringType: 'petal'
};

/* ================================================================
   ANIMATION STATE  (master timeline + per-layer tracks)
   ================================================================ */
const ANIM = {
  playing: false,
  loop: true,
  duration: 8000,
  speed: 1,
  time: 0,
  rafId: null,
  lastT: 0,
  recording: false,
  props: {
    rotation: { on: true,  amount: 360, dir: 1 },
    scale:    { on: false, amount: 0.08, freq: 1 },
    opacity:  { on: false, amount: 0.40, freq: 1 },
    glow:     { on: false, amount: 0.60, freq: 2 },
    hue:      { on: false, amount: 360 },
    flash:    { on: false, amount: 0.40, freq: 4 },
    wobble:   { on: false, amount: 10, freq: 3 }
  }
};

function defaultLayerAnim(){
  return { enabled: true, offset: 0, speed: 1, duration: 0, reverse: false };
}

function layerPhaseTime(l, globalT){
  const a = (l && l.anim) ? l.anim : null;
  if (!a || a.enabled === false) {
    return { t: 0, dur: ANIM.duration || 8000, frozen: true };
  }
  const dur = (a.duration > 0) ? a.duration : (ANIM.duration || 8000);
  let t = globalT * (a.speed == null ? 1 : a.speed) + (a.offset || 0);
  t = ((t % dur) + dur) % dur;
  if (a.reverse) t = dur - t;
  return { t, dur, frozen: false };
}

function computeAnimValues(t, dur){
  const D = dur || ANIM.duration || 8000;
  const p = (((t % D) + D) % D) / D;
  const phase = p * TAU;
  const P = ANIM.props;
  const out = { rotation: 0, scale: 1, opacity: 1, glow: 0, hue: 0, brightness: 1, wobX: 0, wobY: 0 };
  if (P.rotation.on) {
    if (P.rotation.dir === 0) out.rotation = Math.sin(phase) * P.rotation.amount * 0.5;
    else out.rotation = p * P.rotation.amount * P.rotation.dir;
  }
  if (P.scale.on) out.scale = 1 + Math.sin(phase * P.scale.freq) * P.scale.amount;
  if (P.opacity.on) {
    const s = 0.5 + 0.5 * Math.sin(phase * P.opacity.freq);
    out.opacity = 1 - P.opacity.amount * (1 - s);
  }
  if (P.glow.on) out.glow = P.glow.amount * (0.5 + 0.5 * Math.sin(phase * P.glow.freq));
  if (P.hue.on) out.hue = p * P.hue.amount;
  if (P.flash.on) {
    const s = Math.max(0, Math.sin(phase * P.flash.freq));
    out.brightness = 1 + P.flash.amount * s;
  }
  if (P.wobble.on) {
    const a = phase * P.wobble.freq;
    out.wobX = Math.cos(a) * P.wobble.amount;
    out.wobY = Math.sin(a) * P.wobble.amount;
  }
  return out;
}

function buildFilter(v){
  let f = '';
  if (v.hue) f += 'hue-rotate(' + v.hue.toFixed(2) + 'deg) ';
  if (v.brightness !== 1) f += 'brightness(' + v.brightness.toFixed(3) + ') ';
  if (v.glow > 0) {
    f += 'brightness(' + (1 + v.glow * 0.8).toFixed(3) + ') ';
    f += 'saturate(' + (1 + v.glow * 0.5).toFixed(3) + ') ';
    f += 'drop-shadow(0 0 ' + (v.glow * 22).toFixed(1) + 'px rgba(162,155,254,' +
         Math.min(0.95, 0.45 + v.glow * 0.4).toFixed(2) + ')) ';
  }
  return f.trim();
}

/* ================================================================
   VECTOR ELEMENTS
   ================================================================ */
let vectorElements = [];
function recordVector(el) {
  el.layerId = activeLayerId;
  vectorElements.push(el);
  updateVecCount();
}
function updateVecCount() { if (sbVec) sbVec.textContent = vectorElements.length; }

/* ================================================================
   LAYERS
   ================================================================ */
let layerSeq = 1;
const layers = [];
let activeLayerId = null;
const openTracks = {};

function makeLayer(name) {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  return {
    id: 'L' + (layerSeq++),
    name: name || ('Layer ' + layerSeq),
    canvas: c,
    ctx: c.getContext('2d'),
    opacity: 1, visible: true, blend: 'source-over', locked: false,
    anim: defaultLayerAnim()
  };
}
function getActiveLayer() { return layers.find(l => l.id === activeLayerId) || layers[layers.length - 1]; }
function addLayer(name, silent) {
  const l = makeLayer(name);
  layers.push(l);
  activeLayerId = l.id;
  if (!silent) renderLayerUI();
  return l;
}
function removeLayer(id) {
  if (layers.length <= 1) { toast('Cannot delete last layer', 'fa-triangle-exclamation'); return; }
  const i = layers.findIndex(l => l.id === id);
  if (i < 0) return;
  layers.splice(i, 1);
  vectorElements = vectorElements.filter(e => e.layerId !== id);
  delete openTracks[id];
  if (activeLayerId === id) activeLayerId = layers[Math.min(i, layers.length - 1)].id;
  renderLayerUI(); render(); updateVecCount();
}
function duplicateLayer() {
  const src = getActiveLayer();
  const l = makeLayer(src.name + ' copy');
  l.ctx.drawImage(src.canvas, 0, 0);
  l.opacity = src.opacity;
  l.blend = src.blend;
  l.anim = JSON.parse(JSON.stringify(src.anim));
  layers.push(l);
  vectorElements.filter(e => e.layerId === src.id).forEach(v => {
    const copy = JSON.parse(JSON.stringify(v));
    copy.layerId = l.id;
    vectorElements.push(copy);
  });
  activeLayerId = l.id;
  renderLayerUI(); render(); updateVecCount();
}
function moveLayer(dir) {
  const i = layers.findIndex(l => l.id === activeLayerId);
  const j = i + dir;
  if (j < 0 || j >= layers.length) return;
  [layers[i], layers[j]] = [layers[j], layers[i]];
  renderLayerUI(); render();
}

/* ================================================================
   HISTORY
   ================================================================ */
let history = [], hIndex = -1;
function snapshot() {
  return {
    layers: layers.map(l => ({
      id: l.id, name: l.name,
      data: l.ctx.getImageData(0, 0, SIZE, SIZE),
      opacity: l.opacity, visible: l.visible, blend: l.blend, locked: l.locked,
      anim: JSON.parse(JSON.stringify(l.anim || defaultLayerAnim()))
    })),
    vectors: JSON.parse(JSON.stringify(vectorElements)),
    active: activeLayerId,
    anim: JSON.parse(JSON.stringify(ANIM.props)),
    animDur: ANIM.duration
  };
}
function pushHistory() {
  history = history.slice(0, hIndex + 1);
  history.push(snapshot());
  if (history.length > MAX_HIST) history.shift();
  hIndex = history.length - 1;
  updateHistoryUI();
}
function restoreSnapshot(entry) {
  const nextLayers = [];
  entry.layers.forEach(sn => {
    let l = layers.find(x => x.id === sn.id);
    if (!l) l = makeLayer(sn.name);
    l.name = sn.name;
    l.opacity = sn.opacity; l.visible = sn.visible;
    l.blend = sn.blend; l.locked = sn.locked;
    l.anim = sn.anim ? JSON.parse(JSON.stringify(sn.anim)) : defaultLayerAnim();
    l.ctx.putImageData(sn.data, 0, 0);
    nextLayers.push(l);
  });
  layers.length = 0;
  nextLayers.forEach(l => layers.push(l));
  vectorElements = entry.vectors || [];
  activeLayerId = entry.active;
  if (entry.anim) Object.assign(ANIM.props, entry.anim);
  if (entry.animDur) ANIM.duration = entry.animDur;
  updateVecCount();
}
function undo() {
  if (hIndex <= 0) { toast('Nothing to undo', 'fa-circle-info'); return; }
  hIndex--;
  restoreSnapshot(history[hIndex]);
  renderLayerUI(); render(); syncAnimUI(); updateHistoryUI();
}
function redo() {
  if (hIndex >= history.length - 1) { toast('Nothing to redo', 'fa-circle-info'); return; }
  hIndex++;
  restoreSnapshot(history[hIndex]);
  renderLayerUI(); render(); syncAnimUI(); updateHistoryUI();
}
function updateHistoryUI() {
  document.getElementById('btnUndo').disabled = hIndex <= 0;
  document.getElementById('btnRedo').disabled = hIndex >= history.length - 1;
}

/* ================================================================
   SYMMETRY ENGINE
   ================================================================ */
function symmetryDraw(ctx, img, b) {
  const mode = S.symMode;
  if (mode === 'none') {
    ctx.drawImage(img, b.x, b.y, b.w, b.h, b.x, b.y, b.w, b.h);
    return;
  }
  const n = Math.max(1, S.segments | 0);
  const step = TAU / n;
  const off = rad(S.rotation);
  const x = b.x, y = b.y, w = b.w, h = b.h;
  const drawOne = (a, sc, dy) => {
    ctx.save();
    ctx.translate(CX, CY + (dy || 0));
    ctx.rotate(a);
    if (sc && sc !== 1) ctx.scale(sc, sc);
    ctx.translate(-CX, -CY);
    ctx.drawImage(img, x, y, w, h, x, y, w, h);
    ctx.restore();
  };
  const drawMirror = (a, sc, dy) => {
    ctx.save();
    ctx.translate(CX, CY + (dy || 0));
    ctx.rotate(a);
    if (sc && sc !== 1) ctx.scale(sc, sc);
    ctx.scale(1, -1);
    ctx.translate(-CX, -CY);
    ctx.drawImage(img, x, y, w, h, x, y, w, h);
    ctx.restore();
  };
  for (let i = 0; i < n; i++) {
    const a = off + i * step;
    if (mode === 'radial') drawOne(a, 1);
    else if (mode === 'dihedral') { drawOne(a, 1); drawMirror(a, 1); }
    else if (mode === 'spiral') { const sc = Math.pow(S.spiralFactor, i); drawOne(a, sc); if (S.mirror) drawMirror(a, sc); }
    else if (mode === 'kaleido') { drawOne(a, 1); drawMirror(a, 1); drawMirror(a + step/2, 1); }
    else if (mode === 'wave') { const dy = Math.sin(i*0.8)*0.06*CY; drawOne(a, 1, dy); if (S.mirror) drawMirror(a, 1, dy); }
  }
}

/* ================================================================
   BOUNDS
   ================================================================ */
let bounds = {x:0,y:0,w:0,h:0,empty:true};
function resetBounds(){ bounds = {x:0,y:0,w:0,h:0,empty:true}; }
function markBounds(x,y,pad){
  pad = pad||0;
  if (bounds.empty){ bounds.x=x-pad; bounds.y=y-pad; bounds.w=pad*2; bounds.h=pad*2; bounds.empty=false; }
  else {
    const mnX = Math.min(bounds.x, x-pad), mnY = Math.min(bounds.y, y-pad);
    const mxX = Math.max(bounds.x+bounds.w, x+pad), mxY = Math.max(bounds.y+bounds.h, y+pad);
    bounds.x=mnX; bounds.y=mnY; bounds.w=mxX-mnX; bounds.h=mxY-mnY;
  }
}
function fullBounds(){
  if (bounds.empty) return {x:0,y:0,w:SIZE,h:SIZE};
  const pad = 8;
  const x = clamp(Math.floor(bounds.x-pad), 0, SIZE);
  const y = clamp(Math.floor(bounds.y-pad), 0, SIZE);
  const w = clamp(Math.ceil(bounds.w+pad*2), 1, SIZE-x);
  const h = clamp(Math.ceil(bounds.h+pad*2), 1, SIZE-y);
  return {x,y,w,h};
}

/* ================================================================
   RENDER
   ================================================================ */
function render() {
  const gT = ANIM.time;

  vctx.setTransform(1,0,0,1,0,0);
  vctx.globalAlpha = 1;
  vctx.globalCompositeOperation = 'source-over';
  vctx.filter = 'none';
  vctx.clearRect(0,0,SIZE,SIZE);

  for (const l of layers) {
    if (!l.visible || l.opacity <= 0) continue;

    const lp = layerPhaseTime(l, gT);
    const v = computeAnimValues(lp.t, lp.dur);
    const layerAlpha = v.opacity * l.opacity;

    vctx.save();
    vctx.globalAlpha = layerAlpha;
    vctx.globalCompositeOperation = l.blend;

    const f = buildFilter(v);
    if (f) vctx.filter = f;

    vctx.translate(CX + v.wobX, CY + v.wobY);
    if (v.rotation) vctx.rotate(rad(v.rotation));
    if (v.scale !== 1) vctx.scale(v.scale, v.scale);
    vctx.translate(-CX, -CY);

    vctx.drawImage(l.canvas, 0, 0);

    /* live stroke preview — never punches through lower layers */
    if (drawing && l.id === activeLayerId) {
      const b = fullBounds();
      const erasing = (S.tool === 'eraser');
      vctx.filter = 'none';
      vctx.globalCompositeOperation = 'source-over';
      vctx.globalAlpha = layerAlpha * (erasing ? 0.30 : S.opacity);
      symmetryDraw(vctx, strokeCv, b);
      vctx.globalAlpha = layerAlpha;
    }

    vctx.restore();
  }

  vctx.setTransform(1,0,0,1,0,0);
  vctx.filter = 'none';
  vctx.globalAlpha = 1;
  vctx.globalCompositeOperation = 'source-over';
}

/* ================================================================
   GUIDES
   ================================================================ */
function drawGuides() {
  gctx.setTransform(1,0,0,1,0,0);
  gctx.clearRect(0,0,SIZE,SIZE);
  if (!S.guides) return;
  gctx.lineWidth = 1.4;
  gctx.strokeStyle = 'rgba(162,155,254,0.16)';
  if (S.guideRings > 0) {
    const maxR = SIZE/2 - 8;
    for (let i = 1; i <= S.guideRings; i++) {
      gctx.beginPath();
      gctx.arc(CX, CY, (maxR*i)/S.guideRings, 0, TAU);
      gctx.stroke();
    }
  }
  if (S.polarGrid) {
    const maxR = SIZE/2, rings = 12;
    const spokes = Math.max(S.segments, 12);
    gctx.strokeStyle = 'rgba(162,155,254,0.08)';
    for (let i = 1; i <= rings; i++) {
      gctx.beginPath(); gctx.arc(CX, CY, (maxR*i)/rings, 0, TAU); gctx.stroke();
    }
    gctx.strokeStyle = 'rgba(162,155,254,0.07)';
    for (let i = 0; i < spokes; i++) {
      const a = (i*TAU)/spokes;
      gctx.beginPath(); gctx.moveTo(CX, CY);
      gctx.lineTo(CX + Math.cos(a)*maxR, CY + Math.sin(a)*maxR); gctx.stroke();
    }
  }
  if (S.axes) {
    const n = Math.max(1, S.segments|0);
    const step = TAU / n;
    const off = rad(S.rotation);
    const total = S.mirror ? n*2 : n;
    const sub = S.mirror ? step/2 : step;
    gctx.strokeStyle = 'rgba(124,108,240,0.22)';
    for (let i = 0; i < total; i++) {
      const a = off + i*sub;
      gctx.beginPath(); gctx.moveTo(CX, CY);
      gctx.lineTo(CX + Math.cos(a)*SIZE, CY + Math.sin(a)*SIZE); gctx.stroke();
    }
  }
  if (S.golden) {
    const phi = (1+Math.sqrt(5))/2;
    let r = 6, a = 0;
    gctx.strokeStyle = 'rgba(253,203,110,0.28)';
    gctx.lineWidth = 1.3; gctx.beginPath();
    for (let i = 0; i < 900; i++) {
      a += 0.05;
      r = 6*Math.pow(phi, a/(Math.PI/2));
      const x = CX + Math.cos(a)*r, y = CY + Math.sin(a)*r;
      if (r > 500) break;
      i ? gctx.lineTo(x,y) : gctx.moveTo(x,y);
    }
    gctx.stroke();
    gctx.strokeStyle = 'rgba(253,203,110,0.14)';
    let fr = 500;
    for (let i = 0; i < 7; i++) {
      gctx.beginPath(); gctx.arc(CX, CY, fr, 0, TAU); gctx.stroke();
      fr /= phi;
    }
  }
  if (S.centerMark) {
    gctx.strokeStyle = 'rgba(162,155,254,0.55)';
    gctx.lineWidth = 1.6;
    gctx.beginPath(); gctx.arc(CX, CY, 7, 0, TAU); gctx.stroke();
    gctx.beginPath();
    gctx.moveTo(CX-14, CY); gctx.lineTo(CX+14, CY);
    gctx.moveTo(CX, CY-14); gctx.lineTo(CX, CY+14); gctx.stroke();
  }
}

/* ================================================================
   POINTER COORDS
   ================================================================ */
function getPos(e) {
  const r = view.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (SIZE / r.width),
    y: (e.clientY - r.top) * (SIZE / r.height),
    pressure: (e.pressure && e.pressure > 0) ? e.pressure : 0.5
  };
}
function snapPoint(p) {
  if (!S.snap) return p;
  const dx = p.x - CX, dy = p.y - CY;
  const r = Math.hypot(dx, dy);
  if (r < 2) return p;
  let a = Math.atan2(dy, dx);
  const n = Math.max(1, S.segments|0);
  const step = (TAU/n) / (S.mirror ? 2 : 1);
  const off = rad(S.rotation);
  const k = Math.round((a - off)/step);
  a = off + k*step;
  return { x: CX + Math.cos(a)*r, y: CY + Math.sin(a)*r, pressure: p.pressure };
}

/* ================================================================
   BRUSH HELPERS
   ================================================================ */
function currentColor(p) {
  if (!S.rainbow) return S.color;
  const a = Math.atan2(p.y - CY, p.x - CX);
  const hue = ((a*180/Math.PI) + 360) % 360;
  return 'hsl(' + hue.toFixed(0) + ', 78%, 68%)';
}
function prepStroke() {
  sctx.setTransform(1,0,0,1,0,0);
  sctx.globalCompositeOperation = 'source-over';
  sctx.globalAlpha = S.opacity;
  sctx.lineCap = 'round';
  sctx.lineJoin = 'round';
  sctx.shadowBlur = 0;
  sctx.setLineDash([]);
}
function brushWidth(p) {
  if (!S.taper) return S.size;
  const pr = clamp(p.pressure, 0.05, 1);
  return Math.max(0.6, S.size * (0.35 + 0.65*pr));
}
function applyStyle(p) {
  const col = currentColor(p);
  sctx.strokeStyle = col;
  sctx.fillStyle = col;
  sctx.lineWidth = brushWidth(p);
  sctx.shadowBlur = (S.tool === 'eraser') ? 0 : S.glow;
  sctx.shadowColor = col;
  if (S.style === 'dashed') sctx.setLineDash([S.size*2.2, S.size*1.6]);
  else if (S.style === 'dotted') sctx.setLineDash([0.1, S.size*2.4]);
  else sctx.setLineDash([]);
}
function paintDot(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.4, r), 0, TAU);
  ctx.fill();
}
function strokeSegment(a, b) {
  applyStyle(b);
  sctx.beginPath();
  sctx.moveTo(a.x, a.y);
  sctx.lineTo(b.x, b.y);
  sctx.stroke();
  if (S.style === 'soft' || S.glow > 0) {
    sctx.globalAlpha = S.opacity * 0.4;
    sctx.lineWidth = brushWidth(b) * 1.9;
    sctx.beginPath();
    sctx.moveTo(a.x, a.y);
    sctx.lineTo(b.x, b.y);
    sctx.stroke();
    sctx.globalAlpha = S.opacity;
  }
  if (S.style === 'calligraphy') {
    const ang = Math.atan2(b.y-a.y, b.x-a.x) + Math.PI/4;
    const off = brushWidth(b) * 0.6;
    sctx.globalAlpha = S.opacity * 0.65;
    sctx.beginPath();
    sctx.moveTo(a.x + Math.cos(ang)*off, a.y + Math.sin(ang)*off);
    sctx.lineTo(b.x + Math.cos(ang)*off, b.y + Math.sin(ang)*off);
    sctx.stroke();
    sctx.globalAlpha = S.opacity;
  }
  markBounds(a.x, a.y, S.size*2 + S.glow);
  markBounds(b.x, b.y, S.size*2 + S.glow);
}
function stampDot(p) {
  applyStyle(p);
  paintDot(sctx, p.x, p.y, S.dotSize/2);
  markBounds(p.x, p.y, S.dotSize + S.glow);
}
function sprayAt(p) {
  applyStyle(p);
  for (let i = 0; i < S.sprayD; i++) {
    const a = Math.random()*TAU;
    const rr = Math.sqrt(Math.random()) * S.sprayR;
    const x = p.x + Math.cos(a)*rr;
    const y = p.y + Math.sin(a)*rr;
    paintDot(sctx, x, y, Math.max(0.4, (S.size/2)*Math.random()));
  }
  markBounds(p.x, p.y, S.sprayR + S.size + S.glow);
}

/* ================================================================
   SHAPES
   ================================================================ */
function drawShape(a, b) {
  sctx.clearRect(0,0,SIZE,SIZE);
  resetBounds();
  applyStyle(b);
  const r = Math.hypot(b.x-CX, b.y-CY);
  const ang = Math.atan2(b.y-CY, b.x-CX);
  switch (S.tool) {
    case 'line':
      sctx.beginPath(); sctx.moveTo(a.x, a.y); sctx.lineTo(b.x, b.y); sctx.stroke();
      markBounds(a.x, a.y, S.size*2); markBounds(b.x, b.y, S.size*2);
      break;
    case 'arc': {
      const rA = Math.hypot(a.x-CX, a.y-CY);
      const aA = Math.atan2(a.y-CY, a.x-CX);
      const radius = Math.max(rA, r);
      let diff = ang - aA;
      while (diff > Math.PI) diff -= TAU;
      while (diff < -Math.PI) diff += TAU;
      sctx.beginPath(); sctx.arc(CX, CY, radius, aA, aA + diff, diff < 0); sctx.stroke();
      markBounds(CX+radius, CY, radius + S.size*2);
      markBounds(CX-radius, CY, radius + S.size*2);
      markBounds(CX, CY+radius, radius + S.size*2);
      markBounds(CX, CY-radius, radius + S.size*2);
      break;
    }
    case 'circle':
      sctx.beginPath(); sctx.arc(CX, CY, r, 0, TAU);
      if (S.fill){ sctx.globalAlpha = S.opacity*0.35; sctx.fill(); sctx.globalAlpha = S.opacity; }
      sctx.stroke();
      markBounds(CX+r, CY, r + S.size*2); markBounds(CX-r, CY, r + S.size*2);
      markBounds(CX, CY+r, r + S.size*2); markBounds(CX, CY-r, r + S.size*2);
      break;
    case 'polygon': {
      const n = Math.max(3, S.sides|0);
      sctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const t = ang + (i*TAU)/n;
        const x = CX + Math.cos(t)*r, y = CY + Math.sin(t)*r;
        i ? sctx.lineTo(x, y) : sctx.moveTo(x, y);
      }
      sctx.closePath();
      if (S.fill){ sctx.globalAlpha = S.opacity*0.35; sctx.fill(); sctx.globalAlpha = S.opacity; }
      sctx.stroke();
      markBounds(CX+r, CY, r + S.size*2); markBounds(CX-r, CY, r + S.size*2);
      markBounds(CX, CY+r, r + S.size*2); markBounds(CX, CY-r, r + S.size*2);
      break;
    }
    case 'star': {
      const n = Math.max(3, S.points|0);
      const inner = r * S.inset;
      sctx.beginPath();
      for (let i = 0; i < n*2; i++) {
        const t = ang + (i*Math.PI)/n;
        const rr = (i%2===0) ? r : inner;
        const x = CX + Math.cos(t)*rr, y = CY + Math.sin(t)*rr;
        i ? sctx.lineTo(x,y) : sctx.moveTo(x,y);
      }
      sctx.closePath();
      if (S.fill){ sctx.globalAlpha = S.opacity*0.35; sctx.fill(); sctx.globalAlpha = S.opacity; }
      sctx.stroke();
      markBounds(CX+r, CY, r + S.size*2); markBounds(CX-r, CY, r + S.size*2);
      markBounds(CX, CY+r, r + S.size*2); markBounds(CX, CY-r, r + S.size*2);
      break;
    }
    case 'petal': {
      const tipX = CX + Math.cos(ang)*r, tipY = CY + Math.sin(ang)*r;
      const perp = ang + Math.PI/2;
      const cw = r * S.petalW;
      const c1x = CX + Math.cos(perp)*cw, c1y = CY + Math.sin(perp)*cw;
      const c2x = CX - Math.cos(perp)*cw, c2y = CY - Math.sin(perp)*cw;
      sctx.beginPath();
      sctx.moveTo(CX, CY);
      sctx.quadraticCurveTo(c1x, c1y, tipX, tipY);
      sctx.quadraticCurveTo(c2x, c2y, CX, CY);
      sctx.closePath();
      if (S.fill){ sctx.globalAlpha = S.opacity*0.35; sctx.fill(); sctx.globalAlpha = S.opacity; }
      sctx.stroke();
      markBounds(CX, CY, r + S.size*2); markBounds(tipX, tipY, S.size*2);
      break;
    }
    case 'gradient': {
      const grd = sctx.createRadialGradient(CX, CY, 0, CX, CY, r);
      grd.addColorStop(0, S.color);
      grd.addColorStop(1, hexToRgba(S.color, 0));
      sctx.fillStyle = grd;
      sctx.beginPath(); sctx.arc(CX, CY, r, 0, TAU); sctx.fill();
      markBounds(CX+r, CY, r); markBounds(CX-r, CY, r);
      markBounds(CX, CY+r, r); markBounds(CX, CY-r, r);
      break;
    }
  }
}
function hexToRgba(hex, a) {
  const h = hex.replace('#','');
  const n = parseInt(h.length===3 ? h.split('').map(x=>x+x).join('') : h, 16);
  return 'rgba(' + ((n>>16)&255) + ',' + ((n>>8)&255) + ',' + (n&255) + ',' + a + ')';
}

/* ================================================================
   DRAWING EVENTS
   ================================================================ */
let drawing = false;
let startP = null, lastP = null, lastStamp = null;
let currentStrokePoints = [];
let currentStrokeColor = null;
let sprayDots = [];

function onDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (S.tool === 'move') return;
  e.preventDefault();
  try { view.setPointerCapture(e.pointerId); } catch(err){}
  const p = getPos(e);
  startP = p; lastP = p; lastStamp = p;
  const layer = getActiveLayer();
  if (!layer || layer.locked) { toast('Layer is locked', 'fa-lock'); return; }
  if (S.tool === 'picker') { pickColor(p); return; }
  drawing = true;
  resetBounds();
  prepStroke();
  currentStrokePoints = [p];
  currentStrokeColor = currentColor(p);
  sprayDots = [];

  switch (S.tool) {
    case 'brush':
    case 'eraser':
      applyStyle(p);
      paintDot(sctx, p.x, p.y, brushWidth(p)/2);
      markBounds(p.x, p.y, S.size*2 + S.glow);
      break;
    case 'dot': stampDot(p); break;
    case 'spray': sprayAt(p); break;
    case 'fill':
      floodFill(layer, Math.floor(p.x), Math.floor(p.y));
      drawing = false;
      pushHistory();
      render();
      return;
    case 'text':
      promptText(p);
      drawing = false;
      return;
    default: drawShape(p, p);
  }
  render();
}
function onMove(e) {
  const raw = getPos(e);
  if (sbPos) sbPos.textContent = Math.round(raw.x) + ', ' + Math.round(raw.y);
  if (!drawing) return;
  e.preventDefault();
  const free = ['brush','eraser','dot','spray'].indexOf(S.tool) >= 0;
  const p = free ? raw : snapPoint(raw);
  switch (S.tool) {
    case 'brush':
    case 'eraser': {
      const sm = S.smooth;
      const mix = {
        x: lastP.x + (p.x - lastP.x) * (1 - sm),
        y: lastP.y + (p.y - lastP.y) * (1 - sm),
        pressure: p.pressure
      };
      strokeSegment(lastP, mix);
      currentStrokePoints.push(mix);
      lastP = mix;
      break;
    }
    case 'dot':
      if (dist(lastStamp, p) >= S.spacing) {
        stampDot(p);
        currentStrokePoints.push(p);
        lastStamp = p;
      }
      break;
    case 'spray':
      sprayAt(p);
      sprayDots.push({ x: p.x, y: p.y, color: currentColor(p) });
      break;
    default:
      drawShape(startP, p);
  }
  render();
}
function onUp(e) {
  if (!drawing) return;
  drawing = false;
  try { view.releasePointerCapture(e.pointerId); } catch(err){}
  const b = fullBounds();
  const layer = getActiveLayer();
  const lctx = layer.ctx;
  lctx.save();
  lctx.globalCompositeOperation = (S.tool === 'eraser') ? 'destination-out' : 'source-over';
  symmetryDraw(lctx, strokeCv, b);
  lctx.restore();

  recordVectorForTool();

  sctx.clearRect(0,0,SIZE,SIZE);
  pushHistory();
  render();
  renderLayerUI();
}

function recordVectorForTool() {
  const sym = { mode: S.symMode, segments: S.segments, mirror: S.mirror, rotation: S.rotation, spiral: S.spiralFactor };
  const base = { sym, color: currentStrokeColor || S.color, width: S.size, opacity: S.opacity, glow: S.glow, style: S.style };

  if (S.tool === 'brush' || S.tool === 'eraser') {
    if (currentStrokePoints.length < 2) return;
    if (S.tool === 'eraser') recordVector(Object.assign({}, base, { type: 'erase', points: currentStrokePoints.slice() }));
    else recordVector(Object.assign({}, base, { type: 'path', points: currentStrokePoints.slice(), fill: false }));
  } else if (S.tool === 'line') {
    recordVector(Object.assign({}, base, { type: 'line', x1: startP.x, y1: startP.y, x2: lastP.x, y2: lastP.y }));
  } else if (S.tool === 'arc') {
    const rA = Math.hypot(startP.x-CX, startP.y-CY);
    const aA = Math.atan2(startP.y-CY, startP.x-CX);
    const radius = Math.max(rA, Math.hypot(lastP.x-CX, lastP.y-CY));
    const aB = Math.atan2(lastP.y-CY, lastP.x-CX);
    let diff = aB - aA;
    while (diff > Math.PI) diff -= TAU;
    while (diff < -Math.PI) diff += TAU;
    recordVector(Object.assign({}, base, { type: 'arc', cx: CX, cy: CY, r: radius, a1: aA, a2: aA + diff }));
  } else if (S.tool === 'circle') {
    const r = Math.hypot(lastP.x-CX, lastP.y-CY);
    recordVector(Object.assign({}, base, { type: 'circle', cx: CX, cy: CY, r, fill: S.fill }));
  } else if (S.tool === 'polygon') {
    const r = Math.hypot(lastP.x-CX, lastP.y-CY);
    const ang = Math.atan2(lastP.y-CY, lastP.x-CX);
    recordVector(Object.assign({}, base, { type: 'polygon', cx: CX, cy: CY, r, n: S.sides, rotation: ang, fill: S.fill }));
  } else if (S.tool === 'star') {
    const r = Math.hypot(lastP.x-CX, lastP.y-CY);
    const ang = Math.atan2(lastP.y-CY, lastP.x-CX);
    recordVector(Object.assign({}, base, { type: 'star', cx: CX, cy: CY, r, n: S.points, inset: S.inset, rotation: ang, fill: S.fill }));
  } else if (S.tool === 'petal') {
    const r = Math.hypot(lastP.x-CX, lastP.y-CY);
    const ang = Math.atan2(lastP.y-CY, lastP.x-CX);
    recordVector(Object.assign({}, base, { type: 'petal', cx: CX, cy: CY, r, ang, cw: r * S.petalW, fill: S.fill }));
  } else if (S.tool === 'dot') {
    currentStrokePoints.forEach(p => {
      recordVector(Object.assign({}, base, { type: 'dot', cx: p.x, cy: p.y, r: S.dotSize/2 }));
    });
  } else if (S.tool === 'spray') {
    sprayDots.forEach(sd => {
      recordVector(Object.assign({}, base, { type: 'dot', cx: sd.x, cy: sd.y, r: S.size * 0.3, color: sd.color }));
    });
  } else if (S.tool === 'gradient') {
    const r = Math.hypot(lastP.x-CX, lastP.y-CY);
    recordVector(Object.assign({}, base, { type: 'radial-gradient', cx: CX, cy: CY, r }));
  }
}

view.addEventListener('pointerdown', onDown);
view.addEventListener('pointermove', onMove);
view.addEventListener('pointerup', onUp);
view.addEventListener('pointercancel', onUp);
view.addEventListener('pointerleave', e => { if (drawing) onUp(e); });

/* ================================================================
   PAN (Move tool / middle-drag)
   ================================================================ */
let panning = false, panStartX = 0, panStartY = 0, panSL = 0, panST = 0;

viewport.addEventListener('pointerdown', e => {
  const middle = (e.button === 1);
  if (S.tool !== 'move' && !middle) return;
  panning = true;
  panStartX = e.clientX; panStartY = e.clientY;
  panSL = viewport.scrollLeft; panST = viewport.scrollTop;
  try { viewport.setPointerCapture(e.pointerId); } catch(err){}
  viewport.classList.add('panning');
  e.preventDefault();
});
viewport.addEventListener('pointermove', e => {
  if (!panning) return;
  viewport.scrollLeft = panSL - (e.clientX - panStartX);
  viewport.scrollTop  = panST - (e.clientY - panStartY);
  e.preventDefault();
});
['pointerup','pointercancel','pointerleave'].forEach(ev => {
  viewport.addEventListener(ev, () => {
    if (!panning) return;
    panning = false;
    viewport.classList.remove('panning');
  });
});
viewport.addEventListener('auxclick', e => { if (e.button === 1) e.preventDefault(); });

/* ================================================================
   FLOOD FILL
   ================================================================ */
function floodFill(layer, x, y) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const ctx = layer.ctx;
  const img = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = img.data;
  const idx = (y*SIZE + x) * 4;
  const tR = d[idx], tG = d[idx+1], tB = d[idx+2], tA = d[idx+3];
  const fillRGB = hexToRgb(S.color);
  const fR = fillRGB[0], fG = fillRGB[1], fB = fillRGB[2];
  const tol = 32;
  const stack = [[x, y]];
  const visited = new Uint8Array(SIZE*SIZE);
  while (stack.length) {
    const [cx0, cy0] = stack.pop();
    const i = cy0*SIZE + cx0;
    if (visited[i]) continue;
    visited[i] = 1;
    const di = i*4;
    if (Math.abs(d[di]-tR) > tol || Math.abs(d[di+1]-tG) > tol ||
        Math.abs(d[di+2]-tB) > tol || Math.abs(d[di+3]-tA) > tol) continue;
    d[di] = fR; d[di+1] = fG; d[di+2] = fB; d[di+3] = 255;
    if (cx0 > 0) stack.push([cx0-1, cy0]);
    if (cx0 < SIZE-1) stack.push([cx0+1, cy0]);
    if (cy0 > 0) stack.push([cx0, cy0-1]);
    if (cy0 < SIZE-1) stack.push([cx0, cy0+1]);
  }
  ctx.putImageData(img, 0, 0);
  toast('Filled region', 'fa-fill-drip');
}
function hexToRgb(hex) {
  const h = hex.replace('#','');
  const n = parseInt(h.length===3 ? h.split('').map(x=>x+x).join('') : h, 16);
  return [(n>>16)&255, (n>>8)&255, n&255];
}

/* ================================================================
   PICKER
   ================================================================ */
function pickColor(p) {
  const layer = getActiveLayer();
  const img = layer.ctx.getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data;
  if (img[3] === 0) { toast('Transparent pixel', 'fa-eye-dropper'); return; }
  const hex = rgbToHex(img[0], img[1], img[2]);
  setColor(hex);
  toast('Picked ' + hex, 'fa-eye-dropper');
}
function rgbToHex(r, g, b) {
  return '#' + [r,g,b].map(v => v.toString(16).padStart(2, '0')).join('');
}

/* ================================================================
   TEXT
   ================================================================ */
function promptText(p) {
  const text = window.prompt('Enter text:', 'Mandala');
  if (!text) return;
  const layer = getActiveLayer();
  const ctx = layer.ctx;
  const tmp = document.createElement('canvas');
  tmp.width = tmp.height = SIZE;
  const tctx = tmp.getContext('2d');
  tctx.font = (S.italic?'italic ':'') + (S.bold?'700 ':'500 ') + S.fontSize + 'px ' + S.font;
  tctx.fillStyle = S.color;
  tctx.shadowBlur = S.glow;
  tctx.shadowColor = S.color;
  tctx.textAlign = 'center';
  tctx.textBaseline = 'middle';
  tctx.fillText(text, p.x, p.y);
  ctx.save();
  symmetryDraw(ctx, tmp, { x:0, y:0, w:SIZE, h:SIZE });
  ctx.restore();
  recordVector({
    type: 'text', text, x: p.x, y: p.y,
    fontSize: S.fontSize, fontFamily: S.font, bold: S.bold, italic: S.italic,
    color: S.color, width: S.size, opacity: S.opacity, glow: S.glow, style: 'solid', fill: true,
    sym: { mode: S.symMode, segments: S.segments, mirror: S.mirror, rotation: S.rotation, spiral: S.spiralFactor }
  });
  pushHistory(); render(); renderLayerUI();
  toast('Text added', 'fa-font');
}

/* ================================================================
   RING GENERATOR
   ================================================================ */
function buildRingToCanvas(ctx, type, r, sz, ang, color) {
  const x = CX + Math.cos(ang)*r;
  const y = CY + Math.sin(ang)*r;
  ctx.lineWidth = Math.max(1.2, S.size);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  switch (type) {
    case 'dot': paintDot(ctx, x, y, sz/2); markBounds(x, y, sz + S.glow + S.size); break;
    case 'petal': {
      const perp = ang + Math.PI/2;
      const cw = sz * 0.55;
      const c1x = x + Math.cos(perp)*cw, c1y = y + Math.sin(perp)*cw;
      const c2x = x - Math.cos(perp)*cw, c2y = y - Math.sin(perp)*cw;
      const tipX = CX + Math.cos(ang)*(r + sz*0.9), tipY = CY + Math.sin(ang)*(r + sz*0.9);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(c1x, c1y, tipX, tipY);
      ctx.quadraticCurveTo(c2x, c2y, x, y);
      ctx.closePath();
      if (S.fill){ ctx.globalAlpha = S.opacity*0.35; ctx.fill(); ctx.globalAlpha = S.opacity; }
      ctx.stroke();
      markBounds(tipX, tipY, sz + S.glow + S.size);
      markBounds(x, y, sz + S.glow + S.size);
      break;
    }
    case 'triangle':
    case 'diamond': {
      const n = (type === 'triangle') ? 3 : 4;
      const start = ang - Math.PI/2;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const t = start + (i*TAU)/n;
        const px = x + Math.cos(t)*(sz/2), py = y + Math.sin(t)*(sz/2);
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      if (S.fill){ ctx.globalAlpha = S.opacity*0.35; ctx.fill(); ctx.globalAlpha = S.opacity; }
      ctx.stroke();
      markBounds(x, y, sz + S.glow + S.size);
      break;
    }
    case 'scallop': {
      const rr = sz/2;
      ctx.beginPath();
      ctx.arc(x, y - rr*0.2, rr, Math.PI*0.15, Math.PI*0.85);
      ctx.stroke();
      markBounds(x, y, sz + S.glow + S.size);
      break;
    }
    case 'spoke': {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(CX + Math.cos(ang)*(r + sz), CY + Math.sin(ang)*(r + sz));
      ctx.stroke();
      markBounds(x, y, sz + S.glow + S.size);
      markBounds(CX + Math.cos(ang)*(r + sz), CY + Math.sin(ang)*(r + sz), S.size*2);
      break;
    }
    case 'teardrop': {
      const perp = ang + Math.PI/2;
      const cw = sz * 0.42;
      const tipX = CX + Math.cos(ang)*(r + sz*0.8), tipY = CY + Math.sin(ang)*(r + sz*0.8);
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(perp)*cw, y - Math.sin(perp)*cw);
      ctx.quadraticCurveTo(x + Math.cos(perp)*cw*1.4, y + Math.sin(perp)*cw*1.4, tipX, tipY);
      ctx.quadraticCurveTo(x - Math.cos(perp)*cw*1.4, y - Math.sin(perp)*cw*1.4,
                           x - Math.cos(perp)*cw, y - Math.sin(perp)*cw);
      ctx.closePath();
      if (S.fill){ ctx.globalAlpha = S.opacity*0.35; ctx.fill(); ctx.globalAlpha = S.opacity; }
      ctx.stroke();
      markBounds(x, y, sz + S.glow + S.size);
      markBounds(tipX, tipY, S.size*2 + S.glow);
      break;
    }
    case 'lens': {
      const perp = ang + Math.PI/2;
      const cw = sz * 0.65;
      const tipX = CX + Math.cos(ang)*(r + sz), tipY = CY + Math.sin(ang)*(r + sz);
      const baseX = CX + Math.cos(ang)*(r - sz), baseY = CY + Math.sin(ang)*(r - sz);
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(x + Math.cos(perp)*cw, y + Math.sin(perp)*cw, tipX, tipY);
      ctx.quadraticCurveTo(x - Math.cos(perp)*cw, y - Math.sin(perp)*cw, baseX, baseY);
      ctx.closePath();
      if (S.fill){ ctx.globalAlpha = S.opacity*0.35; ctx.fill(); ctx.globalAlpha = S.opacity; }
      ctx.stroke();
      markBounds(x, y, sz*1.6 + S.glow + S.size);
      break;
    }
    case 'sunburst': {
      const perp = ang + Math.PI/2;
      const cw = sz * 0.25;
      const tipX = CX + Math.cos(ang)*(r + sz*1.3), tipY = CY + Math.sin(ang)*(r + sz*1.3);
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(perp)*cw, y - Math.sin(perp)*cw);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(x + Math.cos(perp)*cw, y + Math.sin(perp)*cw);
      ctx.stroke();
      markBounds(tipX, tipY, sz + S.glow + S.size);
      break;
    }
  }
}

function generateRing(silent) {
  sctx.clearRect(0,0,SIZE,SIZE);
  resetBounds();
  prepStroke();
  const r = S.ringR, sz = S.ringSize, ang = rad(S.rotation);
  const color = S.color;
  applyStyle({ x: CX + Math.cos(ang)*r, y: CY + Math.sin(ang)*r, pressure: 1 });
  buildRingToCanvas(sctx, S.ringType, r, sz, ang, color);
  const b = fullBounds();
  const layer = getActiveLayer();
  layer.ctx.save();
  layer.ctx.globalCompositeOperation = 'source-over';
  symmetryDraw(layer.ctx, strokeCv, b);
  layer.ctx.restore();
  sctx.clearRect(0,0,SIZE,SIZE);

  recordVector({
    type: 'ring', ringType: S.ringType, r, sz, ang, fill: S.fill,
    color, width: S.size, opacity: S.opacity, glow: S.glow, style: 'solid',
    sym: { mode: S.symMode, segments: S.segments, mirror: S.mirror, rotation: S.rotation, spiral: S.spiralFactor }
  });

  if (!silent) {
    pushHistory(); render(); renderLayerUI();
    toast('Ring generated', 'fa-wand-magic-sparkles');
  }
}

/* ================================================================
   AUTO MANDALA
   ================================================================ */
function buildAutoMandala(random) {
  const orig = { ringR: S.ringR, ringSize: S.ringSize, ringType: S.ringType, fill: S.fill, size: S.size, color: S.color };
  const rings = 6, maxR = 470;
  const types = ['petal', 'dot', 'scallop', 'diamond', 'lens', 'sunburst'];
  const baseHue = random ? Math.random()*360 : 250;
  for (let i = 1; i <= rings; i++) {
    S.ringR = (maxR*i)/rings;
    S.ringSize = Math.max(10, (maxR/rings) * (i === 1 ? 1.1 : 0.82));
    S.ringType = types[(i-1) % types.length];
    S.fill = (i % 2 === 0);
    const hue = (baseHue + i*18) % 360;
    S.color = 'hsl(' + hue.toFixed(0) + ', 72%, ' + (66 - i*2) + '%)';
    generateRing(true);
  }
  Object.assign(S, orig);
  pushHistory(); render(); renderLayerUI();
  toast('Mandala built', 'fa-hat-wizard');
}

/* ================================================================
   TEMPLATES
   ================================================================ */
function applyTemplate(name) {
  const layer = getActiveLayer();
  const ctx = layer.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  resetBounds();
  const cx = CX, cy = CY;

  if (name === 'flower') {
    ctx.lineWidth = Math.max(1.4, S.size*0.6);
    ctx.strokeStyle = S.color;
    const R = 100, rings = 4;
    for (let ring = 0; ring < rings; ring++) {
      for (let i = 0; i < 6; i++) {
        const a = i*Math.PI/3 + ring*Math.PI/6;
        const rr = R*ring;
        const x = cx + Math.cos(a)*rr, y = cy + Math.sin(a)*rr;
        ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();
        recordVector({ type: 'circle', cx: x, cy: y, r: R, fill: false, color: S.color, width: S.size, opacity: S.opacity, glow: 0, style: 'solid', sym: { mode: 'none', segments: 1, mirror: false, rotation: 0, spiral: 1 } });
      }
    }
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    recordVector({ type: 'circle', cx, cy, r: R, fill: false, color: S.color, width: S.size, opacity: S.opacity, glow: 0, style: 'solid', sym: { mode: 'none', segments: 1, mirror: false, rotation: 0, spiral: 1 } });
    markBounds(cx, cy, 500);
  }
  else if (name === 'lotus') {
    ctx.lineWidth = Math.max(1.4, S.size*0.7);
    for (let i = 0; i < 8; i++) {
      const a = i*TAU/8 - Math.PI/2;
      const r = 340, perp = a + Math.PI/2, cw = 60;
      const tipX = cx + Math.cos(a)*r, tipY = cy + Math.sin(a)*r;
      const c1x = cx + Math.cos(perp)*cw, c1y = cy + Math.sin(perp)*cw;
      const c2x = cx - Math.cos(perp)*cw, c2y = cy - Math.sin(perp)*cw;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(c1x, c1y, tipX, tipY);
      ctx.quadraticCurveTo(c2x, c2y, cx, cy);
      ctx.closePath();
      ctx.globalAlpha = S.opacity*0.35; ctx.fill(); ctx.globalAlpha = S.opacity;
      ctx.stroke();
      recordVector({ type: 'petal', cx, cy, r, ang: a, cw, fill: true, color: S.color, width: S.size, opacity: S.opacity, glow: 0, style: 'solid', sym: { mode: 'none', segments: 1, mirror: false, rotation: 0, spiral: 1 } });
    }
    markBounds(cx, cy, 500);
  }
  else if (name === 'sunburst') {
    ctx.lineWidth = Math.max(1.4, S.size*0.8);
    ctx.strokeStyle = S.color;
    const n = 36;
    for (let i = 0; i < n; i++) {
      const a = i*TAU/n;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a)*60, cy + Math.sin(a)*60);
      ctx.lineTo(cx + Math.cos(a)*480, cy + Math.sin(a)*480);
      ctx.stroke();
    }
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(cx, cy, 60 + i*90, 0, TAU); ctx.stroke(); }
    recordVector({ type: 'sunburst', cx, cy, color: S.color, width: S.size, opacity: S.opacity, glow: 0, style: 'solid', sym: { mode: 'none', segments: 1, mirror: false, rotation: 0, spiral: 1 } });
    markBounds(cx, cy, 500);
  }
  else if (name === 'web') {
    ctx.lineWidth = Math.max(1.2, S.size*0.55);
    ctx.strokeStyle = S.color;
    const n = 16, rings = 8;
    for (let i = 0; i < n; i++) {
      const a = i*TAU/n;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a)*480, cy + Math.sin(a)*480); ctx.stroke();
    }
    for (let ring = 1; ring <= rings; ring++) {
      const r = 60 + ring*55;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = i*TAU/n;
        const x = cx + Math.cos(a)*r, y = cy + Math.sin(a)*r;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    recordVector({ type: 'web', cx, cy, color: S.color, width: S.size, opacity: S.opacity, glow: 0, style: 'solid', sym: { mode: 'none', segments: 1, mirror: false, rotation: 0, spiral: 1 } });
    markBounds(cx, cy, 500);
  }
  else if (name === 'mandala') {
    const origColor = S.color;
    const baseHue = 250;
    for (let i = 1; i <= 6; i++) {
      S.color = 'hsl(' + ((baseHue + i*15) % 360) + ', 72%, 66%)';
      ctx.strokeStyle = S.color;
      ctx.fillStyle = S.color;
      ctx.lineWidth = Math.max(1.2, S.size*0.55);
      const r = 70*i + 30;
      const sz = 50 - i*4;
      const n = 8 + i*4;
      const off = rad(S.rotation);
      for (let k = 0; k < n; k++) {
        const a = off + k*TAU/n;
        buildRingToCanvas(ctx, i%2===0 ? 'petal' : 'dot', r, Math.max(12, sz), a, S.color);
      }
    }
    S.color = origColor;
    recordVector({ type: 'auto-mandala', color: S.color, width: S.size, opacity: S.opacity, glow: 0, style: 'solid', sym: { mode: 'none', segments: 1, mirror: false, rotation: 0, spiral: 1 } });
  }
  else if (name === 'spiral') {
    ctx.lineWidth = Math.max(1.4, S.size*0.8);
    ctx.strokeStyle = S.color;
    const phi = (1 + Math.sqrt(5))/2;
    let r = 10, a = 0;
    ctx.beginPath();
    for (let i = 0; i < 1500; i++) {
      a += 0.08;
      r = 10*Math.pow(phi, a/(Math.PI/2));
      if (r > 500) break;
      const x = cx + Math.cos(a)*r, y = cy + Math.sin(a)*r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    recordVector({ type: 'spiral', cx, cy, color: S.color, width: S.size, opacity: S.opacity, glow: 0, style: 'solid', sym: { mode: 'none', segments: 1, mirror: false, rotation: 0, spiral: 1 } });
    markBounds(cx, cy, 500);
  }
  ctx.restore();
  pushHistory(); render(); renderLayerUI();
  toast('Template applied', 'fa-wand-magic-sparkles');
}

/* ================================================================
   COLOUR HARMONY
   ================================================================ */
function applyHarmony(type) {
  const hsl = hexToHsl(S.color);
  if (!hsl) return;
  const [h, s, l] = hsl;
  const out = [];
  const count = 8;
  for (let i = 0; i < count; i++) {
    let hh = h, ss = s, ll = l;
    const t = i/(count-1);
    switch (type) {
      case 'analogous': hh = (h + (i - count/2)*15 + 360) % 360; break;
      case 'complement': hh = (i%2===0) ? h : (h+180)%360; ss = s*(1 - t*0.3); break;
      case 'triadic': hh = (h + [0,120,240][i%3]) % 360; ll = l + (i-4)*3; break;
      case 'tetradic': hh = (h + [0,90,180,270][i%4]) % 360; break;
    }
    out.push('hsl(' + Math.round(hh) + ', ' + Math.round(clamp(ss,20,100)) + '%, ' + Math.round(clamp(ll,20,85)) + '%)');
  }
  renderHarmonyPalette(out);
}
function renderHarmonyPalette(colors) {
  const el = document.getElementById('harmonyPalette');
  el.innerHTML = '';
  colors.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'sw2';
    sw.style.background = c;
    sw.title = c;
    sw.addEventListener('click', () => {
      S.color = c;
      const rgb = hslToHex(c);
      document.getElementById('colorPick').value = rgb;
      document.getElementById('colorHex').value = rgb;
    });
    el.appendChild(sw);
  });
}
function hexToHsl(hex) {
  if (hex.startsWith('hsl')) {
    const m = hex.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (m) return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
    return null;
  }
  const h = hex.replace('#','');
  if (!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(h)) return null;
  const n = parseInt(h.length===3 ? h.split('').map(x=>x+x).join('') : h, 16);
  const r = ((n>>16)&255)/255, g = ((n>>8)&255)/255, b = (n&255)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let hue = 0, sat = 0;
  const lig = (max+min)/2;
  if (max !== min) {
    const d = max - min;
    sat = lig > 0.5 ? d/(2-max-min) : d/(max+min);
    if (max === r) hue = (g-b)/d + (g<b?6:0);
    else if (max === g) hue = (b-r)/d + 2;
    else hue = (r-g)/d + 4;
    hue *= 60;
  }
  return [hue, sat*100, lig*100];
}
function hslToHex(hslStr) {
  const m = hslStr.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!m) return '#a29bfe';
  const h = parseInt(m[1])/360, s = parseInt(m[2])/100, l = parseInt(m[3])/100;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q-p)*6*t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q-p)*(2/3 - t)*6;
    return p;
  };
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l*(1+s) : l+s-l*s;
    const p = 2*l - q;
    r = hue2rgb(p, q, h+1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h-1/3);
  }
  return '#' + [r,g,b].map(v => Math.round(v*255).toString(16).padStart(2,'0')).join('');
}

/* ================================================================
   LAYERS UI
   ================================================================ */
function renderLayerUI() {
  const list = document.getElementById('layerList');
  list.innerHTML = '';
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i];
    const div = document.createElement('div');
    div.className = 'layer' + (l.id === activeLayerId ? ' active' : '');
    const thumb = document.createElement('div');
    thumb.className = 'layer-th';
    const tc = document.createElement('canvas');
    tc.width = tc.height = 36;
    const tctx = tc.getContext('2d');
    if (!S.transparent) { tctx.fillStyle = S.bg; tctx.fillRect(0, 0, 36, 36); }
    tctx.drawImage(l.canvas, 0, 0, 36, 36);
    thumb.style.backgroundImage = 'url(' + tc.toDataURL() + ')';
    const info = document.createElement('div');
    info.className = 'layer-inf';
    const nm = document.createElement('div');
    nm.className = 'layer-nm';
    nm.textContent = l.name;
    const mt = document.createElement('div');
    mt.className = 'layer-mt';
    const a = l.anim || defaultLayerAnim();
    const custom = a.speed !== 1 || a.offset !== 0 || a.duration > 0 || a.reverse || !a.enabled;
    mt.innerHTML = Math.round(l.opacity*100) + '% · ' + l.blend +
      (custom ? ' · <span class="anim-tag"><i class="fas fa-film"></i> anim</span>' : '');
    info.appendChild(nm); info.appendChild(mt);
    const vis = document.createElement('button');
    vis.className = 'layer-c' + (l.visible ? ' on' : '');
    vis.innerHTML = '<i class="fas fa-' + (l.visible ? 'eye' : 'eye-slash') + '"></i>';
    vis.title = 'Show / hide';
    vis.addEventListener('click', ev => { ev.stopPropagation(); l.visible = !l.visible; renderLayerUI(); render(); });
    const lock = document.createElement('button');
    lock.className = 'layer-c' + (l.locked ? ' on' : '');
    lock.innerHTML = '<i class="fas fa-' + (l.locked ? 'lock' : 'unlock') + '"></i>';
    lock.title = 'Lock / unlock';
    lock.addEventListener('click', ev => { ev.stopPropagation(); l.locked = !l.locked; renderLayerUI(); });
    div.appendChild(thumb); div.appendChild(info); div.appendChild(vis); div.appendChild(lock);
    div.addEventListener('click', () => {
      activeLayerId = l.id;
      renderLayerUI();
      syncLayerProps();
      sbLayer.textContent = l.name;
    });
    list.appendChild(div);
  }
  syncLayerProps();
  sbLayer.textContent = getActiveLayer().name;
  renderTrackList();
}
function syncLayerProps() {
  const l = getActiveLayer();
  if (!l) return;
  document.getElementById('layerName').value = l.name;
  document.getElementById('rLayerOpa').value = Math.round(l.opacity*100);
  document.getElementById('vLayerOpa').textContent = Math.round(l.opacity*100) + '%';
  paintRange(document.getElementById('rLayerOpa'));
  document.getElementById('sLayerBlend').value = l.blend;
}

/* ================================================================
   PER-LAYER ANIMATION TRACK UI
   ================================================================ */
function mkSlider(parent, label, min, max, step, value, fmt, onInput){
  const fld = document.createElement('div');
  fld.className = 'fld';
  const h = document.createElement('div');
  h.className = 'fld-h';
  const lb = document.createElement('label');
  lb.textContent = label;
  const vv = document.createElement('span');
  vv.className = 'val';
  vv.textContent = fmt(value);
  h.appendChild(lb); h.appendChild(vv);
  const inp = document.createElement('input');
  inp.type = 'range';
  inp.min = min; inp.max = max; inp.step = step; inp.value = value;
  paintRange(inp);
  inp.addEventListener('input', () => {
    const v = parseFloat(inp.value);
    vv.textContent = fmt(v);
    paintRange(inp);
    onInput(v);
  });
  fld.appendChild(h); fld.appendChild(inp);
  parent.appendChild(fld);
  return inp;
}
function mkSwitch(parent, label, icon, checked, onChange){
  const lab = document.createElement('label');
  lab.className = 'switch';
  lab.innerHTML = '<span><i class="fas ' + icon + '"></i>' + label + '</span>' +
                  '<input type="checkbox"' + (checked ? ' checked' : '') + '><span class="tr"></span>';
  const inp = lab.querySelector('input');
  inp.addEventListener('change', () => onChange(inp.checked));
  parent.appendChild(lab);
  return inp;
}

function renderTrackList(){
  const el = document.getElementById('trackList');
  if (!el) return;
  el.innerHTML = '';
  for (let i = layers.length - 1; i >= 0; i--) el.appendChild(buildTrackEl(layers[i]));
  updateTrackPlayheads();
}

function buildTrackEl(l){
  const a = l.anim || (l.anim = defaultLayerAnim());

  const div = document.createElement('div');
  div.className = 'track' + (l.id === activeLayerId ? ' active' : '') + (openTracks[l.id] ? ' open' : '');
  div.dataset.id = l.id;

  const head = document.createElement('div');
  head.className = 'track-head';

  const tog = document.createElement('button');
  tog.className = 'track-tog' + (a.enabled ? ' on' : '');
  tog.title = a.enabled ? 'Layer animation ON — click to freeze' : 'Layer animation OFF — click to enable';
  tog.innerHTML = '<i class="fas fa-' + (a.enabled ? 'toggle-on' : 'toggle-off') + '"></i>';
  tog.addEventListener('click', ev => {
    ev.stopPropagation();
    a.enabled = !a.enabled;
    renderTrackList(); renderLayerUI();
    if (!ANIM.playing) render();
  });

  const nm = document.createElement('span');
  nm.className = 'track-nm';
  nm.textContent = l.name;
  nm.title = l.name;

  const tt = document.createElement('span');
  tt.className = 'track-t';

  const exp = document.createElement('button');
  exp.className = 'track-exp';
  exp.innerHTML = '<i class="fas fa-chevron-' + (openTracks[l.id] ? 'up' : 'down') + '"></i>';
  exp.addEventListener('click', ev => {
    ev.stopPropagation();
    openTracks[l.id] = !openTracks[l.id];
    renderTrackList();
  });

  head.appendChild(tog); head.appendChild(nm); head.appendChild(tt); head.appendChild(exp);
  head.addEventListener('click', ev => {
    if (ev.target.closest('.track-tog') || ev.target.closest('.track-exp')) return;
    if (activeLayerId !== l.id) { activeLayerId = l.id; renderLayerUI(); render(); }
  });
  div.appendChild(head);

  const bar = document.createElement('div');
  bar.className = 'track-bar';
  const fill = document.createElement('div');
  fill.className = 'track-fill';
  const phEl = document.createElement('div');
  phEl.className = 'track-ph';
  bar.appendChild(fill); bar.appendChild(phEl);
  div.appendChild(bar);

  const refreshBar = () => {
    const g = ANIM.duration || 1;
    const dur = a.duration > 0 ? a.duration : g;
    const off = ((a.offset % g) + g) % g;
    fill.style.left = (off / g * 100) + '%';
    fill.style.width = Math.max(2, Math.min(100, (dur / g) * 100)) + '%';
    fill.style.opacity = a.enabled ? .6 : .12;
    const ld = a.duration > 0 ? a.duration : g;
    const lt = layerPhaseTime(l, ANIM.time).t;
    phEl.style.left = ((lt % ld) / ld * 100) + '%';
  };
  const refreshLabel = () => {
    let s = (a.offset / 1000).toFixed(2) + 's · ' + a.speed.toFixed(2) + '×';
    if (a.duration > 0) s += ' · ' + (a.duration / 1000).toFixed(1) + 's';
    if (a.reverse) s += ' · rev';
    if (!a.enabled) s = 'frozen';
    tt.textContent = s;
  };
  refreshBar(); refreshLabel();

  const touch = () => {
    refreshBar(); refreshLabel(); renderLayerUI();
    if (!ANIM.playing) render();
  };

  const body = document.createElement('div');
  body.className = 'track-body';

  const offsetMax = Math.max(1000, ANIM.duration);
  mkSlider(body, 'Start offset', 0, offsetMax, 25, Math.min(a.offset, offsetMax),
    v => (v / 1000).toFixed(2) + 's',
    v => { a.offset = v; touch(); });

  mkSlider(body, 'Layer speed', 5, 400, 5, Math.round(a.speed * 100),
    v => (v / 100).toFixed(2) + '×',
    v => { a.speed = v / 100; touch(); });

  mkSlider(body, 'Loop length', 0, 30000, 250, a.duration,
    v => v === 0 ? 'Global' : (v / 1000).toFixed(1) + 's',
    v => { a.duration = v; touch(); });

  mkSwitch(body, 'Reverse direction', 'fa-backward', a.reverse, c => { a.reverse = c; touch(); });

  const row = document.createElement('div');
  row.className = 'btn-grid';
  row.style.marginTop = '8px';

  const soloBtn = document.createElement('button');
  soloBtn.className = 'btn btn-outline';
  soloBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Solo';
  soloBtn.addEventListener('click', ev => {
    ev.stopPropagation();
    layers.forEach(x => { x.anim.enabled = (x.id === l.id); });
    renderTrackList(); renderLayerUI();
    if (!ANIM.playing) render();
    toast('Solo · ' + l.name, 'fa-crosshairs');
  });

  const copyBtn = document.createElement('button');
  copyBtn.className = 'btn btn-outline';
  copyBtn.innerHTML = '<i class="fas fa-clone"></i> To all';
  copyBtn.addEventListener('click', ev => {
    ev.stopPropagation();
    layers.forEach(x => { if (x.id !== l.id) x.anim = JSON.parse(JSON.stringify(a)); });
    renderTrackList(); renderLayerUI();
    if (!ANIM.playing) render();
    toast('Timing applied to all layers', 'fa-clone');
  });

  row.appendChild(soloBtn); row.appendChild(copyBtn);
  body.appendChild(row);
  div.appendChild(body);
  return div;
}

function updateTrackPlayheads(){
  const tracks = document.querySelectorAll('#trackList .track');
  if (!tracks.length) return;
  tracks.forEach(tr => {
    const l = layers.find(x => x.id === tr.dataset.id);
    if (!l) return;
    const ph = tr.querySelector('.track-ph');
    const fill = tr.querySelector('.track-fill');
    if (!ph) return;
    const g = ANIM.duration || 1;
    const ld = l.anim.duration > 0 ? l.anim.duration : g;
    const lt = layerPhaseTime(l, ANIM.time).t;
    ph.style.left = ((lt % ld) / ld * 100) + '%';
    if (fill) fill.style.opacity = l.anim.enabled ? .6 : .12;
  });
}

document.getElementById('btnTrackStagger').addEventListener('click', () => {
  const n = layers.length;
  if (n < 1) return;
  const step = ANIM.duration / n;
  layers.forEach((l, i) => { l.anim.offset = Math.round(i * step); l.anim.enabled = true; });
  renderTrackList(); renderLayerUI();
  if (!ANIM.playing) render();
  toast('Staggered across ' + n + ' layers', 'fa-stairs');
});
document.getElementById('btnTrackSync').addEventListener('click', () => {
  layers.forEach(l => {
    l.anim.offset = 0; l.anim.speed = 1; l.anim.duration = 0;
    l.anim.reverse = false; l.anim.enabled = true;
  });
  renderTrackList(); renderLayerUI();
  if (!ANIM.playing) render();
  toast('All tracks synced', 'fa-equals');
});
document.getElementById('btnTrackReset').addEventListener('click', () => {
  layers.forEach(l => { l.anim = defaultLayerAnim(); });
  renderTrackList(); renderLayerUI();
  if (!ANIM.playing) render();
  toast('Track settings reset', 'fa-rotate-left');
});

/* ================================================================
   PALETTE
   ================================================================ */
const paletteColors = [
  '#ffffff', '#a29bfe', '#7c6cf0', '#5a4bd1', '#c4b5fd', '#8b7bf7', '#4a3f8a', '#000000',
  '#00cec9', '#55efc4', '#00b894', '#ffeaa7', '#fdcb6e', '#e17055', '#ff7675', '#fd79a8',
  '#e84393', '#d63031', '#b2bec3', '#dfe6e9', '#6c5ce7', '#a29bfe', '#fab1a0', '#81ecec',
  '#ffeaa7', '#f39c12', '#d35400', '#c0392b', '#16a085', '#27ae60', '#2980b9', '#8e44ad'
];
function buildPalette() {
  const el = document.getElementById('palette');
  el.innerHTML = '';
  paletteColors.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'sw2';
    sw.style.background = c;
    sw.title = c;
    sw.addEventListener('click', () => setColor(c));
    el.appendChild(sw);
  });
}
function setColor(c) {
  S.color = c;
  if (!c.startsWith('hsl')) {
    document.getElementById('colorPick').value = c;
    document.getElementById('colorHex').value = c;
  }
  document.querySelectorAll('#palette .sw2').forEach(sw => {
    sw.classList.toggle('active', sw.style.background === c || sw.style.background === hexToRgbString(c));
  });
}
function hexToRgbString(hex) {
  if (hex.startsWith('hsl')) return hex;
  const h = hex.replace('#','');
  if (!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(h)) return hex;
  const n = parseInt(h.length===3 ? h.split('').map(x=>x+x).join('') : h, 16);
  return 'rgb(' + ((n>>16)&255) + ', ' + ((n>>8)&255) + ', ' + (n&255) + ')';
}

/* ================================================================
   UI BINDING HELPERS
   ================================================================ */
function bindRange(id, valId, key, fmt, after) {
  const el = document.getElementById(id);
  const out = valId ? document.getElementById(valId) : null;
  const update = () => {
    const v = parseFloat(el.value);
    S[key] = v;
    if (out) out.textContent = fmt ? fmt(v) : v;
    paintRange(el);
    if (after) after(v);
  };
  el.addEventListener('input', update);
  paintRange(el);
}
function paintRange(el) {
  if (!el) return;
  const min = parseFloat(el.min) || 0;
  const max = parseFloat(el.max);
  const v = parseFloat(el.value);
  const top = isNaN(max) ? 100 : max;
  const p = ((v-min)/(top-min||1))*100;
  el.style.setProperty('--p', p + '%');
}
function bindSwitch(id, key, after) {
  const el = document.getElementById(id);
  el.addEventListener('change', () => { S[key] = el.checked; if (after) after(el.checked); });
}

/* tools */
function setTool(name){
  const btn = document.querySelector('.tool[data-tool="' + name + '"]');
  if (!btn) return;
  document.querySelectorAll('.tool').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  S.tool = name;
  view.style.cursor = (name === 'eraser') ? 'cell' :
                      (name === 'picker') ? 'copy' :
                      (name === 'move')   ? 'grab' : 'crosshair';
  if (sbTool) sbTool.textContent = name.charAt(0).toUpperCase() + name.slice(1);
}
document.querySelectorAll('.tool').forEach(btn => {
  btn.addEventListener('click', () => setTool(btn.dataset.tool));
});

/* tabs */
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const pane = document.querySelector('.pane[data-pane="' + tab.dataset.tab + '"]');
    if (pane) pane.classList.add('active');
    if (tab.dataset.tab === 'animate') renderTrackList();
  });
});

/* symmetry */
bindRange('rSeg', 'vSeg', 'segments', v => v, () => { sbSeg.textContent = S.segments; drawGuides(); });
bindRange('rRot', 'vRot', 'rotation', v => v + '°', drawGuides);
bindRange('rSpiral', 'vSpiral', 'spiralFactor', v => (v/100).toFixed(2), v => { S.spiralFactor = v/100; });
bindSwitch('cMirror', 'mirror', () => { sbMirror.textContent = S.mirror ? ' · mirror' : ''; drawGuides(); });
bindSwitch('cSnap', 'snap');
document.querySelectorAll('[data-preset]').forEach(b => {
  b.addEventListener('click', () => {
    S.segments = parseInt(b.dataset.preset, 10);
    document.getElementById('rSeg').value = S.segments;
    document.getElementById('vSeg').textContent = S.segments;
    paintRange(document.getElementById('rSeg'));
    sbSeg.textContent = S.segments;
    drawGuides();
  });
});
document.querySelectorAll('[data-symmode]').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('[data-symmode]').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    S.symMode = b.dataset.symmode;
    document.getElementById('spiralField').style.display = (S.symMode === 'spiral') ? '' : 'none';
    drawGuides();
  });
});

/* brush */
bindRange('rSize', 'vSize', 'size');
bindRange('rOpa', 'vOpa', 'opacity', v => v + '%', v => { S.opacity = v/100; });
bindRange('rGlow', 'vGlow', 'glow');
bindRange('rSmooth', 'vSmooth', 'smooth', v => (v/100).toFixed(2), v => { S.smooth = v/100; });
document.getElementById('sStyle').addEventListener('change', e => { S.style = e.target.value; });
bindSwitch('cTaper', 'taper');
bindSwitch('cRainbow', 'rainbow');

/* shapes */
bindRange('rSides', 'vSides', 'sides');
bindRange('rPoints', 'vPoints', 'points');
bindRange('rInset', 'vInset', 'inset', v => v + '%', v => { S.inset = v/100; });
bindRange('rPetal', 'vPetal', 'petalW', v => v + '%', v => { S.petalW = v/100; });
bindRange('rSpacing', 'vSpacing', 'spacing');
bindRange('rDotSize', 'vDotSize', 'dotSize');
bindRange('rSprR', 'vSprR', 'sprayR');
bindRange('rSprD', 'vSprD', 'sprayD');
bindSwitch('cFill', 'fill');

/* text */
bindRange('rFontSize', 'vFontSize', 'fontSize');
document.getElementById('sFont').addEventListener('change', e => { S.font = e.target.value; });
bindSwitch('cBold', 'bold');
bindSwitch('cItalic', 'italic');

/* guides */
bindSwitch('cGuides', 'guides', drawGuides);
bindSwitch('cAxes', 'axes', drawGuides);
bindSwitch('cCenter', 'centerMark', drawGuides);
bindSwitch('cPolarGrid', 'polarGrid', drawGuides);
bindSwitch('cGolden', 'golden', drawGuides);
bindRange('rRings', 'vRings', 'guideRings', v => v, drawGuides);

const bgPick = document.getElementById('bgPick');
bgPick.addEventListener('input', e => { S.bg = e.target.value; applyPaper(); });
document.querySelectorAll('[data-bg]').forEach(b => {
  b.addEventListener('click', () => { S.bg = b.dataset.bg; bgPick.value = S.bg; applyPaper(); });
});
bindSwitch('cTransBg', 'transparent', applyPaper);
function applyPaper() {
  if (S.transparent) stage.classList.add('transparent');
  else { stage.classList.remove('transparent'); stage.style.background = S.bg; }
}

/* ring gen */
bindRange('rRingR', 'vRingR', 'ringR');
bindRange('rRingS', 'vRingS', 'ringSize');
document.getElementById('sRingType').addEventListener('change', e => { S.ringType = e.target.value; });
document.getElementById('btnGenRing').addEventListener('click', () => generateRing(false));
document.getElementById('btnAuto').addEventListener('click', () => buildAutoMandala(false));
document.getElementById('btnAutoRandom').addEventListener('click', () => buildAutoMandala(true));

document.querySelectorAll('[data-tpl]').forEach(t => t.addEventListener('click', () => applyTemplate(t.dataset.tpl)));
document.querySelectorAll('[data-harmony]').forEach(b => b.addEventListener('click', () => applyHarmony(b.dataset.harmony)));

/* layers */
document.getElementById('btnAddLayer').addEventListener('click', () => { addLayer(); render(); pushHistory(); });
document.getElementById('btnDupLayer').addEventListener('click', () => { duplicateLayer(); pushHistory(); });
document.getElementById('btnDelLayer').addEventListener('click', () => { removeLayer(activeLayerId); pushHistory(); });
document.getElementById('btnLayerUp').addEventListener('click', () => moveLayer(1));
document.getElementById('btnLayerDown').addEventListener('click', () => moveLayer(-1));
document.getElementById('btnLayerFlip').addEventListener('click', () => {
  const l = getActiveLayer();
  const tmp = document.createElement('canvas');
  tmp.width = tmp.height = SIZE;
  const tc = tmp.getContext('2d');
  tc.translate(SIZE, 0); tc.scale(-1, 1);
  tc.drawImage(l.canvas, 0, 0);
  l.ctx.clearRect(0, 0, SIZE, SIZE);
  l.ctx.drawImage(tmp, 0, 0);
  pushHistory(); render(); renderLayerUI();
  toast('Layer flipped', 'fa-arrows-rotate');
});
document.getElementById('btnLayerClear').addEventListener('click', () => {
  const l = getActiveLayer();
  l.ctx.clearRect(0, 0, SIZE, SIZE);
  pushHistory(); render(); renderLayerUI();
  toast('Layer cleared', 'fa-eraser');
});
document.getElementById('layerName').addEventListener('input', e => {
  getActiveLayer().name = e.target.value;
  renderLayerUI();
});
const rLayerOpa = document.getElementById('rLayerOpa');
rLayerOpa.addEventListener('input', () => {
  const v = parseFloat(rLayerOpa.value);
  document.getElementById('vLayerOpa').textContent = v + '%';
  paintRange(rLayerOpa);
  getActiveLayer().opacity = v/100;
  render();
});
document.getElementById('sLayerBlend').addEventListener('change', e => {
  getActiveLayer().blend = e.target.value;
  render(); renderLayerUI();
});

/* colour */
document.getElementById('colorPick').addEventListener('input', e => setColor(e.target.value));
document.getElementById('colorHex').addEventListener('change', e => {
  const v = e.target.value.trim();
  if (/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v)) setColor(v.startsWith('#') ? v : '#' + v);
  else e.target.value = S.color;
});

/* export */
document.getElementById('btnPng').addEventListener('click', () => downloadPNG(false));
document.getElementById('btnPng2').addEventListener('click', () => downloadPNG(false));
document.getElementById('btnPngT').addEventListener('click', () => downloadPNG(true));
document.getElementById('btnPngT2').addEventListener('click', () => downloadPNG(true));

/* FIXED: btnPngT3 is present in the export pane — guard in case it's removed */
const _btnPngT3 = document.getElementById('btnPngT3');
if (_btnPngT3) {
  _btnPngT3.addEventListener('click', () => document.querySelector('.tab[data-tab="animate"]').click());
}

document.getElementById('btnSvg').addEventListener('click', downloadSVG);
document.getElementById('btnSvg2').addEventListener('click', downloadSVG);
document.getElementById('btnCopyPng').addEventListener('click', () => copyPNG(false));
document.getElementById('btnCopyPngT').addEventListener('click', () => copyPNG(true));

/* file */
document.getElementById('btnNew').addEventListener('click', () => {
  if (!confirm('Start a new project? Current work will be lost if not saved.')) return;
  resetAll();
});
document.getElementById('btnSave').addEventListener('click', saveProject);
document.getElementById('btnSave2').addEventListener('click', saveProject);
document.getElementById('btnLoad').addEventListener('click', loadProject);
document.getElementById('btnLoad2').addEventListener('click', loadProject);
document.getElementById('btnExportJSON').addEventListener('click', exportJSON);
document.getElementById('btnImportJSON').addEventListener('click', importJSON);

document.getElementById('btnClear').addEventListener('click', () => {
  const l = getActiveLayer();
  l.ctx.clearRect(0, 0, SIZE, SIZE);
  vectorElements = vectorElements.filter(v => v.layerId !== l.id);
  pushHistory(); render(); renderLayerUI(); updateVecCount();
  toast('Layer cleared', 'fa-eraser');
});
document.getElementById('btnReset').addEventListener('click', () => {
  if (!confirm('Reset entire canvas and all layers?')) return;
  resetAll();
});

document.getElementById('btnUndo').addEventListener('click', undo);
document.getElementById('btnRedo').addEventListener('click', redo);

/* reference */
document.getElementById('btnRefImport').addEventListener('click', importReference);
document.getElementById('btnRefClear').addEventListener('click', () => {
  rctx.clearRect(0, 0, SIZE, SIZE);
  refSrcCtx.clearRect(0, 0, SIZE, SIZE);
  toast('Reference removed', 'fa-xmark');
});
const rRefOpa = document.getElementById('rRefOpa');
rRefOpa.addEventListener('input', () => {
  const v = parseFloat(rRefOpa.value);
  document.getElementById('vRefOpa').textContent = v + '%';
  paintRange(rRefOpa);
  S.refOpacity = v/100;
  refCv.style.opacity = S.refOpacity;
});

/* help */
document.getElementById('btnHelp').addEventListener('click', showHelp);
function showHelp() {
  const rows = [
    ['B','Brush'],['E','Eraser'],['G','Bucket Fill'],['H','Gradient'],
    ['L','Line'],['A','Arc'],['C','Circle'],['P','Polygon'],['S','Star'],['F','Petal'],
    ['D','Dot beads'],['R','Spray'],['T','Text'],['I','Colour picker'],['M','Move / pan canvas'],
    ['[ ]','Decrease / increase size'],['1-9','Symmetry presets'],
    ['Space','Play / pause animation'],['Ctrl+Z','Undo'],['Ctrl+Shift+Z','Redo'],
    ['Ctrl+S','Download PNG'],['Middle-drag','Pan the canvas'],['?','This dialog']
  ];
  const html = `
    <div class="mbg" id="helpModal">
      <div class="modal">
        <h3><i class="fas fa-keyboard"></i> Keyboard Shortcuts</h3>
        <div style="display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:.79rem;">
          ${rows.map(r => `<kbd>${r[0]}</kbd><span>${r[1]}</span>`).join('')}
        </div>
        <div class="hint" style="margin-top:14px;">
          <b>Move bars:</b> drag the thin vertical bars between the tool rail, canvas and panel to resize.
          Double-click a bar to reset it.
        </div>
        <div class="m-act">
          <button class="btn btn-primary" id="helpClose">Got it</button>
        </div>
      </div>
    </div>`;
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  document.body.appendChild(wrap.firstElementChild);
  const modal = document.getElementById('helpModal');
  document.getElementById('helpClose').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

/* ================================================================
   MOVE BARS (splitters)
   ================================================================ */
function setupSplitter(el, cssVar, min, max, invert, defVal) {
  let dragging = false, startX = 0, startVal = 0;

  const readVar = () => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(cssVar);
    const n = parseFloat(raw);
    return isNaN(n) ? defVal : n;
  };

  el.addEventListener('pointerdown', e => {
    dragging = true;
    startX = e.clientX;
    startVal = readVar();
    try { el.setPointerCapture(e.pointerId); } catch(err){}
    el.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  });
  el.addEventListener('pointermove', e => {
    if (!dragging) return;
    let delta = e.clientX - startX;
    if (invert) delta = -delta;
    const v = clamp(startVal + delta, min, max);
    document.documentElement.style.setProperty(cssVar, v + 'px');
    e.preventDefault();
  });
  const stop = () => {
    if (!dragging) return;
    dragging = false;
    el.classList.remove('dragging');
    document.body.style.cursor = '';
  };
  el.addEventListener('pointerup', stop);
  el.addEventListener('pointercancel', stop);
  el.addEventListener('dblclick', () => {
    document.documentElement.style.setProperty(cssVar, defVal + 'px');
    toast('Layout reset', 'fa-table-columns');
  });
}
setupSplitter(document.getElementById('splitRail'), '--rail-w', 64, 160, false, 78);
setupSplitter(document.getElementById('splitPanel'), '--panel-w', 280, 620, true, 364);

document.getElementById('btnResetLayout').addEventListener('click', () => {
  document.documentElement.style.setProperty('--rail-w', '78px');
  document.documentElement.style.setProperty('--panel-w', '364px');
  toast('Layout reset', 'fa-table-columns');
});

/* ================================================================
   ANIMATION ENGINE
   ================================================================ */
function animPlay() {
  if (ANIM.playing) return;
  ANIM.playing = true;
  ANIM.lastT = performance.now();
  guideCv.style.display = 'none';
  updatePlayUI();
  ANIM.rafId = requestAnimationFrame(animTick);
}
function animPause() {
  ANIM.playing = false;
  if (ANIM.rafId) cancelAnimationFrame(ANIM.rafId);
  ANIM.rafId = null;
  guideCv.style.display = '';
  updatePlayUI();
  render();
}
function animStop() {
  animPause();
  ANIM.time = 0;
  updateTimelineUI();
  updateTrackPlayheads();
  render();
}
function animToggle() { if (ANIM.playing) animPause(); else animPlay(); }

function animTick(now) {
  if (!ANIM.playing) return;
  const dt = Math.min(100, now - ANIM.lastT);
  ANIM.lastT = now;
  ANIM.time += dt * ANIM.speed;
  if (ANIM.time >= ANIM.duration) {
    if (ANIM.loop) {
      ANIM.time = ANIM.time % ANIM.duration;
    } else {
      ANIM.time = ANIM.duration;
      ANIM.playing = false;
      guideCv.style.display = '';
      updatePlayUI(); render(); updateTimelineUI(); updateTrackPlayheads();
      return;
    }
  }
  render();
  updateTimelineUI();
  updateTrackPlayheads();
  ANIM.rafId = requestAnimationFrame(animTick);
}
function updatePlayUI() {
  const btn = document.getElementById('animPlayBtn');
  if (btn) {
    if (ANIM.playing) {
      btn.innerHTML = '<i class="fas fa-pause"></i> Pause';
      btn.classList.remove('btn-primary'); btn.classList.add('btn-success');
    } else {
      btn.innerHTML = '<i class="fas fa-play"></i> Play';
      btn.classList.remove('btn-success'); btn.classList.add('btn-primary');
    }
  }
  const tb = document.getElementById('btnAnimate');
  if (tb) {
    tb.querySelector('i').className = ANIM.playing ? 'fas fa-pause' : 'fas fa-play';
    tb.classList.toggle('primary', ANIM.playing);
  }
}
function updateTimelineUI() {
  const r = document.getElementById('rAnimTime');
  const v = document.getElementById('vAnimTime');
  if (r) { r.value = Math.round((ANIM.time / ANIM.duration) * 1000); paintRange(r); }
  if (v) v.textContent = (ANIM.time / 1000).toFixed(2) + 's';
}

function bindAnimRange(id, valId, obj, key, fmt, mul) {
  const el = document.getElementById(id);
  const out = document.getElementById(valId);
  const update = () => {
    const v = parseFloat(el.value);
    obj[key] = mul ? v * mul : v;
    if (out) out.textContent = fmt ? fmt(v) : v;
    paintRange(el);
    if (!ANIM.playing) render();
  };
  el.addEventListener('input', update);
  paintRange(el);
}
function bindAnimSwitchFromCheckbox(id, obj, key, propCard) {
  const el = document.getElementById(id);
  el.checked = obj[key];
  if (propCard) propCard.classList.toggle('on', obj[key]);
  el.addEventListener('change', () => {
    obj[key] = el.checked;
    if (propCard) propCard.classList.toggle('on', el.checked);
    if (!ANIM.playing) render();
  });
}

document.getElementById('animPlayBtn').addEventListener('click', animToggle);
document.getElementById('animStopBtn').addEventListener('click', animStop);
document.getElementById('animLoopBtn').addEventListener('click', function() {
  ANIM.loop = !ANIM.loop;
  this.classList.toggle('active', ANIM.loop);
  toast(ANIM.loop ? 'Loop on' : 'Loop off', 'fa-repeat');
});
document.getElementById('btnAnimate').addEventListener('click', animToggle);

let animScrubbing = false;
const rAnimTime = document.getElementById('rAnimTime');
rAnimTime.addEventListener('pointerdown', () => { animScrubbing = true; if (ANIM.playing) animPause(); });
document.addEventListener('pointerup', () => { animScrubbing = false; });
rAnimTime.addEventListener('input', e => {
  ANIM.time = (parseFloat(e.target.value) / 1000) * ANIM.duration;
  document.getElementById('vAnimTime').textContent = (ANIM.time / 1000).toFixed(2) + 's';
  paintRange(e.target);
  render();
  updateTrackPlayheads();
});

const rAnimDur = document.getElementById('rAnimDur');
rAnimDur.addEventListener('input', () => {
  ANIM.duration = parseFloat(rAnimDur.value);
  document.getElementById('vAnimDur').textContent = (ANIM.duration / 1000).toFixed(1) + 's';
  paintRange(rAnimDur);
  if (ANIM.time > ANIM.duration) ANIM.time = 0;
  updateTimelineUI();
  renderTrackList();
  if (!ANIM.playing) render();
});
paintRange(rAnimDur);

const rAnimSpeed = document.getElementById('rAnimSpeed');
rAnimSpeed.addEventListener('input', () => {
  ANIM.speed = parseFloat(rAnimSpeed.value) / 100;
  document.getElementById('vAnimSpeed').textContent = ANIM.speed.toFixed(2) + '×';
  paintRange(rAnimSpeed);
});
paintRange(rAnimSpeed);

bindAnimSwitchFromCheckbox('aRotOn', ANIM.props.rotation, 'on', document.getElementById('ap-rotation'));
bindAnimRange('rARot', 'vARot', ANIM.props.rotation, 'amount', v => v + '°');
document.querySelectorAll('[data-rot-dir]').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('[data-rot-dir]').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    ANIM.props.rotation.dir = parseInt(b.dataset.rotDir, 10);
    if (!ANIM.playing) render();
  });
});

bindAnimSwitchFromCheckbox('aScaleOn', ANIM.props.scale, 'on', document.getElementById('ap-scale'));
bindAnimRange('rAScale', 'vAScale', ANIM.props.scale, 'amount', v => v + '%', v => v/100);
bindAnimRange('rAScaleF', 'vAScaleF', ANIM.props.scale, 'freq');

bindAnimSwitchFromCheckbox('aOpacOn', ANIM.props.opacity, 'on', document.getElementById('ap-opacity'));
bindAnimRange('rAOpac', 'vAOpac', ANIM.props.opacity, 'amount', v => v + '%', v => v/100);
bindAnimRange('rAOpacF', 'vAOpacF', ANIM.props.opacity, 'freq');

bindAnimSwitchFromCheckbox('aGlowOn', ANIM.props.glow, 'on', document.getElementById('ap-glow'));
bindAnimRange('rAGlow', 'vAGlow', ANIM.props.glow, 'amount', v => (v/100).toFixed(2), v => v/100);
bindAnimRange('rAGlowF', 'vAGlowF', ANIM.props.glow, 'freq');

bindAnimSwitchFromCheckbox('aHueOn', ANIM.props.hue, 'on', document.getElementById('ap-hue'));
bindAnimRange('rAHue', 'vAHue', ANIM.props.hue, 'amount', v => v + '°');

bindAnimSwitchFromCheckbox('aFlashOn', ANIM.props.flash, 'on', document.getElementById('ap-flash'));
bindAnimRange('rAFlash', 'vAFlash', ANIM.props.flash, 'amount', v => v + '%', v => v/100);
bindAnimRange('rAFlashF', 'vAFlashF', ANIM.props.flash, 'freq');

bindAnimSwitchFromCheckbox('aWobOn', ANIM.props.wobble, 'on', document.getElementById('ap-wobble'));
bindAnimRange('rAWob', 'vAWob', ANIM.props.wobble, 'amount');
bindAnimRange('rAWobF', 'vAWobF', ANIM.props.wobble, 'freq');

function applyAnimPreset(name) {
  const P = ANIM.props;
  Object.keys(P).forEach(k => { P[k].on = false; });
  if (name === 'spin') { P.rotation.on = true; P.rotation.amount = 360; P.rotation.dir = 1; }
  else if (name === 'breathe') { P.scale.on = true; P.scale.amount = 0.08; P.scale.freq = 1; }
  else if (name === 'hypno') {
    P.rotation.on = true; P.rotation.amount = 360; P.rotation.dir = 1;
    P.scale.on = true; P.scale.amount = 0.15; P.scale.freq = 2;
    P.hue.on = true; P.hue.amount = 180;
  } else if (name === 'aurora') {
    P.hue.on = true; P.hue.amount = 360;
    P.glow.on = true; P.glow.amount = 0.7; P.glow.freq = 2;
    P.scale.on = true; P.scale.amount = 0.05; P.scale.freq = 1;
  } else if (name === 'sparkle') {
    P.flash.on = true; P.flash.amount = 0.8; P.flash.freq = 8;
    P.glow.on = true; P.glow.amount = 0.5; P.glow.freq = 8;
  } else if (name === 'pulse') {
    P.scale.on = true; P.scale.amount = 0.12; P.scale.freq = 4;
    P.opacity.on = true; P.opacity.amount = 0.3; P.opacity.freq = 4;
  } else if (name === 'float') {
    P.wobble.on = true; P.wobble.amount = 14; P.wobble.freq = 2;
    P.rotation.on = true; P.rotation.amount = 20; P.rotation.dir = 0;
  }
  syncAnimUI();
  if (!ANIM.playing) { ANIM.time = 0; render(); updateTimelineUI(); updateTrackPlayheads(); }
  toast('Preset: ' + name, 'fa-wand-magic-sparkles');
}
document.querySelectorAll('[data-animpreset]').forEach(b => {
  b.addEventListener('click', () => applyAnimPreset(b.dataset.animpreset));
});

function syncAnimUI() {
  const P = ANIM.props;
  document.getElementById('aRotOn').checked = P.rotation.on;
  document.getElementById('aScaleOn').checked = P.scale.on;
  document.getElementById('aOpacOn').checked = P.opacity.on;
  document.getElementById('aGlowOn').checked = P.glow.on;
  document.getElementById('aHueOn').checked = P.hue.on;
  document.getElementById('aFlashOn').checked = P.flash.on;
  document.getElementById('aWobOn').checked = P.wobble.on;

  document.getElementById('ap-rotation').classList.toggle('on', P.rotation.on);
  document.getElementById('ap-scale').classList.toggle('on', P.scale.on);
  document.getElementById('ap-opacity').classList.toggle('on', P.opacity.on);
  document.getElementById('ap-glow').classList.toggle('on', P.glow.on);
  document.getElementById('ap-hue').classList.toggle('on', P.hue.on);
  document.getElementById('ap-flash').classList.toggle('on', P.flash.on);
  document.getElementById('ap-wobble').classList.toggle('on', P.wobble.on);

  document.getElementById('rARot').value = P.rotation.amount;
  document.getElementById('vARot').textContent = P.rotation.amount + '°';
  paintRange(document.getElementById('rARot'));
  document.querySelectorAll('[data-rot-dir]').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.rotDir, 10) === P.rotation.dir);
  });

  document.getElementById('rAScale').value = Math.round(P.scale.amount * 100);
  document.getElementById('vAScale').textContent = Math.round(P.scale.amount * 100) + '%';
  paintRange(document.getElementById('rAScale'));
  document.getElementById('rAScaleF').value = P.scale.freq;
  document.getElementById('vAScaleF').textContent = P.scale.freq;
  paintRange(document.getElementById('rAScaleF'));

  document.getElementById('rAOpac').value = Math.round(P.opacity.amount * 100);
  document.getElementById('vAOpac').textContent = Math.round(P.opacity.amount * 100) + '%';
  paintRange(document.getElementById('rAOpac'));
  document.getElementById('rAOpacF').value = P.opacity.freq;
  document.getElementById('vAOpacF').textContent = P.opacity.freq;
  paintRange(document.getElementById('rAOpacF'));

  document.getElementById('rAGlow').value = Math.round(P.glow.amount * 100);
  document.getElementById('vAGlow').textContent = P.glow.amount.toFixed(2);
  paintRange(document.getElementById('rAGlow'));
  document.getElementById('rAGlowF').value = P.glow.freq;
  document.getElementById('vAGlowF').textContent = P.glow.freq;
  paintRange(document.getElementById('rAGlowF'));

  document.getElementById('rAHue').value = P.hue.amount;
  document.getElementById('vAHue').textContent = P.hue.amount + '°';
  paintRange(document.getElementById('rAHue'));

  document.getElementById('rAFlash').value = Math.round(P.flash.amount * 100);
  document.getElementById('vAFlash').textContent = Math.round(P.flash.amount * 100) + '%';
  paintRange(document.getElementById('rAFlash'));
  document.getElementById('rAFlashF').value = P.flash.freq;
  document.getElementById('vAFlashF').textContent = P.flash.freq;
  paintRange(document.getElementById('rAFlashF'));

  document.getElementById('rAWob').value = P.wobble.amount;
  document.getElementById('vAWob').textContent = P.wobble.amount;
  paintRange(document.getElementById('rAWob'));
  document.getElementById('rAWobF').value = P.wobble.freq;
  document.getElementById('vAWobF').textContent = P.wobble.freq;
  paintRange(document.getElementById('rAWobF'));

  document.getElementById('rAnimDur').value = ANIM.duration;
  document.getElementById('vAnimDur').textContent = (ANIM.duration / 1000).toFixed(1) + 's';
  paintRange(document.getElementById('rAnimDur'));
  document.getElementById('rAnimSpeed').value = Math.round(ANIM.speed * 100);
  document.getElementById('vAnimSpeed').textContent = ANIM.speed.toFixed(2) + '×';
  paintRange(document.getElementById('rAnimSpeed'));

  updateTimelineUI();
  updatePlayUI();
  renderTrackList();
}

/* ================================================================
   FRAME PAINTER (export / record)
   ================================================================ */
function drawAnimFrameToCtx(ctx, size, t, transparent) {
  const scale = size / SIZE;

  ctx.setTransform(1,0,0,1,0,0);
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, size, size);

  if (!transparent) { ctx.fillStyle = S.bg; ctx.fillRect(0, 0, size, size); }

  ctx.save();
  ctx.scale(scale, scale);

  for (const l of layers) {
    if (!l.visible || l.opacity <= 0) continue;
    const lp = layerPhaseTime(l, t);
    const v = computeAnimValues(lp.t, lp.dur);

    ctx.save();
    ctx.globalAlpha = v.opacity * l.opacity;
    ctx.globalCompositeOperation = l.blend;

    const f = buildFilter(v);
    if (f) ctx.filter = f;

    ctx.translate(CX + v.wobX, CY + v.wobY);
    if (v.rotation) ctx.rotate(rad(v.rotation));
    if (v.scale !== 1) ctx.scale(v.scale, v.scale);
    ctx.translate(-CX, -CY);

    ctx.drawImage(l.canvas, 0, 0);
    ctx.restore();
  }

  ctx.restore();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

/* ================================================================
   ANIMATION RECORDING (WebM)
   ================================================================ */
function updateRecordUI() {
  const btn = document.getElementById('btnRecordWebm');
  if (!btn) return;
  if (ANIM.recording) {
    btn.innerHTML = '<span class="rec-dot"></span> Recording…';
    btn.disabled = true;
  } else {
    btn.innerHTML = '<i class="fas fa-video"></i> Record WebM (1 loop)';
    btn.disabled = false;
  }
}

async function recordWebM() {
  if (ANIM.recording) return;
  if (typeof MediaRecorder === 'undefined') { toast('MediaRecorder not supported', 'fa-triangle-exclamation'); return; }
  if (typeof HTMLCanvasElement.prototype.captureStream === 'undefined') { toast('captureStream not supported', 'fa-triangle-exclamation'); return; }

  const size = parseInt(document.getElementById('sAnimSize').value, 10) || 1000;
  const fps = parseInt(document.getElementById('sAnimFps').value, 10) || 30;
  const transparent = document.getElementById('cAnimTrans').checked;

  const mimes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  let mimeType = '';
  for (const m of mimes) { if (MediaRecorder.isTypeSupported(m)) { mimeType = m; break; } }
  if (!mimeType) { toast('WebM not supported', 'fa-triangle-exclamation'); return; }

  const rc = document.createElement('canvas');
  rc.width = rc.height = size;
  const rctx2 = rc.getContext('2d');
  drawAnimFrameToCtx(rctx2, size, 0, transparent);

  const stream = rc.captureStream(fps);
  const chunks = [];
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 12000000 });

  recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const a = document.createElement('a');
    a.download = 'mandala-anim-' + Date.now() + '.webm';
    a.href = URL.createObjectURL(blob);
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    ANIM.recording = false;
    updateRecordUI();
    toast('WebM saved · ' + chunks.length + ' chunks', 'fa-video');
  };

  ANIM.recording = true;
  updateRecordUI();
  toast('Recording started…', 'fa-video');
  if (ANIM.playing) animPause();

  recorder.start();

  const startWall = performance.now();
  const realDur = ANIM.duration;

  function frame() {
    if (!ANIM.recording) return;
    const elapsed = performance.now() - startWall;
    if (elapsed >= realDur) { try { recorder.stop(); } catch(err){} return; }
    const t = elapsed % ANIM.duration;
    drawAnimFrameToCtx(rctx2, size, t, transparent);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
document.getElementById('btnRecordWebm').addEventListener('click', recordWebM);

/* ================================================================
   ANIMATED SVG EXPORT
   ================================================================ */
function exportAnimatedSVG() {
  const P = ANIM.props;
  const header = [];
  header.push('<?xml version="1.0" encoding="UTF-8"?>');
  header.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + SIZE + ' ' + SIZE + '" width="' + SIZE + '" height="' + SIZE + '">');

  const css = [];
  const body = [];

  if (!S.transparent) body.push('<rect width="' + SIZE + '" height="' + SIZE + '" fill="' + S.bg + '"/>');

  let li = 0;
  for (const l of layers) {
    li++;
    if (!l.visible || l.opacity <= 0) continue;
    const vecs = vectorElements.filter(e => e.layerId === l.id);
    if (!vecs.length) continue;

    const dur = l.anim.duration > 0 ? l.anim.duration : ANIM.duration;
    const durSec = (dur / 1000).toFixed(3);
    const classes = [];

    if (P.hue.on) {
      const cn = 'msl' + li + '_hue';
      css.push('.' + cn + '{animation:' + cn + 'kf ' + durSec + 's linear infinite;}');
      css.push('@keyframes ' + cn + 'kf{from{filter:hue-rotate(0deg);}to{filter:hue-rotate(' + P.hue.amount + 'deg);}}');
      classes.push(cn);
    }
    if (P.glow.on) {
      const gd = (dur / 1000 / P.glow.freq).toFixed(3);
      const b2 = (1 + P.glow.amount * 0.8).toFixed(3);
      const s2 = (1 + P.glow.amount * 0.5).toFixed(3);
      const cn = 'msl' + li + '_glow';
      css.push('.' + cn + '{animation:' + cn + 'kf ' + gd + 's ease-in-out infinite;}');
      css.push('@keyframes ' + cn + 'kf{0%,100%{filter:brightness(1) saturate(1);}50%{filter:brightness(' + b2 + ') saturate(' + s2 + ');}}');
      classes.push(cn);
    }
    if (P.flash.on) {
      const fd = (dur / 1000 / P.flash.freq).toFixed(3);
      const bMax = (1 + P.flash.amount).toFixed(3);
      const cn = 'msl' + li + '_flash';
      css.push('.' + cn + '{animation:' + cn + 'kf ' + fd + 's linear infinite;}');
      css.push('@keyframes ' + cn + 'kf{0%,60%,100%{filter:brightness(1);}30%{filter:brightness(' + bMax + ');}}');
      classes.push(cn);
    }

    const inner = vecs.map(renderVector).join('');
    const N = 60;
    const tv = [], ov = [];
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * dur;
      const v = computeAnimValues(t, dur);
      tv.push('translate(' + v.wobX.toFixed(3) + ' ' + v.wobY.toFixed(3) + ') ' +
              'rotate(' + v.rotation.toFixed(3) + ' ' + CX + ' ' + CY + ') ' +
              'scale(' + v.scale.toFixed(4) + ')');
      ov.push(v.opacity.toFixed(4));
    }

    const needsT = P.rotation.on || P.scale.on || P.wobble.on;

    body.push('<g' + (classes.length ? ' class="' + classes.join(' ') + '"' : '') +
              ' opacity="' + l.opacity + '" style="mix-blend-mode:' + mapBlend(l.blend) + '">');
    body.push('<g>');
    if (needsT) {
      body.push('<animate attributeName="transform" values="' + tv.join(';') +
                '" dur="' + durSec + 's" repeatCount="indefinite" calcMode="linear"/>');
    }
    if (P.opacity.on) {
      body.push('<g><animate attributeName="opacity" values="' + ov.join(';') +
                '" dur="' + durSec + 's" repeatCount="indefinite" calcMode="linear"/>');
      body.push(inner);
      body.push('</g>');
    } else {
      body.push(inner);
    }
    body.push('</g>');
    body.push('</g>');
  }

  const defs = css.length ? ['<defs><style><![CDATA[' + css.join('\n') + ']]></style></defs>'] : [];
  const svg = header.concat(defs, body, ['</svg>']).join('\n');

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.download = 'mandala-anim-' + Date.now() + '.svg';
  a.href = URL.createObjectURL(blob);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Animated SVG exported', 'fa-bezier-curve');
}
document.getElementById('btnExportAnimSvg').addEventListener('click', exportAnimatedSVG);

/* ================================================================
   PNG EXPORT
   ================================================================ */
function flatten(scale, transparent) {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE * scale;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = 'high';
  if (!transparent) { x.fillStyle = S.bg; x.fillRect(0, 0, c.width, c.height); }
  drawAnimFrameToCtx(x, SIZE * scale, ANIM.time, transparent);
  return c;
}
function downloadPNG(transparent) {
  const scale = parseInt(document.getElementById('sScale').value, 10) || 2;
  const c = flatten(scale, transparent);
  const a = document.createElement('a');
  a.download = 'mandala-' + (transparent ? 'transparent-' : '') + Date.now() + '.png';
  a.href = c.toDataURL('image/png');
  a.click();
  toast('PNG ' + (transparent ? 'transparent ' : '') + 'exported at ' + (SIZE*scale) + 'px', 'fa-download');
}
function copyPNG(transparent) {
  const scale = parseInt(document.getElementById('sScale').value, 10) || 2;
  const c = flatten(scale, transparent);
  if (!navigator.clipboard || !window.ClipboardItem) { toast('Clipboard unsupported', 'fa-triangle-exclamation'); return; }
  c.toBlob(async blob => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast('Copied to clipboard', 'fa-clipboard');
    } catch(err) { toast('Copy failed', 'fa-triangle-exclamation'); }
  }, 'image/png');
}

/* ================================================================
   SVG EXPORT (STATIC)
   ================================================================ */
function downloadSVG() {
  const svg = buildSVG();
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.download = 'mandala-' + Date.now() + '.svg';
  a.href = URL.createObjectURL(blob);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('SVG exported · ' + vectorElements.length + ' vectors', 'fa-bezier-curve');
}
function buildSVG() {
  const parts = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + SIZE + ' ' + SIZE + '" width="' + SIZE + '" height="' + SIZE + '">');
  if (!S.transparent) parts.push('<rect width="' + SIZE + '" height="' + SIZE + '" fill="' + S.bg + '"/>');
  for (const l of layers) {
    if (!l.visible || l.opacity <= 0) continue;
    const layerVecs = vectorElements.filter(e => e.layerId === l.id);
    if (layerVecs.length === 0) continue;
    parts.push('<g opacity="' + l.opacity + '" style="mix-blend-mode:' + mapBlend(l.blend) + '">');
    layerVecs.forEach(el => parts.push(renderVector(el)));
    parts.push('</g>');
  }
  parts.push('</svg>');
  return parts.join('\n');
}
function mapBlend(b) {
  if (b === 'source-over') return 'normal';
  if (b === 'lighter') return 'screen';
  return b;
}
function renderVector(el) {
  const inner = vectorToSVG(el);
  if (!inner) return '';
  const sym = el.sym || { mode: 'none', segments: 1, mirror: false, rotation: 0, spiral: 1 };
  if (sym.mode === 'none' || sym.segments <= 1) return inner;

  const parts = [];
  const n = Math.max(1, sym.segments | 0);
  const step = 360 / n;
  const off = sym.rotation || 0;

  for (let i = 0; i < n; i++) {
    const angle = off + i * step;
    parts.push('<g transform="rotate(' + angle.toFixed(3) + ' ' + CX + ' ' + CY + ')">' + inner + '</g>');
    if (sym.mirror) {
      parts.push('<g transform="rotate(' + angle.toFixed(3) + ' ' + CX + ' ' + CY + ') matrix(1,0,0,-1,0,' + SIZE + ')">' + inner + '</g>');
    }
  }
  return parts.join('');
}
function vectorToSVG(el) {
  const color = el.color || '#fff';
  const width = el.width || 4;
  const opacity = el.opacity != null ? el.opacity : 1;
  const style = el.style || 'solid';

  const strokeAttrs = 'stroke="' + color + '" stroke-width="' + width + '" stroke-opacity="' + opacity + '" stroke-linecap="round" stroke-linejoin="round"';
  const dashAttr = style === 'dashed' ? ' stroke-dasharray="' + (width*2.2) + ' ' + (width*1.6) + '"' :
                   style === 'dotted' ? ' stroke-dasharray="0.1 ' + (width*2.4) + '"' : '';
  const fillAttr = el.fill ? 'fill="' + color + '" fill-opacity="' + (opacity*0.35) + '"' : 'fill="none"';

  switch (el.type) {
    case 'path': {
      const pts = el.points;
      if (!pts || pts.length < 2) return '';
      let d = 'M ' + pts[0].x.toFixed(2) + ' ' + pts[0].y.toFixed(2);
      for (let i = 1; i < pts.length; i++) d += ' L ' + pts[i].x.toFixed(2) + ' ' + pts[i].y.toFixed(2);
      return '<path d="' + d + '" ' + fillAttr + ' ' + strokeAttrs + dashAttr + '/>';
    }
    case 'erase': {
      const pts = el.points;
      if (!pts || pts.length < 2) return '';
      let d = 'M ' + pts[0].x.toFixed(2) + ' ' + pts[0].y.toFixed(2);
      for (let i = 1; i < pts.length; i++) d += ' L ' + pts[i].x.toFixed(2) + ' ' + pts[i].y.toFixed(2);
      return '<path d="' + d + '" fill="none" stroke="' + (S.transparent ? '#000' : S.bg) + '" stroke-width="' + width + '" stroke-linecap="round" stroke-opacity="' + opacity + '"/>';
    }
    case 'line':
      return '<line x1="' + el.x1 + '" y1="' + el.y1 + '" x2="' + el.x2 + '" y2="' + el.y2 + '" ' + strokeAttrs + '/>';
    case 'arc': {
      const x1 = el.cx + Math.cos(el.a1) * el.r;
      const y1 = el.cy + Math.sin(el.a1) * el.r;
      const x2 = el.cx + Math.cos(el.a2) * el.r;
      const y2 = el.cy + Math.sin(el.a2) * el.r;
      const large = Math.abs(el.a2 - el.a1) > Math.PI ? 1 : 0;
      const sweep = el.a2 > el.a1 ? 1 : 0;
      const d = 'M ' + x1.toFixed(2) + ' ' + y1.toFixed(2) +
                ' A ' + el.r + ' ' + el.r + ' 0 ' + large + ' ' + sweep + ' ' + x2.toFixed(2) + ' ' + y2.toFixed(2);
      return '<path d="' + d + '" ' + fillAttr + ' ' + strokeAttrs + '/>';
    }
    case 'circle':
      return '<circle cx="' + el.cx + '" cy="' + el.cy + '" r="' + el.r + '" ' + fillAttr + ' ' + strokeAttrs + '/>';
    case 'polygon': {
      const pts = [];
      for (let i = 0; i < el.n; i++) {
        const t = el.rotation + (i * TAU) / el.n;
        pts.push((el.cx + Math.cos(t) * el.r).toFixed(2) + ',' + (el.cy + Math.sin(t) * el.r).toFixed(2));
      }
      return '<polygon points="' + pts.join(' ') + '" ' + fillAttr + ' ' + strokeAttrs + '/>';
    }
    case 'star': {
      const pts = [];
      for (let i = 0; i < el.n * 2; i++) {
        const t = el.rotation + (i * Math.PI) / el.n;
        const rr = (i % 2 === 0) ? el.r : el.r * el.inset;
        pts.push((el.cx + Math.cos(t) * rr).toFixed(2) + ',' + (el.cy + Math.sin(t) * rr).toFixed(2));
      }
      return '<polygon points="' + pts.join(' ') + '" ' + fillAttr + ' ' + strokeAttrs + '/>';
    }
    case 'petal': {
      const tipX = el.cx + Math.cos(el.ang) * el.r;
      const tipY = el.cy + Math.sin(el.ang) * el.r;
      const perp = el.ang + Math.PI / 2;
      const c1x = el.cx + Math.cos(perp) * el.cw, c1y = el.cy + Math.sin(perp) * el.cw;
      const c2x = el.cx - Math.cos(perp) * el.cw, c2y = el.cy - Math.sin(perp) * el.cw;
      const d = 'M ' + el.cx + ' ' + el.cy +
                ' Q ' + c1x.toFixed(2) + ' ' + c1y.toFixed(2) + ' ' + tipX.toFixed(2) + ' ' + tipY.toFixed(2) +
                ' Q ' + c2x.toFixed(2) + ' ' + c2y.toFixed(2) + ' ' + el.cx + ' ' + el.cy + ' Z';
      return '<path d="' + d + '" ' + fillAttr + ' ' + strokeAttrs + '/>';
    }
    case 'dot':
      return '<circle cx="' + el.cx.toFixed(2) + '" cy="' + el.cy.toFixed(2) + '" r="' + el.r + '" fill="' + color + '" fill-opacity="' + opacity + '"/>';
    case 'text': {
      const bold = el.bold ? ' font-weight="700"' : '';
      const italic = el.italic ? ' font-style="italic"' : '';
      return '<text x="' + el.x.toFixed(2) + '" y="' + el.y.toFixed(2) + '" font-family="' + el.fontFamily + '" font-size="' + el.fontSize + '"' + bold + italic + ' fill="' + color + '" fill-opacity="' + opacity + '" text-anchor="middle" dominant-baseline="middle">' + escapeXML(el.text) + '</text>';
    }
    case 'radial-gradient':
      return '<circle cx="' + el.cx + '" cy="' + el.cy + '" r="' + el.r + '" fill="' + color + '" fill-opacity="' + (opacity * 0.35) + '"/>';
    case 'ring':
      return ringToSVG(el);
    case 'sunburst': {
      const parts = [];
      for (let i = 0; i < 36; i++) {
        const a = i * TAU / 36;
        parts.push('<line x1="' + (el.cx + Math.cos(a) * 60) + '" y1="' + (el.cy + Math.sin(a) * 60) +
                   '" x2="' + (el.cx + Math.cos(a) * 480) + '" y2="' + (el.cy + Math.sin(a) * 480) +
                   '" stroke="' + color + '" stroke-width="' + width + '" stroke-opacity="' + opacity + '"/>');
      }
      for (let i = 0; i < 4; i++) {
        parts.push('<circle cx="' + el.cx + '" cy="' + el.cy + '" r="' + (60 + i * 90) + '" fill="none" stroke="' + color + '" stroke-width="' + width + '" stroke-opacity="' + opacity + '"/>');
      }
      return parts.join('');
    }
    case 'web': {
      const parts = [];
      const cx = el.cx, cy = el.cy, n = 16;
      for (let i = 0; i < n; i++) {
        const a = i * TAU / n;
        parts.push('<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + Math.cos(a) * 480) + '" y2="' + (cy + Math.sin(a) * 480) + '" stroke="' + color + '" stroke-width="' + width + '" stroke-opacity="' + opacity + '"/>');
      }
      for (let ring = 1; ring <= 8; ring++) {
        const r = 60 + ring * 55;
        let d = '';
        for (let i = 0; i <= n; i++) {
          const a = i * TAU / n;
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          d += (i === 0 ? 'M ' : ' L ') + x.toFixed(1) + ' ' + y.toFixed(1);
        }
        parts.push('<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + width + '" stroke-opacity="' + opacity + '"/>');
      }
      return parts.join('');
    }
    case 'spiral': {
      const phi = (1 + Math.sqrt(5)) / 2;
      let r = 10, a = 0, d = '', first = true;
      for (let i = 0; i < 800; i++) {
        a += 0.08;
        r = 10 * Math.pow(phi, a / (Math.PI / 2));
        if (r > 500) break;
        d += (first ? 'M ' : ' L ') + (el.cx + Math.cos(a) * r).toFixed(2) + ' ' + (el.cy + Math.sin(a) * r).toFixed(2);
        first = false;
      }
      return '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + width + '" stroke-opacity="' + opacity + '"/>';
    }
    case 'auto-mandala':
      return '';
  }
  return '';
}
function ringToSVG(el) {
  const color = el.color || '#fff';
  const width = el.width || 4;
  const opacity = el.opacity != null ? el.opacity : 1;
  const cx = CX, cy = CY;
  const x = cx + Math.cos(el.ang) * el.r;
  const y = cy + Math.sin(el.ang) * el.r;
  const sz = el.sz;
  const fillAttr = el.fill ? 'fill="' + color + '" fill-opacity="' + (opacity * 0.35) + '"' : 'fill="none"';

  switch (el.ringType) {
    case 'dot':
      return '<circle cx="' + x.toFixed(2) + '" cy="' + y.toFixed(2) + '" r="' + (sz / 2) + '" fill="' + color + '" fill-opacity="' + opacity + '"/>';
    case 'petal': {
      const perp = el.ang + Math.PI / 2;
      const cw = sz * 0.55;
      const c1x = x + Math.cos(perp) * cw, c1y = y + Math.sin(perp) * cw;
      const c2x = x - Math.cos(perp) * cw, c2y = y - Math.sin(perp) * cw;
      const tipX = cx + Math.cos(el.ang) * (el.r + sz * 0.9);
      const tipY = cy + Math.sin(el.ang) * (el.r + sz * 0.9);
      const d = 'M ' + x.toFixed(2) + ' ' + y.toFixed(2) +
                ' Q ' + c1x.toFixed(2) + ' ' + c1y.toFixed(2) + ' ' + tipX.toFixed(2) + ' ' + tipY.toFixed(2) +
                ' Q ' + c2x.toFixed(2) + ' ' + c2y.toFixed(2) + ' ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' Z';
      return '<path d="' + d + '" ' + fillAttr + ' stroke="' + color + '" stroke-width="' + width + '" stroke-opacity="' + opacity + '"/>';
    }
    case 'triangle':
    case 'diamond': {
      const n = (el.ringType === 'triangle') ? 3 : 4;
      const start = el.ang - Math.PI / 2;
      const pts = [];
      for (let i = 0; i < n; i++) {
        const t = start + (i * TAU) / n;
        pts.push((x + Math.cos(t) * (sz / 2)).toFixed(2) + ',' + (y + Math.sin(t) * (sz / 2)).toFixed(2));
      }
      return '<polygon points="' + pts.join(' ') + '" ' + fillAttr + ' stroke="' + color + '" stroke-width="' + width + '" stroke-opacity="' + opacity + '"/>';
    }
    case 'scallop': {
      const rr = sz / 2;
      const a1 = Math.PI * 0.15, a2 = Math.PI * 0.85;
      const sx = x + Math.cos(a1 - Math.PI / 2) * rr, sy = y + Math.sin(a1 - Math.PI / 2) * rr;
      const ex = x + Math.cos(a2 - Math.PI / 2) * rr, ey = y + Math.sin(a2 - Math.PI / 2) * rr;
      const d = 'M ' + sx.toFixed(2) + ' ' + sy.toFixed(2) + ' A ' + rr + ' ' + rr + ' 0 0 1 ' + ex.toFixed(2) + ' ' + ey.toFixed(2);
      return '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + width + '" stroke-opacity="' + opacity + '"/>';
    }
    case 'spoke': {
      const tipX = cx + Math.cos(el.ang) * (el.r + sz);
      const tipY = cy + Math.sin(el.ang) * (el.r + sz);
      return '<line x1="' + x.toFixed(2) + '" y1="' + y.toFixed(2) + '" x2="' + tipX.toFixed(2) + '" y2="' + tipY.toFixed(2) + '" stroke="' + color + '" stroke-width="' + width + '" stroke-opacity="' + opacity + '"/>';
    }
    case 'teardrop': {
      const perp = el.ang + Math.PI / 2;
      const cw = sz * 0.42;
      const tipX = cx + Math.cos(el.ang) * (el.r + sz * 0.8);
      const tipY = cy + Math.sin(el.ang) * (el.r + sz * 0.8);
      const bx = x - Math.cos(perp) * cw, by = y - Math.sin(perp) * cw;
      const d = 'M ' + bx.toFixed(2) + ' ' + by.toFixed(2) +
                ' Q ' + (x + Math.cos(perp) * cw * 1.4).toFixed(2) + ' ' + (y + Math.sin(perp) * cw * 1.4).toFixed(2) + ' ' + tipX.toFixed(2) + ' ' + tipY.toFixed(2) +
                ' Q ' + (x - Math.cos(perp) * cw * 1.4).toFixed(2) + ' ' + (y - Math.sin(perp) * cw * 1.4).toFixed(2) + ' ' + bx.toFixed(2) + ' ' + by.toFixed(2) + ' Z';
      return '<path d="' + d + '" ' + fillAttr + ' stroke="' + color + '" stroke-width="' + width + '" stroke-opacity="' + opacity + '"/>';
    }
    case 'lens': {
      const perp = el.ang + Math.PI / 2;
      const cw = sz * 0.65;
      const tipX = cx + Math.cos(el.ang) * (el.r + sz);
      const tipY = cy + Math.sin(el.ang) * (el.r + sz);
      const bx = cx + Math.cos(el.ang) * (el.r - sz);
      const by = cy + Math.sin(el.ang) * (el.r - sz);
      const d = 'M ' + bx.toFixed(2) + ' ' + by.toFixed(2) +
                ' Q ' + (x + Math.cos(perp) * cw).toFixed(2) + ' ' + (y + Math.sin(perp) * cw).toFixed(2) + ' ' + tipX.toFixed(2) + ' ' + tipY.toFixed(2) +
                ' Q ' + (x - Math.cos(perp) * cw).toFixed(2) + ' ' + (y - Math.sin(perp) * cw).toFixed(2) + ' ' + bx.toFixed(2) + ' ' + by.toFixed(2) + ' Z';
      return '<path d="' + d + '" ' + fillAttr + ' stroke="' + color + '" stroke-width="' + width + '" stroke-opacity="' + opacity + '"/>';
    }
    case 'sunburst': {
      const perp = el.ang + Math.PI / 2;
      const cw = sz * 0.25;
      const tipX = cx + Math.cos(el.ang) * (el.r + sz * 1.3);
      const tipY = cy + Math.sin(el.ang) * (el.r + sz * 1.3);
      const d = 'M ' + (x - Math.cos(perp) * cw).toFixed(2) + ' ' + (y - Math.sin(perp) * cw).toFixed(2) +
                ' L ' + tipX.toFixed(2) + ' ' + tipY.toFixed(2) +
                ' L ' + (x + Math.cos(perp) * cw).toFixed(2) + ' ' + (y + Math.sin(perp) * cw).toFixed(2);
      return '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + width + '" stroke-opacity="' + opacity + '"/>';
    }
  }
  return '';
}
function escapeXML(s) {
  return String(s).replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));
}

/* ================================================================
   PROJECT SAVE / LOAD
   ================================================================ */
function serializeLayers() {
  return layers.map(l => ({
    id: l.id, name: l.name, opacity: l.opacity, visible: l.visible,
    blend: l.blend, locked: l.locked,
    anim: JSON.parse(JSON.stringify(l.anim || defaultLayerAnim())),
    img: l.canvas.toDataURL('image/png')
  }));
}
function projectData() {
  return {
    v: 5,
    state: JSON.parse(JSON.stringify(S)),
    anim: JSON.parse(JSON.stringify(ANIM.props)),
    animDur: ANIM.duration,
    animSpeed: ANIM.speed,
    activeLayerId,
    vectors: vectorElements,
    layers: serializeLayers()
  };
}
function saveProject() {
  try {
    localStorage.setItem('mandala-studio-pro5', JSON.stringify(projectData()));
    toast('Project saved', 'fa-floppy-disk');
  } catch(err) { toast('Save failed — storage full', 'fa-triangle-exclamation'); }
}
function loadProject() {
  const raw = localStorage.getItem('mandala-studio-pro5') ||
              localStorage.getItem('mandala-studio-pro4') ||
              localStorage.getItem('mandala-studio-pro3');
  if (!raw) { toast('No saved project', 'fa-folder-open'); return; }
  try {
    restoreProject(JSON.parse(raw));
    toast('Project loaded', 'fa-folder-open');
  } catch(err) { toast('Load failed', 'fa-triangle-exclamation'); }
}
function restoreProject(data) {
  Object.assign(S, data.state || {});
  if (data.anim) Object.assign(ANIM.props, data.anim);
  if (data.animDur) ANIM.duration = data.animDur;
  if (data.animSpeed) ANIM.speed = data.animSpeed;
  vectorElements = data.vectors || [];
  layers.length = 0;
  const pending = data.layers.length;
  let loaded = 0;
  data.layers.forEach(ld => {
    const l = makeLayer(ld.name);
    l.id = ld.id;
    l.opacity = ld.opacity;
    l.visible = ld.visible;
    l.blend = ld.blend;
    l.locked = ld.locked;
    l.anim = ld.anim ? JSON.parse(JSON.stringify(ld.anim)) : defaultLayerAnim();
    const img = new Image();
    img.onload = () => {
      l.ctx.drawImage(img, 0, 0, SIZE, SIZE);
      loaded++;
      if (loaded === pending) {
        activeLayerId = data.activeLayerId || layers[layers.length - 1].id;
        syncAllUI();
        syncAnimUI();
        renderLayerUI();
        render();
        drawGuides();
        updateVecCount();
      }
    };
    img.src = ld.img;
    layers.push(l);
  });
}
function exportJSON() {
  const blob = new Blob([JSON.stringify(projectData())], { type: 'application/json' });
  const a = document.createElement('a');
  a.download = 'mandala-' + Date.now() + '.json';
  a.href = URL.createObjectURL(blob);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Exported .json', 'fa-file-code');
}
function importJSON() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json,application/json';
  inp.onchange = () => {
    const f = inp.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { restoreProject(JSON.parse(reader.result)); toast('Project imported', 'fa-upload'); }
      catch(err) { toast('Invalid file', 'fa-triangle-exclamation'); }
    };
    reader.readAsText(f);
  };
  inp.click();
}
function importReference() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = () => {
    const f = inp.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        rctx.clearRect(0, 0, SIZE, SIZE);
        refSrcCtx.clearRect(0, 0, SIZE, SIZE);
        const scale = Math.min(SIZE / img.width, SIZE / img.height);
        const w = img.width * scale, h = img.height * scale;
        rctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
        refCv.style.opacity = S.refOpacity;
        toast('Reference imported', 'fa-image');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(f);
  };
  inp.click();
}

/* ================================================================
   RESET
   ================================================================ */
function resetAll() {
  layers.length = 0;
  layerSeq = 1;
  vectorElements = [];
  addLayer('Layer 1', true);
  activeLayerId = layers[0].id;
  history = []; hIndex = -1;
  pushHistory();
  renderLayerUI(); render(); drawGuides(); updateVecCount();
  toast('New project', 'fa-file');
}

/* ================================================================
   SYNC UI FROM STATE
   ================================================================ */
function syncAllUI() {
  const map = [
    ['rSeg', 'vSeg', S.segments, v => v],
    ['rRot', 'vRot', S.rotation, v => v + '°'],
    ['rSpiral', 'vSpiral', Math.round(S.spiralFactor * 100), v => (v / 100).toFixed(2)],
    ['rSize', 'vSize', S.size, v => v],
    ['rOpa', 'vOpa', Math.round(S.opacity * 100), v => v + '%'],
    ['rGlow', 'vGlow', S.glow, v => v],
    ['rSmooth', 'vSmooth', Math.round(S.smooth * 100), v => (v / 100).toFixed(2)],
    ['rSides', 'vSides', S.sides, v => v],
    ['rPoints', 'vPoints', S.points, v => v],
    ['rInset', 'vInset', Math.round(S.inset * 100), v => v + '%'],
    ['rPetal', 'vPetal', Math.round(S.petalW * 100), v => v + '%'],
    ['rSpacing', 'vSpacing', S.spacing, v => v],
    ['rDotSize', 'vDotSize', S.dotSize, v => v],
    ['rSprR', 'vSprR', S.sprayR, v => v],
    ['rSprD', 'vSprD', S.sprayD, v => v],
    ['rRings', 'vRings', S.guideRings, v => v],
    ['rRingR', 'vRingR', S.ringR, v => v],
    ['rRingS', 'vRingS', S.ringSize, v => v],
    ['rFontSize', 'vFontSize', S.fontSize, v => v],
    ['rRefOpa', 'vRefOpa', Math.round(S.refOpacity * 100), v => v + '%']
  ];
  map.forEach(([rid, vid, val, fmt]) => {
    const el = document.getElementById(rid);
    const out = document.getElementById(vid);
    if (!el) return;
    el.value = val;
    if (out) out.textContent = fmt(val);
    paintRange(el);
  });
  const sw = {
    cMirror: S.mirror, cSnap: S.snap, cTaper: S.taper, cRainbow: S.rainbow,
    cFill: S.fill, cGuides: S.guides, cAxes: S.axes, cCenter: S.centerMark,
    cPolarGrid: S.polarGrid, cGolden: S.golden, cTransBg: S.transparent,
    cBold: S.bold, cItalic: S.italic
  };
  Object.keys(sw).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = !!sw[id];
  });
  document.getElementById('sStyle').value = S.style;
  document.getElementById('sRingType').value = S.ringType;
  document.getElementById('sFont').value = S.font;
  bgPick.value = S.bg;
  setColor(S.color);
  sbSeg.textContent = S.segments;
  sbMirror.textContent = S.mirror ? ' · mirror' : '';
  applyPaper();
  document.querySelectorAll('[data-symmode]').forEach(b => {
    b.classList.toggle('active', b.dataset.symmode === S.symMode);
  });
  document.getElementById('spiralField').style.display = (S.symMode === 'spiral') ? '' : 'none';
  refCv.style.opacity = S.refOpacity;
}

/* ================================================================
   ZOOM
   ================================================================ */
let zoom = 1;
const BASE = 660;
function setZoom(z) {
  zoom = clamp(z, 0.25, 4);
  const size = Math.round(BASE * zoom);
  stage.style.width = size + 'px';
  stage.style.height = size + 'px';
  document.getElementById('zoomLabel').textContent = Math.round(zoom * 100) + '%';
}
document.getElementById('zoomIn').addEventListener('click', () => setZoom(zoom * 1.2));
document.getElementById('zoomOut').addEventListener('click', () => setZoom(zoom / 1.2));
document.getElementById('zoomFit').addEventListener('click', fitZoom);
function fitZoom() {
  const pad = 64;
  const w = viewport.clientWidth - pad, h = viewport.clientHeight - pad;
  setZoom(clamp(Math.min(w, h) / BASE, 0.25, 2));
}
viewport.addEventListener('wheel', e => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    setZoom(zoom * (e.deltaY < 0 ? 1.1 : 0.9));
  }
}, { passive: false });

/* ================================================================
   KEYBOARD
   ================================================================ */
const toolKeys = {
  b: 'brush', e: 'eraser', g: 'fill', h: 'gradient',
  l: 'line', a: 'arc', c: 'circle', p: 'polygon', s: 'star', f: 'petal',
  d: 'dot', r: 'spray', t: 'text', i: 'picker', m: 'move'
};
document.addEventListener('keydown', e => {
  const tag = (e.target.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 's') { e.preventDefault(); downloadPNG(false); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (k === '?') { e.preventDefault(); showHelp(); return; }
  if (k === ' ' || e.code === 'Space') { e.preventDefault(); animToggle(); return; }
  if (toolKeys[k]) { setTool(toolKeys[k]); return; }
  if (k === '[') {
    S.size = Math.max(1, Math.round(S.size * 0.85));
    document.getElementById('rSize').value = S.size;
    document.getElementById('vSize').textContent = S.size;
    paintRange(document.getElementById('rSize'));
  }
  if (k === ']') {
    S.size = Math.min(140, Math.round(S.size * 1.15));
    document.getElementById('rSize').value = S.size;
    document.getElementById('vSize').textContent = S.size;
    paintRange(document.getElementById('rSize'));
  }
  if (/^[1-9]$/.test(k)) {
    const presets = { 1: 4, 2: 6, 3: 8, 4: 12, 5: 16, 6: 24, 7: 36, 8: 48, 9: 72 };
    if (presets[k]) {
      S.segments = presets[k];
      document.getElementById('rSeg').value = S.segments;
      document.getElementById('vSeg').textContent = S.segments;
      paintRange(document.getElementById('rSeg'));
      sbSeg.textContent = S.segments;
      drawGuides();
    }
  }
});

/* ================================================================
   RIPPLE
   ================================================================ */
document.querySelectorAll('.btn, .tb-btn, .tab, .tool, .tpl').forEach(el => {
  el.addEventListener('click', function(e) {
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const rip = document.createElement('span');
    rip.className = 'ripple';
    rip.style.width = rip.style.height = size + 'px';
    rip.style.left = x + 'px';
    rip.style.top = y + 'px';
    this.appendChild(rip);
    setTimeout(() => rip.remove(), 700);
  });
});

/* ================================================================
   TOAST
   ================================================================ */
function toast(msg, icon) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = (icon ? '<i class="fas ' + icon + '"></i>' : '') + msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity .35s ease, transform .35s ease';
    t.style.opacity = '0';
    t.style.transform = 'translate(-50%, 18px)';
    setTimeout(() => t.remove(), 380);
  }, 2200);
}

/* ================================================================
   LOGO / BRAND MARK  (falls back to a letter if logo.png is absent)
   ================================================================ */
function wireLogo(imgEl, fallbackEl, markEl) {
  if (!imgEl) return;
  const ok = () => { if (markEl) markEl.classList.add('has-logo'); if (fallbackEl) fallbackEl.style.display = 'none'; };
  const fail = () => {
    if (imgEl) imgEl.remove();
    if (fallbackEl) fallbackEl.style.display = 'flex';
    if (markEl) markEl.classList.remove('has-logo');
  };
  if (imgEl.complete && imgEl.naturalWidth > 0) ok();
  imgEl.addEventListener('load', ok);
  imgEl.addEventListener('error', fail);
}

/* ================================================================
   SPLASH SCREEN CONTROLLER
   ================================================================ */
function runSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;

  const bar = document.getElementById('splashBarFill');
  if (bar) bar.style.animationDuration = SPLASH_HOLD_MS + 'ms';
  splash.style.transitionDuration = SPLASH_FADE_MS + 'ms';

  let done = false;
  const dismiss = () => {
    if (done) return;
    done = true;
    splash.classList.add('hide');
    setTimeout(() => { if (splash.parentNode) splash.parentNode.removeChild(splash); }, SPLASH_FADE_MS + 80);
  };

  const start = () => setTimeout(dismiss, SPLASH_HOLD_MS);

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });

  /* failsafe: never let the splash trap the user */
  setTimeout(dismiss, SPLASH_HOLD_MS + SPLASH_FADE_MS + 5000);
}

/* ================================================================
   BOOT
   ================================================================ */
function boot() {
  /* logo wiring */
  wireLogo(document.getElementById('brandLogo'), document.getElementById('brandFallback'), document.getElementById('brandMark'));
  wireLogo(document.getElementById('splashLogo'), document.getElementById('splashFallback'), null);
  runSplash();

  addLayer('Layer 1', true);
  activeLayerId = layers[0].id;
  pushHistory();
  buildPalette();
  renderHarmonyPalette(['#7c6cf0', '#a29bfe', '#c4b5fd', '#5a4bd1', '#8b7bf7', '#4a3f8a', '#e84393', '#00cec9']);
  applyPaper();
  setColor(S.color);
  drawGuides();
  render();
  renderLayerUI();
  renderTrackList();
  syncAllUI();
  syncAnimUI();
  updateHistoryUI();
  updateVecCount();
  updateRecordUI();
  setZoom(1);
  setTool('brush');

  /* welcome toast — waits for the splash to finish */
  setTimeout(() => {
    toast('Welcome to Mandala Studio — drag the move bars to resize panels. Press ? for shortcuts', 'fa-wand-magic-sparkles');
  }, SPLASH_HOLD_MS + SPLASH_FADE_MS + 250);

  console.log('%c🪷 Mandala Studio — Pro Vector + Per-Layer Animation', 'color:#a29bfe;font-weight:800;font-size:15px;');
  console.log('%cPNG · Transparent PNG · SVG · Animated SVG · WebM · Layers · Per-layer timelines · Symmetry · Templates', 'color:#6c85a0;');
  console.log('%cSplash timing → hold: ' + SPLASH_HOLD_MS + 'ms · fade: ' + SPLASH_FADE_MS + 'ms', 'color:#4ade80;');
  console.log('%cAssets → /src/   |   Model → /model/', 'color:#7c6cf0;');
}
boot();

})();