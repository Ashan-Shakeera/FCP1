// =============================================================
//  UTILITY
// =============================================================
function showToast(msg) {
    const existing = document.querySelector('.custom-toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.className = 'custom-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0';
        setTimeout(() => t.remove(), 400); }, 2200);
}

// Ripple
document.querySelectorAll('.tool-btn, .nav-btn, .layer-actions button, .panel-tab, .size-btn, .export-btn-primary, .export-btn-secondary, .color-preset, #applyCustomSize, #bgTransparent, #bgWhite, #fillNone, #strokeNone, #objFillNone, #objStrokeNone, .align-btn')
    .forEach(el => {
        el.addEventListener('click', function(e) {
            const r = this.getBoundingClientRect();
            const s = Math.max(r.width, r.height);
            const x = e.clientX - r.left - s / 2;
            const y = e.clientY - r.top - s / 2;
            const rip = document.createElement('span');
            rip.className = 'ripple';
            rip.style.cssText =
                `position:absolute;border-radius:50%;background:rgba(255,255,255,0.08);transform:scale(0);animation:rippleAnim 0.7s linear forwards;pointer-events:none;width:${s}px;height:${s}px;left:${x}px;top:${y}px;`;
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(rip);
            setTimeout(() => rip.remove(), 700);
        });
    });

// =============================================================
//  NAV
// =============================================================
const hb = document.getElementById('hamburgerBtn');
const mm = document.getElementById('mobileMenu');
hb.addEventListener('click', function(e) {
    e.stopPropagation();
    this.classList.toggle('active');
    mm.classList.toggle('open');
});
document.addEventListener('click', function(e) {
    if (!e.target.closest('.navbar')) { hb.classList.remove('active');
        mm.classList.remove('open'); }
});
document.querySelectorAll('.nav-mobile-menu .nav-btn').forEach(b => b.addEventListener('click', () => { hb.classList
            .remove('active');
        mm.classList.remove('open'); }));
document.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', function() {
    showToast('🔐 ' + this.dataset.action + ' action');
}));

// =============================================================
//  VECTOR ENGINE — FULL ILLUSTRATOR STYLE
// =============================================================

// ---- State ----
const state = {
    layers: [],
    activeLayerId: null,
    selectedIds: [],
    nextId: 1,
    canvasWidth: 1080,
    canvasHeight: 1080,
    backgroundColor: '#12161e',
    tool: 'select',
    scale: 1,
    panX: 0,
    panY: 0,
    isPanning: false,
    panStartX: 0,
    panStartY: 0,
    isDrawing: false,
    drawStartX: 0,
    drawStartY: 0,
    penPoints: [],
    isPenDrawing: false,
    history: [],
    historyIndex: -1,
    maxHistory: 40,
    fillColor: '#00b4ff',
    strokeColor: '#ffffff',
    strokeWidth: 2,
    strokeCap: 'round',
    strokeJoin: 'round',
    fillEnabled: true,
    strokeEnabled: true,
    shapeType: 'rect',
    polySides: 6,
    polyStarRatio: 0.5,
    // Selection state
    selectedObject: null,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragOffsetX: 0,
    dragOffsetY: 0,
    // Transform
    transformMode: 'move',
    // Groups
    groups: [],
    // Clipboard
    clipboard: null,
};

// ---- DOM refs ----
const mainCanvas = document.getElementById('mainCanvas');
const guideCanvas = document.getElementById('guideCanvas');
const overlayCanvas = document.getElementById('overlayCanvas');
const compositeCanvas = document.getElementById('compositeCanvas');
const canvasContainer = document.getElementById('canvasContainer');
const canvasWrapper = document.getElementById('canvasWrapper');
const emptyMsg = document.getElementById('emptyMsg');
const layerList = document.getElementById('layerList');
const objectsList = document.getElementById('objectsList');
const canvasSizeInfo = document.getElementById('canvasSizeInfo');
const objectCountInfo = document.getElementById('objectCountInfo');

let mainCtx = mainCanvas.getContext('2d');
let guideCtx = guideCanvas.getContext('2d');
let overlayCtx = overlayCanvas.getContext('2d');
let compCtx = compositeCanvas.getContext('2d');

// ---- Vector Object ----
function createVectorObject(type, props) {
    const obj = {
        id: state.nextId++,
        type: type,
        layerId: state.activeLayerId,
        name: props.name || type,
        fill: props.fill || state.fillColor,
        stroke: props.stroke || state.strokeColor,
        strokeWidth: props.strokeWidth || state.strokeWidth,
        strokeCap: props.strokeCap || state.strokeCap || 'round',
        strokeJoin: props.strokeJoin || state.strokeJoin || 'round',
        fillEnabled: props.fillEnabled !== undefined ? props.fillEnabled : state.fillEnabled,
        strokeEnabled: props.strokeEnabled !== undefined ? props.strokeEnabled : state.strokeEnabled,
        opacity: props.opacity || 1,
        rotation: props.rotation || 0,
        groupId: props.groupId || null,
        // Geometry
        x: props.x || 0,
        y: props.y || 0,
        w: props.w || 100,
        h: props.h || 100,
        // Path
        points: props.points || [],
        closed: props.closed || false,
        // Polygon/Star
        sides: props.sides || 6,
        starRatio: props.starRatio || 0.5,
        // Line
        x2: props.x2 || 0,
        y2: props.y2 || 0,
    };
    return obj;
}

// ---- Layer ----
function createLayer(name) {
    return {
        id: state.nextId++,
        name: name || `Layer ${state.nextId}`,
        visible: true,
        opacity: 1,
        blendMode: 'source-over',
        objects: [],
        locked: false,
    };
}

function getActiveLayer() {
    return state.layers.find(l => l.id === state.activeLayerId) || null;
}

function getLayerIndex(id) { return state.layers.findIndex(l => l.id === id); }

function getObject(id) {
    for (const layer of state.layers) {
        const found = layer.objects.find(o => o.id === id);
        if (found) return found;
    }
    return null;
}

function getObjectLayer(id) {
    for (const layer of state.layers) {
        if (layer.objects.find(o => o.id === id)) return layer;
    }
    return null;
}

function getSelectedObjects() {
    const result = [];
    for (const id of state.selectedIds) {
        const obj = getObject(id);
        if (obj) result.push(obj);
    }
    return result;
}

function getObjectBounds(obj) {
    switch (obj.type) {
        case 'rect':
            return { x: obj.x, y: obj.y, w: obj.w, h: obj.h };
        case 'ellipse':
            return { x: obj.x, y: obj.y, w: obj.w, h: obj.h };
        case 'polygon':
        case 'star':
            return { x: obj.x, y: obj.y, w: obj.w, h: obj.h };
        case 'line':
            const minX = Math.min(obj.x, obj.x2),
                maxX = Math.max(obj.x, obj.x2);
            const minY = Math.min(obj.y, obj.y2),
                maxY = Math.max(obj.y, obj.y2);
            return { x: minX, y: minY, w: maxX - minX || 1, h: maxY - minY || 1 };
        case 'path':
            if (!obj.points || obj.points.length === 0) return null;
            let bx = Infinity,
                by = Infinity,
                bx2 = -Infinity,
                by2 = -Infinity;
            for (const p of obj.points) {
                if (p.x < bx) bx = p.x;
                if (p.x > bx2) bx2 = p.x;
                if (p.y < by) by = p.y;
                if (p.y > by2) by2 = p.y;
            }
            return { x: bx, y: by, w: bx2 - bx || 1, h: by2 - by || 1 };
        default:
            return null;
    }
}

// ---- Add/Delete objects ----
function addObject(obj) {
    const layer = getActiveLayer();
    if (!layer) return;
    layer.objects.push(obj);
    state.selectedIds = [obj.id];
    renderAll();
    updateObjectsList();
    updatePropertiesUI();
    saveHistory();
    showToast(`➕ ${obj.name}`);
}

function deleteObject(id) {
    for (const layer of state.layers) {
        const idx = layer.objects.findIndex(o => o.id === id);
        if (idx !== -1) {
            layer.objects.splice(idx, 1);
            state.selectedIds = state.selectedIds.filter(sid => sid !== id);
            renderAll();
            updateObjectsList();
            updatePropertiesUI();
            saveHistory();
            showToast('🗑️ Object deleted');
            return;
        }
    }
}

