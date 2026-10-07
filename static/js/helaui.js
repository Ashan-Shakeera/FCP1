'use strict';
/* ============================================================
   HELABERRY STUDIO — Complete UI/UX design tool
   ============================================================ */

/* ---------- UTILITIES ---------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const uid = () => 'e' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const round = (v, p = 1) => Math.round(v * 10 ** p) / 10 ** p;
const deep = o => JSON.parse(JSON.stringify(o));
const escapeXml = s => String(s).replace(/[<>&'"]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;' }[c]));

/* ---------- STATE ---------- */
const state = {
  pages: [],
  currentPageId: null,
  elements: [],
  selectedIds: new Set(),
  hoverId: null,
  tool: 'select',
  zoom: 1,
  pan: { x: 0, y: 0 },
  history: [],
  historyIdx: -1,
  clipboard: null,
  components: [],
  colorStyles: [
    { id:'cs1', name:'Primary',  color:'#7c6cf0' },
    { id:'cs2', name:'Accent',   color:'#a29bfe' },
    { id:'cs3', name:'Dark',     color:'#070b13' },
    { id:'cs4', name:'Light',    color:'#f0f4fc' },
    { id:'cs5', name:'Success',  color:'#4ade80' },
    { id:'cs6', name:'Danger',   color:'#f87171' },
  ],
  textStyles: [
    { id:'ts1', name:'Heading 1', fontSize:32, fontWeight:800, fontFamily:'Inter', lineHeight:1.2,  letterSpacing:-0.5 },
    { id:'ts2', name:'Heading 2', fontSize:22, fontWeight:700, fontFamily:'Inter', lineHeight:1.3,  letterSpacing:-0.3 },
    { id:'ts3', name:'Body',      fontSize:14, fontWeight:400, fontFamily:'Inter', lineHeight:1.5,  letterSpacing:0 },
    { id:'ts4', name:'Caption',   fontSize:11, fontWeight:500, fontFamily:'Inter', lineHeight:1.4,  letterSpacing:0.3 },
  ],
  fileName: 'Untitled Design',
  previewMode: false,
};

/* ---------- ELEMENT DEFAULTS ---------- */
const ELEMENT_DEFAULTS = {
  frame:   { w:375, h:812, fill:'#0f1626', name:'Frame',     radius:0 },
  rect:    { w:160, h:100, fill:'#7c6cf0', name:'Rectangle', radius:8 },
  ellipse: { w:120, h:120, fill:'#a29bfe', name:'Ellipse' },
  line:    { w:200, h:2,   fill:'#b0c8e8', name:'Line',      radius:1 },
  text:    { w:220, h:32,  fill:'#f0f4fc', name:'Text',
             text:'Type something', fontSize:16, fontWeight:500,
             fontFamily:'Inter', lineHeight:1.4, letterSpacing:0, textAlign:'left' },
  path:    { w:100, h:100, fill:'#7c6cf0', name:'Path', points:[] },
  image:   { w:200, h:200, fill:'#1a2636', name:'Image', src:'' },
};
function createElement(type, props = {}){
  const base = {
    id: uid(), type, name: '', x: 0, y: 0, w: 100, h: 100,
    rotation: 0, opacity: 1, visible: true, locked: false,
    fill: '#7c6cf0', stroke: null, strokeWidth: 0, radius: 0,
    shadow: null, prototype: null,
  };
  return Object.assign(base, ELEMENT_DEFAULTS[type] || {}, props);
}

/* ---------- PAGES ---------- */
function initPages(){
  state.pages = [{ id:'p' + uid(), name:'Page 1', elements: [] }];
  state.currentPageId = state.pages[0].id;
  state.elements = state.pages[0].elements;
}
function currentPage(){ return state.pages.find(p => p.id === state.currentPageId); }
function saveCurrentPage(){ const p = currentPage(); if (p) p.elements = state.elements; }
function loadPage(id){
  const p = state.pages.find(x => x.id === id);
  state.currentPageId = id;
  state.elements = p ? (p.elements || (p.elements = [])) : [];
  state.selectedIds.clear();
}
function switchPage(id){
  if (id === state.currentPageId) return;
  saveCurrentPage();
  loadPage(id);
  render();
  pushHistory();
}
function addPage(){
  saveCurrentPage();
  const p = { id:'p' + uid(), name: 'Page ' + (state.pages.length + 1), elements: [] };
  state.pages.push(p);
  loadPage(p.id);
  render(); pushHistory();
  toast('Page created');
}
function deletePage(id){
  if (state.pages.length <= 1){ toast('Cannot delete the last page', 'warning'); return; }
  const idx = state.pages.findIndex(p => p.id === id);
  state.pages = state.pages.filter(p => p.id !== id);
  if (state.currentPageId === id) loadPage(state.pages[Math.max(0, idx - 1)].id);
  render(); pushHistory();
}

/* ---------- HISTORY ---------- */
function pushHistory(){
  saveCurrentPage();
  const snap = JSON.stringify({ pages: state.pages, currentPageId: state.currentPageId, fileName: state.fileName });
  if (state.history[state.historyIdx] === snap) return;
  state.history = state.history.slice(0, state.historyIdx + 1);
  state.history.push(snap);
  if (state.history.length > 100) state.history.shift();
  state.historyIdx = state.history.length - 1;
  updateHistoryButtons();
}
function undo(){ if (state.historyIdx <= 0) return; state.historyIdx--; restoreHistory(); }
function redo(){ if (state.historyIdx >= state.history.length - 1) return; state.historyIdx++; restoreHistory(); }
function restoreHistory(){
  const snap = JSON.parse(state.history[state.historyIdx]);
  state.pages = snap.pages;
  state.currentPageId = snap.currentPageId;
  state.fileName = snap.fileName;
  state.elements = currentPage().elements || [];
  state.selectedIds.clear();
  state.hoverId = null;
  $('#fileNameText').textContent = state.fileName;
  render();
}
function updateHistoryButtons(){
  $('#undoBtn').disabled = state.historyIdx <= 0;
  $('#redoBtn').disabled = state.historyIdx >= state.history.length - 1;
}

/* ---------- TRANSFORM ---------- */
function applyTransform(){
  $('#world').style.transform = `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`;
  $('#zoomVal').textContent = Math.round(state.zoom * 100) + '%';
}
function screenToWorld(sx, sy){
  const r = viewport.getBoundingClientRect();
  return { x: (sx - r.left - state.pan.x) / state.zoom, y: (sy - r.top - state.pan.y) / state.zoom };
}

/* ---------- BOUNDS ---------- */
function getBounds(elements){
  if (!elements.length) return { x:0, y:0, w:0, h:0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  elements.forEach(el => {
    const cx = el.x + el.w/2, cy = el.y + el.h/2;
    const rad = (el.rotation || 0) * Math.PI / 180;
    const cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad));
    const hw = (el.w * cos + el.h * sin) / 2;
    const hh = (el.w * sin + el.h * cos) / 2;
    minX = Math.min(minX, cx - hw); minY = Math.min(minY, cy - hh);
    maxX = Math.max(maxX, cx + hw); maxY = Math.max(maxY, cy + hh);
  });
  return { x:minX, y:minY, w:maxX - minX, h:maxY - minY };
}

/* ---------- RENDER ---------- */
function render(){
  renderCanvas();
  renderLayers();
  renderPages();
  renderProperties();
  renderAssets();
  applyTransform();
  updateHistoryButtons();
}

function renderCanvas(){
  const world = $('#world');
  const overlay = $('#selectionOverlay');
  $$('.el, .hover-outline, .guide-line, .ghost-el, .marquee', world).forEach(n => n.remove());
  state.elements.forEach(el => {
    if (!el.visible) return;
    const node = buildElementNode(el);
    world.insertBefore(node, overlay);
  });
  renderSelectionOverlay();
  updateHoverOutline();
}

function buildElementNode(el){
  const node = document.createElement('div');
  node.className = 'el ' + el.type;
  node.dataset.id = el.id;
  if (el.locked) node.classList.add('locked');
  if (state.selectedIds.has(el.id)) node.classList.add('selected');

  node.style.left = el.x + 'px';
  node.style.top = el.y + 'px';
  node.style.width = el.w + 'px';
  node.style.height = el.h + 'px';
  node.style.transform = `rotate(${el.rotation}deg)`;
  node.style.opacity = el.opacity;

  if (el.type === 'frame'){
    node.style.background = el.fill || '#fff';
    node.style.borderRadius = (el.radius || 0) + 'px';
    if (el.shadow) node.style.boxShadow = el.shadow;
    const label = document.createElement('div');
    label.className = 'frame-label';
    label.textContent = el.name;
    node.appendChild(label);
  }
  else if (el.type === 'rect'){
    node.style.background = el.fill || 'transparent';
    node.style.borderRadius = (el.radius || 0) + 'px';
    if (el.stroke && el.strokeWidth) node.style.border = `${el.strokeWidth}px solid ${el.stroke}`;
    if (el.shadow) node.style.boxShadow = el.shadow;
  }
  else if (el.type === 'ellipse'){
    node.style.background = el.fill || 'transparent';
    node.style.borderRadius = '50%';
    if (el.stroke && el.strokeWidth) node.style.border = `${el.strokeWidth}px solid ${el.stroke}`;
    if (el.shadow) node.style.boxShadow = el.shadow;
  }
  else if (el.type === 'line'){
    node.style.background = el.fill || '#fff';
    node.style.borderRadius = (el.radius || 1) + 'px';
  }
  else if (el.type === 'text'){
    node.style.color = el.fill || '#fff';
    node.style.fontSize = (el.fontSize || 16) + 'px';
    node.style.fontWeight = el.fontWeight || 400;
    node.style.fontFamily = `'${el.fontFamily || 'Inter'}', sans-serif`;
    node.style.lineHeight = el.lineHeight || 1.4;
    node.style.letterSpacing = (el.letterSpacing || 0) + 'px';
    node.style.textAlign = el.textAlign || 'left';
    node.style.justifyContent =
      el.textAlign === 'center' ? 'center' :
      el.textAlign === 'right'  ? 'flex-end' : 'flex-start';
    node.textContent = el.text || '';
    if (el.shadow) node.style.textShadow = el.shadow;
  }
  else if (el.type === 'path'){
    const pts = el.points || [];
    let d = '';
    if (pts.length){
      d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x} ${pts[i].y}`;
    }
    const sw = el.strokeWidth || 3;
    node.innerHTML = `<svg viewBox="0 0 ${Math.max(el.w, 1)} ${Math.max(el.h, 1)}" preserveAspectRatio="none">
      <path d="${d}" fill="none" stroke="${el.fill || '#7c6cf0'}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    </svg>`;
  }
  else if (el.type === 'image'){
    node.style.background = el.fill || '#1a2636';
    node.style.borderRadius = (el.radius || 0) + 'px';
    if (el.stroke && el.strokeWidth) node.style.border = `${el.strokeWidth}px solid ${el.stroke}`;
    if (el.src){
      node.innerHTML = `<img src="${escapeXml(el.src)}" alt="${escapeXml(el.name)}" draggable="false" />`;
      node.style.overflow = 'hidden';
    }
    if (el.shadow) node.style.boxShadow = el.shadow;
  }
  return node;
}

