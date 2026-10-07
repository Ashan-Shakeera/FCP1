'use strict';
/* ============================================================
   LINELAB — Image to Line Art
   All processing done client-side with Canvas + typed arrays.
   ============================================================ */

/* ---------- UTILS ---------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let toastTimer = null;
function toast(msg, type){
  const c = $('#toastContainer');
  const el = document.createElement('div');
  el.className = 'toast';
  const icons = { success:'fa-check-circle', warning:'fa-exclamation-triangle', error:'fa-times-circle' };
  el.innerHTML = `<i class="fas ${icons[type] || 'fa-info-circle'}"></i><span>${msg}</span>`;
  c.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 350); }, 2400);
}

/* ---------- STATE ---------- */
const state = {
  originalImage: null,      // HTMLImageElement
  originalData: null,       // ImageData (source, scaled)
  currentResult: null,      // ImageData (processed)
  resultCanvas: null,       // display canvas
  algorithm: 'sketch',
  blur: 1.0,
  threshold: 50,
  lineWidth: 1.0,
  contrast: 1.0,
  invert: false,
  transparent: false,
  bgColor: '#ffffff',
  view: 'split',
  processing: false,
  MAX_DIM: 1800,            // cap processing size for performance
};

/* ============================================================
   IMAGE LOADING
   ============================================================ */
const dropZone = $('#dropZone');
const fileInput = $('#fileInput');
const dropOverlay = $('#dropOverlay');

function setupDragDrop(){
  let dragCounter = 0;
  ['dragenter','dragover'].forEach(evt => {
    document.addEventListener(evt, e => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')){
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        if (evt === 'dragenter') dragCounter++;
        dropOverlay.classList.add('show');
      }
    });
  });
  ['dragleave','drop'].forEach(evt => {
    document.addEventListener(evt, e => {
      if (evt === 'dragleave'){
        dragCounter--;
        if (dragCounter <= 0){ dragCounter = 0; dropOverlay.classList.remove('show'); }
      } else if (evt === 'drop'){
        e.preventDefault();
        dragCounter = 0;
        dropOverlay.classList.remove('show');
        if (e.dataTransfer.files && e.dataTransfer.files.length){
          handleFiles(e.dataTransfer.files);
        } else if (e.dataTransfer.getData('text/uri-list')){
          loadFromURL(e.dataTransfer.getData('text/uri-list'));
        }
      }
    });
  });
}

function handleFiles(files){
  const file = Array.from(files).find(f => f.type.startsWith('image/'));
  if (!file){ toast('Please drop an image file', 'warning'); return; }
  const reader = new FileReader();
  reader.onload = e => loadFromDataURL(e.target.result);
  reader.onerror = () => toast('Failed to read file', 'error');
  reader.readAsDataURL(file);
}

function loadFromDataURL(dataUrl){
  const img = new Image();
  img.onload = () => loadImage(img);
  img.onerror = () => toast('Could not load image', 'error');
  img.crossOrigin = 'anonymous';
  img.src = dataUrl;
}

function loadFromURL(url){
  if (!url || !url.trim()){ toast('Please enter a URL', 'warning'); return; }
  url = url.trim();
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => loadImage(img);
  img.onerror = () => toast('Could not load image from URL (CORS or invalid)', 'error');
  img.src = url;
}

function loadImage(img){
  // Cap size for performance
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const scale = Math.min(1, state.MAX_DIM / Math.max(iw, ih));
  const w = Math.round(iw * scale), h = Math.round(ih * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);

  state.originalImage = img;
  state.originalData = ctx.getImageData(0, 0, w, h);

  // Set up UI
  $('#originalImg').src = img.src;
  $('#originalImg').style.maxHeight = `calc(100vh - var(--topbar-h) - 64px)`;
  $('#emptyState').style.display = 'none';
  $('#editor').style.display = 'flex';
  $('#newBtn').disabled = false;
  $('#pngBtn').disabled = false;
  $('#svgBtn').disabled = false;
  $('#shareBtn').disabled = false;
  $('#metaDim').textContent = `${w} × ${h}`;
  $('#metaAlgo').textContent = state.algorithm;

  // Size result canvas
  state.resultCanvas = $('#resultCanvas');
  state.resultCanvas.width = w;
  state.resultCanvas.height = h;
  state.resultCanvas.parentElement.style.width = '100%';
  state.resultCanvas.parentElement.style.height = '100%';

  applyView();

  // Process
  processImage();

  // Auto-fit split
  setTimeout(() => setSplit(50), 50);
}

/* ============================================================
   CORE IMAGE PROCESSING ALGORITHMS
   ============================================================ */

/* --- Grayscale extraction --- */
function toGrayscale(imgData){
  const n = imgData.width * imgData.height;
  const d = imgData.data;
  const g = new Float32Array(n);
  for (let i = 0; i < n; i++){
    g[i] = 0.299 * d[i*4] + 0.587 * d[i*4+1] + 0.114 * d[i*4+2];
  }
  return g;
}

