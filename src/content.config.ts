import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/* ===========================================================================
   Research content model
   ---------------------------------------------------------------------------
   Three collections, because the repository's material genuinely has three
   different shapes. An architecture description has no "what this does not
   establish" in the experimental sense, and forcing one schema across all
   three would either weaken the experiment records or invent fields for
   architecture entries.

     experiments    a single numbered experiment: question, protocol, results,
                    what it establishes, what it does not, limitations.
     architectures  a system or a documented component: purpose, structure,
                    interfaces, constraints, and its status.
     phases         a programme of work: objectives, scope, status, outcome.

   Findings are NOT a collection. The homepage already carries the summary
   findings in src/content/home.ts, sourced to the same reports these entries
   cite; adding a fourth collection would put the same claim in two files that
   can drift apart. Research pages link to the experiment that produced a
   result instead of restating it.

   Every technical string in these files is quoted or paraphrased from the
   source report named in `sources`. Where a number appears it is the published
   number. See docs/content-model.md.
   =========================================================================== */

/** A reference to a document in the research repository. */
const source = z.object({
  /**
   * Repository-relative path. Validated as a path so a typo cannot ship a
   * link to nowhere, and resolved to a URL by `repoBlob()` in src/lib/site.ts.
   */
  path: z
    .string()
    .regex(
      /^[A-Za-z0-9._/-]+\.(md|json|py|npz|pt)$/,
      'must be a repository-relative file path with a known extension',
    ),
  /** Shown to the reader. Defaults to the final path segment. */
  label: z.string().optional(),
});

/**
 * A published research figure.
 *
 * `alt`, `caption` and `context` are all required: a complex chart cannot be
 * conveyed by alt text alone, and the experimental conditions must travel with
 * the result rather than being dropped to make it look stronger.
 */
const figure = z.object({
  /** File name inside docs/reports/figures/. */
  file: z.string().regex(/^[A-Za-z0-9._-]+\.png$/, 'must be a PNG file name'),
  title: z.string(),
  /** What the figure plots. */
  caption: z.string(),
  /** The conditions it was measured under. Required: a plot without its
   *  protocol is not evidence. */
  context: z.string(),
  /** Short alternative text for the image element. Not a substitute for the
   *  caption, which carries the interpretation. */
  alt: z.string(),
});

const status = z.enum(['completed', 'active', 'deferred', 'reference', 'proposed', 'closed']);

const experiments = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/experiments' }),
  schema: z.object({
    /** Stable identifier used in the report series, e.g. "G". */
    identifier: z.string().min(1),
    title: z.string(),
    /** ISO date the experiment completed. */
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be an ISO date (YYYY-MM-DD)'),
    status: z.literal('completed'),
    /** The report's own classification of what the evidence supports. */
    classification: z.string(),
    /** One sentence, for indexes. */
    summary: z.string().max(400),

    question: z.string(),
    motivation: z.string(),
    /** What was held fixed — the conditions the result is valid under. */
    frozen: z.array(z.string()).min(1),
    procedure: z.array(z.string()).min(1),
    /** Measured results, with units and comparison context in the value. */
    results: z.array(
      z.object({
        label: z.string(),
        value: z.string(),
        note: z.string().optional(),
      }),
    ),

    establishes: z.string(),
    doesNotEstablish: z.string(),
    limitations: z.array(z.string()).min(1),
    nextStep: z.string().optional(),

    /** Data, runners, checkpoints — the reproducibility trail. */
    artifacts: z.array(source).default([]),
    sources: z.array(source).min(1),
    figures: z.array(figure).default([]),
    /** Ids of other entries in these collections. Validated at build time. */
    related: z.array(z.string()).default([]),
  }),
});

const architectures = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/architectures' }),
  schema: z.object({
    title: z.string(),
    status,
    /** One sentence, for indexes. */
    summary: z.string().max(400),
    /** Whether this is running, or a documented design that was not adopted. */
    implementation: z.enum(['implemented', 'not-implemented']),

    purpose: z.string(),
    components: z.array(
      z.object({
        name: z.string(),
        detail: z.string(),
      }),
    ),
    /** The update rule or data flow, as tokens so it can be set with real
     *  subscripts. Optional: not every architecture has a single rule. */
    updateRule: z.array(z.union([z.string(), z.object({ sub: z.string() })])).optional(),
    updateRuleNote: z.string().optional(),
    constraints: z.array(z.string()).default([]),
    /** Explicit unresolved design questions. */
    openQuestions: z.array(z.string()).default([]),

    sources: z.array(source).min(1),
    figures: z.array(figure).default([]),
    related: z.array(z.string()).default([]),
  }),
});

const phases = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/phases' }),
  schema: z.object({
    title: z.string(),
    number: z.string(),
    status: z.enum(['closed', 'proposed', 'in-progress']),
    /** One sentence, for indexes. */
    summary: z.string().max(400),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be an ISO date (YYYY-MM-DD)'),

    objectives: z.array(z.string()).min(1),
    scope: z.string(),
    /** Results that exist, as published. */
    results: z.array(
      z.object({
        label: z.string(),
        value: z.string(),
        note: z.string().optional(),
      }),
    ),
    /** Decisions taken, with the outcome stated plainly — including when the
     *  decision was NO-GO. */
    decisions: z.array(
      z.object({
        label: z.string(),
        outcome: z.string(),
      }),
    ),
    /** What is deliberately not being done, and why. */
    notPlanned: z.array(z.string()).default([]),

    artifacts: z.array(source).default([]),
    sources: z.array(source).min(1),
    figures: z.array(figure).default([]),
    related: z.array(z.string()).default([]),
  }),
});

export const collections = { experiments, architectures, phases };
