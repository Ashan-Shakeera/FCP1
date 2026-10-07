/* ============================================================
   HELABERRY DESIGN HUB — Interactive Scripts
   ============================================================ */
(function () {
  'use strict';

  /* ---------- RIPPLE EFFECT ---------- */
  function createRipple(e, el) {
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 800);
  }

  document.querySelectorAll('.nav-btn, .home-btn').forEach(el => {
    el.addEventListener('click', function (e) {
      createRipple(e, this);
    });
  });

  /* ---------- TOAST ---------- */
  function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 450);
    }, 2600);
  }

  /* ---------- BUTTON FEEDBACK ---------- */
  const boomBtn = document.getElementById('colorBoomBtn');
  const mixBtn = document.getElementById('colorMixBtn');

  if (boomBtn) {
    boomBtn.addEventListener('click', () => {
      showToast('🔥 DEPLOYING COLORBOOM…');
    });
  }
  if (mixBtn) {
    mixBtn.addEventListener('click', () => {
      showToast('🧪 INITIALIZING COLORMIX…');
    });
  }

  /* ---------- LOG ---------- */
  console.log('%c⚡ HELABERRY DESIGN HUB', 'color:#7aa2ff;font-size:18px;font-weight:900;font-family:Orbitron,sans-serif;');
  console.log('%c2 color tools · logo integrated · Flask routes ready', 'color:#5a7a9e;font-size:12px;font-family:Orbitron,sans-serif;');

})();