function renderSelectionOverlay(){
  const overlay = $('#selectionOverlay');
  overlay.innerHTML = '';
  const selected = state.elements.filter(el => state.selectedIds.has(el.id) && el.visible);
  if (!selected.length) return;

  const z = state.zoom;
  const hs = 8 / z;

  if (selected.length === 1){
    const el = selected[0];
    const cx = el.x + el.w/2, cy = el.y + el.h/2;
    const rad = (el.rotation || 0) * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);

    const box = document.createElement('div');
    box.className = 'sel-box';
    box.style.left = el.x + 'px';
    box.style.top = el.y + 'px';
    box.style.width = el.w + 'px';
    box.style.height = el.h + 'px';
    box.style.transform = `rotate(${el.rotation}deg)`;
    box.style.transformOrigin = 'center center';
    box.style.borderWidth = (1 / z) + 'px';
    overlay.appendChild(box);

    const rotDist = 28 / z;
    const rx = cx + (0 * cos - (-el.h/2 - rotDist) * sin);
    const ry = cy + (0 * sin + (-el.h/2 - rotDist) * cos);
    const rot = document.createElement('div');
    rot.className = 'sel-handle rot';
    rot.style.width = hs + 'px'; rot.style.height = hs + 'px';
    rot.style.left = (rx - hs/2) + 'px'; rot.style.top = (ry - hs/2) + 'px';
    rot.dataset.handle = 'rot';
    overlay.appendChild(rot);

    const tmx = cx + (0 * cos - (-el.h/2) * sin);
    const tmy = cy + (0 * sin + (-el.h/2) * cos);
    const len = Math.hypot(rx - tmx, ry - tmy);
    const ang = Math.atan2(ry - tmy, rx - tmx) * 180 / Math.PI;
    const line = document.createElement('div');
    line.style.cssText = `position:absolute;left:${tmx}px;top:${tmy}px;width:${len}px;height:${1/z}px;background:var(--accent);transform-origin:0 50%;transform:rotate(${ang}deg);pointer-events:none;`;
    overlay.appendChild(line);

    const localPos = {
      nw:{lx:-el.w/2, ly:-el.h/2}, n:{lx:0, ly:-el.h/2}, ne:{lx:el.w/2, ly:-el.h/2},
      e:{lx:el.w/2, ly:0}, se:{lx:el.w/2, ly:el.h/2}, s:{lx:0, ly:el.h/2},
      sw:{lx:-el.w/2, ly:el.h/2}, w:{lx:-el.w/2, ly:0},
    };
    const cursors = { nw:'nwse-resize', se:'nwse-resize', ne:'nesw-resize', sw:'nesw-resize', n:'ns-resize', s:'ns-resize', e:'ew-resize', w:'ew-resize' };
    Object.keys(localPos).forEach(h => {
      const p = localPos[h];
      const hx = cx + (p.lx * cos - p.ly * sin);
      const hy = cy + (p.lx * sin + p.ly * cos);
      const n = document.createElement('div');
      n.className = 'sel-handle';
      n.style.width = hs + 'px'; n.style.height = hs + 'px';
      n.style.left = (hx - hs/2) + 'px'; n.style.top = (hy - hs/2) + 'px';
      n.dataset.handle = h;
      n.style.cursor = cursors[h];
      overlay.appendChild(n);
    });

    const lbl = document.createElement('div');
    lbl.className = 'sel-size';
    lbl.style.left = cx + 'px';
    lbl.style.top = (cy - (el.h/2 * Math.abs(cos) + el.w/2 * Math.abs(sin)) - 8/z) + 'px';
    lbl.textContent = `${Math.round(el.w)} × ${Math.round(el.h)}`;
    overlay.appendChild(lbl);
  } else {
    const b = getBounds(selected);
    const box = document.createElement('div');
    box.className = 'sel-box multi';
    box.style.left = b.x + 'px'; box.style.top = b.y + 'px';
    box.style.width = b.w + 'px'; box.style.height = b.h + 'px';
    box.style.borderWidth = (1/z) + 'px';
    overlay.appendChild(box);

    const pos = {
      nw:{x:b.x, y:b.y}, n:{x:b.x + b.w/2, y:b.y}, ne:{x:b.x + b.w, y:b.y},
      e:{x:b.x + b.w, y:b.y + b.h/2}, se:{x:b.x + b.w, y:b.y + b.h},
      s:{x:b.x + b.w/2, y:b.y + b.h}, sw:{x:b.x, y:b.y + b.h}, w:{x:b.x, y:b.y + b.h/2},
    };
    const cursors = { nw:'nwse-resize', se:'nwse-resize', ne:'nesw-resize', sw:'nesw-resize', n:'ns-resize', s:'ns-resize', e:'ew-resize', w:'ew-resize' };
    Object.keys(pos).forEach(h => {
      const p = pos[h];
      const n = document.createElement('div');
      n.className = 'sel-handle';
      n.style.width = hs + 'px'; n.style.height = hs + 'px';
      n.style.left = (p.x - hs/2) + 'px'; n.style.top = (p.y - hs/2) + 'px';
      n.dataset.handle = h;
      n.dataset.multi = '1';
      n.style.cursor = cursors[h];
      overlay.appendChild(n);
    });

    const badge = document.createElement('div');
    badge.className = 'sel-badge';
    badge.style.left = (b.x + b.w/2) + 'px';
    badge.style.top = (b.y - 8/z) + 'px';
    badge.textContent = `${selected.length} selected`;
    overlay.appendChild(badge);
  }
}

/* ---------- HIT TEST ---------- */
function hitTest(el, wx, wy){
  if (!el.visible || el.locked) return false;
  const cx = el.x + el.w/2, cy = el.y + el.h/2;
  const rad = -(el.rotation || 0) * Math.PI / 180;
  const dx = wx - cx, dy = wy - cy;
  const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
  const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
  return Math.abs(lx) <= el.w/2 + 0.5 && Math.abs(ly) <= el.h/2 + 0.5;
}
function topmostAt(wx, wy){
  for (let i = state.elements.length - 1; i >= 0; i--){
    if (hitTest(state.elements[i], wx, wy)) return state.elements[i];
  }
  return null;
}

/* ============================================================
   CANVAS INTERACTIONS
   ============================================================ */
const viewport = $('#viewport');
const world = $('#world');
const overlay = $('#selectionOverlay');

let interaction = null;
let spaceHeld = false;
let currentGuides = [];