/* --- Fast Gaussian blur via 3-pass box blur --- */
function boxBlurH(src, dst, w, h, r){
  const iarr = 1 / (r + r + 1);
  for (let i = 0; i < h; i++){
    let ti = i * w, li = ti, ri = ti + r;
    const fv = src[ti], lv = src[ti + w - 1];
    let val = (r + 1) * fv;
    for (let j = 0; j < r; j++) val += src[ti + j];
    for (let j = 0; j <= r; j++){ val += src[ri++] - fv; dst[ti++] = val * iarr; }
    for (let j = r + 1; j < w - r; j++){ val += src[ri++] - src[li++]; dst[ti++] = val * iarr; }
    for (let j = w - r; j < w; j++){ val += lv - src[li++]; dst[ti++] = val * iarr; }
  }
}
function boxBlurV(src, dst, w, h, r){
  const iarr = 1 / (r + r + 1);
  for (let i = 0; i < w; i++){
    let ti = i, li = ti, ri = ti + r * w;
    const fv = src[ti], lv = src[ti + w * (h - 1)];
    let val = (r + 1) * fv;
    for (let j = 0; j < r; j++) val += src[ti + j * w];
    for (let j = 0; j <= r; j++){ val += src[ri] - fv; dst[ti] = val * iarr; ri += w; ti += w; }
    for (let j = r + 1; j < h - r; j++){ val += src[ri] - src[li]; dst[ti] = val * iarr; li += w; ri += w; ti += w; }
    for (let j = h - r; j < h; j++){ val += lv - src[li]; dst[ti] = val * iarr; li += w; ti += w; }
  }
}
function fastGaussian(arr, w, h, sigma){
  if (sigma < 0.4) return;
  const r = Math.max(1, Math.round(sigma * 1.5));
  const tmp = new Float32Array(w * h);
  for (let p = 0; p < 3; p++){
    boxBlurH(arr, tmp, w, h, r);
    boxBlurV(tmp, arr, w, h, r);
  }
}

/* --- Sobel gradient --- */
function sobel(gray, w, h){
  const mag = new Float32Array(w * h);
  const ang = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++){
    for (let x = 1; x < w - 1; x++){
      const i = y * w + x;
      const tl = gray[i - w - 1], t = gray[i - w], tr = gray[i - w + 1];
      const l = gray[i - 1], r = gray[i + 1];
      const bl = gray[i + w - 1], b = gray[i + w], br = gray[i + w + 1];
      const gx = -tl - 2 * l - bl + tr + 2 * r + br;
      const gy = -tl - 2 * t - tr + bl + 2 * b + br;
      mag[i] = Math.sqrt(gx * gx + gy * gy);
      ang[i] = Math.atan2(gy, gx);
    }
  }
  return { mag, ang };
}

/* --- Non-maximum suppression (Canny step) --- */
function nonMaxSuppression(mag, ang, w, h){
  const out = new Float32Array(w * h);
  const PI = Math.PI;
  for (let y = 1; y < h - 1; y++){
    for (let x = 1; x < w - 1; x++){
      const i = y * w + x;
      let a = ang[i] * 180 / PI;
      if (a < 0) a += 180;
      let n1, n2;
      if ((a >= 0 && a < 22.5) || (a >= 157.5 && a <= 180)){
        n1 = mag[i - 1]; n2 = mag[i + 1];
      } else if (a >= 22.5 && a < 67.5){
        n1 = mag[i - w + 1]; n2 = mag[i + w - 1];
      } else if (a >= 67.5 && a < 112.5){
        n1 = mag[i - w]; n2 = mag[i + w];
      } else {
        n1 = mag[i - w - 1]; n2 = mag[i + w + 1];
      }
      out[i] = (mag[i] >= n1 && mag[i] >= n2) ? mag[i] : 0;
    }
  }
  return out;
}

/* --- Canny edge detection --- */
function cannyEdges(gray, w, h, sigma, lowRatio, highRatio){
  const g = new Float32Array(gray);
  if (sigma > 0.3) fastGaussian(g, w, h, sigma);
  const { mag, ang } = sobel(g, w, h);
  const nms = nonMaxSuppression(mag, ang, w, h);

  // Find max for thresholding
  let maxV = 0;
  for (let i = 0; i < nms.length; i++) if (nms[i] > maxV) maxV = nms[i];
  const high = maxV * highRatio;
  const low  = high * lowRatio;

  const strong = new Uint8Array(w * h);
  const weak   = new Uint8Array(w * h);
  for (let i = 0; i < nms.length; i++){
    if (nms[i] >= high) strong[i] = 1;
    else if (nms[i] >= low) weak[i] = 1;
  }

  // Hysteresis — link weak to strong
  const out = new Uint8Array(w * h);
  const stack = [];
  for (let i = 0; i < strong.length; i++) if (strong[i]){ stack.push(i); out[i] = 1; }
  while (stack.length){
    const i = stack.pop();
    const x = i % w, y = (i / w) | 0;
    for (let dy = -1; dy <= 1; dy++){
      for (let dx = -1; dx <= 1; dx++){
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const ni = ny * w + nx;
        if (weak[ni] && !out[ni]){ out[ni] = 1; stack.push(ni); }
      }
    }
  }
  return out;
}

/* --- Contrast curve --- */
function applyContrast(v, contrast){
  if (contrast === 1) return v;
  return clamp(((v / 255 - 0.5) * contrast + 0.5) * 255, 0, 255);
}

/* --- Effects --- */

