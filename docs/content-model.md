# Research content model

How research material is represented, validated and published.

## Routes

```
/research/                                 the editorial index
/research/experiments/                     list            → /research/experiments/<id>
/research/architectures/                   list            → /research/architectures/<id>
/research/phases/                          list            → /research/phases/<id>
```

Twelve routes are generated in total: the homepage, the research index, three
category indexes, and seven detail pages. The three category indexes come from
one template (`src/pages/research/[category]/index.astro`) rather than three
near-identical files.

`<id>` is the markdown file name without the extension, so the URL of an entry
is stable as long as its file is not renamed.

## Three collections, not four

Astro's content layer is configured in `src/content.config.ts` using the `glob`
loader and `zod` schemas.

| Collection | Shape |
| --- | --- |
| `experiments` | A numbered experiment: question, motivation, what was held fixed, procedure, measured results, what it establishes, what it does not, limitations, next step, artifacts |
| `architectures` | A system or documented design: purpose, components, update rule, constraints, open questions, implementation status |
| `phases` | A programme of work: objectives, scope, results, decisions, what is not planned |

Three collections rather than one, because the material genuinely has three
shapes. An architecture entry has no "what this does not establish" in the
experimental sense — an architecture is not a measurement. Forcing one schema
across all three would either weaken the experiment records or invent fields for
architecture entries that would then be filled with nothing.

**Findings are deliberately not a fourth collection.** The homepage already
carries summary findings in `src/content/home.ts`, sourced to the same reports
these entries cite. A findings collection would put the same claim in two files
that can drift apart. Research pages link to the experiment that produced a
result instead of restating it.

## What the schemas enforce

Schemas are not decoration here; they catch real mistakes. Every field that the
project's documentation policy requires for a published result is `required` in
the schema, so an entry cannot be published without it:

- `establishes` and `doesNotEstablish` are both required, and both required to be
  non-empty. A result cannot be published without its qualification.
- `limitations` must contain at least one item.
- `frozen` and `procedure` must be non-empty: a measured result has to state the
  conditions it was measured under.
- Every entry must cite at least one `sources` path.
- Source paths are validated against a pattern of repository-relative file paths
  with known extensions, so a typo cannot ship a link to nowhere.
- Every figure requires `caption`, `context` and `alt`. `context` is required
  precisely so a plot never appears without the conditions it was measured under.
- Dates are validated as ISO dates.

Two further checks happen at build time rather than in the schema:

- **Related references.** `resolveRelated()` in `src/lib/research.ts` looks up
  every id in `related` and throws if one is unknown. Astro 7 has no
  cross-collection `reference()` helper, so this is the equivalent validation:
  a broken cross-reference fails the build with the offending id named.
- **Duplicate ids.** The id index is keyed across all three collections and
  throws on a collision, because a duplicate would make a `related` reference
  ambiguous.

Earlier in this repository a schema error caught a real defect: YAML parses an
unquoted ISO date into a `Date` object, and an unquoted colon inside a list item
turns that item into a mapping. Both were caught by validation rather than
shipping as malformed content.

## Verified content versus provisional copy

The homepage keeps its two-tier split in `src/content/home.ts`: material quoted
from the research repository with per-item provenance, and provisional editorial
framing written for the site.

Research entries are held to a stricter rule. Everything in
`src/content/experiments/`, `src/content/architectures/` and
`src/content/phases/` is **verified material**. The narrative prose at the end of
each entry is written for the site, but every claim in it is a restatement of
something in the cited source report — it does not introduce new claims, and it
does not soften any of the report's qualifications.

Provisional editorial copy stays out of these collections. Where a research page
needs framing — a category blurb, a section label — it lives in
`COLLECTION_META` in `src/lib/research.ts` and is marked as such.

## Adding an entry

1. Create a markdown file in the relevant collection directory. The file name
   becomes the id and the URL.
2. Fill the frontmatter. Read the source report first: the schema requires the
   question, conditions, results and limitations, and those cannot be guessed
   from a title.
3. Quote or closely paraphrase the report. Preserve its terminology and its
   qualifications — do not simplify a distinction in a way that changes its
   meaning.
4. Cite the report in `sources`, and add reproducibility artifacts to
   `artifacts`.
5. If the entry has figures, copy them with `node scripts/sync-figures.mjs`
   after adding the file names to its `PUBLISHED` list, and read
   [figures.md](./figures.md) first.
6. Run `npm run check` and `npm run build`. A broken `related` id or a missing
   required field fails here.

## Writing rules inherited from the research repository

These come from the project's own `DOCUMENTATION_POLICY.md` and `AGENTS.md`, and
the site follows them:

- **No novelty claims.** The active model is classified in the literature as a
  known recurrence. Nothing on this site may imply otherwise.
- **An observation is not a cause.** Findings and results are labelled with what
  they establish *and* what they explicitly do not.
- **Negative results are published.** Two of the seven entries record approaches
  that were tried and not adopted, and one records a failed gate.
- **Nothing is published that is not in the repository.** Where a measurement is
  quoted, it is quoted with the document it came from.
- **A phase or experiment is not a success merely because documentation exists
  for it.** Phase 1.6 is published with its pilot's failure stated in the summary,
  not buried below it.

## Verified destinations

`LINKS` in `src/lib/site.ts` holds the only outbound URLs the site uses. Each was
checked to resolve before being added, and `repoBlob()` builds deep links from
repository-relative paths so a source reference and its link cannot disagree.

No production domain is known, so `astro.config.mjs` sets no `site`, and there
are no canonical or Open Graph tags. Add them together with a `site` value.
