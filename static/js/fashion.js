// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  FULL FRONTEND – CHATBOT + COLOR EXTRACTION + ML INTEGRATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function() {
    'use strict';

    // ─── DOM refs ───────────────────────────────────────────
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const previewContainer = document.getElementById('previewContainer');
    const previewImage = document.getElementById('previewImage');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultsPanel = document.getElementById('resultsPanel');
    const colorGrid = document.getElementById('colorGridContainer');
    const mainColorsSpan = document.getElementById('mainColorsCount');
    const analyzedPixelsSpan = document.getElementById('analyzedPixels');
    const numColorsSlider = document.getElementById('numColorsSlider');
    const numColorsValue = document.getElementById('numColorsValue');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const resetAllBtn = document.getElementById('resetAllBtn');
    const copyAllHexBtn = document.getElementById('copyAllHexBtn');
    const bagSuggestionsDiv = document.getElementById('bagSuggestionsList');
    const jewelrySuggestionsDiv = document.getElementById('jewelrySuggestionsList');
    const infoMsgDiv = document.getElementById('infoMessage');
    const copyFeedback = document.getElementById('copyFeedback');

    // Chat
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');

    // ─── State ─────────────────────────────────────────────
    let currentImageElement = null;
    let currentMainColors = [];
    let lastBagMatches = [];
    let lastJewelryMatches = [];
    let isProcessingChat = false;
    let copyTimeout = null;

    // ─── Theme ─────────────────────────────────────────────
    function initTheme() {
        const saved = localStorage.getItem('helaberry_theme');
        if (saved === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            darkModeToggle.innerHTML = '☀️ Light Mode';
        } else if (saved === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            darkModeToggle.innerHTML = '🌙 Dark Mode';
        } else {
            const prefers = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefers) {
                document.documentElement.setAttribute('data-theme', 'dark');
                darkModeToggle.innerHTML = '☀️ Light Mode';
                localStorage.setItem('helaberry_theme', 'dark');
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                darkModeToggle.innerHTML = '🌙 Dark Mode';
                localStorage.setItem('helaberry_theme', 'light');
            }
        }
    }

    function toggleDarkMode() {
        const current = document.documentElement.getAttribute('data-theme');
        if (current === 'dark') {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('helaberry_theme', 'light');
            darkModeToggle.innerHTML = '🌙 Dark Mode';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('helaberry_theme', 'dark');
            darkModeToggle.innerHTML = '☀️ Light Mode';
        }
    }
    darkModeToggle.addEventListener('click', toggleDarkMode);
    initTheme();

    // ─── Copy feedback ──────────────────────────────────────
    function showCopyFeedback(text) {
        copyFeedback.textContent = text || '📋 Copied to clipboard!';
        copyFeedback.classList.add('show');
        clearTimeout(copyTimeout);
        copyTimeout = setTimeout(() => copyFeedback.classList.remove('show'), 1800);
    }

    // ─── Helpers ────────────────────────────────────────────
    function rgbToHex(r, g, b) {
        return '#' + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b))
            .toString(16).slice(1).toUpperCase();
    }

    function setLoading(isLoading, text) {
        if (isLoading) {
            loadingIndicator.innerHTML =
                `<div class="loader"><div class="spinner"></div> ${text || 'Processing…'}</div>`;
            analyzeBtn.disabled = true;
        } else {
            loadingIndicator.innerHTML = '';
            analyzeBtn.disabled = false;
        }
    }

    function resetUI(keepImage) {
        resultsPanel.style.display = 'none';
        colorGrid.innerHTML = '';
        bagSuggestionsDiv.innerHTML =
            '<div class="info-message">✨ Extract dress colors to see bag matches</div>';
        jewelrySuggestionsDiv.innerHTML =
            '<div class="info-message">✨ Extract dress colors for jewelry palettes</div>';
        infoMsgDiv.style.display = 'none';
        if (!keepImage) currentMainColors = [];
        lastBagMatches = [];
        lastJewelryMatches = [];
    }

    // ─── Pixel extraction ──────────────────────────────────
    async function extractPixelData(imgElement) {
        return new Promise((resolve, reject) => {
            try {
                const origW = imgElement.naturalWidth;
                const origH = imgElement.naturalHeight;
                let tw = origW,
                    th = origH;
                const MAX_PIXELS = 700000;
                if (origW * origH > MAX_PIXELS) {
                    const scale = Math.sqrt(MAX_PIXELS / (origW * origH));
                    tw = Math.floor(origW * scale);
                    th = Math.floor(origH * scale);
                }
                const canvas = document.createElement('canvas');
                canvas.width = tw;
                canvas.height = th;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, tw, th);
                ctx.drawImage(imgElement, 0, 0, tw, th);
                const imageData = ctx.getImageData(0, 0, tw, th);
                const data = imageData.data;
                const pixels = [];
                for (let i = 0; i < data.length; i += 4) {
                    pixels.push([data[i], data[i + 1], data[i + 2]]);
                }
                resolve({ pixels, totalPixels: tw * th });
            } catch (e) { reject(e); }
        });
    }

    // ─── k-means ────────────────────────────────────────────
    function kMeans(points, k, maxIt) {
        if (k >= points.length) return points.map(p => ({ centroid: p, assignments: [p] }));
        let centroids = [];
        for (let i = 0; i < k; i++) {
            const rand = Math.floor(Math.random() * points.length);
            centroids.push([...points[rand]]);
        }
        let assignments = new Array(points.length).fill(0);
        let changed = true;
        let iter = 0;
        while (changed && iter < (maxIt || 18)) {
            changed = false;
            for (let i = 0; i < points.length; i++) {
                let minDist = Infinity,
                    best = 0;
                for (let c = 0; c < centroids.length; c++) {
                    const dx = points[i][0] - centroids[c][0];
                    const dy = points[i][1] - centroids[c][1];
                    const dz = points[i][2] - centroids[c][2];
                    const dist = dx * dx + dy * dy + dz * dz;
                    if (dist < minDist) { minDist = dist;
                        best = c; }
                }
                if (assignments[i] !== best) { changed = true;
                    assignments[i] = best; }
            }
            const sums = Array(k).fill().map(() => [0, 0, 0]);
            const counts = Array(k).fill(0);
            for (let i = 0; i < points.length; i++) {
                const cl = assignments[i];
                sums[cl][0] += points[i][0];
                sums[cl][1] += points[i][1];
                sums[cl][2] += points[i][2];
                counts[cl]++;
            }
            for (let c = 0; c < k; c++) {
                if (counts[c] > 0) {
                    centroids[c] = [sums[c][0] / counts[c], sums[c][1] / counts[c], sums[c][2] / counts[c]];
                } else {
                    centroids[c] = [...points[Math.floor(Math.random() * points.length)]];
                }
            }
            iter++;
        }
        return centroids.map(cent => ({ centroid: cent.map(v => Math.round(v)), assignments: [] }));
    }

    // ─── Extract dress colors ──────────────────────────────
    async function extractDressColors(image, numColors) {
        setLoading(true, 'Sampling dress & extracting dominant colors…');
        const { pixels, totalPixels } = await extractPixelData(image);
        let sample = pixels;
        if (pixels.length > 18000) {
            const step = Math.ceil(pixels.length / 18000);
            sample = [];
            for (let i = 0; i < pixels.length; i += step) sample.push(pixels[i]);
        }
        const k = Math.min(numColors, sample.length);
        const clusters = kMeans(sample, k, 16);
        const centroidRGBs = clusters.map(c => c.centroid);
        const totalAssigned = sample.length;
        const counts = new Array(centroidRGBs.length).fill(0);
        for (let p of sample) {
            let bestIdx = 0,
                bestDist = Infinity;
            for (let i = 0; i < centroidRGBs.length; i++) {
                const dx = p[0] - centroidRGBs[i][0];
                const dy = p[1] - centroidRGBs[i][1];
                const dz = p[2] - centroidRGBs[i][2];
                const d = dx * dx + dy * dy + dz * dz;
                if (d < bestDist) { bestDist = d;
                    bestIdx = i; }
            }
            counts[bestIdx]++;
        }
        const colors = centroidRGBs.map((rgb, idx) => {
            const r = Math.min(255, Math.max(0, rgb[0]));
            const g = Math.min(255, Math.max(0, rgb[1]));
            const b = Math.min(255, Math.max(0, rgb[2]));
            const percent = (counts[idx] / totalAssigned) * 100;
            return { r, g, b, hex: rgbToHex(r, g, b), percent };
        }).sort((a, b) => b.percent - a.percent);
        setLoading(false);
        return { colors, totalPixelsAnalyzed: totalPixels };
    }

    // ─── ML‑Aware Match Generators ─────────────────────────
    async function generateBagMatchesML(dressColors) {
        if (!dressColors.length) return [];
        try {
            const resp = await fetch('/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    colors: dressColors.map(c => ({ r: c.r, g: c.g, b: c.b, hex: c.hex, percent: c.percent })),
                    type: 'bag'
                })
            });
            if (resp.ok) {
                const data = await resp.json();
                if (data.recommendations && data.recommendations.length) {
                    return data.recommendations;
                }
            }
        } catch (_) { /* fall through */ }
        return generateBagMatchesHeuristic(dressColors);
    }

    async function generateJewelryMatchesML(dressColors) {
        if (!dressColors.length) return [];
        try {
            const resp = await fetch('/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    colors: dressColors.map(c => ({ r: c.r, g: c.g, b: c.b, hex: c.hex, percent: c.percent })),
                    type: 'jewelry'
                })
            });
            if (resp.ok) {
                const data = await resp.json();
                if (data.recommendations && data.recommendations.length) {
                    return data.recommendations;
                }
            }
        } catch (_) { /* fall through */ }
        return generateJewelryHeuristic(dressColors);
    }

    // ─── Heuristic fallbacks ───────────────────────────────
    function generateBagMatchesHeuristic(dressColors) {
        const top = dressColors[0];
        const compR = 255 - top.r,
            compG = 255 - top.g,
            compB = 255 - top.b;
        const compHex = rgbToHex(Math.min(255, compR), Math.min(255, compG), Math.min(255, compB));
        const pal = [
            { hex: compHex, desc: 'Complementary contrast — pops against dress' },
            { hex: '#D4A574', desc: 'Warm camel / tan — timeless elegance' },
            { hex: '#F5DEB3', desc: 'Soft beige — neutral sophistication' },
            { hex: '#5E3C2C', desc: 'Deep cocoa — earthy balance' },
            { hex: '#3C3C41', desc: 'Charcoal gray — modern minimal' },
            { hex: '#6B6B4A', desc: 'Muted olive — subtle harmony' },
            { hex: '#F5F0E1', desc: 'Cream / ivory — fresh contrast' }
        ];
        return pal.filter(s => s.hex !== top.hex).slice(0, 6);
    }

    function generateJewelryHeuristic(dressColors) {
        const primary = dressColors[0];
        const brightness = (primary.r + primary.g + primary.b) / 3;
        const isWarm = primary.r > primary.g + 20 && primary.r > primary.b;
        const pal = [
            { hex: '#D4AF37', desc: 'Warm gold — luxe shine' },
            { hex: '#C0C0C0', desc: 'Polished silver — cool modern edge' },
            { hex: '#B76E79', desc: 'Romantic rose gold — soft complements' }
        ];
        if (isWarm) pal.push({ hex: '#B87333', desc: 'Copper accent — bohemian warmth' });
        else pal.push({ hex: '#F0E6D2', desc: 'Pearl white — ethereal elegance' });
        if (brightness > 140) {
            pal.push({ hex: '#2E8B57', desc: 'Emerald green — vibrant contrast' });
            pal.push({ hex: '#0F52BA', desc: 'Sapphire blue — regal depth' });
        } else {
            pal.push({ hex: '#9B1D2C', desc: 'Ruby red — passionate pop' });
            pal.push({ hex: '#0F52BA', desc: 'Sapphire blue — refined richness' });
        }
        return pal.slice(0, 6);
    }

    // ─── Render functions ───────────────────────────────────
    function renderDressColors(colors) {
        if (!colors.length) { colorGrid.innerHTML = '<div class="info-message">No colors extracted</div>'; return; }
        let html = '';
        for (let c of colors) {
            html += `<div class="color-card" data-hex="${c.hex}">
                        <div class="color-swatch" style="background:${c.hex};"></div>
                        <div class="color-info">
                            <div class="hex-code">${c.hex}</div>
                            <div class="rgb-values">RGB(${c.r},${c.g},${c.b})</div>
                            <div class="percent">📊 ${c.percent.toFixed(1)}%</div>
                        </div>
                    </div>`;
        }
        colorGrid.innerHTML = html;
        document.querySelectorAll('.color-card').forEach(card => {
            card.addEventListener('click', () => {
                const hex = card.getAttribute('data-hex');
                if (hex) {
                    navigator.clipboard.writeText(hex).then(() => {
                        showCopyFeedback(`📋 Copied ${hex}!`);
                    });
                }
            });
        });
    }

    function renderMatchUI(bagMatches, jewelryMatches) {
        lastBagMatches = bagMatches;
        lastJewelryMatches = jewelryMatches;

        bagSuggestionsDiv.innerHTML = '';
        for (let m of bagMatches) {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.setAttribute('data-hex', m.hex);
            div.innerHTML = `<div class="suggestion-swatch" style="background:${m.hex};"></div>
                            <div class="suggestion-info">
                                <div class="suggestion-hex">${m.hex}</div>
                                <div class="suggestion-desc">${m.desc || ''}</div>
                            </div>`;
            div.addEventListener('click', () => {
                navigator.clipboard.writeText(m.hex).then(() => {
                    showCopyFeedback(`📋 Copied ${m.hex}!`);
                });
            });
            bagSuggestionsDiv.appendChild(div);
        }
        if (!bagMatches.length) {
            bagSuggestionsDiv.innerHTML = '<div class="info-message">No bag matches found</div>';
        }

        jewelrySuggestionsDiv.innerHTML = '';
        for (let j of jewelryMatches) {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.setAttribute('data-hex', j.hex);
            div.innerHTML = `<div class="suggestion-swatch" style="background:${j.hex};"></div>
                            <div class="suggestion-info">
                                <div class="suggestion-hex">${j.hex}</div>
                                <div class="suggestion-desc">${j.desc || ''}</div>
                            </div>`;
            div.addEventListener('click', () => {
                navigator.clipboard.writeText(j.hex).then(() => {
                    showCopyFeedback(`📋 Copied ${j.hex}!`);
                });
            });
            jewelrySuggestionsDiv.appendChild(div);
        }
        if (!jewelryMatches.length) {
            jewelrySuggestionsDiv.innerHTML = '<div class="info-message">No jewelry matches found</div>';
        }
    }

    // ─── Full extraction + match ────────────────────────────
    async function fullExtractionAndMatch(image, numColors) {
        resetUI(false);
        try {
            const { colors, totalPixelsAnalyzed } = await extractDressColors(image, numColors);
            currentMainColors = colors;
            mainColorsSpan.innerText = currentMainColors.length;
            analyzedPixelsSpan.innerText = totalPixelsAnalyzed.toLocaleString();
            renderDressColors(currentMainColors);

            const bagMatches = await generateBagMatchesML(currentMainColors);
            const jewelryMatches = await generateJewelryMatchesML(currentMainColors);
            renderMatchUI(bagMatches, jewelryMatches);

            resultsPanel.style.display = 'block';
            infoMsgDiv.style.display = 'none';
            resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });

            addChatMessage('bot',
                `✨ I've analyzed your dress! I found ${currentMainColors.length} dominant colors. Ask me about bag or jewelry matches!`
                );
        } catch (err) {
            setLoading(false);
            alert('Error analyzing dress: ' + err.message);
        }
    }

    // ─── Image handler ──────────────────────────────────────
    async function handleImage(file) {
        if (!file || !file.type.startsWith('image/')) { alert('Upload a dress image'); return; }
        resetUI(false);
        setLoading(true, 'Loading dress…');
        previewContainer.classList.add('hidden');
        const objUrl = URL.createObjectURL(file);
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res;
            img.onerror = rej;
            img.src = objUrl; });
        previewImage.src = objUrl;
        previewContainer.classList.remove('hidden');
        currentImageElement = img;
        const numColors = parseInt(numColorsSlider.value, 10);
        await fullExtractionAndMatch(currentImageElement, numColors);
        URL.revokeObjectURL(objUrl);
    }

    // ─── Chat logic ─────────────────────────────────────────
    function addChatMessage(role, text) {
        const div = document.createElement('div');
        div.className = `chat-msg ${role}`;
        let html = text;
        const hexRegex = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b/g;
        const matches = text.match(hexRegex);
        if (matches) {
            for (let h of matches) {
                const swatch = `<span class="swatch-inline" style="background:${h};"></span>`;
                html = html.replace(h, `${swatch} <span class="msg-hex">${h}</span>`);
            }
        }
        div.innerHTML = html;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showTyping() {
        const div = document.createElement('div');
        div.className = 'chat-msg bot';
        div.id = 'typingIndicator';
        div.innerHTML = `<div class="chat-typing"><span></span><span></span><span></span></div>`;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function hideTyping() {
        const el = document.getElementById('typingIndicator');
        if (el) el.remove();
    }

    async function handleChatSend() {
        const text = chatInput.value.trim();
        if (!text || isProcessingChat) return;
        chatInput.value = '';
        addChatMessage('user', text);
        isProcessingChat = true;
        chatSendBtn.disabled = true;
        showTyping();

        // Simulate "live" typing delay for realism
        const delay = 300 + Math.random() * 400;
        await new Promise(r => setTimeout(r, delay));

        try {
            const context = {
                message: text,
                colors: currentMainColors.map(c => ({ r: c.r, g: c.g, b: c.b, hex: c.hex, percent: c.percent })),
                bagMatches: lastBagMatches,
                jewelryMatches: lastJewelryMatches
            };

            let reply = null;
            try {
                const resp = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(context)
                });
                if (resp.ok) {
                    const data = await resp.json();
                    reply = data.reply;
                }
            } catch (_) { /* fall through */ }

            if (!reply) {
                reply = localChatReply(text, currentMainColors, lastBagMatches, lastJewelryMatches);
            }

            hideTyping();
            addChatMessage('bot', reply);
        } catch (err) {
            hideTyping();
            addChatMessage('bot', '😕 Sorry, I had trouble processing that. Please try again.');
        } finally {
            isProcessingChat = false;
            chatSendBtn.disabled = false;
            chatInput.focus();
        }
    }

    // ─── Local chat fallback ──────────────────────────────
    function localChatReply(msg, colors, bagMatches, jewelryMatches) {
        const lower = msg.toLowerCase();
        if (lower.includes('bag') || lower.includes('handbag') || lower.includes('purse')) {
            if (bagMatches.length) {
                const top = bagMatches[0];
                return `👜 I recommend a bag in <span class="msg-hex">${top.hex}</span> ${top.desc ? '– ' + top.desc : ''}. Other great options: ${bagMatches.slice(1,3).map(m => `<span class="msg-hex">${m.hex}</span>`).join(', ')}.`;
            }
            return '👜 Please extract dress colors first by uploading an image and clicking "Extract & Match".';
        }
        if (lower.includes('jewelry') || lower.includes('jewellery') || lower.includes('accessory') || lower.includes(
                'necklace') || lower.includes('earring')) {
            if (jewelryMatches.length) {
                const top = jewelryMatches[0];
                return `💎 For jewelry, I suggest <span class="msg-hex">${top.hex}</span> ${top.desc ? '– ' + top.desc : ''}. Also consider: ${jewelryMatches.slice(1,3).map(m => `<span class="msg-hex">${m.hex}</span>`).join(', ')}.`;
            }
            return '💎 Please extract dress colors first to get jewelry recommendations.';
        }
        if (lower.includes('color') || lower.includes('palette') || lower.includes('hex')) {
            if (colors.length) {
                const top3 = colors.slice(0, 3).map(c => `<span class="msg-hex">${c.hex}</span>`).join(', ');
                return `🎨 Your dress has these dominant colors: ${top3}. The primary is <span class="msg-hex">${colors[0].hex}</span> (${colors[0].percent.toFixed(1)}% of the dress).`;
            }
            return '🎨 I don\'t see any extracted colors yet. Upload a dress image and click "Extract & Match".';
        }
        if (lower.includes('hello') || lower.includes('hi ') || lower.includes('hey')) {
            return '👋 Hello! I\'m your fashion color assistant. Upload a dress image, then ask me about bag colors, jewelry, or color palettes!';
        }
        if (lower.includes('help') || lower.includes('what can you do')) {
            return '💡 I can help with:\n• "What bag color matches my dress?"\n• "Recommend jewelry for this outfit"\n• "Show me the dress colors"\n• "Give me complementary colors"\n\nUpload a dress image first for best results!';
        }
        if (lower.includes('complementary') || lower.includes('contrast')) {
            if (colors.length) {
                const top = colors[0];
                const compR = 255 - top.r,
                    compG = 255 - top.g,
                    compB = 255 - top.b;
                const compHex = rgbToHex(Math.min(255, compR), Math.min(255, compG), Math.min(255, compB));
                return `🔄 The complementary color of your dress's primary color <span class="msg-hex">${top.hex}</span> is <span class="msg-hex">${compHex}</span>. This creates a high-contrast, vibrant look!`;
            }
            return '🔄 Please extract dress colors first to see complementary colors.';
        }
        if (lower.includes('warm') || lower.includes('cool')) {
            if (colors.length) {
                const top = colors[0];
                const isWarm = top.r > top.g + 20 && top.r > top.b;
                return isWarm ?
                    `🌞 Your dress has a warm color palette (primary: <span class="msg-hex">${top.hex}</span>). Gold, copper, and warm neutrals like camel would work beautifully.` :
                    `❄️ Your dress has a cool color palette (primary: <span class="msg-hex">${top.hex}</span>). Silver, platinum, and cool tones like sapphire or emerald would complement it.`;
            }
            return '🌡️ Please extract dress colors first to determine warm/cool tones.';
        }
        if (lower.includes('thank')) {
            return '😊 You\'re welcome! Let me know if you need more fashion advice.';
        }
        return `🤔 I'm not sure I understand. Try asking about bag colors, jewelry, or the dress palette. Type "help" to see what I can do.`;
    }

    // ─── Event listeners ──────────────────────────────────
    fileInput.addEventListener('change', e => e.target.files[0] && handleImage(e.target.files[0]));

    dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files[0]) handleImage(e.dataTransfer.files[0]);
    });
    dropZone.addEventListener('click', () => fileInput.click());

    analyzeBtn.addEventListener('click', () => {
        if (!currentImageElement) alert('Please upload a dress image first.');
        else fullExtractionAndMatch(currentImageElement, parseInt(numColorsSlider.value, 10));
    });

    numColorsSlider.addEventListener('input', e => numColorsValue.innerText = e.target.value);

    copyAllHexBtn.addEventListener('click', () => {
        if (!currentMainColors.length) return;
        const hexes = currentMainColors.map(c => c.hex).join('\n');
        navigator.clipboard.writeText(hexes).then(() => {
            showCopyFeedback(`📋 Copied ${currentMainColors.length} hex codes!`);
        });
    });

    resetAllBtn.addEventListener('click', () => {
        fileInput.value = '';
        previewContainer.classList.add('hidden');
        currentImageElement = null;
        resetUI();
        resultsPanel.style.display = 'none';
        chatMessages.innerHTML =
            `<div class="chat-msg bot">👋 Hi! I'm your fashion color assistant.<br>Upload a dress image, then ask me anything like:<br>• "What bag color matches my dress?"<br>• "Recommend jewelry for this outfit"<br>• "Show me complementary colors"</div>`;
        showCopyFeedback('🔄 Reset complete');
    });

    chatSendBtn.addEventListener('click', handleChatSend);
    chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleChatSend(); });

    // Auto-focus chat input
    chatInput.focus();

    // Brand link — scroll to top
    const brandLink = document.getElementById('brandLink');
    if (brandLink) {
        brandLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ─── Health check ──────────────────────────────────────
    fetch('/api/health')
        .then(r => r.json())
        .then(data => {
            if (data.status === 'ok') {
                addChatMessage('bot', '🧠 AI model loaded! I\'m ready to give you intelligent fashion color recommendations.');
            }
        })
        .catch(() => {
            console.log('Backend not available, using local fallback.');
        });

})();