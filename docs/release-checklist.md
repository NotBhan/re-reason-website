# Release checklist

State of the site's production readiness. Everything under **Verified** was
actually run in this repository; everything under **Pending** needs a decision or
a resource that does not exist yet.

Last reviewed: 2026-10-15 (Stage 8). Commands are given so each claim can be
re-checked rather than taken on trust. Operational detail lives in
[deployment.md](./deployment.md).

**Content re-synced 2026-10-17** against the research repository at `3110a03`,
which added one research entry and therefore one route. `npm run check`, both
build modes, `npm run verify:release` and the two-build determinism diff were
re-run and re-passed; the route, link, metadata and sitemap counts below are from
that run. **Browser verification was not re-run**, so the WebKit, Chromium and
Firefox rows still describe the 2026-10-15 revision and the added route is
unverified in a browser.

---

## Verified

### Diagnostics and build

| Check | Command | Result |
| --- | --- | --- |
| Type + template diagnostics | `npm run check` | 0 errors, 0 warnings, 0 hints |
| Domain-agnostic build | `npm run build` (no `SITE_URL`) | 13 routes, succeeds, warns that it is incomplete |
| Configured build | `SITE_URL=https://<test> npm run build` | 13 routes, canonical, Open Graph and sitemap emitted |
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
- **Configured:** canonical on all 13 pages, each on the configured origin, each
  resolving to a real page, none carrying a query or fragment; `og:url` equal to
  the canonical; `og:image` absolute; sitemap contains exactly the 13 built routes
  with no duplicates and consistent trailing slashes; `robots.txt` allows crawling
  and advertises the sitemap.
- 13 distinct titles and 13 distinct descriptions, authored per route rather than
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
| All 13 routes, both modes | 200 |
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

Also verified: 0 unresolved internal links across 200 on 13 pages; no
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

Content is synced to the RE:REASON research repository at **`3110a03`**, which was
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
  seeds` for Track 1A, and carries every later committed result unsoftened: Stage 2
  address binding `PASSED, 1.0000 on 5/5 seeds` for Slot-MGU and `FAILED` for
  Cyclic-MGU and the Vanilla GRU control; `EXP-CYCLIC-ADD-01` closed as
  `FAIL_REJECTION`; `EXP-CYCLIC-STEPWISE-01` closed as `INCONCLUSIVE_INTERMEDIATE`
  at macro `0.6750` against `0.0625`, with the register read asymmetry (`0.8368`
  vs `0.2573`) carried; `EXP-CYCLIC-PERSIST-01` closed as
  `BEHAVIORAL_PASS_CANONICAL_FULL` at macro `0.9875` with the asymmetry resolved;
  and `EXP-CYCLIC-PERSIST-ABL-01` closed as `INCONCLUSIVE_INTERMEDIATE` at macro
  `0.5375` with the asymmetry inverted rather than removed. The two passing and
  failing cells of the 2x2 grid are stated together, and the result is never
  described as learned arithmetic — the rotation ALU is parameter-free and exact.
- The Phase 1.6 entry states that Stage 3 composed sequence training is *not
  authorized* and that an audit *recommends de-prioritizing it*. It does not say
  Stage 3 was run, and it does not say the audit's recommendation has been ratified.
- `experiment-3b-pathfinding-evaluation` carries the Milestone 3B outcome with its
  margin stated beside its interval: `+0.060` against `+0.10` on validation and
  `+0.056` against `+0.10` on the single held-out pass, the exact `0.0000`
  difference against the action-masking comparator, and the negative difference
  against the compute-matched two-rollout comparator. It states that the verifier
  rejected zero candidates, so error containment was never exercised, and that the
  outcome's registration and disposition are pending. It does not present the
  below-margin result as a success.
- `speculative-pipeline` carries `implementation: implemented` — isolation,
  deterministic verification and the transaction gate now exist in code and were
  used by the Milestone 3B runs — while its constraints state that recursion at
  R > 1, adaptive halting and the learned verifier half are *not* implemented.
  `nonlinear-candidate-mgu` still carries `implementation: implemented` and states
  that the project makes no novelty claim for it.
- The branching and learned-verifier findings remain labelled `Not adopted`, with
  the text stating that the *tested formulations* were rejected and that
  action-conditioned branching and a deterministic verifier were implemented
  afterwards. Neither is presented as later vindicating the rejected variant.
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

Resolved — `main` and `origin/main` are level at `b1e3cfc` as of the 2026-10-17
content re-sync. An earlier revision of this checklist recorded the Stage 7 release
work as one commit ahead and unpushed; that no longer holds. The re-sync itself is
uncommitted at the time of writing.

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
EXP-CYCLIC-STEPWISE-01 lists per-seed step-1 accuracies of 1.0000, 1.0000, 1.0000,
0.9375 and 0.9375 — a mean of 0.9750 — but states a macro of 0.9875, and repeats
that figure in its interpretation. The artifact shows where 0.9875 comes from: at
the *final* checkpoints the same five per-seed values are 0.9375, 1.0000, 1.0000,
1.0000 and 1.0000, which is 0.9875. The site reports the step-wise results without
the disputed macro.

That now collides with a legitimate value from a different experiment.
EXP-CYCLIC-PERSIST-01's own macro validation accuracy is also 0.9875 — computed
from per-seed terminal accuracies of 1.0000, 1.0000, 1.0000, 0.9375 and 1.0000,
which does average to 0.9875, checked against its artifact. The coincidence is
exact and the two numbers mean different things. The site states 0.9875 only for
EXP-CYCLIC-PERSIST-01, and always beside the per-seed values that produce it.
Reconciling the step-wise figure remains a research-owner decision, and nothing
else on the site depends on it.

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
