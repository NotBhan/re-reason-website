# Architecture

Notes for the RE:REASON presentation site. Read together with
[motion-guidelines.md](./motion-guidelines.md), which covers the animation
layers in detail.

This repository is the **website**. It is a presentation layer over the research
repository at <https://github.com/NotBhan/re-reason>, which is the source of
record for every technical claim made here.

## Stack

| Package | Version | Responsibility |
| --- | --- | --- |
| `astro` | 7.3.8 | Routing, layouts, static-first rendering. Static output; no adapter. |
| `@astrojs/react` | 7.0.1 | Lets React components be used as hydrated islands. |
| `react` / `react-dom` | 19.3.1 | Runtime for the single interactive island. |
| `tailwindcss` + `@tailwindcss/vite` | 4.3.3 | Utility styling through the official Vite plugin (Tailwind CSS 4 — not the v3 PostCSS setup). |
| `motion` | 14.2.0 | Interface animation, imported from `motion/react`. `framer-motion` arrives as its transitive dependency; it is not a direct dependency and must not be imported directly. |
| `animejs` | 4.5.0 | Timeline and SVG animation, imported from `animejs`. |
| `typescript` | 6.0.3 | Strict typing. |
| `@astrojs/check` | 0.9.10 | `astro check` diagnostics. |

`typescript` is pinned to `^6` because `@astrojs/check` declares a peer range of
`^5 || ^6`. Do not bump it to 7 until that peer range moves.

There is no GSAP, no separate Framer Motion dependency, no animation plugin.
The three layers are CSS, Anime.js and Motion for React, and nothing else should
be added without removing one.

## Directory layout

```
src/
  layouts/BaseLayout.astro     document shell, metadata, progressive-enhancement boot script
  pages/index.astro            the homepage, composed from five sections
  components/
    sections/                  the page's sections, in reading order
      Hero.astro               A — CSS-animated entrance, no script
      Premise.astro            B — static
      Structure.astro          C — editorial frame around the lattice
      Evidence.astro           D — metrics (static) + findings island
      Access.astro             E — static
    motion/                    anything that needs a script to animate
      StateLattice.astro       Anime.js timeline, scoped CSS, replay control
      Findings.tsx             Motion for React island
    layout/                    header and footer
    ui/                        reused primitives
      Eyebrow.astro            orange-marked section label
      ExternalLink.astro       outbound link with an accessible new-tab cue
      Marks.astro              hairline registration corners
      Specimen.astro           the hero's architecture readout
  content/home.ts              ALL page copy, with provenance
  lib/site.ts                  site metadata, sections, verified outbound URLs
  styles/global.css            design tokens, base layer, utilities
  env.d.ts                     astro/client type reference
public/favicon.svg
docs/                          this file and the motion guidelines
```

Conventions:

- `.astro` by default. React only where state or gestures justify it.
- `components/sections/` holds one file per page section. A section owns its own
  animation **only** when that animation is CSS-only; when a script is needed the
  animated piece moves to `components/motion/` and the section keeps the
  editorial frame.
- `components/ui/` holds primitives reused by more than one section. It is
  deliberately small.
- `#`-prefixed imports alias to `src/` through `tsconfig.json` `paths`, which
  Astro resolves automatically.

## Content model and sourcing policy

**Every string on the page lives in `src/content/home.ts`.** Components are
presentational; they receive content as props or import it, but they do not
contain copy of their own.

The file is organised in two tiers, and the distinction is the point:

- **VERIFIED** — statements, numbers and quotations taken from the research
  repository. Each carries `sources` naming the document it came from. These are
  published measurements. Do not change a number here without changing the
  source document first, and do not add a claim that is not in the repository.
- **PROVISIONAL** — editorial framing written for this site: headings, section
  introductions, labels, button text. Not reviewed by the project, safe to
  rewrite. Isolated here so a copy pass touches one file.

The research project maintains an explicit list of claims it *refuses* to make,
and the site inherits them. In particular:

- **No novelty claim.** The active model is classified in the literature as a
  known recurrence (Update-Gate RNN / MGU family). The site must not imply
  otherwise.
- **An observation is not a cause.** Findings are labelled with what they
  establish *and* what they explicitly do not. This is why every finding card has
  a "Does not establish" column.
- **Negative and rejected results are reported**, not hidden. Two findings are
  labelled "Not adopted".
- **Nothing is reported on the site that is not in the repository.** Where a
  measurement is quoted, it is quoted with the document it came from.

### Destinations

`LINKS` in `src/lib/site.ts` is the only place outbound URLs are defined. Every
entry was verified to resolve (HTTP 200) against the repository's default branch
before being added, and `repoBlob()` builds deep links from repository-relative
paths so a source reference and its link can never disagree.

Do not add a link that has not been checked. A research site with a dead
"documentation" link is worse than one with no link at all.

