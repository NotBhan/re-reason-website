# Release checklist

State of the site's production readiness. Everything under **Verified** was
actually run in this repository; everything under **Pending** needs a decision or
a resource that does not exist yet.

Last reviewed: 2026-10-15 (Stage 7). Commands are given so each claim can be
re-checked rather than taken on trust. Operational detail lives in
[deployment.md](./deployment.md).

---

## Verified

### Diagnostics and build

| Check | Command | Result |
| --- | --- | --- |
| Type + template diagnostics | `npm run check` | 0 errors, 0 warnings, 0 hints |
| Domain-agnostic build | `npm run build` (no `SITE_URL`) | 12 routes, succeeds, warns that it is incomplete |
| Configured build | `SITE_URL=https://<test> npm run build` | 12 routes, canonical, Open Graph and sitemap emitted |
| Release validation, both modes | `npm run verify:release` | Passes in domain-agnostic and configured modes |
| Determinism | two builds, `diff -rq` | Byte-identical |

### URL configuration

`SITE_URL` is read once, in `astro.config.mjs`; components take the origin from
`Astro.site`. It is never exposed to client code, and the site reads no other
environment variable.

Rejected, each with its own message: bare hostname, protocol-relative, plain
`http` on a public host, a path, a query string, a non-http scheme, embedded
credentials. Accepted: a bare `https` origin with an optional port, and
`http://localhost` / `http://127.0.0.1` for local checks. An empty value counts as
absent, so a CI variable that expands to nothing produces a domain-agnostic build
rather than a broken one.

### Canonical, Open Graph, sitemap, robots

Verified in both modes by `scripts/verify-release.mjs` and by inspection:

- **Domain-agnostic:** no canonical, no `og:url`, no `og:image`, no sitemap;
  `robots.txt` emits `Disallow: /`; no placeholder, filesystem or development URL
  anywhere in the output.
- **Configured:** canonical on all 12 pages, each on the configured origin, each
  resolving to a real page, none carrying a query or fragment; `og:url` equal to
  the canonical; `og:image` absolute; sitemap contains exactly the 12 built routes
  with no duplicates and consistent trailing slashes; `robots.txt` allows crawling
  and advertises the sitemap.
- 12 distinct titles and 12 distinct descriptions, authored per route rather than
  derived from headings.
- All metadata is present in the static HTML; none of it depends on JavaScript.

### Release validator

`scripts/verify-release.mjs` (also `npm run verify:release`) checks a build in
`dist/` and detects its mode from the output, so a domain-agnostic build is not
failed for the canonical link it is supposed to omit. Expected routes are derived
from the page templates and content collections, so the list cannot drift.

Nine deliberate defects were injected into a copy of a passing build, and all nine
were caught: corrupted figure bytes, a deleted font licence, a deleted symbol
font, a deleted route, an injected placeholder origin, an unexpected draft route,
a canonical pointing at a development server, an unfilled `TODO`, and a sitemap
missing a route.

### Static output and preview

Served with `python3 -m http.server --directory dist`, deliberately not Astro's
preview, which already knows the intended routing.

| Behaviour | Result |
| --- | --- |
| All 12 routes, both modes | 200 |
| Bare path without a slash | **301 → the slash form** |
| Fonts, licences, figures, `og.png`, `favicon.svg` | 200 |
| Unknown paths | genuine **404** in both modes |
| Sitemap | 200 configured, **404** when unconfigured |
| `og.png` | `image/png`, 59,034 bytes, matching the generator's output |

The 301 result is the one that matters: it is what the `TRAILING_SLASH = 'always'`
policy assumes, and the one thing a host can realistically get wrong.

Also verified: 0 unresolved internal links across 181 on 12 pages; no
`file://` paths, filesystem paths or development URLs in the output; no
development files (`.map`, `.ts`, `.md`, `.astro`) in the output.

### Fonts, licences and figures

- Four OFL texts ship in `public/fonts/licenses/` and reach `dist/`.
- All 9 fonts referenced by the built stylesheet exist, including the
  `re-symbols.woff2` maths subset.
- Six published figures verify against `public/figures/SOURCES.json` by SHA-256
  **and** byte length; `node scripts/sync-figures.mjs --check` reports 6/6.
- `scripts/fetch-fonts.mjs` downloads into place and prunes afterwards. Pointed at
  an unreachable upstream it exits 1 and leaves all 9 binaries, `SOURCES.json` and
  the licence files untouched, with `re-symbols.woff2` byte-identical. A non-OFL
  licence response and a 404ed licence each fail with a message naming the URL.
- The social card regenerates identically, and its generator refuses to run if its
  copy no longer matches `src/lib/site.ts` or `src/content/home.ts`.

### Research integrity

- Both withheld figures remain absent from `public/` and `dist/` — asserted
  mechanically by the release validator, not just by inspection.
