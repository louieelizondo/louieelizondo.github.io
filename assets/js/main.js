const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const PRINTS = {
  house: {
    meta: { en: '01 · The house', es: '01 · La casa' },
    title: 'Natural Balance',
    paras: {
      en: [
        'This is why we exist. Homestyle meals for families in Chihuahua who don’t have time to cook.',
        'The store is naturalbalance.club, on Shopify. That’s the money maker. Everything else on this page is in service of that.',
        'Behind the store — not on this ticket — sit the admin, employee, and team apps. Those are the office. This ticket is the plate.',
      ],
      es: [
        'Por esto existimos. Comida de casa para familias en Chihuahua que no tienen tiempo de cocinar.',
        'La tienda es naturalbalance.club, en Shopify. Eso paga las cuentas. Todo lo demás de esta página está al servicio de eso.',
        'Detrás de la tienda — no en este ticket — están las apps de admin, empleados y equipo. Eso es la oficina. Este ticket es el plato.',
      ],
    },
    href: 'https://naturalbalance.club',
    link: 'naturalbalance.club',
  },
  restauranteros: {
    meta: { en: '02 · Restauranteros', es: '02 · Restauranteros' },
    title: 'CANACO Chihuahua',
    paras: {
      en: [
        'I chair the restaurant section. In real life that means meetings, events, and sitting with the others when one kitchen can’t fix it alone.',
        'I’m learning the business in public — not as a brand exercise, as practice.',
        'The public project is Donde Comemos, so the city can find where to eat. Next: move the members’ Notion board onto a CANACO Supabase and give the section a real dashboard.',
      ],
      es: [
        'Presido la sección de restauranteros. En la vida real: juntas, eventos, y sentarme con los demás cuando una cocina no lo arregla sola.',
        'Estoy aprendiendo el negocio en público — no como marca, como oficio.',
        'El proyecto público es Donde Comemos, para que la ciudad sepa dónde comer. Siguiente: pasar el tablero de Notion de los socios a un Supabase de CANACO y darles un dashboard de verdad.',
      ],
    },
    href: 'https://canacorestauranteroscuu.github.io/Restaurantes/dondecomemos.html',
    link: 'Donde Comemos',
  },
  office: {
    meta: { en: '03 · The office', es: '03 · La oficina' },
    title: { en: 'People and money', es: 'Gente y dinero' },
    paras: {
      en: [
        'This is the admin of the house. People: recruit, train, last day. Contracts. Nómina.',
        'Money in, money out. The finance apps stay private. So do the admin, employee, and team apps. They replaced an old nb-app we barely open now.',
        'Stack: Notion, Supabase, and what we’re writing. Not a public product. The software the house didn’t come with.',
      ],
      es: [
        'Esto es el admin de la casa. Gente: recluta, entrena, último día. Contratos. Nómina.',
        'Dinero entra, dinero sale. Las apps de finanzas se quedan privadas. Igual las de admin, empleados y equipo. Sustituyeron un nb-app que ya casi no abrimos.',
        'Stack: Notion, Supabase, y lo que vamos escribiendo. No es un producto público. El software que la casa no trajo.',
      ],
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
    const lcd = document.getElementById('printer-lcd');
    if (lcd) lcd.textContent = unlocked ? LCD[lang].courtesy : LCD[lang].ready;
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

function courtesyHtml() {
  const code = String.fromCharCode(67, 65, 82, 84, 65);
  if (lang === 'es') {
    return `
      <p class="meta">Cortesía · Natural Balance</p>
      <h2>${code}</h2>
      <p>Envío gratis en tu siguiente pedido. Póntelo en el checkout de naturalbalance.club. Shopify tiene que poner el envío en cero.</p>
      <p>Un uso por cliente. Cien códigos en total. No se combina con otros descuentos. Si ya usaste uno en esa cuenta, este no va a pasar.</p>
      <p>Si el envío sigue cobrándose, el código no aplicó: bájalo, vuélvelo a escribir, y confirma que el carrito es un pedido a domicilio.</p>
      <p><a href="https://naturalbalance.club" target="_blank" rel="noopener">Pedir en naturalbalance.club</a></p>
      <span class="code">${code}</span>
    `;
  }
  return `
    <p class="meta">Courtesy · Natural Balance</p>
    <h2>${code}</h2>
    <p>Free delivery on your next order. Enter it at checkout on naturalbalance.club. Shopify should zero out shipping.</p>
    <p>One use per customer. One hundred codes. It will not stack with other discounts. If that account already used one, this one will fail.</p>
    <p>If shipping is still charged, the code didn’t apply: remove it, type it again, and make sure the cart is a delivery order.</p>
    <p><a href="https://naturalbalance.club" target="_blank" rel="noopener">Order at naturalbalance.club</a></p>
    <span class="code">${code}</span>
  `;
}

function receiptHtml(key) {
  if (key === 'courtesy') return courtesyHtml();
  const p = PRINTS[key];
  const title = typeof p.title === 'string' ? p.title : p.title[lang];
  const paras = (p.paras[lang] || []).map((t) => `<p>${t}</p>`).join('');
  const link = p.href
    ? `<p><a href="${p.href}" target="_blank" rel="noopener">${p.link}</a></p>`
    : '';
  return `
    <p class="meta">${p.meta[lang]}</p>
    <h2>${title}</h2>
    ${paras}
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
  else setTimeout(show, 180);
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
  const lcd = document.getElementById('printer-lcd');
  if (lcd) lcd.textContent = LCD[lang].courtesy;
}