function effectSketch(src){
  const { width: w, height: h, data } = src;
  const n = w * h;
  const gray = toGrayscale(src);

  const inv = new Float32Array(n);
  for (let i = 0; i < n; i++) inv[i] = 255 - gray[i];
  fastGaussian(inv, w, h, state.blur);

  const out = new ImageData(w, h);
  const c = state.contrast;
  for (let i = 0; i < n; i++){
    const g = gray[i], b = inv[i];
    let v = b >= 254 ? 255 : Math.min(255, g * 255 / (255 - b));
    v = applyContrast(v, c);
    // Line thickness: expand dark lines by applying a soft threshold
    if (state.lineWidth > 1){
      const t = 128 / state.lineWidth;
      v = v < t ? v * 0.6 : 255 - (255 - v) * 0.4;
      v = clamp(v, 0, 255);
    }
    out.data[i*4]     = v;
    out.data[i*4 + 1] = v;
    out.data[i*4 + 2] = v;
    out.data[i*4 + 3] = 255;
  }
  return out;
}

function effectPencil(src){
  const { width: w, height: h } = src;
  const n = w * h;
  const gray = toGrayscale(src);

  // Invert + blur
  const inv = new Float32Array(n);
  for (let i = 0; i < n; i++) inv[i] = 255 - gray[i];
  fastGaussian(inv, w, h, state.blur * 1.5);

  const out = new ImageData(w, h);
  const c = state.contrast * 1.3;
  // Map threshold to edge hardness
  const hard = state.threshold / 100;
  for (let i = 0; i < n; i++){
    const g = gray[i], b = inv[i];
    let v = b >= 254 ? 255 : Math.min(255, g * 255 / (255 - b));
    v = applyContrast(v, c);
    // Push to binary for harder pencil look
    v = v < 255 * (1 - hard * 0.6) ? v * (0.55 + hard * 0.3) : v;
    v = clamp(v, 0, 255);
    out.data[i*4]     = v;
    out.data[i*4 + 1] = v;
    out.data[i*4 + 2] = v;
    out.data[i*4 + 3] = 255;
  }
  return out;
}

function effectEdges(src){
  const { width: w, height: h } = src;
  const n = w * h;
  const gray = toGrayscale(src);
  if (state.blur > 0.1) fastGaussian(gray, w, h, state.blur);
  const { mag } = sobel(gray, w, h);
  const t = state.threshold * 4;
  const out = new ImageData(w, h);
  for (let i = 0; i < n; i++){
    let v = mag[i] > t ? 0 : 255;
    // Line width: thin vs thick via local dilation approximation
    if (state.lineWidth > 1){
      // skip; done via post-process below
    }
    out.data[i*4]     = v;
    out.data[i*4 + 1] = v;
    out.data[i*4 + 2] = v;
    out.data[i*4 + 3] = 255;
  }
  // Line width expansion (simple box dilate of dark pixels)
  if (state.lineWidth > 1.05){
    return dilateDark(out, Math.max(1, Math.round((state.lineWidth - 1) * 1.5)));
  }
  return out;
}

function effectCanny(src){
  const { width: w, height: h } = src;
  const gray = toGrayscale(src);
  const high = state.threshold / 100;
  const lowRatio = 0.4;
  const edges = cannyEdges(gray, w, h, state.blur, lowRatio, high);
  const out = new ImageData(w, h);
  for (let i = 0; i < edges.length; i++){
    const v = edges[i] ? 0 : 255;
    out.data[i*4]     = v;
    out.data[i*4 + 1] = v;
    out.data[i*4 + 2] = v;
    out.data[i*4 + 3] = 255;
  }
  if (state.lineWidth > 1.05){
    return dilateDark(out, Math.max(1, Math.round((state.lineWidth - 1) * 1.5)));
  }
  return out;
}

function effectXDog(src){
  const { width: w, height: h } = src;
  const n = w * h;
  const gray = toGrayscale(src);
  const g1 = new Float32Array(gray);
  const g2 = new Float32Array(gray);
  fastGaussian(g1, w, h, state.blur);
  fastGaussian(g2, w, h, state.blur * 1.6);

  const out = new ImageData(w, h);
  const k = 1.6;
  const p = 18 + state.threshold / 4;
  const phi = 0.01 + state.threshold / 3000;
  const c = state.contrast;
  for (let i = 0; i < n; i++){
    const d = g1[i] - k * g2[i];
    let v;
    if (d < 0) v = 255;
    else v = 255 * (1 + Math.tanh(p * (d / 255 - phi)));
    v = clamp(v, 0, 255);
    v = applyContrast(v, c);
    out.data[i*4]     = v;
    out.data[i*4 + 1] = v;
    out.data[i*4 + 2] = v;
    out.data[i*4 + 3] = 255;
  }
  if (state.lineWidth > 1.05){
    return dilateDark(out, Math.max(1, Math.round((state.lineWidth - 1) * 1.5)));
  }
  return out;
}