- The disputed `mechanism_qa_diagnostic.md` §10 wording appears only in
  [figures.md](./figures.md), quoted as the subject of the dispute. It is not
  presented as a finding anywhere.
- Phase 1.6 still states `FAILED its gate` and `accuracy 0.0000 (0/16) across all
  five seeds`; `speculative-pipeline` still states it was not built;
  `nonlinear-candidate-mgu` still states it is not implemented or pursued.
- Experiment entries carry `establishes`, `doesNotEstablish` and limitations;
  architecture entries carry implementation status, constraints and open
  questions; phase entries carry status, gate outcome and artifacts.
- The lattice is labelled "Rendering of the update rule. Not logged data."

### Browser verification

| Engine | How | Coverage |
| --- | --- | --- |
| Chromium 153 | Chrome DevTools Protocol | 5 routes × 3 widths = **15/15 scenarios pass** |
| WebKit (WebKitGTK 2.52.6) | `python3 scripts/webkit-check.py` | 6 routes × 3 widths × 3 modes = **54/54 scenarios pass** |
| Firefox 157 | headless capture, `ui.prefersReducedMotion=1` | 4 routes: non-blank, correctly sized, accent present |

Chromium and WebKit assert one `h1` per page, no horizontal overflow, no broken
images, no dead in-page anchors, no console errors, no failed requests, reduced
motion and no-JavaScript completeness, and the lattice reaching its finished
state with `data-ready` set.

**Firefox is not assertion-level.** Firefox 157 exposes no CDP endpoint and
`geckodriver` is not installed, so its coverage is rendered output only. A
non-blank screenshot is not equivalent to a passing assertion suite.

### Repository hygiene

- `.commandcode/` is ignored by one precise rule; no source, asset, licence or
  script is caught by it.
- No build output, `node_modules` or environment file is tracked.

---

## Pending — decisions

### 1. Production domain

The last metadata decision. Everything else is built: `SITE_URL=https://<domain>
npm run build` and canonical URLs, Open Graph URLs, the sitemap and the robots
`Sitemap:` line all follow. Nothing in the repository invents a domain.

### 2. Hosting provider

Not selected, and no provider configuration is committed. The nine requirements
the provider must satisfy are in
[deployment.md](./deployment.md#deployment-provider-requirements). Each maps to
something verified locally; none requires an application change.

### 3. Trailing-slash policy

`TRAILING_SLASH = 'always'` in `src/lib/site-url.ts`, matching the emitted file
layout and the observed 301 behaviour of a plain static server. Still provisional,
because it is only wrong if the chosen host redirects `/x/` *to* `/x`. If it does,
change `TRAILING_SLASH` to `'never'` and set `trailingSlash: 'never'` to match.

### 4. Preview protection

Recommended: do not set `SITE_URL` on preview deployments, so they emit
`Disallow: /` — and protect them at the host as well, because `robots.txt` is a
request to compliant crawlers, not access control. A preview must not be treated
as private merely because it is disallowed.

### 5. Push

`main` is level with `origin/main`. Nothing is unpushed.

---

## Pending — research

Two figures stay unpublished: `03_gate_distribution.png` and
`experiment_g_prediction.png`. The conflict, source section, artifact, required
evidence and republication condition for each are recorded in
[figures.md](./figures.md).

This needs the original experiment owner to inspect the authoritative outputs. The
site cannot decide which artifact is wrong, and excluding the figures does not
resolve the discrepancy — it only avoids publishing an unresolved claim. Nothing
in this release depends on those two figures: the six published ones are
unaffected.

---

## Pending — release

| Step | Needs |
| --- | --- |
| Domain and DNS | The domain decision |
| Production build | `SITE_URL` exported in the build environment |
| Host redirect behaviour | A deployed host — the 301 test in [deployment.md](./deployment.md#post-deployment-acceptance-tests) |
| 404 status | A deployed host |
| HTTPS and canonical-host redirect | Provider configuration |
| Preview deployment | Provider selection |
| Live smoke tests | A deployed URL |
| Browser re-run against the deployed origin | A deployed URL; use `SITE_PORT` with the WebKit harness |
| Final approval | A human decision |

---

## Not claimed

- The site is **not** production-ready in the sense of being deployable today:
  the domain and host decisions are outstanding, and until they are made the
  build is deliberately incomplete rather than wrong.
- Host redirect, 404 and HTTPS behaviour is **unverified in production**. It was
  observed on a local static server, which is not the same thing.
- No performance score is asserted. Layout shift was measured locally at CLS
  0.00552 on the homepage and 0.00000–0.00001 on research routes; no
  Lighthouse-equivalent tooling is installed here.
- Reproducibility is claimed only for two consecutive builds on this machine and
  toolchain, not across Node or OS versions.
- Firefox coverage is rendered-output only, not assertions.
- Two of eight candidate figures remain unpublished pending research
  reconciliation.
