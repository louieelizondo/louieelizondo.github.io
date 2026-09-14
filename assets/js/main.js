/* =========================================================
   louieelizondo.com — site behaviour
   Theme, language, command palette, ember canvas, scroll spy,
   service clock, GitHub log, and the 3D kitchen bootstrap.
   ========================================================= */

const root = document.documentElement;
const STORE = { theme: 'le-theme', lang: 'le-lang' };

/* Strings the JS generates itself (everything else lives in the markup) */
const T = {
  en: {
    copied: 'Link copied',
    handleCopied: 'X handle copied',
    themeDark: 'Dark mode on',
    themeLight: 'Light mode on',
    open: 'In service',
    closed: 'Off the line',
    ghLoading: 'Loading commit log…',
    ghCount: (n) => `<b>${n}</b> contributions in the last year`,
    ghFail: 'View the commit log on GitHub →',
    cmdPlaceholder: 'Search sections, projects, commands…',
    noResults: 'Nothing on the menu for that.',
    gJump: 'Jump to',
    gProjects: 'Projects',
    gLinks: 'Links',
    gActions: 'Actions',
    actTheme: 'Toggle dark / light',
    actLang: 'Switch to Spanish',
    actCopy: 'Copy link to this page',
    actHandle: 'Copy X handle',
    actTop: 'Back to top',
  },
  es: {
    copied: 'Liga copiada',
    handleCopied: 'Usuario de X copiado',
    themeDark: 'Modo oscuro',
    themeLight: 'Modo claro',
    open: 'En servicio',
    closed: 'Fuera de línea',
    ghLoading: 'Cargando bitácora…',
    ghCount: (n) => `<b>${n}</b> contribuciones en el último año`,
    ghFail: 'Ver la bitácora en GitHub →',
    cmdPlaceholder: 'Busca secciones, proyectos, comandos…',
    noResults: 'Nada en el menú para eso.',
    gJump: 'Ir a',
    gProjects: 'Proyectos',
    gLinks: 'Ligas',
    gActions: 'Acciones',
    actTheme: 'Cambiar oscuro / claro',
    actLang: 'Cambiar a inglés',
    actCopy: 'Copiar liga de la página',
    actHandle: 'Copiar usuario de X',
    actTop: 'Volver arriba',
  },
};

let lang = root.lang === 'es' ? 'es' : 'en';
const t = () => T[lang];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =========================================================
   TOAST
   ========================================================= */
const toastEl = document.getElementById('toast');
const cmdkElEarly = document.getElementById('cmdk');
const cmdInputEl = document.getElementById('cmdk-input');
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.dataset.show = 'true';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.dataset.show = 'false'; }, 2200);
}

/* =========================================================
   THEME
   ========================================================= */
const themeBtn = document.getElementById('theme-toggle');
const themeMeta = document.querySelector('meta[name="theme-color"]');
const themeListeners = new Set();

function applyTheme(next, announce, persist) {
  root.dataset.theme = next;
  if (persist !== false) localStorage.setItem(STORE.theme, next);
  themeMeta?.setAttribute('content', next === 'light' ? '#f7f2e8' : '#0b0a09');
  themeBtn?.setAttribute('aria-label', next === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
  themeListeners.forEach((fn) => fn(next));
  if (announce) toast(next === 'light' ? t().themeLight : t().themeDark);
}

function toggleTheme() {
  applyTheme(root.dataset.theme === 'light' ? 'dark' : 'light', true);
}

themeBtn?.addEventListener('click', toggleTheme);
applyTheme(root.dataset.theme === 'light' ? 'light' : 'dark', false, Boolean(localStorage.getItem(STORE.theme)));

/* Follow the OS unless the visitor has made a choice */
matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
  if (!localStorage.getItem(STORE.theme)) applyTheme(e.matches ? 'light' : 'dark', false, false);
});

/* =========================================================
   LANGUAGE
   ========================================================= */
const langButtons = [...document.querySelectorAll('.seg[data-seg="lang"] button')];
const langThumb = document.querySelector('.seg[data-seg="lang"] .seg-thumb');
const i18nNodes = [...document.querySelectorAll('[data-en]')];

function moveThumb() {
  const active = langButtons.find((b) => b.dataset.lang === lang);
  if (!active || !langThumb) return;
  langThumb.style.width = `${active.offsetWidth}px`;
  langThumb.style.transform = `translateX(${active.offsetLeft - 3}px)`;
}

