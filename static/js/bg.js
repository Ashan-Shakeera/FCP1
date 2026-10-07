"use strict";

/* =========================================================================
   0. Helpers
   ========================================================================= */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const pad2 = (n) => n.toString(16).padStart(2, "0");

const ICON = {
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`,
  unlock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.5-2"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
};

/* =========================================================================
   1. Color utilities
   ========================================================================= */
function rgbToHex(r, g, b) { return "#" + pad2(r) + pad2(g) + pad2(b); }

function hexToRgb(hex) {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastColor(hex) { return luminance(hex) > 0.42 ? "#0b0d11" : "#ffffff"; }

function colorDistance(a, b) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const rMean = (A.r + B.r) / 2;
  const dr = A.r - B.r, dg = A.g - B.g, db = A.b - B.b;
  return Math.sqrt((2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db);
}

function randomHex() {
  const h = Math.floor(Math.random() * 360);
  const s = 45 + Math.random() * 45;
  const l = 35 + Math.random() * 40;
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

/* =========================================================================
   2. DOM
   ========================================================================= */
const viewport     = $("#viewport");
const canvas       = $("#canvas");
const ctx          = canvas.getContext("2d", { willReadFrequently: true });
const emptyState   = $("#empty");
const loupe        = $("#loupe");
const loupeCanvas  = $("#loupeCanvas");
const loupeCtx     = loupeCanvas.getContext("2d");
const hoverBadge   = $("#hoverBadge");
const zoombar      = $("#zoombar");
const zoomLabel    = $("#zoomLabel");
const toolbar      = $("#toolbar");
const brushCursor  = $("#brushCursor");
const statusPill   = $("#statusPill");
const statusText   = $("#statusText");
const progressTrack= $("#progressTrack");
const progressFill = $("#progressFill");
const marqueeOverlay = $("#marqueeOverlay");
const marqueeSize  = $("#marqueeSize");

const fileInput    = $("#fileInput");
const uploadBtn    = $("#uploadBtn");
const urlBtn       = $("#urlBtn");
const pasteBtn     = $("#pasteBtn");
const eyeDropperBtn= $("#eyeDropperBtn");

const pickedSwatch = $("#pickedSwatch").querySelector("i");
const vHex = $("#vHex"), vRgb = $("#vRgb"), vHsl = $("#vHsl");

const paletteEl    = $("#palette");
const countRange   = $("#countRange");
const countOut     = $("#countOut");
const regenBtn     = $("#regenBtn");
const shuffleBtn   = $("#shuffleBtn");
const sortBtn      = $("#sortBtn");
const unlockAllBtn = $("#unlockAll");

const exportCssBtn = $("#exportCss");
const exportJsonBtn= $("#exportJson");
const exportHexBtn = $("#exportHex");
const exportPngBtn = $("#exportPng");

const historyCard  = $("#historyCard");
const historyEl    = $("#history");

const urlModal     = $("#urlModal");
const urlInput     = $("#urlInput");
const urlCancel    = $("#urlCancel");
const urlLoad      = $("#urlLoad");

const toastEl      = $("#toast");

const aiRemoveBtn     = $("#aiRemoveBtn");
const toleranceRange  = $("#toleranceRange");
const toleranceOut    = $("#toleranceOut");
const featherRange    = $("#featherRange");
const featherOut      = $("#featherOut");
const brushSizeRange  = $("#brushSizeRange");
const brushSizeOut    = $("#brushSizeOut");
const brushHardRange  = $("#brushHardRange");
const brushHardOut    = $("#brushHardOut");
const customBgPicker  = $("#customBgPicker");
const downloadPngBtn  = $("#downloadPngBtn");
const downloadJpgBtn  = $("#downloadJpgBtn");
const copyPngBtn      = $("#copyPngBtn");
const fillBgCheckbox  = $("#fillBgCheckbox");
const statSize        = $("#statSize");
const statRemoved     = $("#statRemoved");
const statRemaining   = $("#statRemaining");

const toolWand    = $("#toolWand");
const toolQuickSelect = $("#toolQuickSelect");
const toolMarquee = $("#toolMarquee");
const toolBrush   = $("#toolBrush");
const toolRestore = $("#toolRestore");
const undoBtn     = $("#undoBtn");
const redoBtn     = $("#redoBtn");
const resetBgBtn  = $("#resetBgBtn");

/* =========================================================================
   3. State
   ========================================================================= */
const state = {
  mode: "palette",
  img: null,
  pixels: null,
  palette: [],
  picked: null,
  history: [],
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  fitScale: 1,
  readable: false,

  bg: {
    originalData: null,
    originalAlpha: null,
    displayData: null,
    mask: null,
    history: [],
    historyIndex: -1,
    tool: "brush",
    tolerance: 32,
    feather: 0,
    brushSize: 40,
    brushHardness: 80,
    bgPreview: "transparent",
    bgColor: "#4f8cff",
    quickSelectSeed: null,
    quickSelectAccum: null,
    marquee: null,
  },
};

/* =========================================================================
   4. Toast / status
   ========================================================================= */
let toastTimer = null;
function toast(message, type = "") {
  toastEl.textContent = message;
  toastEl.className = "toast show" + (type ? " " + type : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

function showStatus(text, { progress = null, error = false } = {}) {
  statusPill.hidden = false;
  statusPill.classList.toggle("error", error);
  statusText.textContent = text;
  if (progress !== null) {
    progressTrack.hidden = false;
    progressFill.style.width = Math.round(progress * 100) + "%";
  } else {
    progressTrack.hidden = true;
  }
  const spinner = statusPill.querySelector(".spinner");
  spinner.style.display = error ? "none" : "";
}
function hideStatus() { statusPill.hidden = true; }

/* =========================================================================
   5. Clipboard
   ========================================================================= */
async function copyText(text, label = "Copied!") {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else throw new Error("no clipboard api");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:-1000px;left:-1000px;opacity:0;";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch {}
    ta.remove();
  }
  toast(label, "success");
}

/* =========================================================================
   6. Image loading
   ========================================================================= */
const MAX_DIMENSION = 4000;

function loadFromFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    toast("That file is not an image.", "error"); return;
  }
  const reader = new FileReader();
  reader.onload = (e) => loadFromSrc(e.target.result);
  reader.onerror = () => toast("Could not read that file.", "error");
  reader.readAsDataURL(file);
}

function loadFromSrc(src, { crossOrigin = false } = {}) {
  const img = new Image();
  if (crossOrigin) img.crossOrigin = "anonymous";
  img.onload = () => {
    state.img = img;
    drawImageToCanvas(img);
    initBgState();
    fitToView();
    buildPalette();
    updateStats();
    updateUndoRedoButtons();
    toast("Image loaded", "success");
  };
  img.onerror = () => toast("Could not load that image.", "error");
  img.src = src;
}

function drawImageToCanvas(img) {
  let w = img.naturalWidth  || img.width;
  let h = img.naturalHeight || img.height;
  const longest = Math.max(w, h);
  if (longest > MAX_DIMENSION) {
    const k = MAX_DIMENSION / longest;
    w = Math.round(w * k); h = Math.round(h * k);
  }
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  canvas.classList.remove("hidden");
  emptyState.classList.add("hidden");
  zoombar.hidden = false;

  try {
    state.pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    state.readable = true;
  } catch {
    state.pixels = null; state.readable = false;
    toast("Image loaded, but colors can't be read (CORS).", "error");
  }
}

/* =========================================================================
   7. BG state init
   ========================================================================= */
function initBgState() {
  const w = canvas.width, h = canvas.height;
  let imageData;
  try { imageData = ctx.getImageData(0, 0, w, h); }
  catch {
    state.bg.originalData = null;
    state.bg.displayData = null;
    state.bg.mask = null;
    return;
  }
  state.bg.originalData = new ImageData(new Uint8ClampedArray(imageData.data), w, h);
  state.bg.displayData  = new ImageData(new Uint8ClampedArray(imageData.data), w, h);
  state.bg.mask = new Uint8Array(w * h);
  state.bg.originalAlpha = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = imageData.data[i * 4 + 3];
    state.bg.mask[i] = a;
    state.bg.originalAlpha[i] = a;
  }
  state.bg.history = [];
  state.bg.historyIndex = -1;
  state.bg.quickSelectSeed = null;
  state.bg.quickSelectAccum = null;
  state.bg.marquee = null;
  pushBgHistory();
}

/* =========================================================================
   8. Transform
   ========================================================================= */
function applyTransform() {
  clampOffsets();
  canvas.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.scale})`;
  canvas.classList.toggle("pixelated", state.scale >= 3);
  zoomLabel.textContent = Math.round(state.scale * 100) + "%";
}

