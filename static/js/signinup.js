/* ============================================================
   0. SPLASH SCREEN TIMING
   ============================================================ */
const SPLASH_HOLD_MS  = 550;   // how long the logo stays on screen before it fades
const SPLASH_FADE_MS  = 450;   // how long the fade-out animation lasts
const SPLASH_INTRO_MS = 600;   // logo pop-in duration

(function runSplash() {
    const splash = document.getElementById('splash');
    if (!splash) return;

    const root = document.documentElement;
    root.style.setProperty('--splash-fade',  SPLASH_FADE_MS + 'ms');
    root.style.setProperty('--splash-intro', SPLASH_INTRO_MS + 'ms');

    document.body.classList.add('splash-lock');

    const hide = () => {
        splash.classList.add('is-hidden');
        document.body.classList.remove('splash-lock');
        window.setTimeout(() => splash.remove(), SPLASH_FADE_MS + 120);
    };

    window.setTimeout(hide, SPLASH_INTRO_MS + SPLASH_HOLD_MS);
})();

/* ============================================================
   0b. SPLASH LOGO FALLBACK
   ============================================================ */
(function splashLogoFallback() {
    const img = document.getElementById('splashLogo');
    const fb  = document.getElementById('splashFallback');
    if (!img || !fb) return;
    const fail = () => { img.hidden = true; fb.hidden = false; };
    img.addEventListener('error', fail, { once: true });
    if (img.complete && img.naturalWidth === 0) fail();
})();

/* ============================================================
   1. NAVIGATION — HAMBURGER
   ============================================================ */
const hamburgerBtn = document.getElementById('hamburgerBtn');
const mobileMenu = document.getElementById('mobileMenu');

hamburgerBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    this.classList.toggle('active');
    mobileMenu.classList.toggle('open');
});

document.addEventListener('click', function (e) {
    if (!e.target.closest('.navbar')) {
        hamburgerBtn.classList.remove('active');
        mobileMenu.classList.remove('open');
    }
});

document.querySelectorAll('.nav-mobile-menu .nav-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        hamburgerBtn.classList.remove('active');
        mobileMenu.classList.remove('open');
    });
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        hamburgerBtn.classList.remove('active');
        mobileMenu.classList.remove('open');
    }
});

/* ============================================================
   2. TOAST
   ============================================================ */
let toastTimer = null;

function showToast(message, type = 'default') {
    const existing = document.querySelector('.custom-toast');
    if (existing) existing.remove();
    if (toastTimer) clearTimeout(toastTimer);

    const icons = {
        success: '<i class="fas fa-circle-check" style="color:#4ade80"></i>',
        error: '<i class="fas fa-circle-exclamation" style="color:#f87171"></i>',
        info: '<i class="fas fa-circle-info" style="color:#60a5fa"></i>',
        default: '<i class="fas fa-bolt" style="color:#a29bfe"></i>'
    };

    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.innerHTML = (icons[type] || icons.default) + '<span></span>';
    toast.querySelector('span').textContent = message;
    document.body.appendChild(toast);

    toastTimer = setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 420);
    }, 3200);
}

/* ============================================================
   3. RIPPLE EFFECT
   ============================================================ */
function createRipple(e, el) {
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = (e.clientX || rect.left + rect.width / 2) - rect.left - size / 2;
    const y = (e.clientY || rect.top + rect.height / 2) - rect.top - size / 2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
}

document.addEventListener('click', function (e) {
    const el = e.target.closest('.btn, .btn-social, .nav-btn, .toggle-pass');
    if (el) createRipple(e, el);
});

/* ============================================================
   4. VIEW SWITCHING (tabs + forgot + videos)
   ============================================================ */
const tabsEl = document.getElementById('tabs');
const tabSlider = document.getElementById('tabSlider');
const tabBtns = document.querySelectorAll('.tab');
const authShowcase = document.getElementById('authShowcase');
const signinVideoWrap = document.getElementById('signinVideo');
const signupVideoWrap = document.getElementById('signupVideo');
const signinVideoEl = signinVideoWrap.querySelector('video');
const signupVideoEl = signupVideoWrap.querySelector('video');

