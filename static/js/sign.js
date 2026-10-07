(function() {
    'use strict';

    // ---------- DOM REFS ----------
    const canvas = document.getElementById('previewCanvas');
    const ctx = canvas.getContext('2d');
    const fileInput = document.getElementById('fileInput');
    const uploadZone = document.getElementById('uploadZone');
    const uploadPreview = document.getElementById('uploadPreview');
    const removeImageBtn = document.getElementById('removeImageBtn');
    const nameInput = document.getElementById('nameInput');
    const yearInput = document.getElementById('yearInput');
    const subtitleInput = document.getElementById('subtitleInput');
    const templateGrid = document.getElementById('templateGrid');
    const downloadBtn = document.getElementById('downloadBtn');
    const refreshBtn = document.getElementById('refreshPreviewBtn');
    const emptyState = document.getElementById('emptyState');

    // ---------- STATE ----------
    let uploadedImage = null; // HTMLImageElement
    let imageDataURL = null; // for storage
    let activeTemplate = 'modern';

    // ---------- TEMPLATE DEFINITIONS ----------
    const templates = [{
        id: 'modern',
        name: 'Modern',
        previewBg: 'linear-gradient(135deg, #1e293b, #0f172a)',
        previewText: 'MODERN',
        styles: {
            nameFont: 'Inter, sans-serif',
            nameSize: 82,
            nameWeight: 800,
            nameColor: '#ffffff',
            nameLetterSpacing: 2,
            yearFont: 'Inter, sans-serif',
            yearSize: 48,
            yearWeight: 300,
            yearColor: 'rgba(255,255,255,0.7)',
            subtitleFont: 'Inter, sans-serif',
            subtitleSize: 28,
            subtitleWeight: 400,
            subtitleColor: 'rgba(255,255,255,0.5)',
            overlayGradient: 'rgba(0,0,0,0.35)',
            textAlign: 'center',
            textPosition: 'center',
            badgeBg: 'rgba(59,130,246,0.25)',
            badgeText: '#3b82f6',
        }
    }, {
        id: 'classic',
        name: 'Classic',
        previewBg: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        previewText: 'CLASSIC',
        styles: {
            nameFont: 'Georgia, serif',
            nameSize: 74,
            nameWeight: 700,
            nameColor: '#f5e6d3',
            nameLetterSpacing: 4,
            yearFont: 'Georgia, serif',
            yearSize: 42,
            yearWeight: 400,
            yearColor: 'rgba(245,230,211,0.6)',
            subtitleFont: 'Georgia, serif',
            subtitleSize: 24,
            subtitleWeight: 400,
            subtitleColor: 'rgba(245,230,211,0.4)',
            overlayGradient: 'rgba(0,0,0,0.45)',
            textAlign: 'center',
            textPosition: 'center',
            badgeBg: 'rgba(245,230,211,0.12)',
            badgeText: '#f5e6d3',
        }
    }, {
        id: 'bold',
        name: 'Bold',
        previewBg: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
        previewText: 'BOLD',
        styles: {
            nameFont: 'Inter, sans-serif',
            nameSize: 96,
            nameWeight: 900,
            nameColor: '#ffffff',
            nameLetterSpacing: 6,
            yearFont: 'Inter, sans-serif',
            yearSize: 52,
            yearWeight: 700,
            yearColor: '#facc15',
            subtitleFont: 'Inter, sans-serif',
            subtitleSize: 30,
            subtitleWeight: 500,
            subtitleColor: 'rgba(255,255,255,0.6)',
            overlayGradient: 'rgba(0,0,0,0.5)',
            textAlign: 'center',
            textPosition: 'center',
            badgeBg: 'rgba(250,204,21,0.2)',
            badgeText: '#facc15',
        }
    }, {
        id: 'elegant',
        name: 'Elegant',
        previewBg: 'linear-gradient(135deg, #0d0d0d, #1a1a1a, #0d0d0d)',
        previewText: 'ELEGANT',
        styles: {
            nameFont: '"Playfair Display", Georgia, serif',
            nameSize: 78,
            nameWeight: 700,
            nameColor: '#e8d5b7',
            nameLetterSpacing: 3,
            yearFont: '"Playfair Display", Georgia, serif',
            yearSize: 44,
            yearWeight: 400,
            yearColor: 'rgba(232,213,183,0.5)',
            subtitleFont: '"Playfair Display", Georgia, serif',
            subtitleSize: 26,
            subtitleWeight: 400,
            subtitleColor: 'rgba(232,213,183,0.35)',
            overlayGradient: 'rgba(0,0,0,0.5)',
            textAlign: 'center',
            textPosition: 'center',
            badgeBg: 'rgba(232,213,183,0.12)',
            badgeText: '#e8d5b7',
        }
    }];

    // ---------- RENDER TEMPLATE CARDS ----------
    function renderTemplateCards() {
        templateGrid.innerHTML = '';
        templates.forEach(t => {
            const card = document.createElement('div');
            card.className = 'template-card' + (t.id === activeTemplate ? ' active' : '');
            card.dataset.id = t.id;
            card.innerHTML = `
                <div class="template-preview" style="background:${t.previewBg};">
                    <span class="tp-label" style="color:${t.styles.nameColor}; font-size:0.7rem;">${t.previewText}</span>
                </div>
                <div class="template-name">${t.name}</div>
                <span class="template-badge"><i class="fas fa-check"></i></span>
            `;
            card.addEventListener('click', () => {
                activeTemplate = t.id;
                renderTemplateCards();
                renderPreview();
            });
            templateGrid.appendChild(card);
        });
    }

    // ---------- IMAGE UPLOAD ----------
    function loadImageFile(file) {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            imageDataURL = e.target.result;
            const img = new Image();
            img.onload = () => {
                uploadedImage = img;
                uploadPreview.src = imageDataURL;
                uploadPreview.style.display = 'block';
                uploadZone.classList.add('has-image');
                emptyState.style.display = 'none';
                renderPreview();
            };
            img.src = imageDataURL;
        };
        reader.readAsDataURL(file);
    }

    function clearImage() {
        uploadedImage = null;
        imageDataURL = null;
        uploadPreview.src = '';
        uploadPreview.style.display = 'none';
        uploadZone.classList.remove('has-image');
        emptyState.style.display = 'flex';
        renderPreview();
    }

    // ---------- RENDER PREVIEW ----------
    function renderPreview() {
        const w = canvas.width;
        const h = canvas.height;

        // Clear
        ctx.clearRect(0, 0, w, h);

        // Background
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#0b0f17');
        grad.addColorStop(1, '#141e2f');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // If no image, draw placeholder
        if (!uploadedImage) {
            ctx.fillStyle = 'rgba(255,255,255,0.03)';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.font = '20px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⬆ Upload an image to begin', w / 2, h / 2 - 10);
            ctx.fillStyle = 'rgba(255,255,255,0.03)';
            ctx.font = '14px Inter, sans-serif';
            ctx.fillText('Your digital sign will appear here', w / 2, h / 2 + 30);
            return;
        }

        // Draw image with cover fit
        const imgAspect = uploadedImage.width / uploadedImage.height;
        const canvasAspect = w / h;
        let drawW, drawH, dx, dy;
        if (imgAspect > canvasAspect) {
            drawW = w;
            drawH = w / imgAspect;
            dx = 0;
            dy = (h - drawH) / 2;
        } else {
            drawH = h;
            drawW = h * imgAspect;
            dx = (w - drawW) / 2;
            dy = 0;
        }
        ctx.drawImage(uploadedImage, dx, dy, drawW, drawH);

        // Dark overlay
        const template = templates.find(t => t.id === activeTemplate) || templates[0];
        const s = template.styles;

        // Gradient overlay
        const overlayGrad = ctx.createLinearGradient(0, h * 0.4, 0, h);
        overlayGrad.addColorStop(0, 'rgba(0,0,0,0)');
        overlayGrad.addColorStop(0.5, s.overlayGradient || 'rgba(0,0,0,0.35)');
        overlayGrad.addColorStop(1, 'rgba(0,0,0,0.7)');
        ctx.fillStyle = overlayGrad;
        ctx.fillRect(0, 0, w, h);

        // --- TEXT RENDER ---
        const name = nameInput.value.trim() || 'Your Name';
        const year = yearInput.value.trim() || '2026';
        const subtitle = subtitleInput.value.trim() || '';

        // Name
        ctx.textAlign = s.textAlign || 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${s.nameWeight} ${s.nameSize}px ${s.nameFont}`;
        ctx.letterSpacing = `${s.nameLetterSpacing || 0}px`;
        // fallback for letter-spacing not supported in canvas
        const nameX = w / 2;
        let nameY = h / 2 - 10;

        if (subtitle) nameY = h / 2 - 32;
        else nameY = h / 2 + 4;

        ctx.fillStyle = s.nameColor;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
        // manual letter spacing
        let currentX = nameX - (ctx.measureText(name).width / 2);
        const spacing = s.nameLetterSpacing || 0;
        for (let i = 0; i < name.length; i++) {
            const char = name[i];
            const charWidth = ctx.measureText(char).width;
            ctx.fillText(char, currentX, nameY);
            currentX += charWidth + spacing;
        }
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Year
        ctx.font = `${s.yearWeight} ${s.yearSize}px ${s.yearFont}`;
        ctx.fillStyle = s.yearColor;
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 3;
        const yearY = nameY + s.nameSize / 2 + 18;
        let yearX = nameX;
        if (s.textAlign === 'center') {
            yearX = nameX;
        }
        ctx.fillText(year, yearX, yearY);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Subtitle
        if (subtitle) {
            ctx.font = `${s.subtitleWeight} ${s.subtitleSize}px ${s.subtitleFont}`;
            ctx.fillStyle = s.subtitleColor;
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 16;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 2;
            const subY = nameY - s.nameSize / 2 - 16;
            ctx.fillText(subtitle, nameX, subY);
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
        }

        // Small badge (template name)
        ctx.font = '12px Inter, sans-serif';
        ctx.fillStyle = s.badgeBg || 'rgba(59,130,246,0.15)';
        const badgeText = template.name.toUpperCase();
        const badgeWidth = ctx.measureText(badgeText).width + 32;
        const badgeX = w - badgeWidth - 24;
        const badgeY = 24;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeWidth, 30, 15);
        ctx.fill();
        ctx.fillStyle = s.badgeText || '#3b82f6';
        ctx.font = '11px Inter, sans-serif';
        ctx.fontWeight = '600';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, badgeX + badgeWidth / 2, badgeY + 15);

        // small corner mark
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText('helaberry · sign', w - 20, h - 14);

        // Reset text align
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    // ---------- CANVAS ROUND RECT POLYFILL ----------
    if (!CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii) {
            const r = typeof radii === 'number' ? radii : (radii || 0);
            this.moveTo(x + r, y);
            this.arcTo(x + w, y, x + w, y + h, r);
            this.arcTo(x + w, y + h, x, y + h, r);
            this.arcTo(x, y + h, x, y, r);
            this.arcTo(x, y, x + w, y, r);
            return this;
        };
    }

    // ---------- DOWNLOAD ----------
    function downloadImage() {
        if (!uploadedImage) {
            alert('Please upload an image first.');
            return;
        }
        const link = document.createElement('a');
        link.download = `sign_${nameInput.value.trim() || 'untitled'}_${yearInput.value.trim() || 'year'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    // ---------- DARK MODE TOGGLE ----------
    function initTheme() {
        const toggle = document.getElementById('darkModeToggle');
        const isLight = localStorage.getItem('helaberry_light') === 'true';
        if (isLight) {
            document.body.classList.add('light');
            toggle.innerHTML = '<i class="fas fa-sun"></i><span>Light</span>';
        } else {
            document.body.classList.remove('light');
            toggle.innerHTML = '<i class="fas fa-moon"></i><span>Dark</span>';
        }
        toggle.addEventListener('click', () => {
            const nowLight = document.body.classList.toggle('light');
            localStorage.setItem('helaberry_light', nowLight);
            toggle.innerHTML = nowLight ? '<i class="fas fa-sun"></i><span>Light</span>' :
                '<i class="fas fa-moon"></i><span>Dark</span>';
            renderPreview();
        });
    }

    // ---------- EVENT BINDING ----------
    function bindEvents() {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) loadImageFile(e.target.files[0]);
        });

        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) loadImageFile(e.dataTransfer.files[0]);
        });

        // Click on zone triggers file input
        uploadZone.addEventListener('click', (e) => {
            if (e.target === removeImageBtn || removeImageBtn.contains(e.target)) return;
            fileInput.click();
        });

        removeImageBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            clearImage();
            fileInput.value = '';
        });

        nameInput.addEventListener('input', renderPreview);
        yearInput.addEventListener('input', renderPreview);
        subtitleInput.addEventListener('input', renderPreview);

        refreshBtn.addEventListener('click', renderPreview);
        downloadBtn.addEventListener('click', downloadImage);

        // Brand scroll
        document.getElementById('brandLink').addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ---------- INIT ----------
    function init() {
        renderTemplateCards();
        initTheme();
        bindEvents();
        // Set default image (placeholder)
        const defaultImg = new Image();
        defaultImg.onload = () => {
            uploadedImage = defaultImg;
            uploadPreview.src = defaultImg.src;
            uploadPreview.style.display = 'block';
            uploadZone.classList.add('has-image');
            emptyState.style.display = 'none';
            renderPreview();
        };
        // Use a beautiful gradient placeholder as default image
        const canvasPlaceholder = document.createElement('canvas');
        canvasPlaceholder.width = 1600;
        canvasPlaceholder.height = 900;
        const pCtx = canvasPlaceholder.getContext('2d');
        const pGrad = pCtx.createLinearGradient(0, 0, 1600, 900);
        pGrad.addColorStop(0, '#1a2a4a');
        pGrad.addColorStop(0.5, '#2d4a7a');
        pGrad.addColorStop(1, '#1a2a4a');
        pCtx.fillStyle = pGrad;
        pCtx.fillRect(0, 0, 1600, 900);
        // Add some abstract shapes
        pCtx.fillStyle = 'rgba(59,130,246,0.08)';
        pCtx.beginPath();
        pCtx.arc(400, 450, 300, 0, Math.PI * 2);
        pCtx.fill();
        pCtx.fillStyle = 'rgba(139,92,246,0.06)';
        pCtx.beginPath();
        pCtx.arc(1200, 400, 350, 0, Math.PI * 2);
        pCtx.fill();
        pCtx.fillStyle = 'rgba(255,255,255,0.04)';
        pCtx.font = '42px Inter, sans-serif';
        pCtx.textAlign = 'center';
        pCtx.textBaseline = 'middle';
        pCtx.fillText('✦ Helaberry ✦', 800, 450);
        defaultImg.src = canvasPlaceholder.toDataURL('image/png');
    }

    // Polyfill for roundRect if needed
    if (!CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii) {
            const r = typeof radii === 'number' ? radii : (Array.isArray(radii) ? radii[0] : 8);
            this.moveTo(x + r, y);
            this.arcTo(x + w, y, x + w, y + h, r);
            this.arcTo(x + w, y + h, x, y + h, r);
            this.arcTo(x, y + h, x, y, r);
            this.arcTo(x, y, x + w, y, r);
            return this;
        };
    }

    init();
})();