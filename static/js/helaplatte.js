(function () {
  'use strict';

  /* =========================================================
     0. SPLASH SCREEN TIMING
     ---------------------------------------------------------
     👉👉  EDIT THESE TWO NUMBERS TO RETIME THE SPLASH SCREEN  👈👈
     ========================================================= */
  const SPLASH_HOLD_MS  = 550;   // how long the logo stays on screen before it fades
  const SPLASH_FADE_MS  = 450;   // how long the fade-out animation lasts
  const SPLASH_INTRO_MS = 600;   // logo pop-in duration (leave as-is, or tweak to taste)

  (function runSplash() {
    const splash = document.getElementById('splash');
    if (!splash) return;

    // push the two numbers into CSS so markup + script never drift apart
    const root = document.documentElement;
    root.style.setProperty('--splash-fade',  SPLASH_FADE_MS + 'ms');
    root.style.setProperty('--splash-intro', SPLASH_INTRO_MS + 'ms');

    document.body.classList.add('splash-lock');

    const hide = () => {
      splash.classList.add('is-hidden');
      document.body.classList.remove('splash-lock');
      window.setTimeout(() => splash.remove(), SPLASH_FADE_MS + 120);
    };

    // intro animation → hold → fade
    window.setTimeout(hide, SPLASH_INTRO_MS + SPLASH_HOLD_MS);
  })();

  /* =========================================================
     LOGO FALLBACK (if logo.png is missing / blocked)
     ========================================================= */
  function attachLogoFallback(imgId, fallbackId) {
    const img = document.getElementById(imgId);
    const fb  = document.getElementById(fallbackId);
    if (!img || !fb) return;

    const fail = () => { img.hidden = true; fb.hidden = false; };

    img.addEventListener('error', fail, { once: true });
    if (img.complete && img.naturalWidth === 0) fail();
  }

  attachLogoFallback('splashLogo', 'splashFallback');
  attachLogoFallback('headerLogo', 'headerLogoFallback');

  /* =========================================================
     1. UTILITIES
     ========================================================= */
  const rand    = (min, max) => Math.random() * (max - min) + min;
  const clamp   = (v, a, b) => Math.min(b, Math.max(a, v));
  const randInt = (min, max) => Math.floor(rand(min, max + 1));

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** HSL (h: 0-360, s: 0-100, l: 0-100) -> "#RRGGBB" */
  function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = x => Math.round(255 * x).toString(16).padStart(2, '0');
    return ('#' + toHex(f(0)) + toHex(f(8)) + toHex(f(4))).toUpperCase();
  }

  /** Perceived brightness 0..1 — used to pick readable text colour */
  function luminance(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function formatLikes(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'm';
    if (n >= 1000)    return (n / 1000).toFixed(1).replace('.0', '') + 'k';
    return String(n);
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      throw new Error('no clipboard api');
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      return ok;
    }
  }

  /* =========================================================
     2. PALETTE GENERATION ENGINE
     ========================================================= */
  const SCHEMES = [
    [  0,  30, -30,  60],
    [  0,  20,  40,  60],
    [  0, 180,  20, 200],
    [  0, 120, 240,  60],
    [  0, 150, 210,  30],
    [  0,  90, 180, 270],
    [  0,   0,   0,   0],
    [  0, 200,  40, 240]
  ];

  function generatePalette() {
    const offsets   = SCHEMES[randInt(0, SCHEMES.length - 1)];
    const baseHue   = Math.random() * 360;
    const baseSat   = rand(42, 86);
    const startL    = rand(16, 36);
    const step      = rand(13, 20);

    const colors = offsets.map((offset, i) => {
      const h = (baseHue + offset + 360) % 360;
      const s = clamp(baseSat + rand(-15, 15), 22, 95);
      const l = clamp(startL + i * step + rand(-7, 7), 10, 90);
      return hslToHex(h, s, l);
    });

    if (Math.random() < 0.35) colors.reverse();

    return colors;
  }

  /* =========================================================
     3. STATE
     ========================================================= */
  const STORAGE_KEY = 'hela_color_platte_saved_v1';

  const state = {
    palettes: [],
    display:  [],
    filter:   'trending'
  };

  let savedPalettes = [];
  let uid = 0;
  let loadingMore = false;

  function loadSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      savedPalettes = Array.isArray(parsed) ? parsed.filter(p => p && Array.isArray(p.colors)) : [];
    } catch (e) {
      savedPalettes = [];
    }
  }

  function persistSaved() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPalettes));
    } catch (e) { /* storage full or disabled */ }
  }

  const isSaved = id => savedPalettes.some(p => p.id === id);
  const findPalette = id =>
    state.palettes.find(p => p.id === id) || savedPalettes.find(p => p.id === id);

  /* =========================================================
     4. DOM REFERENCES
     ========================================================= */
  const gridEl       = document.getElementById('grid');
  const sentinel     = document.getElementById('sentinel');
  const tabsEl       = document.getElementById('tabs');
  const toastEl      = document.getElementById('toast');
  const savedCountEl = document.getElementById('savedCount');
  const generateBtn  = document.getElementById('generateBtn');
  const fab          = document.getElementById('fab');

  const HEART_SVG = `
    <svg width="16" height="16" viewBox="0 0 24 24" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>`;

  /* =========================================================
     5. TOAST
     ========================================================= */
  let toastTimer;
  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1600);
  }

  /* =========================================================
     6. PALETTE COLLECTION MANAGEMENT
     ========================================================= */
  function createPalette() {
    return {
      id: 'p' + (++uid),
      colors: generatePalette(),
      likes: randInt(18, 2600)
    };
  }

  function addPalettes(count) {
    const created = [];
    for (let i = 0; i < count; i++) {
      const p = createPalette();
      state.palettes.unshift(p);
      created.push(p);
    }
    return created;
  }

  /* =========================================================
     7. RENDERING
     ========================================================= */
  function createCard(p) {
    const saved = isSaved(p.id);

    const el = document.createElement('article');
    el.className = 'palette-card';
    el.dataset.id = p.id;
    el.dataset.colors = p.colors.join(',');
    el.dataset.likes = p.likes;

    const colorsHTML = p.colors.map(hex => {
      const textColor = luminance(hex) > 0.62 ? '#111827' : '#ffffff';
      return `<button class="color-block" type="button" data-hex="${hex}"
                      style="background:${hex}" aria-label="Copy ${hex}">
                <span class="hex-label" style="color:${textColor}">${hex}</span>
              </button>`;
    }).join('');

    el.innerHTML = `
      <div class="palette-colors">${colorsHTML}</div>
      <div class="palette-footer">
        <button class="like-btn${saved ? ' is-saved' : ''}" type="button"
                aria-pressed="${saved}" title="${saved ? 'Remove from saved' : 'Save palette'}">
          ${HEART_SVG}
          <span class="like-count">${formatLikes(p.likes + (saved ? 1 : 0))}</span>
        </button>
        <button class="copy-all" type="button" title="Copy all colours">Copy</button>
      </div>`;

    return el;
  }

  function render() {
    gridEl.innerHTML = '';

    if (state.display.length === 0) {
      gridEl.innerHTML = `
        <div class="empty">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <h3>No saved palettes yet</h3>
          <p>Tap the heart on any palette to build your Hela Color Platte collection.</p>
        </div>`;
      return;
    }

    const frag = document.createDocumentFragment();
    state.display.forEach(p => frag.appendChild(createCard(p)));
    gridEl.appendChild(frag);
  }

  function appendCards(palettes) {
    const frag = document.createDocumentFragment();
    palettes.forEach(p => frag.appendChild(createCard(p)));
    gridEl.appendChild(frag);
  }

  function updateCardSaveState(card, btn) {
    const id = card.dataset.id;
    const likes = Number(card.dataset.likes) || 0;
    const saved = isSaved(id);

    btn.classList.toggle('is-saved', saved);
    btn.setAttribute('aria-pressed', String(saved));
    btn.title = saved ? 'Remove from saved' : 'Save palette';
    btn.querySelector('.like-count').textContent = formatLikes(likes + (saved ? 1 : 0));

    btn.classList.remove('pop');
    void btn.offsetWidth;
    btn.classList.add('pop');
  }

  function updateSavedBadge() {
    const n = savedPalettes.length;
    savedCountEl.textContent = n ? String(n) : '';
    savedCountEl.style.display = n ? 'inline-block' : 'none';
  }

  /* =========================================================
     8. FILTERING
     ========================================================= */
  function applyFilter() {
    let list;

    if (state.filter === 'saved') {
      list = savedPalettes.slice();
    } else {
      list = state.palettes.slice();

      if (state.filter === 'popular') {
        list.sort((a, b) => b.likes - a.likes);
      } else if (state.filter === 'random') {
        shuffle(list);
      }
    }

    state.display = list;
  }

  function setFilter(filter) {
    state.filter = filter;

    [...tabsEl.children].forEach(tab => {
      tab.classList.toggle('active', tab.dataset.filter === filter);
    });

    applyFilter();
    render();

    if (filter === 'saved' || filter === 'random') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /* =========================================================
     9. ACTIONS
     ========================================================= */
  function toggleSave(card, btn) {
    const id = card.dataset.id;
    const colors = card.dataset.colors.split(',');
    const likes = Number(card.dataset.likes) || 0;

    const index = savedPalettes.findIndex(p => p.id === id);

    if (index >= 0) {
      savedPalettes.splice(index, 1);
      showToast('Removed from saved');
    } else {
      savedPalettes.unshift({
        id,
        colors,
        likes: findPalette(id) ? findPalette(id).likes : likes
      });
      showToast('Saved to your Hela Color Platte collection');
    }

    persistSaved();
    updateCardSaveState(card, btn);
    updateSavedBadge();

    if (state.filter === 'saved') {
      applyFilter();
      render();
    }
  }

  function regenerate() {
    state.palettes = [];
    addPalettes(24);

    if (state.filter === 'saved') {
      setFilter('trending');
    } else {
      applyFilter();
      render();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Fresh palettes generated');
  }

  function loadMore() {
    if (loadingMore || state.filter === 'saved') return;
    loadingMore = true;

    const created = addPalettes(12);

    if (state.filter === 'popular') {
      applyFilter();
      render();
    } else {
      const ids = new Set(created.map(p => p.id));
      const ordered = state.palettes.filter(p => ids.has(p.id));
      state.display.push(...ordered);
      appendCards(ordered);
    }

    setTimeout(() => { loadingMore = false; }, 150);
  }

  /* =========================================================
     10. EVENT WIRING
     ========================================================= */
  gridEl.addEventListener('click', async (e) => {
    const colorBlock = e.target.closest('.color-block');
    if (colorBlock) {
      const hex = colorBlock.dataset.hex;
      const ok = await copyText(hex);
      showToast(ok ? `Copied ${hex}` : `Copy failed — ${hex}`);
      return;
    }

    const likeBtn = e.target.closest('.like-btn');
    if (likeBtn) {
      const card = likeBtn.closest('.palette-card');
      if (card) toggleSave(card, likeBtn);
      return;
    }

    const copyAll = e.target.closest('.copy-all');
    if (copyAll) {
      const card = copyAll.closest('.palette-card');
      if (!card) return;
      const colors = card.dataset.colors.split(',');
      const ok = await copyText(colors.join(', '));
      showToast(ok ? `Copied ${colors.length} colours` : 'Copy failed');
    }
  });

  tabsEl.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (tab) setFilter(tab.dataset.filter);
  });

  generateBtn.addEventListener('click', regenerate);
  fab.addEventListener('click', regenerate);

  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      regenerate();
    }
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: '700px 0px' });
    observer.observe(sentinel);
  } else {
    window.addEventListener('scroll', () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 700) {
        loadMore();
      }
    }, { passive: true });
  }

  /* =========================================================
     11. INIT
     ========================================================= */
  function init() {
    loadSaved();
    updateSavedBadge();

    addPalettes(24);
    applyFilter();
    render();
  }

  init();
})();