/* ---------- POINTER DOWN ---------- */
viewport.addEventListener('pointerdown', e => {
  if (e.button === 2) return;
  hideContextMenu();

  if (e.target.isContentEditable) return;

  const worldPos = screenToWorld(e.clientX, e.clientY);
  const handleEl = e.target.closest('.sel-handle');
  const elNode = e.target.closest('.el');

  if (state.tool === 'hand' || spaceHeld || e.button === 1){ startPan(e); return; }

  if (handleEl){
    const handle = handleEl.dataset.handle;
    if (handle === 'rot') startRotate(e);
    else if (handleEl.dataset.multi) startMultiResize(e, handle);
    else startResize(e, handle);
    return;
  }

  if (state.tool === 'pen'){ startPen(e, worldPos); return; }

  if (state.tool === 'image'){
    const src = prompt('Image URL:', 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=400');
    if (src){
      const el = createElement('image', {
        x: Math.round(worldPos.x), y: Math.round(worldPos.y),
        w: 240, h: 240, src, name: 'Image',
      });
      state.elements.push(el);
      state.selectedIds.clear(); state.selectedIds.add(el.id);
      setTool('select');
      render(); pushHistory();
      toast('Image added');
    }
    return;
  }

  if (state.tool !== 'select'){ startDraw(e, worldPos); return; }

  if (elNode){
    const id = elNode.dataset.id;
    if (e.shiftKey){
      if (state.selectedIds.has(id)) state.selectedIds.delete(id);
      else state.selectedIds.add(id);
      render();
    } else if (!state.selectedIds.has(id)){
      state.selectedIds.clear(); state.selectedIds.add(id); render();
    }
    startMove(e);
  } else {
    if (!e.shiftKey){ state.selectedIds.clear(); render(); }
    startMarquee(e, worldPos);
  }
});

/* ---------- POINTER MOVE ---------- */
document.addEventListener('pointermove', e => {
  if (!interaction && state.tool === 'select'){
    const wp = screenToWorld(e.clientX, e.clientY);
    const hit = topmostAt(wp.x, wp.y);
    const newHover = hit && !state.selectedIds.has(hit.id) ? hit.id : null;
    if (newHover !== state.hoverId){ state.hoverId = newHover; updateHoverOutline(); }
  }

  if (!interaction) return;
  const worldPos = screenToWorld(e.clientX, e.clientY);

  switch (interaction.mode){
    case 'pan': {
      state.pan.x = interaction.panStart.x + (e.clientX - interaction.startX);
      state.pan.y = interaction.panStart.y + (e.clientY - interaction.startY);
      applyTransform(); renderSelectionOverlay();
      break;
    }
    case 'draw': {
      const s = interaction.startWorld;
      let w = worldPos.x - s.x, h = worldPos.y - s.y;
      if (e.shiftKey){
        const size = Math.max(Math.abs(w), Math.abs(h));
        w = Math.sign(w) * size; h = Math.sign(h) * size;
      }
      const rect = { x: Math.min(s.x, s.x + w), y: Math.min(s.y, s.y + h), w: Math.abs(w), h: Math.abs(h) };
      interaction.rect = rect;
      drawGhost(rect);
      break;
    }
    case 'pen': {
      const dx = worldPos.x - interaction.startWorld.x;
      const dy = worldPos.y - interaction.startWorld.y;
      interaction.points.push({ x: dx, y: dy });
      drawPenPreview(interaction);
      break;
    }
    case 'move': {
      let dx = worldPos.x - interaction.startWorld.x;
      let dy = worldPos.y - interaction.startWorld.y;

      if (!e.altKey && !spaceHeld){
        const movingBounds = {
          x: interaction.originalsBounds.x + dx,
          y: interaction.originalsBounds.y + dy,
          w: interaction.originalsBounds.w,
          h: interaction.originalsBounds.h,
        };
        const others = state.elements.filter(el => !state.selectedIds.has(el.id) && el.visible);
        const snap = findSmartSnap(movingBounds, others, 6 / state.zoom);
        if (snap.dx !== null) dx += snap.dx;
        if (snap.dy !== null) dy += snap.dy;
        renderGuides(snap.guides);
      } else {
        clearGuides();
      }

      interaction.originals.forEach(({ id, x, y }) => {
        const el = state.elements.find(el => el.id === id);
        if (!el) return;
        el.x = Math.round(x + dx); el.y = Math.round(y + dy);
        updateElementDOM(el);
      });
      renderSelectionOverlay();
      break;
    }
    case 'resize': {
      const el = state.elements.find(x => x.id === interaction.id);
      if (!el) return;
      applyResize(el, interaction.handle, worldPos, e.shiftKey && !e.altKey);
      updateElementDOM(el);
      renderSelectionOverlay();
      break;
    }
    case 'multiResize': {
      applyMultiResize(worldPos, e.shiftKey);
      interaction.originals.forEach(o => {
        const el = state.elements.find(x => x.id === o.id);
        if (el) updateElementDOM(el);
      });
      renderSelectionOverlay();
      break;
    }
    case 'rotate': {
      const el = state.elements.find(x => x.id === interaction.id);
      if (!el) return;
      const cx = el.x + el.w/2, cy = el.y + el.h/2;
      let angle = Math.atan2(worldPos.y - cy, worldPos.x - cx) * 180 / Math.PI + 90;
      if (e.shiftKey) angle = Math.round(angle / 15) * 15;
      el.rotation = Math.round(angle * 10) / 10;
      updateElementDOM(el);
      renderSelectionOverlay();
      break;
    }
    case 'marquee': {
      const s = interaction.startWorld;
      const rect = {
        x: Math.min(s.x, worldPos.x), y: Math.min(s.y, worldPos.y),
        w: Math.abs(worldPos.x - s.x), h: Math.abs(worldPos.y - s.y),
      };
      interaction.rect = rect;
      drawMarquee(rect);
      const hits = state.elements.filter(el => {
        if (!el.visible || el.locked) return false;
        const b = getBounds([el]);
        return !(b.x + b.w < rect.x || b.x > rect.x + rect.w || b.y + b.h < rect.y || b.y > rect.y + rect.h);
      });
      if (!e.shiftKey) state.selectedIds.clear();
      hits.forEach(h => state.selectedIds.add(h.id));
      $$('.el', world).forEach(n => n.classList.toggle('selected', state.selectedIds.has(n.dataset.id)));
      renderSelectionOverlay();
      break;
    }
  }
});

/* ---------- POINTER UP ---------- */
document.addEventListener('pointerup', e => {
  if (!interaction) return;
  const mode = interaction.mode;

  if (mode === 'draw'){
    const rect = interaction.rect;
    if (rect && rect.w > 2 && rect.h > 2){
      const type = state.tool;
      const el = createElement(type, {
        x: Math.round(rect.x), y: Math.round(rect.y),
        w: Math.round(rect.w), h: Math.round(rect.h),
      });
      if (type === 'text'){
        el.w = Math.max(80, el.w); el.h = Math.max(24, el.h);
      }
      state.elements.push(el);
      state.selectedIds.clear(); state.selectedIds.add(el.id);
      setTool('select');
      render(); pushHistory();
      if (type === 'text') startTextEdit(el.id);
    }
    clearGhost();
  }
  else if (mode === 'pen'){
    const pts = interaction.points;
    if (pts.length > 3){
      const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
      const minX = Math.min(...xs), minY = Math.min(...ys);
      const maxX = Math.max(...xs), maxY = Math.max(...ys);
      const w = Math.max(2, maxX - minX), h = Math.max(2, maxY - minY);
      const normPts = pts.map(p => ({ x: p.x - minX, y: p.y - minY }));
      const el = createElement('path', {
        x: interaction.startWorld.x + minX,
        y: interaction.startWorld.y + minY,
        w, h, points: normPts, fill: '#a29bfe', strokeWidth: 3,
        name: 'Path',
      });
      state.elements.push(el);
      state.selectedIds.clear(); state.selectedIds.add(el.id);
      setTool('select');
      render(); pushHistory();
    }
    clearPenPreview();
  }
  else if (mode === 'move' || mode === 'resize' || mode === 'multiResize' || mode === 'rotate'){
    clearGuides();
    render(); pushHistory();
  }
  else if (mode === 'marquee'){ clearMarquee(); }
  else if (mode === 'pan'){ viewport.classList.remove('panning'); }

  interaction = null;
});

/* ---------- DOUBLE CLICK ---------- */
viewport.addEventListener('dblclick', e => {
  if (e.target.isContentEditable) return;
  const elNode = e.target.closest('.el');
  if (!elNode) return;
  const el = state.elements.find(x => x.id === elNode.dataset.id);
  if (!el) return;
  if (el.type === 'text') startTextEdit(el.id);
  else {
    const n = prompt('Layer name:', el.name);
    if (n){ el.name = n.trim() || el.name; renderLayers(); pushHistory(); }
  }
});

/* ---------- CONTEXT MENU ---------- */
viewport.addEventListener('contextmenu', e => {
  e.preventDefault();
  const elNode = e.target.closest('.el');
  showContextMenu(e.clientX, e.clientY, elNode ? elNode.dataset.id : null);
});

/* ---------- WHEEL ---------- */
viewport.addEventListener('wheel', e => {
  e.preventDefault();
  if (e.ctrlKey || e.metaKey){
    const r = viewport.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const wx = (mx - state.pan.x) / state.zoom, wy = (my - state.pan.y) / state.zoom;
    const d = -e.deltaY * 0.0015;
    const nz = clamp(state.zoom * (1 + d), 0.05, 8);
    state.zoom = nz;
    state.pan.x = mx - wx * nz; state.pan.y = my - wy * nz;
  } else if (e.shiftKey){ state.pan.x -= e.deltaY; }
  else { state.pan.x -= e.deltaX; state.pan.y -= e.deltaY; }
  applyTransform(); renderSelectionOverlay();
}, { passive: false });

/* ---------- STARTERS ---------- */
function startPan(e){
  interaction = { mode:'pan', startX:e.clientX, startY:e.clientY, panStart:{...state.pan} };
  viewport.classList.add('panning');
  try { viewport.setPointerCapture(e.pointerId); } catch(_){}
}
function startDraw(e, wp){
  interaction = { mode:'draw', startWorld: wp, rect: { x:wp.x, y:wp.y, w:0, h:0 } };
  try { viewport.setPointerCapture(e.pointerId); } catch(_){}
}
function startPen(e, wp){
  interaction = { mode:'pen', startWorld: wp, points: [{x:0,y:0}] };
  try { viewport.setPointerCapture(e.pointerId); } catch(_){}
}
function startMove(e){
  const selected = state.elements.filter(el => state.selectedIds.has(el.id));
  interaction = {
    mode:'move',
    startWorld: screenToWorld(e.clientX, e.clientY),
    originalsBounds: getBounds(selected),
    originals: selected.map(el => ({ id: el.id, x: el.x, y: el.y })),
  };
  try { viewport.setPointerCapture(e.pointerId); } catch(_){}
}
function startResize(e, handle){
  const id = [...state.selectedIds][0];
  interaction = { mode:'resize', id, handle };
  try { viewport.setPointerCapture(e.pointerId); } catch(_){}
}
function startRotate(e){
  const id = [...state.selectedIds][0];
  interaction = { mode:'rotate', id };
  try { viewport.setPointerCapture(e.pointerId); } catch(_){}
}
function startMultiResize(e, handle){
  const selected = state.elements.filter(el => state.selectedIds.has(el.id));
  interaction = {
    mode:'multiResize', handle,
    bounds0: getBounds(selected),
    originals: selected.map(el => ({ id: el.id, x: el.x, y: el.y, w: el.w, h: el.h })),
    startWorld: screenToWorld(e.clientX, e.clientY),
  };
  try { viewport.setPointerCapture(e.pointerId); } catch(_){}
}
function startMarquee(e, wp){
  interaction = { mode:'marquee', startWorld: wp, rect: { x:wp.x, y:wp.y, w:0, h:0 } };
  try { viewport.setPointerCapture(e.pointerId); } catch(_){}
}

/* ---------- RESIZE MATH ---------- */
function applyResize(el, handle, M, keepAspect){
  const w0 = el.w, h0 = el.h;
  const cx = el.x + w0/2, cy = el.y + h0/2;
  const th = el.rotation * Math.PI / 180;
  const u = { x: Math.cos(th), y: Math.sin(th) };
  const v = { x: -Math.sin(th), y: Math.cos(th) };

  const anchorOld = {
    'se': { x: -w0/2, y: -h0/2 },
    'nw': { x:  w0/2, y:  h0/2 },
    'ne': { x: -w0/2, y:  h0/2 },
    'sw': { x:  w0/2, y: -h0/2 },
    'e':  { x: -w0/2, y: 0 },
    'w':  { x:  w0/2, y: 0 },
    'n':  { x: 0, y:  h0/2 },
    's':  { x: 0, y: -h0/2 },
  }[handle];
  if (!anchorOld) return;

  const F = { x: cx + anchorOld.x * u.x + anchorOld.y * v.x, y: cy + anchorOld.x * u.y + anchorOld.y * v.y };
  const D = { x: M.x - F.x, y: M.y - F.y };
  const dxL = D.x * u.x + D.y * u.y;
  const dyL = D.x * v.x + D.y * v.y;

  const changesW = handle.includes('e') || handle.includes('w');
  const changesH = handle.includes('n') || handle.includes('s');

  let newW = changesW ? Math.max(1, handle.includes('e') ? dxL : -dxL) : w0;
  let newH = changesH ? Math.max(1, handle.includes('s') ? dyL : -dyL) : h0;

  if (keepAspect && changesW && changesH && w0 > 0 && h0 > 0){
    const ratio = w0 / h0;
    if (newW / newH > ratio) newW = newH * ratio;
    else newH = newW / ratio;
  }

  const anchorNew = {
    'se': { x: -newW/2, y: -newH/2 },
    'nw': { x:  newW/2, y:  newH/2 },
    'ne': { x: -newW/2, y:  newH/2 },
    'sw': { x:  newW/2, y: -newH/2 },
    'e':  { x: -newW/2, y: 0 },
    'w':  { x:  newW/2, y: 0 },
    'n':  { x: 0, y:  newH/2 },
    's':  { x: 0, y: -newH/2 },
  }[handle];

  const newCx = F.x - (anchorNew.x * u.x + anchorNew.y * v.x);
  const newCy = F.y - (anchorNew.x * u.y + anchorNew.y * v.y);

  el.w = newW; el.h = newH;
  el.x = newCx - newW/2; el.y = newCy - newH/2;
}

function applyMultiResize(M, keepAspect){
  const { handle, bounds0, originals } = interaction;
  const dx = M.x - interaction.startWorld.x;
  const dy = M.y - interaction.startWorld.y;
  let x = bounds0.x, y = bounds0.y, w = bounds0.w, h = bounds0.h;
  if (handle.includes('e')) w = Math.max(1, bounds0.w + dx);
  if (handle.includes('w')){ w = Math.max(1, bounds0.w - dx); x = bounds0.x + dx; }
  if (handle.includes('s')) h = Math.max(1, bounds0.h + dy);
  if (handle.includes('n')){ h = Math.max(1, bounds0.h - dy); y = bounds0.y + dy; }
  if (keepAspect && bounds0.w > 0 && bounds0.h > 0){
    const ratio = bounds0.w / bounds0.h;
    if (w / h > ratio) w = h * ratio; else h = w / ratio;
  }
  const sx = w / bounds0.w, sy = h / bounds0.h;
  originals.forEach(o => {
    const el = state.elements.find(e => e.id === o.id);
    if (!el) return;
    el.x = Math.round(x + (o.x - bounds0.x) * sx);
    el.y = Math.round(y + (o.y - bounds0.y) * sy);
    el.w = Math.max(1, Math.round(o.w * sx));
    el.h = Math.max(1, Math.round(o.h * sy));
  });
}

function updateElementDOM(el){
  const n = world.querySelector(`.el[data-id="${el.id}"]`);
  if (!n) return;
  n.style.left = el.x + 'px'; n.style.top = el.y + 'px';
  n.style.width = el.w + 'px'; n.style.height = el.h + 'px';
  n.style.transform = `rotate(${el.rotation}deg)`;
}

/* ---------- HOVER ---------- */
function updateHoverOutline(){
  $$('.hover-outline', world).forEach(n => n.remove());
  if (!state.hoverId) return;
  const el = state.elements.find(x => x.id === state.hoverId);
  if (!el || !el.visible) return;
  const n = document.createElement('div');
  n.className = 'hover-outline';
  n.style.left = el.x + 'px'; n.style.top = el.y + 'px';
  n.style.width = el.w + 'px'; n.style.height = el.h + 'px';
  n.style.transform = `rotate(${el.rotation}deg)`;
  n.style.borderWidth = (1.5 / state.zoom) + 'px';
  world.insertBefore(n, overlay);
}

/* ---------- SMART GUIDES ---------- */
function findSmartSnap(mb, others, threshold){
  const result = { dx: null, dy: null, guides: [] };
  if (!others.length) return result;

  const mx = [mb.x, mb.x + mb.w/2, mb.x + mb.w];
  const my = [mb.y, mb.y + mb.h/2, mb.y + mb.h];
  let bestX = threshold, bestY = threshold;

  others.forEach(o => {
    const b = getBounds([o]);
    const ox = [b.x, b.x + b.w/2, b.x + b.w];
    const oy = [b.y, b.y + b.h/2, b.y + b.h];

    mx.forEach(mv => {
      ox.forEach(ov => {
        const d = Math.abs(mv - ov);
        if (d < bestX){
          bestX = d;
          result.dx = ov - mv;
          result.guides = result.guides.filter(g => g.type !== 'v');
          result.guides.push({ type:'v', pos: ov });
        }
      });
    });
    my.forEach(mv => {
      oy.forEach(ov => {
        const d = Math.abs(mv - ov);
        if (d < bestY){
          bestY = d;
          result.dy = ov - mv;
          result.guides = result.guides.filter(g => g.type !== 'h');
          result.guides.push({ type:'h', pos: ov });
        }
      });
    });
  });
  return result;
}
function renderGuides(guides){
  clearGuides();
  if (!guides) return;
  guides.forEach(g => {
    const line = document.createElement('div');
    line.className = 'guide-line ' + g.type;
    if (g.type === 'v'){
      line.style.left = g.pos + 'px';
      line.style.top = '-10000px';
      line.style.width = (1 / state.zoom) + 'px';
      line.style.height = '20000px';
    } else {
      line.style.top = g.pos + 'px';
      line.style.left = '-10000px';
      line.style.height = (1 / state.zoom) + 'px';
      line.style.width = '20000px';
    }
    world.insertBefore(line, overlay);
  });
  currentGuides = guides;
}
function clearGuides(){
  $$('.guide-line', world).forEach(n => n.remove());
  currentGuides = [];
}

/* ---------- GHOST / MARQUEE / PEN PREVIEW ---------- */
let ghostEl = null;
function drawGhost(rect){
  if (!ghostEl){
    ghostEl = document.createElement('div');
    ghostEl.className = 'ghost-el';
    ghostEl.style.cssText = 'position:absolute;border:1.5px dashed var(--accent);background:rgba(124,108,240,0.08);pointer-events:none;z-index:40;box-sizing:border-box;';
    world.insertBefore(ghostEl, overlay);
  }
  ghostEl.style.left = rect.x + 'px'; ghostEl.style.top = rect.y + 'px';
  ghostEl.style.width = rect.w + 'px'; ghostEl.style.height = rect.h + 'px';
}
function clearGhost(){ if (ghostEl){ ghostEl.remove(); ghostEl = null; } }

let marqueeEl = null;
function drawMarquee(rect){
  if (!marqueeEl){
    marqueeEl = document.createElement('div');
    marqueeEl.className = 'marquee';
    overlay.appendChild(marqueeEl);
  }
  marqueeEl.style.left = rect.x + 'px'; marqueeEl.style.top = rect.y + 'px';
  marqueeEl.style.width = rect.w + 'px'; marqueeEl.style.height = rect.h + 'px';
  marqueeEl.style.borderWidth = (1 / state.zoom) + 'px';
}
function clearMarquee(){ if (marqueeEl){ marqueeEl.remove(); marqueeEl = null; } }

let penPreviewEl = null;
function drawPenPreview(inter){
  const pts = inter.points;
  if (pts.length < 2) return;
  if (!penPreviewEl){
    penPreviewEl = document.createElement('div');
    penPreviewEl.style.cssText = 'position:absolute;pointer-events:none;z-index:41;';
    world.insertBefore(penPreviewEl, overlay);
  }
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const maxX = Math.max(...xs), maxY = Math.max(...ys);
  const vw = Math.max(maxX - minX, 1), vh = Math.max(maxY - minY, 1);
  penPreviewEl.style.left = (inter.startWorld.x + minX) + 'px';
  penPreviewEl.style.top = (inter.startWorld.y + minY) + 'px';
  penPreviewEl.style.width = vw + 'px';
  penPreviewEl.style.height = vh + 'px';
  let d = `M ${pts[0].x - minX} ${pts[0].y - minY}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x - minX} ${pts[i].y - minY}`;
  penPreviewEl.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 ${vw} ${vh}" style="overflow:visible;"><path d="${d}" fill="none" stroke="var(--accent)" stroke-width="${3 / state.zoom}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function clearPenPreview(){ if (penPreviewEl){ penPreviewEl.remove(); penPreviewEl = null; } }

/* ---------- TEXT EDIT ---------- */
function startTextEdit(id){
  const el = state.elements.find(x => x.id === id);
  if (!el || el.type !== 'text') return;
  const node = world.querySelector(`.el[data-id="${id}"]`);
  if (!node) return;
  node.contentEditable = 'true';
  node.focus();
  const range = document.createRange();
  range.selectNodeContents(node);
  const sel = window.getSelection();
  sel.removeAllRanges(); sel.addRange(range);
  const finish = () => {
    node.contentEditable = 'false';
    el.text = node.textContent;
    node.removeEventListener('blur', finish);
    node.removeEventListener('keydown', onKey);
    render(); pushHistory();
  };
  const onKey = (e) => {
    if (e.key === 'Escape'){ e.preventDefault(); node.blur(); }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)){ e.preventDefault(); node.blur(); }
    e.stopPropagation();
  };
  node.addEventListener('blur', finish);
  node.addEventListener('keydown', onKey);
}