const views = {
    signin: document.getElementById('view-signin'),
    signup: document.getElementById('view-signup'),
    forgot: document.getElementById('view-forgot')
};

function pauseAllVideos() {
    [signinVideoEl, signupVideoEl].forEach(v => {
        try { v.pause(); } catch (err) { /* ignore */ }
    });
}

function setView(name) {
    if (!views[name]) name = 'signin';

    Object.keys(views).forEach(k => {
        views[k].classList.toggle('active', k === name);
    });

    tabsEl.classList.toggle('hidden', name === 'forgot');
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.view === name));
    tabSlider.classList.toggle('right', name === 'signup');

    const showSigninVideo = name === 'signin';
    const showSignupVideo = name === 'signup';

    authShowcase.classList.toggle('show-signin-video', showSigninVideo);
    authShowcase.classList.toggle('show-signup-video', showSignupVideo);

    pauseAllVideos();
    if (showSigninVideo) {
        signinVideoEl.play().catch(() => {});
    } else if (showSignupVideo) {
        signupVideoEl.play().catch(() => {});
    }

    if (name !== 'forgot') resetForgotFlow();

    try {
        history.replaceState(null, '', name === 'signin' ? location.pathname : '#' + name);
    } catch (err) { /* ignore */ }
}

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
});

document.querySelectorAll('[data-go]').forEach(el => {
    el.addEventListener('click', () => setView(el.dataset.go));
});

document.querySelectorAll('[data-switch]').forEach(el => {
    el.addEventListener('click', () => {
        setView(el.dataset.switch);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

/* ============================================================
   5. FIELD HELPERS
   ============================================================ */
function setError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.classList.add('error');
    const txt = field.querySelector('.err-text');
    if (txt && message) txt.textContent = message;
    field.classList.remove('shake');
    void field.offsetWidth;
    field.classList.add('shake');
    setTimeout(() => field.classList.remove('shake'), 500);
}

function clearError(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) field.classList.remove('error');
}

function clearAllErrors(form) {
    form.querySelectorAll('.field').forEach(f => f.classList.remove('error'));
}

document.querySelectorAll('.field input, .field select').forEach(input => {
    const handler = () => {
        const field = input.closest('.field');
        if (field) field.classList.remove('error');
    };
    input.addEventListener('input', handler);
    input.addEventListener('change', handler);
});

/* ============================================================
   6. PASSWORD VISIBILITY TOGGLES
   ============================================================ */
document.querySelectorAll('.toggle-pass').forEach(btn => {
    btn.addEventListener('click', function () {
        const input = document.getElementById(this.dataset.target);
        if (!input) return;
        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';
        this.innerHTML = isPass ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
        this.setAttribute('aria-label', isPass ? 'Hide password' : 'Show password');
        input.focus();
    });
});

/* ============================================================
   7. PASSWORD STRENGTH METER
   ============================================================ */
const suPass = document.getElementById('su-pass');
const strengthBars = document.querySelectorAll('#strengthBars span');
const strengthLabel = document.getElementById('strengthLabel');

const STRENGTH = [
    { label: 'Strength', color: 'rgba(255,255,255,.08)', text: 'var(--text-muted)' },
    { label: 'Weak', color: '#f87171', text: '#f87171' },
    { label: 'Fair', color: '#fbbf24', text: '#fbbf24' },
    { label: 'Good', color: '#60a5fa', text: '#60a5fa' },
    { label: 'Strong', color: '#4ade80', text: '#4ade80' }
];

function scorePassword(pw) {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8) s++;
    if (pw.length >= 12) s++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return Math.min(s, 4);
}

function updateStrength() {
    const score = scorePassword(suPass.value);
    const meta = STRENGTH[score];
    strengthBars.forEach((bar, i) => {
        if (i < score) {
            bar.style.background = meta.color;
            bar.style.boxShadow = `0 0 12px ${meta.color}55`;
        } else {
            bar.style.background = 'rgba(255,255,255,.08)';
            bar.style.boxShadow = 'none';
        }
    });
    strengthLabel.textContent = suPass.value ? meta.label : 'Strength';
    strengthLabel.style.color = suPass.value ? meta.text : 'var(--text-muted)';
}

suPass.addEventListener('input', updateStrength);

/* ============================================================
   8. JOB ROLE — "Other" custom field
   ============================================================ */
const suRole = document.getElementById('su-role');
const roleCustomField = document.getElementById('f-su-role-custom');
const suRoleCustom = document.getElementById('su-role-custom');

suRole.addEventListener('change', function () {
    const isOther = this.value === 'other';
    this.classList.toggle('placeholder', !this.value);
    roleCustomField.style.display = isOther ? 'block' : 'none';
    if (isOther) {
        setTimeout(() => suRoleCustom.focus(), 120);
    } else {
        suRoleCustom.value = '';
        clearError('f-su-role-custom');
    }
});

/* ============================================================
   9. LOCAL USER STORE (demo — localStorage)
   ============================================================ */
const LS_KEY = 'helaberry_users';

function getUsers() {
    try {
        return JSON.parse(localStorage.getItem(LS_KEY)) || [];
    } catch (e) {
        return [];
    }
}

function saveUsers(users) {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(users));
    } catch (e) {
        console.warn('Storage unavailable');
    }
}

