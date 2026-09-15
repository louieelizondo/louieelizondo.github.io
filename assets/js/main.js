const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const LCD = {
  en: { ready: 'READY', print: 'PRINTING…', courtesy: 'COURTESY', snd: 'SND', mute: 'MUTE' },
  es: { ready: 'LISTO', print: 'IMPRIMIENDO…', courtesy: 'CORTESÍA', snd: 'SON', mute: 'MUTE' },
};

let lang = root.lang === 'es' ? 'es' : 'en';
const printed = new Set();
let lidHits = 0;
let ticketNo = 0;
let unlocked = sessionStorage.getItem('le-egg') === '1';
let muted = localStorage.getItem('le-sound') === 'off';
let audioCtx = null;
let printTimer = 0;

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
  paintMute();
  const receipt = document.getElementById('receipt');
  if (receipt && !receipt.hidden && receipt.dataset.print) {
    spit(receipt.dataset.print, { silent: true, instant: true });
  }
  if (!document.getElementById('printer')?.dataset.busy) {
    const lcd = document.getElementById('printer-lcd');
    if (lcd) lcd.textContent = unlocked && receipt?.dataset.print === 'courtesy'
      ? LCD[lang].courtesy
      : LCD[lang].ready;
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

function paintMute() {
  const btn = document.getElementById('printer-mute');
  const printer = document.getElementById('printer');
  if (!btn || !printer) return;
  printer.dataset.muted = String(muted);
  btn.setAttribute('aria-pressed', String(muted));
  btn.textContent = muted ? LCD[lang].mute : LCD[lang].snd;
}

document.getElementById('printer-mute')?.addEventListener('click', () => {
  muted = !muted;
  localStorage.setItem('le-sound', muted ? 'off' : 'on');
  paintMute();
});

function stamp() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Chihuahua',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t)?.value || '';
  return { date: `${get('day')}/${get('month')}/${get('year')}`, time: `${get('hour')}:${get('minute')}` };
}

function bars(seed) {
  const bits = [];
  let n = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  for (let i = 0; i < 42; i += 1) {
    n = (n * 1103515245 + 12345) >>> 0;
    bits.push(`<i style="width:${1 + (n % 4)}px"></i>`);
  }
  return `<div class="bars" aria-hidden="true">${bits.join('')}</div>`;
}

function rule() {
  return `<p class="rule">${'–'.repeat(34)}</p>`;
}

function row(qty, name, val) {
  return `<div class="row"><span>${qty}</span><span>${name}</span><span>${val}</span></div>`;
}

function tot(left, right) {
  return `<div class="row wide tot"><span>${left}</span><span>${right}</span></div>`;
}

function head(title, sub, no) {
  const { date, time } = stamp();
  const tkt = String(no).padStart(3, '0');
  return `
    <p class="center">${title}</p>
    <p class="center">${sub}</p>
    <p class="center">CHIHUAHUA, MX</p>
    ${rule()}
    <div class="row wide"><span>TKT ${tkt}</span><span>${date}</span></div>
    <div class="row wide"><span>REG 01  LOUIE</span><span>${time}</span></div>
    ${rule()}
  `;
}