function applyLang(next) {
  lang = next;
  root.lang = next;
  localStorage.setItem(STORE.lang, next);

  i18nNodes.forEach((el) => {
    const val = el.dataset[next];
    if (val !== undefined) el.innerHTML = val;
  });

  langButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === next)));
  moveThumb();

  if (cmdInputEl) cmdInputEl.placeholder = t().cmdPlaceholder;
  if (typeof renderClock === 'function') renderClock();
  if (typeof renderGraph === 'function') renderGraph();
  if (typeof buildCommands === 'function') buildCommands();
}

langButtons.forEach((b) => b.addEventListener('click', () => applyLang(b.dataset.lang)));
window.addEventListener('resize', moveThumb);
document.fonts?.ready.then(moveThumb);

/* =========================================================
   SERVICE CLOCK — real Chihuahua time
   ========================================================= */
const clockEl = document.getElementById('clock');
const statusEl = document.getElementById('service-status');

function renderClock() {
  if (!clockEl) return;
  const now = new Date();
  const time = new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', {
    timeZone: 'America/Chihuahua',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
  clockEl.textContent = `${time} CST`;

  const hour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chihuahua', hour: '2-digit', hour12: false }).format(now)
  );
  const open = hour >= 8 && hour < 20;
  if (statusEl) statusEl.textContent = open ? t().open : t().closed;
}
renderClock();
setInterval(renderClock, 20000);

/* =========================================================
   REVEAL + SCROLL SPY + PROGRESS
   ========================================================= */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.08, rootMargin: '0px 0px -6% 0px' }
);
document.querySelectorAll('.reveal, .stack-cell').forEach((el) => revealObserver.observe(el));

const navLinks = [...document.querySelectorAll('.nav-links a')];
const spySections = navLinks
  .map((a) => document.querySelector(a.getAttribute('href')))
  .filter(Boolean);

const spy = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) =>
        a.setAttribute('aria-current', String(a.getAttribute('href') === `#${entry.target.id}`))
      );
    });
  },
  { rootMargin: '-45% 0px -50% 0px' }
);
spySections.forEach((s) => spy.observe(s));

const progressEl = document.querySelector('.progress');
let progressQueued = false;
function updateProgress() {
  progressQueued = false;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const pct = max > 0 ? window.scrollY / max : 0;
  progressEl.style.transform = `scaleX(${Math.min(1, Math.max(0, pct))})`;
}
addEventListener(
  'scroll',
  () => {
    if (!progressQueued) {
      progressQueued = true;
      requestAnimationFrame(updateProgress);
    }
  },
  { passive: true }
);
updateProgress();

/* =========================================================
   TICKET SPOTLIGHT — cursor-tracked highlight
   ========================================================= */
document.querySelectorAll('.ticket').forEach((card) => {
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
});

/* =========================================================
   COUNT-UP STATS
   ========================================================= */
const statObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const to = Number(el.dataset.count);
      statObserver.unobserve(el);
      if (reduceMotion) { el.textContent = to; return; }
      const dur = 900;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - start) / dur);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  },
  { threshold: 0.5 }
);
document.querySelectorAll('[data-count]').forEach((el) => statObserver.observe(el));

/* =========================================================
   EMBER CANVAS — a warm dot field that reacts to the cursor
   ========================================================= */
(function emberField() {
  const canvas = document.getElementById('ember-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const hero = canvas.parentElement;

  let dots = [];
  let w = 0;
  let h = 0;
  let dpr = 1;
  const mouse = { x: -999, y: -999 };
  let dotColor = 'rgba(244,239,230,0.5)';
  let emberColor = '#ff5a1f';
  let running = false;
  let raf = 0;

  function readColors() {
    const cs = getComputedStyle(root);
    dotColor = cs.getPropertyValue('--dot').trim() || dotColor;
    emberColor = cs.getPropertyValue('--ember').trim() || emberColor;
  }

  function layout() {
    const r = hero.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = r.width;
    h = r.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const gap = w < 700 ? 30 : 38;
    dots = [];
    for (let x = gap / 2; x < w; x += gap) {
      for (let y = gap / 2; y < h; y += gap) {
        dots.push({ x, y, seed: Math.random() * Math.PI * 2 });
      }
    }
  }

  function draw(time) {
    raf = 0;
    ctx.clearRect(0, 0, w, h);
    const tt = time * 0.0006;

    for (const d of dots) {
      const dx = d.x - mouse.x;
      const dy = d.y - mouse.y;
      const dist = Math.hypot(dx, dy);
      const near = Math.max(0, 1 - dist / 190);

      const breathe = reduceMotion ? 0 : (Math.sin(tt + d.seed) + 1) * 0.5;
      const r = 0.9 + near * 2.4 + breathe * 0.35;
      const alpha = 0.12 + near * 0.75 + breathe * 0.06;

      ctx.beginPath();
      ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      ctx.fillStyle = near > 0.18 ? emberColor : dotColor;
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (running) raf = requestAnimationFrame(draw);
  }

  function kick() {
    if (!raf) raf = requestAnimationFrame(draw);
  }

  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    kick();
  });
  hero.addEventListener('pointerleave', () => {
    mouse.x = mouse.y = -999;
    kick();
  });

  new IntersectionObserver((entries) => {
    running = entries[0].isIntersecting && !reduceMotion;
    if (entries[0].isIntersecting) kick();
    else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }, { threshold: 0 }).observe(hero);

  new ResizeObserver(() => { layout(); kick(); }).observe(hero);

  themeListeners.add(() => { readColors(); kick(); });
  readColors();
  layout();
  kick();
})();

