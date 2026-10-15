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

## The homepage

Five sections, each with one clear job:

| # | Section | What it does | Animation |
| --- | --- | --- | --- |
| A | Hero | Identity, the primary action, the active architecture | CSS staggered entrance |
| B | Premise | Why the project exists, and what it refuses to claim | none — static |
| C | Structure | The state update, rendered as a diagram | Anime.js timeline |
| D | Evidence | Measured results and open questions | Motion for React island |
| E | Access | The public record | CSS hover and focus |

## Where things are

```
src/content/home.ts          ALL page copy, with per-item provenance
src/lib/site.ts              site metadata, sections, verified outbound URLs
src/styles/global.css        design tokens, base layer, utilities
src/components/sections/     the five sections
src/components/motion/       the Anime.js lattice and the React island
src/components/ui/           reused primitives
docs/                        architecture and motion conventions
```

## Before changing anything

- **Copy lives in one file.** `src/content/home.ts` is the only place strings are
  written. It separates material taken from the research repository (published
  measurements, cited) from editorial framing written for the site (provisional).
- **Do not add research claims.** The project maintains an explicit list of
  claims it refuses to make; the site inherits them. No novelty claim, and a
  measured observation is never presented as a cause.
- **Outbound URLs are verified.** Everything in `LINKS` was checked to resolve.
  Do not add a link that has not been.
- **Animation has one owner per property.** Read
  [docs/motion-guidelines.md](docs/motion-guidelines.md) first;
  [docs/architecture.md](docs/architecture.md) covers tokens, the content model
  and the rendering model.

## Accessibility and resilience

The page is complete without JavaScript and under reduced motion: both paths
render the full content, statically. The headline is never pre-hidden, so it is
painted on the first frame. Keyboard focus is visible everywhere, the lattice has
a text alternative, and the findings filter defaults to showing everything.

## Licensing

Site code: MIT. The research repository is separately MIT licensed and remains
the source of record. All copy on this site is either quoted from that repository
or provisional editorial text written for the site — see `src/content/home.ts`.