function deleteSelected() {
    if (state.selectedIds.length === 0) { showToast('⚠️ Select an object'); return; }
    for (const id of state.selectedIds) {
        deleteObject(id);
    }
    state.selectedIds = [];
    renderAll();
    updateObjectsList();
    updatePropertiesUI();
    saveHistory();
}

// ---- Layer operations ----
function addLayer(layer) {
    state.layers.push(layer);
    state.activeLayerId = layer.id;
    state.selectedIds = [];
    renderAll();
    updateLayerUI();
    saveHistory();
    showToast(`➕ Layer: ${layer.name}`);
}

function deleteLayer(id) {
    if (state.layers.length <= 1) { showToast('⚠️ Need at least one layer'); return; }
    const idx = getLayerIndex(id);
    if (idx === -1) return;
    const layer = state.layers[idx];
    // Move objects to background
    if (layer.objects.length > 0) {
        const bg = state.layers[0];
        bg.objects.push(...layer.objects);
    }
    state.layers.splice(idx, 1);
    if (state.activeLayerId === id) {
        state.activeLayerId = state.layers.length > 0 ? state.layers[Math.min(idx, state.layers.length - 1)].id :
        null;
    }
    state.selectedIds = [];
    renderAll();
    updateLayerUI();
    saveHistory();
    showToast('🗑️ Layer deleted');
}

function duplicateLayer(id) {
    const src = state.layers.find(l => l.id === id);
    if (!src) return;
    const newLayer = createLayer(src.name + ' copy');
    for (const obj of src.objects) {
        const copy = JSON.parse(JSON.stringify(obj));
        copy.id = state.nextId++;
        newLayer.objects.push(copy);
    }
    newLayer.opacity = src.opacity;
    newLayer.blendMode = src.blendMode;
    const idx = getLayerIndex(id) + 1;
    state.layers.splice(idx, 0, newLayer);
    state.activeLayerId = newLayer.id;
    state.selectedIds = [];
    renderAll();
    updateLayerUI();
    saveHistory();
    showToast('📋 Layer duplicated');
}

function mergeLayers() {
    if (state.layers.length <= 1) { showToast('⚠️ Need at least 2 layers'); return; }
    const top = state.layers[state.layers.length - 1];
    const bottom = state.layers[state.layers.length - 2];
    if (!top || !bottom) return;
    bottom.objects.push(...top.objects);
    state.layers.pop();
    state.activeLayerId = bottom.id;
    state.selectedIds = [];
    renderAll();
    updateLayerUI();
    saveHistory();
    showToast('🔗 Layers merged');
}

function moveLayerUp(id) {
    const idx = getLayerIndex(id);
    if (idx >= state.layers.length - 1) return;
    [state.layers[idx], state.layers[idx + 1]] = [state.layers[idx + 1], state.layers[idx]];
    renderAll();
    updateLayerUI();
    saveHistory();
}

function moveLayerDown(id) {
    const idx = getLayerIndex(id);
    if (idx <= 0) return;
    [state.layers[idx], state.layers[idx - 1]] = [state.layers[idx - 1], state.layers[idx]];
    renderAll();
    updateLayerUI();
    saveHistory();
}

// ---- Group operations ----
let groupCounter = 0;

function groupSelected() {
    const selected = getSelectedObjects();
    if (selected.length < 2) { showToast('⚠️ Select at least 2 objects'); return; }
    const gid = ++groupCounter;
    for (const obj of selected) {
        obj.groupId = gid;
    }
    state.selectedIds = selected.map(o => o.id);
    renderAll();
    updateObjectsList();
    saveHistory();
    showToast(`📦 Grouped ${selected.length} objects`);
}

function ungroupSelected() {
    const selected = getSelectedObjects();
    if (selected.length === 0) { showToast('⚠️ Select a group'); return; }
    const gid = selected[0].groupId;
    if (!gid) { showToast('⚠️ Not a group'); return; }
    for (const layer of state.layers) {
        for (const obj of layer.objects) {
            if (obj.groupId === gid) obj.groupId = null;
        }
    }
    renderAll();
    updateObjectsList();
    saveHistory();
    showToast('🔓 Ungrouped');
}

// ---- Align ----
function alignObjects(alignType) {
    const selected = getSelectedObjects();
    if (selected.length < 2) { showToast('⚠️ Select at least 2 objects'); return; }
    const bounds = selected.map(o => getObjectBounds(o)).filter(b => b !== null);
    if (bounds.length < 2) return;

    let totalX = 0,
        totalY = 0,
        minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
    for (const b of bounds) {
        totalX += b.x + b.w / 2;
        totalY += b.y + b.h / 2;
        if (b.x < minX) minX = b.x;
        if (b.x + b.w > maxX) maxX = b.x + b.w;
        if (b.y < minY) minY = b.y;
        if (b.y + b.h > maxY) maxY = b.y + b.h;
    }
    const avgX = totalX / bounds.length;
    const avgY = totalY / bounds.length;
    const groupW = maxX - minX;
    const groupH = maxY - minY;

    for (let i = 0; i < selected.length; i++) {
        const obj = selected[i];
        const b = bounds[i];
        if (!b) continue;
        const cx = b.x + b.w / 2,
            cy = b.y + b.h / 2;

        switch (alignType) {
            case 'left':
                obj.x += minX - b.x;
                break;
            case 'center-h':
                obj.x += (minX + groupW / 2) - (b.x + b.w / 2);
                break;
            case 'right':
                obj.x += (minX + groupW) - (b.x + b.w);
                break;
            case 'top':
                obj.y += minY - b.y;
                break;
            case 'center-v':
                obj.y += (minY + groupH / 2) - (b.y + b.h / 2);
                break;
            case 'bottom':
                obj.y += (minY + groupH) - (b.y + b.h);
                break;
            case 'distribute-h': {
                const sorted = [...selected].sort((a, b) => {
                    const ba = getObjectBounds(a),
                        bb = getObjectBounds(b);
                    return (ba ? ba.x + ba.w / 2 : 0) - (bb ? bb.x + bb.w / 2 : 0);
                });
                const idx = sorted.indexOf(obj);
                if (idx > 0 && idx < sorted.length - 1) {
                    const left = getObjectBounds(sorted[0]);
                    const right = getObjectBounds(sorted[sorted.length - 1]);
                    if (left && right) {
                        const spacing = (right.x + right.w / 2 - (left.x + left.w / 2)) / (sorted.length - 1);
                        const targetX = left.x + left.w / 2 + idx * spacing;
                        obj.x += targetX - (b.x + b.w / 2);
                    }
                }
                break;
            }
            case 'distribute-v': {
                const sorted = [...selected].sort((a, b) => {
                    const ba = getObjectBounds(a),
                        bb = getObjectBounds(b);
                    return (ba ? ba.y + ba.h / 2 : 0) - (bb ? bb.y + bb.h / 2 : 0);
                });
                const idx = sorted.indexOf(obj);
                if (idx > 0 && idx < sorted.length - 1) {
                    const top = getObjectBounds(sorted[0]);
                    const bottom = getObjectBounds(sorted[sorted.length - 1]);
                    if (top && bottom) {
                        const spacing = (bottom.y + bottom.h / 2 - (top.y + top.h / 2)) / (sorted.length - 1);
                        const targetY = top.y + top.h / 2 + idx * spacing;
                        obj.y += targetY - (b.y + b.h / 2);
                    }
                }
                break;
            }
        }
        // Update path points if path
        if (obj.type === 'path' && obj.points) {
            // Recalculate points based on bounds change
            // Simple: just update the points relative to new position
            // For simplicity, we skip complex path alignment
        }
    }
    renderAll();
    saveHistory();
    showToast(`✅ Aligned ${alignType}`);
}