/* ============================================================
   TOOLS
   ============================================================ */
function setTool(t){
  state.tool = t;
  $$('.tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
  viewport.className = 'canvas-viewport tool-' + t;
}
$$('.tool-btn').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));

/* ============================================================
   KEYBOARD
   ============================================================ */
document.addEventListener('keydown', e => {
  if (e.target.matches && e.target.matches('input, textarea, select') || e.target.isContentEditable){
    if (e.key === 'Escape') e.target.blur();
    return;
  }
  const mod = e.ctrlKey || e.metaKey;
  const code = e.code;

  if (code === 'Space' && !spaceHeld){
    spaceHeld = true;
    viewport.classList.add('tool-hand');
    e.preventDefault(); return;
  }

  if (!mod && !e.shiftKey && !e.altKey){
    const map = { v:'select', f:'frame', r:'rect', o:'ellipse', l:'line', t:'text', p:'pen', i:'image', h:'hand' };
    const k = (e.key || '').toLowerCase();
    if (map[k]){ setTool(map[k]); e.preventDefault(); return; }
  }

  if (e.key === 'Delete' || e.key === 'Backspace'){
    if (state.selectedIds.size){
      e.preventDefault();
      state.elements = state.elements.filter(el => !state.selectedIds.has(el.id));
      state.selectedIds.clear();
      render(); pushHistory();
      toast('Deleted');
    }
    return;
  }

  if (e.key === 'Escape'){
    state.selectedIds.clear(); setTool('select'); render();
    return;
  }

  if (mod && (e.key || '').toLowerCase() === 'a'){
    e.preventDefault();
    state.selectedIds = new Set(state.elements.filter(el => !el.locked && el.visible).map(el => el.id));
    render(); return;
  }
  if (mod && (e.key || '').toLowerCase() === 'z'){
    e.preventDefault();
    if (e.shiftKey) redo(); else undo();
    return;
  }
  if (mod && (e.key || '').toLowerCase() === 'y'){ e.preventDefault(); redo(); return; }
  if (mod && (e.key || '').toLowerCase() === 'd'){ e.preventDefault(); duplicateSelected(); return; }

  if (mod && (e.key || '').toLowerCase() === 'c'){
    if (state.selectedIds.size){
      state.clipboard = state.elements.filter(el => state.selectedIds.has(el.id)).map(deep);
      toast('Copied');
    }
    return;
  }
  if (mod && (e.key || '').toLowerCase() === 'x'){
    if (state.selectedIds.size){
      state.clipboard = state.elements.filter(el => state.selectedIds.has(el.id)).map(deep);
      state.elements = state.elements.filter(el => !state.selectedIds.has(el.id));
      state.selectedIds.clear();
      render(); pushHistory();
      toast('Cut');
    }
    return;
  }
  if (mod && (e.key || '').toLowerCase() === 'v'){
    if (state.clipboard && state.clipboard.length){
      const newIds = [];
      state.clipboard.forEach(src => {
        const el = deep(src);
        el.id = uid();
        el.x += 20; el.y += 20;
        state.elements.push(el);
        newIds.push(el.id);
      });
      state.selectedIds = new Set(newIds);
      render(); pushHistory();
      toast('Pasted');
    }
    return;
  }

  if (mod && (e.key === '=' || e.key === '+')){ e.preventDefault(); zoomBy(1.2); return; }
  if (mod && e.key === '-'){ e.preventDefault(); zoomBy(1/1.2); return; }
  if (mod && e.key === '0'){ e.preventDefault(); resetZoom(); return; }

  if (!mod && e.shiftKey && code === 'Digit1'){ e.preventDefault(); fitToScreen(); return; }

  if (!mod && e.shiftKey && (e.key || '').toLowerCase() === 'p'){ e.preventDefault(); enterPreview(); return; }

  if (mod && code === 'BracketRight'){
    e.preventDefault();
    if (e.shiftKey) bringToFront(); else bringForward();
    return;
  }
  if (mod && code === 'BracketLeft'){
    e.preventDefault();
    if (e.shiftKey) sendToBack(); else sendBackward();
    return;
  }

  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){
    if (state.selectedIds.size){
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      state.elements.forEach(el => {
        if (state.selectedIds.has(el.id)){ el.x += dx; el.y += dy; }
      });
      render(); pushHistory();
    }
    return;
  }
});

document.addEventListener('keyup', e => {
  if (e.code === 'Space'){
    spaceHeld = false;
    if (state.tool !== 'hand') viewport.classList.remove('tool-hand');
  }
});

function duplicateSelected(){
  if (!state.selectedIds.size) return;
  const newIds = [];
  state.elements.forEach(el => {
    if (state.selectedIds.has(el.id)){
      const c = deep(el);
      c.id = uid();
      c.x += 20; c.y += 20;
      state.elements.push(c);
      newIds.push(c.id);
    }
  });
  state.selectedIds = new Set(newIds);
  render(); pushHistory();
  toast('Duplicated');
}

function bringForward(){
  if (!state.selectedIds.size) return;
  for (let i = state.elements.length - 2; i >= 0; i--){
    if (state.selectedIds.has(state.elements[i].id) && !state.selectedIds.has(state.elements[i+1].id)){
      [state.elements[i], state.elements[i+1]] = [state.elements[i+1], state.elements[i]];
    }
  }
  render(); pushHistory();
}
function sendBackward(){
  if (!state.selectedIds.size) return;
  for (let i = 1; i < state.elements.length; i++){
    if (state.selectedIds.has(state.elements[i].id) && !state.selectedIds.has(state.elements[i-1].id)){
      [state.elements[i], state.elements[i-1]] = [state.elements[i-1], state.elements[i]];
    }
  }
  render(); pushHistory();
}
function bringToFront(){
  if (!state.selectedIds.size) return;
  const sel = state.elements.filter(el => state.selectedIds.has(el.id));
  state.elements = state.elements.filter(el => !state.selectedIds.has(el.id)).concat(sel);
  render(); pushHistory();
}
function sendToBack(){
  if (!state.selectedIds.size) return;
  const sel = state.elements.filter(el => state.selectedIds.has(el.id));
  state.elements = sel.concat(state.elements.filter(el => !state.selectedIds.has(el.id)));
  render(); pushHistory();
}

/* ============================================================
   ZOOM
   ============================================================ */
function zoomBy(factor){
  const r = viewport.getBoundingClientRect();
  const mx = r.width/2, my = r.height/2;
  const wx = (mx - state.pan.x) / state.zoom, wy = (my - state.pan.y) / state.zoom;
  state.zoom = clamp(state.zoom * factor, 0.05, 8);
  state.pan.x = mx - wx * state.zoom;
  state.pan.y = my - wy * state.zoom;
  applyTransform(); renderSelectionOverlay();
}
function resetZoom(){ state.zoom = 1; applyTransform(); renderSelectionOverlay(); }
function fitToScreen(){
  if (!state.elements.length){ state.zoom = 1; state.pan = {x:0,y:0}; applyTransform(); return; }
  const b = getBounds(state.elements);
  const r = viewport.getBoundingClientRect();
  const pad = 100;
  state.zoom = clamp(Math.min((r.width - pad) / b.w, (r.height - pad) / b.h), 0.05, 4);
  state.pan.x = (r.width - b.w * state.zoom) / 2 - b.x * state.zoom;
  state.pan.y = (r.height - b.h * state.zoom) / 2 - b.y * state.zoom;
  applyTransform(); renderSelectionOverlay();
}
$('#zoomInBtn').addEventListener('click', () => zoomBy(1.2));
$('#zoomOutBtn').addEventListener('click', () => zoomBy(1/1.2));
$('#fitBtn').addEventListener('click', fitToScreen);
$('#zoomVal').addEventListener('click', resetZoom);
$('#undoBtn').addEventListener('click', undo);
$('#redoBtn').addEventListener('click', redo);

/* ============================================================
   LAYERS PANEL
   ============================================================ */
function renderLayers(){
  const list = $('#layersList');
  list.innerHTML = '';
  if (!state.elements.length){
    list.innerHTML = '<div class="empty-state"><i class="fas fa-layer-group"></i>No layers yet.<br>Draw something on the canvas.</div>';
    return;
  }
  const reversed = [...state.elements].reverse();
  reversed.forEach(el => {
    const item = document.createElement('div');
    item.className = 'layer-item';
    item.dataset.id = el.id;
    if (state.selectedIds.has(el.id)) item.classList.add('selected');
    item.draggable = true;

    const icon = document.createElement('div');
    icon.className = 'layer-icon';
    const icons = { rect:'fa-square', ellipse:'fa-circle', text:'fa-font', frame:'fa-vector-square', line:'fa-minus', path:'fa-pen', image:'fa-image' };
    const prefix = (el.type === 'rect' || el.type === 'ellipse' || el.type === 'image') ? 'far' : 'fas';
    icon.innerHTML = `<i class="${prefix} ${icons[el.type] || 'fa-square'}"></i>`;
    item.appendChild(icon);

    const name = document.createElement('div');
    name.className = 'layer-name';
    name.textContent = el.name || el.type;
    name.addEventListener('dblclick', e => {
      e.stopPropagation();
      name.contentEditable = 'true'; name.focus();
      document.execCommand('selectAll', false, null);
    });
    name.addEventListener('blur', () => {
      name.contentEditable = 'false';
      el.name = name.textContent.trim() || el.type;
      renderProperties();
    });
    name.addEventListener('keydown', e => {
      if (e.key === 'Enter'){ e.preventDefault(); name.blur(); }
      if (e.key === 'Escape'){ name.textContent = el.name; name.blur(); }
      e.stopPropagation();
    });
    item.appendChild(name);

    const vis = document.createElement('button');
    vis.className = 'layer-btn' + (el.visible ? ' on' : '');
    vis.innerHTML = `<i class="fas fa-eye${el.visible ? '' : '-slash'}"></i>`;
    vis.title = el.visible ? 'Hide' : 'Show';
    vis.addEventListener('click', e => {
      e.stopPropagation();
      el.visible = !el.visible;
      render(); pushHistory();
    });
    item.appendChild(vis);

    const lock = document.createElement('button');
    lock.className = 'layer-btn' + (el.locked ? ' locked' : '');
    lock.innerHTML = `<i class="fas fa-${el.locked ? 'lock' : 'lock-open'}"></i>`;
    lock.title = el.locked ? 'Unlock' : 'Lock';
    lock.addEventListener('click', e => {
      e.stopPropagation();
      el.locked = !el.locked;
      render(); pushHistory();
    });
    item.appendChild(lock);

    item.addEventListener('click', e => {
      if (e.target.closest('.layer-btn')) return;
      if (e.target.closest('.layer-name[contenteditable="true"]')) return;
      if (e.shiftKey){
        if (state.selectedIds.has(el.id)) state.selectedIds.delete(el.id);
        else state.selectedIds.add(el.id);
      } else {
        state.selectedIds.clear(); state.selectedIds.add(el.id);
      }
      render();
    });

    item.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/layer-id', el.id);
      e.dataTransfer.effectAllowed = 'move';
      item.classList.add('dragging');
    });
    item.addEventListener('dragend', () => item.classList.remove('dragging'));
    item.addEventListener('dragover', e => {
      e.preventDefault();
      const r = item.getBoundingClientRect();
      const above = (e.clientY - r.top) < r.height / 2;
      item.classList.toggle('drop-above', above);
      item.classList.toggle('drop-below', !above);
    });
    item.addEventListener('dragleave', () => item.classList.remove('drop-above', 'drop-below'));
    item.addEventListener('drop', e => {
      e.preventDefault();
      const above = item.classList.contains('drop-above');
      item.classList.remove('drop-above', 'drop-below');
      const draggedId = e.dataTransfer.getData('text/layer-id');
      if (!draggedId || draggedId === el.id) return;
      const dragged = state.elements.find(x => x.id === draggedId);
      if (!dragged) return;
      state.elements.splice(state.elements.indexOf(dragged), 1);
      const toIdx = state.elements.indexOf(el);
      state.elements.splice(above ? toIdx + 1 : toIdx, 0, dragged);
      render(); pushHistory();
    });

    list.appendChild(item);
  });
}