function effectThreshold(src){
  const { width: w, height: h } = src;
  const n = w * h;
  const gray = toGrayscale(src);
  if (state.blur > 0.1) fastGaussian(gray, w, h, state.blur);
  const t = state.threshold * 2.55;
  const out = new ImageData(w, h);
  const c = state.contrast;
  for (let i = 0; i < n; i++){
    let g = applyContrast(gray[i], c);
    const v = g > t ? 255 : 0;
    out.data[i*4]     = v;
    out.data[i*4 + 1] = v;
    out.data[i*4 + 2] = v;
    out.data[i*4 + 3] = 255;
  }
  return out;
}

/* --- Dilate dark pixels (thicken lines) --- */
function dilateDark(imgData, radius){
  const { width: w, height: h, data } = imgData;
  const out = new ImageData(w, h);
  out.data.set(data);
  const r = radius;
  for (let y = 0; y < h; y++){
    for (let x = 0; x < w; x++){
      const i = y * w + x;
      if (data[i*4] > 128) continue;
      // Dark pixel — spread darkness
      for (let dy = -r; dy <= r; dy++){
        for (let dx = -r; dx <= r; dx++){
          if (dx*dx + dy*dy > r*r) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const ni = ny * w + nx;
          if (out.data[ni*4] > 0){
            out.data[ni*4]     = 0;
            out.data[ni*4 + 1] = 0;
            out.data[ni*4 + 2] = 0;
          }
        }
      }
    }
  }
  return out;
}

/* --- Apply color adjustments --- */
function finalizeResult(imgData){
  const { width: w, height: h, data } = imgData;
  const bgRgb = hexToRgb(state.bgColor);
  const out = new ImageData(w, h);
  const n = w * h;
  for (let i = 0; i < n; i++){
    let r = data[i*4], g = data[i*4+1], b = data[i*4+2];
    if (state.invert){ r = 255 - r; g = 255 - g; b = 255 - b; }
    let a = data[i*4+3];
    if (state.transparent){
      // Alpha = darkness
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      a = 255 - lum;
      r = bgRgb.r; g = bgRgb.g; b = bgRgb.b;
    }
    out.data[i*4]     = r;
    out.data[i*4 + 1] = g;
    out.data[i*4 + 2] = b;
    out.data[i*4 + 3] = a;
  }
  return out;
}

function hexToRgb(hex){
  hex = String(hex).replace('#','');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const n = parseInt(hex, 16);
  if (isNaN(n)) return { r:255, g:255, b:255 };
  return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
}

/* ============================================================
   PROCESS PIPELINE
   ============================================================ */
function processImage(){
  if (!state.originalData || state.processing) return;
  state.processing = true;
  showProcessing(true, 'Preparing image…', 10);

  // Use setTimeout to let UI update
  setTimeout(() => {
    const t0 = performance.now();
    let result;
    const src = state.originalData;

    showProcessing(true, 'Analyzing…', 35);
    switch (state.algorithm){
      case 'sketch':    result = effectSketch(src); break;
      case 'pencil':    result = effectPencil(src); break;
      case 'edges':     result = effectEdges(src); break;
      case 'canny':     result = effectCanny(src); break;
      case 'xdog':      result = effectXDog(src); break;
      case 'threshold': result = effectThreshold(src); break;
      default:          result = effectSketch(src);
    }

    showProcessing(true, 'Applying finish…', 75);
    result = finalizeResult(result);

    showProcessing(true, 'Rendering…', 95);
    state.currentResult = result;

    // Draw to display canvas
    const ctx = state.resultCanvas.getContext('2d');
    ctx.clearRect(0, 0, state.resultCanvas.width, state.resultCanvas.height);
    ctx.putImageData(result, 0, 0);

    const elapsed = Math.round(performance.now() - t0);
    $('#metaTime').textContent = `${elapsed} ms`;
    $('#metaAlgo').textContent = state.algorithm.charAt(0).toUpperCase() + state.algorithm.slice(1);

    state.processing = false;
    showProcessing(false);
  }, 30);
}

function showProcessing(show, label, progress){
  const el = $('#processing');
  if (show){
    el.style.display = 'flex';
    if (label) $('#progressLabel').textContent = label;
    if (progress !== undefined) $('#progressBar').style.width = progress + '%';
  } else {
    el.style.display = 'none';
    $('#progressBar').style.width = '0%';
  }
}

/* ============================================================
   VIEW MODES
   ============================================================ */
function applyView(){
  const resultLayer = $('#resultLayer');
  const slider = $('#splitSlider');
  const labels = { orig: $('.view-label.orig'), res: $('.view-label.res') };

  // Reset clip
  resultLayer.style.clipPath = 'none';
  slider.style.display = 'none';
  labels.orig.style.display = 'none';
  labels.res.style.display = 'none';

  if (state.view === 'original'){
    resultLayer.style.display = 'none';
  } else if (state.view === 'result'){
    resultLayer.style.display = 'block';
  } else {
    // split
    resultLayer.style.display = 'block';
    slider.style.display = 'block';
    labels.orig.style.display = 'block';
    labels.res.style.display = 'block';
    updateSplitClip();
  }
}

function updateSplitClip(){
  const slider = $('#splitSlider');
  const pct = parseFloat(slider.style.left) || 50;
  const resultLayer = $('#resultLayer');
  resultLayer.style.clipPath = `inset(0 0 0 ${pct}%)`;
}

function setSplit(pct){
  const slider = $('#splitSlider');
  pct = clamp(pct, 0, 100);
  slider.style.left = pct + '%';
  updateSplitClip();
}

