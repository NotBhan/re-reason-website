# Deployment

How to produce a release build, and what a host has to provide. Nothing here
selects a provider or assumes one: the contract is described in terms any static
host can satisfy, and the genuinely host-specific parts are called out as such.

Related: [release-checklist.md](./release-checklist.md) for what is verified and
what is still pending, [architecture.md](./architecture.md) for how the site is
put together.

---

## The build

```bash
npm ci                 # or: npm install --include=dev
SITE_URL=https://<domain> npm run build
```

| | |
| --- | --- |
| Output directory | `dist/` |
| Build command | `npm run build` (`astro build`) |
| Node | 20+ (developed on Node 26) |
| Rendering mode | `output: 'static'` — pre-rendered HTML, no server runtime |
| Build-time deps | everything in `package.json`; no native toolchain beyond what Astro pulls in |

`npm ci` is preferred on a build server. If `NODE_ENV=production` is set in the
build environment, npm will skip `devDependencies` unless you pass
`--include=dev`; the build needs them, because Tailwind v4 arrives through a Vite
plugin and `@astrojs/check` is a dev dependency.

The output is plain static files. There is no server, no adapter, no database and
no runtime environment to configure.

### Build scripts that are *not* part of the build

`scripts/fetch-fonts.mjs`, `scripts/build-symbol-font.mjs`, `scripts/sync-figures.mjs`
and `scripts/build-og-image.mjs` are run by hand and their outputs are committed.
A deployment never needs network access to a font or asset CDN, and never needs a
browser. Re-run them only when changing fonts, figures or the social card.

---

## Environment

One variable.

| Variable | Required | Example | Effect |
| --- | --- | --- | --- |
| `SITE_URL` | for release builds | `https://re-reason.org` | Sets Astro's `site`; enables canonical URLs, absolute Open Graph URLs and the sitemap |

**Absent** — the build succeeds and stays domain-agnostic. No `<link rel="canonical">`,
no `og:url`, no `og:image`, no sitemap, and `robots.txt` disallows crawling. The
build prints a four-line warning saying exactly this.

**Present but malformed** — the build fails, with the reason. Accepted: a bare
`https://` origin, optionally with a port. Rejected, each with its own message:

| Value | Why it is rejected |
| --- | --- |
| `my-domain.org` | not absolute |
| `//my-domain.org` | protocol-relative, no scheme |
| `http://my-domain.org` | plain http on a public host |
| `https://my-domain.org/site` | not a bare origin |
| `https://my-domain.org/?a=1` | query string |
| `ftp://my-domain.org` | unsupported scheme |
| `https://user:pw@my-domain.org` | embedded credentials |

Rejecting rather than normalising is deliberate: a silently rewritten origin
produces metadata that looks correct and is not.

`http://localhost` and `http://127.0.0.1` are accepted so canonicals can be
exercised locally. That is the only http allowance, and it cannot reach
production — a real domain over http is still refused.

An **empty** value counts as absent: `SITE_URL=` produces a domain-agnostic build.
That matters for CI, where `SITE_URL=${{ vars.SITE_URL }}` with an unset variable
expands to nothing. The result is safe (nothing is fabricated, and `robots.txt`
disallows crawling) but it is not a release build, so the warning is loud on
purpose.

`SITE_URL` is read in exactly one place, `astro.config.mjs`. Components take the
resolved origin from `Astro.site`, so there is no second path to drift from it. It
is not `PUBLIC_`-prefixed and is never exposed to client code — no other
environment variable is read by the site at all.

### Trailing slashes

Astro's `trailingSlash` is left at its default (`'ignore'`) and `build.format` at
`'directory'`, so the build emits `dist/research/index.html` and that route answers
on both `/research` and `/research/`. A canonical URL cannot express that
ambiguity; it must name one form.

The site's policy is recorded in `src/lib/site-url.ts` as `TRAILING_SLASH`, and is
currently `'always'` — matching the emitted file layout, where every route is a
directory index.

**Host requirement:** do not redirect `/x/` to `/x`. If the host strips trailing
slashes, every canonical URL will point at a redirect, and the sitemap will list
redirecting URLs. Either serve `/x/` directly (most static hosts do), or change
`TRAILING_SLASH` to `'never'` *and* set `trailingSlash: 'never'` in
`astro.config.mjs` so the canonicals and the served routes agree again.

The policy is a real decision, not a detail — it appears in every canonical URL
and every sitemap entry.

---

## Host contract

| Requirement | Detail |
| --- | --- |
| Serve `dist/` as a static root | Index files must resolve for directory URLs; `dist/research/index.html` serves `/research/` |
| HTTPS | Required. `SITE_URL` must be `https://`, and the host should redirect http to https |
| Single canonical host | Pick apex or `www` and redirect the other, permanently. Two hosts serving the same content split the canonical signal |
| Preserve trailing slashes | See above — the one requirement a host can realistically break |
| Custom 404 | Serve a 404 status (not a 200) for unknown paths. See below |
| No rewrite rules | None are needed. There is no SPA fallback to configure, and adding one would turn every unknown path into a 200 |