function clampOffsets() {
  const vw = viewport.clientWidth, vh = viewport.clientHeight;
  const w = canvas.width * state.scale, h = canvas.height * state.scale;
  if (w <= vw) state.offsetX = (vw - w) / 2;
  else state.offsetX = clamp(state.offsetX, vw - w, 0);
  if (h <= vh) state.offsetY = (vh - h) / 2;
  else state.offsetY = clamp(state.offsetY, vh - h, 0);
}

function fitToView() {
  if (!state.img) return;
  const vw = viewport.clientWidth, vh = viewport.clientHeight, pad = 32;
  const s = Math.min((vw - pad) / canvas.width, (vh - pad) / canvas.height);
  state.fitScale = s;
  state.scale = s;
  state.offsetX = 0; state.offsetY = 0;
  applyTransform();
}

function zoomAt(clientX, clientY, factor) {
  if (!state.img) return;
  const rect = viewport.getBoundingClientRect();
  const mx = clientX - rect.left, my = clientY - rect.top;
  const newScale = clamp(state.scale * factor, 0.02, 40);
  const ix = (mx - state.offsetX) / state.scale;
  const iy = (my - state.offsetY) / state.scale;
  state.scale = newScale;
  state.offsetX = mx - ix * newScale;
  state.offsetY = my - iy * newScale;
  applyTransform();
}

function zoomCentered(factor) {
  const r = viewport.getBoundingClientRect();
  zoomAt(r.left + r.width / 2, r.top + r.height / 2, factor);
}
function zoomTo(s) {
  const r = viewport.getBoundingClientRect();
  zoomAt(r.left + r.width / 2, r.top + r.height / 2, s / state.scale);
}

/* =========================================================================
   9. Coords / pixels
   ========================================================================= */
function toImageCoords(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const x = Math.floor((clientX - rect.left) * (canvas.width  / rect.width));
  const y = Math.floor((clientY - rect.top ) * (canvas.height / rect.height));
  return { x, y };
}

function pixelAt(x, y) {
  if (!state.pixels) return null;
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return null;
  const o = (y * canvas.width + x) * 4;
  const d = state.pixels;
  return {
    r: d[o], g: d[o + 1], b: d[o + 2], a: d[o + 3],
    hex: rgbToHex(d[o], d[o + 1], d[o + 2]),
  };
}

function displayPixelAt(x, y) {
  const d = state.bg.displayData && state.bg.displayData.data;
  if (!d) return null;
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return null;
  const o = (y * canvas.width + x) * 4;
  return { r: d[o], g: d[o + 1], b: d[o + 2], a: d[o + 3] };
}

/* =========================================================================
   10. Loupe
   ========================================================================= */
const LOUPE_ZOOM = 9;

function updateLoupe(ix, iy) {
  const size = loupeCanvas.width;
  const srcSize = size / LOUPE_ZOOM;
  const half = srcSize / 2;
  const sx = ix - half, sy = iy - half;

  loupeCtx.imageSmoothingEnabled = false;
  loupeCtx.clearRect(0, 0, size, size);
  loupeCtx.fillStyle = "#000";
  loupeCtx.fillRect(0, 0, size, size);

  try { loupeCtx.drawImage(canvas, sx, sy, srcSize, srcSize, 0, 0, size, size); }
  catch { return; }

  const cell = size / srcSize;
  loupeCtx.strokeStyle = "rgba(255,255,255,0.13)";
  loupeCtx.lineWidth = 1;
  loupeCtx.beginPath();
  for (let i = 1; i < srcSize; i++) {
    const p = Math.round(i * cell) + 0.5;
    loupeCtx.moveTo(p, 0); loupeCtx.lineTo(p, size);
    loupeCtx.moveTo(0, p); loupeCtx.lineTo(size, p);
  }
  loupeCtx.stroke();

  const cx = Math.round(half * cell), cy = Math.round(half * cell);
  loupeCtx.strokeStyle = "#ffffff"; loupeCtx.lineWidth = 2;
  loupeCtx.strokeRect(cx + 0.5, cy + 0.5, Math.ceil(cell), Math.ceil(cell));
  loupeCtx.strokeStyle = "rgba(0,0,0,0.55)"; loupeCtx.lineWidth = 1;
  loupeCtx.strokeRect(cx - 1.5, cy - 1.5, Math.ceil(cell) + 4, Math.ceil(cell) + 4);
}

function positionLoupe(clientX, clientY) {
  const rect = viewport.getBoundingClientRect();
  const size = 148, margin = 18;
  let left = clientX - rect.left + margin;
  let top  = clientY - rect.top  - size - margin;
  if (left + size > rect.width - 6) left = clientX - rect.left - size - margin;
  if (top < 6) top = clientY - rect.top + margin;
  left = clamp(left, 6, rect.width  - size - 6);
  top  = clamp(top,  6, rect.height - size - 6);
  loupe.style.left = left + "px";
  loupe.style.top  = top + "px";
}

function hideLoupe() {
  loupe.hidden = true;
  hoverBadge.hidden = true;
}

/* =========================================================================
   11. Picking (palette mode)
   ========================================================================= */
function pickColor(x, y) {
  const px = pixelAt(x, y);
  if (!px) return;
  if (px.a < 125) { toast("That pixel is transparent.", "error"); return; }
  state.picked = px;
  pickedSwatch.style.background = px.hex;
  vHex.textContent = px.hex.toUpperCase();
  vRgb.textContent = `${px.r}, ${px.g}, ${px.b}`;
  const hsl = rgbToHsl(px.r, px.g, px.b);
  vHsl.textContent = `${hsl.h}°, ${hsl.s}%, ${hsl.l}%`;
  copyText(px.hex.toUpperCase(), `Picked ${px.hex.toUpperCase()}`);
  addToHistory(px.hex);
}

function addToHistory(hex) {
  const upper = hex.toUpperCase();
  state.history = [upper, ...state.history.filter((h) => h !== upper)].slice(0, 14);
  renderHistory();
}

function renderHistory() {
  if (!state.history.length) { historyCard.hidden = true; return; }
  historyCard.hidden = false;
  historyEl.innerHTML = "";
  state.history.forEach((hex) => {
    const b = document.createElement("button");
    b.className = "history-swatch";
    b.style.background = hex;
    b.title = `${hex} — click to copy`;
    b.addEventListener("click", () => copyText(hex, `Copied ${hex}`));
    historyEl.appendChild(b);
  });
}

/* =========================================================================
   12. Palette extraction
   ========================================================================= */
