(function() {
    // DOM elements
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const previewContainer = document.getElementById('previewContainer');
    const previewImage = document.getElementById('previewImage');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultsPanel = document.getElementById('resultsPanel');
    const colorGrid = document.getElementById('colorGridContainer');
    const mainColorsSpan = document.getElementById('mainColorsCount');
    const analyzedPixelsSpan = document.getElementById('analyzedPixels');
    const infoMsgDiv = document.getElementById('infoMessage');
    const copyAllBtn = document.getElementById('copyAllHexBtn');
    const exportCSVBtn = document.getElementById('exportCSVBtn');
    const exportJSONBtn = document.getElementById('exportJSONBtn');
    const numColorsSlider = document.getElementById('numColorsSlider');
    const numColorsValue = document.getElementById('numColorsValue');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const homePageBtn = document.getElementById('homePageBtn');

    let currentImageElement = null;
    let currentMainColors = [];
    
    // ----- DARK MODE LOGIC (with localStorage) -----
    function initTheme() {
        const savedTheme = localStorage.getItem('apollobery_theme');
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (darkModeToggle) darkModeToggle.innerHTML = '☀️ Light Mode';
        } else if (savedTheme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            if (darkModeToggle) darkModeToggle.innerHTML = '🌙 Dark Mode';
        } else {
            // check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.documentElement.setAttribute('data-theme', 'dark');
                if (darkModeToggle) darkModeToggle.innerHTML = '☀️ Light Mode';
                localStorage.setItem('apollobery_theme', 'dark');
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                if (darkModeToggle) darkModeToggle.innerHTML = '🌙 Dark Mode';
                localStorage.setItem('apollobery_theme', 'light');
            }
        }
    }

    function toggleDarkMode() {
        const current = document.documentElement.getAttribute('data-theme');
        if (current === 'dark') {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('apollobery_theme', 'light');
            darkModeToggle.innerHTML = '🌙 Dark Mode';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('apollobery_theme', 'dark');
            darkModeToggle.innerHTML = '☀️ Light Mode';
        }
    }

    if (darkModeToggle) darkModeToggle.addEventListener('click', toggleDarkMode);
    initTheme();

    // HOME PAGE BUTTON: navigates to homepage.html (updated as requested)
    if (homePageBtn) {
        homePageBtn.addEventListener('click', () => {
            // Direct link to homepage.html in the same directory
            window.location.href = 'homepage.html';
        });
    }

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
        currentMainColors = [];
    }

    // Extract pixel data from image (scaling for performance)
    async function extractPixelData(imgElement) {
        return new Promise((resolve, reject) => {
            try {
                const origWidth = imgElement.naturalWidth;
                const origHeight = imgElement.naturalHeight;
                if (origWidth === 0 || origHeight === 0) reject(new Error("Invalid image"));

                let targetWidth = origWidth;
                let targetHeight = origHeight;
                const MAX_PIXELS = 800000;
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
                const pixels = [];
                for (let i = 0; i < data.length; i += 4) {
                    pixels.push([data[i], data[i+1], data[i+2]]);
                }

                resolve({
                    pixels: pixels,
                    totalPixels: totalPixels,
                    wasScaled: wasScaled,
                    originalSize: { w: origWidth, h: origHeight },
                    scaledSize: { w: targetWidth, h: targetHeight }
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    // K-means clustering
    function kMeans(points, k, maxIterations = 20) {
        if (k >= points.length) {
            return points.map(p => ({ centroid: p, assignments: [p] }));
        }
        let centroids = [];
        const shuffled = [...points];
        for (let i = 0; i < k; i++) {
            const randIndex = Math.floor(Math.random() * shuffled.length);
            centroids.push([...shuffled[randIndex]]);
        }
        let assignments = new Array(points.length).fill(0);
        let changed = true;
        let iter = 0;
        while (changed && iter < maxIterations) {
            changed = false;
            for (let i = 0; i < points.length; i++) {
                const p = points[i];
                let minDist = Infinity;
                let newCluster = 0;
                for (let c = 0; c < centroids.length; c++) {
                    const dx = p[0] - centroids[c][0];
                    const dy = p[1] - centroids[c][1];
                    const dz = p[2] - centroids[c][2];
                    const dist = dx*dx + dy*dy + dz*dz;
                    if (dist < minDist) {
                        minDist = dist;
                        newCluster = c;
                    }
                }
                if (assignments[i] !== newCluster) {
                    changed = true;
                    assignments[i] = newCluster;
                }
            }
            const sums = Array(k).fill().map(() => [0,0,0]);
            const counts = Array(k).fill(0);
            for (let i = 0; i < points.length; i++) {
                const cluster = assignments[i];
                const p = points[i];
                sums[cluster][0] += p[0];
                sums[cluster][1] += p[1];
                sums[cluster][2] += p[2];
                counts[cluster]++;
            }
            for (let c = 0; c < k; c++) {
                if (counts[c] > 0) {
                    centroids[c] = [sums[c][0]/counts[c], sums[c][1]/counts[c], sums[c][2]/counts[c]];
                } else {
                    const rand = Math.floor(Math.random() * points.length);
                    centroids[c] = [...points[rand]];
                }
            }
            iter++;
        }
        const clusters = centroids.map((cent, idx) => ({
            centroid: cent.map(v => Math.round(v)),
            assignments: points.filter((_, i) => assignments[i] === idx)
        }));
        return clusters;
    }

    async function extractMainColors(imageElement, numColors) {
        setLoading(true, "Sampling pixels & clustering main colors...");
        try {
            const { pixels, totalPixels, wasScaled } = await extractPixelData(imageElement);
            let k = Math.min(numColors, pixels.length);
            if (k < 1) k = 1;
            let sampledPixels = pixels;
            const MAX_SAMPLE = 20000;
            if (pixels.length > MAX_SAMPLE) {
                const step = Math.ceil(pixels.length / MAX_SAMPLE);
                sampledPixels = [];
                for (let i = 0; i < pixels.length; i += step) sampledPixels.push(pixels[i]);
            }
            const clusters = kMeans(sampledPixels, k, 20);
            let assignmentPixels = pixels;
            if (pixels.length > 300000) {
                const sampleStep = Math.ceil(pixels.length / 150000);
                assignmentPixels = [];
                for (let i = 0; i < pixels.length; i += sampleStep) assignmentPixels.push(pixels[i]);
            }
            const totalAssigned = assignmentPixels.length;
            const centroidRGBs = clusters.map(c => c.centroid);
            const counts = new Array(centroidRGBs.length).fill(0);
            for (let p of assignmentPixels) {
                let bestIdx = 0;
                let bestDist = Infinity;
                for (let i = 0; i < centroidRGBs.length; i++) {
                    const dx = p[0] - centroidRGBs[i][0];
                    const dy = p[1] - centroidRGBs[i][1];
                    const dz = p[2] - centroidRGBs[i][2];
                    const dist = dx*dx + dy*dy + dz*dz;
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestIdx = i;
                    }
                }
                counts[bestIdx]++;
            }
            const mainColors = centroidRGBs.map((rgb, idx) => {
                const r = Math.min(255, Math.max(0, rgb[0]));
                const g = Math.min(255, Math.max(0, rgb[1]));
                const b = Math.min(255, Math.max(0, rgb[2]));
                const percent = (counts[idx] / totalAssigned) * 100;
                return {
                    r, g, b,
                    hex: rgbToHex(r, g, b),
                    percent: percent,
                    count: counts[idx]
                };
            }).sort((a,b) => b.percent - a.percent);
            return {
                mainColors: mainColors,
                totalPixelsAnalyzed: totalPixels,
                wasScaled: wasScaled,
                clusters: clusters.length
            };
        } catch (err) {
            throw err;
        } finally {
            setLoading(false);
        }
    }

    function renderColors(colors) {
        if (!colors.length) {
            colorGrid.innerHTML = `<div class="info-message">😕 No colors extracted. Try a different image or adjust number of colors.</div>`;
            return;
        }
        let html = '';
        for (let col of colors) {
            html += `
                <div class="color-card" data-hex="${col.hex}" data-rgb="${col.r},${col.g},${col.b}">
                    <div class="color-swatch" style="background-color: ${col.hex};"></div>
                    <div class="color-info">
                        <div class="hex-code">${col.hex}</div>
                        <div class="rgb-values">RGB(${col.r}, ${col.g}, ${col.b})</div>
                        <div class="percent">📊 ${col.percent.toFixed(2)}%</div>
                    </div>
                </div>
            `;
        }
        colorGrid.innerHTML = html;
        document.querySelectorAll('.color-card').forEach(card => {
            card.addEventListener('click', (e) => {
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
    }

    async function updateWithMainColors(image, numColors) {
        resetUI();
        try {
            const result = await extractMainColors(image, numColors);
            currentMainColors = result.mainColors;
            mainColorsSpan.innerText = currentMainColors.length;
            analyzedPixelsSpan.innerText = result.totalPixelsAnalyzed.toLocaleString();
            renderColors(currentMainColors);
            resultsPanel.style.display = 'block';
            if (result.wasScaled) {
                infoMsgDiv.style.display = 'block';
                infoMsgDiv.innerHTML = `🔍 Image was large – scaled for analysis. Main colors are representative.`;
            } else {
                infoMsgDiv.style.display = 'none';
            }
            resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (err) {
            console.error(err);
            setLoading(false);
            alert("Error during color extraction: " + err.message);
        }
    }

    function runAnalysis() {
        if (!currentImageElement) {
            alert("Please upload an image first.");
            return;
        }
        const numColors = parseInt(numColorsSlider.value, 10);
        updateWithMainColors(currentImageElement, numColors);
    }

    async function handleImageFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            alert("Please select a valid image file.");
            return;
        }
        resetUI();
        setLoading(true, "Loading image...");
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
            currentImageElement = img;
            const numColors = parseInt(numColorsSlider.value, 10);
            await updateWithMainColors(currentImageElement, numColors);
        } catch (err) {
            setLoading(false);
            alert("Error loading image: " + err.message);
            previewContainer.style.display = 'none';
        } finally {
            URL.revokeObjectURL(objectURL);
        }
    }

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) handleImageFile(e.target.files[0]);
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--accent)';
        dropZone.style.backgroundColor = 'var(--control-bg)';
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = 'var(--dropzone-border)';
        dropZone.style.backgroundColor = 'var(--dropzone-bg)';
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--dropzone-border)';
        dropZone.style.backgroundColor = 'var(--dropzone-bg)';
        const files = e.dataTransfer.files;
        if (files.length && files[0].type.startsWith('image/')) handleImageFile(files[0]);
        else alert("Drop an image file");
    });
    dropZone.addEventListener('click', (e) => {
        if (e.target === dropZone || e.target.closest('.drop-zone') && !e.target.closest('.file-label')) {
            fileInput.click();
        }
    });

    analyzeBtn.addEventListener('click', runAnalysis);
    numColorsSlider.addEventListener('input', (e) => {
        numColorsValue.innerText = e.target.value;
    });

    copyAllBtn.addEventListener('click', () => {
        if (!currentMainColors.length) return;
        const hexes = currentMainColors.map(c => c.hex).join('\n');
        navigator.clipboard.writeText(hexes).then(() => {
            const original = copyAllBtn.innerText;
            copyAllBtn.innerText = "✓ Copied!";
            setTimeout(() => { copyAllBtn.innerText = original; }, 1500);
        });
    });

    exportCSVBtn.addEventListener('click', () => {
        if (!currentMainColors.length) return;
        const headers = ["Hex", "R", "G", "B", "Percentage (%)"];
        const rows = currentMainColors.map(c => [c.hex, c.r, c.g, c.b, c.percent.toFixed(4)]);
        const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "main_colors.csv";
        a.click();
        URL.revokeObjectURL(url);
    });

    exportJSONBtn.addEventListener('click', () => {
        if (!currentMainColors.length) return;
        const jsonData = currentMainColors.map(c => ({
            hex: c.hex,
            rgb: { r: c.r, g: c.g, b: c.b },
            percentage: parseFloat(c.percent.toFixed(4))
        }));
        const jsonStr = JSON.stringify(jsonData, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "main_colors.json";
        a.click();
        URL.revokeObjectURL(url);
    });
})();