/* ============================================================
   PAGES
   ============================================================ */
function renderPages(){
  const list = $('#pagesList');
  list.innerHTML = '';
  state.pages.forEach(p => {
    const item = document.createElement('div');
    item.className = 'page-item' + (p.id === state.currentPageId ? ' active' : '');
    item.innerHTML = `
      <i class="fas fa-file" style="font-size:10px;opacity:0.6;"></i>
      <span class="page-name">${escapeXml(p.name)}</span>
      <button class="page-del" title="Delete"><i class="fas fa-times"></i></button>
    `;
    const n = item.querySelector('.page-name');
    n.addEventListener('dblclick', e => {
      e.stopPropagation();
      n.contentEditable = 'true'; n.focus();
      document.execCommand('selectAll', false, null);
    });
    n.addEventListener('blur', () => {
      n.contentEditable = 'false';
      p.name = n.textContent.trim() || 'Page';
      renderPages(); pushHistory();
    });
    n.addEventListener('keydown', e => {
      if (e.key === 'Enter'){ e.preventDefault(); n.blur(); }
      if (e.key === 'Escape'){ n.textContent = p.name; n.blur(); }
      e.stopPropagation();
    });
    item.querySelector('.page-del').addEventListener('click', e => {
      e.stopPropagation(); deletePage(p.id);
    });
    item.addEventListener('click', e => {
      if (e.target.closest('.page-del')) return;
      if (e.target.closest('.page-name[contenteditable="true"]')) return;
      switchPage(p.id);
    });
    list.appendChild(item);
  });
}
$('#addPageBtn').addEventListener('click', addPage);

/* ============================================================
   PROPERTIES
   ============================================================ */
function renderProperties(){
  const container = $('#designContent');
  const selected = state.elements.filter(el => state.selectedIds.has(el.id));

  if (!selected.length){
    container.innerHTML = `
      <div class="panel-empty">
        <i class="fas fa-hand-pointer"></i>
        Select a layer to edit its properties.<br>
        Or use the toolbar to draw something.
      </div>`;
    renderPrototype(); renderInspect();
    return;
  }

  const el = selected[0];
  const isMulti = selected.length > 1;
  let html = '';

  if (isMulti){
    html += `
      <div class="prop-group">
        <div class="prop-group-title"><span>Align</span></div>
        <div class="align-row">
          <button class="align-btn" data-align="left"    title="Left"><i class="fas fa-align-left"></i></button>
          <button class="align-btn" data-align="hcenter" title="Center H"><i class="fas fa-arrows-alt-h"></i></button>
          <button class="align-btn" data-align="right"   title="Right"><i class="fas fa-align-right"></i></button>
          <button class="align-btn" data-align="top"     title="Top"><i class="fas fa-arrow-up"></i></button>
          <button class="align-btn" data-align="vcenter" title="Center V"><i class="fas fa-arrows-alt-v"></i></button>
          <button class="align-btn" data-align="bottom"  title="Bottom"><i class="fas fa-arrow-down"></i></button>
        </div>
      </div>`;
  }

  html += `
    <div class="prop-group">
      <div class="prop-group-title"><span>${isMulti ? selected.length + ' selected' : 'Position & size'}</span></div>
      <div class="row-2">
        <div class="field"><label>X</label><input type="number" data-prop="x" value="${round(el.x)}" /></div>
        <div class="field"><label>Y</label><input type="number" data-prop="y" value="${round(el.y)}" /></div>
      </div>
      <div class="row-2">
        <div class="field"><label>W</label><input type="number" data-prop="w" value="${round(el.w)}" min="1" /></div>
        <div class="field"><label>H</label><input type="number" data-prop="h" value="${round(el.h)}" min="1" /></div>
      </div>
      <div class="row-2">
        <div class="field"><label title="Rotation"><i class="fas fa-rotate" style="font-size:9px;"></i></label><input type="number" data-prop="rotation" value="${round(el.rotation)}" /></div>
        <div class="field"><label title="Radius"><i class="fas fa-border-all" style="font-size:9px;"></i></label><input type="number" data-prop="radius" value="${round(el.radius || 0)}" min="0" /></div>
      </div>
    </div>`;

  if (el.type !== 'line' && el.type !== 'path'){
    html += `
      <div class="prop-group">
        <div class="prop-group-title">
          <span>Fill</span>
          <span class="pg-action" data-action="save-color-style">Save style</span>
        </div>
        <div class="row">
          <div class="color-field">
            <div class="color-swatch">
              <div class="swatch-fill" style="background:${el.fill || 'transparent'};"></div>
              <input type="color" data-prop="fill" value="${el.fill && el.fill !== 'transparent' ? el.fill : '#7c6cf0'}" />
            </div>
            <input type="text" class="color-hex" data-prop="fill" value="${(el.fill || 'transparent').toUpperCase()}" />
          </div>
        </div>
      </div>`;
  }
  if (el.type === 'path' || el.type === 'line'){
    html += `
      <div class="prop-group">
        <div class="prop-group-title"><span>Stroke</span></div>
        <div class="row">
          <div class="color-field">
            <div class="color-swatch">
              <div class="swatch-fill" style="background:${el.fill || '#7c6cf0'};"></div>
              <input type="color" data-prop="fill" value="${el.fill || '#7c6cf0'}" />
            </div>
            <input type="text" class="color-hex" data-prop="fill" value="${(el.fill || '#7c6cf0').toUpperCase()}" />
          </div>
        </div>
        <div class="slider-row">
          <span class="slider-label">Width</span>
          <input type="range" class="slider" data-prop="strokeWidth" min="1" max="30" step="0.5" value="${el.strokeWidth || 3}" />
          <span class="slider-val">${round(el.strokeWidth || 3)}</span>
        </div>
      </div>`;
  } else if (el.type !== 'line'){
    html += `
      <div class="prop-group">
        <div class="prop-group-title"><span>Stroke</span></div>
        <div class="row">
          <div class="color-field">
            <div class="color-swatch">
              <div class="swatch-fill" style="background:${el.stroke || 'transparent'};"></div>
              <input type="color" data-prop="stroke" value="${el.stroke || '#ffffff'}" />
            </div>
            <input type="text" class="color-hex" data-prop="stroke" value="${(el.stroke || 'none').toUpperCase()}" />
          </div>
        </div>
        <div class="slider-row">
          <span class="slider-label">Width</span>
          <input type="range" class="slider" data-prop="strokeWidth" min="0" max="20" step="0.5" value="${el.strokeWidth || 0}" />
          <span class="slider-val">${round(el.strokeWidth || 0)}</span>
        </div>
      </div>`;
  }

  if (el.type === 'text'){
    html += `
      <div class="prop-group">
        <div class="prop-group-title">
          <span>Typography</span>
          <span class="pg-action" data-action="save-text-style">Save style</span>
        </div>
        <div class="row">
          <div class="field" style="width:100%;">
            <select data-prop="fontFamily">
              ${['Inter','Arial','Georgia','Courier New','Times New Roman','Verdana'].map(f =>
                `<option ${el.fontFamily === f ? 'selected' : ''}>${f}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="row-2">
          <div class="field"><label>Size</label><input type="number" data-prop="fontSize" value="${el.fontSize || 16}" min="1" /></div>
          <div class="field"><label>Weight</label>
            <select data-prop="fontWeight">
              ${[300,400,500,600,700,800,900].map(w =>
                `<option value="${w}" ${el.fontWeight == w ? 'selected' : ''}>${w}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="row-2">
          <div class="field"><label title="Line height">LH</label><input type="number" data-prop="lineHeight" step="0.1" value="${el.lineHeight || 1.4}" /></div>
          <div class="field"><label title="Letter spacing">LS</label><input type="number" data-prop="letterSpacing" step="0.1" value="${el.letterSpacing || 0}" /></div>
        </div>
        <div class="segment" data-prop="textAlign">
          <button data-val="left"    class="${el.textAlign === 'left' ? 'active' : ''}"><i class="fas fa-align-left"></i></button>
          <button data-val="center"  class="${el.textAlign === 'center' ? 'active' : ''}"><i class="fas fa-align-center"></i></button>
          <button data-val="right"   class="${el.textAlign === 'right' ? 'active' : ''}"><i class="fas fa-align-right"></i></button>
          <button data-val="justify" class="${el.textAlign === 'justify' ? 'active' : ''}"><i class="fas fa-align-justify"></i></button>
        </div>
      </div>`;
  }

  html += `
    <div class="prop-group">
      <div class="prop-group-title"><span>Opacity</span></div>
      <div class="slider-row">
        <span class="slider-label">Opacity</span>
        <input type="range" class="slider" data-prop="opacity" min="0" max="1" step="0.01" value="${el.opacity ?? 1}" />
        <span class="slider-val">${Math.round((el.opacity ?? 1) * 100)}%</span>
      </div>
    </div>

    <div class="prop-group">
      <div class="prop-group-title">
        <span>Effects</span>
        <span class="pg-action" data-action="add-shadow">+ Shadow</span>
      </div>
      ${el.shadow
        ? `<div class="effect-item"><i class="fas fa-clone"></i><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;">${escapeXml(el.shadow)}</span><span style="cursor:pointer;padding:2px 4px;" data-action="remove-shadow"><i class="fas fa-times"></i></span></div>`
        : '<div style="font-size:11px;color:var(--text-4);padding:2px 0;">No effects</div>'}
    </div>

    <div class="prop-group">
      <div class="prop-group-title"><span>Prototype</span></div>
      <div class="row">
        <div class="field" style="width:100%;">
          <label style="width:auto;">On click →</label>
          <select data-prop="protoTarget">
            <option value="">None</option>
            ${state.pages.filter(p => p.id !== state.currentPageId).map(p =>
              `<option value="${p.id}" ${el.prototype && el.prototype.target === p.id ? 'selected' : ''}>${escapeXml(p.name)}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>`;

  container.innerHTML = html;
  bindPropertyInputs();
  bindAlignButtons();
  bindPropActions();
  renderPrototype();
  renderInspect();
}

function bindPropertyInputs(){
  const selected = state.elements.filter(el => state.selectedIds.has(el.id));
  if (!selected.length) return;

  $$('[data-prop]', $('#designContent')).forEach(input => {
    const prop = input.dataset.prop;
    if (prop === 'textAlign' || prop === 'protoTarget') return;
    if (input.tagName !== 'INPUT' && input.tagName !== 'SELECT') return;
    const isRange = input.type === 'range';

    const apply = (record) => {
      let val = input.value;
      if (input.type === 'number' || input.type === 'range') val = parseFloat(val);
      if ((input.type === 'number' || input.type === 'range') && isNaN(val)) return;

      if (prop === 'fill' || prop === 'stroke'){
        if (typeof val === 'string'){
          const t = val.trim().toLowerCase();
          if (t === 'transparent') val = 'transparent';
          else if (t === 'none') val = null;
          else if (!val.startsWith('#')){
            const clean = val.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
            val = '#' + (clean.length === 6 ? clean : clean.padEnd(6, '0'));
          }
        }
      }

      selected.forEach(s => {
        s[prop] = val;
        if (prop === 'stroke' && val && !s.strokeWidth) s.strokeWidth = 1;
      });
      renderCanvas();
      if (record) pushHistory();
      if (isRange){
        const valEl = input.parentElement.querySelector('.slider-val');
        if (valEl){
          if (prop === 'opacity') valEl.textContent = Math.round(val * 100) + '%';
          else valEl.textContent = round(val);
        }
      }
      syncPairedInputs(prop);
    };
    input.addEventListener('input', () => apply(false));
    input.addEventListener('change', () => apply(true));
  });

  $$('[data-prop="textAlign"] button', $('#designContent')).forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.val;
      selected.forEach(s => s.textAlign = val);
      render(); pushHistory();
    });
  });

  $$('[data-prop="protoTarget"]', $('#designContent')).forEach(sel => {
    sel.addEventListener('change', () => {
      selected.forEach(s => {
        if (sel.value) s.prototype = { target: sel.value };
        else s.prototype = null;
      });
      pushHistory(); renderInspect();
    });
  });
}

