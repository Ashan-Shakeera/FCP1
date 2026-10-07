(function(){
'use strict';

/* ============================================================================
   0. TINY UTILITIES
   ============================================================================ */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);
const now = () => Date.now();
const esc = (s) => String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initialOf = (n) => { if(!n) return '?'; return String(n).trim().charAt(0).toUpperCase() || '?'; };
const firstNameOf = (n) => { if(!n) return 'there'; return String(n).trim().split(/\s+/)[0]; };
const clamp = (n,a,b) => Math.max(a, Math.min(b, n));
const pick = (arr) => arr[Math.floor(Math.random()*arr.length)];
const money = (n) => '$' + Number(n||0).toFixed(2);

function timeAgo(ts){
  const s = Math.floor((now() - ts)/1000);
  if (s < 45) return 'just now';
  if (s < 90) return 'a minute ago';
  const m = Math.floor(s/60);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m/60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h/24);
  if (d < 7) return d + 'd ago';
  try { return new Date(ts).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }
  catch(e){ return '—'; }
}
function fullDate(ts){
  try { return new Date(ts).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}); }
  catch(e){ return '—'; }
}
function greeting(){
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
function hashStr(str){
  let h = 2166136261;
  for (let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h,16777619); }
  return h >>> 0;
}
const GRADS = [
  'linear-gradient(135deg,#6C5CE7,#a29bfe)','linear-gradient(135deg,#ec4899,#f472b6)',
  'linear-gradient(135deg,#06b6d4,#22d3ee)','linear-gradient(135deg,#22c55e,#4ade80)',
  'linear-gradient(135deg,#f59e0b,#fbbf24)','linear-gradient(135deg,#8b5cf6,#a78bfa)',
  'linear-gradient(135deg,#ef4444,#f87171)','linear-gradient(135deg,#14b8a6,#2dd4bf)',
  'linear-gradient(135deg,#3b82f6,#60a5fa)','linear-gradient(135deg,#d946ef,#e879f9)'
];
const gradFor = (seed) => GRADS[hashStr(String(seed||'x')) % GRADS.length];

/* ============================================================================
   1. CRYPTO  (AES-256-GCM via WebCrypto, XOR fallback)
   ============================================================================ */
const Crypto = (function(){
  const te = new TextEncoder();
  const td = new TextDecoder();
  const hasSubtle = !!(window.crypto && window.crypto.subtle && window.crypto.subtle.importKey);

  function b64(bytes){
    const b = new Uint8Array(bytes);
    let s = '';
    const CH = 0x8000;
    for (let i=0;i<b.length;i+=CH) s += String.fromCharCode.apply(null, b.subarray(i,i+CH));
    return btoa(s);
  }
  function unb64(str){
    const s = atob(str);
    const b = new Uint8Array(s.length);
    for (let i=0;i<s.length;i++) b[i] = s.charCodeAt(i);
    return b;
  }
  function randBytes(n){
    const a = new Uint8Array(n);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(a);
    else for (let i=0;i<n;i++) a[i] = Math.floor(Math.random()*256);
    return a;
  }

  async function derive(passphrase, salt){
    if (hasSubtle){
      const km = await crypto.subtle.importKey('raw', te.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
      const key = await crypto.subtle.deriveKey(
        { name:'PBKDF2', salt: te.encode(salt), iterations: 60000, hash:'SHA-256' },
        km, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']
      );
      return { type:'AES-GCM', key };
    }
    return { type:'XOR', key: hashStr(passphrase + '::' + salt) };
  }

  async function encrypt(keyObj, plaintext){
    const text = String(plaintext == null ? '' : plaintext);
    if (keyObj.type === 'AES-GCM' && hasSubtle){
      const iv = randBytes(12);
      const ct = await crypto.subtle.encrypt({name:'AES-GCM', iv}, keyObj.key, te.encode(text));
      return { alg:'AES-GCM', iv: b64(iv), ct: b64(ct) };
    }
    const iv = randBytes(12);
    const data = te.encode(text);
    const out = new Uint8Array(data.length);
    let st = (keyObj.key ^ (iv[0]<<24 | iv[1]<<16 | iv[2]<<8 | iv[3])) >>> 0;
    for (let i=0;i<data.length;i++){
      st ^= (st << 13); st >>>= 0;
      st ^= (st >>> 17);
      st ^= (st << 5);  st >>>= 0;
      out[i] = data[i] ^ (st & 0xff);
    }
    return { alg:'XOR', iv: b64(iv), ct: b64(out) };
  }

  async function decrypt(keyObj, payload){
    if (!payload || !payload.ct) return null;
    try {
      if (payload.alg === 'AES-GCM' && keyObj.type === 'AES-GCM' && hasSubtle){
        const pt = await crypto.subtle.decrypt({name:'AES-GCM', iv: unb64(payload.iv)}, keyObj.key, unb64(payload.ct));
        return td.decode(pt);
      }
      if (payload.alg === 'XOR' && keyObj.type === 'XOR'){
        const iv = unb64(payload.iv);
        const data = unb64(payload.ct);
        const out = new Uint8Array(data.length);
        let st = (keyObj.key ^ (iv[0]<<24 | iv[1]<<16 | iv[2]<<8 | iv[3])) >>> 0;
        for (let i=0;i<data.length;i++){
          st ^= (st << 13); st >>>= 0;
          st ^= (st >>> 17);
          st ^= (st << 5);  st >>>= 0;
          out[i] = data[i] ^ (st & 0xff);
        }
        return td.decode(out);
      }
      return null;
    } catch(e){ return null; }
  }

  async function convKey(a, b){
    const pair = [String(a).toLowerCase(), String(b).toLowerCase()].sort().join('::');
    return derive('helaberry-conv::' + pair, 'helaberry-v1-salt');
  }

  async function sha256(text, salt){
    const data = te.encode(salt + '::' + text);
    if (hasSubtle){
      const buf = await crypto.subtle.digest('SHA-256', data);
      return b64(buf);
    }
    let h1 = hashStr(salt + text), h2 = hashStr(text + salt);
    return 'x' + h1.toString(36) + h2.toString(36);
  }

  return { derive, encrypt, decrypt, convKey, sha256, hasSubtle, b64, unb64 };
})();

/* ============================================================================
   2. DATABASE (localStorage)
   ============================================================================ */
const DB_KEY = 'helaberry_db_v1';
const SESSION_KEY = 'helaberry_session';

function emptyDB(){
  return {
    seeded:false,
    users:[],
    messages:[],
    stories:[],
    posts:[],
    notifications:[],
    listings:[],
    carts:{},
    orders:[],
    settings:{},
    tickets:[]
  };
}

let DB = (function load(){
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw){
      const d = JSON.parse(raw);
      return Object.assign(emptyDB(), d);
    }
  } catch(e){ console.warn('DB load failed', e); }
  return emptyDB();
})();

let saveTimer = null;
function save(){
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); }
    catch(e){
      console.warn('Save failed', e);
      toast('Storage is full — remove some images to keep saving.', 'error');
    }
  }, 60);
}
function saveNow(){
  if (saveTimer) clearTimeout(saveTimer);
  try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); }
  catch(e){ toast('Storage is full — could not save.', 'error'); }
}

/* ============================================================================
   3. SESSION
   ============================================================================ */
let session = (function readSession(){
  try {
    let raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || !d.username) return null;
    return d;
  } catch(e){ return null; }
})();

function writeSession(obj){
  session = obj;
  try {
    if (obj) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(obj));
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch(e){}
  syncLegacyUsers();
}
function syncLegacyUsers(){
  try {
    const legacy = DB.users.map(u => ({
      username:u.username, email:u.email, role:u.role, createdAt:u.createdAt
    }));
    localStorage.setItem('helaberry_users', JSON.stringify(legacy));
  } catch(e){}
}

let ME = null;

function me(){ return ME; }
function getUser(id){ return DB.users.find(u => u.id === id) || null; }
function getUserByName(name){
  if (!name) return null;
  const n = String(name).toLowerCase();
  return DB.users.find(u => u.username.toLowerCase() === n) || null;
}

function ensureSessionUser(){
  if (!session) { ME = null; return; }
  let u = getUserByName(session.username);
  if (!u){
    u = {
      id: uid(),
      username: session.username,
      email: session.email || '',
      role: session.role || 'Creator',
      bio: '',
      avatar: null, banner: null,
      pwHash: null, pwSalt: null,
      createdAt: session.createdAt || now(),
      following: [], followers: []
    };
    DB.users.push(u);
    saveNow();
  }
  ME = u;
}

/* ============================================================================
   4. TOAST / MODAL
   ============================================================================ */
function toast(msg, type){
  type = type || 'success';
  const t = document.createElement('div');
  t.className = 'toast ' + (type === 'success' ? '' : type);
  const icons = {
    success:'<i class="fas fa-circle-check" style="color:#4ade80"></i>',
    error:'<i class="fas fa-circle-exclamation" style="color:#f87171"></i>',
    info:'<i class="fas fa-circle-info" style="color:#60a5fa"></i>',
    warning:'<i class="fas fa-triangle-exclamation" style="color:#fbbf24"></i>'
  };
  t.innerHTML = (icons[type] || icons.success) + '<span>' + esc(msg) + '</span>';
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'all .3s ease';
    t.style.opacity = '0';
    t.style.transform = 'translateX(30px)';
    setTimeout(() => t.remove(), 320);
  }, 3200);
}

const modalBackdrop = $('#modalBackdrop');
const modalContent  = $('#modalContent');

function openModal(html){
  modalContent.innerHTML = html;
  modalBackdrop.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeModal(){
  modalBackdrop.classList.remove('active');
  document.body.style.overflow = '';
  modalContent.innerHTML = '';
}
modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape'){ closeModal(); closeStoryViewer(); }
});

/* ============================================================================
   5. IMAGE HANDLING
   ============================================================================ */
function pickFile(accept){
  return new Promise(resolve => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = accept || 'image/*';
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.addEventListener('change', () => {
      const f = inp.files && inp.files[0] ? inp.files[0] : null;
      inp.remove();
      resolve(f);
    });
    inp.click();
  });
}

function readImage(file, maxSize){
  maxSize = maxSize || 900;
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file selected'));
    if (!file.type || file.type.indexOf('image/') !== 0) return reject(new Error('Please choose an image file'));
    if (file.size > 10 * 1024 * 1024) return reject(new Error('Image is too large (max 10 MB)'));
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('Could not read the file'));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode the image'));
      img.onload = () => {
        let w = img.naturalWidth, h = img.naturalHeight;
        const scale = Math.min(1, maxSize / Math.max(w, h));
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        let out;
        try {
          out = (file.type === 'image/png') ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.85);
        } catch(e){
          out = c.toDataURL('image/jpeg', 0.8);
        }
        resolve(out);
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

/* ============================================================================
   6. AVATAR HELPERS
   ============================================================================ */
function avatarHTML(user, size, radius){
  size = size || 42;
  radius = radius || '50%';
  const u = (typeof user === 'string') ? getUserByName(user) : user;
  if (u && u.avatar){
    return '<div style="width:'+size+'px;height:'+size+'px;border-radius:'+radius+';background-image:url(\''+u.avatar+'\');background-size:cover;background-position:center;flex-shrink:0;"></div>';
  }
  const name = u ? u.username : '?';
  const g = gradFor(name);
  return '<div style="width:'+size+'px;height:'+size+'px;border-radius:'+radius+';background:'+g+';display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;font-size:'+Math.round(size*0.42)+'px;flex-shrink:0;">'+esc(initialOf(name))+'</div>';
}

/* ============================================================================
   7. NOTIFICATIONS
   ============================================================================ */
function addNotification(forUserId, type, text, actorId){
  DB.notifications.unshift({
    id: uid(), for: forUserId, type: type, text: text,
    actor: actorId || null, ts: now(), read: false
  });
  if (DB.notifications.length > 300) DB.notifications.length = 300;
  save();
  updateNotifDot();
}
function myNotifications(){
  if (!ME) return [];
  return DB.notifications.filter(n => n.for === ME.id);
}
function unreadCount(){
  return myNotifications().filter(n => !n.read).length;
}
function updateNotifDot(){
  const dot = $('#notifDot');
  if (!dot) return;
  dot.style.display = unreadCount() > 0 ? '' : 'none';
  const badge = document.querySelector('.nav-item[data-page="notifications"] .nav-badge');
  if (badge){ const c = unreadCount(); badge.textContent = c; badge.style.display = c ? '' : 'none'; }
}

/* ============================================================================
   8. SEED DATA
   ============================================================================ */
const DEMO_PASSWORD = 'helaberry123';

async function seed(){
  if (DB.seeded) return;
  DB.seeded = true;

  const demo = [
    { username:'Sarah Johnson', email:'sarah@helaberry.app', role:'Illustrator',   bio:'Digital illustrator · pastel dreamer · open for commissions 🎨' },
    { username:'Mike Chen',     email:'mike@helaberry.app',  role:'UI/UX Designer', bio:'Designing calm interfaces. Coffee-powered. ☕' },
    { username:'Emma Wilson',   email:'emma@helaberry.app',  role:'Painter',        bio:'Oil & digital painter. Colour is my language.' },
    { username:'James Park',    email:'james@helaberry.app', role:'Photographer',   bio:'Chasing light around the world 📷' },
    { username:'Lily Patel',    email:'lily@helaberry.app',  role:'Graphic Designer',bio:'Brand identity & typography nerd.' },
    { username:'Alex Rivera',   email:'alex@helaberry.app',  role:'3D Artist',      bio:'Blender addict. Making worlds that don\'t exist.' }
  ];

  const salt = 'helaberry-seed-salt';
  const pwHash = await Crypto.sha256(DEMO_PASSWORD, salt);

  for (const d of demo){
    DB.users.push({
      id: uid(),
      username: d.username, email: d.email, role: d.role, bio: d.bio,
      avatar: null, banner: null,
      pwHash: pwHash, pwSalt: salt,
      createdAt: now() - Math.floor(Math.random() * 90 + 10) * 86400000,
      following: [], followers: []
    });
  }

  const postSeeds = [
    { by:'Sarah Johnson', text:'Just finished this pastel cityscape 🌆 The whole thing started as a colour study and turned into something I actually love. What do you think?', bg:'linear-gradient(135deg,#ec4899,#f472b6)' },
    { by:'Mike Chen', text:'Reminder: whitespace is a feature, not a bug. Redesigned our onboarding flow this week — 34% fewer drop-offs. Small changes, big wins.', bg:'linear-gradient(135deg,#06b6d4,#22d3ee)' },
    { by:'Emma Wilson', text:'Oil study #12. I keep repainting the same sky because I have not figured out the colour yet. One day. 🌤', bg:'linear-gradient(135deg,#22c55e,#4ade80)' },
    { by:'James Park', text:'Golden hour at the coast. No filter needed — the sky did all the work.', bg:'linear-gradient(135deg,#f59e0b,#fbbf24)' },
    { by:'Lily Patel', text:'Type pairing of the day: a geometric sans with a high-contrast serif. Chef\'s kiss. 👌', bg:'linear-gradient(135deg,#8b5cf6,#a78bfa)' },
    { by:'Alex Rivera', text:'Spent 9 hours on a single rock. Worth it. Full scene dropping next week.', bg:'linear-gradient(135deg,#ef4444,#f87171)' }
  ];
  for (let i=0;i<postSeeds.length;i++){
    const s = postSeeds[i];
    const author = getUserByName(s.by);
    DB.posts.push({
      id: uid(), author: author.id, kind:'post', text: s.text, image:null, bg: s.bg,
      ts: now() - (i*7 + Math.floor(Math.random()*6) + 1) * 3600000,
      likes: DB.users.filter(u => u.id !== author.id && Math.random() > .4).map(u => u.id),
      comments: [],
      views: 40 + Math.floor(Math.random()*400)
    });
  }

  const p0 = DB.posts[0], p1 = DB.posts[1];
  if (p0){
    p0.comments.push({ id:uid(), by: getUserByName('Mike Chen').id, text:'The colour harmony here is unreal 😍', ts: now()-3600000 });
    p0.comments.push({ id:uid(), by: getUserByName('Emma Wilson').id, text:'Teach me your ways!', ts: now()-1800000 });
  }
  if (p1){
    p1.comments.push({ id:uid(), by: getUserByName('Lily Patel').id, text:'34% is huge. Congrats!', ts: now()-7200000 });
  }

  const listingSeeds = [
    { t:'Cyberpunk City Pack', d:'12 high-res AI cityscapes, 4K, commercial licence included.', p:24.99, bg:'linear-gradient(135deg,#8b5cf6,#a78bfa)', icon:'fa-city', cat:'AI Art' },
    { t:'Fantasy Landscape Set', d:'8 painterly fantasy environments ready for your project.', p:19.99, bg:'linear-gradient(135deg,#ec4899,#f472b6)', icon:'fa-mountain-sun', cat:'Illustration' },
    { t:'Neon Dreams Palette', d:'30 curated neon gradients + swatch files for Figma & Photoshop.', p:9.99, bg:'linear-gradient(135deg,#06b6d4,#22d3ee)', icon:'fa-bolt', cat:'Palettes' },
    { t:'Abstract Waves Bundle', d:'20 organic abstract backgrounds, seamless & tileable.', p:14.99, bg:'linear-gradient(135deg,#f59e0b,#fbbf24)', icon:'fa-water', cat:'Backgrounds' },
    { t:'Portrait Brush Pack', d:'18 custom Procreate brushes for realistic portraits.', p:12.50, bg:'linear-gradient(135deg,#22c55e,#4ade80)', icon:'fa-paintbrush', cat:'Brushes' },
    { t:'3D Asset Starter Kit', d:'45 low-poly models with PBR materials. Blender + GLTF.', p:34.99, bg:'linear-gradient(135deg,#ef4444,#f87171)', icon:'fa-cube', cat:'3D' }
  ];
  for (let i=0;i<listingSeeds.length;i++){
    const l = listingSeeds[i];
    const seller = DB.users[i % DB.users.length];
    DB.listings.push({
      id: uid(), seller: seller.id, title: l.t, desc: l.d, price: l.p,
      image:null, bg: l.bg, icon: l.icon, cat: l.cat,
      ts: now() - (i+1)*86400000
    });
  }

  for (let i=0;i<3;i++){
    const u = DB.users[i];
    DB.stories.push({
      id: uid(), author: u.id, kind:'text',
      text: ['Working on something new ✨','Studio day 🎧','Sketchbook dump incoming'][i],
      bg: gradFor(u.username), image:null,
      ts: now() - (i*2+1)*3600000,
      expires: now() + 86400000,
      views: []
    });
  }

  saveNow();
}

