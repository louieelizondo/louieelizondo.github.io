const root = document.documentElement;
const themeListeners = new Set();
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const STATIONS = [
  {
    no: '01',
    tone: 'ember',
    system: { en: 'Notion — the book', es: 'Notion — el libro' },
    name: { en: 'Prep', es: 'Prep' },
    body: {
      en: 'Before a ticket prints, the house already knows. Recipes, checklists, the week — kept in Notion so the line does not have to remember.',
      es: 'Antes de que el ticket imprima, la casa ya sabe. Recetas, listas, la semana — en Notion para que la línea no tenga que recordar.',
    },
    holds: {
      en: 'On the board: the week’s plan, station lists, inventory.',
      es: 'En el pizarrón: el plan de la semana, listas de estación, inventario.',
    },
  },
  {
    no: '02',
    tone: 'clay',
    system: { en: 'Shopify + POS', es: 'Shopify + POS' },
    name: { en: 'Fire', es: 'Fuego' },
    body: {
      en: 'Natural Balance. Fifty-plus plates, packed for the week. Shopify in front, the POS on the pass. This is the heat.',
      es: 'Natural Balance. Más de cincuenta platillos, empacados para la semana. Shopify al frente, el POS en el pase. Esto es el fuego.',
    },
    holds: {
      en: 'Orders in. Heat on. Families who did not have time to cook.',
      es: 'Entran órdenes. Se prende el fuego. Familias que no tuvieron tiempo de cocinar.',
    },
    href: 'https://naturalbalance.club',
    link: { en: 'naturalbalance.club', es: 'naturalbalance.club' },
  },
  {
    no: '03',
    tone: 'limon',
    system: { en: 'Finance suite — private', es: 'Suite de finanzas — privada' },
    name: { en: 'The pass', es: 'El pase' },
    body: {
      en: 'Six small apps watch the money so I can watch the food. Nothing leaves without a check. They stay in the house.',
      es: 'Seis apps chicas miran el dinero para que yo mire la comida. Nada sale sin revisión. Se quedan en casa.',
    },
    holds: {
      en: 'Not public. The pass is for the cooks.',
      es: 'No es público. El pase es para la cocina.',
    },
  },
  {
    no: '04',
    tone: 'cilantro',
    system: { en: 'Payroll · contracts', es: 'Nómina · contratos' },
    name: { en: 'Out', es: 'Salida' },
    body: {
      en: 'People leave with a ticket: payroll, a contract, a clean close. The line ends here.',
      es: 'La gente sale con un ticket: nómina, un contrato, un cierre limpio. La línea termina aquí.',
    },
    holds: {
      en: 'Bonuses from POS data. Contracts ready to print.',
      es: 'Bonos desde el POS. Contratos listos para imprimir.',
    },
    href: '/nomina.html',
    link: { en: 'Nómina (internal)', es: 'Nómina (interno)' },
  },
];

const copy = {
  en: {
    themeTo: 'Switch to light mode',
    ghLoading: 'Loading the trail…',
    ghFail: 'Open GitHub →',
    ghCount: (d) => `${d.combined} marks this year · ${d.github} on GitHub’s public graph · ${d.site} in this kitchen`,
  },
  es: {
    themeTo: 'Cambiar a modo claro',
    ghLoading: 'Cargando el rastro…',
    ghFail: 'Abrir GitHub →',
    ghCount: (d) => `${d.combined} marcas este año · ${d.github} en la gráfica pública de GitHub · ${d.site} en esta cocina`,
  },
};

let lang = root.lang === 'es' ? 'es' : 'en';
const t = () => copy[lang];

function applyLang(next) {
  lang = next;
  root.lang = next;
  localStorage.setItem('le-lang', next);
  document.querySelectorAll('[data-en]').forEach((el) => {
    const val = next === 'es' ? el.dataset.es : el.dataset.en;
    if (val != null) el.innerHTML = val;
  });
  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.lang === next));
  });
  const ticket = document.getElementById('kitchen-ticket');
  if (ticket && !ticket.hidden && ticket.dataset.station != null) {
    paintTicket(Number(ticket.dataset.station));
  }
  renderGraph();
}