function syncPairedInputs(prop){
  const selected = state.elements.filter(el => state.selectedIds.has(el.id));
  if (!selected.length) return;
  const el = selected[0];
  const raw = el[prop];

  $$(`input.color-hex[data-prop="${prop}"]`, $('#designContent')).forEach(inp => {
    if (raw === null || raw === undefined) inp.value = 'NONE';
    else inp.value = String(raw).toUpperCase();
  });
  $$(`input[type="color"][data-prop="${prop}"]`, $('#designContent')).forEach(inp => {
    if (raw && raw !== 'transparent' && raw !== 'none') inp.value = raw;
  });
  $$('.color-field', $('#designContent')).forEach(cf => {
    const inp = cf.querySelector(`input[data-prop="${prop}"]`);
    if (!inp) return;
    const sf = cf.querySelector('.swatch-fill');
    if (sf) sf.style.background = raw && raw !== 'none' ? raw : 'transparent';
  });
}

function bindAlignButtons(){
  $$('[data-align]', $('#designContent')).forEach(btn => {
    btn.addEventListener('click', () => {
      const selected = state.elements.filter(el => state.selectedIds.has(el.id));
      if (!selected.length) return;
      const mode = btn.dataset.align;
      const b = getBounds(selected);
      selected.forEach(el => {
        switch (mode){
          case 'left':    el.x = b.x; break;
          case 'right':   el.x = b.x + b.w - el.w; break;
          case 'hcenter': el.x = b.x + (b.w - el.w) / 2; break;
          case 'top':     el.y = b.y; break;
          case 'bottom':  el.y = b.y + b.h - el.h; break;
          case 'vcenter': el.y = b.y + (b.h - el.h) / 2; break;
        }
      });
      render(); pushHistory();
    });
  });
}

function bindPropActions(){
  $$('[data-action]', $('#designContent')).forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      const action = b.dataset.action;
      const selected = state.elements.filter(el => state.selectedIds.has(el.id));
      if (!selected.length) return;
      const el = selected[0];
      if (action === 'save-color-style'){
        if (!el.fill || el.fill === 'transparent'){ toast('No fill to save', 'warning'); return; }
        const name = prompt('Style name:', 'Color ' + (state.colorStyles.length + 1));
        if (!name) return;
        state.colorStyles.push({ id: uid(), name, color: el.fill });
        renderAssets(); toast('Color style saved');
      }
      else if (action === 'save-text-style'){
        if (el.type !== 'text') return;
        const name = prompt('Style name:', 'Text ' + (state.textStyles.length + 1));
        if (!name) return;
        state.textStyles.push({
          id: uid(), name,
          fontSize: el.fontSize, fontWeight: el.fontWeight,
          fontFamily: el.fontFamily, lineHeight: el.lineHeight,
          letterSpacing: el.letterSpacing,
        });
        renderAssets(); toast('Text style saved');
      }
      else if (action === 'add-shadow'){ el.shadow = '0 8px 24px rgba(0,0,0,0.35)'; render(); pushHistory(); }
      else if (action === 'remove-shadow'){ el.shadow = null; render(); pushHistory(); }
    });
  });
}

/* ============================================================
   PROTOTYPE / INSPECT
   ============================================================ */
function renderPrototype(){
  const c = $('#prototypeContent');
  const selected = state.elements.filter(el => state.selectedIds.has(el.id));
  if (!selected.length){
    c.innerHTML = '<div class="panel-empty"><i class="fas fa-diagram-project"></i>Select an element to add prototype interactions.</div>';
    return;
  }
  const el = selected[0];
  c.innerHTML = `
    <div class="prop-group">
      <div class="prop-group-title"><span>Interaction</span></div>
      <div class="row">
        <div class="field" style="width:100%;">
          <label style="width:auto;">On click →</label>
          <select id="protoSelect">
            <option value="">None</option>
            ${state.pages.filter(p => p.id !== state.currentPageId).map(p =>
              `<option value="${p.id}" ${el.prototype && el.prototype.target === p.id ? 'selected' : ''}>${escapeXml(p.name)}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
    <div class="prop-group">
      <div class="prop-group-title"><span>Preview</span></div>
      <button class="tb-btn preview" id="protoPreviewBtn" style="width:100%;justify-content:center;height:36px;"><i class="fas fa-play"></i> Enter preview mode</button>
    </div>`;
  const s = $('#protoSelect');
  if (s) s.addEventListener('change', () => {
    if (s.value) el.prototype = { target: s.value };
    else el.prototype = null;
    pushHistory(); renderInspect();
  });
  const pb = $('#protoPreviewBtn');
  if (pb) pb.addEventListener('click', enterPreview);
}

function renderInspect(){
  const c = $('#inspectContent');
  const selected = state.elements.filter(el => state.selectedIds.has(el.id));
  if (!selected.length){
    c.innerHTML = '<div class="panel-empty"><i class="fas fa-code"></i>Select an element to inspect its CSS.</div>';
    return;
  }
  const el = selected[0];
  const lines = [
    'position: absolute;',
    `left: ${round(el.x)}px;`,
    `top: ${round(el.y)}px;`,
    `width: ${round(el.w)}px;`,
    `height: ${round(el.h)}px;`,
  ];
  if (el.type === 'text'){
    lines.push(`color: ${el.fill || '#fff'};`);
    lines.push(`font-family: '${el.fontFamily}', sans-serif;`);
    lines.push(`font-size: ${el.fontSize}px;`);
    lines.push(`font-weight: ${el.fontWeight};`);
    lines.push(`line-height: ${el.lineHeight};`);
    lines.push(`letter-spacing: ${el.letterSpacing}px;`);
    lines.push(`text-align: ${el.textAlign};`);
  } else if (el.type === 'ellipse'){
    lines.push(`background: ${el.fill || 'transparent'};`);
    lines.push('border-radius: 50%;');
  } else {
    lines.push(`background: ${el.fill || 'transparent'};`);
    lines.push(`border-radius: ${el.radius || 0}px;`);
  }
  if (el.stroke && el.strokeWidth) lines.push(`border: ${el.strokeWidth}px solid ${el.stroke};`);
  if (el.rotation) lines.push(`transform: rotate(${round(el.rotation)}deg);`);
  if (el.opacity !== 1) lines.push(`opacity: ${round(el.opacity, 2)};`);
  if (el.shadow) lines.push(`box-shadow: ${el.shadow};`);

  const raw = lines.join('\n');
  const html = raw
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/([a-z-]+):/g, '<span class="k">$1</span>:')
    .replace(/;/g, '<span class="c">;</span>');

  c.innerHTML = `
    <div class="prop-group" style="padding-bottom:0;">
      <div class="prop-group-title">
        <span>CSS</span>
        <span class="pg-action" id="copyCssBtn">Copy</span>
      </div>
    </div>
    <div class="code-block">${html}</div>
    <div class="prop-group">
      <div class="prop-group-title"><span>Info</span></div>
      <div class="row" style="font-size:11.5px;color:var(--text-3);padding:0 4px;">
        <div style="flex:1;">Type</div>
        <div style="color:var(--text-2);font-weight:500;">${el.type}</div>
      </div>
      <div class="row" style="font-size:11.5px;color:var(--text-3);padding:0 4px;">
        <div style="flex:1;">Name</div>
        <div style="color:var(--text-2);font-weight:500;">${escapeXml(el.name || el.type)}</div>
      </div>
      <div class="row" style="font-size:11.5px;color:var(--text-3);padding:0 4px;">
        <div style="flex:1;">ID</div>
        <div style="color:var(--text-2);font-weight:500;font-family:monospace;font-size:10.5px;">${el.id}</div>
      </div>
    </div>`;
  const cb = $('#copyCssBtn');
  if (cb) cb.addEventListener('click', () => copyText(raw, 'CSS copied'));
}

/* ============================================================
   ASSETS
   ============================================================ */
function renderAssets(){
  const cg = $('#componentsGrid');
  cg.innerHTML = '';
  if (!state.components.length){
    cg.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><i class="fas fa-cube"></i>Right-click a layer → Create component.</div>';
  } else {
    state.components.forEach(c => {
      const card = document.createElement('div');
      card.className = 'asset-card';
      card.innerHTML = `
        <div class="ac-icon"><i class="fas fa-cube"></i></div>
        <div class="ac-name">${escapeXml(c.name)}</div>
        <div class="ac-del" title="Delete"><i class="fas fa-times"></i></div>`;
      card.querySelector('.ac-del').addEventListener('click', e => {
        e.stopPropagation();
        state.components = state.components.filter(x => x.id !== c.id);
        renderAssets();
      });
      card.addEventListener('click', () => {
        const el = deep(c.element);
        el.id = uid();
        const wp = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
        el.x = Math.round(wp.x); el.y = Math.round(wp.y);
        state.elements.push(el);
        state.selectedIds.clear(); state.selectedIds.add(el.id);
        render(); pushHistory();
        toast('Component inserted');
      });
      cg.appendChild(card);
    });
  }

  const csl = $('#colorStylesList');
  csl.innerHTML = '';
  state.colorStyles.forEach(s => {
    const row = document.createElement('div');
    row.className = 'style-row';
    row.innerHTML = `
      <div class="style-swatch" style="background:${s.color};"></div>
      <div class="style-name">${escapeXml(s.name)}</div>
      <div class="style-del"><i class="fas fa-times"></i></div>`;
    row.querySelector('.style-del').addEventListener('click', e => {
      e.stopPropagation();
      state.colorStyles = state.colorStyles.filter(x => x.id !== s.id);
      renderAssets();
    });
    row.addEventListener('click', () => {
      const selected = state.elements.filter(el => state.selectedIds.has(el.id));
      if (!selected.length){ toast('Select an element first', 'warning'); return; }
      selected.forEach(el => el.fill = s.color);
      render(); pushHistory();
    });
    csl.appendChild(row);
  });

  const tsl = $('#textStylesList');
  tsl.innerHTML = '';
  state.textStyles.forEach(s => {
    const row = document.createElement('div');
    row.className = 'style-row';
    row.innerHTML = `
      <div style="width:20px;text-align:center;font-size:13px;color:var(--accent-2);font-weight:700;">Aa</div>
      <div class="style-name">${escapeXml(s.name)}</div>
      <div style="font-size:10px;color:var(--text-4);">${s.fontSize}px</div>
      <div class="style-del"><i class="fas fa-times"></i></div>`;
    row.querySelector('.style-del').addEventListener('click', e => {
      e.stopPropagation();
      state.textStyles = state.textStyles.filter(x => x.id !== s.id);
      renderAssets();
    });
    row.addEventListener('click', () => {
      const selected = state.elements.filter(el => el.type === 'text' && state.selectedIds.has(el.id));
      if (!selected.length){ toast('Select a text layer first', 'warning'); return; }
      selected.forEach(el => {
        el.fontSize = s.fontSize; el.fontWeight = s.fontWeight;
        el.fontFamily = s.fontFamily; el.lineHeight = s.lineHeight;
        el.letterSpacing = s.letterSpacing;
      });
      render(); pushHistory();
    });
    tsl.appendChild(row);
  });
}

/* ============================================================
   CONTEXT MENU
   ============================================================ */
let ctxMenuEl = null;
function showContextMenu(x, y, id){
  hideContextMenu();
  if (id && !state.selectedIds.has(id)){
    state.selectedIds.clear(); state.selectedIds.add(id); render();
  }
  const hasSel = state.selectedIds.size > 0;
  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.style.left = x + 'px'; menu.style.top = y + 'px';
  const items = [
    { label:'Copy', icon:'fa-copy', key:'Ctrl C', action: () => {
      state.clipboard = state.elements.filter(e => state.selectedIds.has(e.id)).map(deep);
      toast('Copied');
    }, disabled: !hasSel },
    { label:'Duplicate', icon:'fa-clone', key:'Ctrl D', action: duplicateSelected, disabled: !hasSel },
    { sep: true },
    { label:'Bring to front', icon:'fa-arrow-up', key:'Ctrl ⇧ ]', action: bringToFront, disabled: !hasSel },
    { label:'Bring forward', icon:'fa-angle-up', key:'Ctrl ]', action: bringForward, disabled: !hasSel },
    { label:'Send backward', icon:'fa-angle-down', key:'Ctrl [', action: sendBackward, disabled: !hasSel },
    { label:'Send to back', icon:'fa-arrow-down', key:'Ctrl ⇧ [', action: sendToBack, disabled: !hasSel },
    { sep: true },
    { label:'Create component', icon:'fa-cube', action: () => {
      const el = state.elements.find(e => state.selectedIds.has(e.id));
      if (!el) return;
      const name = prompt('Component name:', el.name || 'Component');
      if (!name) return;
      state.components.push({ id: uid(), name, element: deep(el) });
      renderAssets(); toast('Component created');
    }, disabled: state.selectedIds.size !== 1 },
    { sep: true },
    { label:'Delete', icon:'fa-trash', key:'Del', danger: true, action: () => {
      state.elements = state.elements.filter(e => !state.selectedIds.has(e.id));
      state.selectedIds.clear();
      render(); pushHistory();
    }, disabled: !hasSel },
  ];
  items.forEach(it => {
    if (it.sep){
      const s = document.createElement('div');
      s.className = 'ctx-sep';
      menu.appendChild(s);
      return;
    }
    const row = document.createElement('div');
    row.className = 'ctx-item' + (it.danger ? ' danger' : '');
    if (it.disabled) row.style.opacity = '0.35';
    row.innerHTML = `
      <i class="fas ${it.icon}" style="width:14px;font-size:11px;opacity:0.7;"></i>
      <span>${it.label}</span>
      ${it.key ? `<span class="ctx-key">${it.key}</span>` : ''}`;
    if (!it.disabled) row.addEventListener('click', () => { hideContextMenu(); it.action(); });
    menu.appendChild(row);
  });
  document.body.appendChild(menu);
  ctxMenuEl = menu;
  const r = menu.getBoundingClientRect();
  if (r.right > window.innerWidth) menu.style.left = Math.max(4, window.innerWidth - r.width - 8) + 'px';
  if (r.bottom > window.innerHeight) menu.style.top = Math.max(4, window.innerHeight - r.height - 8) + 'px';
}
function hideContextMenu(){ if (ctxMenuEl){ ctxMenuEl.remove(); ctxMenuEl = null; } }
document.addEventListener('click', () => hideContextMenu());
document.addEventListener('contextmenu', e => { if (!e.target.closest('#viewport')) hideContextMenu(); });

/* ============================================================
   CLIPBOARD HELPER
   ============================================================ */
function copyText(text, okMsg){
  const done = () => toast(okMsg || 'Copied');
  if (navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}
function fallbackCopy(text, done){
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); done(); }
  catch(_){ toast('Copy failed', 'error'); }
  ta.remove();
}

/* ============================================================
   PREVIEW MODE
   ============================================================ */
function enterPreview(){
  if (!state.elements.length){ toast('Nothing to preview', 'warning'); return; }
  if (state.previewMode) return;
  saveCurrentPage();
  state.previewMode = true;
  const overlayEl = document.createElement('div');
  overlayEl.className = 'preview-mode';
  overlayEl.id = 'previewOverlay';
  const close = document.createElement('button');
  close.className = 'close-preview';
  close.innerHTML = '<i class="fas fa-times"></i>';
  close.addEventListener('click', exitPreview);
  overlayEl.appendChild(close);

  const b = getBounds(state.elements);
  const pad = 40;
  const vw = window.innerWidth - 120, vh = window.innerHeight - 120;
  const scale = Math.min(vw / (b.w + pad * 2), vh / (b.h + pad * 2), 1);
  const stage = document.createElement('div');
  stage.className = 'preview-stage';
  stage.style.width = (b.w + pad * 2) + 'px';
  stage.style.height = (b.h + pad * 2) + 'px';
  stage.style.transform = `scale(${scale})`;
  stage.style.transformOrigin = 'center center';
  const inner = document.createElement('div');
  inner.style.cssText = `position:absolute;left:${pad - b.x}px;top:${pad - b.y}px;width:0;height:0;`;
  state.elements.forEach(el => {
    if (!el.visible) return;
    inner.appendChild(buildPreviewNode(el));
  });
  stage.appendChild(inner);
  overlayEl.appendChild(stage);

  const hint = document.createElement('div');
  hint.className = 'preview-hint';
  hint.innerHTML = '<kbd>Esc</kbd> exit · Click elements to follow prototype links';
  overlayEl.appendChild(hint);

  document.body.appendChild(overlayEl);
  document.addEventListener('keydown', escPreview);
}
function exitPreview(){
  const o = $('#previewOverlay');
  if (o) o.remove();
  state.previewMode = false;
  document.removeEventListener('keydown', escPreview);
}
function escPreview(e){ if (e.key === 'Escape') exitPreview(); }

function buildPreviewNode(el){
  const node = document.createElement('div');
  node.className = 'preview-el';
  node.style.cssText = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;transform:rotate(${el.rotation}deg);opacity:${el.opacity};box-sizing:border-box;`;
  if (el.type === 'frame'){
    node.style.background = el.fill || '#fff';
    node.style.borderRadius = (el.radius || 0) + 'px';
    if (el.shadow) node.style.boxShadow = el.shadow;
  } else if (el.type === 'rect'){
    node.style.background = el.fill || 'transparent';
    node.style.borderRadius = (el.radius || 0) + 'px';
    if (el.stroke && el.strokeWidth) node.style.border = `${el.strokeWidth}px solid ${el.stroke}`;
    if (el.shadow) node.style.boxShadow = el.shadow;
  } else if (el.type === 'ellipse'){
    node.style.background = el.fill || 'transparent';
    node.style.borderRadius = '50%';
    if (el.stroke && el.strokeWidth) node.style.border = `${el.strokeWidth}px solid ${el.stroke}`;
  } else if (el.type === 'line'){
    node.style.background = el.fill;
  } else if (el.type === 'text'){
    node.style.color = el.fill;
    node.style.fontSize = (el.fontSize || 16) + 'px';
    node.style.fontWeight = el.fontWeight || 400;
    node.style.fontFamily = `'${el.fontFamily}', sans-serif`;
    node.style.lineHeight = el.lineHeight || 1.4;
    node.style.letterSpacing = (el.letterSpacing || 0) + 'px';
    node.style.textAlign = el.textAlign || 'left';
    node.style.whiteSpace = 'pre-wrap';
    node.style.display = 'flex';
    node.style.alignItems = 'flex-start';
    node.style.justifyContent = el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start';
    node.textContent = el.text || '';
  } else if (el.type === 'path'){
    const pts = el.points || [];
    let d = '';
    if (pts.length){
      d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x} ${pts[i].y}`;
    }
    node.innerHTML = `<svg viewBox="0 0 ${Math.max(el.w,1)} ${Math.max(el.h,1)}" preserveAspectRatio="none" style="width:100%;height:100%;overflow:visible;"><path d="${d}" fill="none" stroke="${el.fill || '#7c6cf0'}" stroke-width="${el.strokeWidth || 3}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
  } else if (el.type === 'image'){
    node.style.background = el.fill || '#1a2636';
    node.style.borderRadius = (el.radius || 0) + 'px';
    node.style.overflow = 'hidden';
    if (el.src) node.innerHTML = `<img src="${escapeXml(el.src)}" style="width:100%;height:100%;object-fit:cover;display:block;" alt="" />`;
  }

  if (el.prototype && el.prototype.target){
    node.dataset.proto = el.prototype.target;
    node.addEventListener('click', e => {
      e.stopPropagation();
      const target = el.prototype.target;
      exitPreview();
      switchPage(target);
      setTimeout(enterPreview, 180);
    });
  }
  return node;
}

