/**
 * Site-level metadata, section navigation and outbound destinations.
 *
 * Editorial content lives in `src/content/home.ts`. This module is
 * infrastructure: document metadata, the page's section list, and the only
 * outbound URLs the site is allowed to use.
 */

export const SITE = {
  name: 'RE:REASON',
  lang: 'en',
  title: 'RE:REASON — a latent state machine for multi-step algorithmic reasoning',
  description:
    'RE:REASON is an experimental research framework testing whether a compact, weight-tied recurrent core can solve multi-step algorithmic problems more efficiently than compute-matched baselines.',
} as const;

/**
 * Outbound destinations.
 *
 * Every entry below was verified to resolve (HTTP 200) before being added, and
 * each points at a path that exists on the repository's default branch. Do not
 * add a link that has not been checked — a research site with a dead
 * "documentation" link is worse than one with no link at all.
 *
 * Verified 2026-10-15.
 */
export const LINKS = {
  /** Repository root. */
  repository: 'https://github.com/NotBhan/re-reason',
  /** Current validated state of the research, cited claim by claim. */
  researchStatus: 'https://github.com/NotBhan/re-reason/blob/main/docs/RESEARCH_STATUS.md',
  /** Index of completed, append-only experiment reports. */
  reports: 'https://github.com/NotBhan/re-reason/tree/main/docs/reports',
} as const;

export type LinkKey = keyof typeof LINKS;

/** URL of a file inside the repository's default branch. */
export function repoBlob(path: string): string {
  return `${LINKS.repository}/blob/main/${path}`;
}

/** Resolves a destination key stored in content, keeping URL building in one place. */
export function linkFor(key: LinkKey): string {
  return LINKS[key];
}

export type SectionId = 'premise' | 'structure' | 'evidence' | 'access';

export interface Section {
  id: SectionId;
  number: string;
  label: string;
}

/**
 * Page sections, in reading order. The header navigation, the hero index and
 * the anchor ids in `index.astro` are all generated from this list, so a
 * section can never be added in one place and forgotten in another.
 *
 * These are anchors on the homepage only, so the header renders them only when
 * the homepage is the current route.
 */
export const SECTIONS: ReadonlyArray<Section> = [
  { id: 'premise', number: '01', label: 'Premise' },
  { id: 'structure', number: '02', label: 'Structure' },
  { id: 'evidence', number: '03', label: 'Evidence' },
  { id: 'access', number: '04', label: 'Access' },
] as const;

/** Site-wide destinations, valid on every route. */
export const ROUTES = {
  home: '/',
  research: '/research',
} as const;
