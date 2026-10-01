(function () {
  "use strict";

  const STORAGE_KEY = "le-lang";
  const entries = Array.from(document.querySelectorAll(".ledger-entry"));
  let openEntry = null;
  let hoverTimer = null;
  let hoverOpened = false;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  function getLang() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "es" || stored === "en") return stored;
    return "en";
  }

  function applyLang(lang) {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-en][data-es]").forEach((el) => {
      const text = el.getAttribute(`data-${lang}`);
      if (text != null) {
        if (el.hasAttribute("data-i18n-attr")) {
          el.setAttribute(el.getAttribute("data-i18n-attr"), text);
        } else {
          el.textContent = text;
        }
      }
    });
    document.querySelectorAll(".lang-toggle button").forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.dataset.lang === lang ? "true" : "false");
    });
    window.dispatchEvent(new CustomEvent("le-lang-change", { detail: { lang } }));
  }

  function setLang(lang) {
    localStorage.setItem(STORAGE_KEY, lang);
    applyLang(lang);
  }

  document.querySelectorAll(".lang-toggle button").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });

  applyLang(getLang());

  function closeEntry(entry, { immediate } = {}) {
    if (!entry) return;
    entry.classList.remove("is-open");
    const btn = entry.querySelector(".ledger-entry__header");
    if (btn) btn.setAttribute("aria-expanded", "false");
    if (openEntry === entry) openEntry = null;
    hoverOpened = false;
  }

  function openEntryPanel(entry) {
    if (openEntry && openEntry !== entry) {
      closeEntry(openEntry);
    }
    entry.classList.add("is-open");
    const btn = entry.querySelector(".ledger-entry__header");
    if (btn) btn.setAttribute("aria-expanded", "true");
    openEntry = entry;
  }

  function toggleEntry(entry) {
    if (entry.classList.contains("is-open")) {
      closeEntry(entry);
    } else {
      openEntryPanel(entry);
    }
  }

  entries.forEach((entry) => {
    const btn = entry.querySelector(".ledger-entry__header");
    const panelId = entry.querySelector(".ledger-entry__panel")?.id;
    if (!btn || !panelId) return;
    btn.setAttribute("aria-controls", panelId);
    btn.setAttribute("aria-expanded", "false");

    btn.addEventListener("click", () => {
      hoverOpened = false;
      toggleEntry(entry);
    });

    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        hoverOpened = false;
        toggleEntry(entry);
      }
    });

    if (finePointer) {
      entry.addEventListener("mouseenter", () => {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => {
          hoverOpened = true;
          openEntryPanel(entry);
        }, parseCSSValue("--hover-intent", 120));
      });
      entry.addEventListener("mouseleave", () => {
        clearTimeout(hoverTimer);
        if (hoverOpened && openEntry === entry) {
          closeEntry(entry);
        }
      });
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      clearGardenHighlight();
      if (openEntry) closeEntry(openEntry);
    }
  });

  function parseCSSValue(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }

  let highlightDate = null;

  function clearGardenHighlight() {
    highlightDate = null;
    document.querySelectorAll(".ledger-line.is-highlighted").forEach((el) => {
      el.classList.remove("is-highlighted");
    });
    window.dispatchEvent(new CustomEvent("le-garden-clear"));
  }

  function highlightDateLines(iso) {
    clearGardenHighlight();
    highlightDate = iso;
    // Exact day (YYYY-MM-DD) matches first, then month-level lines (YYYY-MM).
    const exact = Array.from(document.querySelectorAll(`.ledger-line[data-date="${iso}"]`));
    const month = /^\d{4}-\d{2}-\d{2}$/.test(iso)
      ? Array.from(document.querySelectorAll(`.ledger-line[data-date="${iso.slice(0, 7)}"]`))
      : [];
    const lines = exact.concat(month);
    lines.forEach((line) => line.classList.add("is-highlighted"));
    return lines;
  }

  function openEntryForLine(line) {
    const entry = line.closest(".ledger-entry");
    if (entry) openEntryPanel(entry);
    return entry;
  }

  function scrollToLine(line) {
    const reduced = document.documentElement.classList.contains("reduced-motion");
    line.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  }

  window.LedgerSite = {
    getLang,
    highlightDateLines,
    clearGardenHighlight,
    openEntryForLine,
    openEntryPanel,
    scrollToLine,
    getHighlightDate: () => highlightDate,
  };

  const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
  function syncMotion() {
    document.documentElement.classList.toggle("reduced-motion", motionMq.matches);
  }
  motionMq.addEventListener("change", syncMotion);
  syncMotion();
})();