function applyTheme(next) {
  root.dataset.theme = next;
  localStorage.setItem('le-theme', next);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', next === 'light' ? '#f7f2e8' : '#0b0a09');
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.setAttribute('aria-label', next === 'light' ? (lang === 'es' ? 'Cambiar a modo oscuro' : 'Switch to dark mode') : t().themeTo);
  themeListeners.forEach((fn) => fn(next));
  renderGraph();
}

document.querySelectorAll('[data-lang]').forEach((btn) => {
  btn.addEventListener('click', () => applyLang(btn.dataset.lang));
});
document.getElementById('theme-toggle')?.addEventListener('click', () => {
  applyTheme(root.dataset.theme === 'light' ? 'dark' : 'light');
});

/* =========================================================
   ROOMS
   ========================================================= */
function roomFromHash() {
  const hash = (location.hash || '').replace('#', '');
  return hash === 'line' ? 'line' : 'letter';
}

function setRoom(room, { push = false } = {}) {
  root.dataset.room = room;
  if (push) history.pushState(null, '', room === 'line' ? '#line' : '#letter');
  window.dispatchEvent(new CustomEvent('le-room', { detail: room }));
  if (room === 'line') {
    document.getElementById('line')?.focus?.();
  }
}

window.addEventListener('hashchange', () => setRoom(roomFromHash()));
setRoom(roomFromHash());

