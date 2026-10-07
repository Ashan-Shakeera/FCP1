/* ============================================================================
   HELABERRY · LIVE PAINTING STUDIO + AI COLORIZER
   Full external script — no inline JS in the HTML.
============================================================================ */

/* ============================================================================
   PART 1 — LINE PRO PAINTING STUDIO
   ============================================================================ */
(function () {
  'use strict';

  /* =============================================================
     SPLASH TIMING
  ============================================================= */
  const SPLASH_IN_MS   = 550;
  const SPLASH_OUT_MS  = 450;
  const SPLASH_HOLD_MS = SPLASH_IN_MS;

  (function initSplash(){
    const splash = document.getElementById('hbSplash');
    if (!splash) return;
    const root = document.documentElement;
    root.style.setProperty('--splash-in',  SPLASH_IN_MS + 'ms');
    root.style.setProperty('--splash-out', SPLASH_OUT_MS + 'ms');
    document.body.classList.add('splash-lock');
    let removed = false;
    function hideSplash(){
      if (removed) return;
      removed = true;
      splash.classList.add('hide');
      document.body.classList.remove('splash-lock');
      setTimeout(() => { if (splash.parentNode) splash.remove(); }, SPLASH_OUT_MS);
    }
    const timer = setTimeout(hideSplash, SPLASH_IN_MS + SPLASH_HOLD_MS);
    splash.addEventListener('pointerdown', () => { clearTimeout(timer); hideSplash(); });
  })();

  /* =============================================================
     DOM REFS
  ============================================================= */
  const lineCanvas      = document.getElementById('lineCanvas');
  const paintCanvas     = document.getElementById('paintCanvas');
  const selectionCanvas = document.getElementById('selectionCanvas');
  const lineCtx         = lineCanvas.getContext('2d', { willReadFrequently: true });
  const paintCtx        = paintCanvas.getContext('2d', { willReadFrequently: true });
  const selectionCtx    = selectionCanvas.getContext('2d', { willReadFrequently: true });

  const canvasStage     = document.getElementById('canvasStage');
  const canvasArea      = document.getElementById('canvasArea');
  const emptyState      = document.getElementById('emptyState');
  const dropZone        = document.getElementById('dropZone');
  const fileInput       = document.getElementById('fileInput');
  const brushCursor     = document.getElementById('brushCursor');

  const sizeSlider      = document.getElementById('sizeSlider');
  const sizeValue       = document.getElementById('sizeValue');
  const opacitySlider   = document.getElementById('opacitySlider');
  const opacityValue    = document.getElementById('opacityValue');
  const fillTolSlider   = document.getElementById('fillTolSlider');
  const fillTolValue    = document.getElementById('fillTolValue');

  const colorInput      = document.getElementById('colorInput');
  const colorSwatchLg   = document.getElementById('colorSwatchLg');
  const colorHexInput   = document.getElementById('colorHexInput');
  const paletteEl       = document.getElementById('palette');
  const recentRow       = document.getElementById('recentRow');
  const wheelCanvas     = document.getElementById('wheelCanvas');
  const harmonySelect   = document.getElementById('harmonySelect');
  const harmonyStrip    = document.getElementById('harmonyStrip');

  const selectionPanel  = document.getElementById('selectionPanel');
  const selModeGroup    = document.getElementById('selModeGroup');
  const thresholdSlider = document.getElementById('thresholdSlider');
  const thresholdValue  = document.getElementById('thresholdValue');
  const deselectBtn     = document.getElementById('deselectBtn');
  const selActivePill   = document.getElementById('selActivePill');
  const pillDeselectBtn = document.getElementById('pillDeselectBtn');

  const brushTypeGroup  = document.getElementById('brushTypeGroup');
  const symmetryGroup   = document.getElementById('symmetryGroup');

  const undoBtn         = document.getElementById('undoBtn');
  const redoBtn         = document.getElementById('redoBtn');
  const clearBtn        = document.getElementById('clearBtn');
  const toggleLinesBtn  = document.getElementById('toggleLinesBtn');
  const downloadBtn     = document.getElementById('downloadBtn');
  const analyzeBtn      = document.getElementById('analyzeBtn');
  const uploadBtn       = document.getElementById('uploadBtn');
  const emptyUploadBtn  = document.getElementById('emptyUploadBtn');
  const navUploadBtn    = document.getElementById('navUploadBtn');
  const navDownloadBtn  = document.getElementById('navDownloadBtn');
  const navAnalyzeBtn   = document.getElementById('navAnalyzeBtn');

  const analysisModal   = document.getElementById('analysisModal');
  const analysisBody    = document.getElementById('analysisBody');
  const analysisClose   = document.getElementById('analysisClose');

  /* =============================================================
     CONSTANTS & STATE
  ============================================================= */
  const MAX_DIM   = 1200;
  const MAX_UNDO  = 18;
  const LINE_LUM  = 110;
  const MAX_EDGES = 120000;
  const WHEEL_RES = 480;

  let canvasW = 0, canvasH = 0;
  let hasImage = false;
  let linesHidden = false;
  let refImageData = null;

  let currentTool  = 'brush';
  let currentColor = '#7c6cf0';
  let brushSize    = 14;
  let brushOpacity = 1;
  let brushType    = 'round';
  let symmetry     = 'off';
  let fillTolerance = 42;

  let isDrawing = false;
  let lastX = 0, lastY = 0;

  const undoStack = [];
  const redoStack = [];

  let selectionMask = null;
  let selActive = false;
  let selMode = 'new';
  let selThreshold = 32;
  let isSelecting = false;
  let lastSelX = 0, lastSelY = 0;
  let selEdges = null;
  let edgeCacheCanvas = null;

  const selMaskCanvas = document.createElement('canvas');
  const selMaskCtx = selMaskCanvas.getContext('2d', { willReadFrequently: true });

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 1; tempCanvas.height = 1;
  const tempCtx = tempCanvas.getContext('2d');

  let wheelH = 250, wheelS = 0.72, wheelV = 0.94;
  let harmonyScheme = 'free';
  let wheelBaseCanvas = null;
  let svOffscreen = document.createElement('canvas');
  let wheelDragging = null;

  const recentColors = [];

  const PALETTE = [
    '#000000','#4a4a4a','#8a8a8a','#c8c8c8','#ffffff',
    '#7c6cf0','#a29bfe','#c4b5fd','#8b7bf7','#5a4bd1',
    '#f87171','#fb923c','#fbbf24','#facc15','#a3e635',
    '#4ade80','#34d399','#22d3ee','#60a5fa','#3b82f6',
    '#f472b6','#ec4899','#d946ef','#a855f7','#8b5cf6',
    '#f5c9a5','#e0ac7e','#c68642','#8d5524','#5c3317'
  ];

  const SCHEMES = {
    complementary:      { name:'Complementary',      offsets:[0,180],          desc:'Two hues directly opposite on the wheel. Maximum contrast and vibrancy.' },
    analogous:          { name:'Analogous',          offsets:[0,30,330],       desc:'Neighbouring hues. Calm, cohesive and naturally pleasing to the eye.' },
    triadic:            { name:'Triadic',            offsets:[0,120,240],      desc:'Three hues evenly spaced. Balanced, vivid and playful.' },
    splitComplementary: { name:'Split-Complementary',offsets:[0,150,210],      desc:'A base hue plus the two neighbours of its complement. Strong but softer than complementary.' },
    tetradic:           { name:'Tetradic',           offsets:[0,60,180,240],   desc:'Two complementary pairs. Rich and varied, best with one dominant hue.' },
    square:             { name:'Square',             offsets:[0,90,180,270],   desc:'Four hues evenly spaced. Bold and energetic — needs careful balance.' },
    monochromatic:      { name:'Monochromatic',      offsets:[0],              desc:'A single hue across many values and saturations. Elegant and unified.' }
  };

  /* =============================================================
     COLOR MATH
  ============================================================= */
  function hexToRgb(hex){
    const h = String(hex).replace('#','');
    const v = h.length === 3 ? h.split('').map(c=>c+c).join('') : h;
    const n = parseInt(v,16);
    if (isNaN(n)) return [0,0,0];
    return [(n>>16)&255,(n>>8)&255,n&255];
  }
  function rgbToHex(r,g,b){
    return '#' + [r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
  }
  function luminance(r,g,b){ return 0.299*r + 0.587*g + 0.114*b; }

  function hsvToRgb(h,s,v){
    h = ((h % 1) + 1) % 1;
    const i = Math.floor(h*6);
    const f = h*6 - i;
    const p = v*(1-s);
    const q = v*(1-f*s);
    const t = v*(1-(1-f)*s);
    let r,g,b;
    switch(i % 6){
      case 0: r=v; g=t; b=p; break;
      case 1: r=q; g=v; b=p; break;
      case 2: r=p; g=v; b=t; break;
      case 3: r=p; g=q; b=v; break;
      case 4: r=t; g=p; b=v; break;
      default:r=v; g=p; b=q; break;
    }
    return [Math.round(r*255),Math.round(g*255),Math.round(b*255)];
  }

  function rgbToHsv(r,g,b){
    r/=255; g/=255; b/=255;
    const mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx-mn;
    let h = 0;
    if (d !== 0){
      if (mx === r) h = ((g-b)/d) % 6;
      else if (mx === g) h = (b-r)/d + 2;
      else h = (r-g)/d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    const s = mx === 0 ? 0 : d/mx;
    return [h, s, mx];
  }

  function rgbToHue(r,g,b){
    r/=255; g/=255; b/=255;
    const mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx-mn;
    if (d === 0) return 0;
    let h;
    if (mx === r) h = ((g-b)/d) % 6;
    else if (mx === g) h = (b-r)/d + 2;
    else h = (r-g)/d + 4;
    h *= 60;
    if (h < 0) h += 360;
    return h;
  }

  function circDist(a,b){
    const d = Math.abs(a-b) % 360;
    return d > 180 ? 360 - d : d;
  }

  function isValidHex(str){
    return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(str).trim());
  }
  function normalizeHex(str){
    let h = String(str).trim().replace('#','');
    if (h.length === 3) h = h.split('').map(c=>c+c).join('');
    return '#' + h.toLowerCase();
  }

  /* =============================================================
     TOAST / RIPPLE
  ============================================================= */
  function showToast(message, icon){
    const existing = document.querySelector('.hb-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'hb-toast';
    toast.innerHTML = (icon ? '<i class="fas ' + icon + '"></i>' : '') + '<span>' + message + '</span>';
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 450);
    }, 2600);
  }

  function createRipple(e, el){
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size/2;
    const y = e.clientY - rect.top - size/2;
    const ripple = document.createElement('span');
    ripple.className = 'hb-ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  }

  document.querySelectorAll('.hb-btn, .tool-btn, .seg-btn').forEach(btn => {
    btn.addEventListener('click', function(e){
      if (this.disabled) return;
      createRipple(e, this);
    });
  });

  /* =============================================================
     COLOR WHEEL
  ============================================================= */
  function buildWheelBase(){
    const size = WHEEL_RES;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(size, size);
    const cx = size/2, cy = size/2;
    const outer = size/2 - 3;
    const inner = outer * 0.80;
    const feather = 2.5;

    for (let y = 0; y < size; y++){
      const dy = y - cy + 0.5;
      for (let x = 0; x < size; x++){
        const dx = x - cx + 0.5;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const i = (y*size + x) * 4;
        const aOuter = Math.min(1, Math.max(0, (outer - dist) / feather));
        const aInner = Math.min(1, Math.max(0, (dist - inner) / feather));
        const a = Math.min(aOuter, aInner);
        if (a <= 0){ img.data[i+3] = 0; continue; }
        let ang = Math.atan2(dy, dx) * 180 / Math.PI;
        let hue = (ang + 90 + 360) % 360;
        const rgb = hsvToRgb(hue/360, 1, 1);
        img.data[i]   = rgb[0];
        img.data[i+1] = rgb[1];
        img.data[i+2] = rgb[2];
        img.data[i+3] = Math.round(a * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  function renderSV(hue){
    const n = 180;
    svOffscreen.width = n;
    svOffscreen.height = n;
    const ctx = svOffscreen.getContext('2d');
    const img = ctx.createImageData(n, n);
    for (let y = 0; y < n; y++){
      const v = 1 - y/(n-1);
      for (let x = 0; x < n; x++){
        const s = x/(n-1);
        const rgb = hsvToRgb(hue/360, s, v);
        const i = (y*n + x)*4;
        img.data[i]   = rgb[0];
        img.data[i+1] = rgb[1];
        img.data[i+2] = rgb[2];
        img.data[i+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function wheelGeometry(){
    const R = WHEEL_RES;
    const cx = R/2, cy = R/2;
    const outer = R/2 - 3;
    const inner = outer * 0.80;
    const half = inner * 0.60;
    return { R, cx, cy, outer, inner, half };
  }

  function renderWheel(){
    const ctx = wheelCanvas.getContext('2d');
    const { R, cx, cy, outer, inner, half } = wheelGeometry();

    ctx.clearRect(0, 0, R, R);

    if (!wheelBaseCanvas) wheelBaseCanvas = buildWheelBase();
    ctx.drawImage(wheelBaseCanvas, 0, 0);

    renderSV(wheelH);
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx-half, cy-half, half*2, half*2);
    ctx.clip();
    ctx.drawImage(svOffscreen, cx-half, cy-half, half*2, half*2);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.20)';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx-half, cy-half, half*2, half*2);

    if (harmonyScheme !== 'free' && SCHEMES[harmonyScheme]){
      const scheme = SCHEMES[harmonyScheme];
      const rChord = inner * 0.90;
      const pts = scheme.offsets.map((o, idx) => {
        const hue = (wheelH + o + 360) % 360;
        const ang = (hue - 90) * Math.PI / 180;
        return { hue, idx, x: cx + Math.cos(ang)*rChord, y: cy + Math.sin(ang)*rChord };
      });

      if (pts.length > 1){
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,.30)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5,5]);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        if (pts.length > 2) ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      const rm = (outer + inner) / 2;
      pts.forEach(p => {
        const ang = (p.hue - 90) * Math.PI / 180;
        const x = cx + Math.cos(ang) * rm;
        const y = cy + Math.sin(ang) * rm;
        const rgb = hsvToRgb(p.hue/360, 1, 1);
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI*2);
        ctx.fillStyle = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
        ctx.fill();
        ctx.lineWidth = p.idx === 0 ? 3 : 2;
        ctx.strokeStyle = p.idx === 0 ? '#ffffff' : 'rgba(255,255,255,.55)';
        ctx.stroke();
      });
    }

    const sx = cx - half + wheelS * half * 2;
    const sy = cy - half + (1 - wheelV) * half * 2;
    ctx.beginPath();
    ctx.arc(sx, sy, 8.5, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx, sy, 7, 0, Math.PI*2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function wheelPointerPos(e){
    const rect = wheelCanvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width * WHEEL_RES,
      y: (e.clientY - rect.top) / rect.height * WHEEL_RES
    };
  }

  function wheelHitTest(x, y){
    const { cx, cy, outer, inner, half } = wheelGeometry();
    const dx = x - cx, dy = y - cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist <= outer && dist >= inner) return 'ring';
    if (Math.abs(dx) <= half && Math.abs(dy) <= half) return 'sv';
    return null;
  }

  function wheelApplyFromPoint(x, y, region){
    const { cx, cy, half } = wheelGeometry();
    if (region === 'ring'){
      let ang = Math.atan2(y - cy, x - cx) * 180 / Math.PI;
      let hue = (ang + 90 + 360) % 360;
      wheelH = hue;
      if (wheelS < 0.05) wheelS = 0.85;
      if (wheelV < 0.05) wheelV = 0.95;
    } else {
      const s = Math.max(0, Math.min(1, (x - (cx - half)) / (half*2)));
      const v = Math.max(0, Math.min(1, 1 - (y - (cy - half)) / (half*2)));
      wheelS = s; wheelV = v;
    }
    const rgb = hsvToRgb(wheelH/360, wheelS, wheelV);
    setColor(rgbToHex(rgb[0], rgb[1], rgb[2]), true);
  }

  wheelCanvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    const p = wheelPointerPos(e);
    const region = wheelHitTest(p.x, p.y);
    if (!region) return;
    wheelDragging = region;
    wheelApplyFromPoint(p.x, p.y, region);
    try { wheelCanvas.setPointerCapture(e.pointerId); } catch(_) {}
  });

  wheelCanvas.addEventListener('pointermove', e => {
    if (!wheelDragging) return;
    e.preventDefault();
    const p = wheelPointerPos(e);
    wheelApplyFromPoint(p.x, p.y, wheelDragging);
  });

  function wheelRelease(){
    if (!wheelDragging) return;
    wheelDragging = null;
    pushRecent(currentColor);
  }
  wheelCanvas.addEventListener('pointerup', wheelRelease);
  wheelCanvas.addEventListener('pointercancel', wheelRelease);
  wheelCanvas.addEventListener('pointerleave', () => { if (wheelDragging) wheelRelease(); });

  /* =============================================================
     HARMONY
  ============================================================= */
  function renderHarmonyStrip(){
    harmonyStrip.innerHTML = '';
    if (harmonyScheme === 'free' || !SCHEMES[harmonyScheme]) return;
    const scheme = SCHEMES[harmonyScheme];

    scheme.offsets.forEach((o, idx) => {
      const hue = (wheelH + o + 360) % 360;
      const rgb = hsvToRgb(hue/360, Math.max(wheelS, 0.55), Math.max(wheelV, 0.6));
      const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);

      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'harmony-chip';
      chip.innerHTML = '<span class="dot" style="background:' + hex + '"></span>' + hex.toUpperCase();
      chip.title = 'Hue ' + Math.round(hue) + '° — click to use';
      chip.addEventListener('click', () => {
        const full = hsvToRgb(hue/360, wheelS, wheelV);
        setColor(rgbToHex(full[0], full[1], full[2]), true);
        pushRecent(currentColor);
        showToast('Applied harmony color ' + rgbToHex(full[0],full[1],full[2]).toUpperCase(), 'fa-palette');
      });
      harmonyStrip.appendChild(chip);
    });
  }

  harmonySelect.addEventListener('change', () => {
    harmonyScheme = harmonySelect.value;
    renderWheel();
    renderHarmonyStrip();
    if (harmonyScheme !== 'free'){
      showToast(SCHEMES[harmonyScheme].name + ' harmony guide enabled', 'fa-circle-nodes');
    }
  });

  /* =============================================================
     COLOR SETTING
  ============================================================= */
  function setColor(hex, fromWheel){
    if (!isValidHex(hex)) return;
    hex = normalizeHex(hex);
    currentColor = hex;

    colorInput.value = hex;
    colorSwatchLg.style.background = hex;
    colorHexInput.value = hex.toUpperCase();

    if (!fromWheel){
      const [r,g,b] = hexToRgb(hex);
      const hsv = rgbToHsv(r,g,b);
      if (hsv[1] > 0.02) wheelH = hsv[0];
      wheelS = hsv[1];
      wheelV = hsv[2];
    }

    paletteEl.querySelectorAll('.swatch').forEach(sw => {
      sw.classList.toggle('active', sw.dataset.color.toLowerCase() === hex);
    });

    renderWheel();
    renderHarmonyStrip();
  }

  function pushRecent(hex){
    hex = normalizeHex(hex);
    const i = recentColors.indexOf(hex);
    if (i !== -1) recentColors.splice(i,1);
    recentColors.unshift(hex);
    if (recentColors.length > 10) recentColors.pop();
    renderRecent();
  }

  function renderRecent(){
    recentRow.innerHTML = '';
    for (let i = 0; i < 10; i++){
      const hex = recentColors[i];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'recent-swatch';
      if (hex){
        btn.style.background = hex;
        btn.title = hex.toUpperCase();
        btn.addEventListener('click', () => { setColor(hex,false); pushRecent(hex); });
      } else {
        btn.style.background = 'rgba(255,255,255,.035)';
        btn.style.cursor = 'default';
        btn.disabled = true;
      }
      recentRow.appendChild(btn);
    }
  }

  PALETTE.forEach(color => {
    const sw = document.createElement('button');
    sw.className = 'swatch';
    sw.style.background = color;
    sw.dataset.color = color;
    sw.title = color.toUpperCase();
    sw.type = 'button';
    sw.addEventListener('click', () => { setColor(color,false); pushRecent(color); });
    paletteEl.appendChild(sw);
  });

  colorInput.addEventListener('input', () => { setColor(colorInput.value, false); });
  colorInput.addEventListener('change', () => pushRecent(colorInput.value));

  colorHexInput.addEventListener('change', () => {
    const v = colorHexInput.value.trim();
    if (isValidHex(v)){ setColor(v, false); pushRecent(v); }
    else { colorHexInput.value = currentColor.toUpperCase(); showToast('Invalid hex code', 'fa-triangle-exclamation'); }
  });
  colorHexInput.addEventListener('keydown', e => { if (e.key === 'Enter') colorHexInput.blur(); });

  /* =============================================================
     TOOL SELECTION
  ============================================================= */
  function setTool(tool){
    currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });

    if (tool === 'select'){
      selectionPanel.style.display = 'flex';
      paintCanvas.style.cursor = 'crosshair';
      brushCursor.style.display = 'none';
    } else {
      selectionPanel.style.display = 'none';
      if (tool === 'brush' || tool === 'eraser'){
        paintCanvas.style.cursor = 'none';
      } else {
        paintCanvas.style.cursor = 'crosshair';
      }
    }
  }

  /* =============================================================
     IMAGE LOADING
  ============================================================= */
  function handleFiles(files){
    if (!files || !files.length) return;
    const file = files[0];
    if (!file.type.startsWith('image/')){
      showToast('Please choose an image file.', 'fa-triangle-exclamation');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => setupCanvas(img);
      img.onerror = () => showToast('Could not load that image.', 'fa-triangle-exclamation');
      img.src = ev.target.result;
    };
    reader.onerror = () => showToast('Could not read that file.', 'fa-triangle-exclamation');
    reader.readAsDataURL(file);
  }

  function setupCanvas(img){
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;

    if (w > MAX_DIM || h > MAX_DIM){
      const scale = MAX_DIM / Math.max(w,h);
      w = Math.round(w*scale);
      h = Math.round(h*scale);
    }
    w = Math.max(64, Math.round(w));
    h = Math.max(64, Math.round(h));

    canvasW = w; canvasH = h;

    lineCanvas.width  = w; lineCanvas.height = h;
    paintCanvas.width = w; paintCanvas.height = h;
    selectionCanvas.width = w; selectionCanvas.height = h;

    lineCtx.clearRect(0,0,w,h);
    lineCtx.fillStyle = '#ffffff';
    lineCtx.fillRect(0,0,w,h);
    lineCtx.drawImage(img, 0, 0, w, h);

    paintCtx.clearRect(0,0,w,h);
    selectionCtx.clearRect(0,0,w,h);

    buildReference();
    resetSelection();

    undoStack.length = 0;
    redoStack.length = 0;
    saveState();

    hasImage = true;
    linesHidden = false;
    lineCanvas.style.opacity = '1';
    toggleLinesBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Lines';

    emptyState.classList.add('hidden');
    canvasStage.style.display = 'block';

    requestAnimationFrame(() => {
      resizeStage();
      setTool('brush');
    });

    showToast('Line art loaded — start painting!', 'fa-circle-check');
  }

  function buildReference(){
    const off = document.createElement('canvas');
    off.width = canvasW; off.height = canvasH;
    const ctx = off.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,canvasW,canvasH);
    ctx.drawImage(lineCanvas, 0, 0);
    refImageData = ctx.getImageData(0,0,canvasW,canvasH);
  }

  /* =============================================================
     STAGE SIZING
  ============================================================= */
  function resizeStage(){
    if (!hasImage) return;
    const areaRect = canvasArea.getBoundingClientRect();
    const availW = Math.max(80, areaRect.width - 56);
    const availH = Math.max(80, areaRect.height - 56);
    const scale = Math.min(availW / canvasW, availH / canvasH, 1);
    const dispW = Math.max(60, Math.floor(canvasW * scale));
    const dispH = Math.max(60, Math.floor(canvasH * scale));
    canvasStage.style.width  = dispW + 'px';
    canvasStage.style.height = dispH + 'px';
  }

  window.addEventListener('resize', () => { if (hasImage) resizeStage(); });
  if (window.ResizeObserver){
    const ro = new ResizeObserver(() => { if (hasImage) resizeStage(); });
    ro.observe(canvasArea);
  }

  /* =============================================================
     COORDINATES
  ============================================================= */
  function getCanvasPoint(e){
    const rect = paintCanvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const scaleX = canvasW / rect.width;
    const scaleY = canvasH / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    if (x < 0 || y < 0 || x > canvasW || y > canvasH) return null;
    return { x, y };
  }

  /* =============================================================
     SELECTION
  ============================================================= */
  function resetSelection(){
    selectionMask = new ImageData(canvasW, canvasH);
    selectionMask.data.fill(0);
    selMaskCanvas.width = canvasW;
    selMaskCanvas.height = canvasH;
    selMaskCtx.putImageData(selectionMask, 0, 0);
    selActive = false;
    selEdges = null;
    edgeCacheCanvas = null;
    selectionCtx.clearRect(0,0,canvasW,canvasH);
    updateSelectionUI();
  }

  function clearSelectionData(){
    if (!selectionMask) return;
    selectionMask.data.fill(0);
  }

  function hasAnySelectedPixel(){
    if (!selectionMask) return false;
    const data = selectionMask.data;
    for (let i = 3; i < data.length; i += 4*8){
      if (data[i] > 0) return true;
    }
    return false;
  }

  function refreshSelection(full){
    if (!selectionMask) return;
    selMaskCtx.putImageData(selectionMask, 0, 0);
    selActive = hasAnySelectedPixel();
    if (full) computeSelectionEdges();
    renderSelection();
    updateSelectionUI();
  }

  function computeSelectionEdges(){
    const w = canvasW, h = canvasH;
    if (w < 1 || h < 1){ selEdges = null; edgeCacheCanvas = null; return; }

    const data = selectionMask.data;
    const edges = [];

    for (let y = 0; y < h; y++){
      const rowBase = y*w;
      for (let x = 0; x < w; x++){
        const idx = (rowBase + x)*4 + 3;
        if (data[idx] === 0) continue;
        const leftEmpty  = x === 0     || data[(rowBase + x - 1)*4 + 3] === 0;
        const rightEmpty = x === w - 1 || data[(rowBase + x + 1)*4 + 3] === 0;
        const topEmpty   = y === 0     || data[((y-1)*w + x)*4 + 3] === 0;
        const bottomEmpty= y === h - 1 || data[((y+1)*w + x)*4 + 3] === 0;
        if (leftEmpty || rightEmpty || topEmpty || bottomEmpty){
          edges.push(x, y);
          if (edges.length > MAX_EDGES*2) break;
        }
      }
      if (edges.length > MAX_EDGES*2) break;
    }

    selEdges = new Int32Array(edges);

    if (!edgeCacheCanvas) edgeCacheCanvas = document.createElement('canvas');
    edgeCacheCanvas.width = w;
    edgeCacheCanvas.height = h;
    const ectx = edgeCacheCanvas.getContext('2d');
    ectx.clearRect(0,0,w,h);
    if (selEdges.length === 0) return;

    ectx.fillStyle = 'rgba(0,0,0,.78)';
    for (let i = 0; i < selEdges.length; i += 2){
      ectx.fillRect(selEdges[i]-1, selEdges[i+1]-1, 3, 3);
    }
    ectx.fillStyle = '#ffffff';
    for (let i = 0; i < selEdges.length; i += 2){
      ectx.fillRect(selEdges[i], selEdges[i+1], 1, 1);
    }
  }

  function renderSelection(){
    selectionCtx.clearRect(0,0,canvasW,canvasH);
    if (!selActive) return;
    selectionCtx.drawImage(selMaskCanvas, 0, 0);
    selectionCtx.globalCompositeOperation = 'source-in';
    selectionCtx.fillStyle = 'rgba(124,108,240,.28)';
    selectionCtx.fillRect(0,0,canvasW,canvasH);
    selectionCtx.globalCompositeOperation = 'source-over';
    if (edgeCacheCanvas) selectionCtx.drawImage(edgeCacheCanvas, 0, 0);
  }

  function updateSelectionUI(){
    if (selActive){
      selActivePill.style.display = 'flex';
      deselectBtn.style.borderColor = 'var(--accent)';
      deselectBtn.style.color = '#fff';
      deselectBtn.style.background = 'var(--accent-soft)';
    } else {
      selActivePill.style.display = 'none';
      deselectBtn.style.borderColor = '';
      deselectBtn.style.color = '';
      deselectBtn.style.background = '';
    }
  }

  function deselect(){
    if (!selectionMask || !selActive){ 
      if (selectionMask){ clearSelectionData(); refreshSelection(true); }
      return; 
    }
    clearSelectionData();
    refreshSelection(true);
    showToast('Selection cleared', 'fa-xmark');
  }

  function growSelection(seedX, seedY){
    if (!refImageData) return false;
    const sx = Math.floor(seedX);
    const sy = Math.floor(seedY);
    if (sx < 0 || sy < 0 || sx >= canvasW || sy >= canvasH) return false;

    const w = canvasW, h = canvasH;
    const ref = refImageData.data;
    const startIdx = (sy*w + sx)*4;
    const sR = ref[startIdx], sG = ref[startIdx+1], sB = ref[startIdx+2];

    if (luminance(sR,sG,sB) < LINE_LUM) return false;

    const tolSum = selThreshold * 3;
    const visited = new Uint8Array(w*h);
    const stack = new Int32Array(w*h);
    let sp = 0;
    stack[sp++] = sy*w + sx;
    const result = [];

    while (sp > 0){
      const idx = stack[--sp];
      if (visited[idx]) continue;
      visited[idx] = 1;

      const ri = idx*4;
      const r = ref[ri], g = ref[ri+1], b = ref[ri+2];
      if (luminance(r,g,b) < LINE_LUM) continue;
      const diff = Math.abs(r-sR) + Math.abs(g-sG) + Math.abs(b-sB);
      if (diff > tolSum) continue;

      result.push(idx);
      const x = idx % w;
      const y = (idx / w) | 0;
      if (x > 0)     stack[sp++] = idx - 1;
      if (x < w - 1) stack[sp++] = idx + 1;
      if (y > 0)     stack[sp++] = idx - w;
      if (y < h - 1) stack[sp++] = idx + w;
    }

    if (result.length === 0) return false;

    const maskData = selectionMask.data;
    const subtract = selMode === 'subtract';

    for (let i = 0; i < result.length; i++){
      const mi = result[i]*4;
      if (subtract){
        maskData[mi] = 0; maskData[mi+1] = 0; maskData[mi+2] = 0; maskData[mi+3] = 0;
      } else {
        maskData[mi] = 255; maskData[mi+1] = 255; maskData[mi+2] = 255; maskData[mi+3] = 255;
      }
    }
    return true;
  }

  function handleSelectStart(x, y){
    if (!hasImage) return;
    if (!selectionMask) resetSelection();
    if (selMode === 'new') clearSelectionData();
    isSelecting = true;
    lastSelX = x; lastSelY = y;
    growSelection(x, y);
    refreshSelection(false);
  }

  function handleSelectMove(x, y){
    if (!isSelecting) return;
    const dx = x - lastSelX, dy = y - lastSelY;
    if (dx*dx + dy*dy < 16) return;
    lastSelX = x; lastSelY = y;
    growSelection(x, y);
    refreshSelection(false);
  }

  function handleSelectEnd(){
    if (!isSelecting) return;
    isSelecting = false;
    refreshSelection(true);
  }

  /* =============================================================
     BRUSH ENGINE
  ============================================================= */
  function shapeStyle(ctx, color, alpha){
    if (brushType === 'square'){
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
    } else if (brushType === 'marker'){
      ctx.lineCap = 'square';
      ctx.lineJoin = 'round';
    } else {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
  }

  function applyBrushStyle(ctx){
    if (currentTool === 'eraser'){
      ctx.globalCompositeOperation = 'destination-out';
      shapeStyle(ctx, '#000', brushOpacity);
    } else {
      ctx.globalCompositeOperation = 'source-over';
      shapeStyle(ctx, currentColor, brushOpacity);
    }
  }

  function strokeShape(ctx, x0, y0, x1, y1){
    if (brushType === 'spray'){
      const dist = Math.sqrt((x1-x0)*(x1-x0) + (y1-y0)*(y1-y0));
      const steps = Math.max(1, Math.ceil(dist / 1.6));
      const radius = brushSize / 2;
      const perStep = Math.max(4, Math.round(brushSize * 0.75));
      const dotR = Math.max(0.55, brushSize * 0.035);
      ctx.beginPath();
      for (let i = 0; i <= steps; i++){
        const t = steps === 0 ? 0 : i/steps;
        const px = x0 + (x1-x0)*t;
        const py = y0 + (y1-y0)*t;
        for (let j = 0; j < perStep; j++){
          const a = Math.random() * Math.PI * 2;
          const rr = Math.sqrt(Math.random()) * radius;
          const dx = px + Math.cos(a)*rr;
          const dy = py + Math.sin(a)*rr;
          ctx.moveTo(dx + dotR, dy);
          ctx.arc(dx, dy, dotR, 0, Math.PI*2);
        }
      }
      ctx.fill();
      return;
    }

    if (x0 === x1 && y0 === y1){
      ctx.beginPath();
      if (brushType === 'square'){
        const h = brushSize/2;
        ctx.rect(x0-h, y0-h, brushSize, brushSize);
      } else {
        ctx.arc(x0, y0, Math.max(0.5, brushSize/2), 0, Math.PI*2);
      }
      ctx.fill();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  function paintSegment(x0, y0, x1, y1){
    if (!selActive){
      paintCtx.save();
      applyBrushStyle(paintCtx);
      strokeShape(paintCtx, x0, y0, x1, y1);
      paintCtx.restore();
      return;
    }

    const pad = brushSize*2 + 8;
    const minX = Math.max(0, Math.floor(Math.min(x0,x1) - pad));
    const maxX = Math.min(canvasW, Math.ceil(Math.max(x0,x1) + pad));
    const minY = Math.max(0, Math.floor(Math.min(y0,y1) - pad));
    const maxY = Math.min(canvasH, Math.ceil(Math.max(y0,y1) + pad));

    const segW = maxX - minX;
    const segH = maxY - minY;
    if (segW <= 0 || segH <= 0) return;

    if (tempCanvas.width < segW) tempCanvas.width = segW;
    if (tempCanvas.height < segH) tempCanvas.height = segH;

    tempCtx.setTransform(1,0,0,1,0,0);
    tempCtx.globalCompositeOperation = 'source-over';
    tempCtx.globalAlpha = 1;
    tempCtx.clearRect(0, 0, segW, segH);

    shapeStyle(tempCtx, '#000', 1);
    strokeShape(tempCtx, x0-minX, y0-minY, x1-minX, y1-minY);

    tempCtx.globalCompositeOperation = 'destination-in';
    tempCtx.drawImage(selMaskCanvas, minX, minY, segW, segH, 0, 0, segW, segH);
    tempCtx.globalCompositeOperation = 'source-over';

    if (currentTool === 'eraser'){
      paintCtx.save();
      paintCtx.globalCompositeOperation = 'destination-out';
      paintCtx.drawImage(tempCanvas, 0, 0, segW, segH, minX, minY, segW, segH);
      paintCtx.restore();
    } else {
      tempCtx.globalCompositeOperation = 'source-in';
      tempCtx.globalAlpha = brushOpacity;
      tempCtx.fillStyle = currentColor;
      tempCtx.fillRect(0, 0, segW, segH);
      tempCtx.globalAlpha = 1;
      tempCtx.globalCompositeOperation = 'source-over';
      paintCtx.drawImage(tempCanvas, 0, 0, segW, segH, minX, minY, segW, segH);
    }
  }

  function drawBrushSegment(x0, y0, x1, y1){
    const pairs = [[x0,y0,x1,y1]];
    if (symmetry === 'vertical' || symmetry === 'quad'){
      pairs.push([canvasW - x0, y0, canvasW - x1, y1]);
    }
    if (symmetry === 'horizontal' || symmetry === 'quad'){
      pairs.push([x0, canvasH - y0, x1, canvasH - y1]);
    }
    if (symmetry === 'quad'){
      pairs.push([canvasW - x0, canvasH - y0, canvasW - x1, canvasH - y1]);
    }
    for (let i = 0; i < pairs.length; i++){
      paintSegment(pairs[i][0], pairs[i][1], pairs[i][2], pairs[i][3]);
    }
  }

  /* =============================================================
     STROKE HANDLING
  ============================================================= */
  function startStroke(e){
    if (!hasImage) return;
    const pt = getCanvasPoint(e);
    if (!pt) return;
    e.preventDefault();

    if (currentTool === 'select'){ handleSelectStart(pt.x, pt.y); return; }

    if (currentTool === 'fill'){
      floodFill(Math.floor(pt.x), Math.floor(pt.y));
      saveState();
      return;
    }

    if (currentTool === 'picker'){
      pickColor(Math.floor(pt.x), Math.floor(pt.y));
      return;
    }

    isDrawing = true;
    lastX = pt.x;
    lastY = pt.y;
    drawBrushSegment(pt.x, pt.y, pt.x, pt.y);

    if (paintCanvas.setPointerCapture){
      try { paintCanvas.setPointerCapture(e.pointerId); } catch(_) {}
    }
  }

  function moveStroke(e){
    if (isSelecting){
      const pt = getCanvasPoint(e);
      if (!pt) return;
      handleSelectMove(pt.x, pt.y);
      return;
    }
    if (!isDrawing) return;
    const pt = getCanvasPoint(e);
    if (!pt) return;
    drawBrushSegment(lastX, lastY, pt.x, pt.y);
    lastX = pt.x;
    lastY = pt.y;
  }

  function endStroke(){
    if (isSelecting){ handleSelectEnd(); return; }
    if (!isDrawing) return;
    isDrawing = false;
    saveState();
  }

  /* =============================================================
     FLOOD FILL
  ============================================================= */
  function floodFill(sx, sy){
    if (sx < 0 || sy < 0 || sx >= canvasW || sy >= canvasH) return;
    if (!refImageData) return;

    const w = canvasW, h = canvasH;
    const ref = refImageData.data;
    const startIdx = (sy*w + sx)*4;
    const sR = ref[startIdx], sG = ref[startIdx+1], sB = ref[startIdx+2];

    if (luminance(sR,sG,sB) < LINE_LUM){
      showToast('Click inside a region, not on a line.', 'fa-circle-info');
      return;
    }

    if (selActive && selectionMask.data[(sy*w + sx)*4 + 3] === 0){
      showToast('Click inside the active selection.', 'fa-circle-info');
      return;
    }

    const paintImage = paintCtx.getImageData(0, 0, w, h);
    const pd = paintImage.data;
    const rgb = hexToRgb(currentColor);
    const fr = rgb[0], fg = rgb[1], fb = rgb[2];
    const alpha = Math.round(brushOpacity * 255);

    const visited = new Uint8Array(w*h);
    const stack = [[sx, sy]];
    const tolSum = fillTolerance * 3;
    const maskData = selActive ? selectionMask.data : null;

    function fillable(x, y){
      const idx = (y*w + x)*4;
      const r = ref[idx], g = ref[idx+1], b = ref[idx+2];
      if (luminance(r,g,b) < LINE_LUM) return false;
      const diff = Math.abs(r-sR) + Math.abs(g-sG) + Math.abs(b-sB);
      if (diff > tolSum) return false;
      if (maskData && maskData[idx+3] === 0) return false;
      return true;
    }

    const MAX_FILL = w*h;
    let filled = 0;

    while (stack.length){
      const point = stack.pop();
      const x = point[0], y = point[1];
      const idx0 = y*w + x;
      if (visited[idx0] || !fillable(x,y)) continue;

      let x1 = x;
      while (x1 > 0 && !visited[y*w + x1 - 1] && fillable(x1-1, y)) x1--;
      let x2 = x;
      while (x2 < w-1 && !visited[y*w + x2 + 1] && fillable(x2+1, y)) x2++;

      for (let i = x1; i <= x2; i++){
        const curIdx = y*w + i;
        visited[curIdx] = 1;
        const di = curIdx*4;
        pd[di] = fr; pd[di+1] = fg; pd[di+2] = fb; pd[di+3] = alpha;
        filled++;
        if (filled > MAX_FILL) break;
      }

      scanSpans(x1, x2, y-1, stack, visited, fillable, w, h);
      scanSpans(x1, x2, y+1, stack, visited, fillable, w, h);
      if (filled > MAX_FILL) break;
    }

    paintCtx.putImageData(paintImage, 0, 0);
  }

  function scanSpans(x1, x2, y, stack, visited, fillable, w, h){
    if (y < 0 || y >= h) return;
    let inSpan = false;
    for (let x = x1; x <= x2; x++){
      const idx = y*w + x;
      const ok = !visited[idx] && fillable(x, y);
      if (ok && !inSpan){ stack.push([x, y]); inSpan = true; }
      else if (!ok){ inSpan = false; }
    }
  }

  /* =============================================================
     COLOR PICKER
  ============================================================= */
  function pickColor(x, y){
    if (x < 0 || y < 0 || x >= canvasW || y >= canvasH) return;

    const off = document.createElement('canvas');
    off.width = 1; off.height = 1;
    const ctx = off.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,1,1);
    ctx.drawImage(lineCanvas, x, y, 1, 1, 0, 0, 1, 1);
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(paintCanvas, x, y, 1, 1, 0, 0, 1, 1);
    ctx.globalCompositeOperation = 'source-over';

    const data = ctx.getImageData(0,0,1,1).data;
    const hex = rgbToHex(data[0], data[1], data[2]);
    setColor(hex, false);
    pushRecent(hex);
    setTool('brush');
    showToast('Picked ' + hex.toUpperCase(), 'fa-eye-dropper');
  }

  /* =============================================================
     HISTORY
  ============================================================= */
  function saveState(){
    if (!hasImage) return;
    const snap = paintCtx.getImageData(0,0,canvasW,canvasH);
    undoStack.push(snap);
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack.length = 0;
    updateHistoryButtons();
  }

  function undo(){
    if (!hasImage) return;
    if (undoStack.length <= 1) return;
    const current = undoStack.pop();
    redoStack.push(current);
    const prev = undoStack[undoStack.length - 1];
    paintCtx.putImageData(prev, 0, 0);
    updateHistoryButtons();
  }

  function redo(){
    if (!hasImage) return;
    if (redoStack.length === 0) return;
    const next = redoStack.pop();
    undoStack.push(next);
    paintCtx.putImageData(next, 0, 0);
    updateHistoryButtons();
  }

  function updateHistoryButtons(){
    undoBtn.disabled = undoStack.length <= 1;
    redoBtn.disabled = redoStack.length === 0;
  }

  /* =============================================================
     CLEAR / TOGGLE / EXPORT
  ============================================================= */
  function clearPaint(){
    if (!hasImage) return;
    if (!confirm('Clear all paint on this canvas?')) return;
    paintCtx.clearRect(0,0,canvasW,canvasH);
    saveState();
    showToast('Canvas cleared', 'fa-broom');
  }

  function toggleLines(){
    if (!hasImage) return;
    linesHidden = !linesHidden;
    lineCanvas.style.opacity = linesHidden ? '0' : '1';
    toggleLinesBtn.innerHTML = linesHidden
      ? '<i class="fas fa-eye"></i> Lines'
      : '<i class="fas fa-eye-slash"></i> Lines';
  }

  function compositeExport(){
    const off = document.createElement('canvas');
    off.width = canvasW; off.height = canvasH;
    const ctx = off.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,canvasW,canvasH);
    ctx.drawImage(lineCanvas, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(paintCanvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    return off;
  }

  function download(){
    if (!hasImage){
      showToast('Upload line art first.', 'fa-circle-info');
      return;
    }
    const off = compositeExport();
    off.toBlob(blob => {
      if (!blob){ showToast('Export failed, please try again.', 'fa-triangle-exclamation'); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'helaberry-painting-' + Date.now() + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1200);
      showToast('Artwork exported as PNG', 'fa-circle-check');
    }, 'image/png');
  }

  /* =============================================================
     BRUSH CURSOR
  ============================================================= */
  function updateBrushCursor(e){
    if (!hasImage){ brushCursor.style.display = 'none'; return; }
    if (currentTool !== 'brush' && currentTool !== 'eraser'){
      brushCursor.style.display = 'none';
      return;
    }
    const rect = paintCanvas.getBoundingClientRect();
    const inside = e.clientX >= rect.left && e.clientX <= rect.right &&
                   e.clientY >= rect.top  && e.clientY <= rect.bottom;
    if (!inside){ brushCursor.style.display = 'none'; return; }

    const scale = rect.width / canvasW;
    const displaySize = Math.max(6, brushSize * scale);

    brushCursor.style.display = 'block';
    brushCursor.style.width  = displaySize + 'px';
    brushCursor.style.height = displaySize + 'px';
    brushCursor.style.left   = e.clientX + 'px';
    brushCursor.style.top    = e.clientY + 'px';

    if (brushType === 'square' || brushType === 'marker'){
      brushCursor.style.borderRadius = '4px';
    } else {
      brushCursor.style.borderRadius = '50%';
    }

    if (currentTool === 'eraser'){
      brushCursor.style.borderColor = '#ffffff';
      brushCursor.style.background = 'rgba(255,255,255,.10)';
    } else {
      brushCursor.style.borderColor = currentColor;
      brushCursor.style.background = 'transparent';
    }
  }

  /* =============================================================
     COLOR THEORY ANALYSIS
  ============================================================= */
  function schemeFit(hist, offsets){
    let best = 0;
    for (let base = 0; base < 360; base += 3){
      let sum = 0;
      for (let i = 0; i < 12; i++){
        if (!hist[i]) continue;
        const h = i*30 + 15;
        let dmin = 360;
        for (let k = 0; k < offsets.length; k++){
          const d = circDist(h, (base + offsets[k] + 360) % 360);
          if (d < dmin) dmin = d;
        }
        sum += hist[i] * Math.exp(-Math.pow(dmin / 22, 2));
      }
      if (sum > best) best = sum;
    }
    const total = hist.reduce((a,b)=>a+b, 0);
    return total > 0 ? best / total : 0;
  }

  function gradeFor(score){
    if (score >= 92) return { grade:'S',  color:'#22d3ee', label:'Masterful' };
    if (score >= 84) return { grade:'A+', color:'#4ade80', label:'Excellent' };
    if (score >= 76) return { grade:'A',  color:'#4ade80', label:'Great' };
    if (score >= 68) return { grade:'B+', color:'#a3e635', label:'Good' };
    if (score >= 60) return { grade:'B',  color:'#facc15', label:'Solid' };
    if (score >= 50) return { grade:'C',  color:'#fb923c', label:'Developing' };
    if (score >= 38) return { grade:'D',  color:'#f87171', label:'Needs work' };
    return { grade:'E', color:'#ef4444', label:'Chaotic' };
  }

  function analyzeArtwork(){
    if (!hasImage){ showToast('Upload line art and paint something first.', 'fa-circle-info'); return; }

    const off = compositeExport();
    const ctx = off.getContext('2d', { willReadFrequently: true });
    const w = canvasW, h = canvasH;
    const data = ctx.getImageData(0, 0, w, h).data;

    const step = (w*h > 700000) ? 2 : 1;

    const buckets = new Map();
    const hueHist = new Array(12).fill(0);
    let hueWeight = 0;
    let satSum = 0, satSq = 0, satN = 0;
    let lumSum = 0, lumSq = 0, lumN = 0;
    let warm = 0, cool = 0, neutral = 0;
    let painted = 0;

    for (let y = 0; y < h; y += step){
      const row = y*w;
      for (let x = 0; x < w; x += step){
        const i = (row + x)*4;
        const r = data[i], g = data[i+1], b = data[i+2];
        const mx = Math.max(r,g,b), mn = Math.min(r,g,b);
        const lum = 0.299*r + 0.587*g + 0.114*b;
        const sat = mx === 0 ? 0 : (mx - mn)/mx;

        if (lum > 246 && sat < 0.05) continue;
        if (lum < 78 && sat < 0.28) continue;

        painted++;

        const qr = Math.min(7, r >> 5);
        const qg = Math.min(7, g >> 5);
        const qb = Math.min(7, b >> 5);
        const key = (qr << 6) | (qg << 3) | qb;
        const cur = buckets.get(key);
        if (cur){ cur.n++; cur.r += r; cur.g += g; cur.b += b; }
        else buckets.set(key, { n:1, r, g, b });

        if (sat > 0.14 && lum > 26 && lum < 246){
          const hue = rgbToHue(r,g,b);
          const bin = Math.floor(hue/30) % 12;
          hueHist[bin]++;
          hueWeight++;
          if (hue < 70 || hue > 300) warm++;
          else if (hue > 140 && hue < 280) cool++;
          else neutral++;
        } else {
          neutral++;
        }

        satSum += sat; satSq += sat*sat; satN++;
        lumSum += lum; lumSq += lum*lum; lumN++;
      }
    }

    if (painted < 80){
      showToast('Not enough painted area to analyze.', 'fa-triangle-exclamation');
      return;
    }

    let list = [];
    buckets.forEach(b => {
      list.push({
        n: b.n,
        r: Math.round(b.r/b.n),
        g: Math.round(b.g/b.n),
        b: Math.round(b.b/b.n)
      });
    });
    list.sort((a,b) => b.n - a.n);

    const merged = [];
    for (let i = 0; i < list.length; i++){
      const c = list[i];
      let found = false;
      for (let j = 0; j < merged.length; j++){
        const m = merged[j];
        const d = Math.abs(m.r-c.r) + Math.abs(m.g-c.g) + Math.abs(m.b-c.b);
        if (d < 72){
          const tot = m.n + c.n;
          m.r = Math.round((m.r*m.n + c.r*c.n)/tot);
          m.g = Math.round((m.g*m.n + c.g*c.n)/tot);
          m.b = Math.round((m.b*m.n + c.b*c.n)/tot);
          m.n = tot;
          found = true;
          break;
        }
      }
      if (!found) merged.push({ n:c.n, r:c.r, g:c.g, b:c.b });
      if (merged.length > 60) break;
    }
    merged.sort((a,b) => b.n - a.n);

    const dominant = merged.slice(0, 6).map(c => {
      const hex = rgbToHex(c.r, c.g, c.b);
      const hsv = rgbToHsv(c.r, c.g, c.b);
      return {
        hex, n: c.n, pct: (c.n / painted) * 100,
        hue: hsv[0], sat: hsv[1], val: hsv[2]
      };
    });

    let bestScheme = null, bestFit = -1;
    const schemeOrder = ['monochromatic','analogous','complementary','splitComplementary','triadic','tetradic','square'];
    for (let i = 0; i < schemeOrder.length; i++){
      const key = schemeOrder[i];
      const fit = schemeFit(hueHist, SCHEMES[key].offsets);
      if (fit > bestFit + 0.0005){
        bestFit = fit;
        bestScheme = key;
      }
    }
    if (!bestScheme){ bestScheme = 'free'; bestFit = 0.5; }

    const chromaRatio = painted > 0 ? hueWeight / painted : 0;
    const chromaFactor = 0.55 + 0.45 * Math.min(1, chromaRatio / 0.55);
    const harmonyScore = Math.max(0, Math.min(100, bestFit * 100 * chromaFactor));

    const meanSat = satN ? satSum / satN : 0;
    const varSat = satN ? Math.max(0, satSq/satN - meanSat*meanSat) : 0;
    const stdSat = Math.sqrt(varSat);
    let satScore = 100 * Math.exp(-Math.pow((meanSat - 0.45) / 0.32, 2));
    satScore *= (1 - Math.min(0.30, stdSat * 0.60));
    satScore = Math.max(0, Math.min(100, satScore));

    const meanLum = lumN ? lumSum / lumN : 0;
    const varLum = lumN ? Math.max(0, lumSq/lumN - meanLum*meanLum) : 0;
    const stdLum = Math.sqrt(varLum);
    const contrastScore = Math.max(0, Math.min(100, (stdLum / 62) * 100));

    const significant = merged.filter(c => (c.n / painted) >= 0.02).length;
    const focusScore = Math.max(0, Math.min(100, 100 * Math.exp(-Math.pow((significant - 4) / 4.5, 2))));

    const tempTotal = warm + cool;
    const warmRatio = tempTotal > 0 ? warm / tempTotal : 0.5;
    const tempScore = Math.max(0, Math.min(100, 100 * (1 - Math.abs(warmRatio - 0.5) * 1.25)));

    const overall =
        harmonyScore * 0.40 +
        satScore     * 0.15 +
        contrastScore* 0.15 +
        focusScore   * 0.15 +
        tempScore    * 0.15;

    const gradeInfo = gradeFor(overall);

    const suggestions = [];
    if (harmonyScore >= 82){
      suggestions.push({ good:true, icon:'fa-circle-check', text:'Your palette follows a <b>' + SCHEMES[bestScheme].name + '</b> relationship. The hues agree with each other beautifully.' });
    } else if (harmonyScore >= 60){
      suggestions.push({ good:false, icon:'fa-lightbulb', text:'Your hues are loosely related. Nudging a few colours toward a <b>' + SCHEMES[bestScheme].name + '</b> scheme would tighten the harmony.' });
    } else {
      suggestions.push({ good:false, icon:'fa-triangle-exclamation', text:'Your hues are scattered across the wheel with no clear relationship. Try limiting yourself to a <b>Triadic</b> or <b>Analogous</b> scheme.' });
    }

    if (meanSat < 0.22){
      suggestions.push({ good:false, icon:'fa-droplet', text:'The painting reads quite grey (avg saturation ' + Math.round(meanSat*100) + '%). Raising saturation on your focal colours would add life.' });
    } else if (meanSat > 0.78){
      suggestions.push({ good:false, icon:'fa-fire', text:'Saturation is very high everywhere (avg ' + Math.round(meanSat*100) + '%). Reserve your most vivid colour for the focal point — let the rest sit back.' });
    } else {
      suggestions.push({ good:true, icon:'fa-droplet', text:'Saturation balance is comfortable (avg ' + Math.round(meanSat*100) + '%), giving your colours room to breathe.' });
    }

    if (contrastScore < 40){
      suggestions.push({ good:false, icon:'fa-circle-half-stroke', text:'Value contrast is low. Add darker shadows or lighter highlights so shapes separate clearly.' });
    } else if (contrastScore > 85){
      suggestions.push({ good:true, icon:'fa-circle-half-stroke', text:'Excellent light-to-dark range — your forms will read clearly even in grayscale.' });
    }

    if (significant > 8){
      suggestions.push({ good:false, icon:'fa-layer-group', text:'You are using about <b>' + significant + ' distinct colours</b>. Reduce to 4–6 and the piece will feel more intentional.' });
    } else if (significant <= 2){
      suggestions.push({ good:false, icon:'fa-palette', text:'Only ' + significant + ' dominant colour(s) detected. Introduce one accent hue for visual interest.' });
    } else {
      suggestions.push({ good:true, icon:'fa-layer-group', text:'A focused palette of <b>' + significant + '</b> dominant colours — that is right in the sweet spot.' });
    }

    if (Math.abs(warmRatio - 0.5) > 0.32 && tempTotal > 0){
      const dominantTemp = warmRatio > 0.5 ? 'warm' : 'cool';
      const otherTemp = warmRatio > 0.5 ? 'cool' : 'warm';
      suggestions.push({ good:false, icon:'fa-temperature-half', text:'The palette is heavily <b>' + dominantTemp + '</b>. A few ' + otherTemp + ' accents would balance the temperature.' });
    } else if (tempTotal > 0){
      suggestions.push({ good:true, icon:'fa-temperature-half', text:'Warm and cool temperatures are well balanced (' + Math.round(warmRatio*100) + '% warm).' });
    }

    renderAnalysis({
      overall, gradeInfo, harmonyScore, satScore, contrastScore, focusScore, tempScore,
      meanSat, stdSat, stdLum, significant, warmRatio,
      scheme: SCHEMES[bestScheme],
      schemeFit: bestFit,
      dominant, painted, hueHist, suggestions
    });
  }

  function renderAnalysis(r){
    const c = r.gradeInfo.color;
    const pct = Math.round(r.overall);

    let domHTML = '';
    r.dominant.forEach((d, i) => {
      const role = i === 0 ? 'Primary / dominant' :
                   i === 1 ? 'Secondary support' :
                   i === 2 ? 'Accent' : 'Detail tone';
      domHTML +=
        '<div class="dom-item" data-hex="' + d.hex + '">' +
          '<div class="dom-chip" style="background:' + d.hex + '"></div>' +
          '<div class="dom-meta">' +
            '<div class="dom-top">' +
              '<span class="dom-hex">' + d.hex.toUpperCase() + '</span>' +
              '<span class="dom-pct">' + d.pct.toFixed(1) + '%</span>' +
            '</div>' +
            '<div class="dom-bar"><span style="width:0%;background:' + d.hex + '" data-w="' + Math.min(100, d.pct) + '"></span></div>' +
            '<div class="dom-role">' + role + ' · hue ' + Math.round(d.hue) + '° · sat ' + Math.round(d.sat*100) + '%</div>' +
          '</div>' +
        '</div>';
    });

    function metricHTML(label, value, desc, color){
      return '<div class="metric">' +
        '<div class="metric-head">' +
          '<span>' + label + '</span>' +
          '<span class="metric-val" style="color:' + color + '">' + Math.round(value) + '</span>' +
        '</div>' +
        '<div class="metric-bar"><span data-w="' + Math.max(2, Math.min(100, value)) + '" style="background:' + color + '"></span></div>' +
        '<div class="metric-desc">' + desc + '</div>' +
      '</div>';
    }

    const harmonyColor = r.harmonyScore >= 75 ? '#4ade80' : r.harmonyScore >= 55 ? '#facc15' : '#f87171';
    const satColor     = r.satScore >= 75 ? '#4ade80' : r.satScore >= 55 ? '#facc15' : '#f87171';
    const conColor     = r.contrastScore >= 75 ? '#4ade80' : r.contrastScore >= 55 ? '#facc15' : '#f87171';
    const focColor     = r.focusScore >= 75 ? '#4ade80' : r.focusScore >= 55 ? '#facc15' : '#f87171';
    const tmpColor     = r.tempScore >= 75 ? '#4ade80' : r.tempScore >= 55 ? '#facc15' : '#f87171';

    let hueHTML = '';
    for (let i = 0; i < 12; i++){
      const rgb = hsvToRgb((i*30 + 15)/360, 0.85, 0.95);
      const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
      const max = Math.max.apply(null, r.hueHist);
      const dim = r.hueHist[i] === 0 || (max > 0 && r.hueHist[i] / max < 0.14);
      hueHTML += '<div class="hue-seg' + (dim ? ' dim' : '') + '" style="background:' + hex + '" title="' + (i*30) + '°–' + (i*30+30) + '° · ' + r.hueHist[i] + ' px"></div>';
    }

    let sugHTML = '';
    r.suggestions.forEach(s => {
      sugHTML += '<div class="suggest-item' + (s.good ? ' good' : '') + '">' +
        '<i class="fas ' + s.icon + '"></i><span>' + s.text + '</span></div>';
    });

    analysisBody.innerHTML =
      '<div class="an-hero">' +
        '<div class="score-wrap">' +
          '<svg viewBox="0 0 120 120">' +
            '<circle class="ring-bg" cx="60" cy="60" r="52"></circle>' +
            '<circle class="ring-fg" id="scoreRing" cx="60" cy="60" r="52" ' +
              'stroke-dasharray="326.7" stroke-dashoffset="326.7" style="stroke:' + c + '"></circle>' +
          '</svg>' +
          '<div class="score-center">' +
            '<div class="score-num" style="color:' + c + '">' + pct + '</div>' +
            '<div class="score-lbl">OUT OF 100</div>' +
          '</div>' +
        '</div>' +
        '<div class="an-hero-info">' +
          '<div class="grade-badge" style="background:' + c + '22;color:' + c + ';border-color:' + c + '55">' +
            'GRADE ' + r.gradeInfo.grade + ' · ' + r.gradeInfo.label +
          '</div>' +
          '<h4>' + r.scheme.name + ' Harmony Detected</h4>' +
          '<p>' + r.scheme.desc + '</p>' +
          '<div class="an-meta">' + r.painted.toLocaleString() + ' painted pixels analyzed · scheme match ' + Math.round(r.schemeFit*100) + '%</div>' +
        '</div>' +
      '</div>' +

      '<div class="an-section">' +
        '<div class="an-section-title"><i class="fas fa-swatchbook"></i> Dominant Colors</div>' +
        '<div class="dom-list">' + domHTML + '</div>' +
      '</div>' +

      '<div class="an-section">' +
        '<div class="an-section-title"><i class="fas fa-gauge-high"></i> Metric Breakdown</div>' +
        metricHTML('Harmony Fit', r.harmonyScore, 'How closely your hues align with a recognised color-theory relationship.', harmonyColor) +
        metricHTML('Saturation Balance', r.satScore, 'Average saturation ' + Math.round(r.meanSat*100) + '% · variation ' + Math.round(r.stdSat*100) + '%.', satColor) +
        metricHTML('Value Contrast', r.contrastScore, 'Light-to-dark spread (σ = ' + Math.round(r.stdLum) + '). Higher means clearer separation.', conColor) +
        metricHTML('Palette Focus', r.focusScore, r.significant + ' dominant colours detected. 3–6 is the sweet spot.', focColor) +
        metricHTML('Temperature Balance', r.tempScore, Math.round(r.warmRatio*100) + '% warm vs ' + Math.round((1-r.warmRatio)*100) + '% cool.', tmpColor) +
      '</div>' +

      '<div class="an-section">' +
        '<div class="an-section-title"><i class="fas fa-rainbow"></i> Hue Distribution</div>' +
        '<div class="hue-spectrum">' + hueHTML + '</div>' +
        '<div class="hue-axis"><span>0° Red</span><span>120° Green</span><span>240° Blue</span><span>360°</span></div>' +
      '</div>' +

      '<div class="an-section">' +
        '<div class="an-section-title"><i class="fas fa-comment-dots"></i> Suggestions</div>' +
        '<div class="suggest-list">' + sugHTML + '</div>' +
      '</div>' +

      '<div class="an-section" style="margin-bottom:0;">' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
          '<button class="hb-btn hb-btn-gold" id="reanalyzeBtn" style="flex:1;min-width:160px;">' +
            '<i class="fas fa-rotate"></i> Re-analyze' +
          '</button>' +
          '<button class="hb-btn hb-btn-outline" id="closeAnalysisBtn" style="flex:1;min-width:160px;">' +
            '<i class="fas fa-check"></i> Keep Painting' +
          '</button>' +
        '</div>' +
      '</div>';

    requestAnimationFrame(() => {
      const ring = document.getElementById('scoreRing');
      if (ring) ring.style.strokeDashoffset = String(326.7 * (1 - pct/100));

      analysisBody.querySelectorAll('.metric-bar span[data-w]').forEach(el => {
        setTimeout(() => { el.style.width = el.dataset.w + '%'; }, 60);
      });
      analysisBody.querySelectorAll('.dom-bar span[data-w]').forEach(el => {
        setTimeout(() => { el.style.width = el.dataset.w + '%'; }, 90);
      });
    });

    analysisBody.querySelectorAll('.dom-item').forEach(el => {
      el.addEventListener('click', () => {
        const hex = el.dataset.hex;
        setColor(hex, false);
        pushRecent(hex);
        showToast('Applied ' + hex.toUpperCase() + ' to brush', 'fa-palette');
      });
    });

    const reBtn = document.getElementById('reanalyzeBtn');
    if (reBtn) reBtn.addEventListener('click', () => { closeAnalysis(); setTimeout(analyzeArtwork, 220); });

    const clBtn = document.getElementById('closeAnalysisBtn');
    if (clBtn) clBtn.addEventListener('click', closeAnalysis);
  }

  function openAnalysis(){
    analysisModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeAnalysis(){
    analysisModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  analyzeBtn.addEventListener('click', () => { openAnalysis(); analyzeArtwork(); });
  navAnalyzeBtn.addEventListener('click', () => { openAnalysis(); analyzeArtwork(); });
  analysisClose.addEventListener('click', closeAnalysis);
  analysisModal.addEventListener('click', e => { if (e.target === analysisModal) closeAnalysis(); });

  /* =============================================================
     EVENT BINDINGS — CANVAS
  ============================================================= */
  paintCanvas.addEventListener('pointerdown', startStroke);
  window.addEventListener('pointermove', moveStroke);
  window.addEventListener('pointerup', endStroke);
  window.addEventListener('pointercancel', endStroke);

  paintCanvas.addEventListener('pointermove', updateBrushCursor);
  paintCanvas.addEventListener('pointerenter', updateBrushCursor);
  paintCanvas.addEventListener('pointerleave', () => { brushCursor.style.display = 'none'; });
  paintCanvas.addEventListener('contextmenu', e => e.preventDefault());

  /* =============================================================
     EVENT BINDINGS — TOOLS
  ============================================================= */
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => setTool(btn.dataset.tool));
  });

  sizeSlider.addEventListener('input', () => {
    brushSize = parseInt(sizeSlider.value, 10);
    sizeValue.textContent = brushSize;
  });

  opacitySlider.addEventListener('input', () => {
    const v = parseInt(opacitySlider.value, 10);
    brushOpacity = v/100;
    opacityValue.textContent = v + '%';
  });

  fillTolSlider.addEventListener('input', () => {
    fillTolerance = parseInt(fillTolSlider.value, 10);
    fillTolValue.textContent = fillTolerance;
  });

  brushTypeGroup.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      brushType = btn.dataset.brush;
      brushTypeGroup.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b === btn));
      updateBrushCursor({ clientX: -9999, clientY: -9999 });
      showToast('Brush: ' + btn.title, 'fa-paintbrush');
    });
  });

  symmetryGroup.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      symmetry = btn.dataset.sym;
      symmetryGroup.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b === btn));
      if (symmetry !== 'off') showToast('Symmetry: ' + btn.textContent, 'fa-clone');
    });
  });

  /* =============================================================
     EVENT BINDINGS — SELECTION
  ============================================================= */
  selModeGroup.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selMode = btn.dataset.mode;
      selModeGroup.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  thresholdSlider.addEventListener('input', () => {
    selThreshold = parseInt(thresholdSlider.value, 10);
    thresholdValue.textContent = selThreshold;
  });

  deselectBtn.addEventListener('click', deselect);
  pillDeselectBtn.addEventListener('click', deselect);

  /* =============================================================
     EVENT BINDINGS — ACTIONS
  ============================================================= */
  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);
  clearBtn.addEventListener('click', clearPaint);
  toggleLinesBtn.addEventListener('click', toggleLines);
  downloadBtn.addEventListener('click', download);
  navDownloadBtn.addEventListener('click', download);

  /* =============================================================
     EVENT BINDINGS — UPLOAD
  ============================================================= */
  function openFilePicker(){
    fileInput.value = '';
    fileInput.click();
  }

  uploadBtn.addEventListener('click', openFilePicker);
  emptyUploadBtn.addEventListener('click', e => { e.stopPropagation(); openFilePicker(); });
  navUploadBtn.addEventListener('click', openFilePicker);
  dropZone.addEventListener('click', openFilePicker);

  fileInput.addEventListener('change', e => {
    if (e.target.files && e.target.files.length) handleFiles(e.target.files);
  });

  [dropZone, emptyState, canvasArea].forEach(el => {
    el.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      canvasArea.classList.add('drag-over');
    });
    el.addEventListener('dragleave', e => {
      if (e.relatedTarget && el.contains(e.relatedTarget)) return;
      canvasArea.classList.remove('drag-over');
    });
    el.addEventListener('drop', e => {
      e.preventDefault();
      canvasArea.classList.remove('drag-over');
      if (e.dataTransfer.files && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    });
  });

  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', e => e.preventDefault());

  /* =============================================================
     KEYBOARD
  ============================================================= */
  window.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    const key = e.key.toLowerCase();

    if ((e.ctrlKey || e.metaKey) && key === 'z' && !e.shiftKey){ e.preventDefault(); undo(); return; }
    if ((e.ctrlKey || e.metaKey) && (key === 'y' || (key === 'z' && e.shiftKey))){ e.preventDefault(); redo(); return; }
    if ((e.ctrlKey || e.metaKey) && key === 's'){ e.preventDefault(); download(); return; }
    if ((e.ctrlKey || e.metaKey) && key === 'd'){ e.preventDefault(); deselect(); return; }
    if ((e.ctrlKey || e.metaKey) && key === 'e'){ e.preventDefault(); openAnalysis(); analyzeArtwork(); return; }
    if ((e.ctrlKey || e.metaKey) && key === 'h'){ e.preventDefault(); window.location.href = '/homepage'; return; }

    if (e.ctrlKey || e.metaKey || e.altKey) return;

    switch (key){
      case 'b': setTool('brush'); break;
      case 'e': setTool('eraser'); break;
      case 'g': setTool('fill'); break;
      case 'i': setTool('picker'); break;
      case 'w': setTool('select'); break;
      case '1': brushType = 'round';  brushTypeGroup.querySelector('[data-brush="round"]').click(); break;
      case '2': brushType = 'square'; brushTypeGroup.querySelector('[data-brush="square"]').click(); break;
      case '3': brushType = 'marker'; brushTypeGroup.querySelector('[data-brush="marker"]').click(); break;
      case '4': brushType = 'spray';  brushTypeGroup.querySelector('[data-brush="spray"]').click(); break;
      case '[':
        sizeSlider.value = Math.max(1, brushSize - 2);
        sizeSlider.dispatchEvent(new Event('input'));
        break;
      case ']':
        sizeSlider.value = Math.min(140, brushSize + 2);
        sizeSlider.dispatchEvent(new Event('input'));
        break;
      case 'x': toggleLines(); break;
      case 'escape':
        if (analysisModal.classList.contains('open')) closeAnalysis();
        else deselect();
        break;
    }
  });

  /* =============================================================
     INIT
  ============================================================= */
  function init(){
    setColor(currentColor, false);
    setTool('brush');
    updateHistoryButtons();
    renderRecent();
    sizeValue.textContent = brushSize;
    opacityValue.textContent = Math.round(brushOpacity * 100) + '%';
    fillTolValue.textContent = fillTolerance;
    thresholdValue.textContent = selThreshold;
    renderWheel();
    renderHarmonyStrip();
  }

  init();

  console.log('%c🍓 Helaberry · Live Painting Studio + AI', 'color:#a29bfe;font-size:15px;font-weight:700;');
  console.log('%cColor Wheel · Harmony Schemes · Color Theory Analysis · Helaberry AI', 'color:#fbbf24;font-size:12px;');

})();