// ---- Drawing ----
function startShapeDraw(x, y, type) {
    const layer = getActiveLayer();
    if (!layer || layer.locked) return;
    state.isDrawing = true;
    state.drawStartX = x;
    state.drawStartY = y;
    state.shapeType = type;
    const obj = createVectorObject(type, {
        x: x,
        y: y,
        w: 0,
        h: 0,
        fill: state.fillColor,
        stroke: state.strokeColor,
        strokeWidth: state.strokeWidth,
        strokeCap: state.strokeCap,
        strokeJoin: state.strokeJoin,
        fillEnabled: state.fillEnabled,
        strokeEnabled: state.strokeEnabled,
        sides: state.polySides,
        starRatio: state.polyStarRatio,
        x2: x,
        y2: y,
        points: [{ x, y }],
    });
    obj.id = -1;
    layer.objects.push(obj);
    state.selectedIds = [];
}

function updateShapeDraw(x, y) {
    if (!state.isDrawing) return;
    const layer = getActiveLayer();
    if (!layer) return;
    const obj = layer.objects[layer.objects.length - 1];
    if (!obj || obj.id !== -1) return;
    const sx = state.drawStartX,
        sy = state.drawStartY;
    const w = x - sx,
        h = y - sy;
    if (Math.abs(w) < 0.5 && Math.abs(h) < 0.5) return;
    switch (obj.type) {
        case 'rect':
        case 'ellipse':
        case 'polygon':
        case 'star':
            obj.x = w > 0 ? sx : x;
            obj.y = h > 0 ? sy : y;
            obj.w = Math.abs(w);
            obj.h = Math.abs(h);
            break;
        case 'line':
            obj.x2 = x;
            obj.y2 = y;
            break;
        case 'path':
            obj.points.push({ x, y });
            break;
    }
    renderAll();
}

function endShapeDraw() {
    if (!state.isDrawing) return;
    const layer = getActiveLayer();
    if (!layer) { state.isDrawing = false; return; }
    const obj = layer.objects[layer.objects.length - 1];
    if (obj && obj.id === -1) {
        if (obj.type === 'path' && obj.points.length < 2) {
            layer.objects.pop();
        } else if ((obj.type === 'rect' || obj.type === 'ellipse' || obj.type === 'polygon' || obj.type ===
                'star') && (Math.abs(obj.w) < 1 || Math.abs(obj.h) < 1)) {
            layer.objects.pop();
        } else if (obj.type === 'line' && Math.abs(obj.x - obj.x2) < 1 && Math.abs(obj.y - obj.y2) < 1) {
            layer.objects.pop();
        } else {
            obj.id = state.nextId++;
            state.selectedIds = [obj.id];
            saveHistory();
            showToast(`✅ ${obj.type} created`);
        }
    }
    state.isDrawing = false;
    renderAll();
    updateObjectsList();
    updatePropertiesUI();
}

// ---- Pen tool ----
function startPenDraw(x, y) {
    const layer = getActiveLayer();
    if (!layer || layer.locked) return;
    state.isPenDrawing = true;
    state.penPoints = [{ x, y }];
    const obj = createVectorObject('path', {
        points: [{ x, y }],
        closed: false,
        fill: state.fillColor,
        stroke: state.strokeColor,
        strokeWidth: state.strokeWidth,
        strokeCap: state.strokeCap,
        strokeJoin: state.strokeJoin,
        fillEnabled: state.fillEnabled,
        strokeEnabled: state.strokeEnabled,
    });
    obj.id = -1;
    layer.objects.push(obj);
    state.selectedIds = [];
    renderAll();
}

function updatePenDraw(x, y) {
    if (!state.isPenDrawing) return;
    const layer = getActiveLayer();
    if (!layer) return;
    const obj = layer.objects[layer.objects.length - 1];
    if (!obj || obj.id !== -1) return;
    const last = obj.points[obj.points.length - 1];
    if (Math.abs(x - last.x) > 0.5 || Math.abs(y - last.y) > 0.5) {
        obj.points.push({ x, y });
        renderAll();
    }
}

function endPenDraw() {
    if (!state.isPenDrawing) return;
    const layer = getActiveLayer();
    if (!layer) { state.isPenDrawing = false; return; }
    const obj = layer.objects[layer.objects.length - 1];
    if (obj && obj.id === -1) {
        if (obj.points.length < 2) {
            layer.objects.pop();
        } else {
            obj.id = state.nextId++;
            state.selectedIds = [obj.id];
            saveHistory();
            showToast(`✅ Path created (${obj.points.length} points)`);
        }
    }
    state.isPenDrawing = false;
    state.penPoints = [];
    renderAll();
    updateObjectsList();
    updatePropertiesUI();
}

// ---- Selection ----
function selectObjectAt(x, y, additive) {
    const obj = getObjectAt(x, y);
    if (obj) {
        if (additive) {
            const idx = state.selectedIds.indexOf(obj.id);
            if (idx === -1) state.selectedIds.push(obj.id);
            else state.selectedIds.splice(idx, 1);
        } else {
            state.selectedIds = [obj.id];
        }
        renderAll();
        updatePropertiesUI();
        updateObjectsList();
        showToast(`🔍 Selected: ${obj.name}`);
    } else if (!additive) {
        state.selectedIds = [];
        renderAll();
        updatePropertiesUI();
        updateObjectsList();
    }
}

function getObjectAt(x, y) {
    const visibleLayers = state.layers.filter(l => l.visible);
    for (let i = visibleLayers.length - 1; i >= 0; i--) {
        const layer = visibleLayers[i];
        for (let j = layer.objects.length - 1; j >= 0; j--) {
            const obj = layer.objects[j];
            if (hitTestObject(obj, x, y)) return obj;
        }
    }
    return null;
}

function hitTestObject(obj, x, y) {
    const bbox = getObjectBounds(obj);
    if (!bbox) return false;
    const pad = 4;
    return x >= bbox.x - pad && x <= bbox.x + bbox.w + pad &&
        y >= bbox.y - pad && y <= bbox.y + bbox.h + pad;
}

// ---- Move selected ----
function startMoveObjects(x, y) {
    const selected = getSelectedObjects();
    if (selected.length === 0) return;
    state.isDragging = true;
    state.dragStartX = x;
    state.dragStartY = y;
    // Store original positions
    state.dragOffsetX = 0;
    state.dragOffsetY = 0;
    // Find the first selected object's bounds for offset
    const obj = selected[0];
    const bbox = getObjectBounds(obj);
    if (bbox) {
        state.dragOffsetX = x - bbox.x;
        state.dragOffsetY = y - bbox.y;
    }
}

function updateMoveObjects(x, y) {
    if (!state.isDragging || state.selectedIds.length === 0) return;
    const selected = getSelectedObjects();
    if (selected.length === 0) return;
    const dx = x - state.dragStartX;
    const dy = y - state.dragStartY;
    // Move all selected objects
    for (const obj of selected) {
        const bbox = getObjectBounds(obj);
        if (!bbox) continue;
        switch (obj.type) {
            case 'rect':
            case 'ellipse':
            case 'polygon':
            case 'star':
                obj.x += dx;
                obj.y += dy;
                break;
            case 'line':
                obj.x += dx;
                obj.y += dy;
                obj.x2 += dx;
                obj.y2 += dy;
                break;
            case 'path':
                for (const p of obj.points) {
                    p.x += dx;
                    p.y += dy;
                }
                break;
        }
    }
    state.dragStartX = x;
    state.dragStartY = y;
    renderAll();
    updatePropertiesUI();
}

function endMoveObjects() {
    if (state.isDragging) {
        state.isDragging = false;
        if (state.selectedIds.length > 0) saveHistory();
    }
}

// ---- Rendering ----
function renderAll() {
    const w = state.canvasWidth,
        h = state.canvasHeight;
    mainCtx.clearRect(0, 0, w, h);
    mainCtx.fillStyle = state.backgroundColor;
    mainCtx.fillRect(0, 0, w, h);

    const visibleLayers = state.layers.filter(l => l.visible);
    for (const layer of visibleLayers) {
        mainCtx.save();
        mainCtx.globalAlpha = layer.opacity || 1;
        mainCtx.globalCompositeOperation = layer.blendMode || 'source-over';
        for (const obj of layer.objects) {
            const selected = state.selectedIds.includes(obj.id);
            drawVectorObject(mainCtx, obj, selected);
        }
        mainCtx.restore();
    }

    compCtx.clearRect(0, 0, w, h);
    compCtx.drawImage(mainCanvas, 0, 0);

    // Draw selection overlay
    drawOverlay();

    const hasContent = state.layers.some(l => l.objects.length > 0);
    emptyMsg.style.display = hasContent ? 'none' : 'block';

    drawGuides();
    updateObjectsList();
    updateLayerUI();
    updatePropertiesUI();
    updateObjectCount();
}