/* =========================================================
   GITHUB COMMIT LOG
   ========================================================= */
const GH_USER = 'louieelizondo';
const graphEl = document.getElementById('gh-graph');
const graphTotal = document.getElementById('gh-total');
const graphLegend = document.getElementById('gh-legend');
let ghData = null;
let ghFailed = false;

const GH_SCALES = {
  dark: ['#241f1d', '#1c4a2a', '#2d7a3a', '#3fb950', '#5fd07a'],
  light: ['#e7dfce', '#bfe0c2', '#7fc394', '#3f9c5f', '#1f7d43'],
};

function renderGraph() {
  if (!graphEl) return;
  if (ghFailed) {
    graphEl.innerHTML = `<a class="gh-link" href="https://github.com/${GH_USER}" target="_blank" rel="noopener">${t().ghFail}</a>`;
    return;
  }
  if (!ghData) {
    graphEl.innerHTML = `<span class="placeholder">${t().ghLoading}</span>`;
    return;
  }

  const scale = GH_SCALES[root.dataset.theme === 'light' ? 'light' : 'dark'];
  const days = ghData.days;
  graphTotal.innerHTML = t().ghCount(ghData.total);

  const cell = 11;
  const gap = 3;
  const step = cell + gap;
  const labelW = 26;
  const monthH = 16;
  const weeks = Math.ceil(days.length / 7);
  const svgW = labelW + weeks * step;
  const svgH = monthH + 7 * step;

  const months = lang === 'es'
    ? ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayLabels = lang === 'es' ? ['', 'lun', '', 'mié', '', 'vie', ''] : ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  let svg = `<svg width="100%" viewBox="0 0 ${svgW} ${svgH}" style="max-width:${svgW}px" role="img" aria-label="${ghData.total} contributions">`;

  let lastMonth = -1;
  days.forEach((d, i) => {
    if (i % 7 !== 0) return;
    const m = new Date(d.date).getMonth();
    if (m === lastMonth) return;
    lastMonth = m;
    svg += `<text x="${labelW + (i / 7) * step}" y="11" fill="currentColor" opacity="0.5" font-size="9" font-family="JetBrains Mono, monospace">${months[m]}</text>`;
  });

  dayLabels.forEach((label, i) => {
    if (!label) return;
    svg += `<text x="0" y="${monthH + i * step + cell - 2}" fill="currentColor" opacity="0.5" font-size="8" font-family="JetBrains Mono, monospace">${label}</text>`;
  });

  days.forEach((d, i) => {
    const x = labelW + Math.floor(i / 7) * step;
    const y = monthH + (i % 7) * step;
    const lvl = Math.min(d.level || 0, 4);
    svg += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${scale[lvl]}"><title>${d.date}: ${d.count || 0}</title></rect>`;
  });

  svg += '</svg>';
  graphEl.innerHTML = svg;

  if (graphLegend) {
    graphLegend.hidden = false;
    graphLegend.querySelectorAll('i').forEach((box, i) => { box.style.background = scale[i]; });
  }
}