/* =========================================================
   GITHUB + KITCHEN TRAIL
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

function levelFromCount(n) {
  if (!n) return 0;
  if (n <= 2) return 1;
  if (n <= 5) return 2;
  if (n <= 8) return 3;
  return 4;
}

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
  if (graphTotal) graphTotal.textContent = t().ghCount(ghData);

  const cell = 10;
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

  let svg = `<svg width="100%" viewBox="0 0 ${svgW} ${svgH}" style="max-width:${svgW}px" role="img" aria-label="${ghData.combined} contributions">`;

  let lastMonth = -1;
  days.forEach((d, i) => {
    if (i % 7 !== 0) return;
    const m = new Date(`${d.date}T12:00:00`).getMonth();
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
    const lvl = Math.min(d.level ?? levelFromCount(d.count), 4);
    const title = `${d.date}: ${d.count || 0} (${d.github || 0} GitHub / ${d.site || 0} kitchen)`;
    svg += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${scale[lvl]}"><title>${title}</title></rect>`;
  });

  svg += '</svg>';
  graphEl.innerHTML = svg;

  if (graphLegend) {
    graphLegend.hidden = false;
    graphLegend.querySelectorAll('i').forEach((box, i) => { box.style.background = scale[i]; });
  }
}

function normalizeDays(days) {
  return days.map((d) => {
    const github = d.github ?? d.count ?? 0;
    const site = d.site ?? 0;
    const count = Math.max(github, site, d.count ?? 0);
    return { date: d.date, github, site, count, level: levelFromCount(count) };
  });
}

function mergeCalendars(a, b) {
  const map = new Map();
  for (const src of [a, b]) {
    for (const d of src || []) {
      const prev = map.get(d.date) || { date: d.date, github: 0, site: 0 };
      map.set(d.date, {
        date: d.date,
        github: Math.max(prev.github, d.github ?? d.count ?? 0),
        site: Math.max(prev.site, d.site ?? 0),
      });
    }
  }
  return normalizeDays([...map.values()].sort((x, y) => x.date.localeCompare(y.date)));
}

(async function loadGraph() {
  renderGraph();
  let local = null;
  try {
    const res = await fetch('assets/data/contributions.json');
    if (res.ok) local = await res.json();
  } catch { /* use live fallback */ }

  let live = null;
  try {
    const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${GH_USER}?y=last`);
    if (res.ok) {
      const data = await res.json();
      const days = (data.contributions || []).flat().map((d) => ({
        date: d.date,
        github: d.count || 0,
        site: 0,
      }));
      live = { days };
    }
  } catch { /* local file is enough */ }

  if (local?.days?.length) {
    const days = mergeCalendars(local.days, live?.days);
    ghData = {
      days,
      github: local.githubTotal ?? days.reduce((n, d) => n + d.github, 0),
      site: local.siteTotal ?? days.reduce((n, d) => n + d.site, 0),
      combined: days.reduce((n, d) => n + d.count, 0),
    };
  } else if (live?.days?.length) {
    const days = normalizeDays(live.days);
    ghData = {
      days,
      github: days.reduce((n, d) => n + d.github, 0),
      site: 0,
      combined: days.reduce((n, d) => n + d.count, 0),
    };
  } else {
    ghFailed = true;
  }
  renderGraph();
})();

/* =========================================================
   TICKET + KITCHEN
   ========================================================= */
const ticketEl = document.getElementById('kitchen-ticket');

function paintTicket(index) {
  const st = STATIONS[index];
  if (!st || !ticketEl) return;
  ticketEl.dataset.station = String(index);
  ticketEl.querySelector('.ticket-no').textContent = st.no;
  ticketEl.querySelector('.ticket-sys').textContent = st.system[lang];
  ticketEl.querySelector('.ticket-title').textContent = st.name[lang];
  ticketEl.querySelector('.ticket-body').textContent = st.body[lang];
  ticketEl.querySelector('.ticket-holds').textContent = st.holds[lang];
  const link = ticketEl.querySelector('.ticket-link');
  if (st.href) {
    link.hidden = false;
    link.href = st.href;
    link.textContent = st.link[lang];
  } else {
    link.hidden = true;
  }
}

function showTicket(index) {
  if (index < 0) {
    ticketEl.hidden = true;
    ticketEl.removeAttribute('data-station');
    return;
  }
  paintTicket(index);
  ticketEl.hidden = false;
}

document.getElementById('ticket-close')?.addEventListener('click', () => {
  showTicket(-1);
  kitchenApi?.focusStation(-1);
  selectedStation = -1;
});

let kitchenApi = null;
let selectedStation = -1;

(function kitchenBootstrap() {
  const stage = document.getElementById('linea-stage');
  if (!stage) return;

  const loadingState = stage.querySelector('[data-state="loading"]');
  const fallbackState = document.querySelector('[data-state="fallback"]');
  const spinBtn = document.getElementById('linea-spin');
  const resetBtn = document.getElementById('linea-reset');
  const stations = STATIONS.map((st) => ({
    get name() { return st.name[lang]; },
    get system() { return st.system[lang]; },
  }));

  function showFallback() {
    if (loadingState) loadingState.hidden = true;
    stage.hidden = true;
    if (fallbackState) fallbackState.hidden = false;
    fallbackState?.querySelectorAll('[data-station]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.station);
        selectedStation = selectedStation === i ? -1 : i;
        showTicket(selectedStation);
      });
    });
  }

  function hasWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch { return false; }
  }

  if (!hasWebGL()) { showFallback(); return; }

  async function boot() {
    if (kitchenApi) {
      kitchenApi.start();
      return;
    }
    try {
      const { initKitchen } = await import('./kitchen.js?v=5');
      kitchenApi = initKitchen(stage, {
        theme: root.dataset.theme,
        stations,
        onSelect: (i) => {
          selectedStation = i;
          showTicket(i);
        },
      });
      if (loadingState) loadingState.hidden = true;
      kitchenApi.start();
      themeListeners.add((next) => kitchenApi.setTheme(next));

      spinBtn?.addEventListener('click', () => {
        const next = !kitchenApi.isAutoRotating();
        kitchenApi.setAutoRotate(next);
        spinBtn.setAttribute('aria-pressed', String(next));
      });
      spinBtn?.setAttribute('aria-pressed', String(kitchenApi.isAutoRotating()));

      resetBtn?.addEventListener('click', () => {
        selectedStation = -1;
        kitchenApi.focusStation(-1);
        showTicket(-1);
      });
    } catch (err) {
      console.error('La Línea failed to load', err);
      showFallback();
    }
  }

  function onRoom(room) {
    if (room === 'line') boot();
    else kitchenApi?.stop();
  }

  window.addEventListener('le-room', (e) => onRoom(e.detail));
  if (root.dataset.room === 'line') boot();
})();

applyLang(lang);
applyTheme(root.dataset.theme);
