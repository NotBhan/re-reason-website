# RE:REASON — website

The public site for RE:REASON, an experimental research framework and candidate
recurrent inference architecture for multi-step algorithmic reasoning.

This repository is a **presentation layer**. The research itself — code,
experiment reports, the full specification suite — lives at
<https://github.com/NotBhan/re-reason>, which is the source of record. Every
technical claim on this site is sourced from there.

## Commands

```bash
npm install          # install dependencies
npm run dev          # development server on http://localhost:4321
npm run build        # production build into dist/
npm run preview      # serve the production build locally
npm run check        # astro check: type and template diagnostics
npm run typecheck    # alias for npm run check
```

> `NODE_ENV` note: `astro check` and the Tailwind Vite plugin are
> devDependencies. If your environment exports `NODE_ENV=production`, install
> with `npm install --include=dev` so they are present.

## Stack

Astro (static) · TypeScript (strict) · Tailwind CSS 4 via `@tailwindcss/vite` ·
React 19 (one island) · Motion for React (`motion/react`) · Anime.js 4 · CSS.

## The site

**Homepage** (`/`) — five sections, each with one clear job:

| # | Section | What it does | Animation |
| --- | --- | --- | --- |
| A | Hero | Identity, the primary action, the active architecture | CSS staggered entrance |
| B | Premise | Why the project exists, and what it refuses to claim | none — static |
| C | Structure | The state update, rendered as a diagram | Anime.js timeline |
| D | Evidence | Measured results and open questions | Motion for React island |
| E | Access | The public record | CSS hover and focus |

**Research pages** (`/research/`) — twelve routes in total:

```
/research/                                 the editorial index
/research/experiments/                     → /research/experiments/<id>
/research/architectures/                   → /research/architectures/<id>
/research/phases/                          → /research/phases/<id>
```

Research pages carry no client-side JavaScript at all. Each one states what its
evidence establishes *and* what it does not, and links to the report it came
from.

## Where things are

```
src/content/home.ts          ALL homepage copy, with per-item provenance
src/content.config.ts        content collection schemas
src/content/{experiments,architectures,phases}/   research entries
src/lib/site.ts              site metadata, sections, verified outbound URLs
src/lib/research.ts          collection helpers, related-reference validation
src/styles/global.css        design tokens, base layer, utilities
src/pages/                   the homepage and the research routes
src/components/sections/     the homepage's five sections
src/components/research/     shared research-page components
src/components/motion/       the Anime.js lattice and the React island
src/components/ui/           reused primitives
scripts/                     font, figure and social-card tooling
                             (run by hand, not at build time)
                             webkit-check.py drives WebKitGTK for browser checks
                             verify-release.mjs audits a build in dist/
docs/                        architecture, typography, content model, figures,
                             motion, deployment, release readiness
```

[`docs/release-checklist.md`](docs/release-checklist.md) records what is verified
and what is still waiting on a decision. [`docs/deployment.md`](docs/deployment.md)
describes the build and the host contract.

## Releasing

The production domain is not chosen, so nothing in the repository invents one.
Supply it at build time:

```bash
SITE_URL=https://<domain> npm run build
```

Without `SITE_URL` the build still succeeds and stays domain-agnostic: no
canonical URLs, no absolute Open Graph URLs, no sitemap, and a `robots.txt` that
disallows crawling. Nothing is fabricated in either mode — see
[deployment.md](docs/deployment.md).

## Before changing anything

- **Copy lives in two places, by design.** `src/content/home.ts` holds the
  homepage's editorial layer, split into material taken from the research
  repository (published measurements, cited) and provisional framing. Research
  entries in `src/content/` are held to a stricter rule: everything in them is
  verified material.
- **Do not add research claims.** The project maintains an explicit list of
  claims it refuses to make; the site inherits them. No novelty claim, and a
  measured observation is never presented as a cause.
- **Read a figure's report before publishing the figure.**
  [docs/figures.md](docs/figures.md) records two figures that fail that check and
  are deliberately not published.
- **Outbound URLs are verified.** Everything in `LINKS` was checked to resolve.
  Do not add a link that has not been.
- **Animation has one owner per property.** Read
  [docs/motion-guidelines.md](docs/motion-guidelines.md) first.

## Regenerating assets

```bash
node scripts/fetch-fonts.mjs          # self-hosted webfonts
node scripts/build-symbol-font.mjs    # the operator fallback subset
node scripts/sync-figures.mjs         # copy published figures + record hashes
node scripts/sync-figures.mjs --check # report drift against the hash manifest
```

The build does not run these. The site does not depend on the research
repository being present.

## Accessibility and resilience

The page is complete without JavaScript and under reduced motion: both paths
render the full content, statically. The headline is never pre-hidden, so it is
painted on the first frame. Keyboard focus is visible everywhere, the lattice has
a text alternative, and the findings filter defaults to showing everything.

## Licensing

Site code: MIT. The research repository is separately MIT licensed and remains
the source of record. All copy on this site is either quoted from that repository
or provisional editorial text written for the site — see `src/content/home.ts`.
