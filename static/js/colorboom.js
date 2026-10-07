/* ============================================================
   COLOR RIDER — Complete Professional 2D Endless Runner
   ✅ FIXED: PNGs now load from /static/images/ with fallback chain
   ============================================================ */
(function () {
    'use strict';

    // ============================================================
    // ASSET PATH RESOLUTION — tries every plausible location.
    // The first one that loads wins.
    // ============================================================
    const ASSET_CANDIDATES = {
        bike: [
            '/static/images/bike1.png',   // ← your Flask path (try first)
            '/static/bike1.png',
            '/images/bike1.png',
            './bike1.png',
            'bike1.png',
            'static/images/bike1.png'
        ],
        background: [
            '/static/images/back1.png',   // ← your Flask path (try first)
            '/static/back1.png',
            '/images/back1.png',
            './back1.png',
            'back1.png',
            'static/images/back1.png'
        ]
    };

    /**
     * Try each URL in order until one loads successfully.
     * Resolves to { img, url } or null if all failed.
     */
    function loadImageWithFallback(candidates) {
        return new Promise((resolve) => {
            let idx = 0;
            function tryNext() {
                if (idx >= candidates.length) {
                    console.error('[ColorRider] ❌ All candidate URLs failed:', candidates);
                    return resolve(null);
                }
                const url = candidates[idx++];
                const img = new Image();
                img.onload = () => {
                    if (img.width > 0 && img.height > 0) {
                        console.log('[ColorRider] ✅ Loaded:', url, `(${img.width}×${img.height})`);
                        resolve({ img, url });
                    } else {
                        console.warn('[ColorRider] ⚠️ Decoded but 0×0:', url);
                        tryNext();
                    }
                };
                img.onerror = () => {
                    console.warn('[ColorRider] ❌ 404:', url);
                    tryNext();
                };
                img.src = url;
            }
            tryNext();
        });
    }

    // ============================================================
    // CONFIGURATION
    // ============================================================
    const CONFIG = {
        gravity: 0.9,
        jumpForce: -17,
        groundY: 0,
        baseSpeed: 6,
        maxSpeed: 16,
        speedIncrease: 0.0008,
        baseSpawnInterval: 1100,
        minSpawnInterval: 620,
        spawnIntervalDecrease: 0.35,
        bikeHeight: 200,
        blockWidth: 60,
        blockHeight: 45,
        colors: {
            red:    { hex: '#e63946', glow: '#ff5566', gradient: ['#ff6b6b', '#cc0000'] },
            blue:   { hex: '#3d7dff', glow: '#5a95ff', gradient: ['#6bb5ff', '#0055cc'] },
            green:  { hex: '#2ecc71', glow: '#4aff88', gradient: ['#6bff8b', '#00aa33'] },
            yellow: { hex: '#f9c74f', glow: '#ffdd66', gradient: ['#ffee6b', '#ccaa00'] }
        },
        colorKeys: ['red', 'blue', 'green', 'yellow'],
        pointsPerFrame: 0.15,
        matchBonus: 25,
        storageKey: 'colorRiderHighScore'
    };

    // ============================================================
    // UTILITIES
    // ============================================================
    const Utils = {
        rand(min, max) { return Math.random() * (max - min) + min; },
        choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
        clamp(v, min, max) { return Math.max(min, Math.min(max, v)); },
        lerp(a, b, t) { return a + (b - a) * t; }
    };

    // ============================================================
    // AUDIO
    // ============================================================
    class AudioManager {
        constructor() { this.ctx = null; this.enabled = true; this.masterGain = null; }

        init() {
            if (this.ctx) return;
            try {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) { this.enabled = false; return; }
                this.ctx = new AC();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.value = 0.35;
                this.masterGain.connect(this.ctx.destination);
            } catch (e) { this.enabled = false; }
        }

        resume() {
            if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        }

        tone(freq, duration, type = 'sine', volume = 0.3, slideTo = null) {
            if (!this.enabled || !this.ctx) return;
            try {
                const t = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, t);
                if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), t + duration);
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(volume, t + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
                osc.connect(gain); gain.connect(this.masterGain);
                osc.start(t); osc.stop(t + duration + 0.02);
            } catch (e) {}
        }

        noise(duration, volume = 0.2, filterFreq = 1000) {
            if (!this.enabled || !this.ctx) return;
            try {
                const t = this.ctx.currentTime;
                const bufferSize = Math.floor(this.ctx.sampleRate * duration);
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
                const src = this.ctx.createBufferSource();
                src.buffer = buffer;
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass'; filter.frequency.value = filterFreq;
                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(volume, t);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
                src.connect(filter); filter.connect(gain); gain.connect(this.masterGain);
                src.start(t);
            } catch (e) {}
        }

        jump() { this.tone(420, 0.18, 'square', 0.25, 880); }
        land() { this.noise(0.08, 0.15, 500); }
        match(comboLevel) {
            const base = 660 + Math.min(comboLevel, 8) * 80;
            this.tone(base, 0.12, 'sine', 0.3, base * 1.5);
            setTimeout(() => this.tone(base * 1.5, 0.1, 'sine', 0.2), 60);
        }
        wrong() {
            this.tone(200, 0.4, 'sawtooth', 0.35, 60);
            setTimeout(() => this.tone(150, 0.5, 'sawtooth', 0.3, 40), 100);
        }
        gameOver() { [400, 340, 280, 200].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'triangle', 0.3), i * 140)); }
        start() { [400, 500, 650, 800].forEach((f, i) => setTimeout(() => this.tone(f, 0.15, 'sine', 0.25), i * 90)); }
    }

    // ============================================================
    // INPUT
    // ============================================================
    class InputManager {
        constructor() { this.jumpJustPressed = false; this.pauseJustPressed = false; this._bind(); }
        _bind() {
            window.addEventListener('keydown', (e) => {
                if (e.repeat) return;
                if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); this.jumpJustPressed = true; }
                if (e.code === 'KeyP' || e.code === 'Escape') { e.preventDefault(); this.pauseJustPressed = true; }
            }, { passive: false });
        }
        consumeJump() { if (this.jumpJustPressed) { this.jumpJustPressed = false; return true; } return false; }
        consumePause() { if (this.pauseJustPressed) { this.pauseJustPressed = false; return true; } return false; }
    }

    // ============================================================
    // PARTICLES
    // ============================================================
    class Particle {
        constructor(x, y, vx, vy, color, size, life, gravity = 0) {
            this.x = x; this.y = y; this.vx = vx; this.vy = vy;
            this.color = color; this.size = size; this.life = life;
            this.maxLife = life; this.gravity = gravity;
        }
        update(dt) {
            this.x += this.vx * dt * 60; this.y += this.vy * dt * 60;
            this.vy += this.gravity * dt * 60; this.life -= dt;
        }
        draw(ctx) {
            const alpha = Utils.clamp(this.life / this.maxLife, 0, 1);
            ctx.globalAlpha = alpha; ctx.fillStyle = this.color;
            ctx.shadowColor = this.color; ctx.shadowBlur = 15;
            ctx.beginPath(); ctx.arc(this.x, this.y, Math.max(0.5, this.size * alpha), 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        }
    }

    class ParticleSystem {
        constructor() { this.particles = []; this.maxParticles = 400; }
        emitBurst(x, y, color, count = 20, speed = 8) {
            count = Math.min(count, this.maxParticles - this.particles.length);
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 * i) / count + Utils.rand(-0.3, 0.3);
                const spd = Utils.rand(speed * 0.4, speed);
                this.particles.push(new Particle(x, y, Math.cos(angle) * spd, Math.sin(angle) * spd, color, Utils.rand(3, 9), Utils.rand(0.4, 0.9), 0.15));
            }
        }
        emitTrail(x, y, color) {
            if (this.particles.length >= this.maxParticles) return;
            this.particles.push(new Particle(x + Utils.rand(-8, 8), y + Utils.rand(-8, 8), Utils.rand(-2, -0.5), Utils.rand(-1, 1), color, Utils.rand(2, 6), Utils.rand(0.3, 0.7), 0));
        }
        update(dt) {
            for (let i = this.particles.length - 1; i >= 0; i--) {
                this.particles[i].update(dt);
                if (this.particles[i].life <= 0) this.particles.splice(i, 1);
            }
        }
        draw(ctx) { for (let i = 0; i < this.particles.length; i++) this.particles[i].draw(ctx); }
        clear() { this.particles.length = 0; }
    }

    // ============================================================
    // BLOCK
    // ============================================================
    class Block {
        constructor(x, y, width, height, colorKey) {
            this.x = x; this.y = y; this.width = width; this.height = height;
            this.colorKey = colorKey; this.color = CONFIG.colors[colorKey];
            this.markedForDeletion = false; this.hit = false;
            this.wobblePhase = Utils.rand(0, Math.PI * 2);
        }
        update(dt, speed) {
            this.x -= speed * dt * 60; this.wobblePhase += dt * 4;
            if (this.x + this.width < -60) this.markedForDeletion = true;
        }
        draw(ctx) {
            if (this.markedForDeletion) return;
            const wobble = Math.sin(this.wobblePhase) * 1.5;
            const x = this.x, y = this.y + wobble, w = this.width, h = this.height;
            ctx.save();
            ctx.shadowColor = this.color.glow; ctx.shadowBlur = 20;
            const grad = ctx.createLinearGradient(x, y, x, y + h);
            grad.addColorStop(0, this.color.gradient[0]);
            grad.addColorStop(1, this.color.gradient[1]);
            const radius = 8;
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + w - radius, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
            ctx.lineTo(x + w, y + h - radius);
            ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
            ctx.lineTo(x + radius, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
            ctx.fillStyle = grad; ctx.fill();
            ctx.shadowBlur = 0; ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 5, y + 4); ctx.lineTo(x + w - 5, y + 4);
            ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.stroke();
            ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1;
            ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.fillText('●', x + w / 2, y + h / 2);
            ctx.restore();
        }
        getBounds() { return { x: this.x, y: this.y, w: this.width, h: this.height }; }
    }

    // ============================================================
    // MAIN GAME
    // ============================================================
    class Game {
        constructor() {
            this.canvas = document.getElementById('gameCanvas');
            this.ctx = this.canvas.getContext('2d');
            this.audio = new AudioManager();
            this.input = new InputManager();
            this.particles = new ParticleSystem();

            this.state = 'loading';
            this.initialized = false;
            this.images = { bike: null, background: null };
            this.highScore = 0;
            this.lastTime = 0;
            this.countdownTimer = null;
            this.gameOverTimer = null;
            this._lastScoreDisplayed = -1;

            this.dom = {
                score: document.getElementById('scoreValue'),
                best: document.getElementById('bestValue'),
                targetOrb: document.getElementById('targetOrb'),
                comboPopup: document.getElementById('comboPopup'),
                flash: document.getElementById('flashOverlay'),
                countdown: document.getElementById('countdown'),
                pauseIndicator: document.getElementById('pauseIndicator'),
                startScreen: document.getElementById('startScreen'),
                gameOverScreen: document.getElementById('gameOverScreen'),
                finalScore: document.getElementById('finalScore'),
                finalBest: document.getElementById('finalBest'),
                finalDistance: document.getElementById('finalDistance')
            };

            this.viewWidth = window.innerWidth;
            this.viewHeight = window.innerHeight;
            this.bgWidth = 0;
            this.bgOffset = 0;
            this.blocks = [];
            this.player = null;

            this._resize();
            this._bindUI();

            window.addEventListener('resize', () => this._resize());
            window.addEventListener('orientationchange', () => setTimeout(() => this._resize(), 150));
            document.addEventListener('visibilitychange', () => {
                if (document.hidden && this.state === 'playing') this._togglePause();
            });

            this._boot();
        }

        // ------------------------------------------------------
        // BOOT — async load assets then start the loop
        // ------------------------------------------------------
        async _boot() {
            console.log('[ColorRider] Loading assets…');
            const [bikeResult, bgResult] = await Promise.all([
                loadImageWithFallback(ASSET_CANDIDATES.bike),
                loadImageWithFallback(ASSET_CANDIDATES.background)
            ]);

            if (bikeResult) this.images.bike = bikeResult.img;
            else console.warn('[ColorRider] No bike PNG — using programmatic fallback.');

            if (bgResult) {
                this.images.background = bgResult.img;
                this._computeBackgroundScale();
            } else {
                console.warn('[ColorRider] No background PNG — using gradient fallback.');
            }

            this.initialized = true;
            this.state = 'menu';
            this._setupGroundY();
            this._loadHighScore();
            this._loop(0);
        }

        _setupGroundY() {
            const h = this.viewHeight;
            CONFIG.groundY = h - Math.max(120, h * 0.18);
        }

        // ------------------------------------------------------
        // RESIZE
        // ------------------------------------------------------
        _resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = window.innerWidth;
            const h = window.innerHeight;
            this.canvas.width = w * dpr;
            this.canvas.height = h * dpr;
            this.canvas.style.width = w + 'px';
            this.canvas.style.height = h + 'px';
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this.viewWidth = w;
            this.viewHeight = h;
            this._setupGroundY();
            this._computeBackgroundScale();
            if (this.player) {
                this.player.groundY = CONFIG.groundY - CONFIG.bikeHeight;
                this.player.x = Math.max(60, w * 0.12);
                this.player.y = Math.min(this.player.y, this.player.groundY);
                for (const b of this.blocks) b.y = CONFIG.groundY - CONFIG.blockHeight;
            }
        }

        _computeBackgroundScale() {
            const img = this.images.background;
            if (!img || !img.width || !img.height) { this.bgWidth = this.viewWidth; return; }
            const scale = this.viewHeight / img.height;
            this.bgWidth = img.width * scale;
        }

        // ------------------------------------------------------
        // UI BINDING
        // ------------------------------------------------------
        _bindUI() {
            document.getElementById('startBtn').addEventListener('click', () => this._startGame());
            document.getElementById('retryBtn').addEventListener('click', () => this._startGame());
            document.getElementById('menuBtn').addEventListener('click', () => this._returnToMenu());

            const jumpBtn = document.getElementById('mobileJump');
            const restartBtn = document.getElementById('mobileRestart');
            const onJumpStart = (e) => { e.preventDefault(); e.stopPropagation(); this.input.jumpJustPressed = true; };

            jumpBtn.addEventListener('touchstart', onJumpStart, { passive: false });
            jumpBtn.addEventListener('mousedown', onJumpStart);

            restartBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.state === 'gameover' || this.state === 'menu') this._startGame();
                else if (this.state === 'playing' || this.state === 'paused') this._gameOver();
            });
        }

        // ------------------------------------------------------
        // HIGH SCORE
        // ------------------------------------------------------
        _loadHighScore() {
            try {
                const v = localStorage.getItem(CONFIG.storageKey);
                this.highScore = v ? parseInt(v, 10) : 0;
                if (isNaN(this.highScore) || this.highScore < 0) this.highScore = 0;
            } catch (e) { this.highScore = 0; }
            this.dom.best.textContent = Math.floor(this.highScore);
        }

        _saveHighScore() {
            try { localStorage.setItem(CONFIG.storageKey, Math.floor(this.highScore)); } catch (e) {}
        }

        // ------------------------------------------------------
        // GAME FLOW
        // ------------------------------------------------------
        _startGame() {
            if (this.countdownTimer) { clearTimeout(this.countdownTimer); this.countdownTimer = null; }
            if (this.gameOverTimer) { clearTimeout(this.gameOverTimer); this.gameOverTimer = null; }
            this.audio.init();
            this.audio.resume();
            this.dom.startScreen.classList.add('hidden');
            this.dom.gameOverScreen.classList.remove('visible');
            this.dom.pauseIndicator.classList.remove('visible');
            this.dom.countdown.classList.remove('show');
            this.dom.countdown.innerHTML = '';
            this._resetGameState();
            this._runCountdown(() => {
                this.state = 'playing';
                this.lastTime = 0;
                this.audio.start();
            });
        }

        _resetGameState() {
            this.score = 0;
            this.distance = 0;
            this.speed = CONFIG.baseSpeed;
            this.combo = 0;
            this.maxCombo = 0;
            this.gameTime = 0;
            this.spawnTimer = 0;
            this.spawnInterval = CONFIG.baseSpawnInterval;
            this._lastScoreDisplayed = -1;
            this.blocks = [];
            this.particles.clear();
            this.bgOffset = 0;
            this.targetColorKey = Utils.choice(CONFIG.colorKeys);
            this._updateTargetOrb();

            let bikeRatio = 1.4;
            if (this.images.bike && this.images.bike.width && this.images.bike.height) {
                bikeRatio = this.images.bike.width / this.images.bike.height;
            }

            this.player = {
                x: Math.max(60, this.viewWidth * 0.12),
                y: CONFIG.groundY - CONFIG.bikeHeight,
                vy: 0,
                width: CONFIG.bikeHeight * bikeRatio,
                height: CONFIG.bikeHeight,
                groundY: CONFIG.groundY - CONFIG.bikeHeight,
                onGround: true,
                tilt: 0,
                colorKey: this.targetColorKey,
                trailTimer: 0
            };
            this.dom.score.textContent = '0';
        }

        _runCountdown(callback) {
            this.state = 'countdown';
            this.dom.countdown.classList.add('show');
            const numbers = ['3', '2', '1', 'GO!'];
            let idx = 0;
            const showNext = () => {
                if (idx >= numbers.length) {
                    this.dom.countdown.classList.remove('show');
                    this.dom.countdown.innerHTML = '';
                    this.countdownTimer = null;
                    callback();
                    return;
                }
                this.dom.countdown.innerHTML = '<div class="countdown-num">' + numbers[idx] + '</div>';
                this.audio.tone(600 + idx * 150, 0.12, 'sine', 0.2);
                idx++;
                this.countdownTimer = setTimeout(showNext, 700);
            };
            showNext();
        }

        _gameOver() {
            if (this.state === 'gameover') return;
            this.state = 'gameover';
            if (this.countdownTimer) { clearTimeout(this.countdownTimer); this.countdownTimer = null; }
            this.dom.countdown.classList.remove('show');
            this.audio.wrong();
            setTimeout(() => this.audio.gameOver(), 200);

            if (this.player) {
                const px = this.player.x + this.player.width / 2;
                const py = this.player.y + this.player.height / 2;
                this.particles.emitBurst(px, py, CONFIG.colors[this.player.colorKey].glow, 40, 14);
            }
            this.dom.flash.classList.remove('flash');
            void this.dom.flash.offsetWidth;
            this.dom.flash.classList.add('flash');

            if (this.score > this.highScore) {
                this.highScore = this.score;
                this._saveHighScore();
                this.dom.best.textContent = Math.floor(this.highScore);
            }
            this.gameOverTimer = setTimeout(() => {
                this.dom.finalScore.textContent = Math.floor(this.score);
                this.dom.finalBest.textContent = Math.floor(this.highScore);
                this.dom.finalDistance.textContent = Math.floor(this.distance) + 'm';
                this.dom.gameOverScreen.classList.add('visible');
                this.gameOverTimer = null;
            }, 600);
        }

        _returnToMenu() {
            if (this.countdownTimer) { clearTimeout(this.countdownTimer); this.countdownTimer = null; }
            if (this.gameOverTimer) { clearTimeout(this.gameOverTimer); this.gameOverTimer = null; }
            this.dom.countdown.classList.remove('show');
            this.dom.countdown.innerHTML = '';
            this.state = 'menu';
            this.dom.gameOverScreen.classList.remove('visible');
            this.dom.startScreen.classList.remove('hidden');
            this.dom.pauseIndicator.classList.remove('visible');
        }

        _togglePause() {
            if (this.state === 'playing') {
                this.state = 'paused';
                this.dom.pauseIndicator.classList.add('visible');
            } else if (this.state === 'paused') {
                this.state = 'playing';
                this.dom.pauseIndicator.classList.remove('visible');
                this.lastTime = 0;
            }
        }

        _updateTargetOrb() {
            const c = CONFIG.colors[this.targetColorKey];
            this.dom.targetOrb.style.background = 'radial-gradient(circle at 35% 30%, #fff, ' + c.gradient[0] + ' 40%, ' + c.gradient[1] + ' 100%)';
            this.dom.targetOrb.style.color = c.glow;
            this.dom.targetOrb.classList.remove('pulse');
            void this.dom.targetOrb.offsetWidth;
            this.dom.targetOrb.classList.add('pulse');
        }

        // ------------------------------------------------------
        // UPDATE
        // ------------------------------------------------------
        _update(dt) {
            if (this.input.consumePause() && (this.state === 'playing' || this.state === 'paused')) this._togglePause();
            if (this.state !== 'playing') return;

            this.gameTime += dt;
            this.speed = Math.min(CONFIG.maxSpeed, CONFIG.baseSpeed + this.gameTime * CONFIG.speedIncrease * 60);
            this.distance += this.speed * dt * 60 * 0.1;
            this.score += CONFIG.pointsPerFrame * dt * 60 * (1 + this.combo * 0.05);

            const newScore = Math.floor(this.score);
            if (newScore !== this._lastScoreDisplayed) {
                this._lastScoreDisplayed = newScore;
                this.dom.score.textContent = newScore;
            }

            if (this.input.consumeJump()) this._tryJump();

            this.player.vy += CONFIG.gravity * dt * 60;
            this.player.y += this.player.vy * dt * 60;

            if (this.player.y >= this.player.groundY) {
                if (!this.player.onGround) {
                    this.player.onGround = true;
                    this.audio.land();
                    const px = this.player.x + this.player.width / 2;
                    const py = this.player.y + this.player.height;
                    const c = CONFIG.colors[this.player.colorKey].glow;
                    for (let i = 0; i < 8; i++) this.particles.emitTrail(px + Utils.rand(-20, 20), py, c);
                }
                this.player.y = this.player.groundY;
                this.player.vy = 0;
            } else {
                this.player.onGround = false;
            }

            const targetTilt = Utils.clamp(this.player.vy * 0.8, -15, 15);
            this.player.tilt = Utils.lerp(this.player.tilt, targetTilt, 0.15);

            this.player.trailTimer += dt;
            if (this.player.trailTimer > 0.04) {
                this.player.trailTimer = 0;
                const c = CONFIG.colors[this.player.colorKey].glow;
                this.particles.emitTrail(this.player.x + 10, this.player.y + this.player.height - 10, c);
            }

            this.bgOffset -= this.speed * dt * 60;
            if (this.bgWidth && this.bgOffset <= -this.bgWidth) this.bgOffset += this.bgWidth;

            this.spawnTimer += dt * 1000;
            this.spawnInterval = Math.max(CONFIG.minSpawnInterval, CONFIG.baseSpawnInterval - this.gameTime * CONFIG.spawnIntervalDecrease * 60);
            if (this.spawnTimer >= this.spawnInterval) {
                this.spawnTimer = 0;
                this._spawnBlock();
            }

            for (let i = this.blocks.length - 1; i >= 0; i--) {
                const b = this.blocks[i];
                b.update(dt, this.speed);
                if (b.markedForDeletion) { this.blocks.splice(i, 1); continue; }
                if (!b.hit && this._checkCollision(b)) {
                    b.hit = true;
                    this._handleCollision(b);
                    if (b.markedForDeletion) {
                        const idx = this.blocks.indexOf(b);
                        if (idx !== -1) this.blocks.splice(idx, 1);
                    }
                    if (this.state === 'gameover') return;
                }
            }
            this.particles.update(dt);
        }

        _tryJump() {
            if (!this.player) return;
            if (this.player.onGround) {
                this.player.vy = CONFIG.jumpForce;
                this.player.onGround = false;
                this.audio.jump();
                const px = this.player.x + this.player.width / 2;
                const py = this.player.y + this.player.height;
                const c = CONFIG.colors[this.player.colorKey].glow;
                this.particles.emitBurst(px, py, c, 12, 6);
            }
        }

        _spawnBlock() {
            const x = this.viewWidth + 50;
            const y = CONFIG.groundY - CONFIG.blockHeight;
            let colorKey;
            if (Math.random() < 0.55) colorKey = this.targetColorKey;
            else {
                const others = CONFIG.colorKeys.filter(c => c !== this.targetColorKey);
                colorKey = Utils.choice(others);
            }
            this.blocks.push(new Block(x, y, CONFIG.blockWidth, CONFIG.blockHeight, colorKey));
        }

        _checkCollision(block) {
            if (!this.player) return false;
            const p = {
                x: this.player.x + 30,
                y: this.player.y + this.player.height * 0.6,
                w: this.player.width - 60,
                h: this.player.height * 0.35
            };
            const b = block.getBounds();
            return p.x < b.x + b.w && p.x + p.w > b.x && p.y < b.y + b.h && p.y + p.h > b.y;
        }

        _handleCollision(block) {
            const px = block.x + block.width / 2;
            const py = block.y + block.height / 2;
            const blockColor = CONFIG.colors[block.colorKey];

            if (block.colorKey === this.targetColorKey) {
                this.combo++;
                this.maxCombo = Math.max(this.maxCombo, this.combo);
                const bonus = CONFIG.matchBonus * (1 + (this.combo - 1) * 0.25);
                this.score += bonus;
                this.audio.match(this.combo);
                this.particles.emitBurst(px, py, blockColor.glow, 30, 12);
                block.markedForDeletion = true;
                if (this.combo >= 2) this._showCombo(this.combo);
                else this._showCombo('+', Math.floor(bonus));

                const others = CONFIG.colorKeys.filter(c => c !== this.targetColorKey);
                this.targetColorKey = Utils.choice(others);
                this.player.colorKey = this.targetColorKey;
                this._updateTargetOrb();
                this.speed = Math.min(CONFIG.maxSpeed, this.speed + 0.15);
            } else {
                this.particles.emitBurst(px, py, blockColor.glow, 25, 10);
                this._gameOver();
            }
        }

        _showCombo(text, value) {
            if (value !== undefined) this.dom.comboPopup.textContent = '+' + value;
            else this.dom.comboPopup.textContent = text + 'x COMBO!';
            this.dom.comboPopup.classList.remove('show');
            void this.dom.comboPopup.offsetWidth;
            this.dom.comboPopup.classList.add('show');
        }

        // ------------------------------------------------------
        // RENDER
        // ------------------------------------------------------
        _render() {
            const ctx = this.ctx;
            const w = this.viewWidth;
            const h = this.viewHeight;
            ctx.clearRect(0, 0, w, h);
            this._drawBackground(ctx, w, h);
            this._drawGround(ctx, w, h);
            for (let i = 0; i < this.blocks.length; i++) this.blocks[i].draw(ctx);
            this.particles.draw(ctx);
            this._drawPlayer(ctx);
            this._drawVignette(ctx, w, h);
        }

        _drawBackground(ctx, w, h) {
            const img = this.images.background;
            if (!img || !img.complete || !img.width) {
                const grad = ctx.createLinearGradient(0, 0, 0, h);
                grad.addColorStop(0, '#1a2a4a');
                grad.addColorStop(1, '#0a1220');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);
                return;
            }
            if (!this.bgWidth) this._computeBackgroundScale();
            const bw = this.bgWidth;
            const bh = h;
            let x = this.bgOffset % bw;
            if (x > 0) x -= bw;
            // Tile until viewport is covered (handles narrow backgrounds)
            for (let drawX = x; drawX < w; drawX += bw) {
                ctx.drawImage(img, drawX, 0, bw, bh);
            }
        }

        _drawGround(ctx, w, h) {
            const gy = CONFIG.groundY;
            const grad = ctx.createLinearGradient(0, gy - 4, 0, gy + 20);
            grad.addColorStop(0, 'rgba(255,255,255,0)');
            grad.addColorStop(0.5, 'rgba(255,200,80,0.25)');
            grad.addColorStop(1, 'rgba(255,200,80,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, gy - 4, w, 24);
        }

        _drawPlayer(ctx) {
            const img = this.images.bike;
            const p = this.player;
            if (!p) return;
            const c = CONFIG.colors[p.colorKey];

            ctx.save();
            const cx = p.x + p.width / 2;
            const cy = p.y + p.height / 2;
            ctx.translate(cx, cy);
            ctx.rotate(p.tilt * Math.PI / 180);
            ctx.shadowColor = c.glow;
            ctx.shadowBlur = 40;

            if (img && img.complete && img.width) {
                // ✅ Draw the actual PNG bike
                ctx.drawImage(img, -p.width / 2, -p.height / 2, p.width, p.height);
            } else {
                this._drawFallbackBike(ctx, p, c);
            }

            ctx.shadowBlur = 60;
            ctx.shadowColor = c.glow;
            ctx.beginPath();
            ctx.ellipse(0, 0, p.width * 0.55, p.height * 0.55, 0, 0, Math.PI * 2);
            ctx.strokeStyle = c.glow;
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.5;
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.restore();

            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(p.x + p.width / 2, p.groundY + p.height - 5, p.width * 0.4, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        _drawFallbackBike(ctx, p, c) {
            const w = p.width, h = p.height;
            const halfW = w / 2, halfH = h / 2;
            ctx.shadowBlur = 0;

            // Wheels
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath(); ctx.arc(-halfW * 0.6, halfH - 20, 22, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc( halfW * 0.6, halfH - 20, 22, 0, Math.PI * 2); ctx.fill();

            // Rims (colored)
            ctx.fillStyle = c.hex;
            ctx.beginPath(); ctx.arc(-halfW * 0.6, halfH - 20, 10, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc( halfW * 0.6, halfH - 20, 10, 0, Math.PI * 2); ctx.fill();

            // Frame
            ctx.beginPath();
            ctx.moveTo(-halfW * 0.5, halfH - 30);
            ctx.lineTo( halfW * 0.5, halfH - 30);
            ctx.lineTo( halfW * 0.35, -halfH * 0.3);
            ctx.lineTo(-halfW * 0.35, -halfH * 0.3);
            ctx.closePath();
            ctx.fill();

            // Rider body
            ctx.beginPath();
            ctx.arc(0, -halfH * 0.5, 30, 0, Math.PI * 2);
            ctx.fill();
        }

        _drawVignette(ctx, w, h) {
            const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(1, 'rgba(0,0,0,0.55)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        }

        // ------------------------------------------------------
        // MAIN LOOP
        // ------------------------------------------------------
        _loop(timestamp) {
            if (!this.lastTime) this.lastTime = timestamp;
            let dt = (timestamp - this.lastTime) / 1000;
            this.lastTime = timestamp;
            dt = Math.min(dt, 0.05);

            if (this.initialized) {
                this._update(dt);
                this._render();
            } else {
                const ctx = this.ctx;
                ctx.fillStyle = '#0a1220';
                ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
                ctx.fillStyle = '#fff';
                ctx.font = '24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Loading…', this.viewWidth / 2, this.viewHeight / 2);
            }
            requestAnimationFrame((t) => this._loop(t));
        }
    }

    // ============================================================
    // BOOT
    // ============================================================
    function boot() { window.game = new Game(); }
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

})();