function drawVectorObject(ctx, obj, selected) {
    ctx.save();
    ctx.globalAlpha = obj.opacity || 1;

    const fill = obj.fillEnabled ? obj.fill : 'transparent';
    const stroke = obj.strokeEnabled ? obj.stroke : 'transparent';
    const sw = obj.strokeWidth || 2;
    const cap = obj.strokeCap || 'round';
    const join = obj.strokeJoin || 'round';

    // Apply rotation if any
    if (obj.rotation && obj.rotation !== 0) {
        const bbox = getObjectBounds(obj);
        if (bbox) {
            ctx.translate(bbox.x + bbox.w / 2, bbox.y + bbox.h / 2);
            ctx.rotate(obj.rotation * Math.PI / 180);
            ctx.translate(-(bbox.x + bbox.w / 2), -(bbox.y + bbox.h / 2));
        }
    }

    switch (obj.type) {
        case 'rect':
            ctx.beginPath();
            ctx.rect(obj.x, obj.y, obj.w, obj.h);
            applyFillStroke(ctx, fill, stroke, sw, cap, join);
            break;
        case 'ellipse':
            const cx = obj.x + obj.w / 2,
                cy = obj.y + obj.h / 2;
            const rx = obj.w / 2,
                ry = obj.h / 2;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            applyFillStroke(ctx, fill, stroke, sw, cap, join);
            break;
        case 'polygon':
        case 'star':
            const cx2 = obj.x + obj.w / 2,
                cy2 = obj.y + obj.h / 2;
            const r2 = Math.min(obj.w, obj.h) / 2;
            const sides = obj.sides || 6;
            const ratio = obj.type === 'star' ? (obj.starRatio || 0.5) : 1;
            ctx.beginPath();
            for (let i = 0; i < sides * 2; i++) {
                const radius = i % 2 === 0 ? r2 : r2 * ratio;
                const angle = (i / (sides * 2)) * Math.PI * 2 - Math.PI / 2;
                const px = cx2 + radius * Math.cos(angle);
                const py = cy2 + radius * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            applyFillStroke(ctx, fill, stroke, sw, cap, join);
            break;
        case 'line':
            ctx.beginPath();
            ctx.moveTo(obj.x, obj.y);
            ctx.lineTo(obj.x2, obj.y2);
            if (stroke !== 'transparent') {
                ctx.strokeStyle = stroke;
                ctx.lineWidth = sw;
                ctx.lineCap = cap;
                ctx.lineJoin = join;
                ctx.stroke();
            }
            break;
        case 'path':
            if (!obj.points || obj.points.length < 2) break;
            ctx.beginPath();
            ctx.moveTo(obj.points[0].x, obj.points[0].y);
            for (let i = 1; i < obj.points.length; i++) {
                const p = obj.points[i];
                const prev = obj.points[i - 1];
                // Simple linear for now
                ctx.lineTo(p.x, p.y);
            }
            if (obj.closed) ctx.closePath();
            applyFillStroke(ctx, fill, stroke, sw, cap, join);
            break;
    }

    ctx.restore();
}

function applyFillStroke(ctx, fill, stroke, sw, cap, join) {
    if (fill !== 'transparent') { ctx.fillStyle = fill;
        ctx.fill(); }
    if (stroke !== 'transparent') {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = sw;
        ctx.lineCap = cap;
        ctx.lineJoin = join;
        ctx.stroke();
    }
}

// ---- Overlay ----
function drawOverlay() {
    const w = state.canvasWidth,
        h = state.canvasHeight;
    overlayCtx.clearRect(0, 0, w, h);
    // Draw selection boxes
    for (const id of state.selectedIds) {
        const obj = getObject(id);
        if (!obj) continue;
        const bbox = getObjectBounds(obj);
        if (!bbox) continue;
        overlayCtx.save();
        overlayCtx.strokeStyle = 'rgba(0,180,255,0.6)';
        overlayCtx.lineWidth = 1.5;
        overlayCtx.setLineDash([4, 4]);
        overlayCtx.strokeRect(bbox.x - 4, bbox.y - 4, bbox.w + 8, bbox.h + 8);
        // Corner handles
        const handles = [
            [bbox.x - 4, bbox.y - 4],
            [bbox.x + bbox.w + 4, bbox.y - 4],
            [bbox.x - 4, bbox.y + bbox.h + 4],
            [bbox.x + bbox.w + 4, bbox.y + bbox.h + 4]
        ];
        overlayCtx.fillStyle = 'rgba(0,180,255,0.8)';
        for (const h of handles) {
            overlayCtx.beginPath();
            overlayCtx.arc(h[0], h[1], 4, 0, Math.PI * 2);
            overlayCtx.fill();
        }
        overlayCtx.restore();
    }
}

// ---- Guides ----
function drawGuides() {
    const w = state.canvasWidth,
        h = state.canvasHeight;
    guideCtx.clearRect(0, 0, w, h);
    guideCtx.save();
    guideCtx.strokeStyle = 'rgba(255,255,255,0.04)';
    guideCtx.lineWidth = 0.5;
    const cx = w / 2,
        cy = h / 2;
    guideCtx.setLineDash([4, 8]);
    guideCtx.beginPath();
    guideCtx.moveTo(cx - 40, cy);
    guideCtx.lineTo(cx + 40, cy);
    guideCtx.stroke();
    guideCtx.beginPath();
    guideCtx.moveTo(cx, cy - 40);
    guideCtx.lineTo(cx, cy + 40);
    guideCtx.stroke();
    guideCtx.setLineDash([]);
    const step = 50;
    guideCtx.strokeStyle = 'rgba(255,255,255,0.012)';
    for (let x = step; x < w; x += step) {
        guideCtx.beginPath();
        guideCtx.moveTo(x, 0);
        guideCtx.lineTo(x, h);
        guideCtx.stroke();
    }
    for (let y = step; y < h; y += step) {
        guideCtx.beginPath();
        guideCtx.moveTo(0, y);
        guideCtx.lineTo(w, y);
        guideCtx.stroke();
    }
    guideCtx.restore();
}

// ---- UI Updates ----
function updateLayerUI() {
    layerList.innerHTML = '';
    const reversed = [...state.layers].reverse();
    for (const layer of reversed) {
        const div = document.createElement('div');
        div.className = 'layer-item' + (layer.id === state.activeLayerId ? ' active' : '');
        div.dataset.id = layer.id;
        const vis = document.createElement('button');
        vis.className = 'layer-vis' + (layer.visible ? '' : ' off');
        vis.innerHTML = layer.visible ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        vis.addEventListener('click', function(e) { e.stopPropagation();
            layer.visible = !layer.visible;
            renderAll(); });
        const name = document.createElement('span');
        name.className = 'layer-name';
        name.textContent = layer.name || `Layer ${layer.id}`;
        const count = document.createElement('span');
        count.className = 'layer-count';
        count.textContent = layer.objects.length;
        const del = document.createElement('button');
        del.className = 'layer-del';
        del.innerHTML = '<i class="fas fa-times"></i>';
        del.addEventListener('click', function(e) { e.stopPropagation();
            deleteLayer(layer.id); });
        div.appendChild(vis);
        div.appendChild(name);
        div.appendChild(count);
        div.appendChild(del);
        div.addEventListener('click', function() {
            state.activeLayerId = layer.id;
            state.selectedIds = [];
            updateLayerUI();
            updatePropertiesUI();
            renderAll();
        });
        layerList.appendChild(div);
    }
    updatePropertiesUI();
}

function updateObjectsList() {
    const layer = getActiveLayer();
    if (!layer) {
        objectsList.innerHTML =
            '<div style="font-size:0.45rem;color:var(--text-muted);opacity:0.3;text-align:center;padding:4px 0;">No objects</div>';
        return;
    }
    objectsList.innerHTML = '';
    if (layer.objects.length === 0) {
        objectsList.innerHTML =
            '<div style="font-size:0.45rem;color:var(--text-muted);opacity:0.3;text-align:center;padding:4px 0;">No objects</div>';
        return;
    }
    for (const obj of layer.objects) {
        const item = document.createElement('div');
        const selected = state.selectedIds.includes(obj.id);
        item.className = 'object-item' + (selected ? ' active' : '');
        const icons = { path: 'fa-pen-fancy', rect: 'fa-square', ellipse: 'fa-circle', polygon: 'fa-hexagon',
            star: 'fa-star', line: 'fa-minus' };
        const icon = icons[obj.type] || 'fa-shapes';
        const name = obj.name || obj.type;
        item.innerHTML =
            `<span class="obj-name"><i class="fas ${icon}"></i> ${name}</span><button class="obj-del" data-id="${obj.id}"><i class="fas fa-times"></i></button>`;
        item.addEventListener('click', function() {
            const idx = state.selectedIds.indexOf(obj.id);
            if (idx === -1) state.selectedIds.push(obj.id);
            else state.selectedIds.splice(idx, 1);
            renderAll();
            updateObjectsList();
            updatePropertiesUI();
        });
        item.querySelector('.obj-del').addEventListener('click', function(e) {
            e.stopPropagation();
            deleteObject(obj.id);
        });
        objectsList.appendChild(item);
    }
}

function updatePropertiesUI() {
    const selected = getSelectedObjects();
    const obj = selected.length === 1 ? selected[0] : null;
    const layer = getActiveLayer();

    if (obj) {
        document.getElementById('objNameInput').value = obj.name || '';
        document.getElementById('objFillColor').value = obj.fill || '#00b4ff';
        document.getElementById('objStrokeColor').value = obj.stroke || '#ffffff';
        document.getElementById('objStrokeWidth').value = obj.strokeWidth || 2;
        document.getElementById('objStrokeWidthLabel').textContent = obj.strokeWidth || 2;
        document.getElementById('objOpacity').value = Math.round((obj.opacity || 1) * 100);
        document.getElementById('objOpacityLabel').textContent = Math.round((obj.opacity || 1) * 100);
        const bbox = getObjectBounds(obj);
        if (bbox) {
            document.getElementById('objX').value = Math.round(bbox.x);
            document.getElementById('objY').value = Math.round(bbox.y);
        }
        document.getElementById('objRot').value = obj.rotation || 0;
    } else {
        document.getElementById('objNameInput').value = '';
        document.getElementById('objFillColor').value = '#00b4ff';
        document.getElementById('objStrokeColor').value = '#ffffff';
        document.getElementById('objStrokeWidth').value = 2;
        document.getElementById('objStrokeWidthLabel').textContent = '2';
        document.getElementById('objOpacity').value = 100;
        document.getElementById('objOpacityLabel').textContent = '100';
        document.getElementById('objX').value = '';
        document.getElementById('objY').value = '';
        document.getElementById('objRot').value = '0';
    }

    if (layer) {
        document.getElementById('layerNameInput').value = layer.name || '';
        document.getElementById('layerOpacity').value = Math.round(layer.opacity * 100);
        document.getElementById('layerOpacityVal').textContent = Math.round(layer.opacity * 100);
        document.getElementById('layerBlend').value = layer.blendMode || 'source-over';
    }
}

function updateObjectCount() {
    let total = 0;
    for (const layer of state.layers) total += layer.objects.length;
    objectCountInfo.textContent = `Objects: ${total}`;
}

// ---- Canvas ops ----
function initCanvas(w, h) {
    state.canvasWidth = w;
    state.canvasHeight = h;
    [mainCanvas, guideCanvas, overlayCanvas, compositeCanvas].forEach(c => {
        c.width = w;
        c.height = h;
        c.style.width = w + 'px';
        c.style.height = h + 'px';
    });
    canvasContainer.style.width = w + 'px';
    canvasContainer.style.height = h + 'px';
    canvasContainer.style.background = state.backgroundColor;
    canvasSizeInfo.textContent = `${w} × ${h}`;
    fitCanvas();
    renderAll();
}

function fitCanvas() {
    const wr = canvasWrapper.getBoundingClientRect();
    const pad = 10;
    const availW = wr.width - pad * 2;
    const availH = wr.height - pad * 2;
    const cw = state.canvasWidth,
        ch = state.canvasHeight;
    if (cw === 0 || ch === 0) return;
    const sx = availW / cw,
        sy = availH / ch;
    let s = Math.min(sx, sy, 2.0);
    s = Math.max(s, 0.06);
    state.scale = s;
    state.panX = 0;
    state.panY = 0;
    applyTransform();
    updateZoomDisplay();
}

function applyTransform() {
    canvasContainer.style.transform = `scale(${state.scale}) translate(${state.panX / state.scale}px, ${state.panY / state.scale}px)`;
    canvasContainer.style.transformOrigin = 'center center';
}

function updateZoomDisplay() {
    document.getElementById('zoomDisplay').textContent = Math.round(state.scale * 100) + '%';
}

// ---- Coordinates ----
function getCanvasCoords(e) {
    const rect = mainCanvas.getBoundingClientRect();
    const scaleX = state.canvasWidth / rect.width;
    const scaleY = state.canvasHeight / rect.height;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    return { x: Math.max(0, Math.min(state.canvasWidth, (clientX - rect.left) * scaleX)), y: Math.max(0, Math.min(
            state.canvasHeight, (clientY - rect.top) * scaleY)) };
}

// ---- Event handlers ----
function handlePointerDown(x, y) {
    const tool = state.tool;
    if (tool === 'select') {
        const obj = getObjectAt(x, y);
        if (obj) {
            // Check if shift is pressed for additive selection
            const shift = window.event ? window.event.shiftKey : false;
            if (shift) {
                const idx = state.selectedIds.indexOf(obj.id);
                if (idx === -1) state.selectedIds.push(obj.id);
                else state.selectedIds.splice(idx, 1);
                renderAll();
                updatePropertiesUI();
                updateObjectsList();
            } else {
                if (!state.selectedIds.includes(obj.id)) {
                    state.selectedIds = [obj.id];
                    renderAll();
                    updatePropertiesUI();
                    updateObjectsList();
                }
                startMoveObjects(x, y);
            }
        } else {
            state.selectedIds = [];
            renderAll();
            updatePropertiesUI();
            updateObjectsList();
        }
    } else if (tool === 'direct') {
        // Direct selection - similar but allow point editing
        const obj = getObjectAt(x, y);
        if (obj) {
            state.selectedIds = [obj.id];
            renderAll();
            updatePropertiesUI();
            updateObjectsList();
            startMoveObjects(x, y);
        } else {
            state.selectedIds = [];
            renderAll();
            updatePropertiesUI();
            updateObjectsList();
        }
    } else if (tool === 'pen') {
        startPenDraw(x, y);
    } else if (['rect', 'ellipse', 'polygon', 'star', 'line'].includes(tool)) {
        startShapeDraw(x, y, tool);
    } else if (tool === 'pencil') {
        startPenDraw(x, y); // Pencil uses same as pen but with different feel
    }
}

function handlePointerMove(x, y) {
    const tool = state.tool;
    if (tool === 'select' && state.isDragging) {
        updateMoveObjects(x, y);
    } else if (tool === 'direct' && state.isDragging) {
        updateMoveObjects(x, y);
    } else if (tool === 'pen' && state.isPenDrawing) {
        updatePenDraw(x, y);
    } else if (['rect', 'ellipse', 'polygon', 'star', 'line', 'pencil'].includes(tool) && state.isDrawing) {
        updateShapeDraw(x, y);
    }
    // Update cursor position display
    const cx = document.getElementById('objX');
    const cy = document.getElementById('objY');
    if (cx && cy && tool !== 'select') {
        // Only update if not in select mode
    }
}

function handlePointerUp() {
    if (state.isDragging) endMoveObjects();
    if (state.isPenDrawing) endPenDraw();
    if (state.isDrawing) endShapeDraw();
}

// ---- Mouse events ----
mainCanvas.addEventListener('mousedown', function(e) {
    const { x, y } = getCanvasCoords(e);
    // Store shift key state
    window._shiftKey = e.shiftKey;
    handlePointerDown(x, y);
});
mainCanvas.addEventListener('mousemove', function(e) {
    const { x, y } = getCanvasCoords(e);
    handlePointerMove(x, y);
});
mainCanvas.addEventListener('mouseup', handlePointerUp);
mainCanvas.addEventListener('mouseleave', handlePointerUp);

// ---- Touch events ----
mainCanvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    window._shiftKey = false;
    handlePointerDown(x, y);
}, { passive: false });
mainCanvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    handlePointerMove(x, y);
}, { passive: false });
mainCanvas.addEventListener('touchend', function(e) {
    e.preventDefault();
    handlePointerUp();
}, { passive: false });

