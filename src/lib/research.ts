import { getCollection } from 'astro:content';

/**
 * Helpers shared by the research routes.
 *
 * The one thing worth noting is `resolveRelated`. Astro 7's content layer has no
 * cross-collection `reference()` helper, so related-entry ids are plain strings
 * in frontmatter. This module closes that gap: it looks each id up and throws if
 * it cannot be found, which turns a broken cross-reference into a failed build
 * rather than a dead link in production.
 */

export const COLLECTIONS = ['experiments', 'architectures', 'phases'] as const;
export type CollectionName = (typeof COLLECTIONS)[number];

export const COLLECTION_META: Record<
  CollectionName,
  { singular: string; plural: string; href: string; blurb: string }
> = {
  experiments: {
    singular: 'Experiment',
    plural: 'Experiments',
    href: '/research/experiments',
    blurb:
      'Single experiments: the question, what was held fixed, what was measured, and what the measurement does and does not establish.',
  },
  architectures: {
    singular: 'Architecture',
    plural: 'Architectures',
    href: '/research/architectures',
    blurb:
      'Systems and documented designs — including one that was closed as a design and later built, because both states are part of its record.',
  },
  phases: {
    singular: 'Phase',
    plural: 'Phases',
    href: '/research/phases',
    blurb:
      'Programmes of work: their objectives, scope, outcome and the decisions taken, including the ones that were NO-GO.',
  },
};

export interface ResearchRef {
  id: string;
  kind: CollectionName;
  title: string;
  href: string;
  /** One-line description, for link lists. */
  summary: string;
}

export function entryPath(kind: CollectionName, id: string): string {
  return `${COLLECTION_META[kind].href}/${id}`;
}

/** An entry from any of the three collections. */
export type AnyEntry = Awaited<ReturnType<typeof getCollection>>[number];

interface Indexed {
  kind: CollectionName;
  entry: AnyEntry;
}

/**
 * A single id -> entry index, built once per build.
 *
 * Built by loading each collection rather than by probing `getEntry` with each
 * id in turn: probing logs "entry not found" for every id that belongs to a
 * different collection, which floods the build output with warnings that look
 * like errors. Building the index also catches duplicate ids across
 * collections, which probing would silently resolve to whichever collection was
 * checked first.
 */
let cache: Map<string, Indexed> | undefined;

async function index(): Promise<Map<string, Indexed>> {
  if (cache) return cache;

  const built = new Map<string, Indexed>();
  for (const kind of COLLECTIONS) {
    for (const entry of await getCollection(kind)) {
      const existing = built.get(entry.id);
      if (existing) {
        throw new Error(
          `Duplicate content id "${entry.id}": found in both "${existing.kind}" and "${kind}". ` +
            'Ids must be unique across the three collections so `related` references are unambiguous.',
        );
      }
      built.set(entry.id, { kind, entry });
    }
  }

  cache = built;
  return built;
}

/** Finds an entry by id across all three collections. */
export async function findAnyEntry(id: string): Promise<Indexed | undefined> {
  return (await index()).get(id);
}

/**
 * Resolves a list of related ids to links.
 * Throws on an unknown id so a typo fails the build.
 */
export async function resolveRelated(ids: ReadonlyArray<string>): Promise<Array<ResearchRef>> {
  const out: Array<ResearchRef> = [];
  for (const id of ids) {
    const found = await findAnyEntry(id);
    if (!found) {
      throw new Error(
        `Unknown related entry "${id}". Check the \`related\` list against src/content/.`,
      );
    }
    const data = found.entry.data as { title: string; summary: string };
    out.push({
      id,
      kind: found.kind,
      title: data.title,
      summary: data.summary,
      href: entryPath(found.kind, id),
    });
  }
  return out;
}

/** Every entry, ordered for an index: experiments by identifier, others by title. */
export async function getAll(kind: CollectionName) {
  const entries = await getCollection(kind);
  return entries.sort((a, b) => {
    if (kind === 'experiments') {
      const ai = (a.data as { identifier: string }).identifier;
      const bi = (b.data as { identifier: string }).identifier;
      // Single letters first, then two-letter identifiers, each alphabetically.
      if (ai.length !== bi.length) return ai.length - bi.length;
      return ai.localeCompare(bi);
    }
    return (a.data as { title: string }).title.localeCompare((b.data as { title: string }).title);
  });
}

/** A short label for an entry in a list, e.g. "G" or "1.6". */
export function badgeFor(kind: CollectionName, data: Record<string, unknown>): string | undefined {
  if (kind === 'experiments' && typeof data.identifier === 'string') return data.identifier;
  if (kind === 'phases' && typeof data.number === 'string') return data.number;
  return undefined;
}
