// ============================================================
//  NAVIGATION: HAMBURGER TOGGLE
// ============================================================

const hamburgerBtn = document.getElementById('hamburgerBtn');
const mobileMenu = document.getElementById('mobileMenu');

hamburgerBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    this.classList.toggle('active');
    mobileMenu.classList.toggle('open');
});

// Close mobile menu on outside click
document.addEventListener('click', function(e) {
    if (!e.target.closest('.navbar')) {
        hamburgerBtn.classList.remove('active');
        mobileMenu.classList.remove('open');
    }
});

// Close mobile menu when a nav action is clicked
document.querySelectorAll('.nav-mobile-menu .nav-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        hamburgerBtn.classList.remove('active');
        mobileMenu.classList.remove('open');
    });
});

// ============================================================
//  LOGO FALLBACK — if logo.png is missing, show "H" instead
// ============================================================
document.querySelectorAll('.brand-icon img, .chat-avatar img').forEach(img => {
    img.addEventListener('error', function() {
        const parent = this.parentElement;
        parent.classList.add('fallback-text');
        // Chat avatar fallback keeps the robot icon
        if (parent.classList.contains('chat-avatar')) {
            parent.innerHTML = '<i class="fas fa-robot"></i>';
        } else {
            parent.textContent = 'H';
        }
    });
});

// ============================================================
//  CHAT LOGIC
// ============================================================

const chatMessages = document.getElementById('chatMessages');
const typingIndicator = document.getElementById('typingIndicator');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');

const aiResponses = [
    "That's a great question! Helaberry is all about creative exploration.",
    "I love your energy! 🚀 What kind of content do you create?",
    "You can generate stunning AI art right here in the studio.",
    "Our marketplace has thousands of digital assets waiting for you.",
    "Did you know? You can collaborate with other creators in real-time.",
    "I'm here to help — ask me anything about the platform!",
    "🎯 Try the AI Studio to turn your ideas into visuals.",
    "Community is at our core. Join a room and start creating together!",
    "Your next masterpiece is just a click away. ✨",
    "Helaberry supports video, image, and audio — all in one place.",
    "Explore the feed to see what the community is making today.",
    "You can customize your profile and showcase your best work.",
    "💡 Pro tip: Use the 'Explore' tab to find trending creations.",
    "Did you know we have a live collaboration feature? 🤝",
];

let isProcessing = false;

function addMessage(text, sender = 'ai', delay = 0) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const bubble = document.createElement('div');
            bubble.className = `bubble ${sender}`;
            if (sender === 'ai') {
                bubble.innerHTML = `${text} <span class="bubble-time">Just now</span>`;
            } else {
                bubble.textContent = text;
            }
            if (typingIndicator.classList.contains('active')) {
                typingIndicator.classList.remove('active');
            }
            chatMessages.insertBefore(bubble, typingIndicator);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            resolve();
        }, delay);
    });
}

async function showTyping(duration = 1200) {
    typingIndicator.classList.add('active');
    chatMessages.scrollTop = chatMessages.scrollHeight;
    await new Promise(r => setTimeout(r, duration));
    typingIndicator.classList.remove('active');
}

async function handleUserMessage(text) {
    if (isProcessing) return;
    if (!text.trim()) return;

    isProcessing = true;
    await addMessage(text, 'user', 0);
    chatInput.value = '';

    const delay = 600 + Math.random() * 900;
    await showTyping(delay);

    const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
    await addMessage(randomResponse, 'ai', 100);

    isProcessing = false;
}

sendBtn.addEventListener('click', () => {
    const text = chatInput.value.trim();
    if (text) handleUserMessage(text);
});

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (text) handleUserMessage(text);
    }
});

// Auto-welcome sequence
setTimeout(async () => {
    await showTyping(700);
    await addMessage("💡 Try asking me something about Helaberry!", 'ai', 100);
    await showTyping(500);
    await addMessage("Or just say 'hello' to get started. 😊", 'ai', 100);
}, 1400);