(function seedDemo() {
    const users = getUsers();
    if (!users.some(u => u.username === 'demo')) {
        users.push({
            username: 'demo',
            email: 'demo@helaberry.com',
            password: 'demo1234',
            role: 'UI/UX Designer',
            createdAt: Date.now()
        });
        saveUsers(users);
    }
})();

/* ============================================================
   10. HELPERS
   ============================================================ */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const USER_RE = /^[a-zA-Z0-9_.]{3,20}$/;

function setLoading(btn, on, label) {
    if (on) {
        btn.dataset.original = btn.innerHTML;
        btn.classList.add('loading');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>' + label + '</span>';
    } else {
        btn.classList.remove('loading');
        if (btn.dataset.original) btn.innerHTML = btn.dataset.original;
    }
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// Redirect helper — goes to Flask /homepage route
function goToHomepage() {
    try {
        window.location.href = '/homepage';   // Flask route
    } catch (err) {
        window.location.assign('/homepage'); // Flask route
    }
}

/* ============================================================
   11. SIGN IN  →  redirect to /homepage on success
   ============================================================ */
const signinForm = document.getElementById('view-signin');
const siUser = document.getElementById('si-user');
const siPass = document.getElementById('si-pass');
const siSubmit = document.getElementById('si-submit');

signinForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearAllErrors(signinForm);

    const username = siUser.value.trim();
    const password = siPass.value;

    let valid = true;

    if (!username) {
        setError('f-si-user', 'Please enter your username.');
        valid = false;
    } else if (username.length < 3) {
        setError('f-si-user', 'Username must be at least 3 characters.');
        valid = false;
    }

    if (!password) {
        setError('f-si-pass', 'Please enter your password.');
        valid = false;
    } else if (password.length < 6) {
        setError('f-si-pass', 'Password must be at least 6 characters.');
        valid = false;
    }

    if (!valid) return;

    setLoading(siSubmit, true, 'Signing in…');
    await sleep(1100);

    const users = getUsers();
    const key = username.toLowerCase();
    const found = users.find(u =>
        u.username.toLowerCase() === key || u.email.toLowerCase() === key
    );

    if (!found) {
        setLoading(siSubmit, false);
        setError('f-si-user', 'No account found with that username.');
        showToast('Account not found — try signing up.', 'error');
        return;
    }

    if (found.password !== password) {
        setLoading(siSubmit, false);
        setError('f-si-pass', 'Incorrect password. Please try again.');
        showToast('Incorrect password.', 'error');
        return;
    }

    setLoading(siSubmit, false);
    showToast(`Welcome back, ${found.username}! 🍓 Redirecting…`, 'success');

    try {
        if (document.getElementById('si-remember').checked) {
            localStorage.setItem('helaberry_session', JSON.stringify({
                username: found.username,
                email: found.email,
                role: found.role,
                at: Date.now()
            }));
        } else {
            sessionStorage.setItem('helaberry_session', JSON.stringify({
                username: found.username,
                email: found.email,
                role: found.role
            }));
        }
    } catch (err) { /* ignore */ }

    signinForm.reset();

    setTimeout(goToHomepage, 900);
});

