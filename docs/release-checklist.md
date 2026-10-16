# Release checklist

State of the site's production readiness. Everything under **Verified** was
actually run in this repository; everything under **Pending** needs a decision or
a resource that does not exist yet.

Last reviewed: 2026-10-15 (Stage 8). Commands are given so each claim can be
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
| Release validation, both modes | `npm run verify:release` | Passes in domain-agnostic and configured modes. A build made with a *synthetic* origin must also pass `--origin=<that origin>`; see "Release validator" below |
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

Nine deliberate defects were injected into a copy of a passing build in Stage 7,
and all nine were caught: corrupted figure bytes, a deleted font licence, a
deleted symbol font, a deleted route, an injected placeholder origin, an
unexpected draft route, a canonical pointing at a development server, an unfilled
`TODO`, and a sitemap missing a route.

Stage 8 re-ran the adversarial pass as 40 cases against throwaway copies of a
passing build (two controls plus 38 mutations), and found five gaps. All five are
fixed and now have cases:

- **A stray non-index `.html` file was invisible.** Route discovery collected only
  `index.html`, so a page dropped into `public/` was copied to `dist/` and went
  unreported in both modes. It is now reported like any other route.
- **The Windows filesystem-path pattern never matched.** `\\\\` in a regex literal
  means two literal backslashes, so the ordinary `C:\Users\…` form passed the
  leak check. The POSIX form was never affected.
- **An origin derived from the output was exempt from the placeholder scan.** The
  validator reads the origin out of the canonical when `--origin` is absent, then
  stripped that value before scanning for placeholders — so a build sitting
  consistently on `example.com`, or on any reserved TLD, verified clean.
- **The sitemap and the robots `Sitemap:` line were checked for shape but not for
  origin.** URLs on an unrelated host passed.
- **The placeholder scan never opened the built stylesheet.** Only HTML, robots
  and the sitemap were read, so a `url(https://example.com/…)` or an unfilled
  token in CSS shipped unexamined. The built CSS is now scanned; the vendored JS
  bundles deliberately are not.

The third has a consequence worth knowing: a build made with a synthetic origin
must assert it (`--origin=https://<test>`) or the validator now fails it on
purpose, naming the origin and saying so. `npm run verify:release` with no
arguments remains sufficient for a build on the real domain, which is what step 8
of the release procedure produces.

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

Re-run in Stage 8: 40 checks per mode against `python3 -m http.server`, both modes
clean — every route, every asset class, the withheld figures (404), the sitemap in
both modes, three unknown-path shapes, and the content types of `og.png` and the
symbol subset.

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

Content is synced to the RE:REASON research repository at **`0e143c5`**, which was
clean (no uncommitted changes) when read. Claims rest on committed artifacts at
that revision, not on a working tree. Re-syncing means re-reading
`docs/RESEARCH_STATUS.md` and `docs/RESEARCH_LOG.md` in that repository and
comparing them against the pages above. The two repositories are separate; the
site never reads the research repository at build time.

- Both withheld figures remain absent from `public/` and `dist/` — asserted
  mechanically by the release validator, not just by inspection.
- The disputed `mechanism_qa_diagnostic.md` §10 wording appears only in
  [figures.md](./figures.md), quoted as the subject of the dispute. It is not
  presented as a finding anywhere.
- Phase 1.6 states `FAILED its gate` and `accuracy 0.0000 (0/16) across all five
  seeds` for Track 1A, and carries the later committed results — Stage 2 address
  binding `PASSED, 1.0000 on 5/5 seeds` for Slot-MGU and `FAILED` for Cyclic-MGU
  and the Vanilla GRU control, EXP-CYCLIC-ADD-01 closed as `FAIL_REJECTION`, and
  EXP-CYCLIC-STEPWISE-01 closed as `INCONCLUSIVE_INTERMEDIATE` at macro `0.6750`
  against `0.0625`, with the register read asymmetry (`0.8368` vs `0.2573`) carried
  unsoftened. `speculative-pipeline` still carries `implementation: not-implemented`
  and states it was not built and is not currently pursued; `nonlinear-candidate-mgu`
  still carries `implementation: implemented` and states that the project makes
  no novelty claim for it.
- Experiment entries carry `establishes`, `doesNotEstablish` and limitations;
  architecture entries carry implementation status, constraints and open
  questions; phase entries carry status, gate outcome and artifacts.
- The lattice is labelled "Rendering of the update rule. Not logged data."

### Browser verification

| Engine | How | Coverage |
| --- | --- | --- |
| WebKit (WebKitGTK 2.52.6) | `python3 scripts/webkit-check.py` — the only committed browser harness | 6 routes × 3 widths × 3 modes = **54/54 scenarios pass** |
| Chromium 153 | ad-hoc CDP script, **not committed** | 6 routes × 3 widths × 2 modes = **36/36 scenarios pass** |
| Firefox 157 | ad-hoc headless capture with `ui.prefersReducedMotion=1`, **not committed**, not re-run in Stage 8 | 4 routes: non-blank, correctly sized, accent present |

Chromium and WebKit assert one `h1` per page, no horizontal overflow, no broken
images, no dead in-page anchors, no console errors, no failed requests, reduced
motion and no-JavaScript completeness, and the lattice reaching its finished
state with `data-ready` set.

**Firefox is not assertion-level.** Firefox 157 exposes no CDP endpoint and
`geckodriver` is not installed, so its coverage is rendered output only. A
non-blank screenshot is not equivalent to a passing assertion suite.

**Only WebKit is reproducible from this repository.** The WebKit harness is
committed and its prerequisites are in [deployment.md](./deployment.md); the
Chromium and Firefox runs were made with ad-hoc scripts that were never committed,
so re-running either means writing that harness again. Nothing in the release path
depends on any of the three.

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

`main` is **one commit ahead of `origin/main`**. The Stage 7 release work is
committed locally as `773cbb0` and has not been pushed. Pushing is a decision for
the repository owner; nothing in the release path requires it, and a host builds
from whatever commit it is given.

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

A third unresolved item is a number, not a figure. The registered report for
EXP-CYCLIC-STEPWISE-01 lists selected-checkpoint step-1 accuracies of 1.0000,
1.0000, 1.0000, 0.9375 and 0.9375 — macro 0.9750 — but states a macro of 0.9875,
which matches the *final* checkpoints instead (four seeds at 1.0000, one at
0.9375). `docs/RESEARCH_STATUS.md` and the EXP-CYCLIC-PERSIST-01 specification
carry the 0.9875 form. The site reports the step-wise results without the disputed
macro. Reconciling the figure is a research-owner decision, and the site's own
number set does not depend on it (the gating terminal accuracy of 0.6750 is
consistent across the report and the artifact).

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