/* ============================================================================
   9. STATE
   ============================================================================ */
const state = {
  page: 'dashboard',
  chatWith: null,
  chatSearch: '',
  feedTab: 'all',
  exploreTab: 'all',
  exploreQuery: '',
  composerImage: null,
  composerKind: 'post',
  tempAvatar: undefined,
  tempBanner: undefined,
  storyImage: null,
  storyBg: 'linear-gradient(135deg,#6C5CE7,#a29bfe)',
  storyKind: 'text',
  listingImage: null,
  storyViewer: { list: [], idx: 0, timer: null }
};

/* ============================================================================
   10. SIDEBAR NAV
   ============================================================================ */
const navItems = [
  { section:'Main' },
  { label:'Dashboard',  icon:'fa-house',              page:'dashboard' },
  { label:'Analytics',  icon:'fa-chart-line',         page:'analytics' },
  { label:'Activity',   icon:'fa-clock-rotate-left',  page:'activity' },

  { section:'Social' },
  { label:'Profile',       icon:'fa-user',        page:'profile' },
  { label:'Friends',       icon:'fa-user-group',  page:'friends' },
  { label:'Messages',      icon:'fa-envelope',    page:'messages' },
  { label:'Notifications', icon:'fa-bell',        page:'notifications' },

  { section:'Discover' },
  { label:'Feed',    icon:'fa-newspaper', page:'feed' },
  { label:'Explore', icon:'fa-compass',   page:'explore' },
  { label:'Reels',   icon:'fa-film',      page:'reels' },
  { label:'Stories', icon:'fa-book-open', page:'stories' },

  { section:'Workspace' },
  { label:'AI Studio',   icon:'fa-wand-magic-sparkles', page:'ai', external:true },
  { label:'Marketplace', icon:'fa-store',               page:'marketplace' },

  { section:'Account' },
  { label:'Settings',       icon:'fa-gear',            page:'settings' },
  { label:'Help & Support', icon:'fa-circle-question', page:'help' },
  { divider:true },
  { label:'Sign Out', icon:'fa-right-from-bracket', page:'logout', danger:true }
];

function buildSidebar(){
  const nav = $('#sidebarNav');
  let html = '';
  let first = true;
  navItems.forEach(item => {
    if (item.section){
      if (!first) html += '<hr class="nav-divider">';
      first = false;
      return;
    }
    if (item.divider){ html += '<hr class="nav-divider">'; return; }

    let cls = 'nav-item' + (state.page === item.page ? ' active' : '');
    if (item.external) cls += ' ai-link';
    if (item.danger) cls += ' danger';

    const action = item.external
      ? 'onclick="window.location.href=\'homepage.html\'"'
      : 'onclick="window.App.navigate(\'' + item.page + '\')"';

    const badgeCount = item.page === 'notifications' ? unreadCount() : 0;
    const badge = badgeCount > 0 ? '<span class="nav-badge">' + badgeCount + '</span>' : '';

    html += '<button class="' + cls + '" data-page="' + item.page + '" ' + action + '>' +
              '<i class="fas ' + item.icon + '"></i><span>' + item.label + '</span>' + badge +
            '</button>';
  });
  nav.innerHTML = html;
}

/* ============================================================================
   11. USER UI
   ============================================================================ */
function applyUserUI(){
  const u = ME;
  if (u){
    const init = initialOf(u.username);
    const avatarBox = $('#userAvatarSidebar');
    if (u.avatar){
      avatarBox.style.backgroundImage = 'url(\'' + u.avatar + '\')';
      avatarBox.style.backgroundSize = 'cover';
      avatarBox.style.backgroundPosition = 'center';
      avatarBox.textContent = '';
    } else {
      avatarBox.style.backgroundImage = '';
      avatarBox.textContent = init;
    }
    $('#userNameSidebar').textContent = u.username;
    $('#userRoleSidebar').innerHTML = '<i class="fas fa-briefcase"></i> <span>' + esc(u.role || 'Creator') + '</span>';
    $('#userStatusChip').style.display = '';
    $('#userStatusText').textContent = 'Online';

    const ha = $('#headerAvatar');
    if (u.avatar){
      ha.style.backgroundImage = 'url(\'' + u.avatar + '\')';
      ha.style.backgroundSize = 'cover';
      ha.style.backgroundPosition = 'center';
      ha.textContent = '';
    } else {
      ha.style.backgroundImage = '';
      ha.textContent = init;
    }
    $('#headerUserName').textContent = u.username;
    $('#headerUserRole').textContent = u.role || 'Creator';
    $('#headerUser').title = u.username + ' · ' + (u.role || 'Creator');

    const card = $('#userCard');
    card.classList.remove('guest');
  } else {
    const avatarBox = $('#userAvatarSidebar');
    avatarBox.style.backgroundImage = '';
    avatarBox.innerHTML = '<i class="fas fa-user"></i>';
    $('#userNameSidebar').textContent = 'Guest';
    $('#userRoleSidebar').innerHTML = '<i class="fas fa-right-to-bracket"></i> <span>Sign in to continue</span>';
    $('#userStatusChip').style.display = 'none';

    const ha = $('#headerAvatar');
    ha.style.backgroundImage = '';
    ha.textContent = '?';
    $('#headerUserName').textContent = 'Guest';
    $('#headerUserRole').textContent = 'Not signed in';
    $('#headerUser').title = 'Click to sign in';
    $('#userCard').classList.add('guest');
  }
  updateNotifDot();
}

/* ============================================================================
   12. THEME
   ============================================================================ */
const THEMES = {
  dark:{
    '--bg-deep':'#0b1119','--bg-surface':'#131d2b','--bg-card':'#1a2636','--bg-card-hover':'#1f2e42',
    '--bg-elevated':'#223044','--border-color':'#2a3a50','--text-primary':'#f0f4fc',
    '--text-secondary':'#a8bdd9','--text-muted':'#6c85a0'
  },
  light:{
    '--bg-deep':'#f1f4fa','--bg-surface':'#ffffff','--bg-card':'#ffffff','--bg-card-hover':'#f7f9fd',
    '--bg-elevated':'#eef2f9','--border-color':'#dde5f0','--text-primary':'#0d1524',
    '--text-secondary':'#41546e','--text-muted':'#8296b0'
  }
};
function applyTheme(name){
  const t = THEMES[name] || THEMES.dark;
  const root = document.documentElement;
  Object.keys(t).forEach(k => root.style.setProperty(k, t[k]));
  $('#themeBtn').innerHTML = name === 'light' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}
function currentTheme(){
  if (ME && DB.settings[ME.id] && DB.settings[ME.id].theme) return DB.settings[ME.id].theme;
  try { return localStorage.getItem('helaberry_theme') || 'dark'; } catch(e){ return 'dark'; }
}
function setTheme(name){
  try { localStorage.setItem('helaberry_theme', name); } catch(e){}
  if (ME){
    DB.settings[ME.id] = Object.assign({}, DB.settings[ME.id] || {}, { theme: name });
    save();
  }
  applyTheme(name);
}

/* ============================================================================
   13. SHARED RENDER HELPERS
   ============================================================================ */
function needAuth(what){
  return '<div class="empty-state">' +
    '<div class="empty-icon"><i class="fas fa-lock"></i></div>' +
    '<h3>Sign in required</h3>' +
    '<p>You need an account to access ' + esc(what) + '.</p>' +
    '<button class="btn btn-primary" onclick="window.App.openAuth(\'signin\')"><i class="fas fa-right-to-bracket"></i> Sign In</button> ' +
    '<button class="btn btn-secondary" onclick="window.App.openAuth(\'signup\')" style="margin-left:8px;"><i class="fas fa-user-plus"></i> Create Account</button>' +
  '</div>';
}

function heroBanner(){
  if (!ME){
    return '<div class="welcome-hero"><div class="hero-row">' +
      '<div class="hero-avatar" style="background:rgba(255,255,255,.06);color:var(--text-secondary);box-shadow:none;"><i class="fas fa-user"></i></div>' +
      '<div class="hero-text">' +
        '<div class="hero-greeting"><i class="fas fa-hand-sparkles"></i> Welcome</div>' +
        '<div class="hero-username">Hello, Guest</div>' +
        '<p class="hero-subtitle">Sign in to unlock encrypted messaging, stories, your portfolio and the full creative toolkit.</p>' +
        '<div class="hero-chips">' +
          '<span class="hero-chip"><i class="fas fa-lock"></i> Not signed in</span>' +
          '<span class="hero-chip"><i class="fas fa-star"></i> Free account</span>' +
        '</div>' +
      '</div>' +
      '<div class="hero-actions">' +
        '<button class="hero-btn primary" onclick="window.App.openAuth(\'signin\')"><i class="fas fa-right-to-bracket"></i> Sign In</button>' +
        '<button class="hero-btn" onclick="window.App.openAuth(\'signup\')"><i class="fas fa-user-plus"></i> Create Account</button>' +
      '</div>' +
    '</div></div>';
  }
  const posts = DB.posts.filter(p => p.author === ME.id).length;
  const followers = (ME.followers || []).length;
  return '<div class="welcome-hero"><div class="hero-row">' +
    '<div class="hero-avatar"' + (ME.avatar ? ' style="background-image:url(\'' + ME.avatar + '\');background-size:cover;background-position:center;"' : '') + '>' + (ME.avatar ? '' : esc(initialOf(ME.username))) + '</div>' +
    '<div class="hero-text">' +
      '<div class="hero-greeting"><i class="fas fa-hand-sparkles"></i> ' + greeting() + '</div>' +
      '<div class="hero-username">' + esc(ME.username) + '</div>' +
      '<p class="hero-subtitle">' + (ME.bio ? esc(ME.bio) : 'Your creative studio is ready. Share work, chat securely and grow your audience.') + '</p>' +
      '<div class="hero-chips">' +
        '<span class="hero-chip"><i class="fas fa-briefcase"></i> ' + esc(ME.role || 'Creator') + '</span>' +
        '<span class="hero-chip green"><i class="fas fa-circle-check"></i> Signed in</span>' +
        '<span class="hero-chip"><i class="fas fa-newspaper"></i> ' + posts + ' posts</span>' +
        '<span class="hero-chip"><i class="fas fa-users"></i> ' + followers + ' followers</span>' +
      '</div>' +
    '</div>' +
    '<div class="hero-actions">' +
      '<button class="hero-btn primary" onclick="window.App.openComposer()"><i class="fas fa-plus"></i> New Post</button>' +
      '<button class="hero-btn" onclick="window.App.navigate(\'messages\')"><i class="fas fa-comment-dots"></i> Messages</button>' +
    '</div>' +
  '</div></div>';
}

