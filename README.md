# louieelizondo.com

Personal site for **Louie Elizondo** — operator at Natural Balance Club, Presidente of CANACO Chihuahua Restauranteros, self-taught developer learning in public.

Two rooms: a letter, then the line. Dark + light. English + Spanish.

Hosted on [GitHub Pages](https://pages.github.com) from this repo.

## What’s in each room

**Room 1 — the letter.** Name, a photo, a few sentences, and three links (X, Natural Balance, CANACO / Donde Comemos). Language and theme live in the corner. Nothing else.

**Room 2 — the line.** Full-bleed 3D kitchen. Click a station and a paper ticket is the bio:

| Station | What’s on the ticket |
| --- | --- |
| Prep | Notion: recipes, checklists, the week |
| Fire | Natural Balance — Shopify + POS |
| The pass | Private finance suite (six apps, not public) |
| Out | Payroll and contracts, with a quiet link to nómina |

The footer is the commit trail.

## Keep the GitHub calendar honest

GitHub’s public contribution graph only paints commits that:

1. Land on a **default branch** (this site’s is `main`), and
2. Use an **author email verified** on [github.com/settings/emails](https://github.com/settings/emails).

Work on a feature branch, or commits from `cursoragent@cursor.com`, will not turn Louie’s squares green — even if the kitchen was busy. That is why the last few weeks looked empty.

This site does not scrape a third-party cache as the source of truth. A committed file, `assets/data/contributions.json`, is rebuilt by `.github/workflows/update-contributions.yml` **on every push to `main` and once a day**. Each day is the max of:

- GitHub’s official public contribution count
- Commits in **this repository** (`git log --all`)

To make GitHub’s own profile catch up, commit to `main` with `le.nbclub@gmail.com` (or another verified address):

```bash
git config user.email "le.nbclub@gmail.com"
```

Refresh locally anytime:

```bash
python3 scripts/update_contributions.py
```

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
