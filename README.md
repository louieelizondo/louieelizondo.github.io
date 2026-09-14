# louieelizondo.com

Personal command board for Louie Elizondo — kitchen, chamber, and code.

This GitHub Pages site is the custom domain **louieelizondo.com**.

## Point the domain at GitHub Pages

In your registrar DNS (the place you bought `louieelizondo.com`):

**Apex (`louieelizondo.com`)** — A records:

- `185.199.108.153`
- `185.199.109.153`
- `185.199.110.153`
- `185.199.111.153`

**www** — CNAME:

- `www.louieelizondo.com` → `louieelizondo.github.io`

Then in the GitHub repo: **Settings → Pages → Custom domain** → `louieelizondo.com` (the `CNAME` file in this repo already has that value). Enable DNSSEC only if your registrar still resolves the GitHub A records.

## Local preview

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.