function renderPostCard(p, opts){
  opts = opts || {};
  const author = getUser(p.author) || { username:'Unknown', id:null };
  const liked = ME && p.likes.indexOf(ME.id) !== -1;
  const isMine = ME && p.author === ME.id;
  const comments = p.comments || [];

  let media = '';
  if (p.image){
    media = '<div class="post-media"><img src="' + p.image + '" alt="post image" loading="lazy"/></div>';
  } else if (p.bg){
    media = '<div class="post-media" style="background:' + p.bg + ';height:200px;font-size:3rem;color:rgba(255,255,255,.85);"><i class="fas fa-image"></i></div>';
  }

  let commentsHTML = '';
  if (comments.length){
    commentsHTML = '<div class="comment-list">' + comments.map(c => {
      const cu = getUser(c.by);
      return '<div class="comment">' +
        '<div class="cav"' + (cu && cu.avatar ? ' style="background-image:url(\'' + cu.avatar + '\');background-size:cover;background-position:center;"' : ' style="background:' + gradFor(cu ? cu.username : 'x') + ';"') + '>' +
          ((cu && cu.avatar) ? '' : esc(initialOf(cu ? cu.username : '?'))) +
        '</div>' +
        '<div class="cbody">' +
          '<div class="cname">' + esc(cu ? cu.username : 'Deleted user') + '</div>' +
          '<div class="ctext">' + esc(c.text) + '</div>' +
          '<div class="ctime">' + timeAgo(c.ts) + '</div>' +
        '</div>' +
      '</div>';
    }).join('') + '</div>';
  }

  return '<div class="card" style="margin-bottom:16px;" id="post-' + p.id + '">' +
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">' +
      '<div class="message-avatar"' + (author.avatar ? ' style="background-image:url(\'' + author.avatar + '\');background-size:cover;background-position:center;"' : ' style="background:' + gradFor(author.username) + ';"') + '>' +
        (author.avatar ? '' : esc(initialOf(author.username))) +
      '</div>' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-weight:700;font-size:.9rem;cursor:pointer;" onclick="window.App.viewProfile(\'' + author.id + '\')">' + esc(author.username) + '</div>' +
        '<div style="font-size:.72rem;color:var(--text-muted);">' + esc(author.role || 'Creator') + ' · ' + timeAgo(p.ts) + '</div>' +
      '</div>' +
      (isMine ? '<button class="icon-btn" title="Delete post" onclick="window.App.deletePost(\'' + p.id + '\')"><i class="fas fa-trash"></i></button>' : '') +
    '</div>' +
    (p.text ? '<p style="font-size:.9rem;color:var(--text-secondary);line-height:1.65;white-space:pre-wrap;">' + esc(p.text) + '</p>' : '') +
    media +
    '<div class="post-actions">' +
      '<button class="action-btn ' + (liked ? 'liked' : '') + '" onclick="window.App.toggleLike(\'' + p.id + '\')">' +
        '<i class="' + (liked ? 'fas' : 'far') + ' fa-heart"></i> ' + p.likes.length +
      '</button>' +
      '<button class="action-btn" onclick="window.App.toggleComments(\'' + p.id + '\')">' +
        '<i class="far fa-comment"></i> ' + comments.length +
      '</button>' +
      '<button class="action-btn" onclick="window.App.sharePost(\'' + p.id + '\')"><i class="fas fa-share"></i></button>' +
      '<span style="margin-left:auto;font-size:.72rem;color:var(--text-muted);"><i class="fas fa-eye"></i> ' + (p.views || 0) + '</span>' +
    '</div>' +
    '<div id="comments-' + p.id + '" style="display:' + (opts.openComments ? 'block' : 'none') + ';">' +
      commentsHTML +
      (ME ? '<form class="comment-form" onsubmit="window.App.addComment(event,\'' + p.id + '\')">' +
        '<input type="text" placeholder="Write a comment…" maxlength="300" />' +
        '<button class="btn btn-primary btn-sm" type="submit"><i class="fas fa-paper-plane"></i></button>' +
      '</form>' : '') +
    '</div>' +
  '</div>';
}

/* ============================================================================
   14. PAGES
   ============================================================================ */
const pages = {};

/* ---------------------------- DASHBOARD ---------------------------- */
pages.dashboard = function(){
  const u = ME;
  const myPosts = u ? DB.posts.filter(p => p.author === u.id) : [];
  const totalLikes = myPosts.reduce((a,p) => a + p.likes.length, 0);
  const myMsgs = u ? DB.messages.filter(m => m.from === u.id || m.to === u.id).length : 0;
  const unreadMsgs = u ? DB.messages.filter(m => m.to === u.id && !m.read).length : 0;

  const feed = DB.posts.slice().sort((a,b) => b.ts - a.ts).slice(0,3).map(p => renderPostCard(p)).join('');

  const recent = u ? myNotifications().slice(0,4) : [];

  return heroBanner() +
    '<div class="grid-4" style="margin-bottom:24px;">' +
      '<div class="card stat-card"><div class="stat-label"><i class="fas fa-newspaper"></i> Posts</div><div class="stat-value">' + myPosts.length + '</div><div class="stat-trend"><i class="fas fa-heart"></i> ' + totalLikes + ' total likes</div></div>' +
      '<div class="card stat-card"><div class="stat-label"><i class="fas fa-users"></i> Followers</div><div class="stat-value">' + (u ? (u.followers||[]).length : 0) + '</div><div class="stat-trend"><i class="fas fa-user-plus"></i> ' + (u ? (u.following||[]).length : 0) + ' following</div></div>' +
      '<div class="card stat-card"><div class="stat-label"><i class="fas fa-comment-dots"></i> Messages</div><div class="stat-value">' + myMsgs + '</div><div class="stat-trend ' + (unreadMsgs ? '' : '') + '"><i class="fas fa-envelope"></i> ' + unreadMsgs + ' unread</div></div>' +
      '<div class="card stat-card"><div class="stat-label"><i class="fas fa-user-circle"></i> Account</div><div class="stat-value username-stat">' + esc(u ? u.username : 'Guest') + '</div><div style="font-size:.72rem;color:var(--text-muted);margin-top:4px;">' + esc(u ? (u.role || 'Creator') : 'Not signed in') + '</div></div>' +
    '</div>' +

    '<h2 style="font-size:1.1rem;font-weight:800;margin-bottom:14px;">Quick Actions</h2>' +
    '<div class="grid-2" style="margin-bottom:26px;">' +
      '<div class="card card-hover" onclick="window.App.openComposer()"><div style="display:flex;align-items:center;gap:14px;"><div class="settings-icon"><i class="fas fa-plus"></i></div><div><h4 style="font-weight:700;margin-bottom:2px;">Create Post</h4><p style="font-size:.78rem;color:var(--text-muted);">Share your latest creation</p></div></div></div>' +
      '<div class="card card-hover" onclick="window.App.navigate(\'stories\')"><div style="display:flex;align-items:center;gap:14px;"><div class="settings-icon"><i class="fas fa-book-open"></i></div><div><h4 style="font-weight:700;margin-bottom:2px;">Add Story</h4><p style="font-size:.78rem;color:var(--text-muted);">24-hour moment</p></div></div></div>' +
      '<div class="card card-hover" onclick="window.App.navigate(\'messages\')"><div style="display:flex;align-items:center;gap:14px;"><div class="settings-icon"><i class="fas fa-lock"></i></div><div><h4 style="font-weight:700;margin-bottom:2px;">Secure Messages</h4><p style="font-size:.78rem;color:var(--text-muted);">AES-256 encrypted chat</p></div></div></div>' +
      '<div class="card card-hover" onclick="window.App.navigate(\'marketplace\')"><div style="display:flex;align-items:center;gap:14px;"><div class="settings-icon"><i class="fas fa-store"></i></div><div><h4 style="font-weight:700;margin-bottom:2px;">Marketplace</h4><p style="font-size:.78rem;color:var(--text-muted);">Buy &amp; sell digital assets</p></div></div></div>' +
    '</div>' +

    (recent.length ? '<h2 style="font-size:1.1rem;font-weight:800;margin-bottom:14px;">Recent Notifications</h2>' +
      '<div class="card" style="margin-bottom:26px;">' + recent.map(n => {
        const actor = n.actor ? getUser(n.actor) : null;
        return '<div class="activity-item">' +
          '<div class="activity-avatar"' + (actor && actor.avatar ? ' style="background-image:url(\'' + actor.avatar + '\');background-size:cover;background-position:center;"' : ' style="background:' + gradFor(actor ? actor.username : 'x') + ';"') + '>' +
            (actor && actor.avatar ? '' : '<i class="fas fa-bell"></i>') + '</div>' +
          '<div class="activity-content"><p>' + n.text + '</p><div class="activity-time"><i class="fas fa-clock"></i> ' + timeAgo(n.ts) + '</div></div>' +
        '</div>';
      }).join('') + '</div>' : '') +

    '<h2 style="font-size:1.1rem;font-weight:800;margin-bottom:14px;">Latest From the Community</h2>' +
    feed;
};

/* ---------------------------- ANALYTICS ---------------------------- */
pages.analytics = function(){
  if (!ME) return needAuth('Analytics');
  const myPosts = DB.posts.filter(p => p.author === ME.id);
  const likes = myPosts.reduce((a,p) => a + p.likes.length, 0);
  const comments = myPosts.reduce((a,p) => a + (p.comments||[]).length, 0);
  const views = myPosts.reduce((a,p) => a + (p.views||0), 0);
  const engagement = views ? ((likes + comments) / views * 100) : 0;

  const days = [];
  for (let i=6;i>=0;i--){
    const d = new Date();
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() - i);
    days.push({ label: d.toLocaleDateString('en-US',{weekday:'short'}), start: d.getTime(), end: d.getTime() + 86400000, count: 0 });
  }
  myPosts.forEach(p => {
    const day = days.find(d => p.ts >= d.start && p.ts < d.end);
    if (day) day.count++;
  });
  const maxCount = Math.max(1, ...days.map(d => d.count));

  const topPosts = myPosts.slice().sort((a,b) => (b.likes.length + (b.comments||[]).length) - (a.likes.length + (a.comments||[]).length)).slice(0,5);

  return '<h2 style="font-size:1.2rem;font-weight:800;margin-bottom:16px;">Performance Overview</h2>' +
    '<div class="grid-3" style="margin-bottom:20px;">' +
      '<div class="card stat-card"><div class="stat-label"><i class="fas fa-eye"></i> Total Views</div><div class="stat-value">' + views.toLocaleString() + '</div></div>' +
      '<div class="card stat-card"><div class="stat-label"><i class="fas fa-heart"></i> Likes</div><div class="stat-value">' + likes.toLocaleString() + '</div></div>' +
      '<div class="card stat-card"><div class="stat-label"><i class="fas fa-comment"></i> Comments</div><div class="stat-value">' + comments.toLocaleString() + '</div></div>' +
      '<div class="card stat-card"><div class="stat-label"><i class="fas fa-mouse-pointer"></i> Engagement</div><div class="stat-value">' + engagement.toFixed(1) + '%</div></div>' +
      '<div class="card stat-card"><div class="stat-label"><i class="fas fa-users"></i> Followers</div><div class="stat-value">' + (ME.followers||[]).length + '</div></div>' +
      '<div class="card stat-card"><div class="stat-label"><i class="fas fa-newspaper"></i> Posts</div><div class="stat-value">' + myPosts.length + '</div></div>' +
    '</div>' +

    '<div class="card" style="margin-bottom:20px;">' +
      '<h3 style="font-size:1rem;font-weight:800;margin-bottom:8px;">Posts Published (last 7 days)</h3>' +
      '<div class="chart-container">' +
        days.map(d => '<div style="flex:1;text-align:center;">' +
          '<div class="chart-bar" style="height:' + Math.round((d.count / maxCount) * 100) + '%;" title="' + d.count + ' posts"></div>' +
          '<div class="chart-bar-label">' + d.label + '</div>' +
        '</div>').join('') +
      '</div>' +
    '</div>' +

    '<div class="grid-2">' +
      '<div class="card">' +
        '<h3 style="font-size:.95rem;font-weight:800;margin-bottom:12px;">Top Performing Posts</h3>' +
        (topPosts.length ? topPosts.map(p =>
          '<div class="detail-row"><span class="detail-label" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><i class="fas fa-newspaper"></i> ' + esc((p.text || 'Media post').slice(0,34)) + '</span>' +
          '<span class="detail-value">' + p.likes.length + ' ♥</span></div>'
        ).join('') : '<p style="font-size:.85rem;color:var(--text-muted);">No posts yet — publish something to see analytics.</p>') +
      '</div>' +
      '<div class="card">' +
        '<h3 style="font-size:.95rem;font-weight:800;margin-bottom:12px;">Audience Snapshot</h3>' +
        '<div class="detail-row"><span class="detail-label"><i class="fas fa-user-plus"></i> Following</span><span class="detail-value">' + (ME.following||[]).length + '</span></div>' +
        '<div class="detail-row"><span class="detail-label"><i class="fas fa-users"></i> Followers</span><span class="detail-value">' + (ME.followers||[]).length + '</span></div>' +
        '<div class="detail-row"><span class="detail-label"><i class="fas fa-book-open"></i> Stories</span><span class="detail-value">' + DB.stories.filter(s => s.author === ME.id).length + '</span></div>' +
        '<div class="detail-row"><span class="detail-label"><i class="fas fa-comment-dots"></i> Messages</span><span class="detail-value">' + DB.messages.filter(m => m.from === ME.id || m.to === ME.id).length + '</span></div>' +
        '<div class="detail-row"><span class="detail-label"><i class="fas fa-cart-shopping"></i> Orders</span><span class="detail-value">' + DB.orders.filter(o => o.buyer === ME.id).length + '</span></div>' +
      '</div>' +
    '</div>';
};

/* ---------------------------- ACTIVITY ---------------------------- */
pages.activity = function(){
  if (!ME) return needAuth('Activity');
  const list = myNotifications();
  if (!list.length){
    return '<h2 style="font-size:1.2rem;font-weight:800;margin-bottom:16px;">All Activity</h2>' +
      '<div class="empty-state"><div class="empty-icon"><i class="fas fa-clock-rotate-left"></i></div>' +
      '<h3>No activity yet</h3><p>Likes, comments, follows and messages will appear here.</p>' +
      '<button class="btn btn-primary" onclick="window.App.openComposer()"><i class="fas fa-plus"></i> Create your first post</button></div>';
  }
  return '<h2 style="font-size:1.2rem;font-weight:800;margin-bottom:16px;">All Activity</h2>' +
    '<div class="card">' + list.map(n => {
      const actor = n.actor ? getUser(n.actor) : null;
      return '<div class="activity-item">' +
        '<div class="activity-avatar"' + (actor && actor.avatar ? ' style="background-image:url(\'' + actor.avatar + '\');background-size:cover;background-position:center;"' : ' style="background:' + gradFor(actor ? actor.username : 'x') + ';"') + '>' +
          (actor && actor.avatar ? '' : '<i class="fas fa-bell"></i>') + '</div>' +
        '<div class="activity-content"><p>' + n.text + '</p>' +
        '<div class="activity-time"><i class="fas fa-clock"></i> ' + timeAgo(n.ts) + ' · ' + fullDate(n.ts) + '</div></div>' +
      '</div>';
    }).join('') + '</div>';
};

/* ---------------------------- PROFILE ---------------------------- */
pages.profile = function(){
  if (!ME) return needAuth('your profile');
  const posts = DB.posts.filter(p => p.author === ME.id).sort((a,b) => b.ts - a.ts);
  const likes = posts.reduce((a,p) => a + p.likes.length, 0);
  const banner = ME.banner
    ? 'background-image:url(\'' + ME.banner + '\');background-size:cover;background-position:center;'
    : '';

  return '<div class="profile-header-card" style="margin-bottom:20px;">' +
    '<div class="profile-banner" style="' + banner + 'margin:0 -30px;"></div>' +
    '<div class="profile-avatar-lg"' + (ME.avatar ? ' style="background-image:url(\'' + ME.avatar + '\');background-size:cover;background-position:center;"' : '') + '>' +
      (ME.avatar ? '' : esc(initialOf(ME.username))) + '</div>' +
    '<div class="profile-name">' + esc(ME.username) + '</div>' +
    '<div class="profile-email"><i class="fas fa-envelope"></i> ' + esc(ME.email || 'no email set') + '</div>' +
    (ME.bio ? '<p class="profile-bio">' + esc(ME.bio) + '</p>' : '') +
    '<div class="profile-chips">' +
      '<span class="badge"><i class="fas fa-briefcase"></i> ' + esc(ME.role || 'Creator') + '</span>' +
      '<span class="badge badge-success"><i class="fas fa-circle-check"></i> Active</span>' +
      '<span class="badge badge-info"><i class="fas fa-calendar"></i> Joined ' + timeAgo(ME.createdAt) + '</span>' +
    '</div>' +
    '<div class="profile-actions">' +
      '<button class="btn btn-primary" onclick="window.App.editProfile()"><i class="fas fa-pen"></i> Edit Profile</button>' +
      '<button class="btn btn-secondary" onclick="window.App.uploadBanner()"><i class="fas fa-image"></i> Change Banner</button>' +
      '<button class="btn btn-secondary" onclick="window.App.shareProfile()"><i class="fas fa-share-nodes"></i> Share</button>' +
    '</div>' +
  '</div>' +

  '<div class="grid-4" style="margin-bottom:20px;">' +
    '<div class="card stat-card"><div class="stat-label"><i class="fas fa-users"></i> Followers</div><div class="stat-value">' + (ME.followers||[]).length + '</div></div>' +
    '<div class="card stat-card"><div class="stat-label"><i class="fas fa-user-plus"></i> Following</div><div class="stat-value">' + (ME.following||[]).length + '</div></div>' +
    '<div class="card stat-card"><div class="stat-label"><i class="fas fa-newspaper"></i> Posts</div><div class="stat-value">' + posts.length + '</div></div>' +
    '<div class="card stat-card"><div class="stat-label"><i class="fas fa-heart"></i> Likes</div><div class="stat-value">' + likes + '</div></div>' +
  '</div>' +

  '<div class="card" style="margin-bottom:20px;">' +
    '<h3 style="font-size:1rem;font-weight:800;margin-bottom:14px;"><i class="fas fa-id-card" style="color:var(--accent-light);margin-right:8px;"></i>Account Details</h3>' +
    '<div class="detail-row"><span class="detail-label"><i class="fas fa-user"></i> Username</span><span class="detail-value">' + esc(ME.username) + '</span></div>' +
    '<div class="detail-row"><span class="detail-label"><i class="fas fa-envelope"></i> Email</span><span class="detail-value">' + esc(ME.email || '—') + '</span></div>' +
    '<div class="detail-row"><span class="detail-label"><i class="fas fa-briefcase"></i> Job Role</span><span class="detail-value">' + esc(ME.role || '—') + '</span></div>' +
    '<div class="detail-row"><span class="detail-label"><i class="fas fa-quote-left"></i> Bio</span><span class="detail-value">' + esc(ME.bio || '—') + '</span></div>' +
    '<div class="detail-row"><span class="detail-label"><i class="fas fa-calendar"></i> Member since</span><span class="detail-value">' + fullDate(ME.createdAt) + '</span></div>' +
  '</div>' +

  '<h2 style="font-size:1.1rem;font-weight:800;margin-bottom:14px;">My Posts</h2>' +
  (posts.length ? posts.map(p => renderPostCard(p)).join('') :
    '<div class="empty-state"><div class="empty-icon"><i class="fas fa-newspaper"></i></div>' +
    '<h3>No posts yet</h3><p>Share your first creation with the community.</p>' +
    '<button class="btn btn-primary" onclick="window.App.openComposer()"><i class="fas fa-plus"></i> Create Post</button></div>');
};

/* ---------------------------- FRIENDS ---------------------------- */
pages.friends = function(){
  if (!ME) return needAuth('Friends');
  const others = DB.users.filter(u => u.id !== ME.id);
  const following = ME.following || [];

  return '<div class="tabs" style="max-width:340px;">' +
      '<button class="tab active" onclick="window.App.friendsTab(this,\'all\')">All (' + others.length + ')</button>' +
      '<button class="tab" onclick="window.App.friendsTab(this,\'following\')">Following (' + following.length + ')</button>' +
    '</div>' +
    '<div class="grid-3" id="friendsGrid">' + friendsCards(others) + '</div>';
};

function friendsCards(list){
  if (!ME) return '';
  if (!list.length) return '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon"><i class="fas fa-user-group"></i></div><h3>No people found</h3><p>Try a different filter.</p></div>';
  return list.map(f => {
    const isFollowing = (ME.following||[]).indexOf(f.id) !== -1;
    const followerCount = (f.followers||[]).length;
    return '<div class="card" style="text-align:center;padding:24px;">' +
      '<div class="message-avatar"' + (f.avatar ? ' style="width:64px;height:64px;font-size:1.5rem;margin:0 auto 12px;background-image:url(\'' + f.avatar + '\');background-size:cover;background-position:center;"' : ' style="width:64px;height:64px;font-size:1.5rem;margin:0 auto 12px;background:' + gradFor(f.username) + ';"') + '>' +
        (f.avatar ? '' : esc(initialOf(f.username))) + '</div>' +
      '<h4 style="font-weight:700;font-size:.92rem;margin-bottom:3px;">' + esc(f.username) + '</h4>' +
      '<p style="font-size:.76rem;color:var(--text-muted);margin-bottom:4px;">' + esc(f.role || 'Creator') + '</p>' +
      '<p style="font-size:.7rem;color:var(--text-muted);margin-bottom:12px;">' + followerCount + ' followers</p>' +
      '<div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">' +
        '<button class="btn ' + (isFollowing ? 'btn-secondary' : 'btn-primary') + ' btn-sm" onclick="window.App.toggleFollow(\'' + f.id + '\')">' +
          '<i class="fas ' + (isFollowing ? 'fa-user-check' : 'fa-user-plus') + '"></i> ' + (isFollowing ? 'Following' : 'Follow') +
        '</button>' +
        '<button class="btn btn-secondary btn-sm" onclick="window.App.openChat(\'' + f.id + '\')"><i class="fas fa-comment"></i></button>' +
        '<button class="btn btn-secondary btn-sm" onclick="window.App.viewProfile(\'' + f.id + '\')"><i class="fas fa-eye"></i></button>' +
      '</div>' +
    '</div>';
  }).join('');
}