// ---- Wheel zoom ----
canvasWrapper.addEventListener('wheel', function(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    let newScale = state.scale + delta;
    newScale = Math.max(0.06, Math.min(5.0, newScale));
    state.scale = newScale;
    applyTransform();
    updateZoomDisplay();
}, { passive: false });

// ---- Keyboard shortcuts ----
document.addEventListener('keydown', function(e) {
    if (e.target.closest('input, textarea, select')) return;
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    if (ctrl && e.key === 'z') { e.preventDefault();
        undo(); }
    if (ctrl && e.key === 'y') { e.preventDefault();
        redo(); }
    if (ctrl && e.key === 'g') { e.preventDefault();
        groupSelected(); }
    if (ctrl && shift && e.key === 'G') { e.preventDefault();
        ungroupSelected(); }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault();
        deleteSelected(); }
    if (e.key === 'v' && !ctrl) document.querySelector('[data-tool="select"]')?.click();
    if (e.key === 'a' && !ctrl) document.querySelector('[data-tool="direct"]')?.click();
    if (e.key === 'p' && !ctrl) document.querySelector('[data-tool="pen"]')?.click();
    if (e.key === 'r' && !ctrl) document.querySelector('[data-tool="rect"]')?.click();
    if (e.key === 'e' && !ctrl) document.querySelector('[data-tool="ellipse"]')?.click();
    if (e.key === 'o' && !ctrl) document.querySelector('[data-tool="polygon"]')?.click();
    if (e.key === 's' && !ctrl) document.querySelector('[data-tool="star"]')?.click();
    if (e.key === 'l' && !ctrl) document.querySelector('[data-tool="line"]')?.click();
    if (e.key === 'n' && !ctrl) document.querySelector('[data-tool="pencil"]')?.click();
    if (e.key === 'Escape') { state.selectedIds = [];
        renderAll();
        updatePropertiesUI();
        updateObjectsList(); }
});

