(function () {
  "use strict";

  const DATA_URL = "assets/data/contributions.json";
  const EVENTS_URL = "https://api.github.com/users/louieelizondo/events/public";
  const WEEKS_FULL = 53;
  const WEEKS_NARROW = 26;
  const CELL = 10;
  const GAP = 2;

  const mount = document.getElementById("commit-garden");
  const totalEl = document.getElementById("garden-total");
  const staticSummary = document.getElementById("garden-static-summary");
  const chip = document.getElementById("garden-chip");
  const chipLabel = document.getElementById("garden-chip-label");
  const chipClear = document.getElementById("garden-chip-clear");
  const dayCard = document.getElementById("garden-day-card");
  const tooltip = document.getElementById("garden-tooltip");

  if (!mount) return;

  let daysByDate = new Map();
  let gridWeeks = WEEKS_FULL;
  let cells = [];
  let focusedIndex = 0;
  let generatedAt = null;
  let reducedMotion = false;
  let introDone = false;
  let rafPointer = null;
  let pointerFine = window.matchMedia("(pointer: fine)").matches;
  let listenersActive = false;

  const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
  motionMq.addEventListener("change", () => {
    reducedMotion = motionMq.matches;
    document.documentElement.classList.toggle("reduced-motion", reducedMotion);
  });
  reducedMotion = motionMq.matches;

  function lang() {
    return window.LedgerSite?.getLang?.() || document.documentElement.lang || "en";
  }

  function locale() {
    return lang() === "es" ? "es-MX" : "en-US";
  }

  function formatDayLong(iso, count) {
    const d = new Date(iso + "T12:00:00");
    const label = d.toLocaleDateString(locale(), { day: "numeric", month: "long", year: "numeric" });
    const contrib =
      lang() === "es"
        ? `${count} contribución${count === 1 ? "" : "es"}`
        : `${count} contribution${count === 1 ? "" : "s"}`;
    return `${label}, ${contrib}`;
  }

  function formatDayShort(iso, count) {
    const d = new Date(iso + "T12:00:00");
    const mon = d.toLocaleDateString(locale(), { month: "short", day: "numeric" });
    return `${mon} · ${count}`;
  }

  function levelFromCount(n) {
    if (n <= 0) return 0;
    if (n <= 2) return 1;
    if (n <= 5) return 2;
    if (n <= 8) return 3;
    return 4;
  }

  function buildWeeks(dayList) {
    if (!dayList.length) return [];
    const sorted = [...dayList].sort((a, b) => a.date.localeCompare(b.date));
    const first = new Date(sorted[0].date + "T12:00:00");
    const start = new Date(first);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const last = new Date(sorted[sorted.length - 1].date + "T12:00:00");
    const weeks = [];
    let cursor = new Date(start);
    while (cursor <= last || weeks.length < WEEKS_FULL) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const iso = cursor.toISOString().slice(0, 10);
        const rec = daysByDate.get(iso) || { date: iso, count: 0, level: 0, shipped: [] };
        week.push(rec);
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
      if (weeks.length >= WEEKS_FULL && cursor > last) break;
    }
    while (weeks.length < WEEKS_FULL) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const iso = cursor.toISOString().slice(0, 10);
        week.push(daysByDate.get(iso) || { date: iso, count: 0, level: 0, shipped: [] });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks.slice(-WEEKS_FULL);
  }

  function mergeEventTopUp(events) {
    if (!generatedAt || !Array.isArray(events)) return;
    const genTime = new Date(generatedAt).getTime();
    events.forEach((ev) => {
      const created = new Date(ev.created_at).getTime();
      if (created <= genTime) return;
      if (ev.type !== "PushEvent") return;
      const repo = ev.repo?.name;
      if (!repo) return;
      const day = ev.created_at.slice(0, 10);
      const payload = ev.payload || {};
      const commits = payload.commits || [];
      const existing = daysByDate.get(day) || {
        date: day,
        count: 0,
        level: 0,
        shipped: [],
      };
      const addCount = commits.length || 1;
      existing.count += addCount;
      existing.level = levelFromCount(existing.count);
      commits.forEach((c) => {
        const msg = (c.message || "").split("\n", 1)[0];
        if (!msg) return;
        existing.shipped.push({
          repo,
          message: msg,
          url: `https://github.com/${repo}/commit/${c.sha}`,
        });
      });
      daysByDate.set(day, existing);
    });
  }

  async function loadData() {
    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error("bad status");
      const data = await res.json();
      generatedAt = data.generated;
      (data.days || []).forEach((d) => daysByDate.set(d.date, { ...d, shipped: d.shipped || [] }));
      try {
        const evRes = await fetch(EVENTS_URL);
        if (evRes.ok) {
          const events = await evRes.json();
          mergeEventTopUp(events);
        }
      } catch {
        /* keep JSON */
      }
      return data;
    } catch {
      return null;
    }
  }

  function showEmpty() {
    mount.innerHTML = "";
    const p = document.createElement("p");
    p.className = "garden-empty";
    p.dataset.en = "Contribution garden unavailable.";
    p.dataset.es = "Jardín de contribuciones no disponible.";
    p.textContent = p.dataset[lang()] || p.dataset.en;
    mount.appendChild(p);
    if (totalEl) totalEl.hidden = true;
  }

  function updateTotal(data) {
    if (!totalEl) return;
    let total = data?.total;
    if (total == null) {
      total = 0;
      daysByDate.forEach((d) => {
        total += d.count || 0;
      });
    }
    const en = `<strong>${total}</strong> contributions in the last year`;
    const es = `<strong>${total}</strong> contribuciones en el último año`;
    totalEl.innerHTML = lang() === "es" ? es : en;
    if (staticSummary) {
      staticSummary.textContent =
        lang() === "es"
          ? `${total} contribuciones en el último año (vista estática).`
          : `${total} contributions in the last year (static view).`;
    }
  }

  function renderMonths(weeks, container) {
    container.innerHTML = "";
    const monthFmt = new Intl.DateTimeFormat(locale(), { month: "short" });
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const sunday = week[0]?.date;
      if (!sunday) return;
      const m = new Date(sunday + "T12:00:00").getMonth();
      const span = document.createElement("span");
      span.style.gridColumn = `${wi + 1}`;
      if (m !== lastMonth) {
        span.textContent = monthFmt.format(new Date(sunday + "T12:00:00"));
        lastMonth = m;
      }
      container.appendChild(span);
    });
  }

  function renderGrid(weeks) {
    const scroll = document.createElement("div");
    scroll.className = "garden-scroll";
    scroll.id = "garden-scroll";

    const months = document.createElement("div");
    months.className = "garden-months";
    months.style.gridTemplateColumns = `repeat(${weeks.length}, ${CELL}px)`;

    const grid = document.createElement("div");
    grid.className = "garden-grid";
    grid.setAttribute("role", "grid");
    grid.setAttribute("aria-label", lang() === "es" ? "Contribuciones" : "Contributions");
    grid.tabIndex = 0;
    grid.style.gridTemplateColumns = `repeat(${weeks.length}, ${CELL}px)`;

    cells = [];
    weeks.forEach((week, wi) => {
      week.forEach((day, di) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "garden-cell";
        btn.setAttribute("role", "gridcell");
        btn.dataset.date = day.date;
        btn.dataset.week = String(wi);
        btn.dataset.day = String(di);
        btn.dataset.level = String(day.level ?? levelFromCount(day.count || 0));
        btn.setAttribute("aria-label", formatDayLong(day.date, day.count || 0));
        btn.tabIndex = -1;
        const idx = cells.length;
        btn.dataset.index = String(idx);
        btn.addEventListener("click", () => activateDay(day.date));
        btn.addEventListener("focus", () => {
          focusedIndex = idx;
          showTooltip(btn, day);
        });
        grid.appendChild(btn);
        cells.push({ el: btn, day, wi, di });
      });
    });

    renderMonths(weeks, months);
    scroll.appendChild(months);
    scroll.appendChild(grid);
    mount.innerHTML = "";
    mount.appendChild(scroll);

    setupGridInteractions(grid, scroll);
    runIntro(grid);
    setupNarrowScroll(scroll, weeks.length);
  }

  function setupNarrowScroll(scroll, weekCount) {
    const mq = window.matchMedia("(max-width: 640px)");
    function apply() {
      if (mq.matches && weekCount > WEEKS_NARROW) {
        const offset = (weekCount - WEEKS_NARROW) * (CELL + GAP);
        scroll.scrollLeft = offset;
      }
    }
    mq.addEventListener("change", apply);
    apply();
  }

  function runIntro(grid) {
    if (reducedMotion) {
      introDone = true;
      return;
    }
    grid.classList.add("garden-intro");
    const duration = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--garden-intro")) || 600;
    cells.forEach((c, i) => {
      const delay = ((c.wi + c.di) / (WEEKS_FULL + 6)) * duration;
      c.el.style.transitionDelay = `${delay}ms`;
    });
    requestAnimationFrame(() => {
      cells.forEach((c) => {
        c.el.style.transform = "scale(1)";
        c.el.style.opacity = "1";
      });
    });
    setTimeout(() => {
      grid.classList.remove("garden-intro");
      cells.forEach((c) => {
        c.el.style.transitionDelay = "";
      });
      introDone = true;
    }, duration + 80);
  }

  function showTooltip(btn, day) {
    if (!tooltip) return;
    tooltip.textContent = formatDayShort(day.date, day.count || 0);
    tooltip.classList.add("is-visible");
    const rect = btn.getBoundingClientRect();
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    tooltip.style.top = `${rect.bottom + window.scrollY + 6}px`;
  }

  function hideTooltip() {
    tooltip?.classList.remove("is-visible");
  }

  function setupGridInteractions(grid, scroll) {
    grid.addEventListener("keydown", (e) => {
      const c = cells[focusedIndex];
      if (!c) return;
      let wi = c.wi;
      let di = c.di;
      if (e.key === "ArrowRight") wi = Math.min(c.wi + 1, gridWeeks - 1);
      else if (e.key === "ArrowLeft") wi = Math.max(c.wi - 1, 0);
      else if (e.key === "ArrowDown") di = Math.min(c.di + 1, 6);
      else if (e.key === "ArrowUp") di = Math.max(c.di - 1, 0);
      else if (e.key === "Home") wi = 0;
      else if (e.key === "End") wi = gridWeeks - 1;
      else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activateDay(c.day.date);
        return;
      } else return;
      e.preventDefault();
      const next = cells.find((x) => x.wi === wi && x.di === di);
      if (next) focusCell(next);
    });

    grid.addEventListener("focus", () => {
      if (cells[focusedIndex]) focusCell(cells[focusedIndex], true);
    });

    grid.addEventListener("blur", hideTooltip);

    if (pointerFine && !reducedMotion) {
      grid.addEventListener("pointermove", (e) => onPointerMove(e, grid));
      grid.addEventListener("pointerleave", resetCellScales);
    }

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((en) => en.isIntersecting);
        listenersActive = visible;
        if (!visible) resetCellScales();
      },
      { threshold: 0.05 }
    );
    io.observe(grid);
  }

  function focusCell(cell, fromGrid) {
    cells.forEach((c) => {
      c.el.tabIndex = -1;
    });
    cell.el.tabIndex = 0;
    if (!fromGrid) cell.el.focus();
    focusedIndex = cells.indexOf(cell);
    showTooltip(cell.el, cell.day);
  }

  function onPointerMove(e, grid) {
    if (!listenersActive || !introDone || reducedMotion) return;
    if (rafPointer) return;
    rafPointer = requestAnimationFrame(() => {
      rafPointer = null;
      const rect = grid.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const col = Math.floor(x / (CELL + GAP));
      const row = Math.floor(y / (CELL + GAP));
      const radius =
        parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--garden-radius")) || 3;
      cells.forEach((c) => {
        const dx = c.wi - col;
        const dy = c.di - row;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.5) {
          c.el.style.transform = "scale(1.35)";
          c.el.style.opacity = "1";
          showTooltip(c.el, c.day);
        } else if (dist <= radius) {
          const t = 1 - dist / radius;
          const scale = 1 - t * 0.2;
          c.el.style.transform = `scale(${scale})`;
          c.el.style.opacity = String(0.85 + t * 0.15);
        } else {
          c.el.style.transform = "scale(1)";
          c.el.style.opacity = "1";
        }
      });
    });
  }

  function resetCellScales() {
    cells.forEach((c) => {
      c.el.style.transform = "";
      c.el.style.opacity = "";
    });
    hideTooltip();
  }

  function showChip(iso, count) {
    if (!chip || !chipLabel) return;
    chipLabel.textContent =
      (lang() === "es" ? "Mostrando " : "Showing ") + formatDayShort(iso, count);
    chip.classList.add("is-visible");
  }

  function hideChip() {
    chip?.classList.remove("is-visible");
    dayCard?.classList.remove("is-visible");
    dayCard?.replaceChildren();
  }

  function showDayCard(day) {
    if (!dayCard) return;
    dayCard.replaceChildren();
    const h = document.createElement("h3");
    h.textContent = formatDayLong(day.date, day.count || 0);
    dayCard.appendChild(h);
    const shipped = day.shipped || [];
    if (shipped.length) {
      const ul = document.createElement("ul");
      shipped.forEach((s) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = s.url;
        a.textContent = s.message;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        li.appendChild(a);
        ul.appendChild(li);
      });
      dayCard.appendChild(ul);
    } else {
      const p = document.createElement("p");
      p.dataset.en = "No public commits";
      p.dataset.es = "Sin commits públicos";
      p.textContent = p.dataset[lang()] || p.dataset.en;
      dayCard.appendChild(p);
    }
    dayCard.classList.add("is-visible");
  }

  function activateDay(iso) {
    const day = daysByDate.get(iso) || { date: iso, count: 0, level: 0, shipped: [] };
    const lines = window.LedgerSite?.highlightDateLines?.(iso) || [];
    hideChip();
    hideDayCard();

    if (lines.length) {
      const first = lines[0];
      window.LedgerSite?.openEntryForLine?.(first);
      window.LedgerSite?.scrollToLine?.(first);
      first.setAttribute("tabindex", "-1");
      first.focus({ preventScroll: true });
      showChip(iso, day.count || 0);
    } else {
      showDayCard(day);
      showChip(iso, day.count || 0);
    }
  }

  function hideDayCard() {
    dayCard?.classList.remove("is-visible");
  }

  chipClear?.addEventListener("click", () => {
    window.LedgerSite?.clearGardenHighlight?.();
    hideChip();
  });

  window.addEventListener("le-garden-clear", hideChip);
  window.addEventListener("le-lang-change", () => {
    const data = { total: null };
    updateTotal(data);
    cells.forEach((c) => {
      c.el.setAttribute("aria-label", formatDayLong(c.day.date, c.day.count || 0));
    });
    if (window.LedgerSite?.getHighlightDate?.()) {
      const iso = window.LedgerSite.getHighlightDate();
      const day = daysByDate.get(iso);
      if (day) showChip(iso, day.count || 0);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideChip();
  });

  (async function init() {
    const data = await loadData();
    if (!data || !daysByDate.size) {
      showEmpty();
      return;
    }
    updateTotal(data);
    const allDays = Array.from(daysByDate.values());
    const weeks = buildWeeks(allDays);
    gridWeeks = weeks.length;
    const mq = window.matchMedia("(max-width: 640px)");
    const weeksToShow = mq.matches ? weeks.slice(-WEEKS_NARROW) : weeks;
    renderGrid(weeksToShow);
  })();
})();
