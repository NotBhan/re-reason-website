# Release checklist

State of the site's production readiness. Everything under **Verified** was
actually run in this repository; everything under **Pending** needs a decision or
a resource that does not exist yet.

Last reviewed: 2026-10-15. Verification commands are given so each claim can be
re-checked rather than taken on trust.

---

## Verified

### Diagnostics and build

| Check | Command | Result |
| --- | --- | --- |
| Type + template diagnostics | `npm run check` | 0 errors, 0 warnings, 0 hints |
| Static production build, no origin | `npm run build` | 12 routes, succeeds, warns that it is domain-agnostic |
| Static production build, origin set | `SITE_URL=https://<test> npm run build` | 12 routes, canonical/Open Graph/sitemap all emitted |
| Build reproducibility | `rm -rf dist && npm run build` | Deterministic; documented commands |

### Domain-agnostic behaviour

Verified by building with no `SITE_URL` and inspecting `dist/`:

- No `<link rel="canonical">` and no `og:url` anywhere in the output.
- No sitemap emitted. `@astrojs/sitemap` requires an origin, and the integration
  is only registered when one is configured.
- `robots.txt` emits `Disallow: /`, so an unconfigured build cannot be indexed by
  mistake.
- No placeholder domain appears in any emitted file. Checked for `example.*`,
  `your-domain`, `localhost`, `127.0.0.1` and `:4321`.
- A four-line warning is printed on every such build.

### Configured behaviour

Verified by building with a throwaway origin (`https://example.invalid`), which is
never persisted in any file:

- Canonicals are absolute and carry the trailing slash: `/` and
  `/research/experiments/<id>/`.
- `og:url` and `og:image` use the configured origin; `og:image` is absolute.
- `twitter:card` is `summary_large_image` with an image, `summary` without.
- `robots.txt` emits `Allow: /` plus a `Sitemap:` line.
- The sitemap contains exactly 12 URLs — one per generated route — with no
  duplicates, all following the trailing-slash policy.

### URL validation

Each of these fails the build with a specific message rather than being
normalised: plain hostname, protocol-relative, plain `http` on a public host,
path, query string, unsupported scheme, embedded credentials. `http://localhost`
and `http://127.0.0.1` are accepted; an empty value is treated as absent.

### Static delivery contract

| Check | Result |
| --- | --- |
| All twelve routes present | Yes |
| Internal `href="/…"` links resolve to generated routes | 12 pages, 0 unresolved |
| No filesystem paths, dev-server URLs or placeholder domains in HTML | None |
| Font, figure, favicon, licence and social assets in `dist/` | All present |
| Published figures | 6, hashes match — `node scripts/sync-figures.mjs --check` |
| Rejected figures absent from `public/` and `dist/` | Both absent |
| Distinct titles / descriptions | 12 / 12, no duplicates |
| Research content without hydration | Present; 0 external scripts on research routes |

### Browser compatibility

| Engine | How | Coverage |
| --- | --- | --- |
| Chromium 153 | Chrome DevTools Protocol | 5 routes × 3 widths = 15 scenarios, all assertions passing |
| WebKit (WebKitGTK 2.52.6) | `scripts/webkit-check.py` | 6 routes × 3 widths × 3 modes = 54 scenarios, all assertions passing |
| Firefox 157 | headless capture, `ui.prefersReducedMotion=1` | Rendered-output check on 3 routes |

Chromium and WebKit assert rather than eyeball: one `h1` per page, no horizontal
overflow, no broken images, no dead in-page anchors, no console errors, no failed
requests, and the state lattice reaching its finished state.

Firefox 157 no longer exposes a CDP endpoint and `geckodriver` is not installed, so
it is checked through rendered output — captures confirmed non-blank, correctly
sized, and containing the signal-orange accent. Firefox's assertion-level coverage,
including reduced motion, dates from the Stage 4 pass.

WebKit runs through the WebKit2-4.1 GObject bindings, because WebKitWebDriver is
not shipped by this distribution's `webkit2gtk-4.1`:

```bash
npx astro preview --port 4322 --host 127.0.0.1 &
python3 scripts/webkit-check.py
```

### Fonts and licensing

- `public/fonts/licenses/` holds the SIL OFL text for each of the four families,
  fetched from upstream and shipped beside the binaries.
- Both font scripts fail with a clear message if the upstream licence text is
  missing (404) or contains no OFL notice — tested both ways.
