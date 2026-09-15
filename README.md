# louieelizondo.com

Personal site for **Louie Elizondo** — operator at Natural Balance Club, Presidente of CANACO Chihuahua Restauranteros, self-taught developer learning in public.

One page: a letter and a thermal printer. Dark + light. English + Spanish.

Hosted on [GitHub Pages](https://pages.github.com) from this repo.

## What’s on the page

**The letter.** Co-owner of Natural Balance, a family business. Restauranteros at CANACO.

**The printer.** Menu first, then the machine. Paper comes out the bottom.

| Button | What prints |
| --- | --- |
| Natural Balance | Family house — ganas, not the moneymaker |
| Restauranteros | CANACO in real life + Donde Comemos |
| Office | People and money — the apps stay private |

**The screen under the printer.** Always learning: with her, at CANACO, with books, YouTube, Google. Willing to share.

**The status bar.** X, GitHub, louieelizondo.com, louie@naturalbalance.club.

Print all three, then tap the printer’s black lid a few times.

## Point the GoDaddy domain here

The domain is registered at **GoDaddy México** and is not configured yet. GitHub Pages will serve the site once DNS and Pages settings match.

### 1. This repo

- File `CNAME` in the repo root contains `louieelizondo.com` (already added).
- GitHub → repo **Settings → Pages**:
  - Source: **Deploy from a branch**
  - Branch: `main` / `/ (root)`
  - Custom domain: `louieelizondo.com`
  - Wait for DNS, then enable **Enforce HTTPS** (it can take minutes to hours after DNS propagates).

### 2. GoDaddy DNS (Mexico)

GoDaddy → **Mis productos** → domain **louieelizondo.com** → **DNS**.

**Apex (`louieelizondo.com`)** — delete conflicting A / AAAA / forwarding records, then add these **A** records:

| Type | Name | Value | TTL |
| --- | --- | --- | --- |
| A | `@` | `185.199.108.153` | 600 |
| A | `@` | `185.199.109.153` | 600 |
| A | `@` | `185.199.110.153` | 600 |
| A | `@` | `185.199.111.153` | 600 |

**www** — add a **CNAME** (remove parking / forwarding on `www` first):

| Type | Name | Value | TTL |
| --- | --- | --- | --- |
| CNAME | `www` | `louieelizondo.github.io` | 600 |

Do **not** use GoDaddy “Forwarding” to GitHub. DNS records above are enough.

Optional IPv6 (AAAA), same names pointing at GitHub Pages:

- `2606:50c0:8000::153`
- `2606:50c0:8001::153`
- `2606:50c0:8002::153`
- `2606:50c0:8003::153`

### 3. Check it

```bash
dig louieelizondo.com +short
dig www.louieelizondo.com +short
```

Apex should show those four GitHub IPs. `www` should CNAME to `louieelizondo.github.io`.

GitHub’s current custom-domain docs: [Managing a custom domain for your GitHub Pages site](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site).

## Local

This is a static site. From the repo root:

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.
