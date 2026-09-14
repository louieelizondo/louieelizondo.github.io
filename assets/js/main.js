const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const PRINTS = {
  house: {
    meta: { en: 'The house', es: 'La casa' },
    title: 'Natural Balance',
    body: {
      en: 'Homestyle meals for families who don’t have time to cook. This is why everything else exists. The money maker. Shopify on the storefront.',
      es: 'Comida de casa para familias que no tienen tiempo de cocinar. Por esto existe lo demás. El que paga las cuentas. Shopify en la tienda.',
    },
    extra: {
      en: 'Behind the store: admin, employee, and team apps — the office, not the plate.',
      es: 'Detrás de la tienda: apps de admin, empleados y equipo — la oficina, no el plato.',
    },
    href: 'https://naturalbalance.club',
    link: 'naturalbalance.club',
  },
  restauranteros: {
    meta: { en: 'The table', es: 'La mesa' },
    title: 'Restauranteros',
    body: {
      en: 'CANACO Chihuahua. Learn the business with the others. Meetings, events, problems one kitchen can’t fix alone.',
      es: 'CANACO Chihuahua. Aprender el negocio con los demás. Juntas, eventos, problemas que una cocina no arregla sola.',
    },
    extra: {
      en: 'On the internet: Donde Comemos. Next: a member dashboard on its own CANACO Supabase — the Notion book, moved.',
      es: 'En internet: Donde Comemos. Siguiente: un dashboard de socios en un Supabase de CANACO — el libro de Notion, mudado.',
    },
    href: 'https://canacorestauranteroscuu.github.io/Restaurantes/dondecomemos.html',
    link: 'Donde Comemos',
  },
  office: {
    meta: { en: 'The office', es: 'La oficina' },
    title: { en: 'Admin', es: 'Admin' },
    body: {
      en: 'People: recruit → train → last day. Contracts. Nómina. Money in, money out. The apps stay in the house.',
      es: 'Gente: recluta → entrena → último día. Contratos. Nómina. Dinero entra, dinero sale. Las apps se quedan en casa.',
    },
    extra: {
      en: 'Running on Notion, Supabase, and what we’re writing. Not public.',
      es: 'Corre en Notion, Supabase, y lo que vamos escribiendo. No es público.',
    },
  },
};

const LCD = {
  en: { ready: 'READY', print: 'PRINTING…', courtesy: 'COURTESY' },
  es: { ready: 'LISTO', print: 'IMPRIMIENDO…', courtesy: 'CORTESÍA' },
};

let lang = root.lang === 'es' ? 'es' : 'en';
const printed = new Set();
let lidHits = 0;
let unlocked = sessionStorage.getItem('le-egg') === '1';

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
  const receipt = document.getElementById('receipt');
  if (receipt && !receipt.hidden && receipt.dataset.print) {
    spit(receipt.dataset.print);
  }
  if (!document.getElementById('printer')?.dataset.busy) {
    document.getElementById('printer-lcd').textContent = LCD[lang].ready;
  }
}

function applyTheme(next) {
  root.dataset.theme = next;
  localStorage.setItem('le-theme', next);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', next === 'light' ? '#f7f2e8' : '#0b0a09');
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.setAttribute(
      'aria-label',
      next === 'light'
        ? (lang === 'es' ? 'Cambiar a modo oscuro' : 'Switch to dark mode')
        : (lang === 'es' ? 'Cambiar a modo claro' : 'Switch to light mode'),
    );
  }
}

document.querySelectorAll('[data-lang]').forEach((btn) => {
  btn.addEventListener('click', () => applyLang(btn.dataset.lang));
});
document.getElementById('theme-toggle')?.addEventListener('click', () => {
  applyTheme(root.dataset.theme === 'light' ? 'dark' : 'light');
});

function receiptHtml(key) {
  if (key === 'courtesy') {
    const code = String.fromCharCode(67, 65, 82, 84, 65);
    return `
      <p class="meta">${lang === 'es' ? 'Cortesía · envío gratis' : 'Courtesy · free delivery'}</p>
      <h2>${code}</h2>
      <p>${lang === 'es'
        ? 'Un uso por cliente. Cien en total. Envío gratis en tu siguiente pedido en Natural Balance.'
        : 'One use per customer. One hundred in total. Free delivery on your next Natural Balance order.'}</p>
      <p><a href="https://naturalbalance.club" target="_blank" rel="noopener">naturalbalance.club</a></p>
      <span class="code">${code}</span>
    `;
  }
  const p = PRINTS[key];
  const title = typeof p.title === 'string' ? p.title : p.title[lang];
  const link = p.href
    ? `<p><a href="${p.href}" target="_blank" rel="noopener">${p.link}</a></p>`
    : '';
  return `
    <p class="meta">${p.meta[lang]}</p>
    <h2>${title}</h2>
    <p>${p.body[lang]}</p>
    <p>${p.extra[lang]}</p>
    ${link}
  `;
}

function spit(key) {
  const printer = document.getElementById('printer');
  const receipt = document.getElementById('receipt');
  const lcd = document.getElementById('printer-lcd');
  printer.dataset.busy = 'true';
  lcd.textContent = LCD[lang].print;
  receipt.hidden = true;
  receipt.dataset.print = key;
  receipt.innerHTML = receiptHtml(key);
  const show = () => {
    receipt.hidden = false;
    printer.dataset.busy = 'false';
    lcd.textContent = key === 'courtesy' ? LCD[lang].courtesy : LCD[lang].ready;
  };
  if (reduceMotion) show();
  else setTimeout(show, 220);
  document.querySelectorAll('.printer-key').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.print === key));
  });
}

document.querySelectorAll('.printer-key').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.print;
    printed.add(key);
    spit(key);
  });
});

document.getElementById('printer-lid')?.addEventListener('click', () => {
  lidHits += 1;
  if (unlocked) {
    spit('courtesy');
    return;
  }
  if (printed.size >= 3 && lidHits >= 3) {
    unlocked = true;
    sessionStorage.setItem('le-egg', '1');
    spit('courtesy');
  }
});

applyLang(lang);
applyTheme(root.dataset.theme);
if (unlocked) {
  document.getElementById('printer-lcd').textContent = LCD[lang].courtesy;
}