/* ---------------------------- MESSAGES ---------------------------- */
pages.messages = async function(){
  if (!ME) return needAuth('Messages');

  const others = DB.users.filter(u => u.id !== ME.id);
  const convos = await Promise.all(others.map(async o => {
    const msgs = DB.messages
      .filter(m => (m.from === ME.id && m.to === o.id) || (m.from === o.id && m.to === ME.id))
      .sort((a,b) => a.ts - b.ts);
    let preview = 'Tap to start a secure chat';
    if (msgs.length){
      const last = msgs[msgs.length - 1];
      const key = await Crypto.convKey(ME.id, o.id);
      const plain = await Crypto.decrypt(key, last);
      preview = (last.from === ME.id ? 'You: ' : '') + (plain || '••••••');
    }
    return {
      user: o,
      last: msgs.length ? msgs[msgs.length-1].ts : 0,
      preview: preview,
      unread: msgs.filter(m => m.to === ME.id && !m.read).length
    };
  }));

  convos.sort((a,b) => (b.last - a.last) || a.user.username.localeCompare(b.user.username));

  const q = state.chatSearch.toLowerCase();
  const filtered = q ? convos.filter(c => c.user.username.toLowerCase().indexOf(q) !== -1) : convos;

  const listHTML = filtered.length ? filtered.map(c => {
    const u = c.user;
    return '<div class="message-item ' + (state.chatWith === u.id ? 'active' : '') + (c.unread ? ' unread' : '') + '" onclick="window.App.openChat(\'' + u.id + '\')">' +
      '<div class="message-avatar"' + (u.avatar ? ' style="background-image:url(\'' + u.avatar + '\');background-size:cover;background-position:center;"' : ' style="background:' + gradFor(u.username) + ';"') + '>' +
        (u.avatar ? '' : esc(initialOf(u.username))) + '</div>' +
      '<div class="message-body">' +
        '<div class="message-name">' + esc(u.username) +
          (c.unread ? '<span class="badge badge-success" style="font-size:.58rem;padding:1px 7px;">' + c.unread + '</span>' : '') +
        '</div>' +
        '<div class="message-text">' + esc(c.preview) + '</div>' +
      '</div>' +
      '<div class="message-time">' + (c.last ? timeAgo(c.last) : '') + '</div>' +
    '</div>';
  }).join('') : '<div style="padding:30px;text-align:center;color:var(--text-muted);font-size:.82rem;">No conversations found.</div>';

  const active = state.chatWith ? getUser(state.chatWith) : null;
  let chatPanelHTML;

  if (!active){
    chatPanelHTML = '<div class="chat-panel" style="align-items:center;justify-content:center;">' +
      '<div class="empty-state"><div class="empty-icon"><i class="fas fa-comments"></i></div>' +
      '<h3>Select a conversation</h3><p>Your messages are encrypted with AES-256 before they are stored.</p></div></div>';
  } else {
    const key = await Crypto.convKey(ME.id, active.id);
    const msgs = DB.messages
      .filter(m => (m.from === ME.id && m.to === active.id) || (m.from === active.id && m.to === ME.id))
      .sort((a,b) => a.ts - b.ts);

    let changed = false;
    msgs.forEach(m => { if (m.to === ME.id && !m.read){ m.read = true; changed = true; } });
    if (changed){ save(); updateNotifDot(); }

    const bubbles = (await Promise.all(msgs.map(async m => {
      const plain = await Crypto.decrypt(key, m);
      const mine = m.from === ME.id;
      return '<div class="bubble ' + (mine ? 'me' : 'them') + '">' + esc(plain || '⚠️ Unable to decrypt') +
        '<div class="bmeta"><i class="fas fa-lock" style="font-size:.55rem;"></i> ' + timeAgo(m.ts) + '</div></div>';
    }))).join('');

    chatPanelHTML = '<div class="chat-panel">' +
      '<div class="chat-head">' +
        '<button class="icon-btn" style="display:none;" id="chatBack"><i class="fas fa-arrow-left"></i></button>' +
        '<div class="message-avatar"' + (active.avatar ? ' style="background-image:url(\'' + active.avatar + '\');background-size:cover;background-position:center;"' : ' style="background:' + gradFor(active.username) + ';"') + '>' +
          (active.avatar ? '' : esc(initialOf(active.username))) + '</div>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-weight:700;font-size:.9rem;">' + esc(active.username) + '</div>' +
          '<div style="font-size:.7rem;color:var(--success);"><i class="fas fa-lock"></i> End-to-end encrypted</div>' +
        '</div>' +
        '<button class="icon-btn" onclick="window.App.viewProfile(\'' + active.id + '\')" title="View profile"><i class="fas fa-user"></i></button>' +
      '</div>' +
      '<div class="chat-body" id="chatBody">' +
        (bubbles || '<div style="text-align:center;color:var(--text-muted);font-size:.82rem;padding:20px;">No messages yet — say hello 👋</div>') +
      '</div>' +
      '<div class="enc-note"><i class="fas fa-shield-halved"></i> Messages are encrypted (' + (Crypto.hasSubtle ? 'AES-256-GCM' : 'fallback cipher') + ') before being stored on this device.</div>' +
      '<form class="chat-input" onsubmit="window.App.sendMessage(event)">' +
        '<textarea id="chatInput" placeholder="Write an encrypted message…" maxlength="2000" ' +
          'onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();this.form.requestSubmit();}"></textarea>' +
        '<button type="submit" class="btn btn-primary" style="height:46px;padding:0 20px;"><i class="fas fa-paper-plane"></i></button>' +
      '</form>' +
    '</div>';
  }

  const wrapCls = 'chat-wrap' + (state.chatWith ? ' mobile-chat' : '');
  return '<div class="' + wrapCls + '" id="chatWrap">' +
    '<div class="chat-list">' +
      '<div class="chat-list-head"><span><i class="fas fa-comments" style="color:var(--accent-light);margin-right:8px;"></i>Conversations</span>' +
        '<button class="icon-btn" style="width:32px;height:32px;" onclick="window.App.newConversation()" title="New message"><i class="fas fa-plus"></i></button>' +
      '</div>' +
      '<div style="padding:10px 12px;">' +
        '<div class="search-box" style="min-width:0;width:100%;"><i class="fas fa-search"></i>' +
        '<input type="text" id="chatSearch" placeholder="Search people…" value="' + esc(state.chatSearch) + '" oninput="window.App.chatSearch(this.value)"/></div>' +
      '</div>' +
      listHTML +
    '</div>' +
    chatPanelHTML +
  '</div>';
};

/* ---------------------------- NOTIFICATIONS ---------------------------- */
pages.notifications = function(){
  if (!ME) return needAuth('Notifications');
  const list = myNotifications();
  return '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">' +
      '<h2 style="font-size:1.2rem;font-weight:800;">Notifications</h2>' +
      '<div style="display:flex;gap:8px;">' +
        '<button class="btn btn-secondary btn-sm" onclick="window.App.markAllRead()"><i class="fas fa-check-double"></i> Mark all read</button>' +
        '<button class="btn btn-danger btn-sm" onclick="window.App.clearNotifications()"><i class="fas fa-trash"></i> Clear</button>' +
      '</div>' +
    '</div>' +
    (list.length ? '<div class="card" style="padding:8px 6px;">' + list.map(n => {
      const actor = n.actor ? getUser(n.actor) : null;
      return '<div class="activity-item" style="' + (n.read ? 'opacity:.65;' : '') + '">' +
        '<div class="activity-avatar"' + (actor && actor.avatar ? ' style="background-image:url(\'' + actor.avatar + '\');background-size:cover;background-position:center;"' : ' style="background:' + gradFor(actor ? actor.username : 'x') + ';"') + '>' +
          (actor && actor.avatar ? '' : '<i class="fas fa-bell"></i>') + '</div>' +
        '<div class="activity-content"><p>' + n.text + '</p>' +
        '<div class="activity-time"><i class="fas fa-clock"></i> ' + timeAgo(n.ts) + (n.read ? ' · read' : ' · <span style="color:var(--accent-light);font-weight:700;">new</span>') + '</div></div>' +
      '</div>';
    }).join('') + '</div>' :
      '<div class="empty-state"><div class="empty-icon"><i class="fas fa-bell-slash"></i></div>' +
      '<h3>You\'re all caught up</h3><p>New likes, comments, follows and messages will show up here.</p></div>');
};

/* ---------------------------- FEED ---------------------------- */
pages.feed = function(){
  let posts = DB.posts.slice().sort((a,b) => b.ts - a.ts);
  if (state.feedTab === 'following' && ME){
    const set = (ME.following || []).concat([ME.id]);
    posts = posts.filter(p => set.indexOf(p.author) !== -1);
  } else if (state.feedTab === 'mine' && ME){
    posts = posts.filter(p => p.author === ME.id);
  }

  return '<div class="tabs" style="max-width:420px;">' +
      '<button class="tab ' + (state.feedTab === 'all' ? 'active' : '') + '" onclick="window.App.feedTab(this,\'all\')">All</button>' +
      '<button class="tab ' + (state.feedTab === 'following' ? 'active' : '') + '" onclick="window.App.feedTab(this,\'following\')">Following</button>' +
      '<button class="tab ' + (state.feedTab === 'mine' ? 'active' : '') + '" onclick="window.App.feedTab(this,\'mine\')">Mine</button>' +
    '</div>' +
    (ME ? '<div class="composer">' +
      '<div class="composer-row">' +
        avatarHTML(ME, 44, '14px') +
        '<textarea id="quickComposer" placeholder="Share something with the community…" maxlength="1000"></textarea>' +
      '</div>' +
      '<div class="composer-actions">' +
        '<button class="action-btn" onclick="window.App.openComposer()"><i class="fas fa-image"></i> Photo</button>' +
        '<button class="action-btn" onclick="window.App.openComposer(\'reel\')"><i class="fas fa-film"></i> Reel</button>' +
        '<button class="btn btn-primary btn-sm" style="margin-left:auto;" onclick="window.App.quickPost()"><i class="fas fa-paper-plane"></i> Post</button>' +
      '</div>' +
    '</div>' : '') +
    (posts.length ? posts.map(p => renderPostCard(p)).join('') :
      '<div class="empty-state"><div class="empty-icon"><i class="fas fa-newspaper"></i></div>' +
      '<h3>Nothing here yet</h3><p>Follow more creators or write the first post.</p>' +
      (ME ? '<button class="btn btn-primary" onclick="window.App.openComposer()"><i class="fas fa-plus"></i> Create Post</button>' :
            '<button class="btn btn-primary" onclick="window.App.openAuth(\'signin\')"><i class="fas fa-right-to-bracket"></i> Sign In</button>') +
      '</div>');
};

/* ---------------------------- EXPLORE ---------------------------- */
pages.explore = function(){
  const q = (state.exploreQuery || '').toLowerCase();
  const tab = state.exploreTab;

  let people = DB.users;
  let posts = DB.posts.slice().sort((a,b) => b.ts - a.ts);
  let listings = DB.listings.slice().sort((a,b) => b.ts - a.ts);

  if (q){
    people = people.filter(u => u.username.toLowerCase().indexOf(q) !== -1 || (u.role||'').toLowerCase().indexOf(q) !== -1);
    posts = posts.filter(p => (p.text||'').toLowerCase().indexOf(q) !== -1);
    listings = listings.filter(l => (l.title + ' ' + l.desc + ' ' + l.cat).toLowerCase().indexOf(q) !== -1);
  }

  let body = '';
  if (tab === 'people' || tab === 'all'){
    body += '<h3 style="font-size:1rem;font-weight:800;margin:18px 0 12px;">People</h3>';
    body += people.length ? '<div class="grid-3">' + people.slice(0,6).map(f => {
      const isFollowing = ME && (ME.following||[]).indexOf(f.id) !== -1;
      return '<div class="card" style="display:flex;gap:12px;align-items:center;">' +
        '<div class="message-avatar"' + (f.avatar ? ' style="background-image:url(\'' + f.avatar + '\');background-size:cover;background-position:center;"' : ' style="background:' + gradFor(f.username) + ';"') + '>' +
          (f.avatar ? '' : esc(initialOf(f.username))) + '</div>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-weight:700;font-size:.86rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(f.username) + '</div>' +
          '<div style="font-size:.72rem;color:var(--text-muted);">' + esc(f.role || 'Creator') + '</div>' +
        '</div>' +
        '<button class="btn ' + (isFollowing ? 'btn-secondary' : 'btn-primary') + ' btn-sm" onclick="window.App.toggleFollow(\'' + f.id + '\')">' +
          '<i class="fas ' + (isFollowing ? 'fa-user-check' : 'fa-user-plus') + '"></i></button>' +
      '</div>';
    }).join('') + '</div>' : '<p style="color:var(--text-muted);font-size:.85rem;">No people matched.</p>';
  }
  if (tab === 'posts' || tab === 'all'){
    body += '<h3 style="font-size:1rem;font-weight:800;margin:24px 0 12px;">Posts</h3>';
    body += posts.length ? posts.slice(0,4).map(p => renderPostCard(p)).join('') : '<p style="color:var(--text-muted);font-size:.85rem;">No posts matched.</p>';
  }
  if (tab === 'market' || tab === 'all'){
    body += '<h3 style="font-size:1rem;font-weight:800;margin:24px 0 12px;">Marketplace</h3>';
    body += listings.length ? '<div class="grid-3">' + listings.slice(0,6).map(l => listingCard(l)).join('') + '</div>' : '<p style="color:var(--text-muted);font-size:.85rem;">No listings matched.</p>';
  }

  return '<div class="search-box" style="min-width:0;width:100%;max-width:520px;margin-bottom:16px;">' +
      '<i class="fas fa-search"></i>' +
      '<input type="text" id="exploreSearch" placeholder="Search people, posts and art…" value="' + esc(state.exploreQuery) + '" oninput="window.App.exploreSearch(this.value)"/>' +
    '</div>' +
    '<div class="tabs" style="max-width:520px;">' +
      '<button class="tab ' + (tab==='all'?'active':'') + '" onclick="window.App.exploreTab(this,\'all\')">All</button>' +
      '<button class="tab ' + (tab==='people'?'active':'') + '" onclick="window.App.exploreTab(this,\'people\')">People</button>' +
      '<button class="tab ' + (tab==='posts'?'active':'') + '" onclick="window.App.exploreTab(this,\'posts\')">Posts</button>' +
      '<button class="tab ' + (tab==='market'?'active':'') + '" onclick="window.App.exploreTab(this,\'market\')">Market</button>' +
    '</div>' + body;
};

/* ---------------------------- REELS ---------------------------- */
pages.reels = function(){
  const reels = DB.posts.filter(p => p.kind === 'reel').sort((a,b) => b.ts - a.ts);
  return '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">' +
      '<h2 style="font-size:1.2rem;font-weight:800;">Reels</h2>' +
      (ME ? '<button class="btn btn-primary btn-sm" onclick="window.App.openComposer(\'reel\')"><i class="fas fa-plus"></i> Upload Reel</button>' : '') +
    '</div>' +
    (reels.length ? '<div class="grid-3">' + reels.map(r => {
      const a = getUser(r.author) || { username:'Unknown' };
      return '<div class="card" style="padding:0;overflow:hidden;cursor:pointer;" onclick="window.App.viewReel(\'' + r.id + '\')">' +
        (r.image
          ? '<div style="height:200px;background-image:url(\'' + r.image + '\');background-size:cover;background-position:center;position:relative;">' +
              '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.25);font-size:2.6rem;color:#fff;"><i class="fas fa-play-circle"></i></div></div>'
          : '<div style="height:200px;background:' + (r.bg || gradFor(a.username)) + ';display:flex;align-items:center;justify-content:center;font-size:2.6rem;color:rgba(255,255,255,.9);"><i class="fas fa-play-circle"></i></div>') +
        '<div style="padding:12px 14px;">' +
          '<div style="font-weight:700;font-size:.85rem;">' + esc(a.username) + '</div>' +
          '<div style="font-size:.75rem;color:var(--text-muted);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(r.text || 'Reel') + '</div>' +
          '<div style="font-size:.72rem;color:var(--text-muted);margin-top:6px;"><i class="fas fa-heart"></i> ' + r.likes.length + ' · <i class="fas fa-eye"></i> ' + (r.views||0) + ' · ' + timeAgo(r.ts) + '</div>' +
        '</div>' +
      '</div>';
    }).join('') + '</div>' :
      '<div class="empty-state"><div class="empty-icon"><i class="fas fa-film"></i></div>' +
      '<h3>No reels yet</h3><p>Upload a short visual moment and it will appear here.</p>' +
      (ME ? '<button class="btn btn-primary" onclick="window.App.openComposer(\'reel\')"><i class="fas fa-upload"></i> Upload Reel</button>' : '') + '</div>');
};

/* ---------------------------- STORIES ---------------------------- */
pages.stories = function(){
  const active = DB.stories.filter(s => s.expires > now()).sort((a,b) => b.ts - a.ts);
  const byAuthor = {};
  active.forEach(s => { (byAuthor[s.author] = byAuthor[s.author] || []).push(s); });

  const mine = ME ? (byAuthor[ME.id] || []) : [];
  let rings = '';

  rings += '<div style="flex-shrink:0;text-align:center;cursor:pointer;" onclick="window.App.openStoryCreator()">' +
    '<div class="story-ring">' +
      '<div class="inner"' + (ME && ME.avatar ? ' style="background-image:url(\'' + ME.avatar + '\');background-size:cover;background-position:center;"' : '') + '>' +
        (ME && ME.avatar ? '' : '<i class="fas fa-plus" style="font-size:1.4rem;"></i>') +
      '</div>' +
    '</div>' +
    '<div style="font-size:.76rem;margin-top:8px;color:var(--text-secondary);font-weight:600;">' +
      (mine.length ? 'Your story' : 'Add story') +
    '</div>' +
  '</div>';

  const others = Object.keys(byAuthor).filter(id => !ME || id !== ME.id);
  rings += others.map(id => {
    const u = getUser(id);
    if (!u) return '';
    const seen = ME && byAuthor[id].every(s => (s.views||[]).indexOf(ME.id) !== -1);
    return '<div style="flex-shrink:0;text-align:center;cursor:pointer;" onclick="window.App.viewStory(\'' + id + '\')">' +
      '<div class="story-ring ' + (seen ? 'seen' : '') + '">' +
        '<div class="inner"' + (u.avatar ? ' style="background-image:url(\'' + u.avatar + '\');background-size:cover;background-position:center;"' : '') + '>' +
          (u.avatar ? '' : esc(initialOf(u.username))) +
        '</div>' +
      '</div>' +
      '<div style="font-size:.76rem;margin-top:8px;color:var(--text-secondary);font-weight:600;max-width:78px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(firstNameOf(u.username)) + '</div>' +
    '</div>';
  }).join('');

  return '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">' +
      '<h2 style="font-size:1.2rem;font-weight:800;">Stories</h2>' +
      (ME ? '<button class="btn btn-primary btn-sm" onclick="window.App.openStoryCreator()"><i class="fas fa-plus"></i> Create Story</button>' : '') +
    '</div>' +
    '<div class="card" style="margin-bottom:20px;"><div style="display:flex;gap:16px;overflow-x:auto;padding:6px 2px 10px;">' + rings + '</div></div>' +
    (mine.length ? '<h3 style="font-size:1rem;font-weight:800;margin-bottom:12px;">Your active stories</h3>' +
      '<div class="grid-3">' + mine.map(s =>
        '<div class="card" style="padding:0;overflow:hidden;cursor:pointer;" onclick="window.App.viewStory(\'' + ME.id + '\')">' +
          (s.kind === 'image' && s.image
            ? '<div style="height:170px;background-image:url(\'' + s.image + '\');background-size:cover;background-position:center;"></div>'
            : '<div style="height:170px;background:' + esc(s.bg) + ';display:flex;align-items:center;justify-content:center;padding:16px;color:#fff;font-weight:700;text-align:center;">' + esc(s.text || '') + '</div>') +
          '<div style="padding:12px 14px;display:flex;justify-content:space-between;align-items:center;">' +
            '<span style="font-size:.74rem;color:var(--text-muted);">' + timeAgo(s.ts) + ' · ' + (s.views||[]).length + ' views</span>' +
            '<button class="icon-btn" style="width:30px;height:30px;" onclick="event.stopPropagation();window.App.deleteStory(\'' + s.id + '\')"><i class="fas fa-trash" style="font-size:.75rem;"></i></button>' +
          '</div>' +
        '</div>'
      ).join('') + '</div>' : '');
};