function setupSplitDragging(){
  const slider = $('#splitSlider');
  const comparison = $('#comparison');
  let dragging = false;

  function onDown(e){
    dragging = true;
    e.preventDefault();
    e.stopPropagation();
  }
  function onMove(e){
    if (!dragging) return;
    const rect = $('#imgWrap').getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplit(pct);
  }
  function onUp(){ dragging = false; }

  slider.addEventListener('mousedown', onDown);
  slider.addEventListener('touchstart', onDown, { passive: false });
  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('mouseup', onUp);
  document.addEventListener('touchend', onUp);

  // Click on comparison to move slider
  $('#comparison').addEventListener('click', e => {
    if (state.view !== 'split') return;
    if (e.target.closest('.split-slider')) return;
    const rect = $('#imgWrap').getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right) return;
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setSplit(pct);
  });
}

/* ============================================================
   UI WIRING
   ============================================================ */
function setupUI(){
  // Upload
  $('#chooseBtn').addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });
  dropZone.addEventListener('click', e => {
    if (e.target.closest('button') || e.target.closest('input')) return;
    fileInput.click();
  });
  fileInput.addEventListener('change', e => {
    if (e.target.files.length) handleFiles(e.target.files);
    fileInput.value = '';
  });
  $('#urlLoadBtn').addEventListener('click', () => loadFromURL($('#urlInput').value));
  $('#urlInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') loadFromURL(e.target.value);
  });

  // Demo image (generated procedurally — no external dependency)
  $('#demoBtn').addEventListener('click', e => {
    e.stopPropagation();
    const demo = generateDemoImage();
    loadFromDataURL(demo);
  });

  // New
  $('#newBtn').addEventListener('click', () => {
    state.originalImage = null;
    state.originalData = null;
    state.currentResult = null;
    $('#emptyState').style.display = 'flex';
    $('#editor').style.display = 'none';
    $('#newBtn').disabled = true;
    $('#pngBtn').disabled = true;
    $('#svgBtn').disabled = true;
    $('#shareBtn').disabled = true;
  });

  // View toggle
  $$('#viewToggle button').forEach(b => {
    b.addEventListener('click', () => {
      $$('#viewToggle button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      state.view = b.dataset.view;
      applyView();
    });
  });

  // Algorithm
  $$('.algo-btn').forEach(b => {
    b.addEventListener('click', () => {
      $$('.algo-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      state.algorithm = b.dataset.algo;
      // Smart defaults per algorithm
      applyAlgoDefaults(state.algorithm);
      processImage();
    });
  });

  // Sliders
  bindSlider('#blur', 'blur', v => v.toFixed(1), '#blurVal');
  bindSlider('#threshold', 'threshold', v => Math.round(v), '#thresholdVal');
  bindSlider('#lineWidth', 'lineWidth', v => v.toFixed(1), '#lineWidthVal');
  bindSlider('#contrast', 'contrast', v => v.toFixed(1), '#contrastVal');

  // Toggles
  $('#invertToggle').addEventListener('click', () => {
    state.invert = !state.invert;
    $('#invertSwitch').classList.toggle('on', state.invert);
    processImage();
  });
  $('#transparentToggle').addEventListener('click', () => {
    state.transparent = !state.transparent;
    $('#transparentSwitch').classList.toggle('on', state.transparent);
    processImage();
  });

  // Background
  $('#bgColor').addEventListener('input', e => {
    state.bgColor = e.target.value;
    $('#bgHex').value = e.target.value.toUpperCase();
    $$('#presetBg button').forEach(b => b.classList.toggle('active', b.dataset.bg === e.target.value.toLowerCase()));
    processImage();
  });
  $('#bgHex').addEventListener('change', e => {
    let v = e.target.value.trim();
    if (!v.startsWith('#')) v = '#' + v;
    if (/^#[0-9a-fA-F]{3}$/.test(v)) v = '#' + v.slice(1).split('').map(c => c+c).join('');
    if (!/^#[0-9a-fA-F]{6}$/.test(v)) return;
    state.bgColor = v;
    $('#bgColor').value = v;
    e.target.value = v.toUpperCase();
    processImage();
  });
  $$('#presetBg button').forEach(b => {
    b.addEventListener('click', () => {
      $$('#presetBg button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      state.bgColor = b.dataset.bg;
      $('#bgColor').value = b.dataset.bg;
      $('#bgHex').value = b.dataset.bg.toUpperCase();
      processImage();
    });
  });

  // Actions
  $('#applyBtn').addEventListener('click', () => processImage());
  $('#resetBtn').addEventListener('click', () => {
    state.blur = 1; state.threshold = 50; state.lineWidth = 1;
    state.contrast = 1; state.invert = false; state.transparent = false;
    state.bgColor = '#ffffff';
    $('#blur').value = 1; $('#blurVal').textContent = '1.0';
    $('#threshold').value = 50; $('#thresholdVal').textContent = '50';
    $('#lineWidth').value = 1; $('#lineWidthVal').textContent = '1.0';
    $('#contrast').value = 1; $('#contrastVal').textContent = '1.0';
    $('#invertSwitch').classList.remove('on');
    $('#transparentSwitch').classList.remove('on');
    $('#bgColor').value = '#ffffff';
    $('#bgHex').value = '#FFFFFF';
    $$('#presetBg button').forEach(b => b.classList.toggle('active', b.dataset.bg === '#ffffff'));
    processImage();
    toast('Reset to defaults');
  });

  $('#fullscreenBtn').addEventListener('click', () => {
    if (!document.fullscreenElement){
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  });

  // Export
  $('#pngBtn').addEventListener('click', exportPNG);
  $('#svgBtn').addEventListener('click', exportSVG);

  // Share
  $('#shareBtn').addEventListener('click', shareDialog);

  // Sidebar toggle (mobile)
  function checkMobile(){
    const isMobile = window.innerWidth <= 720;
    $('#sidebarToggle').style.display = isMobile ? '' : 'none';
    if (!isMobile) $('#sidebar').classList.remove('open');
  }
  window.addEventListener('resize', checkMobile);
  checkMobile();
  $('#sidebarToggle').addEventListener('click', () => {
    $('#sidebar').classList.toggle('open');
  });

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea, select')) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 's'){
      e.preventDefault();
      if (state.currentResult) exportPNG();
    }
    if (mod && e.key.toLowerCase() === 'o'){
      e.preventDefault();
      fileInput.click();
    }
    // Alt + H → Home
    if (e.altKey && !mod && e.key.toLowerCase() === 'h'){
      e.preventDefault();
      goHome();
    }
  });

  // Paste
  document.addEventListener('paste', e => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items){
      if (item.type.startsWith('image/')){
        const file = item.getAsFile();
        if (file){ handleFiles([file]); toast('Pasted from clipboard'); }
        return;
      }
    }
    // Try URL from clipboard
    const text = e.clipboardData.getData('text');
    if (text && /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|bmp)/i.test(text)){
      loadFromURL(text);
    }
  });

  // Drag-drop on drop zone
  setupDragDrop();
  setupSplitDragging();
}

