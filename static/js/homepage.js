(function(){
'use strict';

/* ============================================================
   0. TOOL DATASET
   ============================================================ */
const TOOLS = [
  {name:'Palette Hunt',       file:'#paletteHunt',        icon:'fa-swatchbook',      grad:'linear-gradient(135deg,#7c6cf0,#a29bfe)', cat:'Color'},
  {name:'Hex Preview',        file:'#hexService',         icon:'fa-eye-dropper',     grad:'linear-gradient(135deg,#06b6d4,#22d3ee)', cat:'Color'},
  {name:'Prompt Palette',     file:'/prompt-palette',     icon:'fa-comment-dots',    grad:'linear-gradient(135deg,#8b5cf6,#c4b5fd)', cat:'Color'},
  {name:'Color Compass',      file:'/color-compass',      icon:'fa-book',            grad:'linear-gradient(135deg,#ec4899,#f472b6)', cat:'Color'},
  {name:'Full Breakdown',     file:'/full-breakdown',     icon:'fa-chart-simple',    grad:'linear-gradient(135deg,#f59e0b,#fbbf24)', cat:'Color'},
  {name:'Main Extractor',     file:'/main-extractor',     icon:'fa-chart-line',      grad:'linear-gradient(135deg,#3b82f6,#60a5fa)', cat:'Color'},
  {name:'HelaPlatte',         file:'/helaplatte',         icon:'fa-layer-group',     grad:'linear-gradient(135deg,#8b5cf6,#a78bfa)', cat:'Color'},
  {name:'Design Studio',      file:'/design-studio',      icon:'fa-window-maximize', grad:'linear-gradient(135deg,#7c6cf0,#a29bfe)', cat:'Design'},
  {name:'HelaUI',             file:'/helaui',             icon:'fa-mobile-screen',   grad:'linear-gradient(135deg,#6366f1,#a5b4fc)', cat:'Design'},
  {name:'Mandala Studio',     file:'/mandala',            icon:'fa-snowflake',       grad:'linear-gradient(135deg,#f59e0b,#fbbf24)', cat:'Design'},
  {name:'VectorForge',        file:'/vectorforge',        icon:'fa-bezier-curve',    grad:'linear-gradient(135deg,#06b6d4,#22d3ee)', cat:'Design'},
  {name:'Design Hub',         file:'/designhub',          icon:'fa-toolbox',         grad:'linear-gradient(135deg,#ec4899,#f472b6)', cat:'Design'},
  {name:'Image Studio',       file:'/image-studio',       icon:'fa-scissors',        grad:'linear-gradient(135deg,#06b6d4,#22d3ee)', cat:'Image'},
  {name:'LineLab',            file:'/linelab',            icon:'fa-pen-nib',         grad:'linear-gradient(135deg,#8b5cf6,#c4b5fd)', cat:'Image'},
  {name:'HelaCanvas',         file:'/helacanvas',         icon:'fa-image',           grad:'linear-gradient(135deg,#3b82f6,#60a5fa)', cat:'Image'},
  {name:'Live Painting',      file:'/paint',              icon:'fa-paintbrush',      grad:'linear-gradient(135deg,#ec4899,#f472b6)', cat:'Paint'},
  {name:'LinePro',            file:'/linepro',            icon:'fa-palette',         grad:'linear-gradient(135deg,#22c55e,#4ade80)', cat:'Paint'},
  {name:'HelaFill Pro',       file:'/helafill',           icon:'fa-fill-drip',       grad:'linear-gradient(135deg,#f59e0b,#fbbf24)', cat:'Paint'},
  {name:'Interior Studio',    file:'/interior',           icon:'fa-couch',           grad:'linear-gradient(135deg,#22c55e,#4ade80)', cat:'Creative'},
  {name:'Fashion Matcher',    file:'/fashion',            icon:'fa-tshirt',          grad:'linear-gradient(135deg,#ec4899,#f472b6)', cat:'Creative'},
  {name:'Sign Studio',        file:'/sign',               icon:'fa-sign-hanging',    grad:'linear-gradient(135deg,#7c6cf0,#a29bfe)', cat:'Creative'},
  {name:'Guess the Mix',      file:'/color-mix',          icon:'fa-flask',           grad:'linear-gradient(135deg,#f59e0b,#fbbf24)', cat:'Creative'},
  {name:'Dashboard',          file:'/dashboard',          icon:'fa-chart-line',      grad:'linear-gradient(135deg,#3b82f6,#60a5fa)', cat:'Platform'},
  {name:'HelaBerry Chat',     file:'/',                   icon:'fa-comments',        grad:'linear-gradient(135deg,#8b5cf6,#c4b5fd)', cat:'Platform'},
  {name:'Sign In / Up',       file:'/signinup',           icon:'fa-right-to-bracket',grad:'linear-gradient(135deg,#06b6d4,#22d3ee)', cat:'Platform'},
  {name:'Studio Guide',       file:'/guide',              icon:'fa-book-open',       grad:'linear-gradient(135deg,#fbbf24,#f59e0b)', cat:'Platform'}
];

/* ============================================================
   1. SESSION
   ============================================================ */
function readSession(){
  let raw=null;
  try{
    raw=localStorage.getItem('helaberry_session');
    if(!raw) raw=sessionStorage.getItem('helaberry_session');
  }catch(e){}
  if(!raw) return null;
  try{
    const d=JSON.parse(raw);
    if(!d||!d.username) return null;
    return d;
  }catch(e){return null;}
}
function readLastUser(){
  try{
    const raw=localStorage.getItem('helaberry_users');
    if(!raw) return null;
    const users=JSON.parse(raw);
    if(!Array.isArray(users)||users.length===0) return null;
    const sorted=users.slice().sort(function(a,b){return (b.createdAt||0)-(a.createdAt||0)});
    const u=sorted[0];
    if(!u||!u.username) return null;
    return {username:u.username,email:u.email,role:u.role};
  }catch(e){return null;}
}
const session=readSession();
const user=session||readLastUser()||null;

/* ============================================================
   2. HELPERS
   ============================================================ */
function escapeHtml(str){
  return String(str==null?'':str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function getInitial(name){
  if(!name) return 'H';
  return String(name).trim().charAt(0).toUpperCase()||'H';
}
function showToast(message,icon){
  let t=document.getElementById('hbToast');
  if(!t){
    t=document.createElement('div');
    t.id='hbToast';
    document.body.appendChild(t);
  }
  t.innerHTML='<i class="fas '+(icon||'fa-circle-check')+'"></i><span>'+message+'</span>';
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer=setTimeout(function(){t.classList.remove('show')},2200);
}

/* ============================================================
   3. THEME
   ============================================================ */
const THEME_KEY='helaberry_theme';
function applyTheme(mode){
  if(mode==='light') document.body.classList.add('light');
  else document.body.classList.remove('light');
  const icon=document.getElementById('themeIcon');
  if(icon) icon.className=mode==='light'?'fas fa-sun':'fas fa-moon';
  try{localStorage.setItem(THEME_KEY,mode)}catch(e){}
}
function currentTheme(){
  try{return localStorage.getItem(THEME_KEY)||'dark'}catch(e){return 'dark'}
}
applyTheme(currentTheme());

document.getElementById('themeBtn').addEventListener('click',function(){
  const next=currentTheme()==='light'?'dark':'light';
  applyTheme(next);
  showToast(next==='light'?'Light theme enabled':'Dark theme enabled',next==='light'?'fa-sun':'fa-moon');
});

/* ============================================================
   4. USER UI
   ============================================================ */
const ui={
  userCard:document.getElementById('userCard'),
  userAvatarSidebar:document.getElementById('userAvatarSidebar'),
  userNameSidebar:document.getElementById('userNameSidebar'),
  userRoleSidebar:document.getElementById('userRoleSidebar'),
  userStatusChip:document.getElementById('userStatusChip'),
  userStatusText:document.getElementById('userStatusText'),
  headerUser:document.getElementById('headerUser'),
  headerAvatar:document.getElementById('headerAvatar'),
  headerUserName:document.getElementById('headerUserName'),
  headerUserRole:document.getElementById('headerUserRole'),
  topbarTitle:document.getElementById('topbarTitle')
};

function applyUserUI(){
  if(user){
    const initial=getInitial(user.username);
    const roleText=user.role||'Creator';
    ui.userAvatarSidebar.textContent=initial;
    ui.userNameSidebar.textContent=user.username;
    ui.userRoleSidebar.innerHTML='<i class="fas fa-briefcase"></i> <span>'+escapeHtml(roleText)+'</span>';
    ui.userStatusChip.classList.remove('guest');
    ui.userStatusText.textContent='Online';
    ui.headerAvatar.textContent=initial;
    ui.headerUserName.textContent=user.username;
    ui.headerUserRole.textContent=roleText;
    ui.headerUser.title=user.username+' · '+roleText;
    ui.topbarTitle.innerHTML='HelaBerry <small>· <span style="background:linear-gradient(135deg,#fff,#a29bfe);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-weight:800;">'+escapeHtml(user.username)+'</span></small>';
  }else{
    ui.userCard.classList.add('guest');
    ui.userAvatarSidebar.innerHTML='<i class="fas fa-user"></i>';
    ui.userNameSidebar.textContent='Guest';
    ui.userRoleSidebar.innerHTML='<i class="fas fa-right-to-bracket"></i> <span>Sign in to continue</span>';
    ui.userStatusChip.style.display='none';
    ui.headerAvatar.textContent='?';
    ui.headerUserName.textContent='Guest';
    ui.headerUserRole.textContent='Not signed in';
    ui.headerUser.title='Click to sign in';
    ui.topbarTitle.innerHTML='HelaBerry <small>· Studio</small>';
  }
}
applyUserUI();

/* ============================================================
   5. SIDEBAR TOGGLE
   ============================================================ */
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('active');
}
function toggleSidebar(){
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('active');
}
document.getElementById('menuToggle').addEventListener('click',toggleSidebar);
document.getElementById('overlay').addEventListener('click',closeSidebar);
window.addEventListener('resize',function(){if(window.innerWidth>860) closeSidebar()});

/* ============================================================
   6. ACCOUNT HANDLERS
   ============================================================ */
ui.headerUser.addEventListener('click',function(){
  if(user){
    showToast('Signed in as '+user.username,'fa-user');
  }else{
    window.location.href='/signinup';
  }
});
ui.userCard.addEventListener('click',function(){
  if(!user) window.location.href='/signinup';
});

/* ============================================================
   7. HERO
   ============================================================ */
function renderWelcomeHero(){
  if(!user){
    return '<div class="welcome-hero">'+
      '<div class="hero-row">'+
        '<div class="hero-avatar" style="background:rgba(255,255,255,0.06);color:var(--text-secondary);box-shadow:none;">'+
          '<i class="fas fa-user"></i>'+
        '</div>'+
        '<div class="hero-text">'+
          '<div class="hero-greeting"><i class="fas fa-hand-sparkles"></i> Welcome to HelaBerry</div>'+
          '<div class="hero-username">Hello, Guest</div>'+
          '<p class="hero-subtitle">Sign in to unlock personalised tools, save your palettes, and showcase your creative work.</p>'+
          '<div class="hero-chips">'+
            '<span class="hero-chip"><i class="fas fa-lock"></i> Not signed in</span>'+
            '<span class="hero-chip"><i class="fas fa-star"></i> Free account</span>'+
          '</div>'+
        '</div>'+
        '<div class="hero-actions">'+
          '<a href="/signinup" class="hero-btn primary"><i class="fas fa-right-to-bracket"></i> Sign In</a>'+
          '<a href="/signinup?mode=signup" class="hero-btn"><i class="fas fa-user-plus"></i> Create Account</a>'+
        '</div>'+
      '</div>'+
    '</div>';
  }
  const initial=getInitial(user.username);
  const roleText=user.role||'Creator';
  const hour=new Date().getHours();
  let greeting='Welcome back';
  if(hour<12) greeting='Good morning';
  else if(hour<18) greeting='Good afternoon';
  else greeting='Good evening';

  return '<div class="welcome-hero">'+
    '<div class="hero-row">'+
      '<div class="hero-avatar">'+escapeHtml(initial)+'</div>'+
      '<div class="hero-text">'+
        '<div class="hero-greeting"><i class="fas fa-hand-sparkles"></i> '+greeting+'</div>'+
        '<div class="hero-username">'+escapeHtml(user.username)+'</div>'+
        '<p class="hero-subtitle">Your creative studio is ready. Hunt palettes, extract colors, or explore tools built for creators like you.</p>'+
        '<div class="hero-chips">'+
          '<span class="hero-chip"><i class="fas fa-briefcase"></i> '+escapeHtml(roleText)+'</span>'+
          '<span class="hero-chip green"><i class="fas fa-circle-check"></i> Signed in</span>'+
          (user.email?'<span class="hero-chip"><i class="fas fa-envelope"></i> '+escapeHtml(user.email)+'</span>':'')+
        '</div>'+
      '</div>'+
      '<div class="hero-actions">'+
        '<a href="/design-studio" class="hero-btn primary"><i class="fas fa-wand-magic-sparkles"></i> Open Studio</a>'+
        '<a href="/guide" class="hero-btn"><i class="fas fa-book-open"></i> Studio Guide</a>'+
      '</div>'+
    '</div>'+
  '</div>';
}

/* ============================================================
   8. STATS GRID
   ============================================================ */
function renderStats(){
  const statUsername=user?escapeHtml(user.username):'Guest';
  const statLabel=user?'Signed in as':'Not signed in';

  return '<div class="grid-stats">'+
    '<div class="stat-card">'+
      '<div class="stat-icon" style="background:linear-gradient(135deg,#7c6cf0,#a29bfe);"><i class="fas fa-toolbox"></i></div>'+
      '<div class="stat-value">26</div>'+
      '<div class="stat-label">Creative Tools</div>'+
    '</div>'+
    '<div class="stat-card">'+
      '<div class="stat-icon" style="background:linear-gradient(135deg,#06b6d4,#22d3ee);"><i class="fas fa-brain"></i></div>'+
      '<div class="stat-value">AI</div>'+
      '<div class="stat-label">Color Science</div>'+
    '</div>'+
    '<div class="stat-card">'+
      '<div class="stat-icon" style="background:linear-gradient(135deg,#22c55e,#4ade80);"><i class="fas fa-infinity"></i></div>'+
      '<div class="stat-value">∞</div>'+
      '<div class="stat-label">Palette Combos</div>'+
    '</div>'+
    '<div class="stat-card">'+
      '<div class="stat-icon" style="background:linear-gradient(135deg,#ec4899,#f472b6);"><i class="fas fa-user-circle"></i></div>'+
      '<div class="stat-value username-stat">'+statUsername+'</div>'+
      '<div class="stat-label">'+statLabel+'</div>'+
    '</div>'+
  '</div>';
}

/* ============================================================
   9. PALETTE HUNT
   ============================================================ */
function renderPaletteHunt(){
  return '<section class="section-card palette-hunt" id="paletteHunt">'+
    '<div class="section-head">'+
      '<h2><i class="fas fa-swatchbook"></i> Palette Hunt <span class="badge-new">New</span></h2>'+
      '<div class="hint"><i class="fas fa-keyboard"></i> press <b>SPACE</b> to generate · click any color to copy</div>'+
    '</div>'+

    '<div class="ph-toolbar">'+
      '<div class="ph-tabs" id="phTabs">'+
        '<button class="ph-tab active" type="button" data-filter="trending"><i class="fas fa-fire"></i> Trending</button>'+
        '<button class="ph-tab" type="button" data-filter="popular"><i class="fas fa-star"></i> Popular</button>'+
        '<button class="ph-tab" type="button" data-filter="random"><i class="fas fa-shuffle"></i> Random</button>'+
        '<button class="ph-tab" type="button" data-filter="saved"><i class="fas fa-heart"></i> Saved <span class="ph-count" id="phSavedCount">0</span></button>'+
      '</div>'+
      '<button class="btn-primary-sm" id="phGenerateBtn" type="button"><i class="fas fa-wand-magic-sparkles"></i> Generate</button>'+
    '</div>'+

    '<div class="ph-grid" id="phGrid"></div>'+
    '<div id="phSentinel" style="height:1px"></div>'+
  '</section>';
}

/* ============================================================
   10. HEX PREVIEW
   ============================================================ */
function renderHexService(){
  return '<section class="section-card hex-service" id="hexService">'+
    '<div class="section-head">'+
      '<h2><i class="fas fa-eye-dropper"></i> Hex Preview</h2>'+
      '<div class="hint"><i class="fas fa-keyboard"></i> type any hex → live preview with full color conversions</div>'+
    '</div>'+

    '<div class="hex-body">'+

      '<div class="hex-input-panel">'+
        '<label class="field-label" for="hexPreviewInput">Enter hex color code</label>'+
        '<div class="hex-input-wrap" id="hexInputWrap">'+
          '<span class="hex-hash">#</span>'+
          '<input id="hexPreviewInput" type="text" value="6C5CE7" maxlength="7" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off" inputmode="text" placeholder="6C5CE7" aria-label="Hex color code">'+
          '<button class="hex-clear" id="hexClearBtn" type="button" title="Clear" aria-label="Clear"><i class="fas fa-xmark"></i></button>'+
        '</div>'+
        '<div class="hex-msg ok" id="hexMsg" aria-live="polite"><i class="fas fa-circle-check"></i> Valid hex code</div>'+

        '<div class="hex-btn-row">'+
          '<button class="btn-primary-sm" id="hexApplyBtn" type="button"><i class="fas fa-eye"></i> Preview</button>'+
          '<button class="btn-ghost-sm" id="hexRandomBtn" type="button"><i class="fas fa-shuffle"></i> Random</button>'+
          '<button class="btn-ghost-sm" id="hexCopyBtn" type="button"><i class="fas fa-copy"></i> Copy</button>'+
        '</div>'+

        '<div class="preset-label">Quick picks</div>'+
        '<div class="preset-row" id="presetRow"></div>'+

        '<div class="preset-label">Recent</div>'+
        '<div class="recent-row" id="recentRow"><span class="recent-empty">No recent colors yet</span></div>'+
      '</div>'+

      '<div class="hex-preview-panel">'+
        '<div class="color-box" id="colorBox">'+
          '<button class="color-box-copy" id="boxCopyBtn" type="button" title="Copy hex"><i class="fas fa-copy"></i></button>'+
          '<div class="color-box-inner">'+
            '<span class="color-box-label">Live preview</span>'+
            '<span class="color-box-hex" id="colorBoxHex">#6C5CE7</span>'+
            '<span class="color-box-sub" id="colorBoxSub">rgb(108, 92, 231)</span>'+
            '<span class="color-box-name" id="colorBoxName">Iris</span>'+
          '</div>'+
        '</div>'+

        '<div class="info-grid">'+
          '<div class="info-cell">'+
            '<span class="info-key">HEX</span>'+
            '<span class="info-val" id="infoHex">#6C5CE7</span>'+
            '<button class="info-copy" data-copy="infoHex" title="Copy"><i class="fas fa-copy"></i></button>'+
          '</div>'+
          '<div class="info-cell">'+
            '<span class="info-key">RGB</span>'+
            '<span class="info-val" id="infoRgb">108, 92, 231</span>'+
            '<button class="info-copy" data-copy="infoRgb" title="Copy"><i class="fas fa-copy"></i></button>'+
          '</div>'+
          '<div class="info-cell">'+
            '<span class="info-key">HSL</span>'+
            '<span class="info-val" id="infoHsl">248°, 74%, 63%</span>'+
            '<button class="info-copy" data-copy="infoHsl" title="Copy"><i class="fas fa-copy"></i></button>'+
          '</div>'+
          '<div class="info-cell">'+
            '<span class="info-key">HSV</span>'+
            '<span class="info-val" id="infoHsv">248°, 60%, 91%</span>'+
            '<button class="info-copy" data-copy="infoHsv" title="Copy"><i class="fas fa-copy"></i></button>'+
          '</div>'+
          '<div class="info-cell">'+
            '<span class="info-key">CMYK</span>'+
            '<span class="info-val" id="infoCmyk">53, 60, 0, 9</span>'+
            '<button class="info-copy" data-copy="infoCmyk" title="Copy"><i class="fas fa-copy"></i></button>'+
          '</div>'+
          '<div class="info-cell">'+
            '<span class="info-key">Luminance</span>'+
            '<span class="info-val" id="infoLum">0.16</span>'+
            '<button class="info-copy" data-copy="infoLum" title="Copy"><i class="fas fa-copy"></i></button>'+
          '</div>'+
        '</div>'+

        '<div class="contrast-row">'+
          '<span class="contrast-pill"><i class="fas fa-sun"></i> White text <b id="cWhiteVal">--</b></span>'+
          '<span class="contrast-pill"><i class="fas fa-moon"></i> Black text <b id="cBlackVal">--</b></span>'+
          '<span class="contrast-pill best"><i class="fas fa-check-circle"></i> Best <b id="bestTextVal">--</b></span>'+
        '</div>'+
      '</div>'+

    '</div>'+

    '<div class="preset-label" style="padding:0 2rem;margin-bottom:10px;">Harmony colors</div>'+
    '<div class="harmony-row" id="harmonyRow"></div>'+

    '<div class="tint-wrap">'+
      '<div class="preset-label" style="margin-top:2px;">Tints &amp; shades</div>'+
      '<div class="tint-strip" id="tintStrip"></div>'+
    '</div>'+
  '</section>';
}

/* ============================================================
   11. COLOR WHEEL STUDIO
   ============================================================ */
function renderColorWheel(){
  return '<section class="section-card">'+
    '<div class="section-head">'+
      '<h2><i class="fas fa-fill-drip"></i> Hela Studio · Live Color Forge</h2>'+
      '<div class="hint"><i class="fas fa-hand-pointer"></i> click / drag the wheel → live harmonies</div>'+
    '</div>'+
    '<div class="studio-grid">'+
      '<div class="wheel-panel">'+
        '<canvas id="colorWheel" width="400" height="400"></canvas>'+
        '<div class="color-meta">'+
          '<div class="swatch-big" id="activeSwatch" style="background:#6C5CE7"></div>'+
          '<div class="color-codes"><span id="hexValue">#6C5CE7</span><br><span id="rgbValue">rgb(108,92,231)</span></div>'+
        '</div>'+
        '<div class="color-actions">'+
          '<input type="text" id="hexInput" value="#6C5CE7" maxlength="7">'+
          '<button class="btn-sm" id="applyHexBtn"><i class="fas fa-check"></i> Apply</button>'+
          '<button class="btn-sm" id="randomColorBtn"><i class="fas fa-shuffle"></i> Random</button>'+
        '</div>'+
        '<div style="margin-top:12px;font-size:.72rem;opacity:.8;"><i class="fas fa-mouse-pointer"></i> drag to pick a color</div>'+
      '</div>'+
      '<div class="palette-tester">'+
        '<div class="harmony-title"><i class="fas fa-chart-pie"></i> Intelligent Harmonies</div>'+
        '<div class="palette-grid" id="paletteContainer"></div>'+
        '<div style="font-size:.72rem;color:var(--text-muted);line-height:1.6;">'+
          '<i class="fas fa-info-circle"></i> Click any swatch to apply it to the wheel. '+
          'Harmonies include complementary, triadic, analogous, and split-complementary relationships.'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</section>';
}

/* ============================================================
   12. TOOL LAUNCHER
   ============================================================ */
function renderToolLauncher(){
  const cards=TOOLS.map(function(t){
    return '<a class="tool-tile" href="'+encodeURI(t.file)+'">'+
      '<div class="tool-tile-icon" style="background:'+t.grad+';">'+
        '<i class="fas '+t.icon+'"></i>'+
      '</div>'+
      '<div class="tool-tile-info">'+
        '<div class="tool-tile-name">'+escapeHtml(t.name)+'</div>'+
        '<div class="tool-tile-meta">'+escapeHtml(t.cat)+'</div>'+
      '</div>'+
      '<i class="fas fa-arrow-right tool-tile-arrow"></i>'+
    '</a>';
  }).join('');

  return '<section class="section-card">'+
    '<div class="section-head">'+
      '<h2><i class="fas fa-toolbox"></i> All Tools</h2>'+
      '<div class="hint"><i class="fas fa-arrow-right"></i> click any tile to launch</div>'+
    '</div>'+
    '<div class="tool-grid">'+cards+'</div>'+
  '</section>';
}

/* ============================================================
   13. HOME RENDER
   ============================================================ */
function renderHome(){
  return renderWelcomeHero()+
    renderStats()+
    renderPaletteHunt()+
    renderHexService()+
    renderColorWheel()+
    renderToolLauncher()+
    '<div class="footer">'+
      '<span><i class="fas fa-copyright"></i> 2025 · HelaBerry Creative Studio</span>'+
      '<span>Built with <i class="fas fa-heart" style="color:var(--accent-light);"></i> for creators · '+
        '<a href="/guide">Studio Guide</a> · '+
        '<a href="/designhub">Design Hub</a></span>'+
    '</div>';
}

/* ============================================================
   14. PALETTE HUNT ENGINE
   ============================================================ */
function initPaletteHunt(){
  const gridEl=document.getElementById('phGrid');
  if(!gridEl) return;

  const tabsEl=document.getElementById('phTabs');
  const savedCountEl=document.getElementById('phSavedCount');
  const genBtn=document.getElementById('phGenerateBtn');
  const sentinel=document.getElementById('phSentinel');

  const SAVE_KEY='helaberry_saved_palettes_v1';

  function ri(min,max){return Math.floor(Math.random()*(max-min+1))+min}
  function rf(min,max){return Math.random()*(max-min)+min}
  function cl(v,a,b){return Math.min(b,Math.max(a,v))}
  function shuffleArr(a){
    for(let i=a.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      const t=a[i];a[i]=a[j];a[j]=t;
    }
    return a;
  }
  function hslHex(h,s,l){
    s/=100;l/=100;
    const k=function(n){return (n+h/30)%12};
    const a=s*Math.min(l,1-l);
    const f=function(n){return l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)))};
    const t=function(x){return Math.round(255*x).toString(16).padStart(2,'0')};
    return ('#'+t(f(0))+t(f(8))+t(f(4))).toUpperCase();
  }
  function lum(hex){
    const r=parseInt(hex.slice(1,3),16)/255;
    const g=parseInt(hex.slice(3,5),16)/255;
    const b=parseInt(hex.slice(5,7),16)/255;
    return 0.2126*r+0.7152*g+0.0722*b;
  }
  function fmt(n){
    if(n>=1000000) return (n/1000000).toFixed(1).replace('.0','')+'m';
    if(n>=1000) return (n/1000).toFixed(1).replace('.0','')+'k';
    return String(n);
  }
  function copy(text,label){
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){
        showToast('Copied '+(label||text),'fa-copy');
      }).catch(function(){
        showToast('Copy failed','fa-triangle-exclamation');
      });
    }else{
      const ta=document.createElement('textarea');
      ta.value=text;
      ta.style.position='fixed';
      ta.style.opacity='0';
      document.body.appendChild(ta);
      ta.select();
      try{document.execCommand('copy');showToast('Copied '+(label||text),'fa-copy');}
      catch(e){showToast('Copy failed','fa-triangle-exclamation');}
      document.body.removeChild(ta);
    }
  }

  let uid=0;
  let palettes=[];
  let display=[];
  let saved=[];
  let filter='trending';
  let loadingMore=false;

  const HB_HUES=[248,265,160,187,340,210,225];

  const SCHEMES=[
    [0, 30,-30, 60],
    [0, 20, 40, 60],
    [0,180, 20,200],
    [0,120,240, 60],
    [0,150,210, 30],
    [0, 90,180,270],
    [0,  0,  0,  0],
    [0,200, 40,240]
  ];

  function makePalette(){
    const offsets=SCHEMES[ri(0,SCHEMES.length-1)];
    let baseHue;
    if(Math.random()<0.38){
      baseHue=HB_HUES[ri(0,HB_HUES.length-1)]+rf(-14,14);
    }else{
      baseHue=Math.random()*360;
    }
    const baseSat=rf(42,86);
    const startL=rf(18,36);
    const step=rf(12,19);

    const colors=offsets.map(function(off,i){
      const h=((baseHue+off)%360+360)%360;
      const s=cl(baseSat+rf(-15,15),24,95);
      const l=cl(startL+i*step+rf(-7,7),12,90);
      return hslHex(h,s,l);
    });
    if(Math.random()<0.35) colors.reverse();
    return {id:'hp'+(++uid),colors:colors,likes:ri(24,3200)};
  }

  function addPalettes(n){
    const created=[];
    for(let i=0;i<n;i++) created.push(makePalette());
    palettes=created.concat(palettes);
    return created;
  }

  function loadSaved(){
    try{
      const raw=localStorage.getItem(SAVE_KEY);
      const arr=raw?JSON.parse(raw):[];
      saved=Array.isArray(arr)?arr.filter(function(p){return p&&Array.isArray(p.colors)}):[];
    }catch(e){saved=[];}
  }
  function persistSaved(){
    try{localStorage.setItem(SAVE_KEY,JSON.stringify(saved))}catch(e){}
  }
  function isSavedId(id){
    return saved.some(function(p){return p.id===id});
  }

  function createCard(p){
    const card=document.createElement('article');
    card.className='ph-card';
    card.dataset.id=p.id;
    card.dataset.colors=p.colors.join(',');
    card.dataset.likes=p.likes;

    const colorsHTML=p.colors.map(function(hex){
      const tc=lum(hex)>0.62?'#0b1119':'#ffffff';
      return '<button class="ph-color" type="button" data-hex="'+hex+'" style="background:'+hex+';" aria-label="Copy '+hex+'">'+
               '<span class="ph-hex" style="color:'+tc+'">'+hex+'</span>'+
             '</button>';
    }).join('');

    const s=isSavedId(p.id);

    card.innerHTML=
      '<div class="ph-colors">'+colorsHTML+'</div>'+
      '<div class="ph-footer">'+
        '<button class="ph-btn ph-save'+(s?' is-saved':'')+'" type="button" aria-pressed="'+s+'" title="'+(s?'Remove from saved':'Save palette')+'">'+
          '<i class="'+(s?'fas':'far')+' fa-heart"></i>'+
          '<span class="ph-likes">'+fmt(p.likes+(s?1:0))+'</span>'+
        '</button>'+
        '<button class="ph-btn ph-copy" type="button" title="Copy all colors">'+
          '<i class="fas fa-copy"></i> Copy all'+
        '</button>'+
      '</div>';

    return card;
  }

  function render(){
    gridEl.innerHTML='';
    if(display.length===0){
      gridEl.innerHTML=
        '<div class="ph-empty">'+
          '<i class="fas fa-heart"></i>'+
          '<h3>No saved palettes yet</h3>'+
          '<p>Tap the heart on any palette to build your collection.</p>'+
        '</div>';
      return;
    }
    const frag=document.createDocumentFragment();
    display.forEach(function(p){frag.appendChild(createCard(p))});
    gridEl.appendChild(frag);
  }

  function appendCards(list){
    const frag=document.createDocumentFragment();
    list.forEach(function(p){frag.appendChild(createCard(p))});
    gridEl.appendChild(frag);
  }

  function updateSavedBadge(){
    const n=saved.length;
    savedCountEl.textContent=String(n);
    savedCountEl.classList.toggle('show',n>0);
  }

  function applyFilter(){
    let list;
    if(filter==='saved'){
      list=saved.slice();
    }else{
      list=palettes.slice();
      if(filter==='popular'){
        list.sort(function(a,b){return b.likes-a.likes});
      }else if(filter==='random'){
        shuffleArr(list);
      }
    }
    display=list;
  }

  function setFilter(f){
    filter=f;
    Array.prototype.forEach.call(tabsEl.children,function(t){
      t.classList.toggle('active',t.dataset.filter===f);
    });
    applyFilter();
    render();
  }

  function regenerate(){
    palettes=[];
    addPalettes(18);
    if(filter==='saved'){
      setFilter('trending');
    }else{
      applyFilter();
      render();
    }
    showToast('Fresh palettes generated','fa-wand-magic-sparkles');
  }

  function loadMore(){
    if(loadingMore||filter==='saved') return;
    loadingMore=true;
    const created=addPalettes(9);
    if(filter==='popular'){
      applyFilter();
      render();
    }else{
      display=display.concat(created);
      appendCards(created);
    }
    setTimeout(function(){loadingMore=false},180);
  }

  function toggleSave(card,btn){
    const id=card.dataset.id;
    const colors=card.dataset.colors.split(',');
    const likes=Number(card.dataset.likes)||0;
    const idx=saved.findIndex(function(p){return p.id===id});

    if(idx>=0){
      saved.splice(idx,1);
      showToast('Removed from saved','fa-heart-crack');
    }else{
      saved.unshift({id:id,colors:colors,likes:likes});
      showToast('Saved to your collection','fa-heart');
    }
    persistSaved();
    updateSavedBadge();

    const nowSaved=idx<0;
    btn.classList.toggle('is-saved',nowSaved);
    btn.setAttribute('aria-pressed',String(nowSaved));
    btn.title=nowSaved?'Remove from saved':'Save palette';
    const icon=btn.querySelector('i');
    if(icon) icon.className=(nowSaved?'fas':'far')+' fa-heart';
    const likeEl=btn.querySelector('.ph-likes');
    if(likeEl) likeEl.textContent=fmt(likes+(nowSaved?1:0));

    btn.classList.remove('pop');
    void btn.offsetWidth;
    btn.classList.add('pop');

    if(filter==='saved'){
      applyFilter();
      render();
    }
  }

  gridEl.addEventListener('click',function(e){
    const colorBtn=e.target.closest('.ph-color');
    if(colorBtn){
      copy(colorBtn.dataset.hex,colorBtn.dataset.hex);
      return;
    }
    const saveBtn=e.target.closest('.ph-save');
    if(saveBtn){
      const card=saveBtn.closest('.ph-card');
      if(card) toggleSave(card,saveBtn);
      return;
    }
    const copyBtn=e.target.closest('.ph-copy');
    if(copyBtn){
      const card=copyBtn.closest('.ph-card');
      if(!card) return;
      const arr=card.dataset.colors.split(',');
      copy(arr.join(', '),arr.length+' colors');
    }
  });

  tabsEl.addEventListener('click',function(e){
    const tab=e.target.closest('.ph-tab');
    if(tab) setFilter(tab.dataset.filter);
  });

  genBtn.addEventListener('click',regenerate);

  document.addEventListener('keydown',function(e){
    const el=e.target;
    const tag=(el&&el.tagName)?el.tagName.toUpperCase():'';
    if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT') return;
    if(el&&el.isContentEditable) return;
    if(e.code==='Space'||e.key===' '){
      const cmdOpen=document.getElementById('cmdBackdrop').classList.contains('open');
      if(cmdOpen) return;
      e.preventDefault();
      regenerate();
    }
  });

  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(function(entries){
      if(entries[0].isIntersecting) loadMore();
    },{rootMargin:'600px 0px'});
    io.observe(sentinel);
  }

  loadSaved();
  updateSavedBadge();
  addPalettes(18);
  applyFilter();
  render();
}