// ---- Toolbar bindings ----
document.querySelectorAll('[data-tool]').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        state.tool = this.dataset.tool;
        // Show/hide settings
        document.getElementById('penSettings').style.display = state.tool === 'pen' ? 'flex' : 'none';
        document.getElementById('shapeSettings').style.display = ['rect', 'ellipse', 'polygon', 'star',
            'line', 'pencil'
        ].includes(state.tool) ? 'flex' : 'none';
        document.getElementById('polygonSettings').style.display = ['polygon', 'star'].includes(state
            .tool) ? 'flex' : 'none';
        mainCanvas.style.cursor = ['select', 'direct'].includes(state.tool) ? 'default' : 'crosshair';
        showToast(`🛠️ ${this.textContent.trim()}`);
    });
});

// ---- Shape settings ----
document.getElementById('shapeFillToggle').addEventListener('click', function() {
    this.classList.toggle('active');
    state.fillEnabled = this.classList.contains('active');
    updateSelectedProperty('fillEnabled', state.fillEnabled);
});
document.getElementById('shapeStrokeToggle').addEventListener('click', function() {
    this.classList.toggle('active');
    state.strokeEnabled = this.classList.contains('active');
    updateSelectedProperty('strokeEnabled', state.strokeEnabled);
});

function updateSelectedProperty(key, value) {
    const selected = getSelectedObjects();
    for (const obj of selected) {
        obj[key] = value;
    }
    renderAll();
    saveHistory();
}

// ---- Color inputs ----
document.getElementById('fillColor').addEventListener('input', function() {
    state.fillColor = this.value;
    document.getElementById('fillHex').textContent = this.value;
    updateSelectedProperty('fill', this.value);
    document.getElementById('shapeFill').value = this.value;
    document.getElementById('penFill').value = this.value;
});
document.getElementById('strokeColor').addEventListener('input', function() {
    state.strokeColor = this.value;
    document.getElementById('strokeHex').textContent = this.value;
    updateSelectedProperty('stroke', this.value);
    document.getElementById('shapeStroke').value = this.value;
    document.getElementById('penStroke').value = this.value;
});
document.getElementById('strokeWidthRange').addEventListener('input', function() {
    const val = parseFloat(this.value);
    document.getElementById('strokeWidthLabel').textContent = val;
    state.strokeWidth = val;
    updateSelectedProperty('strokeWidth', val);
    document.getElementById('shapeStrokeWidth').value = val;
    document.getElementById('penStrokeWidth').value = val;
});
document.getElementById('strokeCap').addEventListener('change', function() {
    state.strokeCap = this.value;
    updateSelectedProperty('strokeCap', this.value);
});
document.getElementById('strokeJoin').addEventListener('change', function() {
    state.strokeJoin = this.value;
    updateSelectedProperty('strokeJoin', this.value);
});

document.getElementById('fillNone').addEventListener('click', function() {
    state.fillEnabled = false;
    updateSelectedProperty('fillEnabled', false);
    document.getElementById('shapeFillToggle').classList.remove('active');
});
document.getElementById('strokeNone').addEventListener('click', function() {
    state.strokeEnabled = false;
    updateSelectedProperty('strokeEnabled', false);
    document.getElementById('shapeStrokeToggle').classList.remove('active');
});

// ---- Color presets ----
document.querySelectorAll('.color-preset').forEach(preset => {
    preset.addEventListener('click', function() {
        const color = this.dataset.color;
        document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
        this.classList.add('active');
        document.getElementById('fillColor').value = color;
        document.getElementById('fillHex').textContent = color;
        state.fillColor = color;
        updateSelectedProperty('fill', color);
        document.getElementById('shapeFill').value = color;
        document.getElementById('penFill').value = color;
    });
});

// ---- Pen specific ----
document.getElementById('penFill').addEventListener('input', function() {
    document.getElementById('fillColor').value = this.value;
    document.getElementById('fillHex').textContent = this.value;
    state.fillColor = this.value;
});
document.getElementById('penStroke').addEventListener('input', function() {
    document.getElementById('strokeColor').value = this.value;
    document.getElementById('strokeHex').textContent = this.value;
    state.strokeColor = this.value;
});
document.getElementById('penStrokeWidth').addEventListener('input', function() {
    const val = parseFloat(this.value);
    document.getElementById('penStrokeWidthLabel').textContent = val;
    state.strokeWidth = val;
    document.getElementById('strokeWidthRange').value = val;
    document.getElementById('strokeWidthLabel').textContent = val;
});
document.getElementById('penCap').addEventListener('change', function() {
    state.strokeCap = this.value;
});
document.getElementById('penJoin').addEventListener('change', function() {
    state.strokeJoin = this.value;
});

// ---- Shape shared ----
document.getElementById('shapeFill').addEventListener('input', function() {
    document.getElementById('fillColor').value = this.value;
    document.getElementById('fillHex').textContent = this.value;
    state.fillColor = this.value;
});
document.getElementById('shapeStroke').addEventListener('input', function() {
    document.getElementById('strokeColor').value = this.value;
    document.getElementById('strokeHex').textContent = this.value;
    state.strokeColor = this.value;
});
document.getElementById('shapeStrokeWidth').addEventListener('input', function() {
    const val = parseFloat(this.value);
    document.getElementById('shapeStrokeWidthLabel').textContent = val;
    state.strokeWidth = val;
    document.getElementById('strokeWidthRange').value = val;
    document.getElementById('strokeWidthLabel').textContent = val;
});