/* ---------- HOME NAVIGATION ---------- */
const HOME_URL = 'homepage.html';

function goHome(){
  // Warn if there's unsaved work in progress
  if (state.originalData){
    const ok = window.confirm('Leave LineLab and go back to the homepage? Your current image will be discarded.');
    if (!ok) return;
  }
  window.location.href = HOME_URL;
}

function bindHomeButton(){
  const homeBtn = $('#homeBtn');
  if (!homeBtn) return;
  homeBtn.addEventListener('click', e => {
    e.preventDefault();
    goHome();
  });
}

function bindSlider(sel, prop, fmt, labelSel){
  const el = $(sel);
  const label = $(labelSel);
  let debounceTimer = null;
  el.addEventListener('input', () => {
    state[prop] = parseFloat(el.value);
    label.textContent = fmt(state[prop]);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => processImage(), 80);
  });
}

function applyAlgoDefaults(algo){
  const defaults = {
    sketch:    { blur: 1.0, threshold: 50, lineWidth: 1.0, contrast: 1.0 },
    pencil:    { blur: 1.5, threshold: 60, lineWidth: 1.2, contrast: 1.2 },
    edges:     { blur: 0.5, threshold: 30, lineWidth: 1.0, contrast: 1.0 },
    canny:     { blur: 1.5, threshold: 50, lineWidth: 1.0, contrast: 1.0 },
    xdog:      { blur: 1.0, threshold: 50, lineWidth: 1.0, contrast: 1.0 },
    threshold: { blur: 0.5, threshold: 50, lineWidth: 1.0, contrast: 1.0 },
  };
  const d = defaults[algo];
  if (!d) return;
  Object.assign(state, d);
  $('#blur').value = d.blur;         $('#blurVal').textContent = d.blur.toFixed(1);
  $('#threshold').value = d.threshold; $('#thresholdVal').textContent = Math.round(d.threshold);
  $('#lineWidth').value = d.lineWidth; $('#lineWidthVal').textContent = d.lineWidth.toFixed(1);
  $('#contrast').value = d.contrast;  $('#contrastVal').textContent = d.contrast.toFixed(1);
}

/* ============================================================
   DEMO IMAGE (procedural)
   ============================================================ */