/* ============================================================
   15. COLOR WHEEL
   ============================================================ */
function initColorWheel(){
  const canvas=document.getElementById('colorWheel');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  let wheelImageData=null;

  function hslToRgb(h,s,l){
    let r,g,b;
    if(s===0){r=g=b=l;}
    else{
      const hue2rgb=function(p,q,t){
        if(t<0) t+=1;
        if(t>1) t-=1;
        if(t<1/6) return p+(q-p)*6*t;
        if(t<1/2) return q;
        if(t<2/3) return p+(q-p)*(2/3-t)*6;
        return p;
      };
      const q=l<.5?l*(1+s):l+s-l*s;
      const p=2*l-q;
      r=hue2rgb(p,q,h+1/3);
      g=hue2rgb(p,q,h);
      b=hue2rgb(p,q,h-1/3);
    }
    return [Math.round(r*255),Math.round(g*255),Math.round(b*255)];
  }

  function rgbToHsl(r,g,b){
    r/=255;g/=255;b/=255;
    const max=Math.max(r,g,b),min=Math.min(r,g,b);
    let h,s,l=(max+min)/2;
    if(max===min){h=s=0;}
    else{
      const d=max-min;
      s=l>.5?d/(2-max-min):d/(max+min);
      switch(max){
        case r:h=(g-b)/d+(g<b?6:0);break;
        case g:h=(b-r)/d+2;break;
        default:h=(r-g)/d+4;
      }
      h/=6;
    }
    return [h,s,l];
  }

  function hslToHex(h,s,l){
    const rgb=hslToRgb(h,s,l);
    return '#'+((1<<24)+(rgb[0]<<16)+(rgb[1]<<8)+rgb[2]).toString(16).slice(1).toUpperCase();
  }

  function drawWheel(){
    const size=400;
    canvas.width=size;canvas.height=size;
    const center=size/2;
    const radius=size/2-3;
    for(let y=0;y<size;y++){
      for(let x=0;x<size;x++){
        const dx=x-center,dy=y-center;
        const dist=Math.hypot(dx,dy);
        if(dist<=radius){
          const angle=Math.atan2(dy,dx)+Math.PI;
          const hue=angle*180/Math.PI;
          const sat=Math.min(1,dist/radius);
          const rgb=hslToRgb(hue/360,sat,.5);
          ctx.fillStyle='rgb('+rgb[0]+','+rgb[1]+','+rgb[2]+')';
        }else{
          ctx.fillStyle='rgba(0,0,0,0)';
        }
        ctx.fillRect(x,y,1,1);
      }
    }
    wheelImageData=ctx.getImageData(0,0,size,size);
    ctx.beginPath();
    ctx.arc(center,center,radius+2,0,2*Math.PI);
    ctx.strokeStyle='rgba(108,92,231,.6)';
    ctx.lineWidth=2;
    ctx.stroke();
  }

  function getColorFromWheel(clientX,clientY){
    const rect=canvas.getBoundingClientRect();
    const scaleX=canvas.width/rect.width;
    const scaleY=canvas.height/rect.height;
    const cx=(clientX-rect.left)*scaleX;
    const cy=(clientY-rect.top)*scaleY;
    if(cx<0||cy<0||cx>=canvas.width||cy>=canvas.height) return null;
    const idx=(Math.floor(cy)*canvas.width+Math.floor(cx))*4;
    if(wheelImageData&&idx<wheelImageData.data.length){
      const r=wheelImageData.data[idx];
      const g=wheelImageData.data[idx+1];
      const b=wheelImageData.data[idx+2];
      if(r===0&&g===0&&b===0&&wheelImageData.data[idx+3]===0) return null;
      return {r:r,g:g,b:b};
    }
    return null;
  }

  function updateUIFromRGB(r,g,b){
    const hex='#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1).toUpperCase();
    const hexEl=document.getElementById('hexValue');
    const rgbEl=document.getElementById('rgbValue');
    const swEl=document.getElementById('activeSwatch');
    const inEl=document.getElementById('hexInput');
    if(hexEl) hexEl.innerText=hex;
    if(rgbEl) rgbEl.innerText='rgb('+r+','+g+','+b+')';
    if(swEl) swEl.style.backgroundColor=hex;
    if(inEl) inEl.value=hex;
    generateHarmonyPalette(hex);
  }

  function updateFromHex(hex){
    if(!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
    const r=parseInt(hex.slice(1,3),16);
    const g=parseInt(hex.slice(3,5),16);
    const b=parseInt(hex.slice(5,7),16);
    updateUIFromRGB(r,g,b);
  }

  function randomColor(){
    const rnd='#'+Math.floor(Math.random()*16777215).toString(16).padStart(6,'0');
    updateFromHex(rnd);
  }

  function generateHarmonyPalette(hex){
    const r=parseInt(hex.slice(1,3),16);
    const g=parseInt(hex.slice(3,5),16);
    const b=parseInt(hex.slice(5,7),16);
    const hsl=rgbToHsl(r,g,b);
    let h=hsl[0]*360,s=hsl[1]*100,l=hsl[2]*100;
    const harmonies=[
      hslToHex(((h+180)%360)/360,s/100,l/100),
      hslToHex(((h+30)%360)/360,s/100,l/100),
      hslToHex(((h-30+360)%360)/360,s/100,l/100),
      hslToHex(((h+120)%360)/360,s/100,l/100),
      hslToHex(((h+240)%360)/360,s/100,l/100),
      hslToHex(((h+150)%360)/360,s/100,l/100),
      hslToHex(((h-150+360)%360)/360,s/100,l/100)
    ];
    const unique=Array.from(new Set(harmonies)).slice(0,7);
    const container=document.getElementById('paletteContainer');
    if(!container) return;
    container.innerHTML='';
    unique.forEach(function(col){
      const sw=document.createElement('div');
      sw.className='palette-swatch';
      sw.style.backgroundColor=col;
      sw.title=col;
      sw.addEventListener('click',function(){
        updateFromHex(col);
        showToast('Applied '+col,'fa-palette');
      });
      container.appendChild(sw);
    });
  }

  let isDragging=false;
  function handlePick(e){
    const color=getColorFromWheel(e.clientX,e.clientY);
    if(color) updateUIFromRGB(color.r,color.g,color.b);
  }

  canvas.addEventListener('mousedown',function(e){isDragging=true;handlePick(e)});
  window.addEventListener('mousemove',function(e){if(isDragging) handlePick(e)});
  window.addEventListener('mouseup',function(){isDragging=false});
  canvas.addEventListener('touchstart',function(e){
    if(e.touches.length){isDragging=true;handlePick(e.touches[0]);e.preventDefault();}
  },{passive:false});
  canvas.addEventListener('touchmove',function(e){
    if(isDragging&&e.touches.length){handlePick(e.touches[0]);e.preventDefault();}
  },{passive:false});
  canvas.addEventListener('touchend',function(){isDragging=false});

  const applyBtn=document.getElementById('applyHexBtn');
  if(applyBtn) applyBtn.addEventListener('click',function(){
    let val=document.getElementById('hexInput').value.trim();
    if(!val.startsWith('#')) val='#'+val;
    if(/^#[0-9A-Fa-f]{6}$/i.test(val)){
      updateFromHex(val);
      showToast('Applied '+val.toUpperCase(),'fa-check');
    }else{
      showToast('Enter valid hex (#RRGGBB)','fa-triangle-exclamation');
    }
  });
  const randBtn=document.getElementById('randomColorBtn');
  if(randBtn) randBtn.addEventListener('click',randomColor);

  drawWheel();
  updateFromHex('#6C5CE7');
}

/* ============================================================
   16. HEX PREVIEW ENGINE
   ============================================================ */
function initHexPreview(){
  const input=document.getElementById('hexPreviewInput');
  const wrap=document.getElementById('hexInputWrap');
  const msg=document.getElementById('hexMsg');
  const box=document.getElementById('colorBox');
  const boxHex=document.getElementById('colorBoxHex');
  const boxSub=document.getElementById('colorBoxSub');
  const boxName=document.getElementById('colorBoxName');
  if(!input||!box) return;

  const elHex=document.getElementById('infoHex');
  const elRgb=document.getElementById('infoRgb');
  const elHsl=document.getElementById('infoHsl');
  const elHsv=document.getElementById('infoHsv');
  const elCmyk=document.getElementById('infoCmyk');
  const elLum=document.getElementById('infoLum');
  const elCWhite=document.getElementById('cWhiteVal');
  const elCBlack=document.getElementById('cBlackVal');
  const elBest=document.getElementById('bestTextVal');

  const presetRow=document.getElementById('presetRow');
  const recentRow=document.getElementById('recentRow');
  const tintStrip=document.getElementById('tintStrip');
  const harmonyRow=document.getElementById('harmonyRow');

  const PRESETS=[
    '#6C5CE7','#00D2D3','#FF6B6B','#FECA57',
    '#48DBFB','#1DD1A1','#EE5A6F','#341F97',
    '#FF9FF3','#FFFFFF','#94A3B8','#111827'
  ];
  const RECENT_KEY='helaberry_recent_colors';
  const MAX_RECENT=12;

  const NAMED_COLORS=[
    {name:'Black',hex:'#000000'},{name:'White',hex:'#FFFFFF'},
    {name:'Red',hex:'#FF0000'},{name:'Lime',hex:'#00FF00'},
    {name:'Blue',hex:'#0000FF'},{name:'Yellow',hex:'#FFFF00'},
    {name:'Cyan',hex:'#00FFFF'},{name:'Magenta',hex:'#FF00FF'},
    {name:'Orange',hex:'#FFA500'},{name:'Purple',hex:'#800080'},
    {name:'Pink',hex:'#FFC0CB'},{name:'Brown',hex:'#A52A2A'},
    {name:'Gray',hex:'#808080'},{name:'Navy',hex:'#000080'},
    {name:'Teal',hex:'#008080'},{name:'Olive',hex:'#808000'},
    {name:'Maroon',hex:'#800000'},{name:'Aqua',hex:'#00FFFF'},
    {name:'Silver',hex:'#C0C0C0'},{name:'Gold',hex:'#FFD700'},
    {name:'Coral',hex:'#FF7F50'},{name:'Salmon',hex:'#FA8072'},
    {name:'Crimson',hex:'#DC143C'},{name:'Indigo',hex:'#4B0082'},
    {name:'Violet',hex:'#EE82EE'},{name:'Turquoise',hex:'#40E0D0'},
    {name:'Lavender',hex:'#E6E6FA'},{name:'Beige',hex:'#F5F5DC'},
    {name:'Ivory',hex:'#FFFFF0'},{name:'Khaki',hex:'#F0E68C'},
    {name:'Iris',hex:'#6C5CE7'},{name:'Slate',hex:'#708090'},
    {name:'Charcoal',hex:'#36454F'},{name:'Mint',hex:'#98FF98'},
    {name:'Emerald',hex:'#50C878'},{name:'Ruby',hex:'#E0115F'},
    {name:'Sapphire',hex:'#0F52BA'},{name:'Amber',hex:'#FFBF00'},
    {name:'Peach',hex:'#FFE5B4'},{name:'Rose',hex:'#FF007F'}
  ];

  let current='#6C5CE7';

  function hexToRgb(hex){
    const h=hex.replace('#','');
    return {
      r:parseInt(h.slice(0,2),16),
      g:parseInt(h.slice(2,4),16),
      b:parseInt(h.slice(4,6),16)
    };
  }
  function toHex(r,g,b){
    return '#'+[r,g,b].map(function(v){
      const c=Math.max(0,Math.min(255,Math.round(v)));
      return c.toString(16).padStart(2,'0');
    }).join('').toUpperCase();
  }
  function rgbToHsl(r,g,b){
    r/=255;g/=255;b/=255;
    const max=Math.max(r,g,b),min=Math.min(r,g,b);
    let h=0,s=0,l=(max+min)/2;
    if(max!==min){
      const d=max-min;
      s=l>.5?d/(2-max-min):d/(max+min);
      switch(max){
        case r:h=(g-b)/d+(g<b?6:0);break;
        case g:h=(b-r)/d+2;break;
        default:h=(r-g)/d+4;
      }
      h/=6;
    }
    return {h:Math.round(h*360),s:Math.round(s*100),l:Math.round(l*100)};
  }
  function rgbToHsv(r,g,b){
    r/=255;g/=255;b/=255;
    const max=Math.max(r,g,b),min=Math.min(r,g,b);
    const d=max-min;
    let h=0;
    if(d!==0){
      switch(max){
        case r:h=((g-b)/d)%6;break;
        case g:h=(b-r)/d+2;break;
        default:h=(r-g)/d+4;
      }
      h*=60;
      if(h<0) h+=360;
    }
    const s=max===0?0:d/max;
    return {h:Math.round(h),s:Math.round(s*100),v:Math.round(max*100)};
  }
  function rgbToCmyk(r,g,b){
    const rr=r/255,gg=g/255,bb=b/255;
    const k=1-Math.max(rr,gg,bb);
    if(k>=1) return {c:0,m:0,y:0,k:100};
    return {
      c:Math.round((1-rr-k)/(1-k)*100),
      m:Math.round((1-gg-k)/(1-k)*100),
      y:Math.round((1-bb-k)/(1-k)*100),
      k:Math.round(k*100)
    };
  }
  function relLuminance(r,g,b){
    const a=[r,g,b].map(function(v){
      v/=255;
      return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);
    });
    return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];
  }
  function contrastRatio(l1,l2){
    const hi=Math.max(l1,l2),lo=Math.min(l1,l2);
    return (hi+0.05)/(lo+0.05);
  }
  function mixRgb(base,target,amount){
    return toHex(
      base.r+(target.r-base.r)*amount,
      base.g+(target.g-base.g)*amount,
      base.b+(target.b-base.b)*amount
    );
  }

  function findColorName(hex){
    const target=hexToRgb(hex);
    let best=NAMED_COLORS[0];
    let bestDist=Infinity;
    NAMED_COLORS.forEach(function(c){
      const r=hexToRgb(c.hex);
      const dist=Math.pow(target.r-r.r,2)+Math.pow(target.g-r.g,2)+Math.pow(target.b-r.b,2);
      if(dist<bestDist){bestDist=dist;best=c;}
    });
    if(bestDist>20000) return 'Custom';
    return best.name;
  }

  function setMsg(text,type){
    msg.className='hex-msg'+(type?' '+type:'');
    let icon='fa-circle-info';
    if(type==='ok') icon='fa-circle-check';
    else if(type==='warn') icon='fa-triangle-exclamation';
    else if(type==='err') icon='fa-circle-exclamation';
    msg.innerHTML='<i class="fas '+icon+'"></i> '+text;
  }

  function renderTints(hex){
    if(!tintStrip) return;
    const base=hexToRgb(hex);
    const white={r:255,g:255,b:255};
    const black={r:0,g:0,b:0};
    const steps=[];
    [0.85,0.7,0.5,0.3,0.15].forEach(function(a){steps.push(mixRgb(base,white,a))});
    steps.push(hex);
    [0.15,0.3,0.5,0.7,0.85].forEach(function(a){steps.push(mixRgb(base,black,a))});

    tintStrip.innerHTML=steps.map(function(c){
      const r=hexToRgb(c);
      const light=relLuminance(r.r,r.g,r.b)>0.45;
      const labelColor=light?'#0b1119':'#ffffff';
      return '<div class="tint-item" data-color="'+c+'" style="background:'+c+';" title="'+c+'">'+
             '<span style="color:'+labelColor+';">'+c.replace('#','')+'</span></div>';
    }).join('');
  }

  function hslToRgb(h,s,l){
    let r,g,b;
    if(s===0){r=g=b=l;}
    else{
      const hue2rgb=function(p,q,t){
        if(t<0) t+=1;
        if(t>1) t-=1;
        if(t<1/6) return p+(q-p)*6*t;
        if(t<1/2) return q;
        if(t<2/3) return p+(q-p)*(2/3-t)*6;
        return p;
      };
      const q=l<.5?l*(1+s):l+s-l*s;
      const p=2*l-q;
      r=hue2rgb(p,q,h+1/3);
      g=hue2rgb(p,q,h);
      b=hue2rgb(p,q,h-1/3);
    }
    return [Math.round(r*255),Math.round(g*255),Math.round(b*255)];
  }
  function hslToHex(h,s,l){
    const rgb=hslToRgb(h,s,l);
    return toHex(rgb[0],rgb[1],rgb[2]);
  }

  function renderHarmony(hex){
    if(!harmonyRow) return;
    const rgb=hexToRgb(hex);
    const hsl=rgbToHsl(rgb.r,rgb.g,rgb.b);
    const h=hsl.h,s=hsl.s,l=hsl.l;
    function hx(hh){
      return hslToHex(((hh%360)+360)%360,s/100,l/100);
    }
    const items=[
      {label:'Base',color:hex},
      {label:'Complement',color:hx(h+180)},
      {label:'Triadic 1',color:hx(h+120)},
      {label:'Triadic 2',color:hx(h-120)},
      {label:'Analogous −',color:hx(h-30)},
      {label:'Analogous +',color:hx(h+30)}
    ];
    harmonyRow.innerHTML=items.map(function(it){
      const r=hexToRgb(it.color);
      const light=relLuminance(r.r,r.g,r.b)>0.45;
      const labelColor=light?'#0b1119':'#ffffff';
      return '<div class="harmony-item" data-color="'+it.color+'" style="background:'+it.color+';" title="'+it.label+' · '+it.color+'">'+
             '<span style="color:'+labelColor+';">'+it.label+'</span></div>';
    }).join('');
  }

  function loadRecent(){
    try{
      const raw=localStorage.getItem(RECENT_KEY);
      const arr=raw?JSON.parse(raw):[];
      return Array.isArray(arr)?arr:[];
    }catch(e){return [];}
  }
  function saveRecent(list){
    try{localStorage.setItem(RECENT_KEY,JSON.stringify(list))}catch(e){}
  }
  function renderRecent(){
    if(!recentRow) return;
    const list=loadRecent();
    if(!list.length){
      recentRow.innerHTML='<span class="recent-empty">No recent colors yet</span>';
      return;
    }
    recentRow.innerHTML=list.map(function(c){
      return '<button class="recent-chip" type="button" data-color="'+c+'" style="background:'+c+';" title="'+c+'"></button>';
    }).join('');
  }
  function pushRecent(hex){
    let list=loadRecent().filter(function(c){return c!==hex});
    list.unshift(hex);
    list=list.slice(0,MAX_RECENT);
    saveRecent(list);
    renderRecent();
  }

  function renderPresets(){
    if(!presetRow) return;
    presetRow.innerHTML=PRESETS.map(function(c){
      return '<button class="preset-swatch" type="button" data-color="'+c+'" style="background:'+c+';" title="'+c+'"></button>';
    }).join('');
  }
  function markActivePreset(hex){
    if(!presetRow) return;
    presetRow.querySelectorAll('.preset-swatch').forEach(function(b){
      b.classList.toggle('is-active',b.dataset.color===hex);
    });
  }

  function render(hex){
    const rgb=hexToRgb(hex);
    const hsl=rgbToHsl(rgb.r,rgb.g,rgb.b);
    const hsv=rgbToHsv(rgb.r,rgb.g,rgb.b);
    const cmyk=rgbToCmyk(rgb.r,rgb.g,rgb.b);
    const lum=relLuminance(rgb.r,rgb.g,rgb.b);

    const cWhite=contrastRatio(lum,1);
    const cBlack=contrastRatio(lum,0);
    const useDark=cBlack>=cWhite;
    const textColor=useDark?'#0b1119':'#ffffff';

    current=hex;

    box.style.backgroundColor=hex;
    box.style.color=textColor;
    boxHex.textContent=hex;
    if(boxSub) boxSub.textContent='rgb('+rgb.r+', '+rgb.g+', '+rgb.b+')';
    if(boxName) boxName.textContent=findColorName(hex);

    if(elHex) elHex.textContent=hex;
    if(elRgb) elRgb.textContent=rgb.r+', '+rgb.g+', '+rgb.b;
    if(elHsl) elHsl.textContent=hsl.h+'°, '+hsl.s+'%, '+hsl.l+'%';
    if(elHsv) elHsv.textContent=hsv.h+'°, '+hsv.s+'%, '+hsv.v+'%';
    if(elCmyk) elCmyk.textContent=cmyk.c+', '+cmyk.m+', '+cmyk.y+', '+cmyk.k;
    if(elLum) elLum.textContent=lum.toFixed(3);

    if(elCWhite) elCWhite.textContent=cWhite.toFixed(2)+':1';
    if(elCBlack) elCBlack.textContent=cBlack.toFixed(2)+':1';
    if(elBest) elBest.textContent=useDark?'Black text':'White text';

    renderTints(hex);
    renderHarmony(hex);
    markActivePreset(hex);
  }

  function loadColor(hex,toastMsg){
    render(hex);
    input.value=hex.replace('#','').toUpperCase();
    pushRecent(hex);
    setMsg('Valid hex code · '+hex,'ok');
    wrap.classList.remove('invalid');
    wrap.classList.add('valid');
    if(toastMsg) showToast('Loaded '+hex,'fa-palette');
  }

  function processInput(commit){
    const raw=input.value;
    const cleaned=raw.replace(/[^0-9a-fA-F]/g,'');
    const len=cleaned.length;

    if(len===6){
      const hex='#'+cleaned.toUpperCase();
      wrap.classList.add('valid');
      wrap.classList.remove('invalid');
      setMsg('Valid hex code · '+hex,'ok');
      render(hex);
      if(commit) pushRecent(hex);
      return true;
    }
    if(len===3){
      const expanded=cleaned.toUpperCase().split('').map(function(c){return c+c}).join('');
      wrap.classList.remove('valid','invalid');
      setMsg('Shorthand · press Enter for #'+expanded,'warn');
      return false;
    }
    if(len===0){
      wrap.classList.remove('valid','invalid');
      setMsg('Type a 6-digit hex code (0-9, A-F)','');
    }else{
      wrap.classList.add('invalid');
      wrap.classList.remove('valid');
      setMsg('Keep typing… '+len+'/6 characters','warn');
    }
    return false;
  }

  input.addEventListener('input',function(){
    const raw=input.value;
    const cleaned=raw.replace(/[^0-9a-fA-F]/g,'').slice(0,6);
    if(raw!==cleaned){
      const cursor=input.selectionStart;
      let removedBefore=0;
      let ri=0,ci=0;
      while(ri<cursor&&ci<cleaned.length){
        if(raw[ri]===cleaned[ci]){ri++;ci++;}
        else{removedBefore++;ri++;}
      }
      while(ri<cursor){removedBefore++;ri++;}
      input.value=cleaned;
      const newCursor=Math.max(0,Math.min(cleaned.length,cursor-removedBefore));
      try{input.setSelectionRange(newCursor,newCursor)}catch(e){}
    }
    processInput(false);
  });

  input.addEventListener('keydown',function(e){
    if(e.key==='Enter'){
      e.preventDefault();
      const cleaned=input.value.replace(/[^0-9a-fA-F]/g,'');
      if(cleaned.length===3){
        const expanded=cleaned.toUpperCase().split('').map(function(c){return c+c}).join('');
        loadColor('#'+expanded,true);
      }else if(cleaned.length===6){
        const hex='#'+cleaned.toUpperCase();
        pushRecent(hex);
        showToast('Previewing '+hex,'fa-eye-dropper');
      }else{
        setMsg('Invalid hex — need 3 or 6 hex characters','err');
        wrap.classList.add('invalid');
        wrap.classList.remove('valid');
        showToast('Invalid hex code','fa-triangle-exclamation');
      }
    }
  });

  input.addEventListener('blur',function(){
    const cleaned=input.value.replace(/[^0-9a-fA-F]/g,'');
    if(cleaned.length===3){
      const expanded=cleaned.toUpperCase().split('').map(function(c){return c+c}).join('');
      loadColor('#'+expanded);
    }else if(cleaned.length===6){
      pushRecent('#'+cleaned.toUpperCase());
    }
  });

  wrap.addEventListener('click',function(e){
    if(e.target===wrap||e.target.classList.contains('hex-hash')){
      input.focus();
    }
  });

  const clearBtn=document.getElementById('hexClearBtn');
  if(clearBtn) clearBtn.addEventListener('click',function(e){
    e.stopPropagation();
    input.value='';
    input.focus();
    wrap.classList.remove('valid','invalid');
    setMsg('Type a 6-digit hex code (0-9, A-F)','');
  });

  const applyBtn=document.getElementById('hexApplyBtn');
  if(applyBtn) applyBtn.addEventListener('click',function(){
    const cleaned=input.value.replace(/[^0-9a-fA-F]/g,'');
    if(cleaned.length===6){
      const hex='#'+cleaned.toUpperCase();
      render(hex);
      pushRecent(hex);
      showToast('Previewing '+hex,'fa-eye-dropper');
    }else if(cleaned.length===3){
      const expanded=cleaned.toUpperCase().split('').map(function(c){return c+c}).join('');
      loadColor('#'+expanded,true);
    }else{
      setMsg('Invalid hex — use 3 or 6 hex characters','err');
      wrap.classList.add('invalid');
      wrap.classList.remove('valid');
      showToast('Invalid hex code','fa-triangle-exclamation');
    }
  });

  const randomBtn=document.getElementById('hexRandomBtn');
  if(randomBtn) randomBtn.addEventListener('click',function(){
    const rnd='#'+Math.floor(Math.random()*16777215).toString(16).padStart(6,'0').toUpperCase();
    loadColor(rnd,false);
    showToast('Random color '+rnd,'fa-shuffle');
  });

  function copyText(text,label){
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){
        showToast('Copied '+(label||text),'fa-copy');
      }).catch(function(){
        showToast('Copy failed — '+text,'fa-triangle-exclamation');
      });
    }else{
      const ta=document.createElement('textarea');
      ta.value=text;
      ta.style.position='fixed';
      ta.style.opacity='0';
      document.body.appendChild(ta);
      ta.select();
      try{document.execCommand('copy');showToast('Copied '+(label||text),'fa-copy');}
      catch(e){showToast('Copy failed — '+text,'fa-triangle-exclamation');}
      document.body.removeChild(ta);
    }
  }

  const copyBtn=document.getElementById('hexCopyBtn');
  if(copyBtn) copyBtn.addEventListener('click',function(){copyText(current,current)});
  const boxCopyBtn=document.getElementById('boxCopyBtn');
  if(boxCopyBtn) boxCopyBtn.addEventListener('click',function(e){
    e.stopPropagation();
    copyText(current,current);
  });

  document.querySelectorAll('.info-copy').forEach(function(btn){
    btn.addEventListener('click',function(e){
      e.stopPropagation();
      const targetId=btn.dataset.copy;
      const el=document.getElementById(targetId);
      if(el) copyText(el.textContent,el.textContent);
    });
  });

  function handleSwatchClick(container,e){
    if(!container) return;
    const target=e.target.closest('[data-color]');
    if(!target) return;
    const hex=target.dataset.color;
    loadColor(hex,true);
  }

  if(presetRow) presetRow.addEventListener('click',function(e){handleSwatchClick(presetRow,e)});
  if(recentRow) recentRow.addEventListener('click',function(e){handleSwatchClick(recentRow,e)});
  if(tintStrip) tintStrip.addEventListener('click',function(e){handleSwatchClick(tintStrip,e)});
  if(harmonyRow) harmonyRow.addEventListener('click',function(e){handleSwatchClick(harmonyRow,e)});

  renderPresets();
  renderRecent();
  render('#6C5CE7');
  wrap.classList.add('valid');
  setMsg('Valid hex code · #6C5CE7','ok');
}