(async function loadGraph() {
  renderGraph();
  try {
    const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${GH_USER}?y=last`);
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const days = (data.contributions || []).flat();
    if (!days.length) throw new Error('empty');
    const total = data.total?.lastYear ?? Object.values(data.total || {}).pop() ?? days.reduce((n, d) => n + (d.count || 0), 0);
    ghData = { days, total };
  } catch {
    ghFailed = true;
    if (graphTotal) graphTotal.textContent = 'GitHub';
  }
  renderGraph();
})();

themeListeners.add(renderGraph);

/* =========================================================
   COMMAND PALETTE
   ========================================================= */
const cmdk = cmdkElEarly;
const cmdInput = cmdInputEl;
const cmdList = document.getElementById('cmdk-list');
const cmdTrigger = document.getElementById('cmd-trigger');
let commands = [];
let filtered = [];
let cursor = 0;
let lastFocused = null;

function buildCommands() {
  const s = t();
  const sections = [...document.querySelectorAll('.nav-links a')].map((a) => ({
    group: s.gJump,
    icon: '§',
    title: a.textContent.trim(),
    keywords: a.getAttribute('href'),
    hint: 'Enter',
    run: () => document.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }),
  }));

  const projects = [...document.querySelectorAll('.ticket')].map((card) => {
    const title = card.querySelector('h3').textContent.trim();
    const link = card.querySelector('.ticket-link');
    return {
      group: s.gProjects,
      icon: '#',
      title,
      sub: card.querySelector('.ticket-stamp')?.textContent.trim(),
      keywords: card.textContent,
      hint: link ? '↗' : 'Enter',
      run: () => {
        if (link) window.open(link.href, '_blank', 'noopener');
        else card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      },
    };
  });

  const links = [
    { title: 'X / Twitter', sub: '@louieelizondo', url: 'https://x.com/louieelizondo' },
    { title: 'GitHub', sub: '@louieelizondo', url: 'https://github.com/louieelizondo' },
    { title: 'Natural Balance Club', sub: 'naturalbalance.club', url: 'https://naturalbalance.club' },
    { title: 'CANACO Chihuahua', sub: 'Donde Comemos', url: 'https://canacorestauranteroscuu.github.io/Restaurantes/dondecomemos.html' },
  ].map((l) => ({
    group: s.gLinks,
    icon: '↗',
    title: l.title,
    sub: l.sub,
    keywords: `${l.title} ${l.sub} ${l.url}`,
    hint: '↗',
    run: () => window.open(l.url, '_blank', 'noopener'),
  }));

  const actions = [
    { icon: '◐', title: s.actTheme, keywords: 'theme dark light tema oscuro claro', run: toggleTheme },
    { icon: '⇄', title: s.actLang, keywords: 'language idioma english espanol spanish', run: () => applyLang(lang === 'en' ? 'es' : 'en') },
    {
      icon: '⧉', title: s.actCopy, keywords: 'copy link url copiar liga',
      run: async () => { await navigator.clipboard?.writeText(location.href); toast(s.copied); },
    },
    {
      icon: '𝕏', title: s.actHandle, keywords: 'x twitter handle usuario copy',
      run: async () => { await navigator.clipboard?.writeText('@louieelizondo'); toast(s.handleCopied); },
    },
    { icon: '↑', title: s.actTop, keywords: 'top arriba inicio home', run: () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }) },
  ].map((a) => ({ group: s.gActions, hint: 'Enter', ...a }));

  commands = [...sections, ...projects, ...links, ...actions];
  if (cmdk.dataset.open === 'true') filter(cmdInput.value);
}

function score(cmd, q) {
  if (!q) return 1;
  const hay = `${cmd.title} ${cmd.sub || ''} ${cmd.keywords || ''}`.toLowerCase();
  const needle = q.toLowerCase().trim();
  if (hay.includes(needle)) return 2;
  // loose subsequence match, so "npay" still finds "Nómina & Bono"
  let i = 0;
  for (const ch of needle) {
    i = hay.indexOf(ch, i);
    if (i === -1) return 0;
    i += 1;
  }
  return 1;
}

function filter(q) {
  filtered = commands.map((c) => ({ c, s: score(c, q) })).filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s).map((x) => x.c);
  cursor = 0;
  paint();
}

function paint() {
  if (!filtered.length) {
    cmdList.innerHTML = `<li class="cmdk-empty">${t().noResults}</li>`;
    return;
  }
  let html = '';
  let group = null;
  filtered.forEach((c, i) => {
    if (c.group !== group) {
      group = c.group;
      html += `<li class="cmdk-group" role="presentation">${group}</li>`;
    }
    html += `<li class="cmdk-item" role="option" id="cmdk-opt-${i}" data-i="${i}" aria-selected="${i === cursor}">
      <span class="cmdk-item-icon">${c.icon}</span>
      <span class="cmdk-item-body">
        <span class="cmdk-item-title">${c.title}</span>
        ${c.sub ? `<span class="cmdk-item-sub">${c.sub}</span>` : ''}
      </span>
      <span class="cmdk-item-hint">${c.hint || ''}</span>
    </li>`;
  });
  cmdList.innerHTML = html;
  cmdInput.setAttribute('aria-activedescendant', `cmdk-opt-${cursor}`);
  cmdList.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
}

function openCmdk() {
  lastFocused = document.activeElement;
  cmdk.dataset.open = 'true';
  cmdInput.value = '';
  filter('');
  cmdInput.focus();
}

function closeCmdk() {
  cmdk.dataset.open = 'false';
  lastFocused?.focus?.();
}

function runCursor() {
  const cmd = filtered[cursor];
  if (!cmd) return;
  closeCmdk();
  setTimeout(() => cmd.run(), 40);
}

cmdTrigger?.addEventListener('click', openCmdk);
cmdk.querySelector('.cmdk-scrim').addEventListener('click', closeCmdk);
cmdInput.addEventListener('input', () => filter(cmdInput.value));

cmdList.addEventListener('click', (e) => {
  const item = e.target.closest('.cmdk-item');
  if (!item) return;
  cursor = Number(item.dataset.i);
  runCursor();
});
cmdList.addEventListener('pointermove', (e) => {
  const item = e.target.closest('.cmdk-item');
  if (!item || Number(item.dataset.i) === cursor) return;
  cursor = Number(item.dataset.i);
  paint();
});

addEventListener('keydown', (e) => {
  const open = cmdk.dataset.open === 'true';
  const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '');

  if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    open ? closeCmdk() : openCmdk();
    return;
  }
  if (!open && e.key === '/' && !typing) {
    e.preventDefault();
    openCmdk();
    return;
  }
  if (!open) return;

  if (e.key === 'Escape') { e.preventDefault(); closeCmdk(); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); cursor = (cursor + 1) % filtered.length; paint(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); cursor = (cursor - 1 + filtered.length) % filtered.length; paint(); }
  else if (e.key === 'Enter') { e.preventDefault(); runCursor(); }
});

buildCommands();

/* =========================================================
   "LA LÍNEA" — 3D kitchen, loaded only when you reach it
   ========================================================= */
(function kitchenBootstrap() {
  const stage = document.getElementById('linea-stage');
  if (!stage) return;

  const loadingState = stage.querySelector('[data-state="loading"]');
  const fallbackState = document.querySelector('[data-state="fallback"]');
  const stationBtns = [...document.querySelectorAll('.linea-station')];
  const spinBtn = document.getElementById('linea-spin');
  const resetBtn = document.getElementById('linea-reset');

  const stations = stationBtns.map((btn) => ({
    get name() { return btn.querySelector('.linea-station-label').textContent.trim(); },
    get system() { return btn.querySelector('.linea-station-sys').textContent.trim(); },
  }));

  function showFallback() {
    if (loadingState) loadingState.hidden = true;
    stage.hidden = true;
    if (fallbackState) fallbackState.hidden = false;
  }

  function hasWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch { return false; }
  }

  if (!hasWebGL()) { showFallback(); return; }

  let api = null;
  let selected = -1;

  function syncButtons() {
    stationBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === selected)));
  }

  const io = new IntersectionObserver(async (entries) => {
    const visible = entries[0].isIntersecting;
    stage.dataset.inview = String(visible);

    if (visible && !api) {
      io.disconnect();
      try {
        const { initKitchen } = await import('./kitchen.js?v=4');
        api = initKitchen(stage, {
          theme: root.dataset.theme,
          stations,
          onSelect: (i) => { selected = i; syncButtons(); },
        });
        if (loadingState) loadingState.hidden = true;
        api.start();
        themeListeners.add((next) => api.setTheme(next));

        stationBtns.forEach((btn, i) => {
          btn.addEventListener('click', () => {
            selected = selected === i ? -1 : i;
            api.focusStation(selected);
            syncButtons();
          });
        });

        spinBtn?.addEventListener('click', () => {
          const next = !api.isAutoRotating();
          api.setAutoRotate(next);
          spinBtn.setAttribute('aria-pressed', String(next));
        });
        spinBtn?.setAttribute('aria-pressed', String(api.isAutoRotating()));

        resetBtn?.addEventListener('click', () => {
          selected = -1;
          api.focusStation(-1);
          syncButtons();
        });

        // Keep rendering only while the section is on screen
        new IntersectionObserver((e2) => {
          const on = e2[0].isIntersecting;
          stage.dataset.inview = String(on);
          on ? api.start() : api.stop();
        }, { threshold: 0 }).observe(stage);
      } catch (err) {
        console.error('La Línea failed to load', err);
        showFallback();
      }
    }
  }, { rootMargin: '200px 0px' });

  io.observe(stage);
})();

applyLang(lang);
