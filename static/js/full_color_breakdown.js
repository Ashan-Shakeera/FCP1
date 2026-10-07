(function() {
    // DOM elements
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const previewContainer = document.getElementById('previewContainer');
    const previewImage = document.getElementById('previewImage');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultsPanel = document.getElementById('resultsPanel');
    const colorGrid = document.getElementById('colorGridContainer');
    const totalColorsSpan = document.getElementById('totalColorsCount');
    const analyzedPixelsSpan = document.getElementById('analyzedPixels');
    const infoMsgDiv = document.getElementById('infoMessage');
    const copyAllHexBtn = document.getElementById('copyAllHexBtn');
    const exportCSVBtn = document.getElementById('exportCSVBtn');
    const exportJSONBtn = document.getElementById('exportJSONBtn');

    // Dark mode elements
    const darkModeToggle = document.getElementById('darkModeToggle');

    let currentColorData = []; // array of { hex, r, g, b, count, percent }

    // ---------- DARK MODE LOGIC (localStorage) ----------
    function initDarkMode() {
        const stored = localStorage.getItem('apollobery_darkmode');
        if (stored === 'enabled') {
            document.body.classList.add('dark');
            if (darkModeToggle) darkModeToggle.checked = true;
        } else if (stored === 'disabled') {
            document.body.classList.remove('dark');
            if (darkModeToggle) darkModeToggle.checked = false;
        } else {
            // auto detect system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.body.classList.add('dark');
                if (darkModeToggle) darkModeToggle.checked = true;
                localStorage.setItem('apollobery_darkmode', 'enabled');
            } else {
                document.body.classList.remove('dark');
                if (darkModeToggle) darkModeToggle.checked = false;
                localStorage.setItem('apollobery_darkmode', 'disabled');
            }
        }
    }

    function setDarkMode(enabled) {
        if (enabled) {
            document.body.classList.add('dark');
            localStorage.setItem('apollobery_darkmode', 'enabled');
        } else {
            document.body.classList.remove('dark');
            localStorage.setItem('apollobery_darkmode', 'disabled');
        }
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', (e) => {
            setDarkMode(e.target.checked);
        });
    }
    initDarkMode();

    // Helper: RGB to HEX
    function rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

    function setLoading(isLoading, text = "Analyzing colors...") {
        if (isLoading) {
            loadingIndicator.innerHTML = `<div class="loader"><div class="spinner"></div> ${text}</div>`;
        } else {
            loadingIndicator.innerHTML = '';
        }
    }

    function resetUI() {
        resultsPanel.style.display = 'none';
        colorGrid.innerHTML = '';
        infoMsgDiv.style.display = 'none';
        currentColorData = [];
    }

    // Main color extraction (scaling for large images)
    async function extractAllColors(imgElement) {
        return new Promise((resolve, reject) => {
            try {
                const origWidth = imgElement.naturalWidth;
                const origHeight = imgElement.naturalHeight;
                if (origWidth === 0 || origHeight === 0) reject(new Error("Invalid image"));

                let targetWidth = origWidth;
                let targetHeight = origHeight;
                const MAX_PIXELS = 700000;
                let wasScaled = false;
                if (origWidth * origHeight > MAX_PIXELS) {
                    const scale = Math.sqrt(MAX_PIXELS / (origWidth * origHeight));
                    targetWidth = Math.floor(origWidth * scale);
                    targetHeight = Math.floor(origHeight * scale);
                    wasScaled = true;
                }

                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) reject(new Error("Canvas not supported"));

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(imgElement, 0, 0, targetWidth, targetHeight);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const totalPixels = canvas.width * canvas.height;

                const colorMap = new Map();

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i+1];
                    const b = data[i+2];
                    const key = `${r},${g},${b}`;
                    colorMap.set(key, (colorMap.get(key) || 0) + 1);
                }

                let colorEntries = Array.from(colorMap.entries()).map(([key, count]) => {
                    const [r, g, b] = key.split(',').map(Number);
                    return { r, g, b, count, hex: rgbToHex(r, g, b) };
                });
                colorEntries.sort((a, b) => b.count - a.count);

                const total = totalPixels;
                colorEntries.forEach(c => { c.percent = (c.count / total) * 100; });

                resolve({
                    colors: colorEntries,
                    totalPixelsAnalyzed: total,
                    wasScaled: wasScaled,
                    originalSize: { w: origWidth, h: origHeight },
                    scaledSize: { w: targetWidth, h: targetHeight }
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    // Render all colors (full list)
    function renderColors(colorsArray, totalPixels, wasScaled) {
        if (!colorsArray.length) {
            colorGrid.innerHTML = `<div class="info-message">😕 No colors found. Try a different image.</div>`;
            return;
        }

        let html = '';
        for (let col of colorsArray) {
            html += `
                <div class="color-card" data-hex="${col.hex}" data-rgb="${col.r},${col.g},${col.b}">
                    <div class="color-swatch" style="background-color: ${col.hex};"></div>
                    <div class="color-info">
                        <div class="hex-code">${col.hex}</div>
                        <div class="rgb-values">RGB(${col.r}, ${col.g}, ${col.b})</div>
                        <div class="count-percent">
                            <span>🔢 ${col.count.toLocaleString()}</span>
                            <span>📊 ${col.percent.toFixed(2)}%</span>
                        </div>
                    </div>
                </div>
            `;
        }
        colorGrid.innerHTML = html;

        // Attach click-to-copy
        document.querySelectorAll('.color-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                const hex = card.getAttribute('data-hex');
                if (hex) {
                    navigator.clipboard.writeText(hex).then(() => {
                        const hexSpan = card.querySelector('.hex-code');
                        if (hexSpan) {
                            const original = hexSpan.innerText;
                            hexSpan.innerText = '✓ Copied!';
                            setTimeout(() => { hexSpan.innerText = original; }, 800);
                        }
                    }).catch(() => alert("Could not copy"));
                }
            });
        });

        if (wasScaled) {
            infoMsgDiv.style.display = 'block';
            infoMsgDiv.innerHTML = `🔍 Original image was large (over 700k pixels). Analysis performed on a scaled version to ensure speed, but all distinct colors from the scaled view are shown. For extremely detailed images, colors remain representative.`;
        } else if (colorsArray.length > 2000) {
            infoMsgDiv.style.display = 'block';
            infoMsgDiv.innerHTML = `📊 The image contains ${colorsArray.length} unique colors. Displaying all of them – scrolling may be heavy but every color is listed.`;
        } else {
            infoMsgDiv.style.display = 'none';
        }
    }

    function exportToCSV(colors) {
        if (!colors.length) return;
        const headers = ["Hex", "R", "G", "B", "Pixel Count", "Percentage (%)"];
        const rows = colors.map(c => [c.hex, c.r, c.g, c.b, c.count, c.percent.toFixed(4)]);
        const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "apollobery_colors.csv";
        a.click();
        URL.revokeObjectURL(url);
    }

    function exportToJSON(colors) {
        const data = colors.map(c => ({
            hex: c.hex,
            rgb: { r: c.r, g: c.g, b: c.b },
            pixel_count: c.count,
            percentage: parseFloat(c.percent.toFixed(4))
        }));
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "apollobery_colors.json";
        a.click();
        URL.revokeObjectURL(url);
    }

    function copyAllHex() {
        if (!currentColorData.length) return;
        const hexList = currentColorData.map(c => c.hex).join("\n");
        navigator.clipboard.writeText(hexList).then(() => {
            const originalText = copyAllHexBtn.innerText;
            copyAllHexBtn.innerText = "✓ Copied!";
            setTimeout(() => { copyAllHexBtn.innerText = originalText; }, 1500);
        }).catch(() => alert("Could not copy"));
    }

    // Main image handler
    async function handleImageFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            alert("Please select a valid image file.");
            return;
        }

        resetUI();
        setLoading(true, "Loading image & scanning pixels...");
        previewContainer.style.display = 'none';
        const objectURL = URL.createObjectURL(file);
        const img = new Image();

        try {
            await new Promise((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error("Image failed to load"));
                img.src = objectURL;
            });

            previewImage.src = objectURL;
            previewContainer.style.display = 'flex';

            const extraction = await extractAllColors(img);
            const { colors, totalPixelsAnalyzed, wasScaled } = extraction;

            if (!colors.length) {
                setLoading(false);
                resultsPanel.style.display = 'block';
                colorGrid.innerHTML = `<div class="info-message">No color data. Try a different image.</div>`;
                totalColorsSpan.innerText = '0';
                analyzedPixelsSpan.innerText = totalPixelsAnalyzed;
                return;
            }

            currentColorData = colors;
            totalColorsSpan.innerText = colors.length.toLocaleString();
            analyzedPixelsSpan.innerText = totalPixelsAnalyzed.toLocaleString();
            renderColors(colors, totalPixelsAnalyzed, wasScaled);
            resultsPanel.style.display = 'block';
            setLoading(false);
            resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (err) {
            console.error(err);
            setLoading(false);
            alert("Error processing image: " + err.message);
            previewContainer.style.display = 'none';
        } finally {
            URL.revokeObjectURL(objectURL);
        }
    }

    // Event listeners
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) handleImageFile(e.target.files[0]);
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#2c7da0';
        dropZone.style.backgroundColor = '#f5faff';
        if (document.body.classList.contains('dark')) dropZone.style.backgroundColor = '#1e2a3a';
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = '#bbd4e5';
        dropZone.style.backgroundColor = '#fefefe';
        if (document.body.classList.contains('dark')) dropZone.style.backgroundColor = '#0f172a';
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#bbd4e5';
        dropZone.style.backgroundColor = '#fefefe';
        if (document.body.classList.contains('dark')) dropZone.style.backgroundColor = '#0f172a';
        const files = e.dataTransfer.files;
        if (files.length && files[0].type.startsWith('image/')) handleImageFile(files[0]);
        else alert("Drop an image file");
    });
    dropZone.addEventListener('click', (e) => {
        if (e.target === dropZone || e.target.closest('.drop-zone') && !e.target.closest('.file-label')) {
            fileInput.click();
        }
    });

    copyAllHexBtn.addEventListener('click', () => copyAllHex());
    exportCSVBtn.addEventListener('click', () => exportToCSV(currentColorData));
    exportJSONBtn.addEventListener('click', () => exportToJSON(currentColorData));
})();