/* ---------------------------- MARKETPLACE ---------------------------- */
function listingCard(l){
  const seller = getUser(l.seller) || { username:'Unknown' };
  const inCart = ME && (DB.carts[ME.id] || []).indexOf(l.id) !== -1;
  const thumb = l.image
    ? '<div class="market-thumb" style="background-image:url(\'' + l.image + '\');background-size:cover;background-position:center;"></div>'
    : '<div class="market-thumb" style="background:' + (l.bg || gradFor(l.title)) + ';"><i class="fas ' + (l.icon || 'fa-image') + '"></i></div>';

  return '<div class="market-item">' + thumb +
    '<div class="market-info">' +
      '<h4>' + esc(l.title) + '</h4>' +
      '<p style="font-size:.76rem;color:var(--text-muted);line-height:1.5;margin-bottom:8px;">' + esc(l.desc) + '</p>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;">' +
        '<span class="market-price" style="margin:0;">' + money(l.price) + '</span>' +
        '<span style="font-size:.68rem;color:var(--text-muted);">by ' + esc(seller.username) + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:6px;">' +
        '<button class="btn ' + (inCart ? 'btn-secondary' : 'btn-primary') + ' btn-sm" style="flex:1;" onclick="window.App.addToCart(\'' + l.id + '\')">' +
          '<i class="fas ' + (inCart ? 'fa-check' : 'fa-cart-plus') + '"></i> ' + (inCart ? 'In cart' : 'Add') +
        '</button>' +
        '<button class="btn btn-secondary btn-sm" onclick="window.App.viewListing(\'' + l.id + '\')"><i class="fas fa-eye"></i></button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

pages.marketplace = function(){
  const cartCount = ME ? (DB.carts[ME.id] || []).length : 0;
  const listings = DB.listings.slice().sort((a,b) => b.ts - a.ts);

  return '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">' +
      '<h2 style="font-size:1.2rem;font-weight:800;">Marketplace</h2>' +
      '<div style="display:flex;gap:8px;">' +
        (ME ? '<button class="btn btn-primary btn-sm" onclick="window.App.openListingCreator()"><i class="fas fa-plus"></i> Sell Something</button>' : '') +
        '<button class="btn btn-secondary btn-sm" onclick="window.App.openCart()"><i class="fas fa-cart-shopping"></i> Cart (' + cartCount + ')</button>' +
      '</div>' +
    '</div>' +
    (listings.length ? '<div class="grid-3">' + listings.map(listingCard).join('') + '</div>' :
      '<div class="empty-state"><div class="empty-icon"><i class="fas fa-store"></i></div><h3>No listings yet</h3><p>Be the first to sell a digital asset.</p></div>');
};

/* ---------------------------- SETTINGS ---------------------------- */
pages.settings = function(){
  if (!ME) return needAuth('Settings');
  const theme = currentTheme();
  return '<h2 style="font-size:1.2rem;font-weight:800;margin-bottom:16px;">Settings</h2>' +
    '<div class="grid-2">' +
      '<div class="settings-item" onclick="window.App.editProfile()">' +
        '<div class="settings-icon"><i class="fas fa-user"></i></div>' +
        '<div class="settings-info"><h4>Account</h4><p>Username, email, role and bio</p></div>' +
        '<i class="fas fa-chevron-right settings-arrow"></i>' +
      '</div>' +
      '<div class="settings-item" onclick="window.App.uploadAvatar()">' +
        '<div class="settings-icon"><i class="fas fa-camera"></i></div>' +
        '<div class="settings-info"><h4>Profile Photo</h4><p>Upload or change your avatar</p></div>' +
        '<i class="fas fa-chevron-right settings-arrow"></i>' +
      '</div>' +
      '<div class="settings-item">' +
        '<div class="settings-icon"><i class="fas fa-moon"></i></div>' +
        '<div class="settings-info"><h4>Dark Theme</h4><p>Switch between dark and light</p></div>' +
        '<div class="switch ' + (theme === 'dark' ? 'on' : '') + '" onclick="window.App.toggleTheme()"></div>' +
      '</div>' +
      '<div class="settings-item" onclick="window.App.changePassword()">' +
        '<div class="settings-icon"><i class="fas fa-shield-halved"></i></div>' +
        '<div class="settings-info"><h4>Password</h4><p>Change your account password</p></div>' +
        '<i class="fas fa-chevron-right settings-arrow"></i>' +
      '</div>' +
      '<div class="settings-item" onclick="window.App.exportData()">' +
        '<div class="settings-icon"><i class="fas fa-download"></i></div>' +
        '<div class="settings-info"><h4>Export Data</h4><p>Download all your data as JSON</p></div>' +
        '<i class="fas fa-chevron-right settings-arrow"></i>' +
      '</div>' +
      '<div class="settings-item" onclick="window.App.importData()">' +
        '<div class="settings-icon"><i class="fas fa-upload"></i></div>' +
        '<div class="settings-info"><h4>Import Data</h4><p>Restore from a JSON backup</p></div>' +
        '<i class="fas fa-chevron-right settings-arrow"></i>' +
      '</div>' +
      '<div class="settings-item" onclick="window.App.clearChats()">' +
        '<div class="settings-icon"><i class="fas fa-broom"></i></div>' +
        '<div class="settings-info"><h4>Clear Messages</h4><p>Delete all your conversations</p></div>' +
        '<i class="fas fa-chevron-right settings-arrow"></i>' +
      '</div>' +
      '<div class="settings-item" onclick="window.App.clearNotifications()">' +
        '<div class="settings-icon"><i class="fas fa-bell-slash"></i></div>' +
        '<div class="settings-info"><h4>Clear Notifications</h4><p>Remove all notifications</p></div>' +
        '<i class="fas fa-chevron-right settings-arrow"></i>' +
      '</div>' +
      '<div class="settings-item" onclick="window.App.resetAll()" style="border-color:rgba(248,113,113,.3);">' +
        '<div class="settings-icon" style="background:rgba(248,113,113,.15);color:var(--danger);"><i class="fas fa-triangle-exclamation"></i></div>' +
        '<div class="settings-info"><h4 style="color:var(--danger);">Reset Application</h4><p>Delete everything and start fresh</p></div>' +
        '<i class="fas fa-chevron-right settings-arrow"></i>' +
      '</div>' +
      '<div class="settings-item" onclick="window.App.logout()" style="border-color:rgba(248,113,113,.3);">' +
        '<div class="settings-icon" style="background:rgba(248,113,113,.15);color:var(--danger);"><i class="fas fa-right-from-bracket"></i></div>' +
        '<div class="settings-info"><h4 style="color:var(--danger);">Sign Out</h4><p>End your current session</p></div>' +
        '<i class="fas fa-chevron-right settings-arrow"></i>' +
      '</div>' +
    '</div>';
};

/* ---------------------------- HELP ---------------------------- */
pages.help = function(){
  const faqs = [
    ['How is my messaging encrypted?', 'Every message is encrypted with AES-256-GCM (WebCrypto) using a key derived from the two participants before it is written to storage. If WebCrypto is unavailable, a built-in stream cipher is used as a fallback. Nothing is ever sent to a server — the whole app runs in your browser.'],
    ['How do I add a story?', 'Open Stories from the sidebar and press “Create Story”. You can post a coloured text card or upload an image. Stories automatically expire after 24 hours.'],
    ['Can I change my profile photo?', 'Yes. Go to Settings → Profile Photo, or press Edit Profile on your profile page. Images are resized automatically so they fit in local storage.'],
    ['Where is my data stored?', 'Everything lives in your browser\'s localStorage under the key helaberry_db_v1. Use Settings → Export Data to download a JSON backup at any time.'],
    ['How do I sell on the marketplace?', 'Open Marketplace and press “Sell Something”. Add a title, description, price and an optional image. Your listing appears instantly.'],
    ['I forgot my password — what now?', 'Accounts are stored locally, so there is no recovery email. If you are locked out, use Settings → Reset Application on another account, or clear your browser storage and sign up again.']
  ];
  return '<h2 style="font-size:1.2rem;font-weight:800;margin-bottom:16px;">Help &amp; Support</h2>' +
    '<div style="margin-bottom:26px;">' + faqs.map(f =>
      '<details class="faq"><summary>' + esc(f[0]) + '</summary><div class="faq-body">' + esc(f[1]) + '</div></details>'
    ).join('') + '</div>' +
    '<div class="card" style="max-width:640px;">' +
      '<h3 style="font-size:1rem;font-weight:800;margin-bottom:14px;"><i class="fas fa-headset" style="color:var(--accent-light);margin-right:8px;"></i>Contact Support</h3>' +
      '<div class="input-field"><label>Subject</label><input type="text" id="ticketSubject" placeholder="What do you need help with?" maxlength="100"/></div>' +
      '<div class="input-field"><label>Message</label><textarea id="ticketBody" placeholder="Describe your issue in detail…" maxlength="2000"></textarea></div>' +
      '<button class="btn btn-primary" onclick="window.App.sendTicket()"><i class="fas fa-paper-plane"></i> Send to Support</button>' +
      '<p style="font-size:.72rem;color:var(--text-muted);margin-top:12px;">Tickets are stored locally and reviewed by the HelaBerry team.</p>' +
    '</div>';
};

/* ---------------------------- NOT FOUND ---------------------------- */
pages.notfound = function(){
  return '<div class="empty-state"><div class="empty-icon"><i class="fas fa-compass"></i></div>' +
    '<h3>Page not found</h3><p>The page you are looking for does not exist.</p>' +
    '<button class="btn btn-primary" onclick="window.App.navigate(\'dashboard\')"><i class="fas fa-home"></i> Back to Dashboard</button></div>';
};

/* ============================================================================
   15. RENDER ENGINE
   ============================================================================ */
const pageMeta = {
  dashboard:{ title:'Dashboard', sub:'Your creative overview' },
  analytics:{ title:'Analytics', sub:'Track your performance' },
  activity:{ title:'Activity', sub:'Everything happening around you' },
  profile:{ title:'Profile', sub:'Your public identity' },
  friends:{ title:'Friends', sub:'Your creative network' },
  messages:{ title:'Messages', sub:'Encrypted conversations' },
  notifications:{ title:'Notifications', sub:'Stay in the loop' },
  feed:{ title:'Feed', sub:'Latest from your network' },
  explore:{ title:'Explore', sub:'Discover new content' },
  reels:{ title:'Reels', sub:'Short-form visual moments' },
  stories:{ title:'Stories', sub:'24-hour moments' },
  marketplace:{ title:'Marketplace', sub:'Buy & sell digital assets' },
  settings:{ title:'Settings', sub:'Manage your account' },
  help:{ title:'Help & Support', sub:'We are here to help' }
};

let renderToken = 0;

async function renderPage(page){
  const token = ++renderToken;
  state.page = page;

  const fn = pages[page] || pages.notfound;
  let html;
  try { html = fn(); } catch(e){ console.error(e); html = '<div class="empty-state"><h3>Something went wrong</h3><p>' + esc(e.message) + '</p></div>'; }
  if (html && typeof html.then === 'function') html = await html;

  if (token !== renderToken) return;

  $('#pageContainer').innerHTML = '<div class="page active">' + html + '</div>';

  const meta = pageMeta[page] || { title:'HelaBerry', sub:'' };
  if (page === 'dashboard' && ME){
    $('#pageTitle').innerHTML = esc(meta.title) + ' · <span class="greet-name">' + esc(ME.username) + '</span>';
  } else {
    $('#pageTitle').textContent = meta.title;
  }
  $('#pageSub').textContent = meta.sub;

  $$('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));

  const chatBody = $('#chatBody');
  if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;

  if (window.innerWidth <= 900){
    const back = $('#chatBack');
    if (back) back.style.display = 'flex';
  }

  window.scrollTo({ top:0, behavior:'smooth' });
}

/* ============================================================================
   16. STORY VIEWER
   ============================================================================ */
function closeStoryViewer(){
  const v = $('#storyViewer');
  v.classList.remove('active');
  v.innerHTML = '';
  if (state.storyViewer.timer){ clearTimeout(state.storyViewer.timer); state.storyViewer.timer = null; }
  document.body.style.overflow = '';
}

function renderStoryViewer(){
  const { list, idx } = state.storyViewer;
  if (!list.length) return closeStoryViewer();
  const s = list[idx];
  if (!s) return closeStoryViewer();
  const author = getUser(s.author) || { username:'Unknown' };

  if (ME && (s.views||[]).indexOf(ME.id) === -1){
    s.views = s.views || [];
    s.views.push(ME.id);
    save();
  }

  const inner = s.kind === 'image' && s.image
    ? '<img src="' + s.image + '" style="width:100%;height:100%;object-fit:cover;" alt="story"/>'
    : '<div style="width:100%;height:100%;background:' + esc(s.bg || gradFor(author.username)) + ';display:flex;align-items:center;justify-content:center;padding:34px;text-align:center;font-size:1.35rem;font-weight:800;color:#fff;line-height:1.5;">' + esc(s.text || '') + '</div>';

  $('#storyViewer').innerHTML =
    '<div class="story-card">' +
      '<div class="story-progress"><span class="run"></span></div>' +
      '<div class="story-nav" style="left:0;" onclick="window.App.storyPrev(event)"></div>' +
      '<div class="story-nav" style="right:0;" onclick="window.App.storyNext(event)"></div>' +
      '<div class="story-head">' +
        '<div class="message-avatar" style="width:38px;height:38px;font-size:.85rem;' + (author.avatar ? 'background-image:url(\'' + author.avatar + '\');background-size:cover;background-position:center;' : 'background:' + gradFor(author.username) + ';') + '">' +
          (author.avatar ? '' : esc(initialOf(author.username))) + '</div>' +
        '<div style="flex:1;min-width:0;">' +
          '<div class="sname">' + esc(author.username) + '</div>' +
          '<div class="stime">' + timeAgo(s.ts) + '</div>' +
        '</div>' +
        '<button class="icon-btn" style="background:rgba(0,0,0,.4);border-color:transparent;color:#fff;" onclick="window.App.closeStory()"><i class="fas fa-times"></i></button>' +
      '</div>' +
      inner +
      (ME && s.author === ME.id ? '<button class="btn btn-danger btn-sm" style="position:absolute;bottom:18px;right:18px;z-index:6;" onclick="window.App.deleteStory(\'' + s.id + '\',true)"><i class="fas fa-trash"></i> Delete</button>' : '') +
    '</div>';

  if (state.storyViewer.timer) clearTimeout(state.storyViewer.timer);
  state.storyViewer.timer = setTimeout(() => { App.storyNext(); }, 5000);
}

function openStoryViewer(list, idx){
  state.storyViewer.list = list;
  state.storyViewer.idx = idx;
  $('#storyViewer').classList.add('active');
  document.body.style.overflow = 'hidden';
  renderStoryViewer();
}

/* ============================================================================
   17. AUTO-REPLY ENGINE
   ============================================================================ */
function generateReply(text){
  const t = (text || '').toLowerCase();
  if (/\b(hi|hello|hey|yo|sup)\b/.test(t)) return pick(['Hey! 👋 Great to hear from you.', 'Hello! How are you doing today?', 'Hey there! What\'s up?']);
  if (/price|cost|how much|buy|purchase/.test(t)) return pick(['I can send you the pricing details right away 💰', 'It starts at $19 — I\'ll DM the full breakdown.', 'Let me put together a quote for you.']);
  if (/collab|work together|project|partner/.test(t)) return pick(['A collab sounds great! What did you have in mind?', 'I\'d love to work together 🎨 Send me the brief!', 'Count me in — when do we start?']);
  if (/thank|thanks|thx/.test(t)) return pick(['Anytime! 🙌', 'No problem at all 😊', 'Happy to help!']);
  if (/palette|color|colour/.test(t)) return pick(['That palette is 🔥 — let me send you mine too.', 'Colour is my favourite topic. What are you working on?']);
  if (/image|art|design|draw|paint|render/.test(t)) return pick(['Just checked it out — the composition is stunning! 🎨', 'The lighting in that piece is unreal.', 'Beautiful work! What software did you use?']);
  if (/reel|video|film/.test(t)) return pick(['That reel is so smooth 🎬', 'The edit on that was clean!']);
  if (/story/.test(t)) return pick(['Saw your story — love it ✨', 'Your story made my day!']);
  if (/\?$/.test(t.trim())) return pick(['Good question — let me get back to you properly.', 'Hmm, let me think about that one.', 'Great question! I\'ll check and reply.']);
  return pick([
    'Love that! 😍', 'Nice one — keep creating!', 'Sounds good to me!',
    'Absolutely, let\'s do it.', 'That\'s a great idea 🚀', 'I\'m on it!',
    'Totally agree with you.', 'Interesting — tell me more.'
  ]);
}

function scheduleReply(otherUserId, myText){
  if (!ME) return;
  const meId = ME.id;
  const delay = 900 + Math.random() * 1800;
  setTimeout(async () => {
    const other = getUser(otherUserId);
    const current = getUser(meId);
    if (!other || !current) return;

    const reply = generateReply(myText);
    const key = await Crypto.convKey(meId, other.id);
    const payload = await Crypto.encrypt(key, reply);

    DB.messages.push({
      id: uid(), from: other.id, to: meId,
      alg: payload.alg, iv: payload.iv, ct: payload.ct,
      ts: now(),
      read: (state.page === 'messages' && state.chatWith === other.id)
    });
    save();

    addNotification(meId, 'message',
      '<strong>' + esc(other.username) + '</strong> sent you an encrypted message', other.id);

    if (state.page === 'messages' && state.chatWith === other.id){
      appendBubble(reply, false, now());
    }
  }, delay);
}

function appendBubble(text, mine, ts){
  const body = $('#chatBody');
  if (!body) return;
  const empty = body.querySelector('div[style*="text-align:center"]');
  if (empty) empty.remove();
  const el = document.createElement('div');
  el.className = 'bubble ' + (mine ? 'me' : 'them');
  el.innerHTML = esc(text) + '<div class="bmeta"><i class="fas fa-lock" style="font-size:.55rem;"></i> ' + timeAgo(ts) + '</div>';
  body.appendChild(el);
  body.scrollTop = body.scrollHeight;
}

/* ============================================================================
   18. APP API (exposed globally)
   ============================================================================ */
const App = {

  navigate(page){
    if (page === 'logout'){ App.logout(); return; }
    if (page === 'ai'){ window.location.href = 'homepage.html'; return; }
    if (page === 'messages'){ } else { state.chatWith = null; }
    renderPage(page);
    closeSidebar();
    buildSidebar();
  },

  toast: toast,
  closeModal: closeModal,
  openModal: openModal,

  /* ---------- auth ---------- */
  openAuth(mode){
    mode = mode || 'signin';
    openModal(
      '<div class="modal-header">' +
        '<h3><i class="fas fa-strawberry" style="color:var(--accent-light);"></i> Welcome to HelaBerry</h3>' +
        '<button class="modal-close" onclick="window.App.closeModal()"><i class="fas fa-times"></i></button>' +
      '</div>' +
      '<div class="tabs">' +
        '<button class="tab ' + (mode === 'signin' ? 'active' : '') + '" id="tabSignin" onclick="window.App.authTab(\'signin\')">Sign In</button>' +
        '<button class="tab ' + (mode === 'signup' ? 'active' : '') + '" id="tabSignup" onclick="window.App.authTab(\'signup\')">Create Account</button>' +
      '</div>' +
      '<div id="authForm"></div>' +
      '<p style="font-size:.72rem;color:var(--text-muted);margin-top:14px;text-align:center;">All data stays on this device. Nothing is uploaded anywhere.</p>'
    );
    App.authTab(mode);
  },

  authTab(mode){
    $('#tabSignin').classList.toggle('active', mode === 'signin');
    $('#tabSignup').classList.toggle('active', mode === 'signup');
    if (mode === 'signin'){
      $('#authForm').innerHTML =
        '<div class="input-field"><label>Username</label><input type="text" id="authUser" placeholder="Your username" autocomplete="username"/></div>' +
        '<div class="input-field"><label>Password</label><input type="password" id="authPass" placeholder="Your password" autocomplete="current-password" onkeydown="if(event.key===\'Enter\')window.App.doSignIn()"/></div>' +
        '<button class="btn btn-primary btn-block" onclick="window.App.doSignIn()"><i class="fas fa-right-to-bracket"></i> Sign In</button>' +
        '<p style="font-size:.72rem;color:var(--text-muted);margin-top:12px;text-align:center;">Demo accounts use the password <strong>helaberry123</strong> (e.g. “Sarah Johnson”).</p>';
    } else {
      $('#authForm').innerHTML =
        '<div class="input-field"><label>Username</label><input type="text" id="authUser" placeholder="Choose a username" maxlength="30" autocomplete="username"/></div>' +
        '<div class="input-field"><label>Email</label><input type="email" id="authEmail" placeholder="you@example.com" autocomplete="email"/></div>' +
        '<div class="input-field"><label>Job Role</label><select id="authRole">' +
          ['Graphic Designer','UI/UX Designer','Painter','Student','Illustrator','Photographer','Motion Designer','3D Artist','Content Creator','Art Director','Other']
            .map(r => '<option value="' + r + '">' + r + '</option>').join('') +
        '</select></div>' +
        '<div class="input-field"><label>Password</label><input type="password" id="authPass" placeholder="At least 6 characters" autocomplete="new-password"/></div>' +
        '<div class="input-field"><label>Confirm Password</label><input type="password" id="authPass2" placeholder="Repeat your password" onkeydown="if(event.key===\'Enter\')window.App.doSignUp()"/></div>' +
        '<button class="btn btn-primary btn-block" onclick="window.App.doSignUp()"><i class="fas fa-user-plus"></i> Create Account</button>';
    }
  },

  async doSignIn(){
    const username = ($('#authUser').value || '').trim();
    const password = $('#authPass').value || '';
    if (!username || !password) return toast('Please fill in all fields', 'error');

    const u = getUserByName(username);
    if (!u) return toast('No account found with that username', 'error');
    if (!u.pwHash) return toast('This account has no password set. Please sign up again.', 'error');

    const hash = await Crypto.sha256(password, u.pwSalt || 'helaberry');
    if (hash !== u.pwHash) return toast('Incorrect password', 'error');

    ME = u;
    writeSession({ username: u.username, email: u.email, role: u.role, createdAt: u.createdAt });
    setTheme(currentTheme());
    applyUserUI();
    buildSidebar();
    closeModal();
    toast('Welcome back, ' + firstNameOf(u.username) + '!');
    renderPage(state.page);
  },

  async doSignUp(){
    const username = ($('#authUser').value || '').trim();
    const email = ($('#authEmail').value || '').trim();
    const role = $('#authRole').value;
    const pw = $('#authPass').value || '';
    const pw2 = $('#authPass2').value || '';

    if (username.length < 3) return toast('Username must be at least 3 characters', 'error');
    if (!/^[a-zA-Z0-9 _.\-]+$/.test(username)) return toast('Username can only contain letters, numbers, spaces, _ . -', 'error');
    if (getUserByName(username)) return toast('That username is already taken', 'error');
    if (email && !/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email)) return toast('Please enter a valid email', 'error');
    if (pw.length < 6) return toast('Password must be at least 6 characters', 'error');
    if (pw !== pw2) return toast('Passwords do not match', 'error');

    const salt = uid();
    const pwHash = await Crypto.sha256(pw, salt);

    const u = {
      id: uid(),
      username: username,
      email: email,
      role: role,
      bio: '',
      avatar: null, banner: null,
      pwHash: pwHash, pwSalt: salt,
      createdAt: now(),
      following: [], followers: []
    };
    DB.users.push(u);
    saveNow();

    ME = u;
    writeSession({ username: u.username, email: u.email, role: u.role, createdAt: u.createdAt });
    applyUserUI();
    buildSidebar();
    closeModal();
    toast('Account created — welcome, ' + firstNameOf(u.username) + '!');

    addNotification(u.id, 'welcome', '<strong>Welcome to HelaBerry!</strong> Add a profile photo to get started.', null);
    renderPage('profile');
  },

  logout(){
    openModal(
      '<div class="modal-header">' +
        '<h3><i class="fas fa-right-from-bracket" style="color:var(--danger);"></i> Sign Out</h3>' +
        '<button class="modal-close" onclick="window.App.closeModal()"><i class="fas fa-times"></i></button>' +
      '</div>' +
      '<p style="color:var(--text-secondary);font-size:.9rem;line-height:1.65;">Are you sure you want to sign out? Your data stays safely on this device.</p>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="window.App.closeModal()">Cancel</button>' +
        '<button class="btn btn-danger" onclick="window.App.confirmLogout()"><i class="fas fa-right-from-bracket"></i> Sign Out</button>' +
      '</div>'
    );
  },
  confirmLogout(){
    ME = null;
    writeSession(null);
    closeModal();
    applyUserUI();
    buildSidebar();
    toast('Signed out', 'info');
    renderPage('dashboard');
  },

  toggleTheme(){
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
    toast(next === 'dark' ? 'Dark theme enabled' : 'Light theme enabled', 'info');
    renderPage(state.page);
  },

  viewProfile(userId){
    const u = getUser(userId);
    if (!u) return toast('User not found', 'error');
    if (ME && u.id === ME.id) return App.navigate('profile');

    const isFollowing = ME && (ME.following||[]).indexOf(u.id) !== -1;
    const posts = DB.posts.filter(p => p.author === u.id).sort((a,b) => b.ts - a.ts);
    const stories = DB.stories.filter(s => s.author === u.id && s.expires > now());

    openModal(
      '<div class="modal-header">' +
        '<h3>' + esc(u.username) + '</h3>' +
        '<button class="modal-close" onclick="window.App.closeModal()"><i class="fas fa-times"></i></button>' +
      '</div>' +
      '<div style="text-align:center;">' +
        '<div class="message-avatar"' + (u.avatar ? ' style="width:90px;height:90px;font-size:2.2rem;margin:0 auto 14px;background-image:url(\'' + u.avatar + '\');background-size:cover;background-position:center;"' : ' style="width:90px;height:90px;font-size:2.2rem;margin:0 auto 14px;background:' + gradFor(u.username) + ';"') + '>' +
          (u.avatar ? '' : esc(initialOf(u.username))) + '</div>' +
        '<div style="font-weight:800;font-size:1.2rem;">' + esc(u.username) + '</div>' +
        '<div style="font-size:.8rem;color:var(--accent-light);font-weight:600;margin-top:3px;">' + esc(u.role || 'Creator') + '</div>' +
        (u.bio ? '<p style="font-size:.85rem;color:var(--text-secondary);line-height:1.6;margin-top:12px;">' + esc(u.bio) + '</p>' : '') +
        '<div style="display:flex;gap:16px;justify-content:center;margin:16px 0;font-size:.8rem;color:var(--text-muted);">' +
          '<span><strong style="color:var(--text-primary);">' + posts.length + '</strong> posts</span>' +
          '<span><strong style="color:var(--text-primary);">' + (u.followers||[]).length + '</strong> followers</span>' +
          '<span><strong style="color:var(--text-primary);">' + (u.following||[]).length + '</strong> following</span>' +
        '</div>' +
        (stories.length ? '<div style="font-size:.75rem;color:var(--success);margin-bottom:14px;"><i class="fas fa-circle"></i> ' + stories.length + ' active stor' + (stories.length === 1 ? 'y' : 'ies') + '</div>' : '') +
        '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">' +
          (ME ? '<button class="btn ' + (isFollowing ? 'btn-secondary' : 'btn-primary') + '" onclick="window.App.toggleFollow(\'' + u.id + '\');window.App.closeModal();">' +
            '<i class="fas ' + (isFollowing ? 'fa-user-check' : 'fa-user-plus') + '"></i> ' + (isFollowing ? 'Following' : 'Follow') + '</button>' : '') +
          (ME ? '<button class="btn btn-secondary" onclick="window.App.closeModal();window.App.openChat(\'' + u.id + '\');"><i class="fas fa-comment"></i> Message</button>' : '') +
        '</div>' +
      '</div>' +
      (posts.length ? '<div style="margin-top:22px;padding-top:18px;border-top:1px solid var(--border-color);"><h4 style="font-size:.9rem;font-weight:800;margin-bottom:12px;">Recent posts</h4>' +
        posts.slice(0,3).map(p =>
          '<div style="padding:12px;background:var(--bg-deep);border:1px solid var(--border-color);border-radius:12px;margin-bottom:10px;">' +
            (p.image ? '<img src="' + p.image + '" style="width:100%;border-radius:8px;margin-bottom:8px;max-height:150px;object-fit:cover;" alt=""/>' : '') +
            '<div style="font-size:.83rem;color:var(--text-secondary);line-height:1.55;">' + esc((p.text || '').slice(0,180)) + '</div>' +
            '<div style="font-size:.7rem;color:var(--text-muted);margin-top:6px;">' + p.likes.length + ' likes · ' + timeAgo(p.ts) + '</div>' +
          '</div>'
        ).join('') + '</div>' : '')
    );
  },

  editProfile(){
    if (!ME) return App.openAuth('signin');
    state.tempAvatar = undefined;
    state.tempBanner = undefined;

    openModal(
      '<div class="modal-header">' +
        '<h3><i class="fas fa-pen" style="color:var(--accent-light);"></i> Edit Profile</h3>' +
        '<button class="modal-close" onclick="window.App.closeModal()"><i class="fas fa-times"></i></button>' +
      '</div>' +
      '<div style="display:flex;gap:16px;align-items:center;margin-bottom:20px;">' +
        '<div id="editAvatarPreview">' + avatarHTML(ME, 80, '20px') + '</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px;">' +
          '<button class="btn btn-secondary btn-sm" onclick="window.App.uploadAvatar(true)"><i class="fas fa-camera"></i> Change photo</button>' +
          (ME.avatar ? '<button class="btn btn-danger btn-sm" onclick="window.App.removeAvatar()"><i class="fas fa-trash"></i> Remove</button>' : '') +
        '</div>' +
      '</div>' +
      '<div class="input-field"><label>Username</label><input type="text" id="editUsername" value="' + esc(ME.username) + '" maxlength="30"/></div>' +
      '<div class="input-field"><label>Email</label><input type="email" id="editEmail" value="' + esc(ME.email || '') + '" placeholder="you@example.com"/></div>' +
      '<div class="input-field"><label>Job Role</label><select id="editRole">' +
        ['Graphic Designer','UI/UX Designer','Painter','Student','Illustrator','Photographer','Motion Designer','3D Artist','Content Creator','Art Director','Other']
          .map(r => '<option value="' + r + '"' + (ME.role === r ? ' selected' : '') + '>' + r + '</option>').join('') +
      '</select></div>' +
      '<div class="input-field"><label>Bio</label><textarea id="editBio" maxlength="200" placeholder="Tell people about yourself…">' + esc(ME.bio || '') + '</textarea></div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="window.App.closeModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="window.App.saveProfile()"><i class="fas fa-check"></i> Save Changes</button>' +
      '</div>'
    );
  },

  async uploadAvatar(fromModal){
    const file = await pickFile('image/*');
    if (!file) return;
    try {
      const data = await readImage(file, 320);
      state.tempAvatar = data;
      if (fromModal){
        const prev = $('#editAvatarPreview');
        if (prev) prev.innerHTML = '<div style="width:80px;height:80px;border-radius:20px;background-image:url(\'' + data + '\');background-size:cover;background-position:center;"></div>';
        toast('Photo ready — press Save Changes');
      } else {
        ME.avatar = data;
        save();
        applyUserUI();
        renderPage(state.page);
        toast('Profile photo updated!');
      }
    } catch(e){ toast(e.message, 'error'); }
  },

  removeAvatar(){
    state.tempAvatar = null;
    const prev = $('#editAvatarPreview');
    if (prev) prev.innerHTML = avatarHTML({ username: ME.username, avatar:null }, 80, '20px');
    toast('Photo will be removed when you save', 'info');
  },

  async uploadBanner(){
    if (!ME) return App.openAuth('signin');
    const file = await pickFile('image/*');
    if (!file) return;
    try {
      const data = await readImage(file, 1200);
      ME.banner = data;
      save();
      renderPage('profile');
      toast('Banner updated!');
    } catch(e){ toast(e.message, 'error'); }
  },

  saveProfile(){
    if (!ME) return;
    const username = ($('#editUsername').value || '').trim();
    const email = ($('#editEmail').value || '').trim();
    const role = $('#editRole').value;
    const bio = ($('#editBio').value || '').trim();

    if (username.length < 3) return toast('Username must be at least 3 characters', 'error');
    const existing = getUserByName(username);
    if (existing && existing.id !== ME.id) return toast('That username is already taken', 'error');
    if (email && !/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email)) return toast('Please enter a valid email', 'error');

    const oldUsername = ME.username;
    ME.username = username;
    ME.email = email;
    ME.role = role;
    ME.bio = bio;
    if (state.tempAvatar !== undefined) ME.avatar = state.tempAvatar;

    saveNow();
    writeSession({ username: ME.username, email: ME.email, role: ME.role, createdAt: ME.createdAt });
    applyUserUI();
    closeModal();
    renderPage(state.page);
    toast('Profile updated' + (oldUsername !== username ? ' — you are now ' + username : '') + '!');
  },

  shareProfile(){
    if (!ME) return;
    const url = location.origin + location.pathname + '?u=' + encodeURIComponent(ME.username);
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(url)
        .then(() => toast('Profile link copied to clipboard!'))
        .catch(() => toast('Profile link: ' + url, 'info'));
    } else {
      toast('Profile link: ' + url, 'info');
    }
  },

  changePassword(){
    if (!ME) return App.openAuth('signin');
    if (!ME.pwHash) return toast('No password set for this account', 'error');
    openModal(
      '<div class="modal-header"><h3><i class="fas fa-shield-halved" style="color:var(--accent-light);"></i> Change Password</h3>' +
        '<button class="modal-close" onclick="window.App.closeModal()"><i class="fas fa-times"></i></button></div>' +
      '<div class="input-field"><label>Current password</label><input type="password" id="pwOld"/></div>' +
      '<div class="input-field"><label>New password</label><input type="password" id="pwNew" placeholder="At least 6 characters"/></div>' +
      '<div class="input-field"><label>Confirm new password</label><input type="password" id="pwNew2"/></div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="window.App.closeModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="window.App.savePassword()"><i class="fas fa-check"></i> Update Password</button>' +
      '</div>'
    );
  },
  async savePassword(){
    if (!ME) return;
    const oldPw = $('#pwOld').value;
    const n1 = $('#pwNew').value;
    const n2 = $('#pwNew2').value;
    if (n1.length < 6) return toast('New password must be at least 6 characters', 'error');
    if (n1 !== n2) return toast('New passwords do not match', 'error');
    const oldHash = await Crypto.sha256(oldPw, ME.pwSalt || 'helaberry');
    if (oldHash !== ME.pwHash) return toast('Current password is incorrect', 'error');
    const salt = uid();
    ME.pwSalt = salt;
    ME.pwHash = await Crypto.sha256(n1, salt);
    saveNow();
    closeModal();
    toast('Password updated successfully');
  },

  toggleFollow(userId){
    if (!ME) return App.openAuth('signin');
    const target = getUser(userId);
    if (!target) return toast('User not found', 'error');
    if (target.id === ME.id) return toast('You cannot follow yourself', 'warning');

    ME.following = ME.following || [];
    target.followers = target.followers || [];

    const idx = ME.following.indexOf(target.id);
    if (idx === -1){
      ME.following.push(target.id);
      target.followers.push(ME.id);
      addNotification(target.id, 'follow', '<strong>' + esc(ME.username) + '</strong> started following you', ME.id);
      toast('Now following ' + target.username);
    } else {
      ME.following.splice(idx, 1);
      target.followers = target.followers.filter(id => id !== ME.id);
      toast('Unfollowed ' + target.username, 'info');
    }
    save();
    renderPage(state.page);
  },

  friendsTab(btn, which){
    $$('.tabs .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const others = DB.users.filter(u => u.id !== ME.id);
    const list = which === 'following' ? others.filter(u => (ME.following||[]).indexOf(u.id) !== -1) : others;
    const grid = $('#friendsGrid');
    if (grid) grid.innerHTML = friendsCards(list);
  },

  openComposer(kind){
    if (!ME) return App.openAuth('signin');
    state.composerImage = null;
    state.composerKind = kind || 'post';
    openModal(
      '<div class="modal-header">' +
        '<h3><i class="fas fa-' + (state.composerKind === 'reel' ? 'film' : 'pen-to-square') + '" style="color:var(--accent-light);"></i> ' +
          (state.composerKind === 'reel' ? 'New Reel' : 'New Post') + '</h3>' +
        '<button class="modal-close" onclick="window.App.closeModal()"><i class="fas fa-times"></i></button>' +
      '</div>' +
      '<div class="input-field">' +
        '<label>' + (state.composerKind === 'reel' ? 'Caption' : 'What is on your mind?') + '</label>' +
        '<textarea id="composerText" maxlength="1000" placeholder="Share your thoughts…"></textarea>' +
      '</div>' +
      '<div id="composerPreview"></div>' +
      '<button class="btn btn-secondary btn-block" style="margin-top:12px;" onclick="window.App.composerAttach()">' +
        '<i class="fas fa-image"></i> Attach ' + (state.composerKind === 'reel' ? 'cover image' : 'photo') +
      '</button>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="window.App.closeModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="window.App.publishPost()"><i class="fas fa-paper-plane"></i> Publish</button>' +
      '</div>'
    );
  },

  async composerAttach(){
    const file = await pickFile('image/*');
    if (!file) return;
    try {
      const data = await readImage(file, 1000);
      state.composerImage = data;
      const prev = $('#composerPreview');
      if (prev) prev.innerHTML = '<img class="img-preview" src="' + data + '" alt="preview"/>' +
        '<button class="btn btn-danger btn-sm" style="margin-top:8px;" onclick="window.App.composerRemoveImage()"><i class="fas fa-trash"></i> Remove image</button>';
    } catch(e){ toast(e.message, 'error'); }
  },
  composerRemoveImage(){
    state.composerImage = null;
    const prev = $('#composerPreview');
    if (prev) prev.innerHTML = '';
  },

  publishPost(){
    if (!ME) return App.openAuth('signin');
    const text = ($('#composerText').value || '').trim();
    if (!text && !state.composerImage) return toast('Write something or attach an image', 'error');

    const post = {
      id: uid(),
      author: ME.id,
      kind: state.composerKind,
      text: text,
      image: state.composerImage,
      bg: state.composerImage ? null : gradFor(ME.username),
      ts: now(),
      likes: [], comments: [], views: 0
    };
    DB.posts.unshift(post);
    save();
    state.composerImage = null;
    closeModal();
    toast('Published!');
    renderPage(state.page === 'reels' ? 'reels' : state.page);

    scheduleEngagement(post.id);
  },

  quickPost(){
    if (!ME) return App.openAuth('signin');
    const ta = $('#quickComposer');
    const text = (ta.value || '').trim();
    if (!text) return toast('Write something first', 'error');
    DB.posts.unshift({
      id: uid(), author: ME.id, kind:'post', text: text, image:null,
      bg: gradFor(ME.username), ts: now(), likes: [], comments: [], views: 0
    });
    ta.value = '';
    save();
    toast('Posted!');
    renderPage(state.page);
    scheduleEngagement(DB.posts[0].id);
  },

  deletePost(postId){
    if (!ME) return;
    const p = DB.posts.find(x => x.id === postId);
    if (!p || p.author !== ME.id) return;
    openModal(
      '<div class="modal-header"><h3><i class="fas fa-trash" style="color:var(--danger);"></i> Delete post</h3>' +
        '<button class="modal-close" onclick="window.App.closeModal()"><i class="fas fa-times"></i></button></div>' +
      '<p style="color:var(--text-secondary);font-size:.9rem;line-height:1.65;">This will permanently remove the post, its likes and its comments.</p>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="window.App.closeModal()">Cancel</button>' +
        '<button class="btn btn-danger" onclick="window.App.confirmDeletePost(\'' + postId + '\')"><i class="fas fa-trash"></i> Delete</button>' +
      '</div>'
    );
  },
  confirmDeletePost(postId){
    DB.posts = DB.posts.filter(p => p.id !== postId);
    save();
    closeModal();
    toast('Post deleted', 'info');
    renderPage(state.page);
  },

  toggleLike(postId){
    if (!ME) return App.openAuth('signin');
    const p = DB.posts.find(x => x.id === postId);
    if (!p) return;
    const i = p.likes.indexOf(ME.id);
    if (i === -1){
      p.likes.push(ME.id);
      if (p.author !== ME.id){
        addNotification(p.author, 'like', '<strong>' + esc(ME.username) + '</strong> liked your post', ME.id);
      }
    } else {
      p.likes.splice(i, 1);
    }
    save();
    const card = $('#post-' + postId);
    if (card){
      const btn = card.querySelector('.action-btn');
      if (btn){
        btn.classList.toggle('liked', p.likes.indexOf(ME.id) !== -1);
        btn.innerHTML = '<i class="' + (p.likes.indexOf(ME.id) !== -1 ? 'fas' : 'far') + ' fa-heart"></i> ' + p.likes.length;
      }
    }
  },

  toggleComments(postId){
    const box = $('#comments-' + postId);
    if (!box) return;
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
  },

  addComment(e, postId){
    e.preventDefault();
    if (!ME) return App.openAuth('signin');
    const input = e.target.querySelector('input');
    const text = (input.value || '').trim();
    if (!text) return;
    const p = DB.posts.find(x => x.id === postId);
    if (!p) return;
    p.comments = p.comments || [];
    p.comments.push({ id: uid(), by: ME.id, text: text, ts: now() });
    if (p.author !== ME.id){
      addNotification(p.author, 'comment', '<strong>' + esc(ME.username) + '</strong> commented on your post', ME.id);
    }
    save();
    renderPage(state.page);
  },

  sharePost(postId){
    const p = DB.posts.find(x => x.id === postId);
    if (!p) return;
    const url = location.origin + location.pathname + '?post=' + postId;
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(url).then(() => toast('Post link copied!')).catch(() => toast('Link: ' + url, 'info'));
    } else {
      toast('Link: ' + url, 'info');
    }
  },

  viewReel(postId){
    const p = DB.posts.find(x => x.id === postId);
    if (!p) return;
    p.views = (p.views || 0) + 1;
    save();
    const a = getUser(p.author) || { username:'Unknown' };
    openModal(
      '<div class="modal-header"><h3>' + esc(a.username) + ' · Reel</h3>' +
        '<button class="modal-close" onclick="window.App.closeModal()"><i class="fas fa-times"></i></button></div>' +
      (p.image
        ? '<img src="' + p.image + '" style="width:100%;border-radius:14px;max-height:60vh;object-fit:contain;background:#000;" alt="reel"/>'
        : '<div style="height:280px;border-radius:14px;background:' + (p.bg || gradFor(a.username)) + ';display:flex;align-items:center;justify-content:center;font-size:4rem;color:rgba(255,255,255,.85);"><i class="fas fa-play-circle"></i></div>') +
      '<p style="font-size:.9rem;color:var(--text-secondary);line-height:1.65;margin-top:14px;white-space:pre-wrap;">' + esc(p.text || '') + '</p>' +
      '<div style="display:flex;gap:10px;align-items:center;margin-top:14px;">' +
        '<button class="btn ' + (p.likes.indexOf(ME ? ME.id : '') !== -1 ? 'btn-primary' : 'btn-secondary') + ' btn-sm" onclick="window.App.toggleLike(\'' + p.id + '\');window.App.closeModal();">' +
          '<i class="fas fa-heart"></i> ' + p.likes.length + '</button>' +
        '<span style="font-size:.75rem;color:var(--text-muted);"><i class="fas fa-eye"></i> ' + p.views + ' views · ' + timeAgo(p.ts) + '</span>' +
      '</div>'
    );
  },

  feedTab(btn, which){
    state.feedTab = which;
    renderPage('feed');
  },

  exploreTab(btn, which){
    state.exploreTab = which;
    renderPage('explore');
  },
  exploreSearch(val){
    state.exploreQuery = val;
    const active = document.activeElement;
    const selStart = active && active.selectionStart;
    renderPage('explore').then(() => {
      const inp = $('#exploreSearch');
      if (inp){ inp.focus(); try { inp.setSelectionRange(selStart, selStart); } catch(e){} }
    });
  },

  openChat(userId){
    if (!ME) return App.openAuth('signin');
    state.chatWith = userId;
    renderPage('messages').then(() => {
      const wrap = $('#chatWrap');
      if (wrap && window.innerWidth <= 900) wrap.classList.add('mobile-chat');
    });
  },
  chatSearch(val){
    state.chatSearch = val;
    const list = document.querySelector('.chat-list');
    if (!list) return;
    const items = list.querySelectorAll('.message-item');
    const q = val.toLowerCase();
    let any = false;
    items.forEach(it => {
      const name = (it.querySelector('.message-name') || {}).textContent || '';
      const show = name.toLowerCase().indexOf(q) !== -1;
      it.style.display = show ? '' : 'none';
      if (show) any = true;
    });
    return any;
  },

  newConversation(){
    if (!ME) return App.openAuth('signin');
    const others = DB.users.filter(u => u.id !== ME.id);
    openModal(
      '<div class="modal-header"><h3><i class="fas fa-plus" style="color:var(--accent-light);"></i> New Message</h3>' +
        '<button class="modal-close" onclick="window.App.closeModal()"><i class="fas fa-times"></i></button></div>' +
      '<div style="display:flex;flex-direction:column;gap:6px;max-height:50vh;overflow-y:auto;">' +
        others.map(u =>
          '<div class="message-item" onclick="window.App.closeModal();window.App.openChat(\'' + u.id + '\');">' +
            '<div class="message-avatar"' + (u.avatar ? ' style="background-image:url(\'' + u.avatar + '\');background-size:cover;background-position:center;"' : ' style="background:' + gradFor(u.username) + ';"') + '>' +
              (u.avatar ? '' : esc(initialOf(u.username))) + '</div>' +
            '<div class="message-body"><div class="message-name">' + esc(u.username) + '</div>' +
            '<div class="message-text">' + esc(u.role || 'Creator') + '</div></div>' +
          '</div>'
        ).join('') +
      '</div>'
    );
  },

  async sendMessage(e){
    if (e && e.preventDefault) e.preventDefault();
    if (!ME) return App.openAuth('signin');
    const other = getUser(state.chatWith);
    if (!other) return toast('No conversation selected', 'error');
    const ta = $('#chatInput');
    if (!ta) return;
    const text = (ta.value || '').trim();
    if (!text) return;
    ta.value = '';
    ta.style.height = '46px';

    const key = await Crypto.convKey(ME.id, other.id);
    const payload = await Crypto.encrypt(key, text);

    DB.messages.push({
      id: uid(), from: ME.id, to: other.id,
      alg: payload.alg, iv: payload.iv, ct: payload.ct,
      ts: now(), read: true
    });
    save();
    appendBubble(text, true, now());
    scheduleReply(other.id, text);
  },

  openStoryCreator(){
    if (!ME) return App.openAuth('signin');
    state.storyImage = null;
    state.storyKind = 'text';
    state.storyBg = gradFor(ME.username);
    const bgs = [
      'linear-gradient(135deg,#6C5CE7,#a29bfe)','linear-gradient(135deg,#ec4899,#f472b6)',
      'linear-gradient(135deg,#06b6d4,#22d3ee)','linear-gradient(135deg,#22c55e,#4ade80)',
      'linear-gradient(135deg,#f59e0b,#fbbf24)','linear-gradient(135deg,#ef4444,#f87171)',
      'linear-gradient(135deg,#0f172a,#334155)','linear-gradient(135deg,#8b5cf6,#e879f9)'
    ];
    openModal(
      '<div class="modal-header"><h3><i class="fas fa-book-open" style="color:var(--accent-light);"></i> Create Story</h3>' +
        '<button class="modal-close" onclick="window.App.closeModal()"><i class="fas fa-times"></i></button></div>' +
      '<div class="tabs">' +
        '<button class="tab active" id="storyTabText" onclick="window.App.storyKind(\'text\')">Text Card</button>' +
        '<button class="tab" id="storyTabImage" onclick="window.App.storyKind(\'image\')">Photo</button>' +
      '</div>' +
      '<div id="storyTextArea">' +
        '<div class="input-field"><label>Your message</label>' +
          '<textarea id="storyText" maxlength="180" placeholder="What is happening?" oninput="window.App.updateStoryPreview()"></textarea></div>' +
        '<label style="font-size:.76rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:8px;">Background</label>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">' +
          bgs.map(b => '<div onclick="window.App.setStoryBg(\'' + b + '\')" style="width:38px;height:38px;border-radius:12px;background:' + b + ';cursor:pointer;border:2px solid rgba(255,255,255,.2);"></div>').join('') +
        '</div>' +
        '<div id="storyPreview" style="height:180px;border-radius:16px;background:' + state.storyBg + ';display:flex;align-items:center;justify-content:center;padding:20px;color:#fff;font-weight:800;text-align:center;font-size:1rem;line-height:1.5;">Your story preview</div>' +
      '</div>' +
      '<div id="storyImageArea" style="display:none;">' +
        '<button class="btn btn-secondary btn-block" onclick="window.App.pickStoryImage()"><i class="fas fa-image"></i> Choose a photo</button>' +
        '<div id="storyImagePreview"></div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="window.App.closeModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="window.App.publishStory()"><i class="fas fa-paper-plane"></i> Share Story</button>' +
      '</div>'
    );
  },

  storyKind(kind){
    state.storyKind = kind;
    $('#storyTabText').classList.toggle('active', kind === 'text');
    $('#storyTabImage').classList.toggle('active', kind === 'image');
    $('#storyTextArea').style.display = kind === 'text' ? 'block' : 'none';
    $('#storyImageArea').style.display = kind === 'image' ? 'block' : 'none';
  },
  setStoryBg(bg){
    state.storyBg = bg;
    const prev = $('#storyPreview');
    if (prev) prev.style.background = bg;
  },
  updateStoryPreview(){
    const prev = $('#storyPreview');
    const txt = $('#storyText');
    if (prev) prev.textContent = (txt && txt.value.trim()) || 'Your story preview';
  },
  async pickStoryImage(){
    const file = await pickFile('image/*');
    if (!file) return;
    try {
      const data = await readImage(file, 1000);
      state.storyImage = data;
      const prev = $('#storyImagePreview');
      if (prev) prev.innerHTML = '<img class="img-preview" src="' + data + '" alt="story preview"/>';
    } catch(e){ toast(e.message, 'error'); }
  },
  publishStory(){
    if (!ME) return App.openAuth('signin');
    let story;
    if (state.storyKind === 'image'){
      if (!state.storyImage) return toast('Please choose a photo first', 'error');
      story = {
        id: uid(), author: ME.id, kind:'image', image: state.storyImage, text:'', bg: null,
        ts: now(), expires: now() + 86400000, views: []
      };
    } else {
      const text = ($('#storyText').value || '').trim();
      if (!text) return toast('Write something for your story', 'error');
      story = {
        id: uid(), author: ME.id, kind:'text', text: text, image: null, bg: state.storyBg,
        ts: now(), expires: now() + 86400000, views: []
      };
    }
    DB.stories.unshift(story);
    save();
    closeModal();
    toast('Story published — visible for 24 hours');
    renderPage('stories');
  },
  viewStory(userId){
    const list = DB.stories
      .filter(s => s.author === userId && s.expires > now())
      .sort((a,b) => a.ts - b.ts);
    if (!list.length) return toast('No active stories', 'info');
    openStoryViewer(list, 0);
  },
  storyNext(e){
    if (e) e.stopPropagation();
    const v = state.storyViewer;
    if (v.idx < v.list.length - 1){ v.idx++; renderStoryViewer(); }
    else closeStoryViewer();
  },
  storyPrev(e){
    if (e) e.stopPropagation();
    const v = state.storyViewer;
    if (v.idx > 0){ v.idx--; renderStoryViewer(); }
    else renderStoryViewer();
  },
  closeStory(){ closeStoryViewer(); },
  deleteStory(storyId, fromViewer){
    if (!ME) return;
    const s = DB.stories.find(x => x.id === storyId);
    if (!s || s.author !== ME.id) return;
    DB.stories = DB.stories.filter(x => x.id !== storyId);
    save();
    if (fromViewer) closeStoryViewer();
    toast('Story deleted', 'info');
    renderPage(state.page);
  },

  addToCart(listingId){
    if (!ME) return App.openAuth('signin');
    const l = DB.listings.find(x => x.id === listingId);
    if (!l) return;
    DB.carts[ME.id] = DB.carts[ME.id] || [];
    const i = DB.carts[ME.id].indexOf(listingId);
    if (i === -1){
      DB.carts[ME.id].push(listingId);
      toast('Added “' + l.title + '” to your cart');
    } else {
      DB.carts[ME.id].splice(i, 1);
      toast('Removed from cart', 'info');
    }
    save();
    renderPage(state.page);
  },

  openCart(){
    if (!ME) return App.openAuth('signin');
    const ids = DB.carts[ME.id] || [];
    const items = ids.map(id => DB.listings.find(l => l.id === id)).filter(Boolean);
    const total = items.reduce((a,l) => a + Number(l.price||0), 0);

    openModal(
      '<div class="modal-header"><h3><i class="fas fa-cart-shopping" style="color:var(--accent-light);"></i> Your Cart</h3>' +
        '<button class="modal-close" onclick="window.App.closeModal()"><i class="fas fa-times"></i></button></div>' +
      (items.length ? items.map(l =>
        '<div style="display:flex;gap:12px;align-items:center;padding:12px;background:var(--bg-deep);border:1px solid var(--border-color);border-radius:12px;margin-bottom:10px;">' +
          (l.image
            ? '<div style="width:56px;height:56px;border-radius:12px;background-image:url(\'' + l.image + '\');background-size:cover;background-position:center;flex-shrink:0;"></div>'
            : '<div style="width:56px;height:56px;border-radius:12px;background:' + (l.bg || gradFor(l.title)) + ';display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;"><i class="fas ' + (l.icon || 'fa-image') + '"></i></div>') +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-weight:700;font-size:.86rem;">' + esc(l.title) + '</div>' +
            '<div style="font-size:.75rem;color:var(--accent-light);font-weight:700;">' + money(l.price) + '</div>' +
          '</div>' +
          '<button class="icon-btn" onclick="window.App.removeFromCart(\'' + l.id + '\')"><i class="fas fa-trash"></i></button>' +
        '</div>'
      ).join('') + 
      '<div class="detail-row" style="border-top:1px solid var(--border-color);margin-top:8px;padding-top:14px;">' +
        '<span class="detail-label">Total</span><span class="detail-value" style="font-size:1.1rem;color:var(--accent-light);">' + money(total) + '</span>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="window.App.closeModal()">Keep Shopping</button>' +
        '<button class="btn btn-primary" onclick="window.App.checkout()"><i class="fas fa-credit-card"></i> Checkout</button>' +
      '</div>'
      : '<div class="empty-state"><div class="empty-icon"><i class="fas fa-cart-shopping"></i></div><h3>Your cart is empty</h3><p>Browse the marketplace to find digital assets.</p></div>')
    );
  },
  removeFromCart(listingId){
    if (!ME) return;
    DB.carts[ME.id] = (DB.carts[ME.id] || []).filter(id => id !== listingId);
    save();
    App.openCart();
    renderPage(state.page);
  },
  checkout(){
    if (!ME) return App.openAuth('signin');
    const ids = DB.carts[ME.id] || [];
    const items = ids.map(id => DB.listings.find(l => l.id === id)).filter(Boolean);
    if (!items.length) return toast('Your cart is empty', 'warning');

    const total = items.reduce((a,l) => a + Number(l.price||0), 0);
    const order = {
      id: uid(), buyer: ME.id,
      items: items.map(l => ({ id:l.id, title:l.title, price:l.price })),
      total: total, ts: now()
    };
    DB.orders.unshift(order);

    items.forEach(l => {
      if (l.seller !== ME.id){
        addNotification(l.seller, 'sale', '<strong>' + esc(ME.username) + '</strong> purchased “' + esc(l.title) + '”', ME.id);
      }
    });
    addNotification(ME.id, 'order', 'Your order of <strong>' + items.length + ' item' + (items.length>1?'s':'') + '</strong> is confirmed — ' + money(total), null);

    DB.carts[ME.id] = [];
    saveNow();
    closeModal();
    toast('Order placed! ' + money(total) + ' — check your notifications.');
    renderPage('marketplace');
  },

  openListingCreator(){
    if (!ME) return App.openAuth('signin');
    state.listingImage = null;
    openModal(
      '<div class="modal-header"><h3><i class="fas fa-tag" style="color:var(--accent-light);"></i> New Listing</h3>' +
        '<button class="modal-close" onclick="window.App.closeModal()"><i class="fas fa-times"></i></button></div>' +
      '<div class="input-field"><label>Title</label><input type="text" id="listTitle" maxlength="80" placeholder="e.g. Neon Gradient Pack"/></div>' +
      '<div class="input-field"><label>Description</label><textarea id="listDesc" maxlength="400" placeholder="What is included?"></textarea></div>' +
      '<div class="input-field"><label>Price (USD)</label><input type="number" id="listPrice" min="0.5" step="0.01" value="9.99"/></div>' +
      '<div class="input-field"><label>Category</label><select id="listCat">' +
        ['AI Art','Illustration','Palettes','Backgrounds','Brushes','3D','Photography','Templates','Other']
          .map(c => '<option>' + c + '</option>').join('') +
      '</select></div>' +
      '<button class="btn btn-secondary btn-block" onclick="window.App.pickListingImage()"><i class="fas fa-image"></i> Add cover image (optional)</button>' +
      '<div id="listImagePreview"></div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="window.App.closeModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="window.App.publishListing()"><i class="fas fa-check"></i> Publish Listing</button>' +
      '</div>'
    );
  },
  async pickListingImage(){
    const file = await pickFile('image/*');
    if (!file) return;
    try {
      const data = await readImage(file, 800);
      state.listingImage = data;
      const prev = $('#listImagePreview');
      if (prev) prev.innerHTML = '<img class="img-preview" src="' + data + '" alt="listing preview"/>';
    } catch(e){ toast(e.message, 'error'); }
  },
  publishListing(){
    if (!ME) return App.openAuth('signin');
    const title = ($('#listTitle').value || '').trim();
    const desc = ($('#listDesc').value || '').trim();
    const price = parseFloat($('#listPrice').value);
    const cat = $('#listCat').value;

    if (title.length < 3) return toast('Title must be at least 3 characters', 'error');
    if (!desc) return toast('Please add a description', 'error');
    if (!(price > 0)) return toast('Please enter a valid price', 'error');

    DB.listings.unshift({
      id: uid(), seller: ME.id, title: title, desc: desc, price: price,
      image: state.listingImage, bg: gradFor(title), icon:'fa-box-open', cat: cat, ts: now()
    });
    save();
    state.listingImage = null;
    closeModal();
    toast('Listing published!');
    renderPage('marketplace');
  },
  viewListing(listingId){
    const l = DB.listings.find(x => x.id === listingId);
    if (!l) return;
    const seller = getUser(l.seller) || { username:'Unknown' };
    openModal(
      '<div class="modal-header"><h3>' + esc(l.title) + '</h3>' +
        '<button class="modal-close" onclick="window.App.closeModal()"><i class="fas fa-times"></i></button></div>' +
      (l.image
        ? '<img src="' + l.image + '" style="width:100%;border-radius:14px;max-height:280px;object-fit:cover;" alt="listing"/>'
        : '<div style="height:200px;border-radius:14px;background:' + (l.bg || gradFor(l.title)) + ';display:flex;align-items:center;justify-content:center;font-size:3rem;color:rgba(255,255,255,.9);"><i class="fas ' + (l.icon || 'fa-image') + '"></i></div>') +
      '<div style="margin-top:16px;font-size:.88rem;color:var(--text-secondary);line-height:1.7;">' + esc(l.desc) + '</div>' +
      '<div class="detail-row" style="margin-top:14px;"><span class="detail-label"><i class="fas fa-user"></i> Seller</span><span class="detail-value">' + esc(seller.username) + '</span></div>' +
      '<div class="detail-row"><span class="detail-label"><i class="fas fa-tag"></i> Category</span><span class="detail-value">' + esc(l.cat || 'Other') + '</span></div>' +
      '<div class="detail-row"><span class="detail-label"><i class="fas fa-dollar-sign"></i> Price</span><span class="detail-value" style="color:var(--accent-light);font-size:1.1rem;">' + money(l.price) + '</span></div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="window.App.closeModal()">Close</button>' +
        '<button class="btn btn-primary" onclick="window.App.closeModal();window.App.addToCart(\'' + l.id + '\');"><i class="fas fa-cart-plus"></i> Add to Cart</button>' +
      '</div>'
    );
  },

  markAllRead(){
    if (!ME) return;
    myNotifications().forEach(n => n.read = true);
    save();
    updateNotifDot();
    buildSidebar();
    renderPage(state.page);
    toast('All notifications marked as read');
  },
  clearNotifications(){
    if (!ME) return;
    DB.notifications = DB.notifications.filter(n => n.for !== ME.id);
    save();
    updateNotifDot();
    buildSidebar();
    renderPage(state.page);
    toast('Notifications cleared', 'info');
  },

  exportData(){
    try {
      const blob = new Blob([JSON.stringify(DB, null, 2)], { type:'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'helaberry-backup-' + new Date().toISOString().slice(0,10) + '.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast('Backup downloaded');
    } catch(e){ toast('Export failed: ' + e.message, 'error'); }
  },
  async importData(){
    const file = await pickFile('application/json,.json');
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || !Array.isArray(data.users)) throw new Error('Not a valid HelaBerry backup');
      DB = Object.assign(emptyDB(), data);
      saveNow();
      ensureSessionUser();
      if (!ME && DB.users.length) {
        ME = DB.users[0];
        writeSession({ username: ME.username, email: ME.email, role: ME.role, createdAt: ME.createdAt });
      }
      applyUserUI();
      setTheme(currentTheme());
      buildSidebar();
      toast('Backup restored successfully');
      renderPage('dashboard');
    } catch(e){ toast('Import failed: ' + e.message, 'error'); }
  },
  clearChats(){
    if (!ME) return;
    openModal(
      '<div class="modal-header"><h3><i class="fas fa-broom" style="color:var(--danger);"></i> Clear Messages</h3>' +
        '<button class="modal-close" onclick="window.App.closeModal()"><i class="fas fa-times"></i></button></div>' +
      '<p style="color:var(--text-secondary);font-size:.9rem;line-height:1.65;">This deletes every message you have sent or received. This cannot be undone.</p>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="window.App.closeModal()">Cancel</button>' +
        '<button class="btn btn-danger" onclick="window.App.confirmClearChats()"><i class="fas fa-trash"></i> Delete All</button>' +
      '</div>'
    );
  },
  confirmClearChats(){
    if (!ME) return;
    DB.messages = DB.messages.filter(m => m.from !== ME.id && m.to !== ME.id);
    save();
    closeModal();
    toast('All messages deleted', 'info');
    renderPage('messages');
  },
  resetAll(){
    openModal(
      '<div class="modal-header"><h3><i class="fas fa-triangle-exclamation" style="color:var(--danger);"></i> Reset Application</h3>' +
        '<button class="modal-close" onclick="window.App.closeModal()"><i class="fas fa-times"></i></button></div>' +
      '<p style="color:var(--text-secondary);font-size:.9rem;line-height:1.65;">This erases <strong>everything</strong> — accounts, posts, messages, stories, listings and settings. Make a backup first with Settings → Export Data.</p>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="window.App.closeModal()">Cancel</button>' +
        '<button class="btn btn-danger" onclick="window.App.confirmReset()"><i class="fas fa-trash"></i> Erase Everything</button>' +
      '</div>'
    );
  },
  async confirmReset(){
    try {
      localStorage.removeItem(DB_KEY);
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem('helaberry_users');
      localStorage.removeItem('helaberry_theme');
    } catch(e){}
    closeModal();
    toast('Application reset. Reloading…', 'info');
    setTimeout(() => location.reload(), 900);
  },

  sendTicket(){
    if (!ME) return App.openAuth('signin');
    const subject = ($('#ticketSubject').value || '').trim();
    const body = ($('#ticketBody').value || '').trim();
    if (!subject || !body) return toast('Please fill in both fields', 'error');
    DB.tickets.unshift({ id: uid(), user: ME.id, subject: subject, body: body, ts: now() });
    addNotification(ME.id, 'support', 'Your support ticket “<strong>' + esc(subject) + '</strong>” was received. We reply within 24 hours.', null);
    save();
    $('#ticketSubject').value = '';
    $('#ticketBody').value = '';
    toast('Ticket sent — we will get back to you soon!');
  }
};
window.App = App;