function extractColors(count) {
  let data;
  try { data = ctx.getImageData(0, 0, canvas.width, canvas.height).data; }
  catch { return []; }
  if (!data) return [];

  const totalPixels = data.length / 4;
  const MAX_SAMPLES = 24000;
  const step = Math.max(1, Math.floor(totalPixels / MAX_SAMPLES));

  const samples = [];
  for (let i = 0; i < totalPixels; i += step) {
    const o = i * 4;
    if (data[o + 3] < 125) continue;
    samples.push([data[o], data[o + 1], data[o + 2]]);
  }
  if (samples.length === 0) return [];

  let buckets = [samples];

  const channelRanges = (bucket) => {
    let minR = 255, minG = 255, minB = 255, maxR = 0, maxG = 0, maxB = 0;
    for (let i = 0; i < bucket.length; i++) {
      const p = bucket[i];
      if (p[0] < minR) minR = p[0];
      if (p[1] < minG) minG = p[1];
      if (p[2] < minB) minB = p[2];
      if (p[0] > maxR) maxR = p[0];
      if (p[1] > maxG) maxG = p[1];
      if (p[2] > maxB) maxB = p[2];
    }
    return [maxR - minR, maxG - minG, maxB - minB];
  };

  while (buckets.length < count) {
    let bestIdx = -1, bestScore = -1;
    for (let i = 0; i < buckets.length; i++) {
      const b = buckets[i];
      if (b.length < 2) continue;
      const r = channelRanges(b);
      const score = Math.max(r[0], r[1], r[2]);
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
    if (bestIdx === -1 || bestScore < 2) break;
    const bucket = buckets[bestIdx];
    const r = channelRanges(bucket);
    const channel = r.indexOf(Math.max(r[0], r[1], r[2]));
    bucket.sort((a, b) => a[channel] - b[channel]);
    const mid = bucket.length >> 1;
    const left = bucket.slice(0, mid), right = bucket.slice(mid);
    if (!left.length || !right.length) break;
    buckets.splice(bestIdx, 1, left, right);
  }

  const results = buckets.filter((b) => b.length > 0).map((b) => {
    let r = 0, g = 0, bl = 0;
    for (let i = 0; i < b.length; i++) { r += b[i][0]; g += b[i][1]; bl += b[i][2]; }
    const n = b.length;
    return { hex: rgbToHex(Math.round(r / n), Math.round(g / n), Math.round(bl / n)), population: n };
  });

  results.sort((a, b) => b.population - a.population);

  const unique = [];
  for (const c of results) {
    if (!unique.some((u) => colorDistance(u, c.hex) < 28)) unique.push(c.hex);
  }
  return unique;
}

/* =========================================================================
   13. Palette management
   ========================================================================= */
function buildPalette() {
  const n = Number(countRange.value);
  if (!state.readable) {
    state.palette = Array.from({ length: n }, () => ({ hex: randomHex(), locked: false }));
    renderPalette();
    return;
  }
  const colors = extractColors(n);
  state.palette = Array.from({ length: n }, (_, i) => ({
    hex: colors[i] || randomHex(),
    locked: false,
  }));
  renderPalette();
}

function regenerate() {
  if (!state.readable) {
    state.palette = state.palette.map((c) => c.locked ? c : { hex: randomHex(), locked: false });
    renderPalette(); return;
  }
  const n = state.palette.length;
  const lockedHexes = state.palette.filter((c) => c.locked).map((c) => c.hex);
  const candidates = extractColors(n + lockedHexes.length * 3);
  const pool = candidates.filter((hex) => !lockedHexes.some((l) => colorDistance(l, hex) < 55));

  const used = [...lockedHexes];
  let poolIdx = 0;

  state.palette = state.palette.map((c) => {
    if (c.locked) return c;
    let hex = null;
    while (poolIdx < pool.length) {
      const candidate = pool[poolIdx++];
      if (!used.some((u) => colorDistance(u, candidate) < 40)) { hex = candidate; break; }
    }
    if (!hex) hex = randomHex();
    used.push(hex);
    return { hex, locked: false };
  });
  renderPalette();
}

function shufflePalette() {
  const arr = [...state.palette];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  state.palette = arr;
  renderPalette();
}

function sortPalette() {
  state.palette = [...state.palette].sort((a, b) => luminance(a.hex) - luminance(b.hex));
  renderPalette();
}

/* =========================================================================
   14. Palette render
   ========================================================================= */
function renderPalette() {
  paletteEl.innerHTML = "";
  state.palette.forEach((color, index) => {
    const row = document.createElement("div");
    row.className = "palette-row";
    row.style.background = color.hex;
    row.style.color = contrastColor(color.hex);
    row.style.animationDelay = (index * 28) + "ms";

    const rgb = hexToRgb(color.hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

    const main = document.createElement("button");
    main.className = "swatch-main";
    main.type = "button";
    main.title = `Click to copy ${color.hex.toUpperCase()}`;
    main.innerHTML =
      `<span class="swatch-hex">${color.hex.toUpperCase()}</span>` +
      `<span class="swatch-sub">${rgb.r}, ${rgb.g}, ${rgb.b} · hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)</span>`;

    main.addEventListener("click", () => copyText(color.hex.toUpperCase(), `Copied ${color.hex.toUpperCase()}`));

    const actions = document.createElement("div");
    actions.className = "swatch-actions";

    const lockBtn = document.createElement("button");
    lockBtn.type = "button";
    lockBtn.className = "icon-btn" + (color.locked ? " on" : "");
    lockBtn.title = color.locked ? "Unlock color" : "Lock color";
    lockBtn.innerHTML = color.locked ? ICON.lock : ICON.unlock;
    lockBtn.addEventListener("click", (e) => { e.stopPropagation(); color.locked = !color.locked; renderPalette(); });

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "icon-btn";
    copyBtn.title = "Copy HEX";
    copyBtn.innerHTML = ICON.copy;
    copyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      copyText(color.hex.toUpperCase(), `Copied ${color.hex.toUpperCase()}`);
      copyBtn.innerHTML = ICON.check;
      setTimeout(() => { copyBtn.innerHTML = ICON.copy; }, 900);
    });

    actions.append(lockBtn, copyBtn);
    row.append(main, actions);
    paletteEl.appendChild(row);
  });
}

/* =========================================================================
   15. Palette export
   ========================================================================= */
function paletteIsEmpty() {
  if (!state.palette.length) { toast("No palette to export yet.", "error"); return true; }
  return false;
}

