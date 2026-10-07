/* ============================================================================
   ChromaLens AI — Object-Aware Line Art Colorizer
   Full pipeline: Detection → Segmentation → Semantic color matching → Render
   ============================================================================ */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     DOM
  ------------------------------------------------------------------ */
  const $ = (id) => document.getElementById(id);
  const dom = {
    dropzone: $('dropzone'),
    fileInput: $('fileInput'),
    inputStage: $('inputStage'),
    originalCanvas: $('originalCanvas'),
    colorCanvas: $('colorCanvas'),
    detectionOverlay: $('detectionOverlay'),
    emptyResult: $('emptyResult'),
    procOverlay: $('procOverlay'),
    procText: $('procText'),
    procSub: $('procSub'),
    progressFill: $('progressFill'),
    colorizeBtn: $('colorizeBtn'),
    resetBtn: $('resetBtn'),
    downloadBtn: $('downloadBtn'),
    toggleDetectionBtn: $('toggleDetectionBtn'),
    saturationRange: $('saturationRange'),
    saturationVal: $('saturationVal'),
    lineRange: $('lineRange'),
    lineVal: $('lineVal'),
    confidenceRange: $('confidenceRange'),
    confidenceVal: $('confidenceVal'),
    semanticRange: $('semanticRange'),
    semanticVal: $('semanticVal'),
    detectorDot: $('detectorDot'),
    detectorStatus: $('detectorStatus'),
    statusIndicator: $('statusIndicator'),
    statusMsg: $('statusMsg'),
    inputChip: $('inputChip'),
    outputChip: $('outputChip'),
    toastContainer: $('toastContainer'),
    detectionReport: $('detectionReport'),
    reportGrid: $('reportGrid'),
    reportCount: $('reportCount'),
    pipelineSteps: document.querySelectorAll('.pipe-step'),
  };

  const origCtx = dom.originalCanvas.getContext('2d', { willReadFrequently: true });
  const colorCtx = dom.colorCanvas.getContext('2d', { willReadFrequently: true });

  /* ------------------------------------------------------------------
     STATE
  ------------------------------------------------------------------ */
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

  /* ==================================================================
     SEMANTIC COLOR KNOWLEDGE BASE
     Maps COCO object classes to realistic / appropriate color ranges.
  ================================================================== */
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

  /* Fallback palettes when no object is detected */
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

  /* ------------------------------------------------------------------
     HELPERS
  ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------
     TOAST / STATUS
  ------------------------------------------------------------------ */
  function toast(message, type = 'info', duration = 3500) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icon = type === 'error'
      ? `<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
      : type === 'success'
      ? `<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
      : `<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    el.innerHTML = `${icon}<span>${message}</span>`;
    dom.toastContainer.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px)';
      setTimeout(() => el.remove(), 320);
    }, duration);
  }

  function setStatus(message, type = 'info') {
    dom.statusIndicator.className = `status-indicator ${type}`;
    dom.statusMsg.innerHTML = message;
  }

  function setInputChip(text, cls = '') {
    dom.inputChip.textContent = text;
    dom.inputChip.className = 'chip' + (cls ? ' ' + cls : '');
  }
  function setOutputChip(text, cls = '') {
    dom.outputChip.textContent = text;
    dom.outputChip.className = 'chip' + (cls ? ' ' + cls : '');
  }

  function setProgress(pct, text) {
    dom.progressFill.style.width = pct + '%';
    if (text) dom.procSub.textContent = text;
  }

  function setPipelineStep(step, mode) {
    dom.pipelineSteps.forEach(el => {
      const n = parseInt(el.dataset.step, 10);
      el.classList.remove('active', 'done');
      if (n === step && mode === 'active') el.classList.add('active');
      if (n === step && mode === 'done') el.classList.add('done');
    });
  }
  function resetPipeline() {
    dom.pipelineSteps.forEach(el => el.classList.remove('active', 'done'));
  }

  /* ==================================================================
     MODEL INITIALIZATION — COCO-SSD
  ================================================================== */
  async function initDetector() {
    try {
      if (typeof cocoSsd === 'undefined' || typeof tf === 'undefined') {
        throw new Error('TensorFlow.js or COCO-SSD not loaded');
      }
      dom.detectorDot.className = 'dot busy';
      dom.detectorStatus.textContent = 'Loading COCO-SSD…';
      setStatus('Loading object detection model (COCO-SSD)…', 'info');

      let model;
      try {
        model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      } catch (e) {
        console.warn('lite_mobilenet_v2 failed, falling back:', e);
        model = await cocoSsd.load({ base: 'mobilenet_v1' });
      }

      state.detector = model;
      state.detectorReady = true;
      dom.detectorDot.className = 'dot ready';
      dom.detectorStatus.textContent = 'Detector ready';
      setStatus('✅ Object detector ready. Upload line art to begin.', 'success');
      toast('Object detection model loaded', 'success');
    } catch (err) {
      console.error('Detector init failed:', err);
      dom.detectorDot.className = 'dot error';
      dom.detectorStatus.textContent = 'Detector unavailable';
      setStatus('⚠️ Object detector unavailable — using classical pipeline only.', 'error');
      toast('Detector unavailable, using CV fallback', 'error', 5000);
    }
  }

  /* ==================================================================
     FILE HANDLING
  ================================================================== */
  async function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Please upload an image file (PNG/JPG/WEBP/BMP).', 'error');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast('Image too large. Max 15 MB.', 'error');
      return;
    }

    setStatus(`Loading <strong>${escapeHtml(file.name)}</strong>…`, 'info');
    setInputChip('Loading…', 'active');
    setPipelineStep(1, 'active');

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

      dom.originalCanvas.width = w;
      dom.originalCanvas.height = h;
      dom.colorCanvas.width = w;
      dom.colorCanvas.height = h;

      origCtx.clearRect(0, 0, w, h);
      origCtx.drawImage(img, 0, 0, w, h);
      state.inputImageData = origCtx.getImageData(0, 0, w, h);

      dom.detectionOverlay.innerHTML = '';
      dom.detectionReport.classList.remove('visible');

      resetResultOnly();

      dom.dropzone.classList.add('hidden');
      dom.originalCanvas.classList.add('visible');
      dom.emptyResult.classList.remove('hidden');
      dom.colorCanvas.classList.remove('visible');
      setInputChip('Loaded', 'active');
      setOutputChip('Pending');
      dom.colorizeBtn.disabled = false;
      dom.resetBtn.disabled = false;
      dom.toggleDetectionBtn.disabled = true;
      dom.downloadBtn.disabled = true;
      state.detections = [];

      setPipelineStep(1, 'done');
      setStatus(`✅ <strong>${escapeHtml(file.name)}</strong> loaded (${w}×${h}). Press <strong>Run AI Pipeline</strong>.`, 'success');
      toast('Image loaded', 'success');
    } catch (err) {
      console.error(err);
      setStatus('❌ Failed to load image.', 'error');
      setInputChip('Awaiting upload');
      resetPipeline();
    }
  }

  function resetResultOnly() {
    state.resultImageData = null;
    state.hasResult = false;
    colorCtx.clearRect(0, 0, dom.colorCanvas.width, dom.colorCanvas.height);
    dom.colorCanvas.classList.remove('visible');
    dom.emptyResult.classList.remove('hidden');
    setOutputChip('Pending');
    dom.downloadBtn.disabled = true;
  }

  function resetAll() {
    if (state.processing) return;
    state.inputImage = null;
    state.inputImageData = null;
    state.detections = [];
    resetResultOnly();
    dom.detectionOverlay.innerHTML = '';
    dom.detectionReport.classList.remove('visible');

    dom.dropzone.classList.remove('hidden');
    dom.originalCanvas.classList.remove('visible');
    dom.colorCanvas.classList.remove('visible');
    dom.emptyResult.classList.remove('hidden');
    dom.originalCanvas.width = 600;
    dom.originalCanvas.height = 600;
    dom.colorCanvas.width = 600;
    dom.colorCanvas.height = 600;
    origCtx.clearRect(0, 0, 600, 600);
    colorCtx.clearRect(0, 0, 600, 600);
    dom.fileInput.value = '';

    dom.colorizeBtn.disabled = true;
    dom.resetBtn.disabled = true;
    dom.toggleDetectionBtn.disabled = true;
    dom.downloadBtn.disabled = true;

    setInputChip('Awaiting upload');
    setOutputChip('Pending');
    resetPipeline();
    setStatus('Upload a line art image to begin.', 'info');
  }

  /* ==================================================================
     STEP 2: OBJECT DETECTION
  ================================================================== */
  async function runDetection() {
    if (!state.detectorReady || !state.inputImage) return [];

    setPipelineStep(2, 'active');
    setProgress(15, 'Running object detection');
    dom.procText.textContent = 'Detecting objects…';

    await yieldToUI();

    try {
      const raw = await state.detector.detect(state.inputImage, 20, 0.15);

      const scaleX = dom.originalCanvas.width / (state.inputImage.naturalWidth || state.inputImage.width);
      const scaleY = dom.originalCanvas.height / (state.inputImage.naturalHeight || state.inputImage.height);

      const minConf = parseFloat(dom.confidenceRange.value);
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
      toast('Detection failed — using CV fallback', 'error');
      return [];
    }
  }

  /* ==================================================================
     STEP 3: EDGE + REGION SEGMENTATION
  ================================================================== */
  async function runSegmentation(imageData, detections, semanticWeight) {
    setPipelineStep(3, 'active');
    setProgress(35, 'Detecting edges & segmenting regions');
    dom.procText.textContent = 'Segmenting regions…';
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
    setProgress(65, 'Matching semantic colors');
    dom.procText.textContent = 'Matching colors…';
    setPipelineStep(3, 'done');
    setPipelineStep(4, 'active');

    /* ==========================================================
       STEP 4: ASSIGN COLORS — SEMANTIC + FALLBACK
    ========================================================== */
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
    setPipelineStep(4, 'done');

    return {
      regionId, isLine, regionSizes, regionAvgLum, regionColor, numRegions, gray,
    };
  }

  /* ==================================================================
     STEP 5: RENDER COLORIZED OUTPUT
  ================================================================== */
  async function renderColorized(segmentation, imageData, opts) {
    setPipelineStep(5, 'active');
    setProgress(85, 'Rendering final output');
    dom.procText.textContent = 'Rendering…';
    await yieldToUI();

    const { saturation, lineStrength } = opts;
    const w = imageData.width;
    const h = imageData.height;
    const src = imageData.data;
    const total = w * h;

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

  /* ==================================================================
     DETECTION OVERLAY RENDERING
  ================================================================== */
  function renderDetectionOverlay() {
    dom.detectionOverlay.innerHTML = '';
    if (!state.showDetections) return;

    const cw = dom.originalCanvas.width;
    const ch = dom.originalCanvas.height;

    const canvasRect = dom.originalCanvas.getBoundingClientRect();
    const stageRect = dom.inputStage.getBoundingClientRect();
    const offsetX = canvasRect.left - stageRect.left;
    const offsetY = canvasRect.top - stageRect.top;

    dom.detectionOverlay.style.left = offsetX + 'px';
    dom.detectionOverlay.style.top = offsetY + 'px';
    dom.detectionOverlay.style.width = canvasRect.width + 'px';
    dom.detectionOverlay.style.height = canvasRect.height + 'px';

    const scaleX = canvasRect.width / cw;
    const scaleY = canvasRect.height / ch;

    state.detections.forEach((det) => {
      const [x, y, w, h] = det.bbox;
      const box = document.createElement('div');
      box.className = 'det-box';
      box.style.left = (x * scaleX) + 'px';
      box.style.top = (y * scaleY) + 'px';
      box.style.width = (w * scaleX) + 'px';
      box.style.height = (h * scaleY) + 'px';

      const hue = (hashString(det.class) * 47) % 360;
      box.style.borderColor = `hsl(${hue}, 85%, 65%)`;
      box.style.boxShadow = `0 0 20px hsla(${hue}, 85%, 65%, 0.5), inset 0 0 20px hsla(${hue}, 85%, 65%, 0.1)`;

      const label = document.createElement('div');
      label.className = 'det-label';
      label.style.background = `hsl(${hue}, 75%, 55%)`;
      label.innerHTML = `${escapeHtml(det.class)}<span class="det-score">${(det.score * 100).toFixed(0)}%</span>`;
      box.appendChild(label);

      dom.detectionOverlay.appendChild(box);
    });
  }

  function hashString(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  /* ==================================================================
     DETECTION REPORT
  ================================================================== */
  function renderDetectionReport() {
    if (!state.detections.length) {
      dom.detectionReport.classList.remove('visible');
      return;
    }
    dom.detectionReport.classList.add('visible');
    dom.reportGrid.innerHTML = '';
    dom.reportCount.textContent = `${state.detections.length} object${state.detections.length > 1 ? 's' : ''}`;

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
      chip.className = 'det-chip';
      chip.innerHTML = `
        <span class="swatch" style="background:${rgbToCss(swatch)}"></span>
        <span class="obj-name">${escapeHtml(cls)}</span>
        <span class="score">${(avgScore * 100).toFixed(0)}%${list.length > 1 ? ' ×' + list.length : ''}</span>
      `;
      dom.reportGrid.appendChild(chip);
    });
  }

  /* ==================================================================
     MAIN PIPELINE
  ================================================================== */
  async function runPipeline() {
    if (state.processing || !state.inputImageData) return;

    state.processing = true;
    dom.colorizeBtn.disabled = true;
    dom.resetBtn.disabled = true;
    dom.downloadBtn.disabled = true;
    dom.toggleDetectionBtn.disabled = true;
    dom.procOverlay.classList.add('active');
    setOutputChip('Processing…', 'processing');
    setStatus('🚀 Running AI pipeline…', 'info');
    setProgress(0, 'Starting');
    resetPipeline();

    try {
      setPipelineStep(1, 'done');

      let detections = [];
      if (state.detectorReady) {
        detections = await runDetection();
        state.detections = detections;
        setPipelineStep(2, 'done');
        if (detections.length > 0) {
          renderDetectionOverlay();
          renderDetectionReport();
          dom.toggleDetectionBtn.disabled = false;
        } else {
          dom.detectionReport.classList.remove('visible');
        }
      } else {
        setPipelineStep(2, 'done');
      }

      setProgress(30, `${detections.length} object${detections.length !== 1 ? 's' : ''} detected`);

      const semanticWeight = parseFloat(dom.semanticRange.value);
      const seg = await runSegmentation(state.inputImageData, detections, semanticWeight);

      const opts = {
        saturation: parseFloat(dom.saturationRange.value),
        lineStrength: parseFloat(dom.lineRange.value),
      };
      const result = await renderColorized(seg, state.inputImageData, opts);

      colorCtx.putImageData(result, 0, 0);
      state.resultImageData = result;
      state.hasResult = true;

      dom.emptyResult.classList.add('hidden');
      dom.colorCanvas.classList.add('visible');
      setOutputChip('Complete', 'success');
      dom.downloadBtn.disabled = false;
      setPipelineStep(5, 'done');
      setProgress(100, 'Complete');

      const detMsg = detections.length > 0
        ? `<strong>${detections.length}</strong> object${detections.length > 1 ? 's' : ''} recognized &amp; colored`
        : 'Colored using semantic palette fallback';
      setStatus(`✅ Colorization complete. ${detMsg}.`, 'success');
      toast('Pipeline complete', 'success');
    } catch (err) {
      console.error('Pipeline error:', err);
      setStatus('❌ Pipeline failed. Please try a different image.', 'error');
      toast('Pipeline error: ' + err.message, 'error');
    } finally {
      state.processing = false;
      dom.colorizeBtn.disabled = false;
      dom.resetBtn.disabled = false;
      dom.toggleDetectionBtn.disabled = state.detections.length === 0;
      dom.procOverlay.classList.remove('active');
      setTimeout(() => setProgress(0, ''), 400);
    }
  }

  /* ==================================================================
     DOWNLOAD
  ================================================================== */
  function downloadResult() {
    if (!state.resultImageData) return;
    const tmp = document.createElement('canvas');
    tmp.width = state.resultImageData.width;
    tmp.height = state.resultImageData.height;
    tmp.getContext('2d').putImageData(state.resultImageData, 0, 0);
    const a = document.createElement('a');
    a.download = `chromalens_${Date.now()}.png`;
    a.href = tmp.toDataURL('image/png');
    a.click();
    toast('Download started', 'success');
  }

  /* ==================================================================
     EVENT BINDING
  ================================================================== */
  function bindEvents() {
    dom.dropzone.addEventListener('click', () => dom.fileInput.click());

    dom.fileInput.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) handleFile(f);
      e.target.value = '';
    });

    ['dragenter', 'dragover'].forEach(evt => {
      dom.inputStage.addEventListener(evt, (e) => {
        e.preventDefault(); e.stopPropagation();
        dom.dropzone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach(evt => {
      dom.inputStage.addEventListener(evt, (e) => {
        e.preventDefault(); e.stopPropagation();
        dom.dropzone.classList.remove('dragover');
      });
    });
    dom.inputStage.addEventListener('drop', (e) => {
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handleFile(f);
    });

    dom.colorizeBtn.addEventListener('click', runPipeline);
    dom.resetBtn.addEventListener('click', resetAll);
    dom.downloadBtn.addEventListener('click', downloadResult);

    dom.toggleDetectionBtn.addEventListener('click', () => {
      state.showDetections = !state.showDetections;
      dom.toggleDetectionBtn.querySelector('span').textContent = state.showDetections ? 'Hide detections' : 'Show detections';
      renderDetectionOverlay();
    });

    dom.saturationRange.addEventListener('input', () => {
      dom.saturationVal.textContent = parseFloat(dom.saturationRange.value).toFixed(2);
    });
    dom.lineRange.addEventListener('input', () => {
      dom.lineVal.textContent = parseFloat(dom.lineRange.value).toFixed(2);
    });
    dom.confidenceRange.addEventListener('input', () => {
      dom.confidenceVal.textContent = parseFloat(dom.confidenceRange.value).toFixed(2);
    });
    dom.semanticRange.addEventListener('input', () => {
      dom.semanticVal.textContent = parseFloat(dom.semanticRange.value).toFixed(2);
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (state.detections.length) renderDetectionOverlay();
      }, 150);
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !dom.colorizeBtn.disabled) {
        runPipeline();
      }
      if (e.key === 'Escape' && !state.processing) {
        resetAll();
      }
    });

    document.addEventListener('paste', (e) => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const f = item.getAsFile();
          if (f) { handleFile(f); break; }
        }
      }
    });
  }

  /* ==================================================================
     BOOT
  ================================================================== */
  function boot() {
    bindEvents();
    resetAll();
    setStatus('Initializing object detector…', 'info');
    dom.detectorDot.className = 'dot busy';
    dom.detectorStatus.textContent = 'Loading detector…';
    initDetector();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();