function generateDemoImage(){
  const c = document.createElement('canvas');
  c.width = 800; c.height = 800;
  const ctx = c.getContext('2d');
  // Gradient sky
  const g = ctx.createLinearGradient(0, 0, 0, 800);
  g.addColorStop(0, '#87ceeb');
  g.addColorStop(1, '#ffe4b5');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 800, 800);
  // Sun
  ctx.fillStyle = '#ffd93b';
  ctx.beginPath();
  ctx.arc(560, 220, 80, 0, Math.PI * 2);
  ctx.fill();
  // Mountains
  ctx.fillStyle = '#5a7d9a';
  ctx.beginPath();
  ctx.moveTo(0, 600);
  ctx.lineTo(200, 380);
  ctx.lineTo(350, 520);
  ctx.lineTo(500, 340);
  ctx.lineTo(700, 500);
  ctx.lineTo(800, 420);
  ctx.lineTo(800, 800);
  ctx.lineTo(0, 800);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3d5a73';
  ctx.beginPath();
  ctx.moveTo(0, 700);
  ctx.lineTo(150, 540);
  ctx.lineTo(300, 650);
  ctx.lineTo(500, 520);
  ctx.lineTo(650, 660);
  ctx.lineTo(800, 580);
  ctx.lineTo(800, 800);
  ctx.lineTo(0, 800);
  ctx.closePath();
  ctx.fill();
  // Snow caps
  ctx.fillStyle = '#f0f4fc';
  ctx.beginPath();
  ctx.moveTo(500, 340);
  ctx.lineTo(470, 390);
  ctx.lineTo(500, 380);
  ctx.lineTo(530, 390);
  ctx.closePath();
  ctx.fill();
  // Trees
  ctx.fillStyle = '#2c4a3b';
  for (let i = 0; i < 5; i++){
    const x = 80 + i * 160;
    const y = 700;
    const h = 100 + Math.random() * 40;
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x - 30, y);
    ctx.lineTo(x + 30, y);
    ctx.closePath();
    ctx.fill();
  }
  // Ground
  ctx.fillStyle = '#4a7c59';
  ctx.fillRect(0, 750, 800, 50);
  // Texture noise
  const imgData = ctx.getImageData(0, 0, 800, 800);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4){
    const n = (Math.random() - 0.5) * 12;
    d[i] = clamp(d[i] + n, 0, 255);
    d[i+1] = clamp(d[i+1] + n, 0, 255);
    d[i+2] = clamp(d[i+2] + n, 0, 255);
  }
  ctx.putImageData(imgData, 0, 0);
  return c.toDataURL('image/png');
}

/* ============================================================
   EXPORT
   ============================================================ */
function exportPNG(){
  if (!state.currentResult){ toast('Nothing to export', 'warning'); return; }
  const src = state.resultCanvas;
  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext('2d');
  if (!state.transparent){
    // Fill background first (for consistency when transparent=false already has bg)
    ctx.fillStyle = state.invert ? '#000000' : state.bgColor;
    ctx.fillRect(0, 0, out.width, out.height);
  }
  ctx.drawImage(src, 0, 0);

  out.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `linelab-${state.algorithm}-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
    toast('PNG exported');
  }, 'image/png');
}

function exportSVG(){
  if (!state.currentResult){ toast('Nothing to export', 'warning'); return; }
  showProcessing(true, 'Tracing paths…', 30);

  setTimeout(() => {
    const src = state.resultCanvas;
    const w = src.width, h = src.height;
    const ctx = src.getContext('2d');
    const imgData = ctx.getImageData(0, 0, w, h);

    showProcessing(true, 'Binarizing…', 50);

    // Binarize: dark pixels = ink
    const n = w * h;
    const binary = new Uint8Array(n);
    const d = imgData.data;
    for (let i = 0; i < n; i++){
      const lum = 0.299 * d[i*4] + 0.587 * d[i*4+1] + 0.114 * d[i*4+2];
      const alpha = d[i*4+3];
      if (alpha < 20) continue;
      binary[i] = lum < 128 ? 1 : 0;
    }

    showProcessing(true, 'Extracting contours…', 70);

    // Extract pixel-boundary edges and merge collinear segments
    const hEdges = new Map(); // y -> [[x1, x2], ...]
    const vEdges = new Map(); // x -> [[y1, y2], ...]

    for (let y = 0; y < h; y++){
      for (let x = 0; x < w; x++){
        if (!binary[y * w + x]) continue;
        // Top edge
        if (y === 0 || !binary[(y - 1) * w + x]){
          if (!hEdges.has(y)) hEdges.set(y, []);
          hEdges.get(y).push([x, x + 1]);
        }
        // Bottom edge
        if (y === h - 1 || !binary[(y + 1) * w + x]){
          if (!hEdges.has(y + 1)) hEdges.set(y + 1, []);
          hEdges.get(y + 1).push([x, x + 1]);
        }
        // Left edge
        if (x === 0 || !binary[y * w + x - 1]){
          if (!vEdges.has(x)) vEdges.set(x, []);
          vEdges.get(x).push([y, y + 1]);
        }
        // Right edge
        if (x === w - 1 || !binary[y * w + x + 1]){
          if (!vEdges.has(x + 1)) vEdges.set(x + 1, []);
          vEdges.get(x + 1).push([y, y + 1]);
        }
      }
    }

    function mergeIntervals(intervals){
      if (!intervals.length) return [];
      intervals.sort((a, b) => a[0] - b[0]);
      const merged = [intervals[0].slice()];
      for (let i = 1; i < intervals.length; i++){
        const last = merged[merged.length - 1];
        if (intervals[i][0] <= last[1]) last[1] = Math.max(last[1], intervals[i][1]);
        else merged.push(intervals[i].slice());
      }
      return merged;
    }

    // Build path data
    let dStr = '';
    const strokeColor = state.invert ? '#ffffff' : '#000000';

    for (const [y, intervals] of hEdges){
      const merged = mergeIntervals(intervals);
      for (const [x1, x2] of merged){
        dStr += `M${x1} ${y}H${x2}`;
      }
    }
    for (const [x, intervals] of vEdges){
      const merged = mergeIntervals(intervals);
      for (const [y1, y2] of merged){
        dStr += `M${x} ${y1}V${y2}`;
      }
    }

    showProcessing(true, 'Building SVG…', 90);

    const bg = state.transparent ? 'none' : (state.invert ? '#000000' : state.bgColor);
    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">\n`;
    if (bg !== 'none') svg += `<rect width="${w}" height="${h}" fill="${bg}"/>\n`;
    svg += `<path d="${dStr}" fill="none" stroke="${strokeColor}" stroke-width="${state.lineWidth}" stroke-linecap="square" stroke-linejoin="miter"/>\n`;
    svg += `</svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `linelab-${state.algorithm}-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);

    showProcessing(false);
    const kb = Math.round(blob.size / 1024);
    toast(`SVG exported (${kb} KB)`);
  }, 40);
}