function exportCSS() {
  if (paletteIsEmpty()) return;
  const lines = state.palette.map((c, i) => `  --color-${i + 1}: ${c.hex.toUpperCase()};`);
  copyText(`:root {\n${lines.join("\n")}\n}`, "CSS variables copied!");
}
function exportJSON() {
  if (paletteIsEmpty()) return;
  const data = { palette: state.palette.map((c) => {
    const { r, g, b } = hexToRgb(c.hex);
    return { hex: c.hex.toUpperCase(), rgb: { r, g, b }, hsl: rgbToHsl(r, g, b) };
  })};
  copyText(JSON.stringify(data, null, 2), "JSON copied!");
}
function exportHexList() {
  if (paletteIsEmpty()) return;
  copyText(state.palette.map((c) => c.hex.toUpperCase()).join(", "), "HEX list copied!");
}
function exportPalettePNG() {
  if (paletteIsEmpty()) return;
  const n = state.palette.length;
  const W = Math.max(900, n * 180), H = 480, STRIP_H = H - 110;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  g.fillStyle = "#0e1014"; g.fillRect(0, 0, W, H);
  const bw = W / n;
  state.palette.forEach((col, i) => {
    const x = i * bw;
    g.fillStyle = col.hex; g.fillRect(x, 0, bw + 1, STRIP_H);
    g.save();
    g.fillStyle = contrastColor(col.hex);
    g.font = "700 26px ui-monospace, Menlo, Consolas, monospace";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(col.hex.toUpperCase(), x + bw / 2, STRIP_H / 2);
    g.restore();
  });
  g.fillStyle = "#161a21"; g.fillRect(0, STRIP_H, W, H - STRIP_H);
  g.fillStyle = "#8b95a6"; g.font = "500 20px system-ui, sans-serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("Palette extracted with Image Studio", W / 2, STRIP_H + (H - STRIP_H) / 2);
  c.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `palette-${Date.now()}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast("Palette image downloaded!", "success");
  }, "image/png");
}

/* =========================================================================
   16. BG rendering & history
   ========================================================================= */
function renderBgCanvas() {
  const d = state.bg.displayData;
  if (!d) return;
  ctx.putImageData(d, 0, 0);
}

function pushBgHistory() {
  if (!state.bg.mask) return;
  const copy = new Uint8Array(state.bg.mask);
  state.bg.history = state.bg.history.slice(0, state.bg.historyIndex + 1);
  state.bg.history.push(copy);
  if (state.bg.history.length > 15) state.bg.history.shift();
  state.bg.historyIndex = state.bg.history.length - 1;
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  undoBtn.disabled = state.bg.historyIndex <= 0;
  redoBtn.disabled = state.bg.historyIndex >= state.bg.history.length - 1;
}

function applyMaskFromHistory() {
  const mask = state.bg.history[state.bg.historyIndex];
  if (!mask) return;
  state.bg.mask.set(mask);
  const d = state.bg.displayData.data;
  for (let i = 0; i < mask.length; i++) d[i * 4 + 3] = mask[i];
  renderBgCanvas();
  updateStats();
}

function undoBg() {
  if (state.bg.historyIndex <= 0) return;
  state.bg.historyIndex--;
  applyMaskFromHistory();
  updateUndoRedoButtons();
}
function redoBg() {
  if (state.bg.historyIndex >= state.bg.history.length - 1) return;
  state.bg.historyIndex++;
  applyMaskFromHistory();
  updateUndoRedoButtons();
}
function resetBg() {
  if (!state.bg.originalAlpha) return;
  state.bg.mask.set(state.bg.originalAlpha);
  const d = state.bg.displayData.data;
  for (let i = 0; i < state.bg.mask.length; i++) d[i * 4 + 3] = state.bg.mask[i];
  renderBgCanvas();
  pushBgHistory();
  updateStats();
  toast("Reset to original", "success");
}

function updateStats() {
  if (!state.bg.mask) {
    statSize.textContent = "—"; statRemoved.textContent = "—"; statRemaining.textContent = "—";
    return;
  }
  const total = state.bg.mask.length;
  let removed = 0;
  for (let i = 0; i < total; i++) if (state.bg.mask[i] < 125) removed++;
  statSize.textContent = `${canvas.width} × ${canvas.height}`;
  statRemoved.textContent = `${removed.toLocaleString()} (${((removed / total) * 100).toFixed(1)}%)`;
  statRemaining.textContent = `${(total - removed).toLocaleString()}`;
}

/* =========================================================================
   17. Feathering (blur alpha)
   ========================================================================= */
function featherAlpha(radius) {
  if (radius <= 0 || !state.bg.mask) return;
  const w = canvas.width, h = canvas.height;
  const src = state.bg.mask;
  const temp = new Uint8Array(src.length);
  const out = new Uint8Array(src.length);

  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    for (let x = -radius; x <= radius; x++) sum += src[row + clamp(x, 0, w - 1)];
    const win = 2 * radius + 1;
    for (let x = 0; x < w; x++) {
      temp[row + x] = Math.round(sum / win);
      const xOut = clamp(x - radius, 0, w - 1);
      const xIn  = clamp(x + radius + 1, 0, w - 1);
      sum += src[row + xIn] - src[row + xOut];
    }
  }

  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -radius; y <= radius; y++) sum += temp[clamp(y, 0, h - 1) * w + x];
    const win = 2 * radius + 1;
    for (let y = 0; y < h; y++) {
      out[y * w + x] = Math.round(sum / win);
      const yOut = clamp(y - radius, 0, h - 1);
      const yIn  = clamp(y + radius + 1, 0, h - 1);
      sum += temp[yIn * w + x] - temp[yOut * w + x];
    }
  }

  state.bg.mask.set(out);
  const d = state.bg.displayData.data;
  for (let i = 0; i < out.length; i++) d[i * 4 + 3] = out[i];
  renderBgCanvas();
  updateStats();
}

/* =========================================================================
   18. Redraw helper
   ========================================================================= */
function redrawRegion(x0, y0, x1, y1) {
  const w = canvas.width, h = canvas.height;
  const cx0 = Math.max(0, Math.floor(x0));
  const cy0 = Math.max(0, Math.floor(y0));
  const cx1 = Math.min(w, Math.ceil(x1));
  const cy1 = Math.min(h, Math.ceil(y1));
  if (cx1 <= cx0 || cy1 <= cy0) return;
  const rw = cx1 - cx0, rh = cy1 - cy0;
  const d = state.bg.displayData.data;
  const sub = ctx.createImageData(rw, rh);
  for (let yy = 0; yy < rh; yy++) {
    const srcStart = ((cy0 + yy) * w + cx0) * 4;
    sub.data.set(d.subarray(srcStart, srcStart + rw * 4), yy * rw * 4);
  }
  ctx.putImageData(sub, cx0, cy0);
}

/* =========================================================================
   19. Magic Wand
   ========================================================================= */
function magicWand(startX, startY) {
  if (!state.bg.displayData) return;
  const w = canvas.width, h = canvas.height;
  if (startX < 0 || startY < 0 || startX >= w || startY >= h) return;

  const d = state.bg.displayData.data;
  const o0 = (startY * w + startX) * 4;
  const r0 = d[o0], g0 = d[o0 + 1], b0 = d[o0 + 2];

  const tol = state.bg.tolerance * 4.41;
  const tolSq = tol * tol;

  const visited = new Uint8Array(w * h);
  const stack = [startX, startY];
  let minX = startX, maxX = startX, minY = startY, maxY = startY;
  let changed = false;

  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const idx = y * w + x;
    if (visited[idx]) continue;
    visited[idx] = 1;
    const o = idx * 4;
    const dr = d[o] - r0, dg = d[o + 1] - g0, db = d[o + 2] - b0;
    if (dr * dr + dg * dg + db * db > tolSq) continue;
    if (d[o + 3] !== 0) {
      d[o + 3] = 0;
      state.bg.mask[idx] = 0;
      changed = true;
    }
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    stack.push(x + 1, y);
    stack.push(x - 1, y);
    stack.push(x, y + 1);
    stack.push(x, y - 1);
  }

  if (!changed) { toast("No matching pixels — try increasing tolerance.", "error"); return; }

  if (state.bg.feather > 0) featherAlpha(state.bg.feather);
  else redrawRegion(minX, minY, maxX + 1, maxY + 1);

  pushBgHistory();
  updateStats();
}

/* =========================================================================
   20. Quick Selection tool
   ========================================================================= */
function quickSelectSeedAt(x, y) {
  const px = displayPixelAt(x, y);
  if (!px || px.a < 125) return null;
  return { r: px.r, g: px.g, b: px.b };
}

function quickSelectStamp(x, y) {
  const seed = state.bg.quickSelectSeed;
  if (!seed || !state.bg.displayData) return;

  const w = canvas.width, h = canvas.height;
  const d = state.bg.displayData.data;
  const radius = state.bg.brushSize / 2;
  const r2 = radius * radius;
  const hard = state.bg.brushHardness / 100;
  const innerR = radius * hard;
  const innerR2 = innerR * innerR;
  const tol = state.bg.tolerance * 4.41;
  const tolSq = tol * tol;

  const x0 = Math.max(0, Math.floor(x - radius));
  const x1 = Math.min(w - 1, Math.ceil(x + radius));
  const y0 = Math.max(0, Math.floor(y - radius));
  const y1 = Math.min(h - 1, Math.ceil(y + radius));

  let changed = false;

  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const dx = px - x, dy = py - y;
      const dd = dx * dx + dy * dy;
      if (dd > r2) continue;

      const idx = py * w + px;
      const o = idx * 4;

      if (d[o + 3] === 0) continue;

      const dr = d[o] - seed.r;
      const dg = d[o + 1] - seed.g;
      const db = d[o + 2] - seed.b;
      if (dr * dr + dg * dg + db * db > tolSq) continue;

      let strength;
      if (dd <= innerR2) strength = 1;
      else {
        const t = (Math.sqrt(dd) - innerR) / Math.max(1, radius - innerR);
        strength = clamp(1 - t, 0, 1);
      }

      const newA = Math.round(d[o + 3] * (1 - strength));
      if (newA === d[o + 3]) continue;
      d[o + 3] = newA;
      state.bg.mask[idx] = newA;
      if (state.bg.quickSelectAccum) state.bg.quickSelectAccum[idx] = 1;
      changed = true;
    }
  }

  if (changed) redrawRegion(x0, y0, x1 + 1, y1 + 1);
}

function quickSelectLine(x0, y0, x1, y1) {
  const radius = state.bg.brushSize / 2;
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const step = Math.max(1, radius * 0.35);
  const steps = Math.max(1, Math.ceil(dist / step));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    quickSelectStamp(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t));
  }
}

/* =========================================================================
   21. Box Erase (marquee)
   ========================================================================= */
function updateMarqueeOverlay() {
  const m = state.bg.marquee;
  if (!m) { marqueeOverlay.classList.remove("show"); return; }

  const x = Math.min(m.x0, m.x1);
  const y = Math.min(m.y0, m.y1);
  const w = Math.abs(m.x1 - m.x0);
  const h = Math.abs(m.y1 - m.y0);

  const sx = state.offsetX + x * state.scale;
  const sy = state.offsetY + y * state.scale;
  const sw = w * state.scale;
  const sh = h * state.scale;

  marqueeOverlay.classList.add("show");
  marqueeOverlay.style.left = sx + "px";
  marqueeOverlay.style.top  = sy + "px";
  marqueeOverlay.style.width  = sw + "px";
  marqueeOverlay.style.height = sh + "px";
  marqueeSize.textContent = `${Math.round(w)} × ${Math.round(h)}`;
}

function hideMarqueeOverlay() {
  marqueeOverlay.classList.remove("show");
}

function eraseRect(m) {
  const w = canvas.width, h = canvas.height;
  const cx0 = Math.max(0, Math.floor(Math.min(m.x0, m.x1)));
  const cy0 = Math.max(0, Math.floor(Math.min(m.y0, m.y1)));
  const cx1 = Math.min(w, Math.ceil(Math.max(m.x0, m.x1)));
  const cy1 = Math.min(h, Math.ceil(Math.max(m.y0, m.y1)));
  if (cx1 <= cx0 || cy1 <= cy0) return false;

  const d = state.bg.displayData.data;
  let changed = false;
  for (let y = cy0; y < cy1; y++) {
    for (let x = cx0; x < cx1; x++) {
      const idx = y * w + x;
      const o = idx * 4;
      if (d[o + 3] !== 0) {
        d[o + 3] = 0;
        state.bg.mask[idx] = 0;
        changed = true;
      }
    }
  }
  if (!changed) return false;
  redrawRegion(cx0, cy0, cx1, cy1);
  return true;
}

/* =========================================================================
   22. Brush (paint erase / restore)
   ========================================================================= */
function stampBrush(x, y, radius, hardness, erase) {
  const w = canvas.width, h = canvas.height;
  const d = state.bg.displayData.data;
  const original = state.bg.originalAlpha;

  const x0 = Math.max(0, Math.floor(x - radius));
  const x1 = Math.min(w - 1, Math.ceil(x + radius));
  const y0 = Math.max(0, Math.floor(y - radius));
  const y1 = Math.min(h - 1, Math.ceil(y + radius));

  const r2 = radius * radius;
  const innerR = radius * (hardness / 100);
  const innerR2 = innerR * innerR;

  let changed = false;

  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const dx = px - x, dy = py - y;
      const dd = dx * dx + dy * dy;
      if (dd > r2) continue;

      let strength;
      if (dd <= innerR2) strength = 1;
      else {
        const t = (Math.sqrt(dd) - innerR) / Math.max(1, radius - innerR);
        strength = clamp(1 - t, 0, 1);
      }

      const idx = py * w + px;
      const o = idx * 4;
      const target = erase ? 0 : (original[idx] || 255);
      const current = d[o + 3];
      const next = Math.round(current + (target - current) * strength);
      if (next === current) continue;
      d[o + 3] = next;
      state.bg.mask[idx] = next;
      changed = true;
    }
  }

  if (changed) redrawRegion(x0, y0, x1 + 1, y1 + 1);
}

function paintLine(x0, y0, x1, y1, radius, hardness, erase) {
  const dx = x1 - x0, dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / Math.max(1, radius * 0.25)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    stampBrush(Math.round(x0 + dx * t), Math.round(y0 + dy * t), radius, hardness, erase);
  }
}

/* =========================================================================
   23. AI background removal
   ========================================================================= */
async function aiRemoveBackground() {
  if (!state.img) { toast("Load an image first.", "error"); return; }

  aiRemoveBtn.disabled = true;
  showStatus("Loading AI model…", { progress: 0 });

  try {
    const mod = await import("https://cdn.jsdelivr.net/npm/@imgly/background-removal@1/+esm");

    showStatus("Processing image…", { progress: 0.05 });

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));

    const resultBlob = await mod.removeBackground(blob, {
      progress: (key, current, total) => {
        const pct = total > 0 ? current / total : 0;
        const label = key.includes("fetch")
          ? `Downloading model… ${current}/${total}`
          : key.includes("compute")
            ? "Analysing image…"
            : `${key} — ${current}/${total}`;
        showStatus(label, { progress: pct });
      },
    });

    showStatus("Applying mask…", { progress: 0.98 });

    const url = URL.createObjectURL(resultBlob);
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });

    const tc = document.createElement("canvas");
    tc.width = canvas.width; tc.height = canvas.height;
    const tg = tc.getContext("2d", { willReadFrequently: true });
    tg.drawImage(img, 0, 0, tc.width, tc.height);
    const rd = tg.getImageData(0, 0, tc.width, tc.height);

    const d = state.bg.displayData.data;
    for (let i = 0; i < state.bg.mask.length; i++) {
      const a = rd.data[i * 4 + 3];
      state.bg.mask[i] = a;
      d[i * 4 + 3] = a;
    }

    if (state.bg.feather > 0) featherAlpha(state.bg.feather);
    renderBgCanvas();
    pushBgHistory();
    updateStats();

    URL.revokeObjectURL(url);
    hideStatus();
    toast("Background removed!", "success");
  } catch (err) {
    console.error(err);
    showStatus("AI removal failed: " + (err.message || err), { error: true });
    setTimeout(hideStatus, 4000);
    toast("AI removal failed — try the manual tools.", "error");
  } finally {
    aiRemoveBtn.disabled = false;
  }
}

/* =========================================================================
   24. BG export
   ========================================================================= */
function compositeBg() {
  const c = document.createElement("canvas");
  c.width = canvas.width; c.height = canvas.height;
  const g = c.getContext("2d");

  if (fillBgCheckbox.checked) {
    if (state.bg.bgPreview === "white") g.fillStyle = "#ffffff";
    else if (state.bg.bgPreview === "black") g.fillStyle = "#000000";
    else if (state.bg.bgPreview === "custom") g.fillStyle = state.bg.bgColor;
    else g.fillStyle = "#ffffff";
    g.fillRect(0, 0, c.width, c.height);
  }

  g.drawImage(canvas, 0, 0);
  return c;
}

function downloadBG(asJpg = false) {
  if (!state.img) { toast("Load an image first.", "error"); return; }
  const c = compositeBg();
  const mime = asJpg ? "image/jpeg" : "image/png";
  const ext  = asJpg ? "jpg" : "png";
  c.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `image-studio-${Date.now()}.${ext}`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast(`Downloaded ${ext.toUpperCase()}!`, "success");
  }, mime, 0.92);
}

async function copyPngToClipboard() {
  if (!state.img) { toast("Load an image first.", "error"); return; }
  if (!navigator.clipboard || !window.ClipboardItem) {
    toast("Clipboard image copy not supported here.", "error"); return;
  }
  try {
    const c = compositeBg();
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    toast("PNG copied to clipboard!", "success");
  } catch (err) {
    toast("Copy failed: " + err.message, "error");
  }
}

/* =========================================================================
   25. Pointer interaction
   ========================================================================= */
const pointer = {
  down: false,
  moved: false,
  startX: 0, startY: 0,
  offsetX0: 0, offsetY0: 0,
  pointerId: null,
  lastPaintX: 0,
  lastPaintY: 0,
  activeTool: null,
};

function isBgMode() { return state.mode === "bg"; }
function isBrushTool() {
  return isBgMode() && (state.bg.tool === "brush" || state.bg.tool === "restore");
}
function isWandTool() { return isBgMode() && state.bg.tool === "wand"; }
function isQuickSelectTool() { return isBgMode() && state.bg.tool === "quickselect"; }
function isMarqueeTool() { return isBgMode() && state.bg.tool === "marquee"; }

viewport.addEventListener("pointerdown", (e) => {
  if (!state.img) return;
  if (e.button !== 0) return;

  const pt = toImageCoords(e.clientX, e.clientY);
  if (!pt) return;

  if (isWandTool()) {
    magicWand(pt.x, pt.y);
    return;
  }

  if (isQuickSelectTool()) {
    const seed = quickSelectSeedAt(pt.x, pt.y);
    if (!seed) { toast("Start on a non-transparent pixel.", "error"); return; }
    state.bg.quickSelectSeed = seed;
    state.bg.quickSelectAccum = new Uint8Array(canvas.width * canvas.height);
    pointer.down = true;
    pointer.moved = false;
    pointer.pointerId = e.pointerId;
    pointer.activeTool = "quickselect";
    pointer.lastPaintX = pt.x;
    pointer.lastPaintY = pt.y;
    quickSelectStamp(pt.x, pt.y);
    try { viewport.setPointerCapture(e.pointerId); } catch {}
    return;
  }

  if (isMarqueeTool()) {
    pointer.down = true;
    pointer.moved = false;
    pointer.pointerId = e.pointerId;
    pointer.activeTool = "marquee";
    state.bg.marquee = { x0: pt.x, y0: pt.y, x1: pt.x, y1: pt.y };
    updateMarqueeOverlay();
    try { viewport.setPointerCapture(e.pointerId); } catch {}
    return;
  }

  if (isBrushTool()) {
    const erase = state.bg.tool === "brush" ? !e.shiftKey : e.shiftKey;
    const radius = state.bg.brushSize / 2;
    pointer.down = true;
    pointer.moved = false;
    pointer.pointerId = e.pointerId;
    pointer.activeTool = "brush";
    pointer.lastPaintX = pt.x;
    pointer.lastPaintY = pt.y;
    stampBrush(pt.x, pt.y, radius, state.bg.brushHardness, erase);
    try { viewport.setPointerCapture(e.pointerId); } catch {}
    return;
  }

  pointer.down = true;
  pointer.moved = false;
  pointer.startX = e.clientX;
  pointer.startY = e.clientY;
  pointer.offsetX0 = state.offsetX;
  pointer.offsetY0 = state.offsetY;
  pointer.pointerId = e.pointerId;
  pointer.activeTool = "pan";
  try { viewport.setPointerCapture(e.pointerId); } catch {}
});

viewport.addEventListener("pointermove", (e) => {
  if (!state.img) return;

  const pt = toImageCoords(e.clientX, e.clientY);

  if (isBrushTool() || isQuickSelectTool()) {
    brushCursor.classList.add("show");
    const isQS = isQuickSelectTool();
    brushCursor.classList.toggle("erase", !isQS && state.bg.tool === "brush" && !e.shiftKey);
    brushCursor.classList.toggle("restore", !isQS && (state.bg.tool === "restore" || (state.bg.tool === "brush" && e.shiftKey)));
    brushCursor.classList.toggle("quickselect", isQS);
    const sizePx = state.bg.brushSize * state.scale;
    brushCursor.style.width = sizePx + "px";
    brushCursor.style.height = sizePx + "px";
    const rect = viewport.getBoundingClientRect();
    brushCursor.style.left = (e.clientX - rect.left) + "px";
    brushCursor.style.top  = (e.clientY - rect.top)  + "px";
  } else {
    brushCursor.classList.remove("show");
  }

  if (pointer.down && pointer.activeTool === "quickselect" && pt) {
    quickSelectLine(pointer.lastPaintX, pointer.lastPaintY, pt.x, pt.y);
    pointer.lastPaintX = pt.x;
    pointer.lastPaintY = pt.y;
    pointer.moved = true;
    return;
  }

  if (pointer.down && pointer.activeTool === "marquee" && pt) {
    state.bg.marquee.x1 = pt.x;
    state.bg.marquee.y1 = pt.y;
    updateMarqueeOverlay();
    pointer.moved = true;
    return;
  }

  if (pointer.down && pointer.activeTool === "brush" && pt) {
    const erase = state.bg.tool === "brush" ? !e.shiftKey : e.shiftKey;
    const radius = state.bg.brushSize / 2;
    paintLine(pointer.lastPaintX, pointer.lastPaintY, pt.x, pt.y, radius, state.bg.brushHardness, erase);
    pointer.lastPaintX = pt.x;
    pointer.lastPaintY = pt.y;
    pointer.moved = true;
    return;
  }

  if (pointer.down && pointer.activeTool === "pan") {
    const dx = e.clientX - pointer.startX;
    const dy = e.clientY - pointer.startY;
    if (!pointer.moved && Math.hypot(dx, dy) > 4) {
      pointer.moved = true;
      viewport.style.cursor = "grabbing";
      hideLoupe();
    }
    if (pointer.moved) {
      state.offsetX = pointer.offsetX0 + dx;
      state.offsetY = pointer.offsetY0 + dy;
      applyTransform();
      if (state.bg.marquee) updateMarqueeOverlay();
      return;
    }
  }

  if (state.mode !== "palette") { hideLoupe(); return; }
  if (!pt) { hideLoupe(); return; }
  const { x, y } = pt;
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) { hideLoupe(); return; }
  const px = pixelAt(x, y);
  if (!px) { hideLoupe(); return; }

  updateLoupe(x, y);
  positionLoupe(e.clientX, e.clientY);
  loupe.hidden = false;

  hoverBadge.textContent = px.a < 125 ? "transparent" : px.hex.toUpperCase();
  hoverBadge.style.background = px.a < 125 ? "#1a1e26" : px.hex;
  hoverBadge.style.color = px.a < 125 ? "#8b95a6" : contrastColor(px.hex);
  hoverBadge.hidden = false;

  const rect = viewport.getBoundingClientRect();
  hoverBadge.style.left = (e.clientX - rect.left) + "px";
  hoverBadge.style.top  = (e.clientY - rect.top)  + "px";
});

function endPointer(e) {
  if (!pointer.down) return;

  const activeTool = pointer.activeTool;
  const wasDrag = pointer.moved;

  pointer.down = false;
  pointer.moved = false;
  viewport.style.cursor = "";
  pointer.activeTool = null;

  try { viewport.releasePointerCapture(e.pointerId); } catch {}

  if (activeTool === "quickselect") {
    state.bg.quickSelectSeed = null;
    state.bg.quickSelectAccum = null;
    pushBgHistory();
    updateStats();
    return;
  }

  if (activeTool === "marquee") {
    const m = state.bg.marquee;
    state.bg.marquee = null;
    hideMarqueeOverlay();
    if (m) {
      const did = eraseRect(m);
      if (did) {
        pushBgHistory();
        updateStats();
        toast("Area erased", "success");
      }
    }
    return;
  }

  if (activeTool === "brush") {
    pushBgHistory();
    updateStats();
    return;
  }

  if (activeTool === "pan" && !wasDrag) {
    const pt = toImageCoords(e.clientX, e.clientY);
    if (!pt) return;
    if (pt.x < 0 || pt.y < 0 || pt.x >= canvas.width || pt.y >= canvas.height) return;
    if (state.mode === "palette") pickColor(pt.x, pt.y);
  }
}

viewport.addEventListener("pointerup", endPointer);
viewport.addEventListener("pointercancel", endPointer);
viewport.addEventListener("pointerleave", () => {
  hideLoupe();
  brushCursor.classList.remove("show");
});

viewport.addEventListener("wheel", (e) => {
  if (!state.img) return;
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
  zoomAt(e.clientX, e.clientY, factor);
  if (state.bg.marquee) updateMarqueeOverlay();
}, { passive: false });

viewport.addEventListener("dblclick", (e) => {
  if (!state.img) return;
  const atFit = Math.abs(state.scale - state.fitScale) < 0.01;
  if (atFit) zoomTo(1);
  else fitToView();
});

/* =========================================================================
   26. Drag & drop
   ========================================================================= */
["dragenter", "dragover"].forEach((type) => {
  viewport.addEventListener(type, (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    viewport.classList.add("dragover");
  });
});
["dragleave", "drop"].forEach((type) => {
  viewport.addEventListener(type, (e) => {
    e.preventDefault();
    if (type === "dragleave" && viewport.contains(e.relatedTarget)) return;
    viewport.classList.remove("dragover");
  });
});
viewport.addEventListener("drop", (e) => {
  const dt = e.dataTransfer;
  if (!dt) return;
  if (dt.files && dt.files.length) { loadFromFile(dt.files[0]); return; }
  const url = dt.getData("text/uri-list") || dt.getData("text/plain");
  if (url && /^https?:\/\//i.test(url.trim())) { loadFromSrc(url.trim(), { crossOrigin: true }); return; }
  toast("Couldn't read that drop.", "error");
});
["dragover", "drop"].forEach((type) => {
  window.addEventListener(type, (e) => { if (!viewport.contains(e.target)) e.preventDefault(); });
});

/* =========================================================================
   27. Clipboard paste
   ========================================================================= */
window.addEventListener("paste", (e) => {
  const tag = (e.target && e.target.tagName) || "";
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  for (const item of items) {
    if (item.type && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) { loadFromFile(file); e.preventDefault(); return; }
    }
  }
  const text = e.clipboardData.getData("text");
  if (text && /^https?:\/\/\S+$/i.test(text.trim())) {
    loadFromSrc(text.trim(), { crossOrigin: true });
    e.preventDefault();
  }
});

/* =========================================================================
   28. EyeDropper
   ========================================================================= */
if ("EyeDropper" in window) {
  eyeDropperBtn.hidden = false;
  eyeDropperBtn.addEventListener("click", async () => {
    try {
      const dropper = new window.EyeDropper();
      const result = await dropper.open();
      const hex = result.sRGBHex.toUpperCase();
      const { r, g, b } = hexToRgb(hex);
      state.picked = { hex: hex.toLowerCase(), r, g, b };
      pickedSwatch.style.background = hex;
      vHex.textContent = hex;
      vRgb.textContent = `${r}, ${g}, ${b}`;
      const hsl = rgbToHsl(r, g, b);
      vHsl.textContent = `${hsl.h}°, ${hsl.s}%, ${hsl.l}%`;
      addToHistory(hex);
      copyText(hex, `Picked ${hex}`);
    } catch {}
  });
}

/* =========================================================================
   29. Mode & tool switching
   ========================================================================= */
function setMode(mode) {
  state.mode = mode;
  $$(".mode-tab").forEach((t) => t.classList.toggle("active", t.dataset.mode === mode));
  $$(".side-panel").forEach((p) => p.classList.toggle("active", p.dataset.panel === mode));

  toolbar.hidden = mode !== "bg";
  if (mode !== "bg") {
    brushCursor.classList.remove("show");
    hideLoupe();
    hideMarqueeOverlay();
  }

  updateCanvasCursor();
  viewport.style.cursor = "";
}

function updateCanvasCursor() {
  canvas.classList.remove("tool-brush", "tool-marquee", "tool-wand", "tool-quickselect");
  if (!isBgMode()) return;
  if (isBrushTool()) canvas.classList.add("tool-brush");
  else if (isMarqueeTool()) canvas.classList.add("tool-marquee");
  else if (isWandTool()) canvas.classList.add("tool-wand");
  else if (isQuickSelectTool()) canvas.classList.add("tool-quickselect");
}

function setTool(tool) {
  state.bg.tool = tool;
  [toolWand, toolQuickSelect, toolMarquee, toolBrush, toolRestore].forEach((b) => {
    b.classList.toggle("active", b.dataset.tool === tool);
  });
  $$("[data-tool-card]").forEach((c) => {
    c.classList.toggle("active", c.dataset.toolCard === tool);
  });
  updateCanvasCursor();
  if (!isBrushTool() && !isQuickSelectTool()) brushCursor.classList.remove("show");
}

$$(".mode-tab").forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));

toolWand.addEventListener("click", () => setTool("wand"));
toolQuickSelect.addEventListener("click", () => setTool("quickselect"));
toolMarquee.addEventListener("click", () => setTool("marquee"));
toolBrush.addEventListener("click", () => setTool("brush"));
toolRestore.addEventListener("click", () => setTool("restore"));

$$("[data-tool-card]").forEach((c) => {
  c.addEventListener("click", () => setTool(c.dataset.toolCard));
});

/* =========================================================================
   30. Sliders & controls
   ========================================================================= */
toleranceRange.addEventListener("input", () => {
  state.bg.tolerance = Number(toleranceRange.value);
  toleranceOut.textContent = toleranceRange.value;
});
featherRange.addEventListener("input", () => {
  state.bg.feather = Number(featherRange.value);
  featherOut.textContent = featherRange.value;
});
brushSizeRange.addEventListener("input", () => {
  state.bg.brushSize = Number(brushSizeRange.value);
  brushSizeOut.textContent = brushSizeRange.value;
});
brushHardRange.addEventListener("input", () => {
  state.bg.brushHardness = Number(brushHardRange.value);
  brushHardOut.textContent = brushHardRange.value;
});

$$(".bg-option").forEach((opt) => {
  opt.addEventListener("click", (e) => {
    if (e.target.classList.contains("color-picker-inline")) return;
    const mode = opt.dataset.bg;
    state.bg.bgPreview = mode;
    $$(".bg-option").forEach((o) => o.classList.toggle("active", o === opt));
    viewport.classList.remove("bg-white", "bg-black");
    viewport.style.background = "";
    if (mode === "white") viewport.classList.add("bg-white");
    else if (mode === "black") viewport.classList.add("bg-black");
    else if (mode === "custom") viewport.style.background = state.bg.bgColor;
  });
});

customBgPicker.addEventListener("input", () => {
  state.bg.bgColor = customBgPicker.value;
  state.bg.bgPreview = "custom";
  $$(".bg-option").forEach((o) => o.classList.toggle("active", o.dataset.bg === "custom"));
  viewport.classList.remove("bg-white", "bg-black");
  viewport.style.background = state.bg.bgColor;
});

aiRemoveBtn.addEventListener("click", aiRemoveBackground);
undoBtn.addEventListener("click", undoBg);
redoBtn.addEventListener("click", redoBg);
resetBgBtn.addEventListener("click", resetBg);
downloadPngBtn.addEventListener("click", () => downloadBG(false));
downloadJpgBtn.addEventListener("click", () => downloadBG(true));
copyPngBtn.addEventListener("click", copyPngToClipboard);

/* =========================================================================
   31. Palette events
   ========================================================================= */
uploadBtn.addEventListener("click", () => fileInput.click());
$("#emptyUpload").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (file) loadFromFile(file);
  fileInput.value = "";
});

function openUrlModal() {
  urlModal.hidden = false;
  urlInput.value = "";
  setTimeout(() => urlInput.focus(), 40);
}
function closeUrlModal() { urlModal.hidden = true; }

urlBtn.addEventListener("click", openUrlModal);
$("#emptyUrl").addEventListener("click", openUrlModal);
urlCancel.addEventListener("click", closeUrlModal);
urlModal.addEventListener("click", (e) => { if (e.target === urlModal) closeUrlModal(); });
urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") urlLoad.click();
  if (e.key === "Escape") closeUrlModal();
});
urlLoad.addEventListener("click", () => {
  const url = urlInput.value.trim();
  if (!url) { toast("Please enter a URL.", "error"); return; }
  if (!/^https?:\/\//i.test(url)) { toast("URL must start with http:// or https://", "error"); return; }
  closeUrlModal();
  loadFromSrc(url, { crossOrigin: true });
});

pasteBtn.addEventListener("click", async () => {
  if (!navigator.clipboard || !navigator.clipboard.read) {
    toast("Use Ctrl+V to paste an image.", "error"); return;
  }
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imageType = item.types.find((t) => t.startsWith("image/"));
      if (imageType) {
        const blob = await item.getType(imageType);
        loadFromFile(new File([blob], "pasted.png", { type: imageType }));
        return;
      }
    }
    const textItem = items.find((i) => i.types.includes("text/plain"));
    if (textItem) {
      const blob = await textItem.getType("text/plain");
      const text = (await blob.text()).trim();
      if (/^https?:\/\/\S+$/i.test(text)) { loadFromSrc(text, { crossOrigin: true }); return; }
    }
    toast("No image found in the clipboard.", "error");
  } catch { toast("Use Ctrl+V to paste an image.", "error"); }
});

$("#zoomIn").addEventListener("click", () => zoomCentered(1.25));
$("#zoomOut").addEventListener("click", () => zoomCentered(1 / 1.25));
$("#zoomFit").addEventListener("click", fitToView);
$("#zoomReset").addEventListener("click", () => zoomTo(1));

countRange.addEventListener("input", () => { countOut.textContent = countRange.value; });
countRange.addEventListener("change", () => {
  const n = Number(countRange.value);
  const old = state.palette;
  const next = [];
  for (let i = 0; i < n; i++) next.push(old[i] ? old[i] : { hex: randomHex(), locked: false });
  state.palette = next;
  if (state.readable) regenerate(); else renderPalette();
});

regenBtn.addEventListener("click", regenerate);
shuffleBtn.addEventListener("click", shufflePalette);
sortBtn.addEventListener("click", sortPalette);
unlockAllBtn.addEventListener("click", () => {
  state.palette.forEach((c) => (c.locked = false));
  renderPalette();
});

exportCssBtn.addEventListener("click", exportCSS);
exportJsonBtn.addEventListener("click", exportJSON);
exportHexBtn.addEventListener("click", exportHexList);
exportPngBtn.addEventListener("click", exportPalettePNG);

$$(".value-row").forEach((row) => {
  row.addEventListener("click", () => {
    if (!state.picked) { toast("Pick a color first.", "error"); return; }
    const kind = row.dataset.copy;
    const px = state.picked;
    if (kind === "hex") copyText(px.hex.toUpperCase(), "HEX copied!");
    else if (kind === "rgb") copyText(`rgb(${px.r}, ${px.g}, ${px.b})`, "RGB copied!");
    else if (kind === "hsl") {
      const hsl = rgbToHsl(px.r, px.g, px.b);
      copyText(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, "HSL copied!");
    }
  });
});

/* =========================================================================
   32. Keyboard shortcuts
   ========================================================================= */
window.addEventListener("keydown", (e) => {
  const tag = (e.target && e.target.tagName) || "";
  const typing = tag === "INPUT" || tag === "TEXTAREA";

  if (e.key === "Escape" && !urlModal.hidden) { closeUrlModal(); return; }
  if (typing) return;

  if (isBgMode()) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) redoBg(); else undoBg();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      redoBg();
      return;
    }
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      if (e.key.toLowerCase() === "w") { setTool("wand"); return; }
      if (e.key.toLowerCase() === "q") { setTool("quickselect"); return; }
      if (e.key.toLowerCase() === "e") { setTool("marquee"); return; }
      if (e.key.toLowerCase() === "b") { setTool("brush"); return; }
      if (e.key.toLowerCase() === "r") { setTool("restore"); return; }
      if (e.key === "[") {
        brushSizeRange.value = Math.max(4, Number(brushSizeRange.value) - 4);
        brushSizeRange.dispatchEvent(new Event("input"));
        return;
      }
      if (e.key === "]") {
        brushSizeRange.value = Math.min(300, Number(brushSizeRange.value) + 4);
        brushSizeRange.dispatchEvent(new Event("input"));
        return;
      }
    }
  }

  if (state.mode === "palette") {
    if (e.code === "Space" && state.img) {
      e.preventDefault();
      regenerate();
      return;
    }
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") return;

  if (e.key.toLowerCase() === "f" && state.img) { fitToView(); return; }
  if (e.key === "1" && state.img) { zoomTo(1); return; }
  if ((e.key === "+" || e.key === "=") && state.img) { zoomCentered(1.25); return; }
  if (e.key === "-" && state.img) { zoomCentered(1 / 1.25); return; }

  if (e.altKey && /^[1-9]$/.test(e.key)) {
    const idx = Number(e.key) - 1;
    const c = state.palette[idx];
    if (c) copyText(c.hex.toUpperCase(), `Copied ${c.hex.toUpperCase()}`);
  }
});

/* =========================================================================
   33. Resize
   ========================================================================= */
let resizeTimer = null;
const ro = new ResizeObserver(() => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!state.img) return;
    applyTransform();
    if (state.bg.marquee) updateMarqueeOverlay();
  }, 60);
});
ro.observe(viewport);
window.addEventListener("resize", () => {
  if (!state.img) return;
  applyTransform();
  if (state.bg.marquee) updateMarqueeOverlay();
});

/* =========================================================================
   34. Init
   ========================================================================= */
(function init() {
  countOut.textContent = countRange.value;
  toleranceOut.textContent = toleranceRange.value;
  featherOut.textContent = featherRange.value;
  brushSizeOut.textContent = brushSizeRange.value;
  brushHardOut.textContent = brushHardRange.value;

  state.bg.tolerance = Number(toleranceRange.value);
  state.bg.feather = Number(featherRange.value);
  state.bg.brushSize = Number(brushSizeRange.value);
  state.bg.brushHardness = Number(brushHardRange.value);

  applyTransform();
  renderPalette();
  setMode("palette");
  setTool("brush");

  setTimeout(() => toast("Drop an image, paste with Ctrl+V, or click Upload"), 700);
})();