function receiptHtml(key, no) {
  const es = lang === 'es';
  const code = String.fromCharCode(67, 65, 82, 84, 65);

  if (key === 'house') {
    return `
      ${head('NATURAL BALANCE', 'naturalbalance.club', no)}
      ${row('1', es ? 'Comida de casa / semana' : 'Homestyle week', es ? 'POR QUÉ' : 'WHY')}
      ${row('50+', es ? 'Platillos en el menú' : 'Plates on the menu', '#')}
      ${row('1', es ? 'Tienda Shopify' : 'Shopify storefront', '$')}
      ${row('∞', es ? 'Familias sin tiempo' : 'Families w/ no time', '✓')}
      ${tot(es ? 'SUB' : 'SUB', es ? 'LA CASA' : 'THE HOUSE')}
      ${tot(es ? 'IVA' : 'TAX', es ? 'TODO LO DEMÁS' : 'EVERYTHING ELSE')}
      ${tot('TOTAL', es ? 'EXISTIMOS' : 'WE EXIST')}
      ${rule()}
      <p class="center">${es ? 'PAGADO  SHOPIFY' : 'PAID  SHOPIFY'}</p>
      <p class="center">${es ? 'CAMBIO  EL RESTO DE LOS PROYECTOS' : 'CHANGE  THE REST OF THE WORK'}</p>
      ${bars(`nb-${no}`)}
      <p class="center"><a href="https://naturalbalance.club" target="_blank" rel="noopener">naturalbalance.club</a></p>
    `;
  }

  if (key === 'restauranteros') {
    return `
      ${head('RESTAURANTEROS', 'CANACO CHIH.', no)}
      <p class="center">${es ? 'MESA ABIERTA  ·  SE DIVIDE N' : 'OPEN TAB  ·  SPLIT N WAYS'}</p>
      ${rule()}
      ${row('1', es ? 'Juntas' : 'Meetings', '1')}
      ${row('1', es ? 'Eventos' : 'Events', '1')}
      ${row('1', 'Donde Comemos', es ? 'PÚBLICO' : 'PUBLIC')}
      ${row('1', es ? 'Dashboard socios' : 'Members dashboard', es ? 'PEDIDO' : 'ON ORDER')}
      ${tot(es ? 'SUB' : 'SUB', es ? 'LA SECCIÓN' : 'THE SECTION')}
      ${tot('TOTAL', es ? 'EL GRUPO' : 'THE TABLE')}
      ${rule()}
      <p class="center">${es ? 'NO ES LA CIUDAD. ES LA MESA.' : 'NOT THE CITY. THE TABLE.'}</p>
      ${bars(`canaco-${no}`)}
      <p class="center"><a href="https://canacorestauranteroscuu.github.io/Restaurantes/dondecomemos.html" target="_blank" rel="noopener">Donde Comemos</a></p>
    `;
  }

  if (key === 'office') {
    return `
      ${head(es ? 'OFICINA / CIERRE' : 'OFFICE / CLOSE', es ? 'NO ES PARA PISO' : 'NOT FOR THE FLOOR', no)}
      <span class="void">VOID</span>
      ${row('1', es ? 'Recluta → último día' : 'Recruit → last day', 'RH')}
      ${row('1', es ? 'Contratos' : 'Contracts', 'RH')}
      ${row('1', 'Nómina', '$')}
      ${row('1', es ? 'Dinero entra' : 'Money in', '+')}
      ${row('1', es ? 'Dinero sale' : 'Money out', '−')}
      ${row('3', es ? 'Apps admin/equipo' : 'Admin/team apps', 'PRIV')}
      ${tot(es ? 'SUB' : 'SUB', 'NOTION+SUPABASE')}
      ${tot('TOTAL', 'ADMIN')}
      ${rule()}
      <p class="center">${es ? 'SIN CAMBIO  ·  NO PÚBLICO' : 'NO CHANGE  ·  NOT PUBLIC'}</p>
      ${bars(`office-${no}`)}
    `;
  }

  return `
    ${head('NATURAL BALANCE', es ? 'CORTESÍA / ENVÍO' : 'COURTESY / SHIPPING', no)}
    ${row('1', es ? 'Envío a domicilio' : 'Home delivery', '0.00')}
    ${row('1', es ? 'Código de un uso' : 'One-time code', '1/100')}
    ${tot(es ? 'ENVÍO' : 'SHIPPING', '0.00')}
    ${tot('TOTAL', '0.00')}
    ${rule()}
    <p class="center">${es ? 'NO COMBINA CON OTROS DTOS' : 'WILL NOT STACK'}</p>
    <p class="center">${es ? '1 POR CLIENTE  ·  100 EN TOTAL' : '1 PER CUSTOMER  ·  100 TOTAL'}</p>
    <p class="center">${es ? 'Si Shopify cobra envío: quita el código, escríbelo otra vez, pide a domicilio.' : 'If shipping still charges: remove the code, type it again, choose delivery.'}</p>
    <span class="code">${code}</span>
    ${bars(`carta-${no}`)}
    <p class="center"><a href="https://naturalbalance.club" target="_blank" rel="noopener">naturalbalance.club</a></p>
  `;
}

function playPrintSound() {
  if (muted || reduceMotion) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  audioCtx = audioCtx || new AC();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const ctx = audioCtx;
  const t0 = ctx.currentTime;
  const dur = 1.55;

  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * 0.22;
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 2800;
  noiseFilter.Q.value = 0.7;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, t0);
  noiseGain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.05);
  noiseGain.gain.setValueAtTime(0.14, t0 + dur - 0.12);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(t0);
  noise.stop(t0 + dur);

  for (let i = 0; i < 28; i += 1) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 48 + (i % 3) * 7;
    const start = t0 + 0.04 + i * 0.052;
    g.gain.setValueAtTime(0.05, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.04);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.045);
  }

  const snip = ctx.createOscillator();
  const sg = ctx.createGain();
  snip.type = 'triangle';
  snip.frequency.setValueAtTime(900, t0 + dur - 0.08);
  snip.frequency.exponentialRampToValueAtTime(180, t0 + dur);
  sg.gain.setValueAtTime(0.08, t0 + dur - 0.08);
  sg.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  snip.connect(sg);
  sg.connect(ctx.destination);
  snip.start(t0 + dur - 0.08);
  snip.stop(t0 + dur + 0.02);
}

function spit(key, { silent = false, instant = false } = {}) {
  const printer = document.getElementById('printer');
  const receipt = document.getElementById('receipt');
  const lcd = document.getElementById('printer-lcd');
  if (printTimer) window.clearTimeout(printTimer);

  if (!instant) ticketNo += 1;
  const no = ticketNo || 1;

  printer.dataset.busy = instant ? 'false' : 'true';
  lcd.textContent = instant ? LCD[lang].ready : LCD[lang].print;
  receipt.hidden = false;
  receipt.dataset.print = key;
  receipt.classList.remove('is-out', 'is-printing');
  receipt.innerHTML = receiptHtml(key, no);
  void receipt.offsetHeight;

  document.querySelectorAll('.printer-key').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.print === key));
  });

  const finish = () => {
    printer.dataset.busy = 'false';
    lcd.textContent = key === 'courtesy' ? LCD[lang].courtesy : LCD[lang].ready;
    receipt.classList.remove('is-printing');
  };

  if (reduceMotion || instant) {
    receipt.classList.add('is-out');
    finish();
    return;
  }

  if (!silent) playPrintSound();
  receipt.classList.add('is-printing', 'is-out');
  receipt.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  printTimer = window.setTimeout(finish, 1650);
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
paintMute();