### Unknown routes and 404

The site has no 404 page: an unknown path is the host's problem, and any static
host resolves it without configuration. Serve a genuine `404` status — a host that
answers unknown paths with `200` plus an index page would make every typo
indexable.

A branded 404 page is a reasonable future addition but is deliberately not part of
this stage: it needs design input, and the absence of one is not a release
blocker.

### Caching

Everything except the HTML is content-addressed or versioned, so it can be cached
aggressively:

| Path | Suggested |
| --- | --- |
| `/_astro/*` | `Cache-Control: public, max-age=31536000, immutable` — hashed filenames |
| `/fonts/*`, `/figures/*` | `public, max-age=31536000` — changed only by re-running a script |
| `/*.html`, `/` | `public, max-age=0, must-revalidate` |
| `/robots.txt`, `/sitemap*.xml` | short max-age |

The HTML is what changes between deploys; the assets do not.

---

## robots.txt

Generated at build time by `src/pages/robots.txt.ts`, because a static file cannot
distinguish a release build from a preview one.

| Build | Behaviour |
| --- | --- |
| `SITE_URL` configured | `Allow: /` plus a `Sitemap:` line pointing at the configured origin |
| `SITE_URL` absent | `Disallow: /`, with a comment explaining why |

The asymmetry is intentional. Forgetting `SITE_URL` on a real release leaves the
site uncrawled — visible and recoverable, and the build warns about it. The
opposite mistake would silently publish a preview URL as the real site.

`Disallow: /` is a crawler *request*, not access control. It does not make a URL
private, does not prevent it being fetched, linked to, or indexed via other
signals, and is not a substitute for putting a preview environment behind
authentication. If a staging deployment must stay out of search results, protect
it at the host as well.

### Sitemap

Generated by `@astrojs/sitemap` when `SITE_URL` is configured, and omitted
otherwise — the integration requires `site`, and a sitemap of relative or invented
URLs would defeat the file's purpose.

It contains the twelve public routes derived from the built output, so it cannot
drift from the routes that actually exist. Pages beyond the twelve — a 404, a
future legal page — would need an explicit `filter` if they should be excluded.

---

## Social preview

`public/og.png` (1200×630) is generated by `scripts/build-og-image.mjs`, which
renders real HTML through headless Chromium using the site's own self-hosted
fonts. The output is committed; a deployment does not need a browser.

```bash
node scripts/build-og-image.mjs
```

The script refuses to run if its copy no longer matches the source strings in
`src/lib/site.ts` and `src/content/home.ts`, so the card cannot keep advertising
wording the site has changed.

The absolute `og:image` URL is built from the configured origin and is **omitted
when no origin is configured**. A relative path is never presented as an Open
Graph URL.

---

## Verifying a release build

Domain-agnostic mode — no fabricated URLs, no sitemap, robots disallows:

```bash
npm run check
npm run build
grep -rl "canonical\|og:url" dist/ || echo "no absolute URLs (expected)"
test -f dist/sitemap-0.xml && echo "unexpected sitemap" || echo "no sitemap (expected)"
```

Configured mode, with a throwaway origin. **Never** build a release with a
placeholder: use this only to verify, then rebuild without it.

```bash
SITE_URL=https://example.invalid npm run build
grep -o '<link rel="canonical"[^>]*>' dist/index.html
grep -c "<loc>" dist/sitemap-0.xml     # expect 12
cat dist/robots.txt
```

Malformed values must fail:

```bash
SITE_URL=http://example.invalid npm run build   # expect a non-zero exit
SITE_URL=my-domain.org npm run build            # expect a non-zero exit
```

Browser verification, if the WebKit/PyGObject stack is present:

```bash
npx astro preview --port 4322 --host 127.0.0.1 &
python3 scripts/webkit-check.py
```

---

## What is host-specific

Everything else is decided by the repository. These are the only choices a host
or operator has to make:

1. **Which host**, and therefore how `dist/` is uploaded and how HTTPS is issued.
2. **The domain**, which becomes `SITE_URL`.
3. **Apex vs `www`**, and the permanent redirect from the other.
4. **Trailing-slash handling** — must preserve `/x/`, or the policy in
   `src/lib/site-url.ts` must be changed to match.
5. **Cache headers**, per the table above.
6. **Whether preview deployments are protected.** Recommended: protect them at
   the host, and do not set `SITE_URL` on them, so they also emit
   `Disallow: /`.

No vendor configuration files are committed. Astro emits to `dist/` and every
static host accepts that directory; adding a provider-specific config now would
be a guess about a decision that has not been made.