/* ============================================================
   17. COMMAND PALETTE
   ============================================================ */
function initCommandPalette(){
  const backdrop=document.getElementById('cmdBackdrop');
  const input=document.getElementById('cmdInput');
  const list=document.getElementById('cmdList');
  const searchBox=document.getElementById('searchBox');

  let activeIdx=0;
  let results=TOOLS.slice();

  function openCmd(){
    backdrop.classList.add('open');
    input.value='';
    input.focus();
    renderCmd('');
  }
  function closeCmd(){
    backdrop.classList.remove('open');
    input.value='';
  }

  function renderCmd(q){
    const query=(q||'').trim().toLowerCase();
    results=query
      ? TOOLS.filter(function(t){
          return t.name.toLowerCase().includes(query) ||
                 t.cat.toLowerCase().includes(query) ||
                 t.file.toLowerCase().includes(query);
        })
      : TOOLS.slice();

    if(results.length===0){
      list.innerHTML='<div class="cmd-empty"><i class="fas fa-magnifying-glass" style="display:block;font-size:1.6rem;opacity:.35;margin-bottom:10px;"></i>No tools found for "'+escapeHtml(query)+'"</div>';
      return;
    }

    activeIdx=Math.min(activeIdx, results.length-1);
    list.innerHTML=results.map(function(t,i){
      return '<div class="cmd-item'+(i===activeIdx?' active':'')+'" data-idx="'+i+'">'+
        '<div class="cmd-item-icon" style="background:'+t.grad+';">'+
          '<i class="fas '+t.icon+'"></i>'+
        '</div>'+
        '<div class="cmd-item-body">'+
          '<div class="cmd-item-name">'+escapeHtml(t.name)+'</div>'+
          '<div class="cmd-item-meta">'+escapeHtml(t.cat)+'</div>'+
        '</div>'+
        '<span class="cmd-item-kbd">↵</span>'+
      '</div>';
    }).join('');
  }

  function launch(idx){
    const tool=results[idx];
    if(!tool) return;
    closeCmd();
    if(tool.file.startsWith('#')){
      const el=document.querySelector(tool.file);
      if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    }else{
      window.location.href=tool.file;
    }
  }

  searchBox.addEventListener('click',openCmd);
  searchBox.addEventListener('keydown',function(e){
    if(e.key==='Enter'){e.preventDefault();openCmd();}
  });

  backdrop.addEventListener('click',function(e){
    if(e.target===backdrop) closeCmd();
  });

  input.addEventListener('input',function(){
    activeIdx=0;
    renderCmd(input.value);
  });

  input.addEventListener('keydown',function(e){
    if(e.key==='ArrowDown'){
      e.preventDefault();
      activeIdx=(activeIdx+1)%results.length;
      renderCmd(input.value);
    }else if(e.key==='ArrowUp'){
      e.preventDefault();
      activeIdx=(activeIdx-1+results.length)%results.length;
      renderCmd(input.value);
    }else if(e.key==='Enter'){
      e.preventDefault();
      launch(activeIdx);
    }else if(e.key==='Escape'){
      e.preventDefault();
      closeCmd();
    }
  });

  list.addEventListener('click',function(e){
    const item=e.target.closest('.cmd-item');
    if(item) launch(parseInt(item.dataset.idx,10));
  });

  document.addEventListener('keydown',function(e){
    if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){
      e.preventDefault();
      if(backdrop.classList.contains('open')) closeCmd();
      else openCmd();
    }
    if(e.key==='Escape' && backdrop.classList.contains('open')) closeCmd();
  });
}