/* ============================================================================
   19. ENGAGEMENT SIMULATION
   ============================================================================ */
function scheduleEngagement(postId){
  if (!ME) return;
  const meId = ME.id;
  const delay = 3500 + Math.random() * 6000;
  setTimeout(() => {
    const post = DB.posts.find(p => p.id === postId);
    if (!post) return;
    const others = DB.users.filter(u => u.id !== meId);
    if (!others.length) return;
    const who = pick(others);
    if (Math.random() > .35){
      if (post.likes.indexOf(who.id) === -1){
        post.likes.push(who.id);
        addNotification(meId, 'like', '<strong>' + esc(who.username) + '</strong> liked your post', who.id);
      }
    }
    if (Math.random() > .55){
      post.comments = post.comments || [];
      post.comments.push({
        id: uid(), by: who.id,
        text: pick(['This is gorgeous 😍','Love the colours here!','So clean — great work 👏','How did you make this?','Absolutely stunning.']),
        ts: now()
      });
      addNotification(meId, 'comment', '<strong>' + esc(who.username) + '</strong> commented on your post', who.id);
    }
    post.views = (post.views || 0) + 5 + Math.floor(Math.random() * 40);
    save();
    if (state.page === 'feed' || state.page === 'profile' || state.page === 'dashboard'){
      renderPage(state.page);
    }
  }, delay);
}

