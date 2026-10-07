(function() {
    'use strict';

    // ======================== COLOR DATA ========================
    const colorMeaningsData = {
        "red": { positive: ["love", "passion", "energy", "strength", "courage", "determination", "excitement"],
            negative: ["anger", "danger", "warning", "aggression"] },
        "blue": { positive: ["calmness", "stability", "trust", "intelligence", "loyalty", "peace", "serenity"],
            negative: ["sadness", "coldness", "melancholy"] },
        "yellow": { positive: ["happiness", "optimism", "joy", "creativity", "warmth", "intellect"],
            negative: ["caution", "cowardice", "deceit"] },
        "green": { positive: ["nature", "growth", "harmony", "freshness", "hope", "money", "renewal"],
            negative: ["jealousy", "envy", "illness"] },
        "orange": { positive: ["enthusiasm", "creativity", "determination", "success", "warmth", "vitality"],
            negative: [] },
        "purple": { positive: ["royalty", "luxury", "ambition", "wisdom", "spirituality", "mystery"],
            negative: [] },
        "pink": { positive: ["romance", "femininity", "tenderness", "playfulness", "innocence", "gentleness"],
            negative: [] },
        "black": { positive: ["elegance", "power", "formality", "sophistication"],
            negative: ["mystery", "death", "evil", "grief"] },
        "white": { positive: ["purity", "innocence", "cleanliness", "peace", "new beginnings"], negative: [] },
        "gray": { positive: ["neutrality", "balance", "sophistication", "formality"],
            negative: ["gloom", "sadness", "dullness"] },
        "brown": { positive: ["earth", "nature", "stability", "reliability", "comfort"], negative: [] },
        "cyan": { positive: ["calmness", "clarity", "freshness", "healing", "openness"], negative: [] },
        "magenta": { positive: ["creativity", "femininity", "excitement", "passion"], negative: [] },
        "gold": { positive: ["wealth", "prestige", "luxury", "success", "wisdom"],
            negative: ["greed", "extravagance"] },
        "silver": { positive: ["elegance", "modernity", "grace", "sophistication"], negative: ["coldness"] },
        "olive": { positive: ["peace", "harmony", "nature", "maturity"], negative: ["drabness"] },
        "teal": { positive: ["sophistication", "freshness", "calm", "clarity"], negative: ["aloofness"] },
        "maroon": { positive: ["passion", "intensity", "elegance", "strength"], negative: ["aggression"] },
        "lime": { positive: ["energy", "freshness", "youthfulness", "vibrancy"], negative: ["sourness"] },
        "indigo": { positive: ["intuition", "spirituality", "deep wisdom", "integrity"],
            negative: ["moodiness", "fanaticism"] },
        "coral": { positive: ["warmth", "optimism", "playfulness", "vibrancy"], negative: ["superficiality"] },
        "lavender": { positive: ["grace", "elegance", "serenity", "femininity"], negative: ["fragility"] },
        "turquoise": { positive: ["clarity", "emotional balance", "healing", "protection"],
            negative: ["possessiveness"] },
        "beige": { positive: ["simplicity", "neutrality", "calm", "reliability"], negative: ["blandness"] },
        "burgundy": { positive: ["sophistication", "ambition", "depth", "maturity"], negative: ["melancholy"] },
        "mustard": { positive: ["creativity", "vintage charm", "energy"], negative: ["bitterness"] },
        "peach": { positive: ["warmth", "friendliness", "sweetness", "community"], negative: [] },
        "charcoal": { positive: ["strength", "modernity", "seriousness"], negative: ["gloom"] }
    };

    const allColors = Object.entries(colorMeaningsData).map(([name, data]) => ({
        name: name,
        positive: data.positive,
        negative: data.negative,
        allMeanings: [...data.positive, ...data.negative]
    }));

    const colorRgbMap = {
        "red": [220, 60, 50],
        "blue": [58, 110, 165],
        "yellow": [245, 221, 66],
        "green": [76, 154, 42],
        "orange": [255, 140, 66],
        "purple": [155, 89, 182],
        "pink": [255, 183, 197],
        "black": [44, 44, 44],
        "white": [248, 249, 250],
        "gray": [169, 169, 169],
        "brown": [139, 90, 43],
        "cyan": [0, 206, 209],
        "magenta": [255, 68, 204],
        "gold": [255, 217, 102],
        "silver": [192, 192, 192],
        "olive": [107, 142, 35],
        "teal": [0, 128, 128],
        "maroon": [128, 0, 0],
        "lime": [191, 255, 0],
        "indigo": [75, 0, 130],
        "coral": [255, 127, 80],
        "lavender": [230, 230, 250],
        "turquoise": [64, 224, 208],
        "beige": [245, 245, 220],
        "burgundy": [128, 0, 32],
        "mustard": [255, 219, 88],
        "peach": [255, 218, 185],
        "charcoal": [54, 69, 79]
    };

    // ======================== HELPERS ========================
    function getSwatchHex(colorName) {
        const rgb = colorRgbMap[colorName];
        if (!rgb) return "#cccccc";
        return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    }

    function findClosestColorName(r, g, b) {
        let minDist = Infinity;
        let closest = "gray";
        for (const [name, rgb] of Object.entries(colorRgbMap)) {
            const dr = r - rgb[0];
            const dg = g - rgb[1];
            const db = b - rgb[2];
            const dist = dr * dr + dg * dg + db * db;
            if (dist < minDist) {
                minDist = dist;
                closest = name;
            }
        }
        return closest;
    }

    function hslToRgb(h, s, l) {
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
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
        return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)];
    }

    function escapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

    function escapeHtml(str) {
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    // ======================== WHEEL ========================
    function drawColorWheel() {
        const canvas = document.getElementById('colorWheelCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const size = 300;
        canvas.width = size;
        canvas.height = size;
        const centerX = size / 2,
            centerY = size / 2;
        const radius = size / 2;
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= radius) {
                    let angle = Math.atan2(dy, dx);
                    let hue = (angle + Math.PI) / (2 * Math.PI);
                    let saturation = dist / radius;
                    let lightness = 0.5;
                    let rgb = hslToRgb(hue, saturation, lightness);
                    const idx = (y * size + x) * 4;
                    data[idx] = rgb[0];
                    data[idx + 1] = rgb[1];
                    data[idx + 2] = rgb[2];
                    data[idx + 3] = 255;
                } else {
                    const idx = (y * size + x) * 4;
                    data[idx] = 245;
                    data[idx + 1] = 245;
                    data[idx + 2] = 250;
                    data[idx + 3] = 255;
                }
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }

    function handleWheelClick(e) {
        const canvas = document.getElementById('colorWheelCanvas');
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        let mouseX, mouseY;
        if (e.touches) {
            mouseX = (e.touches[0].clientX - rect.left) * scaleX;
            mouseY = (e.touches[0].clientY - rect.top) * scaleY;
        } else {
            mouseX = (e.clientX - rect.left) * scaleX;
            mouseY = (e.clientY - rect.top) * scaleY;
        }
        if (mouseX < 0 || mouseY < 0 || mouseX > canvas.width || mouseY > canvas.height) return;
        const ctx = canvas.getContext('2d');
        const pixel = ctx.getImageData(mouseX, mouseY, 1, 1).data;
        const r = pixel[0],
            g = pixel[1],
            b = pixel[2];
        const closestColor = findClosestColorName(r, g, b);
        updateSelectedColorBox(closestColor);
    }

    // ======================== UPDATE LIVE COLOR BOX ========================
    function updateSelectedColorBox(colorName) {
        const colorData = colorMeaningsData[colorName];
        if (!colorData) return;
        const swatchDiv = document.getElementById('selectedSwatch');
        const nameDiv = document.getElementById('selectedColorName');
        const container = document.getElementById('selectedMeaningsContainer');
        if (swatchDiv) swatchDiv.style.background = getSwatchHex(colorName);
        if (nameDiv) nameDiv.innerText = colorName;
        if (container) {
            let html = `<div style="width:100%;">
                <div style="font-size:0.7rem; font-weight:600; text-transform:uppercase; letter-spacing:0.4px; color:var(--text-muted); margin-bottom:0.3rem;">
                    <i class="fas fa-seedling" style="color:#22c55e;"></i> positive
                </div>
                <div class="meaning-badge-cluster">`;
            if (colorData.positive.length) {
                colorData.positive.forEach(p => { html += `<span class="pill positive">${p}</span>`; });
            } else {
                html += `<span class="pill">—</span>`;
            }
            html += `</div>
                <div style="font-size:0.7rem; font-weight:600; text-transform:uppercase; letter-spacing:0.4px; color:var(--text-muted); margin:0.6rem 0 0.3rem;">
                    <i class="fas fa-cloud" style="color:#8b5cf6;"></i> shadow
                </div>
                <div class="meaning-badge-cluster">`;
            if (colorData.negative.length) {
                colorData.negative.forEach(n => { html += `<span class="pill negative">${n}</span>`; });
            } else {
                html += `<span class="pill" style="opacity:0.5;">— none listed —</span>`;
            }
            html += `</div></div>`;
            container.innerHTML = html;
        }
    }

    // ======================== RENDER GRID ========================
    function renderColorGrid(colorsToShow, highlightTerm) {
        const grid = document.getElementById('colorGridContainer');
        const statsSpan = document.getElementById('resultCount');
        if (!grid) return;
        if (!colorsToShow.length) {
            grid.innerHTML = `
                <div class="empty-message">
                    <i class="fas fa-search"></i>
                    No colors match this meaning. Try "love", "trust", "energy" or explore the wheel.
                </div>`;
            if (statsSpan) statsSpan.innerText = "0";
            return;
        }
        if (statsSpan) statsSpan.innerText = colorsToShow.length;

        const highlight = highlightTerm ? highlightTerm.trim() : "";
        const highlightRegex = highlight ? new RegExp(`(${escapeRegex(highlight)})`, 'gi') : null;
        const highlightTextFn = (text) => {
            if (highlight && highlightRegex) {
                return text.replace(highlightRegex, `<mark>$1</mark>`);
            }
            return text;
        };

        let html = "";
        for (const color of colorsToShow) {
            const swatchBg = getSwatchHex(color.name);
            let positiveBadges = color.positive.map(p =>
                `<span class="badge pos">${highlightTextFn(p)}</span>`
            ).join('');
            if (!color.positive.length) positiveBadges = '<span class="badge">—</span>';

            let negativeBadges = color.negative.map(n =>
                `<span class="badge neg">${highlightTextFn(n)}</span>`
            ).join('');
            if (!color.negative.length) negativeBadges = '<span class="badge">— none —</span>';

            html += `
                <div class="color-card" data-color-name="${color.name}">
                    <div class="card-header">
                        <div class="swatch-small" style="background: ${swatchBg};"></div>
                        <div class="color-title">${color.name}</div>
                    </div>
                    <div class="meanings-area">
                        <div class="badge-group">
                            <span class="badge-label"><i class="fas fa-seedling"></i> positive</span>
                            ${positiveBadges}
                        </div>
                        <div class="badge-group">
                            <span class="badge-label"><i class="fas fa-cloud"></i> shadow</span>
                            ${negativeBadges}
                        </div>
                    </div>
                </div>
            `;
        }
        grid.innerHTML = html;

        document.querySelectorAll('.color-card').forEach(card => {
            card.addEventListener('click', function() {
                const name = this.getAttribute('data-color-name');
                if (name) updateSelectedColorBox(name);
            });
        });
    }

    // ======================== SEARCH ========================
    function searchByMeaning(term) {
        if (!term || term.trim() === "") return allColors;
        const lowerTerm = term.trim().toLowerCase();
        return allColors.filter(color =>
            color.allMeanings.some(m => m.toLowerCase().includes(lowerTerm))
        );
    }

    function performSearch() {
        const input = document.getElementById('meaningSearchInput');
        const raw = input.value;
        const filtered = searchByMeaning(raw);
        renderColorGrid(filtered, raw);
        const statsDiv = document.getElementById('statsArea');
        if (raw.trim() === "") {
            statsDiv.innerHTML =
                `<i class="fas fa-palette" style="color:var(--border-active);"></i> <span id="resultCount">${filtered.length}</span> colors — full collection`;
        } else {
            statsDiv.innerHTML =
                `<i class="fas fa-palette" style="color:var(--border-active);"></i> <span id="resultCount">${filtered.length}</span> colors match “${escapeHtml(raw)}”`;
        }
    }

    function resetAll() {
        document.getElementById('meaningSearchInput').value = "";
        renderColorGrid(allColors, "");
        document.getElementById('statsArea').innerHTML =
            `<i class="fas fa-palette" style="color:var(--border-active);"></i> <span id="resultCount">${allColors.length}</span> colors — full collection`;
    }

    // ======================== DARK MODE ========================
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
        toggle.addEventListener('click', function() {
            const nowLight = document.body.classList.toggle('light');
            localStorage.setItem('helaberry_light', nowLight);
            this.innerHTML = nowLight ?
                '<i class="fas fa-sun"></i><span>Light</span>' :
                '<i class="fas fa-moon"></i><span>Dark</span>';
        });
    }

    // ======================== INIT ========================
    document.addEventListener('DOMContentLoaded', function() {
        // Draw wheel
        drawColorWheel();

        // Render grid with all colors
        renderColorGrid(allColors, "");
        document.getElementById('resultCount').innerText = allColors.length;

        // Wheel events
        const canvasElem = document.getElementById('colorWheelCanvas');
        canvasElem.addEventListener('click', handleWheelClick);
        canvasElem.addEventListener('touchstart', function(e) {
            e.preventDefault();
            handleWheelClick(e);
        }, { passive: false });

        // Search
        document.getElementById('searchBtn').addEventListener('click', performSearch);
        document.getElementById('resetBtn').addEventListener('click', resetAll);
        document.getElementById('meaningSearchInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') performSearch();
        });

        // Chips
        document.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', function() {
                const meaning = this.getAttribute('data-meaning');
                if (meaning) {
                    document.getElementById('meaningSearchInput').value = meaning;
                    performSearch();
                }
            });
        });

        // Brand scroll
        document.getElementById('brandLink').addEventListener('click', function(e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Init dark mode
        initTheme();

        // Default selected color
        updateSelectedColorBox("red");
    });

})();