/* ============================================================
   18. NOTIFICATIONS
   ============================================================ */
function initNotifications(){
  const btn=document.getElementById('notifBtn');
  const dot=document.getElementById('notifDot');
  let seen=false;
  btn.addEventListener('click',function(){
    seen=!seen;
    dot.style.display=seen?'none':'';
    showToast(seen?'Notifications cleared':'You have new notifications',seen?'fa-check':'fa-bell');
  });
}

/* ============================================================
   19. SIDEBAR NAV ACTIVE STATE
   ============================================================ */
function initNavActive(){
  document.querySelectorAll('.nav-link').forEach(function(el){el.classList.remove('active')});
  const homeLink=document.getElementById('navHome');
  if(homeLink) homeLink.classList.add('active');

  const navHex=document.getElementById('navHex');
  if(navHex){
    navHex.addEventListener('click',function(e){
      e.preventDefault();
      const target=document.getElementById('hexService');
      if(target){
        target.scrollIntoView({behavior:'smooth',block:'start'});
        const inp=document.getElementById('hexPreviewInput');
        if(inp) setTimeout(function(){inp.focus()},500);
      }
      closeSidebar();
    });
  }

  const navPalette=document.getElementById('navPalette');
  if(navPalette){
    navPalette.addEventListener('click',function(e){
      e.preventDefault();
      const target=document.getElementById('paletteHunt');
      if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
      closeSidebar();
    });
  }

  const brandLink=document.getElementById('brandLink');
  if(brandLink){
    brandLink.addEventListener('click',function(){
      window.scrollTo({top:0,behavior:'smooth'});
    });
  }
}