/* ============================================================================
   20. SIDEBAR / GLOBAL EVENTS
   ============================================================================ */
function closeSidebar(){
  $('#sidebar').classList.remove('open');
  $('#overlay').classList.remove('active');
}
function toggleSidebar(){
  $('#sidebar').classList.toggle('open');
  $('#overlay').classList.toggle('active');
}

$('#menuToggle').addEventListener('click', toggleSidebar);
$('#overlay').addEventListener('click', closeSidebar);
window.addEventListener('resize', () => { if (window.innerWidth > 820) closeSidebar(); });

$('#notifBtn').addEventListener('click', () => {
  App.navigate('notifications');
});

$('#themeBtn').addEventListener('click', () => App.toggleTheme());

$('#headerUser').addEventListener('click', () => {
  if (ME) App.navigate('profile');
  else App.openAuth('signin');
});
$('#userCard').addEventListener('click', () => {
  if (ME) App.navigate('profile');
  else App.openAuth('signin');
});

$('#globalSearch').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const val = (e.target.value || '').trim().toLowerCase();
  if (!val) return;

  const pageMatch = Object.keys(pageMeta).find(p => p.indexOf(val) !== -1);
  const userMatch = DB.users.find(u => u.username.toLowerCase().indexOf(val) !== -1);
  const listingMatch = DB.listings.find(l => l.title.toLowerCase().indexOf(val) !== -1);
  const postMatch = DB.posts.find(p => (p.text || '').toLowerCase().indexOf(val) !== -1);

  if (userMatch){
    App.viewProfile(userMatch.id);
    toast('Found user: ' + userMatch.username, 'info');
  } else if (listingMatch){
    App.navigate('marketplace');
    toast('Found listing: ' + listingMatch.title, 'info');
  } else if (pageMatch){
    App.navigate(pageMatch);
    toast('Opened ' + pageMatch, 'info');
  } else if (postMatch){
    App.navigate('explore');
    state.exploreQuery = val;
    renderPage('explore');
    toast('Showing posts matching “' + val + '”', 'info');
  } else {
    toast('No results for “' + val + '”', 'warning');
  }
  e.target.value = '';
});

document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA'){
    e.preventDefault();
    const s = $('#globalSearch');
    if (s) s.focus();
  }
});

/* ============================================================================
   21. INIT
   ============================================================================ */
(async function init(){
  await seed();
  ensureSessionUser();
  setTheme(currentTheme());
  applyUserUI();
  buildSidebar();

  await renderPage('dashboard');

  try {
    const params = new URLSearchParams(location.search);
    const u = params.get('u');
    if (u){
      const target = getUserByName(u);
      if (target) setTimeout(() => App.viewProfile(target.id), 500);
    }
  } catch(e){}

  setInterval(updateNotifDot, 5000);

  console.log('%c🍓 HelaBerry · Creative Platform', 'color:#a29bfe;font-weight:800;font-size:15px;');
  console.log(Crypto.hasSubtle
    ? '🔐 Encryption: AES-256-GCM (WebCrypto)'
    : '🔐 Encryption: fallback stream cipher (WebCrypto unavailable)');
  console.log(ME
    ? '✅ Signed in as: ' + ME.username + ' (' + (ME.role || 'Creator') + ')'
    : '👤 Guest mode — sign in to unlock everything');
})();

})();