/* ============================================================================
   PART 2 — HELABERRY AI COLORIZER
   ============================================================================ */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const dom = {
    aiDropzone: $('aiDropzone'),
    aiFileInput: $('aiFileInput'),
    aiInputStage: $('aiInputStage'),
    aiOriginalCanvas: $('aiOriginalCanvas'),
    aiColorCanvas: $('aiColorCanvas'),
    aiDetectionOverlay: $('aiDetectionOverlay'),
    aiEmptyResult: $('aiEmptyResult'),
    aiProcOverlay: $('aiProcOverlay'),
    aiProcText: $('aiProcText'),
    aiProcSub: $('aiProcSub'),
    aiProgressFill: $('aiProgressFill'),
    aiColorizeBtn: $('aiColorizeBtn'),
    aiResetBtn: $('aiResetBtn'),
    aiDownloadBtn: $('aiDownloadBtn'),
    aiToggleDetectionBtn: $('aiToggleDetectionBtn'),
    aiSaturationRange: $('aiSaturationRange'),
    aiSaturationVal: $('aiSaturationVal'),
    aiLineRange: $('aiLineRange'),
    aiLineVal: $('aiLineVal'),
    aiConfidenceRange: $('aiConfidenceRange'),
    aiConfidenceVal: $('aiConfidenceVal'),
    aiSemanticRange: $('aiSemanticRange'),
    aiSemanticVal: $('aiSemanticVal'),
    aiDetectorDot: $('aiDetectorDot'),
    aiDetectorStatus: $('aiDetectorStatus'),
    aiStatusIndicator: $('aiStatusIndicator'),
    aiStatusMsg: $('aiStatusMsg'),
    aiDetectionReport: $('aiDetectionReport'),
    aiReportGrid: $('aiReportGrid'),
    aiReportCount: $('aiReportCount'),
  };

  const aiOrigCtx = dom.aiOriginalCanvas.getContext('2d', { willReadFrequently: true });
  const aiColorCtx = dom.aiColorCanvas.getContext('2d', { willReadFrequently: true });

  const state = {
    detector: null,
    detectorReady: false,
    inputImage: null,
    inputImageData: null,
    resultImageData: null,
    detections: [],
    showDetections: true,
    processing: false,
    hasResult: false,
  };

  const SEMANTIC_COLORS = {
    person:        { base: [255, 219, 172], alt: [[244, 176, 132], [222, 184, 135], [255, 228, 196]] },
    bicycle:       { base: [60, 60, 70],    alt: [[80, 80, 90], [40, 40, 50]] },
    car:           { base: [210, 60, 60],   alt: [[60, 90, 200], [40, 40, 50], [220, 220, 220], [240, 200, 80]] },
    motorcycle:    { base: [40, 40, 45],    alt: [[200, 60, 60], [50, 50, 60]] },
    airplane:      { base: [230, 230, 235], alt: [[200, 210, 220], [180, 190, 200]] },
    bus:           { base: [240, 200, 60],  alt: [[220, 100, 60], [80, 130, 200]] },
    train:         { base: [200, 60, 60],   alt: [[80, 80, 90], [60, 120, 180]] },
    truck:         { base: [60, 100, 180],  alt: [[200, 80, 60], [220, 220, 220]] },
    boat:          { base: [200, 200, 210], alt: [[90, 130, 180], [40, 60, 80]] },
    'traffic light': { base: [50, 50, 55],  alt: [[40, 200, 80], [230, 60, 60], [240, 200, 60]] },
    'fire hydrant':  { base: [220, 60, 50], alt: [[200, 50, 40]] },
    'stop sign':     { base: [220, 60, 50], alt: [[200, 50, 40]] },
    'parking meter': { base: [80, 80, 90],  alt: [[60, 60, 70]] },
    bench:         { base: [140, 100, 60],  alt: [[120, 80, 50], [90, 70, 50]] },
    bird:          { base: [120, 170, 220], alt: [[230, 180, 80], [200, 100, 60], [90, 90, 100]] },
    cat:           { base: [230, 170, 100], alt: [[60, 60, 70], [240, 220, 200], [180, 100, 60]] },
    dog:           { base: [200, 140, 80],  alt: [[80, 60, 50], [240, 220, 190], [230, 180, 100]] },
    horse:         { base: [140, 90, 60],   alt: [[60, 40, 30], [200, 180, 150]] },
    sheep:         { base: [240, 240, 235], alt: [[180, 180, 175], [120, 110, 100]] },
    cow:           { base: [250, 250, 250], alt: [[40, 40, 45], [200, 180, 150]] },
    elephant:      { base: [150, 140, 130], alt: [[120, 110, 100]] },
    bear:          { base: [110, 80, 55],   alt: [[70, 50, 40], [230, 200, 170]] },
    zebra:         { base: [245, 245, 245], alt: [[30, 30, 35]] },
    giraffe:       { base: [230, 190, 110], alt: [[150, 100, 60], [180, 130, 70]] },
    backpack:      { base: [80, 100, 150],  alt: [[120, 60, 60], [60, 60, 70]] },
    umbrella:      { base: [200, 60, 80],   alt: [[60, 80, 160], [220, 180, 60]] },
    handbag:       { base: [140, 80, 60],   alt: [[60, 60, 70], [200, 60, 100]] },
    tie:           { base: [160, 30, 40],   alt: [[40, 60, 130], [30, 30, 40]] },
    suitcase:      { base: [80, 60, 40],    alt: [[60, 60, 70], [120, 90, 60]] },
    frisbee:       { base: [230, 100, 60],  alt: [[60, 160, 220]] },
    skis:          { base: [200, 60, 60],   alt: [[40, 60, 90]] },
    snowboard:     { base: [80, 100, 180],  alt: [[200, 80, 60]] },
    'sports ball': { base: [240, 240, 240], alt: [[230, 120, 60], [60, 160, 90]] },
    kite:          { base: [230, 90, 130],  alt: [[80, 180, 220], [240, 200, 80]] },
    'baseball bat':{ base: [220, 180, 130], alt: [[180, 140, 90]] },
    'baseball glove': { base: [140, 90, 60], alt: [[120, 80, 50]] },
    skateboard:    { base: [80, 60, 40],    alt: [[200, 60, 60]] },
    surfboard:     { base: [240, 230, 200], alt: [[60, 140, 200], [230, 90, 60]] },
    'tennis racket': { base: [200, 80, 80], alt: [[60, 60, 70]] },
    bottle:        { base: [90, 170, 130],  alt: [[60, 140, 200], [200, 90, 90]] },
    'wine glass':  { base: [230, 240, 245], alt: [[180, 60, 90]] },
    cup:           { base: [240, 240, 245], alt: [[200, 90, 60], [90, 130, 180]] },
    fork:          { base: [200, 205, 215], alt: [[160, 165, 175]] },
    knife:         { base: [200, 205, 215], alt: [[160, 165, 175]] },
    spoon:         { base: [200, 205, 215], alt: [[160, 165, 175]] },
    bowl:          { base: [230, 230, 235], alt: [[180, 200, 210]] },
    banana:        { base: [245, 220, 80],  alt: [[220, 200, 60]] },
    apple:         { base: [220, 50, 50],   alt: [[100, 180, 80]] },
    sandwich:      { base: [230, 180, 120], alt: [[200, 100, 80], [120, 180, 90]] },
    orange:        { base: [245, 150, 40],  alt: [[230, 130, 30]] },
    broccoli:      { base: [90, 160, 80],   alt: [[70, 130, 60]] },
    carrot:        { base: [240, 140, 50],  alt: [[220, 120, 40]] },
    'hot dog':     { base: [200, 90, 60],   alt: [[240, 200, 100], [230, 180, 80]] },
    pizza:         { base: [230, 180, 100], alt: [[210, 70, 60], [240, 220, 180]] },
    donut:         { base: [220, 160, 100], alt: [[240, 130, 180], [140, 90, 60]] },
    cake:          { base: [250, 220, 200], alt: [[230, 120, 160], [180, 120, 70]] },
    chair:         { base: [140, 100, 60],  alt: [[90, 90, 100]] },
    couch:         { base: [90, 110, 140],  alt: [[140, 80, 80], [80, 90, 80]] },
    'potted plant':{ base: [80, 150, 70],   alt: [[170, 120, 70], [90, 70, 50]] },
    bed:           { base: [200, 180, 190], alt: [[130, 100, 130], [90, 100, 130]] },
    'dining table':{ base: [160, 120, 80],  alt: [[120, 90, 60]] },
    toilet:        { base: [240, 245, 250], alt: [[220, 225, 230]] },
    tv:            { base: [30, 30, 35],    alt: [[50, 50, 55]] },
    laptop:        { base: [180, 185, 195], alt: [[40, 40, 45]] },
    mouse:         { base: [90, 90, 100],   alt: [[200, 200, 210]] },
    remote:        { base: [60, 60, 70],    alt: [[200, 200, 200]] },
    keyboard:      { base: [70, 70, 80],    alt: [[200, 200, 210]] },
    'cell phone':  { base: [40, 40, 45],    alt: [[200, 200, 210], [80, 90, 110]] },
    microwave:     { base: [180, 185, 195], alt: [[90, 90, 100]] },
    oven:          { base: [180, 185, 195], alt: [[50, 50, 55]] },
    toaster:       { base: [200, 205, 215], alt: [[90, 90, 100]] },
    sink:          { base: [220, 225, 230], alt: [[180, 185, 195]] },
    refrigerator:  { base: [220, 225, 230], alt: [[180, 185, 195]] },
    book:          { base: [140, 80, 60],   alt: [[60, 90, 140], [80, 130, 90]] },
    clock:         { base: [230, 230, 235], alt: [[60, 60, 70], [200, 180, 100]] },
    vase:          { base: [180, 200, 210], alt: [[140, 90, 60], [90, 130, 140]] },
    scissors:      { base: [180, 185, 195], alt: [[120, 60, 60]] },
    'teddy bear':  { base: [200, 150, 100], alt: [[140, 90, 60]] },
    'hair drier':  { base: [90, 90, 100],   alt: [[200, 60, 60]] },
    toothbrush:    { base: [200, 220, 240], alt: [[230, 100, 130]] },
  };

  const FALLBACK_PALETTES = {
    pastel: [
      [255, 209, 220], [186, 225, 255], [200, 245, 215], [255, 236, 179],
      [221, 204, 255], [255, 204, 188], [179, 229, 252], [255, 224, 178],
    ],
    vibrant: [
      [239, 68, 68], [249, 115, 22], [234, 179, 8], [34, 197, 94],
      [6, 182, 212], [59, 130, 246], [139, 92, 246], [236, 72, 153],
    ],
    nature: [
      [134, 194, 50], [76, 175, 80], [46, 125, 50], [255, 193, 7],
      [255, 152, 0], [139, 195, 74], [121, 85, 72], [96, 125, 139],
    ],
  };
  let activeFallback = 'vibrant';

  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  const clamp255 = (v) => v < 0 ? 0 : v > 255 ? 255 : v;
  const yieldToUI = () => new Promise(r => setTimeout(r, 0));

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function fileToDataURL(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(new Error('Read failed'));
      r.readAsDataURL(file);
    });
  }

  function loadImageEl(src) {
    return new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('Image decode failed'));
      i.src = src;
    });
  }

  function rgbToCss(c) {
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }

  function colorDistance(c1, c2) {
    const dr = c1[0] - c2[0], dg = c1[1] - c2[1], db = c1[2] - c2[2];
    return Math.sqrt(dr*dr + dg*dg + db*db);
  }

  function pickSemanticColor(className, seed) {
    const entry = SEMANTIC_COLORS[className];
    if (!entry) {
      const fb = FALLBACK_PALETTES[activeFallback];
      return fb[Math.abs(seed) % fb.length];
    }
    const pool = [entry.base, ...entry.alt];
    return pool[Math.abs(seed) % pool.length];
  }

  function aiToast(message, type = 'info', duration = 3500) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed;bottom:22px;right:22px;z-index:9999;
      display:flex;align-items:center;gap:11px;padding:14px 20px;
      background:var(--bg-elevated);border:1px solid var(--border-glow);
      border-radius:var(--radius-sm);color:var(--text-primary);
      font-size:.85rem;font-weight:500;box-shadow:0 24px 48px -16px rgba(0,0,0,0.6);
      min-width:260px;max-width:380px;animation:toastIn .32s var(--ease-spring);
      backdrop-filter:blur(18px);
    `;
    const icon = type === 'error' ? 'fa-circle-exclamation'
      : type === 'success' ? 'fa-circle-check'
      : 'fa-circle-info';
    el.innerHTML = `<i class="fas ${icon}" style="color:${type === 'error' ? 'var(--danger)' : type === 'success' ? 'var(--success)' : 'var(--accent)'}"></i><span>${message}</span>`;
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px)';
      setTimeout(() => el.remove(), 320);
    }, duration);
  }

  function aiSetStatus(message, type = 'info') {
    dom.aiStatusIndicator.className = `ai-status-dot ${type}`;
    dom.aiStatusMsg.innerHTML = message;
  }

  function aiSetProgress(pct, text) {
    dom.aiProgressFill.style.width = pct + '%';
    if (text) dom.aiProcSub.textContent = text;
  }

  async function initDetector() {
    try {
      if (typeof cocoSsd === 'undefined' || typeof tf === 'undefined') {
        throw new Error('TensorFlow.js or COCO-SSD not loaded');
      }
      dom.aiDetectorDot.className = 'ai-status-dot busy';
      dom.aiDetectorStatus.textContent = 'Loading COCO-SSD…';
      aiSetStatus('Loading object detection model (COCO-SSD)…', 'info');

      let model;
      try {
        model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      } catch (e) {
        console.warn('lite_mobilenet_v2 failed, falling back:', e);
        model = await cocoSsd.load({ base: 'mobilenet_v1' });
      }

      state.detector = model;
      state.detectorReady = true;
      dom.aiDetectorDot.className = 'ai-status-dot success';
      dom.aiDetectorStatus.textContent = 'Detector ready';
      aiSetStatus('✅ Object detector ready. Upload line art to begin.', 'success');
      aiToast('Object detection model loaded', 'success');
    } catch (err) {
      console.error('Detector init failed:', err);
      dom.aiDetectorDot.className = 'ai-status-dot error';
      dom.aiDetectorStatus.textContent = 'Detector unavailable';
      aiSetStatus('⚠️ Object detector unavailable — using classical pipeline only.', 'error');
      aiToast('Detector unavailable, using CV fallback', 'error', 5000);
    }
  }

  async function aiHandleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      aiToast('Please upload an image file (PNG/JPG/WEBP/BMP).', 'error');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      aiToast('Image too large. Max 15 MB.', 'error');
      return;
    }

    aiSetStatus(`Loading <strong>${escapeHtml(file.name)}</strong>…`, 'info');

    try {
      const dataUrl = await fileToDataURL(file);
      const img = await loadImageEl(dataUrl);
      state.inputImage = img;

      const maxDim = 900;
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      w = Math.max(64, w);
      h = Math.max(64, h);

      dom.aiOriginalCanvas.width = w;
      dom.aiOriginalCanvas.height = h;
      dom.aiColorCanvas.width = w;
      dom.aiColorCanvas.height = h;

      aiOrigCtx.clearRect(0, 0, w, h);
      aiOrigCtx.drawImage(img, 0, 0, w, h);
      state.inputImageData = aiOrigCtx.getImageData(0, 0, w, h);

      dom.aiDetectionOverlay.innerHTML = '';
      dom.aiDetectionReport.classList.remove('visible');

      aiResetResultOnly();

      dom.aiDropzone.classList.add('hidden');
      dom.aiOriginalCanvas.classList.add('visible');
      dom.aiEmptyResult.classList.remove('hidden');
      dom.aiColorCanvas.classList.remove('visible');
      dom.aiColorizeBtn.disabled = false;
      dom.aiResetBtn.disabled = false;
      dom.aiToggleDetectionBtn.disabled = true;
      dom.aiDownloadBtn.disabled = true;
      state.detections = [];

      aiSetStatus(`✅ <strong>${escapeHtml(file.name)}</strong> loaded (${w}×${h}). Press <strong>Run AI Pipeline</strong>.`, 'success');
      aiToast('Image loaded', 'success');
    } catch (err) {
      console.error(err);
      aiSetStatus('❌ Failed to load image.', 'error');
    }
  }

  function aiResetResultOnly() {
    state.resultImageData = null;
    state.hasResult = false;
    aiColorCtx.clearRect(0, 0, dom.aiColorCanvas.width, dom.aiColorCanvas.height);
    dom.aiColorCanvas.classList.remove('visible');
    dom.aiEmptyResult.classList.remove('hidden');
    dom.aiDownloadBtn.disabled = true;
  }

  function aiResetAll() {
    if (state.processing) return;
    state.inputImage = null;
    state.inputImageData = null;
    state.detections = [];
    aiResetResultOnly();
    dom.aiDetectionOverlay.innerHTML = '';
    dom.aiDetectionReport.classList.remove('visible');

    dom.aiDropzone.classList.remove('hidden');
    dom.aiOriginalCanvas.classList.remove('visible');
    dom.aiColorCanvas.classList.remove('visible');
    dom.aiEmptyResult.classList.remove('hidden');
    dom.aiOriginalCanvas.width = 600;
    dom.aiOriginalCanvas.height = 600;
    dom.aiColorCanvas.width = 600;
    dom.aiColorCanvas.height = 600;
    aiOrigCtx.clearRect(0, 0, 600, 600);
    aiColorCtx.clearRect(0, 0, 600, 600);
    dom.aiFileInput.value = '';

    dom.aiColorizeBtn.disabled = true;
    dom.aiResetBtn.disabled = true;
    dom.aiToggleDetectionBtn.disabled = true;
    dom.aiDownloadBtn.disabled = true;

    aiSetStatus('Upload a line art image to begin.', 'info');
  }

  async function runDetection() {
    if (!state.detectorReady || !state.inputImage) return [];
    aiSetProgress(15, 'Running object detection');
    dom.aiProcText.textContent = 'Detecting objects…';
    await yieldToUI();

    try {
      const raw = await state.detector.detect(state.inputImage, 20, 0.15);

      const scaleX = dom.aiOriginalCanvas.width / (state.inputImage.naturalWidth || state.inputImage.width);
      const scaleY = dom.aiOriginalCanvas.height / (state.inputImage.naturalHeight || state.inputImage.height);

      const minConf = parseFloat(dom.aiConfidenceRange.value);
      const dets = raw
        .filter(d => d.score >= minConf)
        .map(d => ({
          class: d.class,
          score: d.score,
          bbox: [
            d.bbox[0] * scaleX,
            d.bbox[1] * scaleY,
            d.bbox[2] * scaleX,
            d.bbox[3] * scaleY,
          ],
        }))
        .sort((a, b) => (b.bbox[2] * b.bbox[3]) - (a.bbox[2] * a.bbox[3]));

      state.detections = dets;
      return dets;
    } catch (err) {
      console.error('Detection error:', err);
      aiToast('Detection failed — using CV fallback', 'error');
      return [];
    }
  }

  async function runSegmentation(imageData, detections, semanticWeight) {
    aiSetProgress(35, 'Detecting edges & segmenting regions');
    dom.aiProcText.textContent = 'Segmenting regions…';
    await yieldToUI();

    const w = imageData.width;
    const h = imageData.height;
    const src = imageData.data;
    const total = w * h;

    const gray = new Float32Array(total);
    for (let i = 0, j = 0; i < src.length; i += 4, j++) {
      gray[j] = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
    }

    const edges = new Float32Array(total);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const gx =
          -gray[i - w - 1] - 2 * gray[i - 1] - gray[i + w - 1] +
          gray[i - w + 1] + 2 * gray[i + 1] + gray[i + w + 1];
        const gy =
          -gray[i - w - 1] - 2 * gray[i - w] - gray[i - w + 1] +
          gray[i + w - 1] + 2 * gray[i + w] + gray[i + w + 1];
        edges[i] = Math.min(255, Math.sqrt(gx * gx + gy * gy) * 0.7);
      }
    }

    let sum = 0, sumSq = 0, n = 0;
    for (let i = 0; i < total; i++) { sum += gray[i]; sumSq += gray[i] * gray[i]; n++; }
    const mean = sum / n;
    const std = Math.sqrt(Math.max(0, sumSq / n - mean * mean));
    const darkThresh = Math.min(140, mean - std * 0.35);
    const edgeThresh = Math.max(45, 55 + (255 - mean) * 0.15);

    const isLine = new Uint8Array(total);
    for (let i = 0; i < total; i++) {
      const lum = gray[i];
      const edg = edges[i];
      if (lum < darkThresh) { isLine[i] = 1; continue; }
      if (edg > edgeThresh && lum < mean + 30) { isLine[i] = 1; continue; }
      if (lum < 65) isLine[i] = 1;
    }

    await yieldToUI();

    const regionId = new Int32Array(total).fill(-1);
    const regionSizes = [];
    const regionAvgLum = [];
    const regionBBox = [];
    const regionHitTest = [];
    let currentRegion = 0;

    const stack = new Int32Array(total);
    const minRegionSize = Math.max(20, Math.floor(total * 0.00015));

    const detCenters = detections.map(d => ({
      cx: d.bbox[0] + d.bbox[2] / 2,
      cy: d.bbox[1] + d.bbox[3] / 2,
      x0: d.bbox[0], y0: d.bbox[1],
      x1: d.bbox[0] + d.bbox[2], y1: d.bbox[1] + d.bbox[3],
      score: d.score,
      class: d.class,
    }));

    for (let start = 0; start < total; start++) {
      if (regionId[start] !== -1) continue;
      if (isLine[start]) continue;

      let sp = 0;
      stack[sp++] = start;
      regionId[start] = currentRegion;
      let size = 0;
      let lumSum = 0;
      let minX = w, minY = h, maxX = 0, maxY = 0;
      const regionIndices = [];

      while (sp > 0) {
        const idx = stack[--sp];
        const x = idx % w;
        const y = (idx / w) | 0;
        size++;
        lumSum += gray[idx];
        regionIndices.push(idx);
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;

        if (x > 0) {
          const ni = idx - 1;
          if (regionId[ni] === -1 && !isLine[ni]) { regionId[ni] = currentRegion; stack[sp++] = ni; }
        }
        if (x < w - 1) {
          const ni = idx + 1;
          if (regionId[ni] === -1 && !isLine[ni]) { regionId[ni] = currentRegion; stack[sp++] = ni; }
        }
        if (y > 0) {
          const ni = idx - w;
          if (regionId[ni] === -1 && !isLine[ni]) { regionId[ni] = currentRegion; stack[sp++] = ni; }
        }
        if (y < h - 1) {
          const ni = idx + w;
          if (regionId[ni] === -1 && !isLine[ni]) { regionId[ni] = currentRegion; stack[sp++] = ni; }
        }
      }

      if (size >= minRegionSize) {
        regionSizes[currentRegion] = size;
        regionAvgLum[currentRegion] = lumSum / size;
        regionBBox[currentRegion] = { minX, minY, maxX, maxY };

        const rcx = (minX + maxX) / 2;
        const rcy = (minY + maxY) / 2;
        let bestDet = -1;
        let bestScore = 0;
        for (let di = 0; di < detCenters.length; di++) {
          const d = detCenters[di];
          if (rcx >= d.x0 && rcx <= d.x1 && rcy >= d.y0 && rcy <= d.y1) {
            if (d.score > bestScore) { bestScore = d.score; bestDet = di; }
          }
        }
        if (bestDet === -1) {
          let bestDist = Infinity;
          for (let di = 0; di < detCenters.length; di++) {
            const d = detCenters[di];
            const dx = Math.max(d.x0 - rcx, 0, rcx - d.x1);
            const dy = Math.max(d.y0 - rcy, 0, rcy - d.y1);
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < bestDist) { bestDist = dist; bestDet = di; }
          }
          if (bestDist > 40) bestDet = -1;
        }
        regionHitTest[currentRegion] = bestDet;
        currentRegion++;
      } else {
        for (const idx of regionIndices) {
          isLine[idx] = 1;
          regionId[idx] = -1;
        }
      }
    }

    const numRegions = currentRegion;

    await yieldToUI();
    aiSetProgress(65, 'Matching semantic colors');
    dom.aiProcText.textContent = 'Matching colors…';

    const regionColor = new Array(numRegions);
    const semanticStrength = clamp(semanticWeight, 0, 1);
    const usedColorsByDet = new Map();

    for (let r = 0; r < numRegions; r++) {
      const bb = regionBBox[r];
      const rcx = (bb.minX + bb.maxX) / 2;
      const rcy = (bb.minY + bb.maxY) / 2;
      const hash = (Math.floor(rcx * 7.13) * 131 + Math.floor(rcy * 11.71) * 197 + r * 17 + regionSizes[r]) >>> 0;

      const detIdx = regionHitTest[r];
      let color = null;

      if (detIdx >= 0 && detIdx < detections.length && semanticStrength > 0.15) {
        const det = detections[detIdx];
        const cls = det.class;

        const semantic = pickSemanticColor(cls, hash);

        if (!usedColorsByDet.has(detIdx)) usedColorsByDet.set(detIdx, []);
        const used = usedColorsByDet.get(detIdx);

        let candidate = semantic;
        let attempts = 0;
        while (attempts < 4 && used.some(u => colorDistance(u, candidate) < 60)) {
          const altPool = SEMANTIC_COLORS[cls] ? [SEMANTIC_COLORS[cls].base, ...SEMANTIC_COLORS[cls].alt] : [semantic];
          candidate = altPool[(hash + attempts + 1) % altPool.length];
          attempts++;
        }
        used.push(candidate);

        const fb = FALLBACK_PALETTES[activeFallback];
        const fallback = fb[hash % fb.length];
        color = [
          candidate[0] * semanticStrength + fallback[0] * (1 - semanticStrength),
          candidate[1] * semanticStrength + fallback[1] * (1 - semanticStrength),
          candidate[2] * semanticStrength + fallback[2] * (1 - semanticStrength),
        ];
      } else {
        const fb = FALLBACK_PALETTES[activeFallback];
        color = fb[hash % fb.length];
      }

      regionColor[r] = color;
    }

    for (let r = 0; r < numRegions; r++) {
      const bb = regionBBox[r];
      const detR = regionHitTest[r];
      for (let r2 = r + 1; r2 < numRegions; r2++) {
        const bb2 = regionBBox[r2];
        if (detR !== regionHitTest[r2]) continue;
        const margin = 3;
        if (bb.minX <= bb2.maxX + margin && bb.maxX >= bb2.minX - margin &&
            bb.minY <= bb2.maxY + margin && bb.maxY >= bb2.minY - margin) {
          const c1 = regionColor[r];
          const c2 = regionColor[r2];
          if (colorDistance(c1, c2) < 45) {
            const det = detections[regionHitTest[r2]];
            if (det) {
              const pool = SEMANTIC_COLORS[det.class]
                ? [SEMANTIC_COLORS[det.class].base, ...SEMANTIC_COLORS[det.class].alt]
                : FALLBACK_PALETTES[activeFallback];
              let best = pool[0], bestDist = 0;
              for (const p of pool) {
                const d = colorDistance(c1, p);
                if (d > bestDist) { bestDist = d; best = p; }
              }
              regionColor[r2] = best;
            } else {
              const fb = FALLBACK_PALETTES[activeFallback];
              const curIdx = fb.findIndex(c => colorDistance(c, c2) < 30);
              regionColor[r2] = fb[(curIdx + 1) % fb.length];
            }
          }
        }
      }
    }

    await yieldToUI();

    return {
      regionId, isLine, regionSizes, regionAvgLum, regionColor, numRegions, gray,
    };
  }

  async function renderColorized(segmentation, imageData, opts) {
    aiSetProgress(85, 'Rendering final output');
    dom.aiProcText.textContent = 'Rendering…';
    await yieldToUI();

    const { saturation, lineStrength } = opts;
    const w = imageData.width;
    const h = imageData.height;
    const src = imageData.data;

    const { regionId, isLine, regionAvgLum, regionColor, numRegions, gray } = segmentation;

    const outImageData = new ImageData(w, h);
    const out = outImageData.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const p = idx * 4;

        if (isLine[idx]) {
          const factor = 1 - lineStrength * 0.35;
          out[p] = clamp255(src[p] * factor);
          out[p + 1] = clamp255(src[p + 1] * factor);
          out[p + 2] = clamp255(src[p + 2] * factor);
          out[p + 3] = 255;
          continue;
        }

        const rid = regionId[idx];
        if (rid < 0 || rid >= numRegions) {
          out[p] = out[p + 1] = out[p + 2] = clamp255(gray[idx]);
          out[p + 3] = 255;
          continue;
        }

        const baseColor = regionColor[rid];
        const regionLum = regionAvgLum[rid] || 200;
        const lum = gray[idx];
        const lumRatio = clamp(lum / Math.max(1, regionLum), 0.55, 1.4);
        const shade = 0.75 + 0.45 * lumRatio;

        const rr = baseColor[0] * shade;
        const gg = baseColor[1] * shade;
        const bb2 = baseColor[2] * shade;

        const grayApprox = 0.299 * rr + 0.587 * gg + 0.114 * bb2;
        out[p] = clamp255(grayApprox + (rr - grayApprox) * saturation);
        out[p + 1] = clamp255(grayApprox + (gg - grayApprox) * saturation);
        out[p + 2] = clamp255(grayApprox + (bb2 - grayApprox) * saturation);
        out[p + 3] = 255;
      }
    }

    return outImageData;
  }

  function renderDetectionOverlay() {
    dom.aiDetectionOverlay.innerHTML = '';
    if (!state.showDetections) return;

    const cw = dom.aiOriginalCanvas.width;
    const ch = dom.aiOriginalCanvas.height;

    const canvasRect = dom.aiOriginalCanvas.getBoundingClientRect();
    const stageRect = dom.aiInputStage.getBoundingClientRect();
    const offsetX = canvasRect.left - stageRect.left;
    const offsetY = canvasRect.top - stageRect.top;

    dom.aiDetectionOverlay.style.left = offsetX + 'px';
    dom.aiDetectionOverlay.style.top = offsetY + 'px';
    dom.aiDetectionOverlay.style.width = canvasRect.width + 'px';
    dom.aiDetectionOverlay.style.height = canvasRect.height + 'px';

    const scaleX = canvasRect.width / cw;
    const scaleY = canvasRect.height / ch;

    state.detections.forEach((det) => {
      const [x, y, w, h] = det.bbox;
      const box = document.createElement('div');
      box.className = 'ai-det-box';
      box.style.left = (x * scaleX) + 'px';
      box.style.top = (y * scaleY) + 'px';
      box.style.width = (w * scaleX) + 'px';
      box.style.height = (h * scaleY) + 'px';

      const hue = (hashString(det.class) * 47) % 360;
      box.style.borderColor = `hsl(${hue}, 85%, 65%)`;
      box.style.boxShadow = `0 0 20px hsla(${hue}, 85%, 65%, 0.5), inset 0 0 20px hsla(${hue}, 85%, 65%, 0.1)`;

      const label = document.createElement('div');
      label.className = 'ai-det-label';
      label.style.background = `hsl(${hue}, 75%, 55%)`;
      label.innerHTML = `${escapeHtml(det.class)}<span style="opacity:.75;font-weight:500;margin-left:4px;">${(det.score * 100).toFixed(0)}%</span>`;
      box.appendChild(label);

      dom.aiDetectionOverlay.appendChild(box);
    });
  }

  function hashString(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function renderDetectionReport() {
    if (!state.detections.length) {
      dom.aiDetectionReport.classList.remove('visible');
      return;
    }
    dom.aiDetectionReport.classList.add('visible');
    dom.aiReportGrid.innerHTML = '';
    dom.aiReportCount.textContent = `${state.detections.length} object${state.detections.length > 1 ? 's' : ''}`;

    const groups = new Map();
    state.detections.forEach(d => {
      if (!groups.has(d.class)) groups.set(d.class, []);
      groups.get(d.class).push(d);
    });

    groups.forEach((list, cls) => {
      const avgScore = list.reduce((s, d) => s + d.score, 0) / list.length;
      const semantic = SEMANTIC_COLORS[cls];
      const swatch = semantic ? semantic.base : FALLBACK_PALETTES[activeFallback][0];

      const chip = document.createElement('div');
      chip.className = 'ai-det-chip';
      chip.innerHTML = `
        <span class="swatch" style="background:${rgbToCss(swatch)}"></span>
        <span class="obj-name">${escapeHtml(cls)}</span>
        <span class="score">${(avgScore * 100).toFixed(0)}%${list.length > 1 ? ' ×' + list.length : ''}</span>
      `;
      dom.aiReportGrid.appendChild(chip);
    });
  }

  async function runAIPipeline() {
    if (state.processing || !state.inputImageData) return;

    state.processing = true;
    dom.aiColorizeBtn.disabled = true;
    dom.aiResetBtn.disabled = true;
    dom.aiDownloadBtn.disabled = true;
    dom.aiToggleDetectionBtn.disabled = true;
    dom.aiProcOverlay.classList.add('active');
    aiSetStatus('🚀 Running Helaberry AI pipeline…', 'info');
    aiSetProgress(0, 'Starting');

    try {
      let detections = [];
      if (state.detectorReady) {
        detections = await runDetection();
        state.detections = detections;
        if (detections.length > 0) {
          renderDetectionOverlay();
          renderDetectionReport();
          dom.aiToggleDetectionBtn.disabled = false;
        } else {
          dom.aiDetectionReport.classList.remove('visible');
        }
      }

      aiSetProgress(30, `${detections.length} object${detections.length !== 1 ? 's' : ''} detected`);

      const semanticWeight = parseFloat(dom.aiSemanticRange.value);
      const seg = await runSegmentation(state.inputImageData, detections, semanticWeight);

      const opts = {
        saturation: parseFloat(dom.aiSaturationRange.value),
        lineStrength: parseFloat(dom.aiLineRange.value),
      };
      const result = await renderColorized(seg, state.inputImageData, opts);

      aiColorCtx.putImageData(result, 0, 0);
      state.resultImageData = result;
      state.hasResult = true;

      dom.aiEmptyResult.classList.add('hidden');
      dom.aiColorCanvas.classList.add('visible');
      dom.aiDownloadBtn.disabled = false;
      aiSetProgress(100, 'Complete');

      const detMsg = detections.length > 0
        ? `<strong>${detections.length}</strong> object${detections.length > 1 ? 's' : ''} recognized &amp; colored`
        : 'Colored using semantic palette fallback';
      aiSetStatus(`✅ Colorization complete. ${detMsg}.`, 'success');
      aiToast('Pipeline complete', 'success');
    } catch (err) {
      console.error('Pipeline error:', err);
      aiSetStatus('❌ Pipeline failed. Please try a different image.', 'error');
      aiToast('Pipeline error: ' + err.message, 'error');
    } finally {
      state.processing = false;
      dom.aiColorizeBtn.disabled = false;
      dom.aiResetBtn.disabled = false;
      dom.aiToggleDetectionBtn.disabled = state.detections.length === 0;
      dom.aiProcOverlay.classList.remove('active');
      setTimeout(() => aiSetProgress(0, ''), 400);
    }
  }

  function downloadAIResult() {
    if (!state.resultImageData) return;
    const tmp = document.createElement('canvas');
    tmp.width = state.resultImageData.width;
    tmp.height = state.resultImageData.height;
    tmp.getContext('2d').putImageData(state.resultImageData, 0, 0);
    const a = document.createElement('a');
    a.download = `helaberry-ai-${Date.now()}.png`;
    a.href = tmp.toDataURL('image/png');
    a.click();
    aiToast('Download started', 'success');
  }

  function bindAIEvents() {
    dom.aiDropzone.addEventListener('click', () => dom.aiFileInput.click());

    dom.aiFileInput.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) aiHandleFile(f);
      e.target.value = '';
    });

    ['dragenter', 'dragover'].forEach(evt => {
      dom.aiInputStage.addEventListener(evt, (e) => {
        e.preventDefault(); e.stopPropagation();
        dom.aiDropzone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach(evt => {
      dom.aiInputStage.addEventListener(evt, (e) => {
        e.preventDefault(); e.stopPropagation();
        dom.aiDropzone.classList.remove('dragover');
      });
    });
    dom.aiInputStage.addEventListener('drop', (e) => {
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) aiHandleFile(f);
    });

    dom.aiColorizeBtn.addEventListener('click', runAIPipeline);
    dom.aiResetBtn.addEventListener('click', aiResetAll);
    dom.aiDownloadBtn.addEventListener('click', downloadAIResult);

    dom.aiToggleDetectionBtn.addEventListener('click', () => {
      state.showDetections = !state.showDetections;
      dom.aiToggleDetectionBtn.querySelector('span').textContent = state.showDetections ? 'Hide detections' : 'Show detections';
      renderDetectionOverlay();
    });

    dom.aiSaturationRange.addEventListener('input', () => {
      dom.aiSaturationVal.textContent = parseFloat(dom.aiSaturationRange.value).toFixed(2);
    });
    dom.aiLineRange.addEventListener('input', () => {
      dom.aiLineVal.textContent = parseFloat(dom.aiLineRange.value).toFixed(2);
    });
    dom.aiConfidenceRange.addEventListener('input', () => {
      dom.aiConfidenceVal.textContent = parseFloat(dom.aiConfidenceRange.value).toFixed(2);
    });
    dom.aiSemanticRange.addEventListener('input', () => {
      dom.aiSemanticVal.textContent = parseFloat(dom.aiSemanticRange.value).toFixed(2);
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (state.detections.length) renderDetectionOverlay();
      }, 150);
    });
  }

  function bootAI() {
    bindAIEvents();
    aiResetAll();
    aiSetStatus('Initializing object detector…', 'info');
    dom.aiDetectorDot.className = 'ai-status-dot busy';
    dom.aiDetectorStatus.textContent = 'Loading detector…';
    initDetector();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAI);
  } else {
    bootAI();
  }

})();