// ---- Polygon ----
document.getElementById('polySides').addEventListener('change', function() {
    state.polySides = parseInt(this.value) || 6;
});
document.getElementById('polyStarRatio').addEventListener('change', function() {
    state.polyStarRatio = parseInt(this.value) / 100 || 0.5;
});

// ---- Canvas size ----
document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        initCanvas(parseInt(this.dataset.w), parseInt(this.dataset.h));
        showToast(`📐 ${this.dataset.w}×${this.dataset.h}`);
    });
});
document.getElementById('applyCustomSize').addEventListener('click', function() {
    const w = parseInt(document.getElementById('customW').value);
    const h = parseInt(document.getElementById('customH').value);
    if (w > 50 && h > 50 && w <= 4000 && h <= 4000) {
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        initCanvas(w, h);
        showToast(`📐 ${w}×${h}`);
    } else showToast('⚠️ 50–4000');
});

// ---- Background ----
const bgPicker = document.getElementById('bgColorPicker');
const bgHexDisplay = document.getElementById('bgHexDisplay');
bgPicker.addEventListener('input', function() {
    state.backgroundColor = this.value;
    bgHexDisplay.textContent = this.value;
    canvasContainer.style.background = this.value;
    renderAll();
});
document.getElementById('bgTransparent').addEventListener('click', function() {
    state.backgroundColor = 'rgba(0,0,0,0)';
    bgPicker.value = '#000000';
    bgHexDisplay.textContent = 'Transparent';
    canvasContainer.style.background = 'transparent';
    renderAll();
    showToast('🌫️ Transparent');
});
document.getElementById('bgWhite').addEventListener('click', function() {
    state.backgroundColor = '#ffffff';
    bgPicker.value = '#ffffff';
    bgHexDisplay.textContent = '#ffffff';
    canvasContainer.style.background = '#ffffff';
    renderAll();
    showToast('⬜ White');
});

// ---- Align ----
document.querySelectorAll('.align-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const type = this.dataset.align;
        alignObjects(type);
    });
});

// ---- Layer buttons ----
document.getElementById('addLayerBtn').addEventListener('click', function() {
    const layer = createLayer(`Layer ${state.layers.length + 1}`);
    addLayer(layer);
});
document.getElementById('duplicateLayerBtn').addEventListener('click', function() { if (state.activeLayerId)
        duplicateLayer(state.activeLayerId);
    else showToast('⚠️ Select a layer'); });
document.getElementById('mergeLayerBtn').addEventListener('click', mergeLayers);
document.getElementById('moveLayerUpBtn').addEventListener('click', function() { if (state.activeLayerId)
        moveLayerUp(state.activeLayerId); });
document.getElementById('moveLayerDownBtn').addEventListener('click', function() { if (state.activeLayerId)
        moveLayerDown(state.activeLayerId); });

// ---- Group buttons ----
document.getElementById('groupBtn').addEventListener('click', groupSelected);
document.getElementById('ungroupBtn').addEventListener('click', ungroupSelected);

// ---- Delete button ----
document.getElementById('deleteBtn').addEventListener('click', deleteSelected);

// ---- Properties ----
document.getElementById('objNameInput').addEventListener('change', function() {
    const selected = getSelectedObjects();
    for (const obj of selected) { obj.name = this.value || obj.type;
        renderAll();
        updateObjectsList(); }
});
document.getElementById('objFillColor').addEventListener('input', function() {
    const selected = getSelectedObjects();
    for (const obj of selected) { obj.fill = this.value;
        obj.fillEnabled = true;
        renderAll();
        saveHistory(); }
});
document.getElementById('objStrokeColor').addEventListener('input', function() {
    const selected = getSelectedObjects();
    for (const obj of selected) { obj.stroke = this.value;
        obj.strokeEnabled = true;
        renderAll();
        saveHistory(); }
});
document.getElementById('objStrokeWidth').addEventListener('input', function() {
    const val = parseFloat(this.value);
    document.getElementById('objStrokeWidthLabel').textContent = val;
    const selected = getSelectedObjects();
    for (const obj of selected) { obj.strokeWidth = val;
        renderAll();
        saveHistory(); }
});
document.getElementById('objOpacity').addEventListener('input', function() {
    const val = parseInt(this.value);
    document.getElementById('objOpacityLabel').textContent = val;
    const selected = getSelectedObjects();
    for (const obj of selected) { obj.opacity = val / 100;
        renderAll();
        saveHistory(); }
});
document.getElementById('objX').addEventListener('change', function() {
    const val = parseFloat(this.value);
    if (isNaN(val)) return;
    const selected = getSelectedObjects();
    if (selected.length === 1) {
        const obj = selected[0];
        const bbox = getObjectBounds(obj);
        if (bbox) {
            const dx = val - bbox.x;
            moveObjectBy(obj, dx, 0);
            renderAll();
            saveHistory();
        }
    }
});
document.getElementById('objY').addEventListener('change', function() {
    const val = parseFloat(this.value);
    if (isNaN(val)) return;
    const selected = getSelectedObjects();
    if (selected.length === 1) {
        const obj = selected[0];
        const bbox = getObjectBounds(obj);
        if (bbox) {
            const dy = val - bbox.y;
            moveObjectBy(obj, 0, dy);
            renderAll();
            saveHistory();
        }
    }
});
document.getElementById('objRot').addEventListener('change', function() {
    const val = parseFloat(this.value);
    if (isNaN(val)) return;
    const selected = getSelectedObjects();
    for (const obj of selected) { obj.rotation = val;
        renderAll();
        saveHistory(); }
});

function moveObjectBy(obj, dx, dy) {
    switch (obj.type) {
        case 'rect':
        case 'ellipse':
        case 'polygon':
        case 'star':
            obj.x += dx;
            obj.y += dy;
            break;
        case 'line':
            obj.x += dx;
            obj.y += dy;
            obj.x2 += dx;
            obj.y2 += dy;
            break;
        case 'path':
            for (const p of obj.points) { p.x += dx;
                p.y += dy; }
            break;
    }
}

document.getElementById('objFillNone').addEventListener('click', function() {
    const selected = getSelectedObjects();
    for (const obj of selected) { obj.fillEnabled = false;
        renderAll();
        saveHistory(); }
});
document.getElementById('objStrokeNone').addEventListener('click', function() {
    const selected = getSelectedObjects();
    for (const obj of selected) { obj.strokeEnabled = false;
        renderAll();
        saveHistory(); }
});

document.getElementById('layerNameInput').addEventListener('change', function() {
    const layer = getActiveLayer();
    if (layer) { layer.name = this.value || layer.name;
        updateLayerUI(); }
});
document.getElementById('layerOpacity').addEventListener('input', function() {
    const val = parseInt(this.value);
    document.getElementById('layerOpacityVal').textContent = val;
    const layer = getActiveLayer();
    if (layer) { layer.opacity = val / 100;
        renderAll();
        updateLayerUI(); }
});
document.getElementById('layerBlend').addEventListener('change', function() {
    const layer = getActiveLayer();
    if (layer) { layer.blendMode = this.value;
        renderAll(); }
});

// ---- Panel tabs ----
document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        const target = this.dataset.tab;
        document.querySelectorAll('.panel-content').forEach(p => p.classList.add('hidden'));
        document.getElementById(target + 'Panel').classList.remove('hidden');
    });
});

// ---- History ----
function saveHistory() {
    const snapshot = state.layers.map(l => ({
        id: l.id,
        objects: JSON.parse(JSON.stringify(l.objects)),
        opacity: l.opacity,
        blendMode: l.blendMode,
        visible: l.visible,
    }));
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(snapshot);
    if (state.history.length > state.maxHistory) state.history.shift();
    state.historyIndex = state.history.length - 1;
}