## Design tokens

All art direction lives in `src/styles/global.css`, in two blocks:

- `@theme { … }` — Tailwind v4 namespaced tokens. These generate utilities, so
  `--color-ink` produces `bg-ink` / `text-ink`, `--text-mega` produces
  `text-mega` with its paired line-height and letter-spacing.
- `:root { … }` — plain custom properties that are not Tailwind namespaces:
  `--shell-gutter`, `--section-block`, `--hit-area`, `--tracking-label`.

### Colour

Contrast ratios against `--color-ink` are documented inline and were measured,
not assumed. Two constraints worth remembering:

- `--color-control` exists because decorative hairlines (`--color-line`,
  `--color-line-hi`) are below the 3:1 required by WCAG 1.4.11 for interactive
  boundaries. Buttons and controls use `border-control`.
- **`bone` on a `signal` fill is ~2.6:1 and must never be used.** A filled accent
  control uses `text-ink` on `bg-signal`, which is 6.9:1.

### Type

Three independent family slots — `--font-display`, `--font-reading`,
`--font-mono` — so a licensed display face can be introduced without disturbing
prose or technical labels. To swap one:

1. Add an `@font-face` (self-hosted) or a licensed `<link>` in `BaseLayout.astro`.
2. Repoint that slot. Nothing else changes.

Display is applied to `h1`, `h2`, `h3` in the base layer; body copy uses the
reading slot.

The scale runs from an 11px tracked label to a 104px display size, all fluid
`clamp()` values so sizes move continuously instead of stepping at breakpoints.

### Utilities

`shell` (container), `section-pad` (vertical rhythm), `measure` / `measure-tight`
/ `measure-wide` (line length), `label` (tracked uppercase technical label),
`mono` (monospace **without** the uppercase transform — use it for anything whose
spelling carries meaning, such as a file path), `rule` (hairline).

## Rendering model

Static pre-render, no server, adapter, CMS or database. There is exactly one
React island on the site.

JavaScript payload as built (gzipped):

| Asset | Size | When it loads |
| --- | --- | --- |
| `index.html` | ~11 KB | Immediately |
| CSS | ~5 KB | Immediately |
| Anime.js chunk | ~15 KB | Immediately, deferred |
| React + Motion island | ~115 KB | Only when the island scrolls into view |

Initial payload is roughly 31 KB gzipped. If a future section does not need
interactivity, it should not increase the last row.

## Responsive strategy

Mobile is composed, not scaled.

- The hero headline is a stack of display lines that rewrap naturally below the
  display breakpoint rather than being shrunk.
- **Navigation moves rather than hiding.** The header carries the section list on
  large screens; on small screens the list lives in the hero's numbered contents
  index. There is no hamburger and no script.
- Two-column comparisons (the finding cards' establishes/does-not-establish, the
  task facts) collapse to a single column.
- The metrics are a definition list, not a table, so nothing needs horizontal
  scrolling at 390px.
- Long monospace source paths use `overflow-wrap: anywhere`; without it they set
  a min-content width that overflows the viewport.

## Accessibility

- Single `:focus-visible` treatment site-wide: 2px signal outline, 3px offset.
- `scroll-margin-top` on `[id]` targets so anchors clear the sticky header.
- The lattice is `role="img"` with `<title>` and `<desc>`, and its meaning is also
  stated in visible text (the rule, the legend, the disclaimer) — nothing depends
  on seeing the animation.
- The findings filter uses real buttons with `aria-pressed` and an
  `aria-live="polite"` count. Its default state shows everything, so no content
  is behind the interaction.
- Outbound links carry a visually hidden "(opens in a new tab)".
- Reduced motion is honoured in CSS and in both scripts; see the motion
  guidelines.

## Decisions left open

- **Display and reading typefaces.** System stacks are a placeholder. Licensing
  and pairing still need to be chosen; the slots exist for it.
- **Site URL and metadata.** `astro.config.mjs` has no `site`, and there are no
  Open Graph or canonical tags, because the domain is unknown. Add them together
  with a `site` value.
- **`robots.txt` and a sitemap**, which depend on the same domain.
- **Research pages.** The homepage is the only route. Deeper pages (per-experiment,
  per-phase) would want the content collections already anticipated by
  `src/content/`.
- **Figures.** The research repository ships real plots under
  `docs/reports/figures/`. None are used here yet; several would strengthen the
  evidence section once licensing and framing are agreed.
- **Scroll-linked sequences.** Anime.js supports scroll observers and Motion
  offers `useScroll`. Neither is used. Any addition must not hijack scrolling.
- **A shared `Section` layout.** All five sections repeat the same eyebrow /
  heading / two-column frame. It is duplicated on purpose for now, because each
  diverges; extract it once the pattern is settled.