// ============================================================
//  RIPPLE EFFECT ON BUTTONS
// ============================================================

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
    setTimeout(() => ripple.remove(), 700);
}

document.querySelectorAll('.btn, .send-btn, .nav-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        createRipple(e, this);
    });
});

// ============================================================
//  ACTION HANDLER (Toast)
// ============================================================

document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', function() {
        const action = this.dataset.action;
        const msgs = {
            'Sign In': '🔐 Sign-in modal would open.',
            'Sign Up': '📝 Sign-up form would appear.',
            'Start': '🚀 Welcome to Helaberry!'
        };
        const msg = msgs[action] || `Action: ${action}`;
        showToast(msg);
    });
});

function showToast(message) {
    const existing = document.querySelector('.custom-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.style.cssText = `
        position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
        background: rgba(19, 29, 43, 0.92);
        backdrop-filter: blur(18px);
        color: var(--text-primary);
        padding: 16px 40px;
        border-radius: 60px;
        border: 1px solid rgba(255,255,255,0.06);
        box-shadow: 0 12px 56px rgba(0,0,0,0.7);
        z-index: 9999;
        font-weight: 500;
        font-size: 0.95rem;
        animation: fadeUp 0.5s var(--ease-spring);
        max-width: 92%;
        text-align: center;
        letter-spacing: 0.3px;
        transition: opacity 0.4s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 450);
    }, 3000);
}

// ============================================================
//  VIDEO FALLBACK
// ============================================================

const video = document.getElementById('agentVideo');
video.addEventListener('error', () => {
    const container = document.getElementById('videoContainer');
    const placeholder = document.createElement('div');
    placeholder.style.cssText = `
        width: 100%; height: 100%;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        background: radial-gradient(circle at 30% 30%, #1a2636, #070b13);
        color: var(--text-secondary);
        padding: 40px;
        text-align: center;
        gap: 12px;
        position: relative;
        z-index: 0;
    `;
    // UPDATED PATH TO /static/images/logo.png
    placeholder.innerHTML = `
        <img src="/static/images/logo.png" alt="Helaberry" style="width:88px;height:88px;object-fit:contain;opacity:0.55;animation:pulseGlow 4s ease-in-out infinite;" />
        <h3 style="font-weight:700;color:var(--text-primary);font-size:1.2rem;">AI Agent</h3>
        <p style="color:var(--text-muted);max-width:280px;font-size:0.9rem;">Video not found. Place <strong style="color:var(--text-secondary);">1.mp4</strong> in the <code>/static/videos/</code> folder.</p>
        <div style="display:flex;gap:8px;margin-top:6px;">
            <span style="background:rgba(255,255,255,0.04);padding:4px 16px;border-radius:40px;font-size:0.7rem;border:1px solid rgba(255,255,255,0.04);">🎬 demo mode</span>
        </div>
    `;
    const messages = container.querySelector('.chat-messages');
    const inputBar = container.querySelector('.chat-input-bar');
    container.innerHTML = '';
    container.appendChild(placeholder);
    const overlayNew = document.createElement('div');
    overlayNew.className = 'video-overlay';
    overlayNew.style.zIndex = '1';
    container.appendChild(overlayNew);
    container.appendChild(messages);
    container.appendChild(inputBar);
    messages.style.position = 'absolute';
    messages.style.inset = '0';
    messages.style.zIndex = '2';
    inputBar.style.position = 'absolute';
    inputBar.style.bottom = '0';
    inputBar.style.left = '0';
    inputBar.style.right = '0';
    inputBar.style.zIndex = '3';
    placeholder.style.position = 'relative';
    placeholder.style.zIndex = '0';
});

console.log('🍓 Helaberry · Logo integrated · Fixed Nav · Chat left · 1:1 video');
console.log('✨ Buttons with ripple · Smooth animations · Glassmorphism');