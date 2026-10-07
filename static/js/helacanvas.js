/* ============================================================
   PIXELFORGE — Professional Image Editor (Complete & Fixed)
   + Logo support (/static/logo.png)
   ============================================================ */
(function(){
'use strict';

/* ============ LOGO CONFIG ============ */
const LOGO_SRC = '/static/logo.png';

/* ============ FONT LIBRARY ============ */
const FONTS = [
  {name:'Inter',cat:'sans'},{name:'Roboto',cat:'sans'},{name:'Open Sans',cat:'sans'},
  {name:'Lato',cat:'sans'},{name:'Montserrat',cat:'sans'},{name:'Poppins',cat:'sans'},
  {name:'Raleway',cat:'sans'},{name:'Nunito',cat:'sans'},{name:'Rubik',cat:'sans'},
  {name:'Work Sans',cat:'sans'},{name:'Josefin Sans',cat:'sans'},{name:'Archivo',cat:'sans'},
  {name:'Playfair Display',cat:'serif'},{name:'Lora',cat:'serif'},{name:'Merriweather',cat:'serif'},
  {name:'Cinzel',cat:'serif'},{name:'Cormorant Garamond',cat:'serif'},
  {name:'Source Code Pro',cat:'mono'},
  {name:'Oswald',cat:'display'},{name:'Bebas Neue',cat:'display'},{name:'Lobster',cat:'display'},{name:'Anton',cat:'display'},
  {name:'Pacifico',cat:'script'},{name:'Dancing Script',cat:'script'},{name:'Great Vibes',cat:'script'},
  {name:'Caveat',cat:'script'},{name:'Shadows Into Light',cat:'script'},{name:'Indie Flower',cat:'script'},
  {name:'Permanent Marker',cat:'script'},{name:'Satisfy',cat:'script'},{name:'Courgette',cat:'script'},
  {name:'Arial',cat:'sys'},{name:'Georgia',cat:'sys'},{name:'Times New Roman',cat:'sys'},{name:'Courier New',cat:'sys'}
];

/* ============ STATE ============ */
const S = {
  canvas:null,
  tool:'select',
  fg:'#1473e6',
  bg:'#ffffff',
  brushSize:10,
  brushOpacity:1,
  fontFamily:'Inter',
  fontSize:48,
  fontWeight:'400',
  fontStyle:'normal',
  textAlign:'left',
  underline:false,
  history:[],
  historyIndex:-1,
  maxHistory:80,
  skipHistory:false,
  drawing:false,
  drawStart:null,
  drawShape:null,
  cropRect:null,
  panning:false,
  panStart:null,
  panVpt:null,
  clipboard:null,
  docName:'Untitled-1',
  spaceDown:false,
  sidebarVisible:true,
  ready:false,
  _resizeT:null
};

const $  = function(s,c){ return (c||document).querySelector(s); };
const $$ = function(s,c){ return Array.prototype.slice.call((c||document).querySelectorAll(s)); };

/* ============ UTILS ============ */
function toast(msg,type,dur){
  type = type || 'info';
  dur = dur || 2200;
  const wrap = $('#toastWrap');
  if(!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  const icons = {success:'✓',error:'✕',info:'ℹ'};
  el.innerHTML =
    '<img src="' + LOGO_SRC + '" alt="" class="toast-logo" onerror="this.remove();">' +
    '<span style="opacity:.8;font-weight:700">'+(icons[type]||'')+'</span><span>'+msg+'</span>';
  wrap.appendChild(el);
  setTimeout(function(){
    el.style.transition = 'opacity .25s, transform .25s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    setTimeout(function(){ el.remove(); }, 260);
  }, dur);
}

function hexNorm(v){
  if(!v) return null;
  v = String(v).trim();
  if(v.charAt(0) !== '#') v = '#' + v;
  if(/^#[0-9a-f]{3}$/i.test(v)){
    v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
  }
  return /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : null;
}

function rgbToHex(r,g,b){
  return '#' + [r,g,b].map(function(v){ return v.toString(16).padStart(2,'0'); }).join('');
}

function scenePoint(opt){
  if(opt && opt.pointer && typeof opt.pointer.x === 'number'){
    return { x: opt.pointer.x, y: opt.pointer.y };
  }
  try{
    const p = S.canvas.getPointer(opt.e);
    return { x: p.x, y: p.y };
  }catch(e){}
  return { x: 0, y: 0 };
}

function renderObjectsToCanvasEl(objs, w, h, multiplier){
  multiplier = multiplier || 1;
  const el = document.createElement('canvas');
  el.width  = Math.max(1, Math.round(w * multiplier));
  el.height = Math.max(1, Math.round(h * multiplier));
  const ctx = el.getContext('2d');
  if(multiplier !== 1) ctx.scale(multiplier, multiplier);

  const prevSkip = S.canvas.skipOffscreen;
  S.canvas.skipOffscreen = false;
  try{
    objs.forEach(function(o){
      try{
        ctx.save();
        o.render(ctx);
        ctx.restore();
      }catch(err){
        try{ ctx.restore(); }catch(e2){}
      }
    });
  }finally{
    S.canvas.skipOffscreen = prevSkip;
  }
  return el;
}

function makeThumb(obj, size){
  size = size || 24;
  try{
    const b = obj.getBoundingRect(true);
    if(!b || !isFinite(b.width) || !isFinite(b.height) || b.width <= 0 || b.height <= 0) return '';
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const cx = c.getContext('2d');
    const sc = Math.min(size / b.width, size / b.height, 1);
    const dw = b.width * sc, dh = b.height * sc;
    cx.translate((size - dw) / 2, (size - dh) / 2);
    cx.scale(sc, sc);
    cx.translate(-b.left, -b.top);

    const prevSkip = S.canvas.skipOffscreen;
    S.canvas.skipOffscreen = false;
    try{
      cx.save();
      obj.render(cx);
      cx.restore();
    }catch(e){
      try{ cx.restore(); }catch(e2){}
    }
    S.canvas.skipOffscreen = prevSkip;
    return c.toDataURL();
  }catch(e){
    return '';
  }
}

/* ============ CANVAS INIT ============ */
function initCanvas(w, h, bg){
  w = w || 1200;
  h = h || 800;
  bg = (bg === undefined) ? '#ffffff' : bg;

  const wrap = $('#canvasWrap');

  if(S.canvas){
    try{ S.canvas.dispose(); }catch(e){}
    S.canvas = null;
  }

  wrap.innerHTML = '';

  const canvasEl = document.createElement('canvas');
  canvasEl.id = 'pfCanvas';
  wrap.appendChild(canvasEl);

  S.canvas = new fabric.Canvas(canvasEl, {
    width: w,
    height: h,
    backgroundColor: (bg === 'transparent') ? '' : bg,
    preserveObjectStacking: true,
    selection: true,
    controlsAboveOverlay: true,
    fireRightClick: true,
    stopContextMenu: true,
    selectionColor: 'rgba(20,115,230,0.15)',
    selectionBorderColor: '#1473e6',
    selectionLineWidth: 1
  });

  fabric.Object.prototype.set({
    cornerStyle: 'circle',
    cornerSize: 9,
    cornerColor: '#1473e6',
    cornerStrokeColor: '#ffffff',
    cornerStrokeWidth: 1.5,
    transparentCorners: false,
    borderColor: '#1473e6',
    borderScaleFactor: 1.2,
    padding: 2,
    rotatingPointOffset: 26
  });

  S.canvas.on('selection:created', onSelectionChange);
  S.canvas.on('selection:updated', onSelectionChange);
  S.canvas.on('selection:cleared', onSelectionChange);
  S.canvas.on('object:modified', function(){ saveHistory('Modify'); updateLayerPanel(); });
  S.canvas.on('object:added', function(e){
    if(!S.skipHistory && e.target && !e.target.excludeFromExport){
      updateLayerPanel();
      updateStatusBar();
    }
  });
  S.canvas.on('object:removed', function(){ updateLayerPanel(); updateStatusBar(); });
  S.canvas.on('mouse:move', onMouseMove);
  S.canvas.on('mouse:down', onMouseDown);
  S.canvas.on('mouse:up', onMouseUp);
  S.canvas.on('mouse:wheel', onMouseWheel);
  S.canvas.on('mouse:dblclick', onMouseDblClick);
  S.canvas.on('path:created', onPathCreated);
  S.canvas.on('text:editing:entered', function(){ onSelectionChange(); });
  S.canvas.on('text:editing:exited', function(){ saveHistory('Edit Text'); updateLayerPanel(); });

  S.history = [];
  S.historyIndex = -1;

  saveHistory('New Canvas');
  updateStatusBar();
  updateLayerPanel();
  updateZoomDisplay();
  updateHistoryPanel();
}

/* ============ MOUSE HANDLERS ============ */
function onMouseMove(opt){
  const p = scenePoint(opt);
  const posEl = $('#stPos');
  if(posEl) posEl.textContent = Math.round(p.x) + ', ' + Math.round(p.y);

  if(S.panning && S.panStart && S.panVpt){
    const e = opt.e;
    const vpt = S.panVpt.slice();
    vpt[4] = S.panVpt[4] + (e.clientX - S.panStart.x);
    vpt[5] = S.panVpt[5] + (e.clientY - S.panStart.y);
    S.canvas.setViewportTransform(vpt);
    return;
  }

  if(S.drawing && S.drawShape){
    updateDrawShape(p);
  }
}

function onMouseDown(opt){
  const e = opt.e;
  const p = scenePoint(opt);

  if(e.button === 1 || S.spaceDown || S.tool === 'hand'){
    S.panning = true;
    S.panStart = {x:e.clientX, y:e.clientY};
    S.panVpt = S.canvas.viewportTransform.slice();
    S.canvas.selection = false;
    S.canvas.defaultCursor = 'grabbing';
    return;
  }

  if(S.tool === 'eyedropper'){ pickColor(p.x, p.y); return; }

  if(S.tool === 'zoom'){
    const zoom = S.canvas.getZoom();
    const nz = Math.max(0.05, Math.min(8, e.altKey ? zoom/1.25 : zoom*1.25));
    S.canvas.zoomToPoint({x:e.offsetX, y:e.offsetY}, nz);
    updateZoomDisplay();
    return;
  }

  if(S.tool === 'fill'){
    if(opt.target){
      opt.target.set('fill', S.fg);
      S.canvas.requestRenderAll();
      saveHistory('Fill');
      updateLayerPanel();
    } else {
      S.canvas.setBackgroundColor(S.fg, function(){
        S.canvas.requestRenderAll();
        saveHistory('Fill Background');
      });
    }
    return;
  }

  if(S.tool === 'text'){
    if(opt.target && (opt.target.type === 'i-text' || opt.target.type === 'textbox')) return;
    placeText(p.x, p.y);
    return;
  }

  if(['rect','ellipse','line','polygon','star','crop'].indexOf(S.tool) !== -1){
    if(opt.target && S.tool !== 'crop') return;
    startDraw(p.x, p.y);
    return;
  }
}

function onMouseUp(){
  if(S.panning){
    S.panning = false;
    S.panStart = null;
    S.panVpt = null;
    S.canvas.selection = (S.tool === 'select' || S.tool === 'marquee');
    S.canvas.defaultCursor = cursorFor(S.tool);
    return;
  }
  if(S.drawing){
    finishDraw();
  }
}

function onMouseWheel(opt){
  const e = opt.e;
  if(!e.ctrlKey && !e.metaKey) return;
  if(e.preventDefault) e.preventDefault();
  if(e.stopPropagation) e.stopPropagation();
  const zoom = S.canvas.getZoom();
  const nz = Math.max(0.05, Math.min(8, zoom * Math.pow(0.999, e.deltaY)));
  S.canvas.zoomToPoint({x:e.offsetX, y:e.offsetY}, nz);
  updateZoomDisplay();
}

function onMouseDblClick(opt){
  if(opt.target && (opt.target.type === 'i-text' || opt.target.type === 'textbox')){
    S.canvas.setActiveObject(opt.target);
    opt.target.enterEditing();
    opt.target.selectAll();
    S.canvas.requestRenderAll();
  }
}

function onPathCreated(e){
  const path = e.path;
  path.set({
    selectable:true,
    evented:true,
    name: (S.tool === 'eraser') ? 'Eraser' : 'Brush',
    strokeLineCap:'round',
    strokeLineJoin:'round'
  });
  saveHistory(S.tool === 'eraser' ? 'Erase' : 'Brush');
  updateLayerPanel();
}

/* ============ SHAPE DRAWING ============ */
function startDraw(x, y){
  S.drawing = true;
  S.drawStart = {x:x, y:y};
  const tool = S.tool;

  let shape = null;
  const fill = S.fg;
  const stroke = S.bg;

  if(tool === 'crop'){
    shape = new fabric.Rect({
      left:x, top:y, width:0, height:0,
      fill:'rgba(20,115,230,0.12)',
      stroke:'#1473e6', strokeWidth:1.5,
      strokeDashArray:[6,4],
      strokeUniform:true,
      selectable:false, evented:false,
      excludeFromExport:true,
      name:'__crop__'
    });
    S.cropRect = shape;
    S.canvas.add(shape);
  } else if(tool === 'rect'){
    shape = new fabric.Rect({
      left:x, top:y, width:0, height:0,
      fill:fill, stroke:stroke, strokeWidth:0,
      strokeUniform:true, name:'Rectangle'
    });
    S.canvas.add(shape);
  } else if(tool === 'ellipse'){
    shape = new fabric.Ellipse({
      left:x, top:y, rx:0, ry:0,
      fill:fill, stroke:stroke, strokeWidth:0,
      strokeUniform:true, name:'Ellipse'
    });
    S.canvas.add(shape);
  } else if(tool === 'line'){
    shape = new fabric.Line([x,y,x,y],{
      stroke:fill, strokeWidth:4, strokeLineCap:'round', name:'Line'
    });
    S.canvas.add(shape);
  } else if(tool === 'polygon'){
    shape = new fabric.Polygon([
      {x:0, y:-40},{x:38, y:-12},{x:24, y:32},{x:-24, y:32},{x:-38, y:-12}
    ], {
      left:x, top:y, fill:fill, stroke:stroke, strokeWidth:0,
      strokeUniform:true, name:'Polygon',
      originX:'center', originY:'center'
    });
    S.canvas.add(shape);
  } else if(tool === 'star'){
    shape = makeStar(0, 0, 5, 40, 18, fill);
    shape.set({
      left:x, top:y, name:'Star',
      originX:'center', originY:'center',
      stroke: stroke, strokeWidth:0, strokeUniform:true
    });
    S.canvas.add(shape);
  }
  S.drawShape = shape;
  S.canvas.requestRenderAll();
}

function updateDrawShape(p){
  const s = S.drawShape;
  if(!s) return;
  const x0 = S.drawStart.x, y0 = S.drawStart.y;
  const w = p.x - x0, h = p.y - y0;
  const tool = S.tool;

  if(tool === 'rect' || tool === 'crop'){
    s.set({
      left: Math.min(p.x, x0),
      top: Math.min(p.y, y0),
      width: Math.abs(w),
      height: Math.abs(h)
    });
  } else if(tool === 'ellipse'){
    s.set({
      left: Math.min(p.x, x0),
      top: Math.min(p.y, y0),
      rx: Math.abs(w)/2,
      ry: Math.abs(h)/2
    });
  } else if(tool === 'line'){
    s.set({ x2: p.x, y2: p.y });
  } else if(tool === 'polygon' || tool === 'star'){
    const diag = Math.sqrt(w*w + h*h);
    const r = Math.max(12, diag / 2);
    const sc = r / 40;
    s.set({
      left: (x0 + p.x) / 2,
      top:  (y0 + p.y) / 2,
      scaleX: sc,
      scaleY: sc
    });
  }
  s.setCoords();
  S.canvas.requestRenderAll();
}

function finishDraw(){
  S.drawing = false;
  const s = S.drawShape;
  S.drawShape = null;
  if(!s) return;
  const tool = S.tool;

  if(tool === 'crop'){
    if(s.width < 5 || s.height < 5){
      S.canvas.remove(s);
      S.cropRect = null;
    } else {
      toast('Press Enter to apply crop · Esc to cancel','info');
    }
    S.canvas.requestRenderAll();
    return;
  }

  let bad = false;
  if(s.type === 'rect' && (s.width < 3 || s.height < 3)) bad = true;
  if(s.type === 'ellipse' && (s.rx < 2 || s.ry < 2)) bad = true;
  if(s.type === 'line' && Math.hypot(s.x2-s.x1, s.y2-s.y1) < 3) bad = true;

  if(bad){
    S.canvas.remove(s);
  } else {
    s.set({ selectable:true, evented:true });
    s.setCoords();
    saveHistory('Draw ' + (s.name || 'Shape'));
  }
  S.canvas.requestRenderAll();
  updateLayerPanel();
}

function makeStar(cx, cy, points, outerR, innerR, fill){
  const pts = [];
  for(let i=0; i<points*2; i++){
    const r = (i%2===0) ? outerR : innerR;
    const a = (Math.PI/points) * i - Math.PI/2;
    pts.push({ x: cx + Math.cos(a)*r, y: cy + Math.sin(a)*r });
  }
  return new fabric.Polygon(pts, { fill: fill, name:'Star' });
}

/* ============ TEXT ============ */
function placeText(x, y){
  const t = new fabric.IText('Type here', {
    left: x,
    top: y,
    fontFamily: S.fontFamily,
    fontSize: S.fontSize,
    fontWeight: S.fontWeight,
    fontStyle: S.fontStyle,
    underline: S.underline,
    fill: S.fg,
    textAlign: S.textAlign,
    name: 'Text',
    editable: true,
    lineHeight: 1.16
  });
  S.canvas.add(t);
  S.canvas.setActiveObject(t);
  S.canvas.requestRenderAll();
  saveHistory('Add Text');
  updateLayerPanel();

  setTool('select');

  setTimeout(function(){
    try{
      t.enterEditing();
      t.selectAll();
      S.canvas.requestRenderAll();
    }catch(e){}
  }, 40);
}

/* ============ EYEDROPPER ============ */
function pickColor(x, y){
  try{
    const el = S.canvas.lowerCanvasEl;
    const vpt = S.canvas.viewportTransform;
    const zoom = S.canvas.getZoom();
    const cssW = S.canvas.getWidth() || 1;
    const ratio = el.width / cssW;

    const px = Math.round((x * zoom + vpt[4]) * ratio);
    const py = Math.round((y * zoom + vpt[5]) * ratio);

    if(px < 0 || py < 0 || px >= el.width || py >= el.height){
      toast('Outside canvas','info',1200);
      return;
    }

    const ctx = el.getContext('2d');
    const d = ctx.getImageData(px, py, 1, 1).data;
    if(d[3] === 0){
      toast('Transparent pixel','info',1200);
      return;
    }
    const hex = rgbToHex(d[0], d[1], d[2]);
    S.fg = hex;
    updateColorUI();
    toast('Picked ' + hex.toUpperCase(),'success',1200);
  }catch(err){
    toast('Could not pick color','error');
  }
}

/* ============ SELECTION ============ */
function onSelectionChange(){
  updateLayerPanel();
  if(!S.canvas) return;
  const a = S.canvas.getActiveObject();
  const textPanel = $('[data-panel="text"]');

  if(!a || a.type === 'activeSelection'){
    if(textPanel) textPanel.classList.add('hidden');
    return;
  }

  if(typeof a.fill === 'string' && a.fill.charAt(0) === '#'){
    S.fg = a.fill;
    updateColorUI();
  }

  const op = Math.round((a.opacity === undefined ? 1 : a.opacity) * 100);
  const opEl = $('#layerOpacity');
  if(opEl) opEl.value = op;
  const bmEl = $('#blendMode');
  if(bmEl) bmEl.value = a.globalCompositeOperation || 'source-over';

  if(a.type === 'i-text' || a.type === 'textbox' || a.type === 'text'){
    if(textPanel) textPanel.classList.remove('hidden');
    $('#fontSize').value = Math.round(a.fontSize || 48);
    $('#fontWeight').value = String(a.fontWeight || '400');
    $('#fontPreview').textContent = a.fontFamily || 'Inter';
    $('#fontPreview').style.fontFamily = "'" + (a.fontFamily || 'Inter') + "', sans-serif";

    S.fontFamily = a.fontFamily || 'Inter';
    S.fontSize = a.fontSize || 48;
    S.fontWeight = String(a.fontWeight || '400');
    S.fontStyle = a.fontStyle || 'normal';
    S.textAlign = a.textAlign || 'left';
    S.underline = !!a.underline;

    $$('[data-align]').forEach(function(b){ b.classList.toggle('active', b.dataset.align === S.textAlign); });
    $('#styleNormal').classList.toggle('active', S.fontStyle === 'normal' && !S.underline);
    $('#styleItalic').classList.toggle('active', S.fontStyle === 'italic');
    $('#styleUnderline').classList.toggle('active', S.underline);
  } else {
    if(textPanel) textPanel.classList.add('hidden');
  }
}

/* ============ LAYERS PANEL ============ */
function updateLayerPanel(){
  const list = $('#layersList');
  if(!list || !S.canvas) return;
  list.innerHTML = '';
  const objs = S.canvas.getObjects().filter(function(o){ return !o.excludeFromExport; });
  const stLayers = $('#stLayers');
  if(stLayers) stLayers.textContent = objs.length;

  if(objs.length === 0){
    list.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-mute); font-size:10.5px;">No layers</div>';
    return;
  }

  const active = S.canvas.getActiveObject();

  for(let i = objs.length - 1; i >= 0; i--){
    const o = objs[i];
    const row = document.createElement('div');
    row.className = 'layer-row' + (o === active ? ' active' : '');

    const eye = document.createElement('div');
    eye.className = 'layer-eye';
    eye.innerHTML = (o.visible !== false)
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>';
    eye.title = 'Toggle visibility';
    eye.onclick = function(e){
      e.stopPropagation();
      o.visible = (o.visible === false) ? true : false;
      S.canvas.requestRenderAll();
      updateLayerPanel();
      saveHistory('Toggle Visibility');
    };

    const thumb = document.createElement('img');
    thumb.className = 'layer-thumb';
    thumb.alt = '';
    const src = makeThumb(o, 24);
    thumb.src = src || 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

    const name = document.createElement('div');
    name.className = 'layer-name';
    name.textContent = o.name || o.type;
    name.title = o.name || o.type;
    name.ondblclick = function(e){
      e.stopPropagation();
      const inp = document.createElement('input');
      inp.value = o.name || o.type;
      name.innerHTML = '';
      name.appendChild(inp);
      inp.focus(); inp.select();
      inp.onblur = function(){ o.name = inp.value || o.type; updateLayerPanel(); };
      inp.onkeydown = function(ev){ if(ev.key === 'Enter') inp.blur(); };
    };

    const lock = document.createElement('div');
    lock.className = 'layer-lock' + (o.lockMovementX ? ' on' : '');
    lock.title = 'Lock layer';
    lock.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
    lock.onclick = function(e){
      e.stopPropagation();
      const locked = !o.lockMovementX;
      o.set({
        lockMovementX: locked, lockMovementY: locked,
        lockRotation: locked, lockScalingX: locked, lockScalingY: locked,
        hasControls: !locked
      });
      updateLayerPanel();
    };

    row.appendChild(eye);
    row.appendChild(thumb);
    row.appendChild(name);
    row.appendChild(lock);

    row.onclick = function(){
      S.canvas.setActiveObject(o);
      S.canvas.requestRenderAll();
      updateLayerPanel();
      onSelectionChange();
    };

    list.appendChild(row);
  }
}

function addLayer(){
  const r = new fabric.Rect({
    left: 60, top: 60, width: 240, height: 160,
    fill: S.fg,
    name: 'Rectangle'
  });
  S.canvas.add(r);
  S.canvas.setActiveObject(r);
  S.canvas.requestRenderAll();
  saveHistory('New Layer');
  updateLayerPanel();
}

function deleteLayer(){
  const a = S.canvas.getActiveObject();
  if(!a){ toast('No layer selected','info'); return; }
  if(a.type === 'activeSelection'){
    a.forEachObject(function(o){ S.canvas.remove(o); });
  } else {
    S.canvas.remove(a);
  }
  S.canvas.discardActiveObject();
  S.canvas.requestRenderAll();
  saveHistory('Delete Layer');
  updateLayerPanel();
}

function duplicateLayer(){
  const a = S.canvas.getActiveObject();
  if(!a){ toast('No layer selected','info'); return; }
  if(a.type === 'activeSelection'){ toast('Select a single layer','info'); return; }
  a.clone(function(c){
    c.set({
      left: (a.left || 0) + 20,
      top: (a.top || 0) + 20,
      name: (a.name || a.type) + ' copy',
      evented: true, selectable: true
    });
    S.canvas.add(c);
    S.canvas.setActiveObject(c);
    S.canvas.requestRenderAll();
    saveHistory('Duplicate');
    updateLayerPanel();
  }, ['excludeFromExport']);
}

/* ============ HISTORY ============ */
function saveHistory(label){
  label = label || 'Edit';
  if(S.skipHistory || !S.canvas) return;
  try{
    const json = JSON.stringify(S.canvas.toJSON(['name','excludeFromExport']));
    if(S.historyIndex < S.history.length - 1){
      S.history = S.history.slice(0, S.historyIndex + 1);
    }
    if(S.history.length && S.history[S.history.length-1].json === json) return;
    S.history.push({json:json, label:label});
    if(S.history.length > S.maxHistory) S.history.shift();
    S.historyIndex = S.history.length - 1;
    updateHistoryPanel();
  }catch(e){ /* ignore */ }
}

function undo(){
  if(S.historyIndex <= 0){ toast('Nothing to undo','info'); return; }
  S.historyIndex--;
  restoreHistory();
}

function redo(){
  if(S.historyIndex >= S.history.length - 1){ toast('Nothing to redo','info'); return; }
  S.historyIndex++;
  restoreHistory();
}

function restoreHistory(){
  const h = S.history[S.historyIndex];
  if(!h) return;
  S.skipHistory = true;
  S.canvas.loadFromJSON(h.json, function(){
    S.skipHistory = false;
    S.canvas.requestRenderAll();
    updateLayerPanel();
    updateHistoryPanel();
    updateStatusBar();
    onSelectionChange();
  });
}

function updateHistoryPanel(){
  const list = $('#historyList');
  if(!list) return;
  list.innerHTML = '';
  S.history.forEach(function(h, i){
    const el = document.createElement('div');
    el.className = 'history-item' + (i === S.historyIndex ? ' current' : '') + (i > S.historyIndex ? ' future' : '');
    el.textContent = h.label;
    el.title = h.label;
    el.onclick = function(){
      S.historyIndex = i;
      restoreHistory();
    };
    list.appendChild(el);
  });
  const cur = list.querySelector('.current');
  if(cur && cur.scrollIntoView) cur.scrollIntoView({block:'nearest'});
}

/* ============ COLOR ============ */
const SWATCHES = [
  '#000000','#1a1a1a','#333333','#4d4d4d','#666666','#808080','#999999','#b3b3b3','#cccccc','#e6e6e6','#ffffff','#ffffff',
  '#7f1d1d','#b91c1c','#dc2626','#ef4444','#f87171','#fca5a5','#7c2d12','#c2410c','#ea580c','#f97316','#fb923c','#fdba74',
  '#78350f','#b45309','#d97706','#f59e0b','#fbbf24','#fcd34d','#713f12','#a16207','#ca8a04','#eab308','#facc15','#fde047',
  '#365314','#4d7c0f','#65a30d','#84cc16','#a3e635','#bef264','#14532d','#15803d','#16a34a','#22c55e','#4ade80','#86efac',
  '#134e4a','#0f766e','#0d9488','#14b8a6','#2dd4bf','#5eead4','#164e63','#0e7490','#0891b2','#06b6d4','#22d3ee','#67e8f9',
  '#1e3a8a','#1d4ed8','#2563eb','#3b82f6','#60a5fa','#93c5fd','#3730a3','#4338ca','#4f46e5','#6366f1','#818cf8','#a5b4fc',
  '#5b21b6','#6d28d9','#7c3aed','#8b5cf6','#a78bfa','#c4b5fd','#701a75','#86198f','#a21caf','#c026d3','#d946ef','#e879f9',
  '#831843','#9f1239','#be123c','#e11d48','#f43f5e','#fb7185'
];

function buildSwatches(){
  const grid = $('#swatchGrid');
  if(!grid) return;
  grid.innerHTML = '';
  SWATCHES.forEach(function(c){
    const s = document.createElement('div');
    s.className = 'swatch';
    s.style.background = c;
    s.dataset.c = c;
    s.title = c.toUpperCase();
    s.onclick = function(){
      S.fg = c;
      updateColorUI();
      applyColorToSelection(c);
    };
    grid.appendChild(s);
  });
}

function updateColorUI(){
  $('#fgSwatch').style.background = S.fg;
  $('#bgSwatch').style.background = S.bg;
  $('#colorFill').value = S.fg;
  $('#colorFillHex').value = S.fg.toUpperCase();
  $('#colorStroke').value = S.bg;
  $('#colorStrokeHex').value = S.bg.toUpperCase();
}

function applyColorToSelection(color){
  const a = S.canvas.getActiveObject();
  if(!a) return;
  if(a.type === 'activeSelection'){
    a.forEachObject(function(o){ o.set('fill', color); });
  } else {
    a.set('fill', color);
  }
  S.canvas.requestRenderAll();
  updateLayerPanel();
  saveHistory('Color');
}

/* ============ FONTS ============ */
function buildFontList(filter){
  const list = $('#fontList');
  if(!list) return;
  list.innerHTML = '';
  const fl = (filter || '').toLowerCase();
  FONTS.filter(function(f){ return !fl || f.name.toLowerCase().indexOf(fl) !== -1; }).forEach(function(f){
    const el = document.createElement('div');
    el.className = 'font-item' + (f.name === S.fontFamily ? ' active' : '');
    el.style.fontFamily = "'" + f.name + "', sans-serif";
    el.dataset.font = f.name;
    el.innerHTML = '<span>' + f.name + '</span><span class="font-cat">' + f.cat + '</span>';
    el.onclick = function(){
      S.fontFamily = f.name;
      $('#fontPreview').textContent = f.name;
      $('#fontPreview').style.fontFamily = "'" + f.name + "', sans-serif";
      $('#fontPicker').classList.remove('open');
      applyTextProp('fontFamily', f.name);
    };
    list.appendChild(el);
  });
}

function applyTextProp(key, value){
  const a = S.canvas.getActiveObject();
  if(!a) return;
  if(a.type === 'i-text' || a.type === 'textbox' || a.type === 'text'){
    a.set(key, value);
    S.canvas.requestRenderAll();
    updateLayerPanel();
    saveHistory('Text');
  }
}

/* ============ OPTIONS BAR ============ */
const TOOL_LABELS = {
  select:'Move', marquee:'Marquee', crop:'Crop', eyedropper:'Eyedropper',
  brush:'Brush', eraser:'Eraser', fill:'Fill',
  rect:'Rectangle', ellipse:'Ellipse', line:'Line', polygon:'Polygon', star:'Star',
  text:'Text', hand:'Hand', zoom:'Zoom'
};

function cursorFor(t){
  return ({
    select:'default', marquee:'crosshair', crop:'crosshair', eyedropper:'crosshair',
    brush:'crosshair', eraser:'crosshair', fill:'crosshair',
    rect:'crosshair', ellipse:'crosshair', line:'crosshair', polygon:'crosshair', star:'crosshair',
    text:'text', hand:'grab', zoom:'zoom-in'
  })[t] || 'default';
}

function renderOptionsBar(){
  const bar = $('#optionsBar');
  if(!bar) return;
  bar.innerHTML = '';
  const tool = S.tool;

  const g = function(html){
    const d = document.createElement('div');
    d.className = 'opt-group';
    d.innerHTML = html;
    return d;
  };

  bar.appendChild(g('<span style="font-weight:600; color:#d6d6d6; font-size:11.5px;">' + (TOOL_LABELS[tool]||tool) + '</span>'));

  if(tool === 'brush' || tool === 'eraser'){
    bar.appendChild(g('<label>Size</label><input type="range" id="optSize" min="1" max="200" value="' + S.brushSize + '"><input type="number" class="opt-num" id="optSizeN" value="' + S.brushSize + '">'));
    bar.appendChild(g('<label>Opacity</label><input type="range" id="optOp" min="1" max="100" value="' + Math.round(S.brushOpacity*100) + '"><span class="opt-num" id="optOpN">' + Math.round(S.brushOpacity*100) + '%</span>'));
    if(tool === 'brush'){
      bar.appendChild(g('<label>Color</label><input type="color" id="optColor" value="' + S.fg + '" style="width:26px;height:22px;border:1px solid #0a0a0a;border-radius:3px;background:none;cursor:pointer;">'));
    }
    setTimeout(function(){
      const s = $('#optSize'), sn = $('#optSizeN'), o = $('#optOp'), on = $('#optOpN'), c = $('#optColor');
      if(!s || !o) return;
      const upd = function(){
        S.brushSize = parseInt(s.value, 10) || 10;
        sn.value = S.brushSize;
        S.brushOpacity = (parseInt(o.value, 10) || 100) / 100;
        on.textContent = o.value + '%';
        if(S.canvas.freeDrawingBrush){
          S.canvas.freeDrawingBrush.width = (tool === 'eraser') ? S.brushSize * 2 : S.brushSize;
        }
      };
      s.oninput = upd;
      sn.oninput = function(){ s.value = sn.value; upd(); };
      o.oninput = upd;
      if(c){
        c.oninput = function(e){
          S.fg = e.target.value;
          updateColorUI();
          if(S.canvas.freeDrawingBrush) S.canvas.freeDrawingBrush.color = e.target.value;
        };
      }
      upd();
    }, 0);
  } else if(['rect','ellipse','line','polygon','star'].indexOf(tool) !== -1){
    bar.appendChild(g('<label>Fill</label><input type="color" id="optFill" value="' + S.fg + '" style="width:26px;height:22px;border:1px solid #0a0a0a;border-radius:3px;background:none;cursor:pointer;"><label>Stroke</label><input type="color" id="optStroke" value="' + S.bg + '" style="width:26px;height:22px;border:1px solid #0a0a0a;border-radius:3px;background:none;cursor:pointer;">'));
    setTimeout(function(){
      const f = $('#optFill'), s = $('#optStroke');
      if(f) f.oninput = function(e){ S.fg = e.target.value; updateColorUI(); };
      if(s) s.oninput = function(e){ S.bg = e.target.value; updateColorUI(); };
    }, 0);
  } else if(tool === 'text'){
    bar.appendChild(g('<label>Font</label><button class="opt-btn" id="optFontBtn" style="width:auto;padding:0 8px;color:#d6d6d6;font-family:\'' + S.fontFamily + '\',sans-serif;font-size:12px;">' + S.fontFamily + '</button>'));
    bar.appendChild(g('<label>Size</label><input type="number" class="opt-num" id="optFontSize" value="' + S.fontSize + '">'));
    bar.appendChild(g('<label>Color</label><input type="color" id="optTextColor" value="' + S.fg + '" style="width:26px;height:22px;border:1px solid #0a0a0a;border-radius:3px;background:none;cursor:pointer;">'));
    setTimeout(function(){
      const fs = $('#optFontSize'), tc = $('#optTextColor'), fb = $('#optFontBtn');
      if(fs) fs.oninput = function(e){ S.fontSize = parseInt(e.target.value,10) || 48; };
      if(tc) tc.oninput = function(e){ S.fg = e.target.value; updateColorUI(); };
      if(fb) fb.onclick = function(){ $('#fontPicker').classList.add('open'); buildFontList(''); };
    }, 0);
  } else if(tool === 'crop'){
    bar.appendChild(g('<span style="color:var(--text-dim); font-size:11px;">Drag region · <kbd>Enter</kbd> apply · <kbd>Esc</kbd> cancel</span>'));
  } else if(tool === 'eyedropper'){
    bar.appendChild(g('<span style="color:var(--text-dim); font-size:11px;">Click canvas to pick a color</span>'));
  } else if(tool === 'hand'){
    bar.appendChild(g('<span style="color:var(--text-dim); font-size:11px;">Drag to pan · <kbd>Space</kbd> temporary</span>'));
  } else if(tool === 'zoom'){
    bar.appendChild(g('<span style="color:var(--text-dim); font-size:11px;">Click to zoom in · <kbd>Alt</kbd>+Click zoom out</span>'));
  } else if(tool === 'fill'){
    bar.appendChild(g('<label>Color</label><input type="color" id="optFillC" value="' + S.fg + '" style="width:26px;height:22px;border:1px solid #0a0a0a;border-radius:3px;background:none;cursor:pointer;">'));
    setTimeout(function(){
      const c = $('#optFillC');
      if(c) c.oninput = function(e){ S.fg = e.target.value; updateColorUI(); };
    }, 0);
  } else if(tool === 'select' || tool === 'marquee'){
    bar.appendChild(g('<span style="color:var(--text-dim); font-size:11px;">Drag to select · Shift+Click multi-select</span>'));
  }
}

/* ============ SET TOOL ============ */
function setTool(tool){
  S.tool = tool;
  if(!S.canvas) return;

  S.canvas.isDrawingMode = false;
  S.canvas.selection = true;
  S.canvas.defaultCursor = 'default';

  S.canvas.forEachObject(function(o){
    if(!o.excludeFromExport){
      o.selectable = true;
      o.evented = true;
    }
  });

  if(S.cropRect && tool !== 'crop'){
    S.canvas.remove(S.cropRect);
    S.cropRect = null;
    S.canvas.requestRenderAll();
  }

  $$('.tool-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.tool === tool); });
  const stTool = $('#stTool');
  if(stTool) stTool.textContent = TOOL_LABELS[tool] || tool;
  S.canvas.defaultCursor = cursorFor(tool);
  renderOptionsBar();

  switch(tool){
    case 'select':
    case 'marquee':
      S.canvas.selection = true;
      break;

    case 'brush': {
      S.canvas.isDrawingMode = true;
      const b = new fabric.PencilBrush(S.canvas);
      b.color = S.fg;
      b.width = S.brushSize;
      if('strokeLineCap' in b) b.strokeLineCap = 'round';
      if('strokeLineJoin' in b) b.strokeLineJoin = 'round';
      S.canvas.freeDrawingBrush = b;
      break;
    }

    case 'eraser': {
      S.canvas.isDrawingMode = true;
      const b = new fabric.PencilBrush(S.canvas);
      b.color = S.canvas.backgroundColor || '#ffffff';
      b.width = S.brushSize * 2;
      if('strokeLineCap' in b) b.strokeLineCap = 'round';
      if('strokeLineJoin' in b) b.strokeLineJoin = 'round';
      S.canvas.freeDrawingBrush = b;
      break;
    }

    case 'rect':
    case 'ellipse':
    case 'line':
    case 'polygon':
    case 'star':
    case 'crop':
    case 'text':
    case 'fill':
    case 'hand':
    case 'zoom':
    case 'eyedropper':
      S.canvas.selection = false;
      S.canvas.forEachObject(function(o){
        if(!o.excludeFromExport){ o.selectable = false; o.evented = false; }
      });
      break;
  }

  S.canvas.requestRenderAll();
}

/* ============ CROP ============ */
function applyCrop(){
  if(!S.cropRect){ toast('No crop region','info'); return; }
  const r = S.cropRect;
  const l = r.left;
  const t = r.top;
  const w = Math.max(1, r.width * r.scaleX);
  const h = Math.max(1, r.height * r.scaleY);

  S.canvas.remove(r);
  S.cropRect = null;

  S.canvas.getObjects().forEach(function(o){
    o.set({
      left: (o.left || 0) - l,
      top: (o.top || 0) - t
    });
    o.setCoords();
  });

  S.canvas.setWidth(w);
  S.canvas.setHeight(h);
  S.canvas.requestRenderAll();
  setTool('select');
  saveHistory('Crop');
  updateStatusBar();
  updateLayerPanel();
  fitToScreen();
  toast('Cropped to ' + Math.round(w) + ' × ' + Math.round(h),'success');
}

function cancelCrop(){
  if(S.cropRect){
    S.canvas.remove(S.cropRect);
    S.cropRect = null;
    S.canvas.requestRenderAll();
  }
  setTool('select');
}

/* ============ FILE OPS ============ */
function openImage(asLayer){
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = function(e){
    const f = e.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = function(ev){
      fabric.Image.fromURL(ev.target.result, function(img){
        const baseName = f.name.replace(/\.[^.]+$/, '');
        if(!asLayer){
          initCanvas(img.width, img.height, '#ffffff');
          img.set({ left:0, top:0, name: baseName });
          S.canvas.add(img);
          S.canvas.setActiveObject(img);
          S.docName = f.name;
          $('#docName').textContent = f.name;
        } else {
          const cw = S.canvas.getWidth(), ch = S.canvas.getHeight();
          const sc = Math.min(cw / img.width, ch / img.height, 1);
          img.set({
            left:(cw - img.width * sc) / 2,
            top:(ch - img.height * sc) / 2,
            scaleX:sc, scaleY:sc,
            name: baseName
          });
          S.canvas.add(img);
          S.canvas.setActiveObject(img);
        }
        S.canvas.requestRenderAll();
        saveHistory('Open Image');
        updateLayerPanel();
        updateStatusBar();
        setTimeout(fitToScreen, 30);
        toast('Loaded: ' + f.name,'success');
      });
    };
    reader.readAsDataURL(f);
  };
  inp.click();
}

function exportPNG(){
  S.canvas.discardActiveObject();
  S.canvas.requestRenderAll();
  try{
    const url = S.canvas.toDataURL({format:'png', quality:1, multiplier:1});
    download(url, 'pixelforge-' + Date.now() + '.png');
    toast('Exported PNG','success');
  }catch(e){ toast('Export failed','error'); }
}

function exportJPG(){
  S.canvas.discardActiveObject();
  S.canvas.requestRenderAll();
  try{
    const url = S.canvas.toDataURL({format:'jpeg', quality:0.92, multiplier:1});
    download(url, 'pixelforge-' + Date.now() + '.jpg');
    toast('Exported JPEG','success');
  }catch(e){ toast('Export failed','error'); }
}

function exportSVG(){
  try{
    const svg = S.canvas.toSVG();
    const blob = new Blob([svg], {type:'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    download(url, 'pixelforge-' + Date.now() + '.svg');
    setTimeout(function(){ URL.revokeObjectURL(url); }, 500);
    toast('Exported SVG','success');
  }catch(e){ toast('SVG export failed','error'); }
}

function exportJSON(){
  const data = JSON.stringify(S.canvas.toJSON(['name','excludeFromExport']));
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  download(url, 'pixelforge-' + Date.now() + '.json');
  setTimeout(function(){ URL.revokeObjectURL(url); }, 500);
  toast('Project saved','success');
}

function loadJSON(){
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json,application/json';
  inp.onchange = function(e){
    const f = e.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = function(ev){
      try{
        const data = JSON.parse(ev.target.result);
        S.skipHistory = true;
        S.canvas.loadFromJSON(data, function(){
          S.skipHistory = false;
          S.canvas.requestRenderAll();
          saveHistory('Load Project');
          updateLayerPanel();
          updateStatusBar();
          setTimeout(fitToScreen, 30);
          toast('Project loaded','success');
        });
      }catch(err){ toast('Invalid project file','error'); }
    };
    reader.readAsText(f);
  };
  inp.click();
}

function download(url, name){
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ============ ZOOM ============ */
function zoomBy(f){
  const z = Math.max(0.05, Math.min(8, S.canvas.getZoom() * f));
  S.canvas.setZoom(z);
  updateZoomDisplay();
}

function zoom100(){
  S.canvas.setViewportTransform([1,0,0,1,0,0]);
  updateZoomDisplay();
}

function fitToScreen(){
  const viewport = $('#canvasViewport');
  if(!viewport || !S.canvas) return;
  const pad = 80;
  const cw = Math.max(50, viewport.clientWidth - pad);
  const ch = Math.max(50, viewport.clientHeight - pad);
  const z = Math.max(0.05, Math.min(8, Math.min(cw / S.canvas.getWidth(), ch / S.canvas.getHeight())));
  S.canvas.setZoom(z);
  const scaledW = S.canvas.getWidth() * z;
  const scaledH = S.canvas.getHeight() * z;
  const ox = Math.max(40, (viewport.clientWidth - scaledW) / 2);
  const oy = Math.max(40, (viewport.clientHeight - scaledH) / 2);
  S.canvas.setViewportTransform([z, 0, 0, z, ox, oy]);
  updateZoomDisplay();
}

function updateZoomDisplay(){
  if(!S.canvas) return;
  const pct = Math.round(S.canvas.getZoom() * 100);
  const z = $('#stZoom');
  if(z) z.textContent = pct + '%';
  const sl = $('#zoomSlider');
  if(sl) sl.value = Math.min(400, Math.max(10, pct));
}

/* ============ IMAGE OPS ============ */
function flipH(){
  const a = S.canvas.getActiveObject();
  if(!a){ toast('Select a layer first','info'); return; }
  a.set({ flipX: !a.flipX });
  S.canvas.requestRenderAll();
  saveHistory('Flip H');
  updateLayerPanel();
}
function flipV(){
  const a = S.canvas.getActiveObject();
  if(!a){ toast('Select a layer first','info'); return; }
  a.set({ flipY: !a.flipY });
  S.canvas.requestRenderAll();
  saveHistory('Flip V');
  updateLayerPanel();
}
function rotateBy(deg){
  const a = S.canvas.getActiveObject();
  if(!a){ toast('Select a layer first','info'); return; }
  a.rotate((a.angle || 0) + deg);
  a.setCoords();
  S.canvas.requestRenderAll();
  saveHistory('Rotate');
}

function rasterize(obj){
  if(!obj || obj.type === 'activeSelection') return null;
  const w = S.canvas.getWidth();
  const h = S.canvas.getHeight();
  const el = renderObjectsToCanvasEl([obj], w, h, 1);
  const img = new fabric.Image(el, {
    left: 0, top: 0,
    name: (obj.name || obj.type) + ' (raster)',
    selectable: true, evented: true
  });
  const objects = S.canvas.getObjects();
  const idx = objects.indexOf(obj);
  S.canvas.remove(obj);
  S.canvas.insertAt(img, Math.max(0, idx), false);
  S.canvas.setActiveObject(img);
  S.canvas.requestRenderAll();
  return img;
}

function mergeDown(){
  const all = S.canvas.getObjects().filter(function(o){ return !o.excludeFromExport; });
  if(all.length < 2){ toast('Need at least 2 layers','info'); return; }

  const a = S.canvas.getActiveObject();
  let idx = a ? all.indexOf(a) : all.length - 1;
  if(idx < 0) idx = all.length - 1;
  if(idx === 0){ toast('No layer below to merge','info'); return; }

  const top = all[idx];
  const below = all[idx - 1];

  const el = renderObjectsToCanvasEl([below, top], S.canvas.getWidth(), S.canvas.getHeight(), 1);
  const merged = new fabric.Image(el, {
    left: 0, top: 0,
    name: (below.name || 'Layer') + ' merged',
    selectable: true, evented: true
  });

  const insertIndex = S.canvas.getObjects().indexOf(below);
  S.canvas.remove(top);
  S.canvas.remove(below);
  S.canvas.insertAt(merged, Math.max(0, insertIndex), false);
  S.canvas.discardActiveObject();
  S.canvas.setActiveObject(merged);
  S.canvas.requestRenderAll();
  saveHistory('Merge Down');
  updateLayerPanel();
  toast('Merged layers','success');
}

function flattenImage(){
  const objs = S.canvas.getObjects().filter(function(o){ return !o.excludeFromExport; });
  if(objs.length < 2){ toast('Nothing to flatten','info'); return; }
  const bg = S.canvas.backgroundColor;
  const el = renderObjectsToCanvasEl(objs, S.canvas.getWidth(), S.canvas.getHeight(), 1);
  const img = new fabric.Image(el, { left:0, top:0, name:'Flattened', selectable:true, evented:true });

  S.skipHistory = true;
  S.canvas.clear();
  S.canvas.backgroundColor = bg || '';
  S.canvas.add(img);
  S.skipHistory = false;

  S.canvas.setActiveObject(img);
  S.canvas.requestRenderAll();
  saveHistory('Flatten');
  updateLayerPanel();
  toast('Image flattened','success');
}

/* ============ FILTERS ============ */
function buildFilters(){
  const b  = parseInt($('#adjBrightness').value, 10) || 0;
  const c  = parseInt($('#adjContrast').value, 10) || 0;
  const s  = parseInt($('#adjSaturation').value, 10) || 0;
  const h  = parseInt($('#adjHue').value, 10) || 0;
  const bl = parseInt($('#adjBlur').value, 10) || 0;
  const sp = parseInt($('#adjSepia').value, 10) || 0;

  const f = [];
  if(b !== 0)  f.push(new fabric.Image.filters.Brightness({ brightness: b/100 }));
  if(c !== 0)  f.push(new fabric.Image.filters.Contrast({ contrast: c/100 }));
  if(s !== 0)  f.push(new fabric.Image.filters.Saturation({ saturation: s/100 }));
  if(h !== 0)  f.push(new fabric.Image.filters.HueRotation({ rotation: h/180 }));
  if(bl > 0)   f.push(new fabric.Image.filters.Blur({ blur: bl/20 }));
  if(sp > 0)   f.push(new fabric.Image.filters.Sepia());
  return f;
}

function applyAdjustments(){
  let a = S.canvas.getActiveObject();
  if(!a){ toast('Select a layer first','error'); return; }
  if(a.type === 'activeSelection'){ toast('Select a single layer','error'); return; }
  if(a.type !== 'image'){
    const r = rasterize(a);
    if(!r){ toast('Could not rasterize layer','error'); return; }
    a = r;
  }
  a.filters = buildFilters();
  a.applyFilters();
  S.canvas.requestRenderAll();
  saveHistory('Adjustments');
  updateLayerPanel();
  toast('Adjustments applied','success',1400);
}

function resetAdjustments(){
  ['Brightness','Contrast','Saturation','Hue','Blur','Sepia'].forEach(function(k){
    $('#adj' + k).value = 0;
    $('#v' + k).textContent = '0';
  });
  const a = S.canvas.getActiveObject();
  if(a && a.type === 'image'){
    a.filters = [];
    a.applyFilters();
    S.canvas.requestRenderAll();
    saveHistory('Reset Filters');
  }
}

const QUICK_FILTERS = {
  'f-grayscale': function(){ return [new fabric.Image.filters.Grayscale()]; },
  'f-sepia':     function(){ return [new fabric.Image.filters.Sepia()]; },
  'f-invert':    function(){ return [new fabric.Image.filters.Invert()]; },
  'f-blur':      function(){ return [new fabric.Image.filters.Blur({ blur: 0.3 })]; },
  'f-sharpen':   function(){ return [new fabric.Image.filters.Convolute({ matrix:[0,-1,0,-1,5,-1,0,-1,0] })]; },
  'f-noise':     function(){ return [new fabric.Image.filters.Noise({ noise: 80 })]; },
  'f-reset':     function(){ return []; }
};

function applyQuickFilter(action){
  let a = S.canvas.getActiveObject();
  if(!a){ toast('Select a layer first','error'); return; }
  if(a.type === 'activeSelection'){ toast('Select a single layer','error'); return; }
  if(a.type !== 'image'){
    const r = rasterize(a);
    if(!r){ toast('Could not rasterize layer','error'); return; }
    a = r;
  }
  a.filters = QUICK_FILTERS[action]();
  a.applyFilters();
  S.canvas.requestRenderAll();
  saveHistory('Filter');
  updateLayerPanel();
}

/* ============ STATUS ============ */
function updateStatusBar(){
  if(!S.canvas) return;
  const sz = $('#stSize');
  if(sz) sz.textContent = Math.round(S.canvas.getWidth()) + ' × ' + Math.round(S.canvas.getHeight());
  const sl = $('#stLayers');
  if(sl) sl.textContent = S.canvas.getObjects().filter(function(o){ return !o.excludeFromExport; }).length;
}

/* ============ SIDEBAR TOGGLE ============ */
function toggleSidebar(){
  S.sidebarVisible = !S.sidebarVisible;
  const ws = $('#workspace');
  ws.classList.toggle('sidebar-hidden', !S.sidebarVisible);
  setTimeout(fitToScreen, 230);
}

/* ============ MENUS ============ */
function bindMenus(){
  $$('.menu').forEach(function(m){
    const btn = m.querySelector('.menu-btn');
    if(!btn) return;
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      const open = m.classList.contains('open');
      $$('.menu').forEach(function(x){ x.classList.remove('open'); });
      if(!open) m.classList.add('open');
    });
    m.addEventListener('mouseenter', function(){
      if($$('.menu.open').length){
        $$('.menu').forEach(function(x){ x.classList.remove('open'); });
        m.classList.add('open');
      }
    });
  });

  document.addEventListener('click', function(){ $$('.menu').forEach(function(m){ m.classList.remove('open'); }); });

  document.addEventListener('click', function(e){
    const item = e.target.closest ? e.target.closest('.menu-item') : null;
    if(!item) return;
    handleMenuAction(item.dataset.action);
    $$('.menu').forEach(function(m){ m.classList.remove('open'); });
  });
}

function handleMenuAction(a){
  switch(a){
    case 'new': openModal('modalNew'); break;
    case 'open': openImage(false); break;
    case 'place': openImage(true); break;
    case 'export-png': exportPNG(); break;
    case 'export-jpg': exportJPG(); break;
    case 'export-svg': exportSVG(); break;
    case 'export-json': exportJSON(); break;
    case 'load-json': loadJSON(); break;
    case 'undo': undo(); break;
    case 'redo': redo(); break;
    case 'cut': doCut(); break;
    case 'copy': doCopy(); break;
    case 'paste': doPaste(); break;
    case 'duplicate': duplicateLayer(); break;
    case 'select-all': selectAll(); break;
    case 'deselect': S.canvas.discardActiveObject(); S.canvas.requestRenderAll(); onSelectionChange(); break;
    case 'delete': deleteLayer(); break;
    case 'canvas-size': openCanvasSize(); break;
    case 'fit': fitToScreen(); break;
    case 'actual': zoom100(); break;
    case 'flip-h': flipH(); break;
    case 'flip-v': flipV(); break;
    case 'rotate-90': rotateBy(90); break;
    case 'rotate--90': rotateBy(-90); break;
    case 'rotate-180': rotateBy(180); break;
    case 'apply-crop': applyCrop(); break;
    case 'cancel-crop': cancelCrop(); break;
    case 'new-layer': addLayer(); break;
    case 'bring-front': {
      const x = S.canvas.getActiveObject();
      if(x){ S.canvas.bringToFront(x); saveHistory('Bring Front'); updateLayerPanel(); }
      break;
    }
    case 'bring-forward': {
      const x = S.canvas.getActiveObject();
      if(x){ S.canvas.bringForward(x); saveHistory('Bring Forward'); updateLayerPanel(); }
      break;
    }
    case 'send-backward': {
      const x = S.canvas.getActiveObject();
      if(x){ S.canvas.sendBackwards(x); saveHistory('Send Backward'); updateLayerPanel(); }
      break;
    }
    case 'send-back': {
      const x = S.canvas.getActiveObject();
      if(x){ S.canvas.sendToBack(x); saveHistory('Send Back'); updateLayerPanel(); }
      break;
    }
    case 'merge-down': mergeDown(); break;
    case 'flatten': flattenImage(); break;
    case 'zoom-in': zoomBy(1.25); break;
    case 'zoom-out': zoomBy(0.8); break;
    case 'toggle-sidebar': toggleSidebar(); break;
    case 'shortcuts': openModal('modalShortcuts'); break;
    case 'about': openModal('modalAbout'); break;
    default:
      if(QUICK_FILTERS[a]) applyQuickFilter(a);
  }
}

function selectAll(){
  const objs = S.canvas.getObjects().filter(function(o){ return !o.excludeFromExport; });
  if(!objs.length) return;
  const sel = new fabric.ActiveSelection(objs, { canvas: S.canvas });
  S.canvas.setActiveObject(sel);
  S.canvas.requestRenderAll();
  updateLayerPanel();
}

function doCopy(){
  const a = S.canvas.getActiveObject();
  if(!a || a.type === 'activeSelection'){ toast('Select a single layer','info'); return; }
  a.clone(function(c){
    S.clipboard = c;
    toast('Copied','success',1200);
  }, ['excludeFromExport']);
}

function doCut(){
  const a = S.canvas.getActiveObject();
  if(!a || a.type === 'activeSelection'){ toast('Select a single layer','info'); return; }
  a.clone(function(c){
    S.clipboard = c;
    S.canvas.remove(a);
    S.canvas.discardActiveObject();
    S.canvas.requestRenderAll();
    saveHistory('Cut');
    updateLayerPanel();
    toast('Cut','success',1200);
  }, ['excludeFromExport']);
}

function doPaste(){
  if(!S.clipboard){ toast('Clipboard empty','info'); return; }
  S.clipboard.clone(function(c){
    c.set({ left:(c.left || 0) + 20, top:(c.top || 0) + 20, evented:true, selectable:true });
    S.canvas.add(c);
    S.canvas.setActiveObject(c);
    S.canvas.requestRenderAll();
    saveHistory('Paste');
    updateLayerPanel();
  }, ['excludeFromExport']);
}

/* ============ MODALS ============ */
function openModal(id){ const m = $('#' + id); if(m) m.classList.add('open'); }
function closeModal(id){ const m = $('#' + id); if(m) m.classList.remove('open'); }

function bindModals(){
  $$('.modal-overlay').forEach(function(m){
    m.addEventListener('click', function(e){ if(e.target === m) m.classList.remove('open'); });
  });
  $$('[data-close]').forEach(function(b){ b.onclick = function(){ closeModal(b.dataset.close); }; });

  $('#btnCreateNew').onclick = function(){
    const w = Math.max(1, Math.min(8000, parseInt($('#newW').value,10) || 1200));
    const h = Math.max(1, Math.min(8000, parseInt($('#newH').value,10) || 800));
    const bg = $('#newBg').value;
    initCanvas(w, h, bg);
    S.docName = 'Untitled-' + (Math.floor(Math.random()*900)+100);
    $('#docName').textContent = S.docName;
    closeModal('modalNew');
    setTimeout(fitToScreen, 30);
    toast('New project created','success');
  };

  $('#newPreset').onchange = function(e){
    const v = e.target.value;
    if(v === 'custom') return;
    const parts = v.split('x');
    $('#newW').value = parseInt(parts[0], 10);
    $('#newH').value = parseInt(parts[1], 10);
  };

  $('#btnApplyCanvasSize').onclick = function(){
    const w = Math.max(1, Math.min(8000, parseInt($('#csW').value,10) || 1200));
    const h = Math.max(1, Math.min(8000, parseInt($('#csH').value,10) || 800));
    S.canvas.setWidth(w);
    S.canvas.setHeight(h);
    S.canvas.requestRenderAll();
    updateStatusBar();
    saveHistory('Canvas Size');
    closeModal('modalCanvasSize');
    fitToScreen();
    toast('Canvas resized','success');
  };
}

function openCanvasSize(){
  $('#csW').value = Math.round(S.canvas.getWidth());
  $('#csH').value = Math.round(S.canvas.getHeight());
  openModal('modalCanvasSize');
}

/* ============ PANEL COLLAPSE ============ */
function bindPanels(){
  $$('.panel-head').forEach(function(h){
    h.addEventListener('click', function(e){
      if(e.target.closest && e.target.closest('.panel-actions')) return;
      h.parentElement.classList.toggle('collapsed');
    });
  });
}

/* ============ TOOLBAR ============ */
function bindToolbar(){
  $$('.tool-btn').forEach(function(b){ b.onclick = function(){ setTool(b.dataset.tool); }; });

  $('#colorSwap').onclick = function(){
    const t = S.fg; S.fg = S.bg; S.bg = t;
    updateColorUI();
    const a = S.canvas.getActiveObject();
    if(a) applyColorToSelection(S.fg);
  };
  $('#colorReset').onclick = function(){
    S.fg = '#1473e6'; S.bg = '#ffffff';
    updateColorUI();
  };
  $('#fgSwatch').onclick = function(){ $('#colorFill').click(); };
  $('#bgSwatch').onclick = function(){ $('#colorStroke').click(); };
}

/* ============ SIDEBAR BINDINGS ============ */
function bindSidebar(){
  $('#btnLayerAdd').onclick = addLayer;
  $('#btnLayerDel').onclick = deleteLayer;
  $('#btnLayerDup').onclick = duplicateLayer;
  $('#btnLayerUp').onclick = function(){
    const a = S.canvas.getActiveObject();
    if(a){ S.canvas.bringForward(a); saveHistory('Bring Forward'); updateLayerPanel(); }
  };
  $('#btnLayerDown').onclick = function(){
    const a = S.canvas.getActiveObject();
    if(a){ S.canvas.sendBackwards(a); saveHistory('Send Backward'); updateLayerPanel(); }
  };
  $('#btnHistoryClear').onclick = function(){
    S.history = []; S.historyIndex = -1;
    saveHistory('Clear');
    toast('History cleared','info');
  };

  $('#blendMode').onchange = function(e){
    const a = S.canvas.getActiveObject();
    if(!a) return;
    if(a.type === 'activeSelection'){
      a.forEachObject(function(o){ o.set('globalCompositeOperation', e.target.value); });
    } else {
      a.set('globalCompositeOperation', e.target.value);
    }
    S.canvas.requestRenderAll();
    saveHistory('Blend Mode');
  };

  $('#layerOpacity').oninput = function(e){
    const v = Math.max(0, Math.min(100, parseInt(e.target.value,10) || 0)) / 100;
    const a = S.canvas.getActiveObject();
    if(!a) return;
    if(a.type === 'activeSelection'){
      a.forEachObject(function(o){ o.set('opacity', v); });
    } else {
      a.set('opacity', v);
    }
    S.canvas.requestRenderAll();
  };
  $('#layerOpacity').onchange = function(){ saveHistory('Opacity'); };

  $('#colorFill').oninput = function(e){ S.fg = e.target.value; updateColorUI(); };
  $('#colorFill').onchange = function(){ applyColorToSelection(S.fg); };
  $('#colorStroke').oninput = function(e){
    S.bg = e.target.value;
    updateColorUI();
    const a = S.canvas.getActiveObject();
    if(a){ a.set('stroke', e.target.value); S.canvas.requestRenderAll(); }
  };
  $('#colorFillHex').onchange = function(e){
    const v = hexNorm(e.target.value);
    if(v){ S.fg = v; updateColorUI(); applyColorToSelection(v); }
    else { updateColorUI(); }
  };
  $('#colorStrokeHex').onchange = function(e){
    const v = hexNorm(e.target.value);
    if(v){ S.bg = v; updateColorUI(); }
    else { updateColorUI(); }
  };

  const picker = $('#fontPicker');
  const trigger = $('#fontTrigger');
  trigger.onclick = function(e){
    e.stopPropagation();
    picker.classList.toggle('open');
    if(picker.classList.contains('open')){
      $('#fontSearch').value = '';
      buildFontList('');
      setTimeout(function(){ $('#fontSearch').focus(); }, 50);
    }
  };
  document.addEventListener('click', function(e){
    if(!picker.contains(e.target)) picker.classList.remove('open');
  });
  $('#fontSearch').oninput = function(e){ buildFontList(e.target.value); };

  $('#fontSize').oninput = function(e){
    const v = Math.max(1, parseInt(e.target.value,10) || 48);
    S.fontSize = v;
    applyTextProp('fontSize', v);
  };
  $('#fontWeight').onchange = function(e){
    S.fontWeight = e.target.value;
    applyTextProp('fontWeight', e.target.value);
  };

  $('#styleNormal').onclick = function(){
    S.fontStyle = 'normal'; S.underline = false;
    $('#styleNormal').classList.add('active');
    $('#styleItalic').classList.remove('active');
    $('#styleUnderline').classList.remove('active');
    applyTextProp('fontStyle', 'normal');
    applyTextProp('underline', false);
  };
  $('#styleItalic').onclick = function(){
    S.fontStyle = 'italic';
    $('#styleItalic').classList.add('active');
    $('#styleNormal').classList.remove('active');
    applyTextProp('fontStyle', 'italic');
  };
  $('#styleUnderline').onclick = function(){
    S.underline = !S.underline;
    $('#styleUnderline').classList.toggle('active', S.underline);
    applyTextProp('underline', S.underline);
  };

  $$('[data-align]').forEach(function(b){
    b.onclick = function(){
      S.textAlign = b.dataset.align;
      $$('[data-align]').forEach(function(x){ x.classList.remove('active'); });
      b.classList.add('active');
      applyTextProp('textAlign', b.dataset.align);
    };
  });

  $('#letterSpacing').oninput = function(e){
    const v = parseFloat(e.target.value) || 0;
    $('#letterSpacingNum').value = v;
    applyTextProp('charSpacing', v * 10);
  };
  $('#letterSpacingNum').oninput = function(e){
    const v = parseFloat(e.target.value) || 0;
    $('#letterSpacing').value = v;
    applyTextProp('charSpacing', v * 10);
  };
  $('#lineHeight').oninput = function(e){
    const v = parseFloat(e.target.value) || 1.16;
    $('#lineHeightNum').value = v;
    applyTextProp('lineHeight', v);
  };
  $('#lineHeightNum').oninput = function(e){
    const v = parseFloat(e.target.value) || 1.16;
    $('#lineHeight').value = v;
    applyTextProp('lineHeight', v);
  };
}

/* ============ ADJUSTMENTS ============ */
function bindAdjustments(){
  ['Brightness','Contrast','Saturation','Hue','Blur','Sepia'].forEach(function(k){
    const inp = $('#adj' + k);
    const lbl = $('#v' + k);
    inp.oninput = function(){ lbl.textContent = inp.value; };
  });
  $('#btnApplyAdj').onclick = applyAdjustments;
  $('#btnResetAdj').onclick = resetAdjustments;
}

/* ============ STATUS BAR ============ */
function bindStatusBar(){
  $('#zoomSlider').oninput = function(e){
    const z = (parseInt(e.target.value,10) || 100) / 100;
    S.canvas.setZoom(z);
    updateZoomDisplay();
  };
  $('#stFit').onclick = fitToScreen;
}

/* ============ KEYBOARD ============ */
function bindKeyboard(){
  document.addEventListener('keydown', function(e){
    const tag = (e.target.tagName || '').toLowerCase();
    if(tag === 'input' || tag === 'textarea' || tag === 'select'){
      if(e.key === 'Escape') e.target.blur();
      return;
    }

    const active = S.canvas ? S.canvas.getActiveObject() : null;
    if(active && active.isEditing) return;

    if(e.code === 'Space' && !e.ctrlKey && !e.metaKey){
      S.spaceDown = true;
      S.canvas.defaultCursor = 'grab';
      if(e.preventDefault) e.preventDefault();
      return;
    }

    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const key = (e.key || '').toLowerCase();

    if(e.key === 'Tab'){ e.preventDefault(); toggleSidebar(); return; }

    if(ctrl && key === 'z' && !shift){ e.preventDefault(); undo(); return; }
    if(ctrl && (key === 'y' || (shift && key === 'z'))){ e.preventDefault(); redo(); return; }
    if(ctrl && key === 's'){ e.preventDefault(); exportPNG(); return; }
    if(ctrl && key === 'o'){ e.preventDefault(); openImage(false); return; }
    if(ctrl && key === 'n' && !shift){ e.preventDefault(); openModal('modalNew'); return; }
    if(ctrl && shift && key === 'n'){ e.preventDefault(); addLayer(); return; }
    if(ctrl && key === 'j'){ e.preventDefault(); duplicateLayer(); return; }
    if(ctrl && key === 'e'){ e.preventDefault(); mergeDown(); return; }
    if(ctrl && (e.key === '=' || e.key === '+')){ e.preventDefault(); zoomBy(1.25); return; }
    if(ctrl && e.key === '-'){ e.preventDefault(); zoomBy(0.8); return; }
    if(ctrl && e.key === '0'){ e.preventDefault(); fitToScreen(); return; }
    if(ctrl && e.key === '1'){ e.preventDefault(); zoom100(); return; }
    if(ctrl && key === 'a'){ e.preventDefault(); selectAll(); return; }
    if(ctrl && key === 'c'){ e.preventDefault(); doCopy(); return; }
    if(ctrl && key === 'x'){ e.preventDefault(); doCut(); return; }
    if(ctrl && key === 'v'){ e.preventDefault(); doPaste(); return; }

    if(e.key === 'Escape'){
      if(S.cropRect){ cancelCrop(); return; }
      S.canvas.discardActiveObject();
      S.canvas.requestRenderAll();
      onSelectionChange();
      return;
    }
    if(e.key === 'Enter' && S.cropRect){ applyCrop(); return; }

    if(e.key === 'Delete' || e.key === 'Backspace'){
      if(active && !active.isEditing){
        e.preventDefault();
        deleteLayer();
      }
      return;
    }

    if(key === 'x'){
      const t = S.fg; S.fg = S.bg; S.bg = t;
      updateColorUI();
      return;
    }
    if(key === 'd'){
      S.fg = '#1473e6'; S.bg = '#ffffff';
      updateColorUI();
      return;
    }

    if(!ctrl){
      const map = {
        v:'select', m:'marquee', c:'crop', i:'eyedropper',
        b:'brush', e:'eraser', g:'fill',
        u:'rect', l:'line', p:'polygon', s:'star', t:'text', h:'hand', z:'zoom'
      };
      if(map[key]){ e.preventDefault(); setTool(map[key]); }
    }
  });

  document.addEventListener('keyup', function(e){
    if(e.code === 'Space'){
      S.spaceDown = false;
      if(S.canvas) S.canvas.defaultCursor = cursorFor(S.tool);
    }
  });
}

/* ============ SPLASH ============ */
function hideSplash(){
  const sp = $('#splash');
  if(!sp) return;
  setTimeout(function(){
    sp.classList.add('hide');
    setTimeout(function(){ sp.remove(); }, 450);
  }, 550);
}

/* ============ BOOT ============ */
function boot(){
  if(typeof fabric === 'undefined'){
    document.body.innerHTML =
      '<div style="padding:40px;font-family:sans-serif;color:#eee;background:#1a1a1a;height:100vh">' +
      '<h2>PixelForge</h2><p>Fabric.js failed to load. Please check your internet connection and reload.</p></div>';
    return;
  }

  initCanvas(1200, 800, '#ffffff');
  bindToolbar();
  bindMenus();
  bindModals();
  bindPanels();
  bindSidebar();
  bindAdjustments();
  bindStatusBar();
  bindKeyboard();
  buildSwatches();
  updateColorUI();
  buildFontList('');
  setTool('select');

  $('#sidebarToggle').onclick = toggleSidebar;

  window.addEventListener('resize', function(){
    if(S._resizeT) clearTimeout(S._resizeT);
    S._resizeT = setTimeout(function(){ /* viewport scroll handles resize */ }, 150);
  });

  S.ready = true;
  setTimeout(fitToScreen, 100);
  hideSplash();
  setTimeout(function(){ toast('Welcome to HelaBerry Paper','info',2000); }, 500);
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

})();