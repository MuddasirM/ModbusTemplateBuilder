# Deploying

This is a fully client-side SPA (no backend, no server-side env vars), so any
static-host works. Below: **Cloudflare Pages** (the target in use, free tier)
and **DigitalOcean App Platform** (the spec already in this repo).

## Option A: Cloudflare Pages (recommended, free)

Cloudflare's free Pages tier covers unlimited static sites and requests.

1. Push this repo to GitHub/GitLab.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect
   to Git** → pick the repo/branch.
3. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm ci && npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `web` (if this app lives in a subdirectory of the
     connected repo - leave blank if the repo root *is* this folder)
   - **Environment variable:** `NODE_VERSION` = `22` (Vite 7 needs ≥ 20.19)
4. SPA routing: Pages serves `index.html` for unknown routes by default for
   Vite/SPA presets. If you hit 404s on a deep link, add a `public/_redirects`
   file containing `/* /index.html 200`.
5. Every push to the branch redeploys automatically; preview deployments are
   generated for PRs/other branches.

**Cost:** Free. The Pages free tier has no request or bandwidth limits for
static assets - only a 500-builds-per-month cap, which a small project won't
approach.

### Or: deploy from the CLI

```bash
npm ci && npm run build
npx wrangler pages deploy dist --project-name=modbus-template-builder
```

## Option B: DigitalOcean App Platform Static Site

The Starter tier hosts up to **3 static sites for free**. A ready spec is
already checked in at [.do/app.yaml](.do/app.yaml).

1. Push this repo to GitHub/GitLab and connect it to DigitalOcean (one-time, in
   the DO console under **Settings → GitHub/GitLab**).
2. Edit [.do/app.yaml](.do/app.yaml) and set `repo_clone_url` + `branch`.
3. Create the app:
   ```bash
   doctl apps create --spec web/.do/app.yaml
   ```
   …or in the console: **Apps → Create App → pick the repo**. DO auto-detects the
   spec. Key settings (already in the spec):
   - **Source directory:** `web`
   - **Build command:** `npm ci && npm run build`
   - **Output directory:** `dist`
   - **Catchall document:** `index.html` (SPA routing)
   - **NODE_VERSION:** `22` (Vite 7 needs ≥ 20.19)
4. Every push to the branch redeploys automatically.

**Cost:** Free (Starter static site). You only pay if you exceed the free
bandwidth/build minutes, or add a custom domain with paid features.

## Option C: Droplet + nginx (more control, not free)

A $4/mo Basic Droplet can serve the static `dist/`:

```bash
npm ci && npm run build         # produces dist/
scp -r dist/* root@<droplet>:/var/www/argos/
```
Point an nginx `server { root /var/www/argos; try_files $uri /index.html; }`
block at it. Only choose this if you need a Droplet anyway; the Static Site is
cheaper and simpler.