- `scripts/fetch-fonts.mjs` downloads into place and prunes stale files
  *afterwards*. Tested by pointing it at an unreachable upstream: it exits 1 and
  leaves all 9 binaries, `SOURCES.json` and the licence files untouched, with
  `re-symbols.woff2` byte-identical.
- It deletes only files recorded in its own manifest, so it cannot remove the
  symbol font or anything it did not write.

### Research integrity

- Both withheld figures remain absent from `public/` and `dist/`.
- The disputed §10 description appears only in `docs/figures.md`, quoted as the
  subject of the dispute — never as a finding.
- Phase 1.6 still states `FAILED its gate` and `accuracy 0.0000 (0/16) across all
  five seeds`.
- `speculative-pipeline` still states it was not built;
  `nonlinear-candidate-mgu` still states it is not implemented or pursued.
- Experiment entries carry `establishes`, `doesNotEstablish` and limitations;
  architecture entries carry implementation status, constraints and open
  questions; phase entries carry status, gate outcome and artifacts. The framing
  differs by collection because the documents differ — none of them is missing.
- The lattice is labelled "Rendering of the update rule. Not logged data."

### Repository hygiene

- `.commandcode/` is ignored by one precise rule; no source, asset, licence or
  script file is caught by it. Verified with `git check-ignore`.
- No build output, `node_modules` or environment file is tracked.

---

## Pending — decisions

### 1. Production domain

Blocking canonical URLs, Open Graph URLs, the sitemap and the robots `Sitemap:`
line. Nothing in the repository invents one.

When chosen: `SITE_URL=https://<domain> npm run build`. Nothing else changes —
there is no second place the origin is configured.

### 2. Trailing-slash policy

`src/lib/site-url.ts` records it as `TRAILING_SLASH = 'always'`, matching the
emitted file layout where every route is a directory index. Astro's
`trailingSlash` stays at its default `'ignore'`.

This is settled *provisionally* and needs one confirmation at deploy time: the
host must not redirect `/x/` to `/x`. If it does, change `TRAILING_SLASH` to
`'never'` and set `trailingSlash: 'never'` to match. See
[deployment.md](./deployment.md).

### 3. Deployment provider

Not selected, and no provider-specific configuration is committed — `dist/` is
plain static output that any host accepts. [deployment.md](./deployment.md)
states the contract: static root, HTTPS, single canonical host, trailing slashes
preserved, genuine 404 status, no rewrite rules.

### 4. Preview-environment protection

Recommended: do not set `SITE_URL` on preview deployments, so they emit
`Disallow: /` automatically — and protect them at the host as well, because
`robots.txt` is a crawler request, not access control.

### 5. Social preview image

`public/og.png` exists and is generated by `scripts/build-og-image.mjs`. Its
absolute URL is emitted only once `SITE_URL` is configured.

### 6. Push

`main` is ahead of `origin/main`. Nothing has been pushed.

---

## Pending — research action

### Withheld figures

`03_gate_distribution.png` and `experiment_g_prediction.png` stay unpublished. Each
figure's conflict, source section, artifact, required evidence and republication
condition are recorded in [figures.md](./figures.md).

This needs the research owner to inspect the authoritative experiment outputs. It
cannot be resolved from this repository, and the site must not decide which of the
two artifacts is wrong by assumption. The site can ship without these figures —
they are two of eight candidates, and the six published ones are unaffected.

---

## Pending — release action

- Produce the first release build with a real `SITE_URL`.
- Smoke-test the live site: canonical and Open Graph values, sitemap reachable,
  fonts and figures loading, the homepage island working.
- Re-run `python3 scripts/webkit-check.py` against the deployed origin, so
  HTTPS delivery and any host rewrite rules are exercised rather than assumed.
- Confirm the host serves a genuine 404 status for unknown paths.
- Confirm the host does not redirect `/x/` to `/x` (see decision 2).
- Performance measurement on the live site. Layout shift was measured locally at
  CLS 0.00552 on the homepage and 0.00000–0.00001 on research routes; no
  Lighthouse-equivalent tooling is installed here, so no scores are claimed.

---

## Not claimed

- The site is **not** release-ready in the sense of being deployable today: the
  domain decision is outstanding, and until it is made the build is
  deliberately incomplete rather than wrong.
- No performance score is asserted — only the layout-shift figures above, which
  were measured under stated conditions.
- Firefox coverage in the current stage is rendered-output only, not assertions.
- Two of eight candidate figures remain unpublished pending research
  reconciliation.
