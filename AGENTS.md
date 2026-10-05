# AGENTS.md

## Cursor Cloud specific instructions

This repository is a **static website** with no build system, package manager, or dependencies. It contains:

- `index.html` — personal portfolio page ("Louie Elizondo — Builder").
- `nomina.html` — interactive Mexican payroll cash-denomination breakdown calculator (vanilla JS, no dependencies).
- `louie.jpg` / `louie.jpeg` — image assets used by the pages.

### Running locally

There is nothing to install. Serve the directory with any static file server, e.g.:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000/index.html` or `http://localhost:8000/nomina.html`.

### Notes

- All JavaScript is inline in the HTML files; there is no bundler, transpiler, or hot reload. Edit the HTML and refresh the browser.
- There are no automated tests, linters, or build commands configured.
- Fonts are loaded from Google Fonts CDN, so they require internet access to render exactly as designed (the pages still work offline with fallback fonts).