/* ============================================================
   12. SIGN UP  →  redirect to /homepage on success
   ============================================================ */
const signupForm = document.getElementById('view-signup');
const suUser = document.getElementById('su-user');
const suEmail = document.getElementById('su-email');
const suPass2 = document.getElementById('su-pass2');
const suTerms = document.getElementById('su-terms');
const suSubmit = document.getElementById('su-submit');

signupForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearAllErrors(signupForm);
    document.getElementById('f-su-terms').querySelector('.check').classList.remove('error');

    const username = suUser.value.trim();
    const email = suEmail.value.trim();
    const role = suRole.value;
    const customRole = suRoleCustom.value.trim();
    const password = suPass.value;
    const confirm = suPass2.value;

    let valid = true;

    if (!username) {
        setError('f-su-user', 'Choose a username.');
        valid = false;
    } else if (!USER_RE.test(username)) {
        setError('f-su-user', '3–20 chars: letters, numbers, _ or . only.');
        valid = false;
    }

    if (!email) {
        setError('f-su-email', 'Enter your email address.');
        valid = false;
    } else if (!EMAIL_RE.test(email)) {
        setError('f-su-email', 'That email doesn\'t look right.');
        valid = false;
    }

    if (!role) {
        setError('f-su-role', 'Please select your job role.');
        valid = false;
    } else if (role === 'other' && !customRole) {
        setError('f-su-role-custom', 'Please tell us your role.');
        valid = false;
    }

    if (!password) {
        setError('f-su-pass', 'Create a password.');
        valid = false;
    } else if (password.length < 8) {
        setError('f-su-pass', 'Use at least 8 characters.');
        valid = false;
    } else if (scorePassword(password) < 2) {
        setError('f-su-pass', 'Password is too weak — add numbers or symbols.');
        valid = false;
    }

    if (!confirm) {
        setError('f-su-pass2', 'Confirm your password.');
        valid = false;
    } else if (confirm !== password) {
        setError('f-su-pass2', 'Passwords don\'t match.');
        valid = false;
    }

    if (!suTerms.checked) {
        document.getElementById('f-su-terms').querySelector('.check').classList.add('error');
        showToast('Please accept the Terms of Service.', 'error');
        valid = false;
    }

    if (!valid) return;

    setLoading(suSubmit, true, 'Creating account…');
    await sleep(1200);

    const users = getUsers();
    const key = username.toLowerCase();

    if (users.some(u => u.username.toLowerCase() === key)) {
        setLoading(suSubmit, false);
        setError('f-su-user', 'That username is already taken.');
        showToast('Username already taken.', 'error');
        return;
    }

    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        setLoading(suSubmit, false);
        setError('f-su-email', 'An account with this email already exists.');
        showToast('Email already registered.', 'error');
        return;
    }

    const finalRole = role === 'other' ? customRole : role;
    users.push({
        username,
        email,
        password,
        role: finalRole,
        createdAt: Date.now()
    });
    saveUsers(users);

    setLoading(suSubmit, false);
    showToast(`Account created — welcome, ${username}! 🎉 Redirecting…`, 'success');

    try {
        localStorage.setItem('helaberry_session', JSON.stringify({
            username,
            email,
            role: finalRole,
            at: Date.now()
        }));
    } catch (err) { /* ignore */ }

    signupForm.reset();
    updateStrength();
    suRole.classList.add('placeholder');
    roleCustomField.style.display = 'none';
    document.getElementById('f-su-terms').querySelector('.check').classList.remove('error');

    setTimeout(goToHomepage, 900);
});

