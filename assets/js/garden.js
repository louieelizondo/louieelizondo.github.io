(function () {
  "use strict";

  const DATA_URL = "assets/data/contributions.json";
  const EVENTS_URL = "https://api.github.com/users/louieelizondo/events/public";
  const WEEKS_FULL = 53;
  const WEEKS_NARROW = 26;
  const CELL_MAX = 10;
  const GAP = 2;
  const MIN_WEEKS_FOR_MONTH_LABEL = 3;
  const MIN_COLUMNS_BETWEEN_LABELS = 3;

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
  let pointerClientX = 0;
  let pointerClientY = 0;
  let pointerFine = window.matchMedia("(pointer: fine)").matches;
  const SHIPPED_LIST_MAX = 5;
  let listenersActive = false;
  let layoutCell = CELL_MAX;
  let layoutGap = GAP;
  let fullWeeks = [];
  let resizeObserver = null;

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

  function weekHasMonth(week, month, year) {
    return week.some((d) => {
      const t = new Date(d.date + "T12:00:00");
      return t.getMonth() === month && t.getFullYear() === year;
    });
  }

  function countWeeksForMonth(weeks, month, year) {
    return weeks.reduce((n, w) => n + (weekHasMonth(w, month, year) ? 1 : 0), 0);
  }

  function firstWeekIndexForMonth(weeks, month, year) {
    for (let i = 0; i < weeks.length; i++) {
      if (weekHasMonth(weeks[i], month, year)) return i;
    }
    return -1;
  }

  function monthsPresent(weeks) {
    const map = new Map();
    weeks.forEach((week) => {
      week.forEach((d) => {
        const t = new Date(d.date + "T12:00:00");
        const key = `${t.getFullYear()}-${t.getMonth()}`;
        map.set(key, { month: t.getMonth(), year: t.getFullYear() });
      });
    });
    return Array.from(map.values());
  }

  function formatMonthLabel(month, year) {
    const fmt = new Intl.DateTimeFormat(locale(), { month: "short" });
    let text = fmt.format(new Date(year, month, 1));
    text = text.replace(/\.$/u, "");
    if (lang() === "es") text = text.toLowerCase();
    return text;
  }

  function monthLabelColumns(weeks) {
    const candidates = monthsPresent(weeks)
      .map(({ month, year }) => {
        const weeksInMonth = countWeeksForMonth(weeks, month, year);
        if (weeksInMonth < MIN_WEEKS_FOR_MONTH_LABEL) return null;
        const wi = firstWeekIndexForMonth(weeks, month, year);
        if (wi < 0) return null;
        const weeksFromStart = weeks.length - wi;
        if (weeksFromStart < MIN_WEEKS_FOR_MONTH_LABEL) return null;
        return {
          wi,
          text: formatMonthLabel(month, year),
          key: `${year}-${month}`,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.wi - b.wi || a.key.localeCompare(b.key));

    const seenWi = new Set();
    const unique = candidates.filter((c) => {
      if (seenWi.has(c.wi)) return false;
      seenWi.add(c.wi);
      return true;
    });

    const placed = [];
    let lastWi = -MIN_COLUMNS_BETWEEN_LABELS;
    unique.forEach((c) => {
      if (c.wi - lastWi < MIN_COLUMNS_BETWEEN_LABELS) return;
      placed.push(c);
      lastWi = c.wi;
    });
    return placed;
  }

  function positionMonthLabels(container, labels, grid) {
    const first = grid.querySelector('.garden-cell[data-week="0"][data-day="0"]');
    const second = grid.querySelector('.garden-cell[data-week="1"][data-day="0"]');
    if (!first || !second) return;
    const stepPx = second.getBoundingClientRect().left - first.getBoundingClientRect().left;
    labels.forEach((l) => {
      const span = container.querySelector(`.garden-month-label[data-wi="${l.wi}"]`);
      if (span) span.style.left = `${l.wi * stepPx}px`;
    });
  }

  function renderMonths(weeks, container, grid, labels) {
    container.innerHTML = "";
    const list = labels || monthLabelColumns(weeks);
    list.forEach((l) => {
      const span = document.createElement("span");
      span.className = "garden-month-label";
      span.dataset.wi = String(l.wi);
      span.textContent = l.text;
      container.appendChild(span);
    });
    requestAnimationFrame(() => positionMonthLabels(container, list, grid));
  }

  function computeLayout(weekCount) {
    const width = mount.clientWidth;
    layoutGap = GAP;
    layoutCell = (width - (weekCount - 1) * layoutGap) / weekCount;
    mount.style.setProperty("--garden-cell", `${layoutCell}px`);
    mount.style.setProperty("--garden-gap", `${layoutGap}px`);
    return layoutCell;
  }

  function applyColumnTemplate(el, weekCount) {
    el.style.width = "100%";
    el.style.gridTemplateColumns = `repeat(${weekCount}, minmax(0, 1fr))`;
    el.style.gap = `${layoutGap}px`;
  }

  function visibleWeeks() {
    const mq = window.matchMedia("(max-width: 640px)");
    return mq.matches ? fullWeeks.slice(-WEEKS_NARROW) : fullWeeks;
  }

  function renderGrid(weeks) {
    mount.innerHTML = "";
    const scroll = document.createElement("div");
    scroll.className = "garden-scroll";
    scroll.id = "garden-scroll";

    const layout = document.createElement("div");
    layout.className = "garden-layout";

    const months = document.createElement("div");
    months.className = "garden-months";

    const grid = document.createElement("div");
    grid.className = "garden-grid";
    grid.setAttribute("role", "grid");
    grid.setAttribute("aria-label", lang() === "es" ? "Contribuciones" : "Contributions");
    grid.tabIndex = 0;

    mount.classList.remove("garden-ready");
    computeLayout(weeks.length);
    applyColumnTemplate(grid, weeks.length);

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

    renderMonths(weeks, months, grid);
    layout.appendChild(months);
    layout.appendChild(grid);
    scroll.appendChild(layout);
    mount.appendChild(scroll);

    gridWeeks = weeks.length;
    setupGridInteractions(grid, scroll);
    runIntro(grid);
    setupNarrowScroll(scroll, weeks.length);
  }

  function setupNarrowScroll(scroll, weekCount) {
    const mq = window.matchMedia("(max-width: 640px)");
    function apply() {
      scroll.scrollLeft = 0;
      if (mq.matches && fullWeeks.length > WEEKS_NARROW) {
        const offset = (weekCount - WEEKS_NARROW) * (layoutCell + layoutGap);
        scroll.scrollLeft = Math.max(0, offset);
      }
    }
    apply();
    scroll._narrowApply = apply;
  }

  let relayoutFrame = 0;
  function relayoutGarden() {
    if (!fullWeeks.length) return;
    cancelAnimationFrame(relayoutFrame);
    relayoutFrame = requestAnimationFrame(() => {
      renderGrid(visibleWeeks());
    });
  }

  function runIntro(grid) {
    if (reducedMotion) {
      introDone = true;
      mount.classList.add("garden-ready");
      return;
    }
    grid.classList.add("garden-intro");
    const duration =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--garden-intro")) || 600;
    const cellDur =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dur-cell")) || 140;
    const maxIdx = Math.max(1, ...cells.map((c) => c.wi + c.di));
    const k = Math.max(0, (duration - cellDur) / maxIdx);
    cells.forEach((c) => {
      const delay = (c.wi + c.di) * k;
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
        c.el.style.transform = "";
        c.el.style.opacity = "";
      });
      mount.classList.add("garden-ready");
      introDone = true;
    }, duration + 40);
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

    if (pointerFine) {
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

  function applyPointerField(clientX, clientY) {
    if (!listenersActive || !introDone || reducedMotion) return;
    let nearest = cells[0];
    let nearestDist = Infinity;
    cells.forEach((c) => {
      const r = c.el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const d = Math.hypot(clientX - cx, clientY - cy);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = c;
      }
    });
    const col = nearest?.wi ?? 0;
    const row = nearest?.di ?? 0;
    const radius =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--garden-radius")) || 3;
    cells.forEach((c) => {
      const dx = c.wi - col;
      const dy = c.di - row;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.55) {
        c.el.classList.add("is-field-active");
        c.el.style.transform = "scale(1.35)";
        c.el.style.opacity = "1";
        showTooltip(c.el, c.day);
      } else if (dist <= radius) {
        c.el.classList.remove("is-field-active");
        const t = 1 - dist / radius;
        const scale = 1 - t * 0.2;
        c.el.style.transform = `scale(${scale})`;
        c.el.style.opacity = String(0.85 + t * 0.15);
      } else {
        c.el.classList.remove("is-field-active");
        c.el.style.transform = "scale(1)";
        c.el.style.opacity = "1";
      }
    });
  }

  function onPointerMove(e, grid) {
    if (!introDone || reducedMotion) return;
    pointerClientX = e.clientX;
    pointerClientY = e.clientY;
    if (rafPointer) return;
    rafPointer = requestAnimationFrame(() => {
      rafPointer = null;
      applyPointerField(pointerClientX, pointerClientY);
    });
  }

  function resetCellScales() {
    cells.forEach((c) => {
      c.el.classList.remove("is-field-active");
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

  function githubDayUrl(iso) {
    return `https://github.com/louieelizondo?tab=overview&from=${iso}&to=${iso}`;
  }

  function showDayCard(day) {
    if (!dayCard) return;
    dayCard.replaceChildren();
    const inner = document.createElement("div");
    inner.className = "garden-day-card__inner";
    const h = document.createElement("h3");
    h.textContent = formatDayLong(day.date, day.count || 0);
    inner.appendChild(h);
    const shipped = day.shipped || [];
    if (shipped.length) {
      const ul = document.createElement("ul");
      const shown = shipped.slice(0, SHIPPED_LIST_MAX);
      shown.forEach((s) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = s.url;
        a.textContent = s.message;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        li.appendChild(a);
        ul.appendChild(li);
      });
      inner.appendChild(ul);
      const rest = shipped.length - shown.length;
      if (rest > 0) {
        const more = document.createElement("p");
        more.className = "garden-day-card__more";
        const link = document.createElement("a");
        link.href = githubDayUrl(day.date);
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        if (lang() === "es") {
          link.textContent = `+${rest} más en GitHub`;
        } else {
          link.textContent = `+${rest} more on GitHub`;
        }
        more.appendChild(link);
        inner.appendChild(more);
      }
    } else {
      const p = document.createElement("p");
      p.dataset.en = "No public commits";
      p.dataset.es = "Sin commits públicos";
      p.textContent = p.dataset[lang()] || p.dataset.en;
      inner.appendChild(p);
    }
    dayCard.appendChild(inner);
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
    const monthsEl = mount.querySelector(".garden-months");
    const gridEl = mount.querySelector(".garden-grid");
    const weeks = visibleWeeks();
    if (monthsEl && gridEl && weeks.length) renderMonths(weeks, monthsEl, gridEl);
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
    fullWeeks = buildWeeks(allDays);
    renderGrid(visibleWeeks());

    const mq = window.matchMedia("(max-width: 640px)");
    mq.addEventListener("change", relayoutGarden);

    resizeObserver = new ResizeObserver(() => relayoutGarden());
    resizeObserver.observe(mount);
  })();
})();