/* ============================================================
   20. SPLASH SCREEN  (logo.png)
   ============================================================ */
const SPLASH_FADE_MS = 450;   // fade-in / fade-out duration (milliseconds)
const SPLASH_HOLD_MS = 550;   // how long the logo stays on screen (milliseconds)

function initSplash(){
  const splash = document.getElementById('hbSplash');
  if(!splash) return;

  // Push the timings into CSS so every animation stays in sync
  const root = document.documentElement;
  root.style.setProperty('--splash-fade-dur', SPLASH_FADE_MS + 'ms');
  root.style.setProperty('--splash-hold-dur', SPLASH_HOLD_MS + 'ms');

  document.body.classList.add('splash-lock');

  const fadeOutAt = SPLASH_FADE_MS + SPLASH_HOLD_MS;
  const removeAt  = fadeOutAt + SPLASH_FADE_MS;

  setTimeout(function(){ splash.classList.add('is-hiding'); }, fadeOutAt);

  setTimeout(function(){
    document.body.classList.remove('splash-lock');
    if(splash.parentNode) splash.parentNode.removeChild(splash);
  }, removeAt);
}

/* ============================================================
   21. INIT
   ============================================================ */
initSplash();

const container=document.getElementById('pageContainer');
container.innerHTML=renderHome();

initPaletteHunt();
initColorWheel();
initHexPreview();
initCommandPalette();
initNotifications();
initNavActive();

console.log('%c🍓 HelaBerry · Creative Studio','color:#a29bfe;font-weight:800;font-size:15px;');
console.log(user
  ? '✅ Signed in as: '+user.username+' ('+(user.role||'Creator')+')'
  : '👤 Guest mode — sign in to unlock everything');
console.log('%c⚡ Shortcuts: Ctrl+K → command palette · SPACE → new palettes','color:#6c85a0;font-size:12px;');

})();