/* ============================================================
   EXPORT
   ============================================================ */
function exportPNG(){
  const els = state.elements.filter(e => e.visible);
  if (!els.length){ toast('Nothing to export', 'warning'); return; }
  const b = getBounds(els);
  const pad = 40, scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round((b.w + pad * 2) * scale));
  canvas.height = Math.max(1, Math.round((b.h + pad * 2) * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.translate(-b.x + pad, -b.y + pad);
  els.forEach(el => drawElementToCanvas(ctx, el));
  try {
    canvas.toBlob(blob => {
      if (!blob){ toast('Export failed', 'error'); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (state.fileName || 'design') + '.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('Exported PNG');
    }, 'image/png');
  } catch(err){
    toast('Export failed (cross-origin image)', 'error');
  }
}

function drawElementToCanvas(ctx, el){
  ctx.save();
  ctx.globalAlpha = el.opacity ?? 1;
  const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
  ctx.translate(cx, cy);
  ctx.rotate((el.rotation || 0) * Math.PI / 180);
  ctx.translate(-el.w / 2, -el.h / 2);

  if (el.type === 'rect' || el.type === 'frame'){
    roundRect(ctx, 0, 0, el.w, el.h, el.radius || 0);
    if (el.fill && el.fill !== 'transparent'){ ctx.fillStyle = el.fill; ctx.fill(); }
    if (el.stroke && el.strokeWidth){ ctx.strokeStyle = el.stroke; ctx.lineWidth = el.strokeWidth; ctx.stroke(); }
  } else if (el.type === 'ellipse'){
    ctx.beginPath();
    ctx.ellipse(el.w / 2, el.h / 2, el.w / 2, el.h / 2, 0, 0, Math.PI * 2);
    if (el.fill && el.fill !== 'transparent'){ ctx.fillStyle = el.fill; ctx.fill(); }
    if (el.stroke && el.strokeWidth){ ctx.strokeStyle = el.stroke; ctx.lineWidth = el.strokeWidth; ctx.stroke(); }
  } else if (el.type === 'line'){
    ctx.fillStyle = el.fill || '#fff';
    ctx.fillRect(0, 0, el.w, el.h);
  } else if (el.type === 'text'){
    ctx.fillStyle = el.fill || '#fff';
    ctx.font = `${el.fontWeight || 400} ${el.fontSize || 16}px '${el.fontFamily || 'Inter'}', sans-serif`;
    ctx.textBaseline = 'top';
    const align = (el.textAlign === 'center' || el.textAlign === 'right') ? el.textAlign : 'left';
    ctx.textAlign = align;
    const lines = wrapText(ctx, el.text || '', el.w);
    const lh = (el.fontSize || 16) * (el.lineHeight || 1.4);
    const alignX = el.textAlign === 'center' ? el.w / 2 : el.textAlign === 'right' ? el.w : 0;
    lines.forEach((line, i) => ctx.fillText(line, alignX, i * lh));
  } else if (el.type === 'path'){
    const pts = el.points || [];
    if (pts.length){
      ctx.strokeStyle = el.fill || '#7c6cf0';
      ctx.lineWidth = el.strokeWidth || 3;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
  } else if (el.type === 'image'){
    ctx.fillStyle = el.fill || '#1a2636';
    ctx.fillRect(0, 0, el.w, el.h);
  }
  ctx.restore();
}

function wrapText(ctx, text, maxWidth){
  const paragraphs = String(text).split('\n');
  const result = [];
  paragraphs.forEach(p => {
    const words = p.split(' ');
    let line = '';
    words.forEach(word => {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line){ result.push(line); line = word; }
      else line = test;
    });
    result.push(line);
  });
  return result;
}
function roundRect(ctx, x, y, w, h, r){
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function exportSVG(){
  const els = state.elements.filter(e => e.visible);
  if (!els.length){ toast('Nothing to export', 'warning'); return; }
  const b = getBounds(els);
  const pad = 40;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${b.w + pad * 2}" height="${b.h + pad * 2}" viewBox="${b.x - pad} ${b.y - pad} ${b.w + pad * 2} ${b.h + pad * 2}">\n`;
  svg += `<rect x="${b.x - pad}" y="${b.y - pad}" width="${b.w + pad * 2}" height="${b.h + pad * 2}" fill="#ffffff"/>\n`;
  els.forEach(el => {
    const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
    const rot = `rotate(${el.rotation || 0} ${cx} ${cy})`;
    const op = el.opacity ?? 1;
    if (el.type === 'rect' || el.type === 'frame'){
      svg += `<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" rx="${el.radius || 0}" fill="${el.fill || 'none'}" opacity="${op}" transform="${rot}"`;
      if (el.stroke && el.strokeWidth) svg += ` stroke="${el.stroke}" stroke-width="${el.strokeWidth}"`;
      svg += `/>\n`;
    } else if (el.type === 'ellipse'){
      svg += `<ellipse cx="${cx}" cy="${cy}" rx="${el.w / 2}" ry="${el.h / 2}" fill="${el.fill || 'none'}" opacity="${op}" transform="${rot}"`;
      if (el.stroke && el.strokeWidth) svg += ` stroke="${el.stroke}" stroke-width="${el.strokeWidth}"`;
      svg += `/>\n`;
    } else if (el.type === 'line'){
      svg += `<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" fill="${el.fill}" opacity="${op}" transform="${rot}"/>\n`;
    } else if (el.type === 'text'){
      const lines = (el.text || '').split('\n');
      const lh = (el.fontSize || 16) * (el.lineHeight || 1.4);
      const anchor = el.textAlign === 'center' ? 'middle' : el.textAlign === 'right' ? 'end' : 'start';
      const tx = el.textAlign === 'center' ? cx : el.textAlign === 'right' ? el.x + el.w : el.x;
      svg += `<text x="${tx}" y="${el.y + (el.fontSize || 16)}" font-family="${el.fontFamily || 'Inter'}, sans-serif" font-size="${el.fontSize || 16}" font-weight="${el.fontWeight || 400}" fill="${el.fill}" opacity="${op}" text-anchor="${anchor}" transform="${rot}">`;
      lines.forEach((line, i) => {
        svg += `<tspan x="${tx}" dy="${i === 0 ? 0 : lh}">${escapeXml(line)}</tspan>`;
      });
      svg += `</text>\n`;
    } else if (el.type === 'path'){
      const pts = el.points || [];
      if (pts.length){
        let d = `M ${el.x + pts[0].x} ${el.y + pts[0].y}`;
        for (let i = 1; i < pts.length; i++) d += ` L ${el.x + pts[i].x} ${el.y + pts[i].y}`;
        svg += `<path d="${d}" fill="none" stroke="${el.fill || '#7c6cf0'}" stroke-width="${el.strokeWidth || 3}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"/>\n`;
      }
    }
  });
  svg += '</svg>';
  const blob = new Blob([svg], { type:'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (state.fileName || 'design') + '.svg';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Exported SVG');
}

$('#exportBtn').addEventListener('click', () => {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" style="max-width:440px;">
      <div class="modal-head">
        <h3>Export design</h3>
        <button class="close"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Format</label>
          <div class="segment" id="exportFormat" style="height:34px;">
            <button class="active" data-val="png">PNG (2×)</button>
            <button data-val="svg">SVG</button>
          </div>
        </div>
        <div class="form-group">
          <label>File name</label>
          <input type="text" class="form-input" id="exportName" value="${escapeXml(state.fileName)}" />
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label>Includes</label>
          <div style="font-size:12px;color:var(--text-3);line-height:1.7;padding:10px 12px;background:var(--bg-input);border-radius:8px;">
            ${state.elements.filter(e => e.visible).length} visible layer(s) on this page
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="modal-btn ghost" id="exportCancel">Cancel</button>
        <button class="modal-btn primary" id="exportConfirm"><i class="fas fa-download"></i> Export</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();
  backdrop.querySelector('.close').addEventListener('click', close);
  backdrop.querySelector('#exportCancel').addEventListener('click', close);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
  let format = 'png';
  $$('#exportFormat button', backdrop).forEach(b => {
    b.addEventListener('click', () => {
      $$('#exportFormat button', backdrop).forEach(x => x.classList.remove('active'));
      b.classList.add('active'); format = b.dataset.val;
    });
  });
  backdrop.querySelector('#exportConfirm').addEventListener('click', () => {
    const name = backdrop.querySelector('#exportName').value.trim();
    if (name) state.fileName = name;
    close();
    if (format === 'png') exportPNG(); else exportSVG();
  });
});

/* ============================================================
   SHARE
   ============================================================ */
$('#shareBtn').addEventListener('click', () => {
  const link = 'https://helaberry.studio/d/' + Math.random().toString(36).slice(2, 10);
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" style="max-width:460px;">
      <div class="modal-head">
        <h3>Share your design</h3>
        <button class="close"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Anyone with the link can view</label>
          <div style="display:flex;gap:8px;">
            <input type="text" class="form-input" id="shareLink" readonly value="${link}" />
            <button class="modal-btn primary" id="copyLink" style="flex-shrink:0;"><i class="fas fa-copy"></i></button>
          </div>
        </div>
        <div class="form-group">
          <label>Invite by email</label>
          <input type="email" class="form-input" placeholder="colleague@example.com" />
        </div>
      </div>
      <div class="modal-foot">
        <button class="modal-btn ghost" id="shareClose">Close</button>
        <button class="modal-btn primary" id="shareSend"><i class="fas fa-paper-plane"></i> Send invite</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();
  backdrop.querySelector('.close').addEventListener('click', close);
  backdrop.querySelector('#shareClose').addEventListener('click', close);
  backdrop.querySelector('#shareSend').addEventListener('click', () => { close(); toast('Invite sent'); });
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
  backdrop.querySelector('#copyLink').addEventListener('click', () => {
    const inp = backdrop.querySelector('#shareLink');
    inp.select();
    copyText(inp.value, 'Link copied');
  });
});

/* ============================================================
   TOAST
   ============================================================ */
let toastTimer = null;
function toast(msg, type){
  const container = $('#toastContainer');
  const el = document.createElement('div');
  el.className = 'toast';
  const icons = { success:'fa-check-circle', warning:'fa-exclamation-triangle', error:'fa-times-circle' };
  el.innerHTML = `<i class="fas ${icons[type] || 'fa-info-circle'}"></i><span>${escapeXml(msg)}</span>`;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 350);
  }, 2400);
}

/* ============================================================
   PANEL TABS
   ============================================================ */
$$('.panel-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const parent = tab.parentElement;
    $$('.panel-tab', parent).forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const name = tab.dataset.tab;
    if (parent.classList.contains('panel-left')){
      $('#tabLayers').style.display = name === 'layers' ? '' : 'none';
      $('#tabAssets').style.display = name === 'assets' ? '' : 'none';
    } else {
      $('#tabDesign').style.display = name === 'design' ? '' : 'none';
      $('#tabPrototype').style.display = name === 'prototype' ? '' : 'none';
      $('#tabInspect').style.display = name === 'inspect' ? '' : 'none';
    }
  });
});