/* ============================================================
   13. FORGOT PASSWORD
   ============================================================ */
const forgotForm = document.getElementById('forgotForm');
const forgotSuccess = document.getElementById('forgotSuccess');
const fpEmail = document.getElementById('fp-email');
const fpSubmit = document.getElementById('fp-submit');
const fpSuccessEmail = document.getElementById('fp-success-email');
const fpResend = document.getElementById('fp-resend');

let lastResetEmail = '';

function resetForgotFlow() {
    forgotForm.style.display = 'block';
    forgotSuccess.classList.remove('active');
    clearError('f-fp-email');
}

async function sendResetLink() {
    clearError('f-fp-email');
    const email = fpEmail.value.trim();

    if (!email) {
        setError('f-fp-email', 'Please enter your email address.');
        return;
    }
    if (!EMAIL_RE.test(email)) {
        setError('f-fp-email', 'That email doesn\'t look right.');
        return;
    }

    setLoading(fpSubmit, true, 'Sending…');
    await sleep(1200);
    setLoading(fpSubmit, false);

    const users = getUsers();
    const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());

    if (!exists) {
        setError('f-fp-email', 'No account found with that email.');
        showToast('No account found with that email.', 'error');
        return;
    }

    lastResetEmail = email;
    fpSuccessEmail.textContent = email;
    forgotForm.style.display = 'none';
    forgotSuccess.classList.add('active');
    showToast('Reset link sent! Check your inbox. 📬', 'success');
}

fpSubmit.addEventListener('click', sendResetLink);
fpEmail.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendResetLink();
    }
});

fpResend.addEventListener('click', async () => {
    setLoading(fpResend, true, 'Sending…');
    await sleep(1000);
    setLoading(fpResend, false);
    showToast('Reset link sent again to ' + lastResetEmail, 'success');
});

/* ============================================================
   14. SOCIAL BUTTONS (demo)
   ============================================================ */
document.querySelectorAll('[data-social]').forEach(btn => {
    btn.addEventListener('click', () => {
        showToast(`${btn.dataset.social} sign-in would open here.`, 'info');
    });
});

/* ============================================================
   15. DEMO ACCOUNT AUTOFILL
   ============================================================ */
document.getElementById('fillDemo').addEventListener('click', () => {
    siUser.value = 'demo';
    siPass.value = 'demo1234';
    clearError('f-si-user');
    clearError('f-si-pass');
    showToast('Demo credentials filled in.', 'info');
    siSubmit.focus();
});

/* ============================================================
   16. INIT — open correct view from URL
   ============================================================ */
(function init() {
    const hash = (location.hash || '').replace('#', '').toLowerCase();
    const params = new URLSearchParams(location.search);
    const mode = (params.get('mode') || hash || '').toLowerCase();

    if (mode === 'signup' || mode === 'register') {
        setView('signup');
    } else if (mode === 'forgot' || mode === 'reset') {
        setView('forgot');
    } else {
        setView('signin');
    }

    setTimeout(() => {
        const active = document.querySelector('.auth-view.active');
        if (active && active.id === 'view-signin') siUser.focus();
    }, 700);
})();

console.log('%c🍓 Helaberry · Auth', 'color:#a29bfe;font-weight:700;font-size:14px');
console.log('✅ Sign In & Sign Up redirect to /homepage on success');
console.log('Sign In (3.mp4) · Sign Up (2.mp4) · Forgot Password · Glassmorphism UI');