/* ============================================================
   SHARE DIALOG
   ============================================================ */
function shareDialog(){
  if (!state.currentResult){ toast('Nothing to share yet', 'warning'); return; }
  const link = `https://linelab.app/d/${Math.random().toString(36).slice(2, 10)}`;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(7,11,19,0.75);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.2s ease;';
  backdrop.innerHTML = `
    <div style="background:var(--bg-panel-2);border:1px solid var(--border-strong);border-radius:16px;box-shadow:0 24px 80px rgba(0,0,0,0.8);width:100%;max-width:460px;overflow:hidden;animation:modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1);">
      <div style="padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
        <h3 style="font-size:15px;font-weight:700;">Share line art</h3>
        <button class="dlg-close" style="width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;color:var(--text-3);"><i class="fas fa-times"></i></button>
      </div>
      <div style="padding:22px;">
        <div style="margin-bottom:16px;">
          <label style="display:block;font-size:11.5px;font-weight:600;color:var(--text-2);margin-bottom:6px;">Share link</label>
          <div style="display:flex;gap:8px;">
            <input type="text" readonly id="shareLink" value="${link}" style="flex:1;height:38px;padding:0 12px;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12.5px;outline:none;font-family:'SF Mono',monospace;" />
            <button id="copyLink" style="height:38px;padding:0 16px;border-radius:8px;background:linear-gradient(135deg,var(--accent),#8b7bf7);color:#fff;font-weight:600;font-size:12.5px;box-shadow:0 4px 18px rgba(108,92,231,0.35);"><i class="fas fa-copy"></i></button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <button class="share-social" data-net="twitter" style="padding:14px;border-radius:10px;background:var(--bg-input);border:1px solid var(--border);color:var(--text-2);font-weight:600;font-size:12.5px;display:flex;flex-direction:column;align-items:center;gap:6px;transition:var(--t);"><i class="fab fa-twitter" style="font-size:18px;color:#1da1f2;"></i> Twitter</button>
          <button class="share-social" data-net="facebook" style="padding:14px;border-radius:10px;background:var(--bg-input);border:1px solid var(--border);color:var(--text-2);font-weight:600;font-size:12.5px;display:flex;flex-direction:column;align-items:center;gap:6px;transition:var(--t);"><i class="fab fa-facebook" style="font-size:18px;color:#1877f2;"></i> Facebook</button>
          <button class="share-social" data-net="pinterest" style="padding:14px;border-radius:10px;background:var(--bg-input);border:1px solid var(--border);color:var(--text-2);font-weight:600;font-size:12.5px;display:flex;flex-direction:column;align-items:center;gap:6px;transition:var(--t);"><i class="fab fa-pinterest" style="font-size:18px;color:#e60023;"></i> Pinterest</button>
          <button class="share-social" data-net="download" style="padding:14px;border-radius:10px;background:var(--bg-input);border:1px solid var(--border);color:var(--text-2);font-weight:600;font-size:12.5px;display:flex;flex-direction:column;align-items:center;gap:6px;transition:var(--t);"><i class="fas fa-download" style="font-size:18px;color:var(--accent-2);"></i> Download</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();
  backdrop.querySelector('.dlg-close').addEventListener('click', close);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
  backdrop.querySelector('#copyLink').addEventListener('click', () => {
    const inp = backdrop.querySelector('#shareLink');
    inp.select();
    navigator.clipboard.writeText(inp.value).then(() => toast('Link copied'));
  });
  $$('.share-social', backdrop).forEach(b => {
    b.addEventListener('click', () => {
      const net = b.dataset.net;
      if (net === 'download'){ exportPNG(); close(); return; }
      toast(`Share to ${net} — link copied`);
      navigator.clipboard.writeText(link).catch(() => {});
    });
  });
}

/* ============================================================
   INIT
   ============================================================ */
function init(){
  setupUI();
  bindHomeButton();
  console.log('%c LineLab ', 'background:linear-gradient(135deg,#7c6cf0,#a29bfe);color:#fff;font-weight:700;padding:3px 10px;border-radius:6px;', 'Image to Line Art Studio — ready');
}

init();

/* Inject modal animation keyframes */
const styleEl = document.createElement('style');
styleEl.textContent = `
@keyframes modalIn{from{opacity:0;transform:scale(0.94) translateY(12px);}to{opacity:1;transform:scale(1) translateY(0);}}
.share-social:hover{border-color:var(--accent);color:var(--text);background:var(--accent-soft);}
.dlg-close:hover{background:var(--bg-hover);color:var(--text);}
`;
document.head.appendChild(styleEl);