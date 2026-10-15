# Release checklist

State of the site's production readiness. Everything marked **done** was verified
in this repository; everything marked **pending** needs a decision or a resource
that is not available yet.

Last reviewed: 2026-10-15.

---

## Done

### Build and diagnostics

| Check | Command | Result |
| --- | --- | --- |
| Type + template diagnostics | `npm run check` | 44 files, 0 errors, 0 warnings, 0 hints |
| Static production build | `npm run build` | 12 routes generated, no warnings |
| Route count | — | `/`, `/research`, three category indexes, seven detail pages |

### Browser compatibility

| Engine | How | Coverage |
| --- | --- | --- |
| Chromium 153 | Chrome DevTools Protocol | 5 routes × 3 widths = **15 scenarios, all assertions passing** |
| Firefox 157 | headless `--screenshot`, `ui.prefersReducedMotion=1` | Rendered-output check on homepage, research index and architecture page at 1440×900 and 390×844 |
| **WebKit (WebKitGTK 2.52.6)** | `scripts/webkit-check.py` | 6 routes × 3 widths × 3 modes = **54 scenarios, all assertions passing** |

Chromium and WebKit runs assert rather than eyeball: exactly one `h1` per page,
no horizontal overflow, no broken images, no dead in-page anchors, no console
errors, no failed requests, and the lattice reaching its finished state.

Firefox 157 no longer exposes a CDP endpoint and `geckodriver` is not installed,
so it is checked through rendered output instead — not assertion-based. Those
captures were confirmed programmatically to be non-blank, correctly sized, and to
contain the signal-orange accent, so nothing is hidden behind a stalled entrance
animation. Firefox's assertion-level coverage (including its reduced-motion path)
dates from the Stage 4 pass.

WebKit is driven through the WebKit2-4.1 GObject bindings rather than
WebKitWebDriver, which this distribution does not ship. It runs a real WebKit
engine in a `Gtk.OffscreenWindow`, so nothing is drawn on the desktop:

```bash
npx astro preview --port 4322 --host 127.0.0.1 &
python3 scripts/webkit-check.py            # exits non-zero on any failed assertion
python3 scripts/webkit-check.py --json out.json
```

Verified in WebKit specifically: SVG `transform-box: fill-box` and transforms on
SVG geometry; the Anime.js lattice initialising, drawing and reaching
`data-ready` with the accent applied; the CSS handover not conflicting; all three
webfonts plus the symbol subset resolving; `⊙` rendering from the symbol subset
with `<sub>` markup intact; formulas wrapping rather than overflowing; no
horizontal overflow at 1440/390/360; reduced motion and no-JavaScript both
presenting complete content; no console errors, failed requests or broken images.

### Assets and licensing

- Fonts are self-hosted from `public/fonts/`; nothing is fetched from a
  third-party service at runtime.
- Every family's SIL OFL text ships beside the binaries in
  `public/fonts/licenses/`, and both font scripts refuse to finish if the
  upstream licence text is missing or contains no OFL notice.
- Figures are byte-for-byte copies with SHA-256 hashes in
  `public/figures/SOURCES.json`; `node scripts/sync-figures.mjs --check` reports
  upstream drift.

### Performance

- Layout shift, measured with a `layout-shift` `PerformanceObserver` in
  Chromium, cold cache, 1440×900: **homepage CLS 0.00552**, research routes
  **0.00000–0.00001**. Both are inside the "good" threshold of 0.1.
- Research routes ship **no external JavaScript and no islands**. They do contain
  one small inline progressive-enhancement script inherited from `BaseLayout` that
  sets `data-anim="on"` (and returns early under reduced motion); it is inert on
  research routes, which render no animation-gated elements. Measured: **394
  bytes** of inline JS on a research route, against 5,670 bytes inline plus one
  external deferred module on the homepage.
- The only island on the site is the homepage's findings filter, and the
  state-lattice script is deferred.
- Initial payload ≈ 32 KB gzipped (HTML, CSS, the deferred Anime.js chunk).

No Lighthouse or equivalent tooling is installed, so no performance scores are
claimed. See "Re-measuring" below if that is wanted.

### Research integrity

- Every published claim carries a source reference; every experiment entry has
  `establishes`, `doesNotEstablish` and at least one limitation.
- The failed Phase 1.6 gate and the non-adopted approaches are described as
  such.
- The update-rule diagram is labelled a rendering of the rule, not logged data.
- Two figures are withheld pending source-level investigation — see
  [figures.md](./figures.md).

---

## Pending — needs a decision

### 1. Production domain

**Blocking for:** canonical URLs, Open Graph metadata, `sitemap.xml`,
`robots.txt`, and any absolute URL in the build.

Nothing in the repository invents a domain. `astro.config.mjs` sets no `site`,
and `BaseLayout.astro` emits no `canonical` or `og:*` tags, so the current
metadata is correct-but-incomplete rather than misleading.

When the domain is chosen:

1. Set `site: 'https://<domain>'` in `astro.config.mjs`.
2. Add `<link rel="canonical" href={new URL(Astro.url.pathname, Astro.site)}>`
   and the `og:*` set to `BaseLayout.astro`, using `Astro.site` so no URL is
   hard-coded.
3. Add `@astrojs/sitemap` and set `site` — the sitemap integration requires it.
4. Add `public/robots.txt` with a `Sitemap:` line pointing at that domain.
5. Decide trailing-slash behaviour (`trailingSlash`) and set it explicitly,
   because it changes every canonical URL.

### 2. Social preview image

**Blocking for:** `og:image` and `twitter:image`.

No image exists. It needs a design decision and a 1200×630 asset; do not point
`og:image` at an existing figure or at a path that does not exist.

### 3. Deployment target

Not chosen, and no deployment configuration has been added. The build is a plain
static `dist/`, so any static host works. Requirements to confirm at that point:
HTTPS enforced, a single canonical host (apex vs `www`) with the other
redirecting, and cache headers for `/fonts/*` and `/figures/*` (both are
immutable by content).

### 4. This branch is ahead of `origin/main`

`0b8b1df` and the current working tree are local. Nothing has been pushed.

### 5. Repository and contact details

The site links to the research repository. If a public website repository,
contact address, or licence page should also be linked, those need confirming
before they are added — no placeholder links ship.

### 6. Two figures withheld

Not a website decision. See [figures.md](./figures.md) for the handoff.

---

## Re-measuring

| What | How |
| --- | --- |
| Type and template diagnostics | `npm run check` |
| Production build | `npm run build` |
| WebKit behaviour | `python3 scripts/webkit-check.py` |
| Layout shift | Chromium DevTools Performance panel, or a `layout-shift` `PerformanceObserver` on a cold load |
| Font integrity | `node scripts/fetch-fonts.mjs` then confirm `public/fonts/re-symbols.woff2` still exists |
| Figure drift | `node scripts/sync-figures.mjs --check` |

Chromium and Firefox were checked with ad-hoc CDP scripts during development
rather than a committed harness. If browser regression testing should be
repeatable, the CDP script is the thing to add — `scripts/webkit-check.py` is the
model for its shape and output.

---

## Explicitly out of scope

Deploying, publishing, choosing the domain, resolving the figure discrepancy, and
adding a CMS, database or authentication. None of these are implied by this
checklist.