function restoreHistory(index) {
    if (index < 0 || index >= state.history.length) return;
    const snapshot = state.history[index];
    for (const layer of state.layers) {
        const found = snapshot.find(s => s.id === layer.id);
        if (found) {
            layer.objects = JSON.parse(JSON.stringify(found.objects));
            layer.opacity = found.opacity;
            layer.blendMode = found.blendMode;
            layer.visible = found.visible;
        }
    }
    state.historyIndex = index;
    state.selectedIds = [];
    renderAll();
    updateLayerUI();
    updateObjectsList();
    updatePropertiesUI();
}

function undo() { if (state.historyIndex > 0) { restoreHistory(state.historyIndex - 1);
        showToast('↩️ Undo'); } else showToast('⛔ No more undo'); }

function redo() { if (state.historyIndex < state.history.length - 1) { restoreHistory(state.historyIndex + 1);
        showToast('↪️ Redo'); } else showToast('⛔ No more redo'); }

// ---- Undo/Redo buttons ----
document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);

// ---- Export ----
function exportSVG() {
    const w = state.canvasWidth,
        h = state.canvasHeight;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n`;
    svg += `<rect width="100%" height="100%" fill="${state.backgroundColor}" />\n`;
    const visibleLayers = state.layers.filter(l => l.visible);
    for (const layer of visibleLayers) {
        for (const obj of layer.objects) {
            svg += objectToSVG(obj);
        }
    }
    svg += '</svg>';
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.download = `vectorforge-${Date.now()}.svg`;
    link.href = URL.createObjectURL(blob);
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    showToast('✅ Exported SVG');
}

function objectToSVG(obj) {
    const fill = obj.fillEnabled ? obj.fill : 'none';
    const stroke = obj.strokeEnabled ? obj.stroke : 'none';
    const sw = obj.strokeWidth || 2;
    const op = obj.opacity || 1;
    const cap = obj.strokeCap || 'round';
    const join = obj.strokeJoin || 'round';
    let el = '';
    const rot = obj.rotation || 0;
    const rotAttr = rot !== 0 ? ` transform="rotate(${rot} ${obj.x + obj.w/2} ${obj.y + obj.h/2})"` : '';

    switch (obj.type) {
        case 'rect':
            el =
                `<rect x="${obj.x}" y="${obj.y}" width="${obj.w}" height="${obj.h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${op}" stroke-linecap="${cap}" stroke-linejoin="${join}"${rotAttr} />\n`;
            break;
        case 'ellipse':
            const cx = obj.x + obj.w / 2,
                cy = obj.y + obj.h / 2,
                rx = obj.w / 2,
                ry = obj.h / 2;
            el =
                `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${op}" stroke-linecap="${cap}" stroke-linejoin="${join}"${rotAttr} />\n`;
            break;
        case 'polygon':
            const cx2 = obj.x + obj.w / 2,
                cy2 = obj.y + obj.h / 2,
                r2 = Math.min(obj.w, obj.h) / 2;
            let pts = '';
            for (let i = 0; i < (obj.sides || 6); i++) {
                const angle = (i / (obj.sides || 6)) * Math.PI * 2 - Math.PI / 2;
                const px = cx2 + r2 * Math.cos(angle);
                const py = cy2 + r2 * Math.sin(angle);
                pts += `${px},${py} `;
            }
            el =
                `<polygon points="${pts.trim()}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${op}" stroke-linecap="${cap}" stroke-linejoin="${join}"${rotAttr} />\n`;
            break;
        case 'star':
            const cx3 = obj.x + obj.w / 2,
                cy3 = obj.y + obj.h / 2,
                r3 = Math.min(obj.w, obj.h) / 2;
            const sides = obj.sides || 6;
            const ratio = obj.starRatio || 0.5;
            let pts2 = '';
            for (let i = 0; i < sides * 2; i++) {
                const radius = i % 2 === 0 ? r3 : r3 * ratio;
                const angle = (i / (sides * 2)) * Math.PI * 2 - Math.PI / 2;
                const px = cx3 + radius * Math.cos(angle);
                const py = cy3 + radius * Math.sin(angle);
                pts2 += `${px},${py} `;
            }
            el =
                `<polygon points="${pts2.trim()}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${op}" stroke-linecap="${cap}" stroke-linejoin="${join}"${rotAttr} />\n`;
            break;
        case 'line':
            el =
                `<line x1="${obj.x}" y1="${obj.y}" x2="${obj.x2}" y2="${obj.y2}" stroke="${stroke}" stroke-width="${sw}" opacity="${op}" stroke-linecap="${cap}" stroke-linejoin="${join}" />\n`;
            break;
        case 'path':
            if (!obj.points || obj.points.length < 2) return '';
            let d = `M ${obj.points[0].x} ${obj.points[0].y}`;
            for (let i = 1; i < obj.points.length; i++) {
                const p = obj.points[i];
                d += ` L ${p.x} ${p.y}`;
            }
            if (obj.closed) d += ' Z';
            el =
                `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${op}" stroke-linecap="${cap}" stroke-linejoin="${join}"${rotAttr} />\n`;
            break;
    }
    return el;
}

function exportPNG() {
    const w = state.canvasWidth,
        h = state.canvasHeight;
    const temp = document.createElement('canvas');
    temp.width = w;
    temp.height = h;
    const tCtx = temp.getContext('2d');
    tCtx.fillStyle = state.backgroundColor;
    tCtx.fillRect(0, 0, w, h);
    const visibleLayers = state.layers.filter(l => l.visible);
    for (const layer of visibleLayers) {
        tCtx.save();
        tCtx.globalAlpha = layer.opacity || 1;
        tCtx.globalCompositeOperation = layer.blendMode || 'source-over';
        for (const obj of layer.objects) {
            drawVectorObject(tCtx, obj, false);
        }
        tCtx.restore();
    }
    const link = document.createElement('a');
    link.download = `vectorforge-${Date.now()}.png`;
    link.href = temp.toDataURL('image/png');
    link.click();
    showToast('✅ Exported PNG');
}

document.getElementById('exportSVG').addEventListener('click', exportSVG);
document.getElementById('exportPNG').addEventListener('click', exportPNG);
document.querySelector('[data-action="Export"]')?.addEventListener('click', exportPNG);

// ---- Clear ----
document.getElementById('clearAll').addEventListener('click', function() {
    if (!confirm('Clear all objects from all layers?')) return;
    for (const layer of state.layers) layer.objects = [];
    state.selectedIds = [];
    renderAll();
    updateObjectsList();
    updatePropertiesUI();
    saveHistory();
    showToast('🧹 All cleared');
});

// ---- Zoom ----
document.getElementById('zoomInBtn').addEventListener('click', function() {
    state.scale = Math.min(5.0, state.scale + 0.15);
    applyTransform();
    updateZoomDisplay();
});
document.getElementById('zoomOutBtn').addEventListener('click', function() {
    state.scale = Math.max(0.06, state.scale - 0.15);
    applyTransform();
    updateZoomDisplay();
});
document.getElementById('zoomFitBtn').addEventListener('click', fitCanvas);

// ---- Resize ----
let resizeTimer;
window.addEventListener('resize', function() { clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitCanvas, 200); });

// =============================================================
//  INIT
// =============================================================
function init() {
    const bgLayer = createLayer('Background');
    state.layers.push(bgLayer);
    const drawLayer = createLayer('Layer 1');
    state.layers.push(drawLayer);
    state.activeLayerId = drawLayer.id;

    initCanvas(1080, 1080);
    updateLayerUI();
    updateObjectsList();
    updatePropertiesUI();
    saveHistory();

    document.querySelector('[data-tool="select"]')?.click();

    showToast('✦ VectorForge Pro · Illustrator-style Studio ready!');
    console.log('✦ VectorForge Pro · Full Vector Studio');
    console.log('🛠️ Tools: Select, Direct, Pen, Rect, Ellipse, Polygon, Star, Line, Pencil');
    console.log('📐 Layers · Groups · Align · Transform · Export SVG/PNG');
    console.log('⌨️ Shortcuts: V,A,P,R,E,O,S,L,N · Ctrl+Z/Y · Del · Ctrl+G/Shift+G');
}

window.__state = state;
init();