$$('[data-collapse]').forEach(head => {
  head.addEventListener('click', () => head.closest('.section').classList.toggle('collapsed'));
});

/* ============================================================
   MOBILE
   ============================================================ */
function checkMobile(){
  const isMobile = window.innerWidth <= 720;
  $('#mobileLeftBtn').style.display = isMobile ? '' : 'none';
  $('#mobileRightBtn').style.display = isMobile ? '' : 'none';
  if (!isMobile){
    $('#leftPanel').classList.remove('open');
    $('#rightPanel').classList.remove('open');
  }
}
window.addEventListener('resize', checkMobile);
$('#mobileLeftBtn').addEventListener('click', () => {
  $('#leftPanel').classList.toggle('open');
  $('#rightPanel').classList.remove('open');
});
$('#mobileRightBtn').addEventListener('click', () => {
  $('#rightPanel').classList.toggle('open');
  $('#leftPanel').classList.remove('open');
});

/* ============================================================
   PREVIEW BUTTON
   ============================================================ */
$('#previewBtn').addEventListener('click', enterPreview);
$('#brandBtn').addEventListener('click', () => toast('Helaberry Studio · UI/UX Design Tool'));

/* ============================================================
   HOME BUTTON
   ============================================================ */
$('#homeBtn').addEventListener('click', () => {
  saveCurrentPage();
  // The anchor's default href (url_for homepage) performs the navigation.
});

/* ============================================================
   FILE NAME RENAME
   ============================================================ */
$('#fileName').addEventListener('dblclick', () => {
  const text = $('#fileNameText');
  if (!text) return;
  const inp = document.createElement('input');
  inp.value = state.fileName;
  text.replaceWith(inp);
  inp.focus(); inp.select();
  const finish = () => {
    const val = inp.value.trim() || 'Untitled Design';
    state.fileName = val;
    const span = document.createElement('span');
    span.id = 'fileNameText';
    span.textContent = val;
    inp.replaceWith(span);
    pushHistory();
  };
  inp.addEventListener('blur', finish);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') inp.blur();
    if (e.key === 'Escape'){ inp.value = state.fileName; inp.blur(); }
    e.stopPropagation();
  });
});

/* ============================================================
   STARTER CONTENT
   ============================================================ */
function createStarterContent(){
  const fx = 120, fy = 80, fw = 375, fh = 720;
  const els = [];
  const add = (type, props) => { els.push(createElement(type, props)); };

  add('frame', { x: fx, y: fy, w: fw, h: fh, name: 'iPhone · Home', fill: '#0f1626', radius: 32 });
  add('rect',  { x: fx + fw/2 - 40, y: fy + 8, w: 80, h: 24, fill: '#070b13', radius: 12, name: 'Notch' });
  add('text',  { x: fx + 24, y: fy + 14, w: 80, h: 20, fill: '#f0f4fc', name: 'Time', text: '9:41', fontSize: 13, fontWeight: 700 });
  add('text',  { x: fx + 24, y: fy + 70, w: fw - 48, h: 80, fill: '#f0f4fc', name: 'Hero Title', text: 'Design\nwithout limits.', fontSize: 34, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1 });
  add('text',  { x: fx + 24, y: fy + 172, w: fw - 48, h: 60, fill: '#b0c8e8', name: 'Subtitle', text: 'Create, prototype, and ship beautiful interfaces — all in one place.', fontSize: 13, fontWeight: 400, lineHeight: 1.55 });

  const cardW = (fw - 60) / 2;
  add('rect',  { x: fx + 24, y: fy + 260, w: cardW, h: 150, fill: '#1a2636', radius: 20, name: 'Card · Analytics' });
  add('rect',  { x: fx + 24 + cardW + 12, y: fy + 260, w: cardW, h: 150, fill: '#1a2636', radius: 20, name: 'Card · Projects' });
  add('ellipse', { x: fx + 44, y: fy + 280, w: 44, h: 44, fill: '#7c6cf0', name: 'Icon · Chart' });
  add('ellipse', { x: fx + 44 + cardW + 12, y: fy + 280, w: 44, h: 44, fill: '#a29bfe', name: 'Icon · Folder' });
  add('text',  { x: fx + 44, y: fy + 340, w: cardW - 20, h: 22, fill: '#f0f4fc', name: 'Label · Analytics', text: 'Analytics', fontSize: 15, fontWeight: 700 });
  add('text',  { x: fx + 44 + cardW + 12, y: fy + 340, w: cardW - 20, h: 22, fill: '#f0f4fc', name: 'Label · Projects', text: 'Projects', fontSize: 15, fontWeight: 700 });
  add('text',  { x: fx + 44, y: fy + 364, w: cardW - 20, h: 20, fill: '#6c85a0', name: 'Meta · Analytics', text: '+24% this week', fontSize: 11, fontWeight: 500 });
  add('text',  { x: fx + 44 + cardW + 12, y: fy + 364, w: cardW - 20, h: 20, fill: '#6c85a0', name: 'Meta · Projects', text: '12 active', fontSize: 11, fontWeight: 500 });

  add('rect',  { x: fx + 24, y: fy + 460, w: fw - 48, h: 56, fill: '#7c6cf0', radius: 28, name: 'Primary Button', shadow: '0 12px 32px rgba(124,108,240,0.4)' });
  add('text',  { x: fx + 24, y: fy + 477, w: fw - 48, h: 26, fill: '#ffffff', name: 'Button Label', text: 'Get Started', fontSize: 16, fontWeight: 700, textAlign: 'center' });

  add('rect',  { x: fx + 24, y: fy + 560, w: fw - 48, h: 60, fill: '#1a2636', radius: 20, name: 'Nav Bar' });
  add('ellipse', { x: fx + fw/2 - 60, y: fy + 578, w: 24, h: 24, fill: '#7c6cf0', name: 'Nav · Home' });
  add('ellipse', { x: fx + fw/2 - 12, y: fy + 578, w: 24, h: 24, fill: '#4a5b72', name: 'Nav · Search' });
  add('ellipse', { x: fx + fw/2 + 36, y: fy + 578, w: 24, h: 24, fill: '#4a5b72', name: 'Nav · Profile' });

  state.elements = els;
}

/* ============================================================
   INIT
   ============================================================ */
function init(){
  initPages();
  createStarterContent();
  saveCurrentPage();
  state.selectedIds.clear();
  render();
  pushHistory();
  checkMobile();

  requestAnimationFrame(() => {
    if (!state.elements.length) return;
    const b = getBounds(state.elements);
    const r = viewport.getBoundingClientRect();
    const pad = 120;
    state.zoom = clamp(Math.min((r.width - pad) / b.w, (r.height - pad) / b.h), 0.1, 1.5);
    state.pan.x = (r.width - b.w * state.zoom) / 2 - b.x * state.zoom;
    state.pan.y = (r.height - b.h * state.zoom) / 2 - b.y * state.zoom;
    applyTransform();
    renderSelectionOverlay();
  });

  console.log('%c Helaberry Studio ', 'background:linear-gradient(135deg,#7c6cf0,#a29bfe);color:#fff;font-weight:700;padding:3px 10px;border-radius:6px;', 'UI/UX Design Tool — ready');
}

document.addEventListener('dragstart', e => { if (!e.target.closest('.layer-item')) e.preventDefault(); });

init();

window.HB = { state, render, pushHistory, toast, exportPNG, exportSVG, undo, redo };