/**
 * ===========================================================================
 * Editorial content for the homepage — the single source for every string
 * rendered on the page.
 * ===========================================================================
 *
 * TWO TIERS. The difference matters, so it is stated in the types:
 *
 *   VERIFIED   Statements, numbers and quotations lifted from the RE:REASON
 *              research repository. Each carries `sources` naming the document
 *              it came from. These are *published measurements*. Do not edit a
 *              number here without changing the source document first, and do
 *              not add a claim that is not in the repository — the project
 *              keeps an explicit list of claims it refuses to make.
 *
 *   PROVISIONAL  Editorial framing written for this site: headings, section
 *              introductions, labels, button text. Not reviewed by the project
 *              and safe to rewrite. Marked so a copy pass touches one file.
 *
 * Sources used, all under https://github.com/NotBhan/re-reason:
 *   README.md                          problem statement, boundaries
 *   docs/01_project_overview.md        hypothesis, nomenclature, philosophy
 *   docs/RESEARCH_STATUS.md            current validated state (2026-10-16)
 *   docs/reports/*.md                  individual measurements, cited per item
 *
 * Epistemic rules this file follows, taken from the repository's own policy:
 *   - No novelty claim. The active model is classified in the literature as a
 *     known recurrence; the site must not imply otherwise.
 *   - A measured observation is not a cause. Findings are labelled with what
 *     they establish *and* what they do not.
 *   - Negative and rejected results are reported, not hidden.
 *   - Nothing is reported here that is not also in the repository.
 */

import type { LinkKey } from '@/lib/site';

export type Tone = 'bone' | 'signal' | 'ash';
export type Weight = 'light' | 'normal' | 'medium' | 'semibold';

export interface Segment {
  text: string;
  tone?: Tone;
  weight?: Weight;
}

/**
 * A formula is stored as tokens rather than a single string so it can be set
 * with real `<sub>` markup.
 *
 * The alternative — Unicode subscript characters such as U+209C — was measured
 * and rejected: none of the site's webfonts carry them in any subset, so the
 * browser would substitute a system font mid-formula, and screen readers
 * pronounce them inconsistently. See docs/typography.md.
 */
export type FormulaToken = string | { sub: string };

export interface SpecRow {
  label: string;
  value: string;
}

export interface SourceRef {
  label: string;
  /** Repository-relative path; resolved to a link by site.ts. */
  path: string;
}

/* --------------------------------------------------------------------------
   A. Opening
-------------------------------------------------------------------------- */

export interface HeroContent {
  eyebrow: string;
  headline: ReadonlyArray<ReadonlyArray<Segment>>;
  lead: string;
  primaryAction: { label: string; hrefKey: LinkKey };
  secondaryAction: { label: string; hrefKey: LinkKey };
  specimen: {
    title: string;
    badge: string;
    name: string;
    rows: ReadonlyArray<SpecRow>;
  };
  phaseNotice: string;
}

/**
 * `headline` is a list of display lines, each a list of styled segments.
 * One accent phrase only, in the first line.
 */
export const HERO: HeroContent = {
  eyebrow: 'Experimental research framework',

  headline: [
    [{ text: 'A ' }, { text: 'latent', tone: 'signal' }, { text: ' state machine' }],
    [{ text: 'for multi-step', weight: 'light' }],
    [{ text: 'algorithmic reasoning', weight: 'semibold' }],
  ],

  lead: 'RE:REASON tests whether a compact, weight-tied recurrent core can solve multi-step algorithmic problems more efficiently than compute-matched baselines. Components are kept only when ablations justify their cost.',

  primaryAction: { label: 'Read the repository', hrefKey: 'repository' },
  secondaryAction: { label: 'Research status', hrefKey: 'researchStatus' },

  /** VERIFIED — docs/RESEARCH_STATUS.md, "Architecture and scope". */
  specimen: {
    title: 'Active architecture',
    badge: 'Phase 1',
    name: 'NonlinearCandidateMGU',
    rows: [
      { label: 'parameters', value: '226,358' },
      { label: 'state', value: '212-dim' },
      { label: 'observation', value: '256-dim embedding' },
      { label: 'candidate', value: '146-dim hidden' },
      { label: 'commit', value: 'convex-bounded, element-wise' },
      { label: 'classification', value: 'known recurrence — MGU family' },
    ],
  },

  /**
   * VERIFIED — docs/reports/architecture_gap_audit_and_milestone_proposal.md,
   * docs/research/pre_3b_experimental_protocol.md.
   */
  phaseNotice:
    'The state-machine machinery — isolated branches, a deterministic verifier and transactional commits — is implemented and has been evaluated end to end. Recursion and adaptive halting are not implemented.',
};

/* --------------------------------------------------------------------------
   B. Premise
-------------------------------------------------------------------------- */

export interface PremiseContent {
  eyebrow: string;
  heading: string;
  intro: string;
  items: ReadonlyArray<{ number: string; title: string; body: string }>;
  hypothesisLabel: string;
  hypothesis: string;
  hypothesisSource: SourceRef;
  disclaimerLead: string;
  disclaimerBody: string;
  cycle: ReadonlyArray<string>;
  cycleAccent: string;
  cycleCaption: string;
}

export const PREMISE: PremiseContent = {
  eyebrow: 'Premise',
  heading: 'Three structural inefficiencies.',

  /** PROVISIONAL framing. */
  intro:
    'The motivating problem is not that autoregressive models are bad at reasoning. It is that emitting tokens to think with imposes three specific costs.',

  /** VERIFIED — README.md "Problem Statement & Motivation"; docs/01 §2. */
  items: [
    {
      number: '01',
      title: 'High token overhead',
      body: 'Intermediate reasoning requires emitting full natural-language token sequences, consuming memory bandwidth and sequence compute.',
    },
    {
      number: '02',
      title: 'Irreversible context contamination',
      body: 'Once an incorrect token is emitted into the context window, subsequent attention attends to it. Standard inference has no transactional rollback.',
    },
    {
      number: '03',
      title: 'Static computation depth',
      body: 'Standard feedforward layers allocate an identical compute budget to every token, whether the step is trivial or computationally hard.',
    },
  ],

  hypothesisLabel: 'Core hypothesis',

  /** VERIFIED — verbatim from docs/01_project_overview.md §3. */
  hypothesis:
    'Can a small, weight-tied latent recurrent core with isolated hypothesis exploration and verifier-gated state commits solve multi-step algorithmic problems with higher parameter efficiency, better error containment, or lower inference compute than compute-matched feedforward, recurrent, and sequence baselines?',
  hypothesisSource: { label: 'docs/01_project_overview.md', path: 'docs/01_project_overview.md' },

  /** VERIFIED — the sentences immediately following the hypothesis. */
  disclaimerLead: 'We do not know the answer.',
  disclaimerBody:
    'If testing shows this configuration underperforms standard baselines, the architecture will be deemed non-viable.',

  /** VERIFIED — the project's stated empirical cycle. */
  cycle: ['Build', 'Measure', 'Ablate', 'Interpret', 'Keep or kill', 'Extend'],
  cycleAccent: 'Keep or kill',
  cycleCaption:
    'Every component is a hypothesis. A rigorous negative result is a successful outcome.',
};

/* --------------------------------------------------------------------------
   C. Structure
-------------------------------------------------------------------------- */

export interface StructureContent {
  eyebrow: string;
  heading: string;
  intro: string;
  rule: ReadonlyArray<FormulaToken>;
  ruleCaption: ReadonlyArray<FormulaToken>;
  whyItMatters: string;
  task: { label: string; facts: ReadonlyArray<string> };
  diagram: {
    steps: number;
    coordinates: number;
    title: string;
    description: string;
    legend: ReadonlyArray<{ mark: string; meaning: string }>;
    disclaimer: string;
  };
  replayLabel: string;
}

export const STRUCTURE: StructureContent = {
  eyebrow: 'Structure',
  heading: 'A state update, coordinate by coordinate.',
  /** PROVISIONAL framing over verified mechanism findings. */
  intro:
    'The active model commits with a bounded convex update. Each coordinate of the state either holds its previous value or moves toward the candidate, decided independently by that coordinate’s gate value.',

  /** VERIFIED — docs/RESEARCH_STATUS.md, "Official Phase-1 training objective". */
  rule: [
    'S',
    { sub: 't' },
    ' = (1 − f',
    { sub: 't' },
    ') ⊙ S',
    { sub: 't−1' },
    ' + f',
    { sub: 't' },
    ' ⊙ C',
    { sub: 't' },
  ],

  ruleCaption: [
    'f',
    { sub: 't' },
    ' is a full 212-dimensional gate vector, not a scalar. ⊙ is the element-wise product.',
  ],

  /** VERIFIED — experiment_h_lambda_interpolation.md; experiment_j_commit_intervention.md. */
  whyItMatters:
    'Replaying the gate element-wise reproduces the commit bit-exactly, while the same gate’s mean-scalarisation collapses decode accuracy from 0.855 to 0.182 on candidate-correct general adds. Any reasoning about the commit has to be coordinate-wise.',

  /** VERIFIED — benchmark contract, src/re_reason/benchmarks/register_machine_benchmark.py. */
  task: {
    label: 'Register Tracking',
    facts: [
      '4 registers (R0–R3), values in {0…9}',
      '22-dim instruction encoding',
      'SET · SWAP · READ · ADD',
      'ADD: R[d] ← (R[d] + R[s]) mod 10',
      'horizon T = 10',
    ],
  },

  /**
   * The diagram renders the update rule. It is NOT logged experimental data
   * and is labelled as such wherever it appears.
   */
  diagram: {
    steps: 10,
    coordinates: 8,
    title: 'Diagram of the per-coordinate commit over ten steps.',
    description:
      'Ten columns, one per step, and eight rows, one per state coordinate. A filled cell means the gate for that coordinate moved the state toward the candidate at that step; an empty cell means the coordinate held its previous value. The pattern renders the update rule and is not logged experimental data.',
    legend: [
      { mark: 'hold', meaning: 'gate near 0 — the coordinate keeps its value' },
      { mark: 'move', meaning: 'gate near 1 — it takes the candidate' },
      {
        mark: 'committed',
        meaning: 'the writes committed at the final step, once the sequence has settled',
      },
    ],
    disclaimer: 'Rendering of the update rule. Not logged data.',
  },

  replayLabel: 'Replay sequence',
};

/* --------------------------------------------------------------------------
   D. Evidence
-------------------------------------------------------------------------- */

export type FindingStatus = 'established' | 'current' | 'open' | 'not-adopted';

export interface Finding {
  id: string;
  status: FindingStatus;
  title: string;
  /** What was observed, with the numbers as published. */
  detail: string;
  /** What the measurement supports. */
  establishes: string;
  /** What it explicitly does not support. */
  doesNotEstablish: string;
  sources: ReadonlyArray<SourceRef>;
}

export interface EvidenceContent {
  eyebrow: string;
  heading: string;
  statusLine: string;
  metrics: {
    caption: string;
    columns: ReadonlyArray<string>;
    rows: ReadonlyArray<{ cells: ReadonlyArray<string>; primary: boolean }>;
    sources: ReadonlyArray<SourceRef>;
  };
  findingsHeading: string;
  findingsIntro: string;
  findings: ReadonlyArray<Finding>;
}

export const FINDING_STATUS_LABELS: Record<FindingStatus, string> = {
  established: 'Established',
  current: 'Current',
  open: 'Open',
  'not-adopted': 'Not adopted',
};

export const EVIDENCE: EvidenceContent = {
  eyebrow: 'Evidence',
  heading: 'What has been measured, and what has not.',

  /**
   * VERIFIED — docs/RESEARCH_STATUS.md §5 and the run artifacts; the milestone
   * outcome's registration and disposition are pending, per PLAN.md.
   */
  statusLine:
    'No experiment is currently running. The 2x2 supervision grid for modular addition is complete: joint destination and persistence supervision passed the Phase 1.6 gate at a macro validation accuracy of 0.9875, and the persistence-only ablation closed inconclusive at 0.5375. The first end-to-end pathfinding evaluation put the gated pipeline level with a shallow action-masking comparator, and its outcome awaits principal-investigator disposition.',

  /** VERIFIED — docs/RESEARCH_STATUS.md, "Headline validated metrics". */
  metrics: {
    caption: 'Register Tracking — exact-match accuracy',
    columns: ['Objective', 'Horizon', 'Exact match'],
    rows: [
      { cells: ['Candidate / local supervision (Model E)', 'T = 10', '0.755 ± 0.019'], primary: true },
      { cells: ['Terminal-only supervision (Model A)', 'T = 10', '0.540 ± 0.018'], primary: false },
      {
        cells: ['Candidate / local supervision (Model E)', 'T = 20, zero-shot', '0.407 ± 0.023'],
        primary: true,
      },
      {
        cells: [
          'Combined objective (Model F) — control',
          'T = 10 / T = 20',
          '0.737 ± 0.015 / 0.390 ± 0.014',
        ],
        primary: false,
      },
    ],
    sources: [
      { label: 'generator_repair_feasibility.md', path: 'docs/reports/generator_repair_feasibility.md' },
      {
        label: 'combined_objective_confirmation.md',
        path: 'docs/reports/combined_objective_confirmation.md',
      },
    ],
  },

  findingsHeading: 'Findings',
  findingsIntro:
    'Each entry states what the measurement supports and what it explicitly does not. The distinction is the project’s own, and it is the reason this section exists.',

  findings: [
    {
      id: 'objective',
      status: 'established',
      title: 'The supervision objective was the binding constraint',
      detail:
        'Holding the architecture fixed and changing only the training objective moved T = 10 exact-match from 0.540 to 0.755.',
      establishes: 'That terminal-only supervision was a first-order bottleneck in this configuration.',
      doesNotEstablish:
        'That candidate / local supervision is sufficient — modular wrap-around failures persist under it.',
      sources: [
        { label: 'generator_repair_feasibility.md', path: 'docs/reports/generator_repair_feasibility.md' },
      ],
    },
    {
      id: 'coordinate-wise',
      status: 'established',
      title: 'The commit must be reasoned about coordinate-wise',
      detail:
        'An element-wise replay of the gate reproduces the commit bit-exactly. The same gate’s mean-scalarisation collapses decode accuracy from 0.855 to 0.182 on candidate-correct general adds.',
      establishes: 'That scalar summaries of the gate are descriptive proxies only.',
      doesNotEstablish:
        'That the commit rule is the dominant cause of sequence failure — amplifying or reshaping the gate does not improve endpoint accuracy.',
      sources: [
        {
          label: 'experiment_h_lambda_interpolation.md',
          path: 'docs/reports/experiment_h_lambda_interpolation.md',
        },
        {
          label: 'experiment_j_commit_intervention.md',
          path: 'docs/reports/experiment_j_commit_intervention.md',
        },
      ],
    },
    {
      id: 'error-budget',
      status: 'established',
      title: 'Failures begin upstream of the commit',
      detail:
        'Of the sequences that fail at T = 10, the earliest observed task-level error is a candidate written-register error in 59.7%, a candidate-to-commit residual in 32.5%, and a terminal or readout residual in 8.0%.',
      establishes: 'An observed first-error budget, dominated by candidate generation.',
      doesNotEstablish:
        'A cause. “Candidate-origin” means only that the earliest observed error occurs when the frozen candidate is already wrong.',
      sources: [
        {
          label: 'experiment_p_sequence_error_budget.md',
          path: 'docs/reports/experiment_p_sequence_error_budget.md',
        },
      ],
    },
    {
      id: 'branching',
      status: 'not-adopted',
      title: 'Speculative branching, as first formulated',
      detail:
        'A branching oracle with 8 branches reached 0.6913 exact-match, but per-draw information was at chance and matched noise recovered roughly 46% of the gain. The formulation — Gaussian noise perturbation of a frozen state — was not adopted. Candidate branching has since been implemented in a different form, with proposals conditioned on discrete actions rather than noise, and evaluated end to end.',
      establishes: 'That the tested branching setup was not validated under compute-matched conditions.',
      doesNotEstablish:
        'That latent search is impossible in general — the tested selection signal carried no usable information, and the negative result is specific to that formulation.',
      sources: [
        { label: 'branching_feasibility_oracle.md', path: 'docs/reports/branching_feasibility_oracle.md' },
        {
          label: 'architecture_gap_audit_and_milestone_proposal.md',
          path: 'docs/reports/architecture_gap_audit_and_milestone_proposal.md',
        },
      ],
    },
    {
      id: 'verifier',
      status: 'not-adopted',
      title: 'A learned verifier',
      detail:
        'The headline AUROC was an artefact of an always-deterministic top-1 selector, and no decision-relevant signal was found. The learned scorer was not adopted. A deterministic rule checker — edge connectivity and blockade status against the ground-truth map — has since been implemented and is what the evaluated pipeline consults.',
      establishes: 'That the tested verifier signal was not usable for selection.',
      doesNotEstablish:
        'That verification is impossible in general — the negative result is specific to a learned scorer, not to rule checking against known constraints.',
      sources: [
        { label: 'verifier_feasibility.md', path: 'docs/reports/verifier_feasibility.md' },
        {
          label: 'architecture_gap_audit_and_milestone_proposal.md',
          path: 'docs/reports/architecture_gap_audit_and_milestone_proposal.md',
        },
      ],
    },
    {
      id: 'wrap',
      status: 'open',
      title: 'Modular wrap-around',
      detail:
        'The dominant unsolved arithmetic failure. Interventions on the candidate, the gate and the readout were each ruled out as destructive.',
      establishes: 'An open problem that has been localised by measurement.',
      doesNotEstablish: 'A mechanism — a parity alignment was measured and then shown to be non-causal.',
      sources: [
        { label: 'phase_1_evidence_synthesis.md', path: 'docs/reports/phase_1_evidence_synthesis.md' },
        {
          label: 'experiment_o_representation_intervention.md',
          path: 'docs/reports/experiment_o_representation_intervention.md',
        },
      ],
    },
    {
      id: 'horizon',
      status: 'open',
      title: 'Long-horizon decay',
      detail: 'Exact-match at T = 20 (0.407) remains far below T = 10 (0.755).',
      establishes: 'A measured decay with horizon.',
      doesNotEstablish: 'A cause — recursion-depth extrapolation has not been tested.',
      sources: [{ label: 'RESEARCH_STATUS.md', path: 'docs/RESEARCH_STATUS.md' }],
    },
    {
      id: 'pilot',
      status: 'established',
      title: 'Phase 1.6 — joint supervision closes the gate',
      detail:
        'The Stage 1 pilot fitted 100% of its 64 training pairs with zero validation accuracy across five seeds and failed its gate, while its deterministic pre-flight passed exactly, 16/16. Stage 2 passed address binding for Slot-MGU at 1.0000 on 5/5 seeds over 1,200 sequences, and failed Cyclic-MGU and the Vanilla GRU control below the rejection boundary. A third pilot, embedding an exact rotation operator in a trainable state, failed rejection at a mean of 0.0625 against chance 0.10. A fourth supervised the intermediate destination registers — one registered change — reaching 0.6750 with the register written one transition earlier collapsing to 0.2573. A fifth supervised the unaddressed register as well and passed: macro 0.9875, 4/5 seeds at the 0.950 gate, both operands reading at 0.8879 and 0.9303. A sixth removed the destination terms and fell back to 0.5375 with the asymmetry inverted, completing the 2x2 grid — 0.0625, 0.6750, 0.5375, 0.9875 — on one architecture at an invariant 219,018 parameters.',
      establishes:
        'That a continuous monolithic state does not require discrete slot isolation to hold two registers independently, and that joint destination and persistence supervision — not destination or persistence alone — is what carries this architecture to near-perfect validation accuracy on a three-step trace.',
      doesNotEstablish:
        'That arithmetic was learned — the rotation ALU is parameter-free and exact, so the result is about routing into it. It also covers seen validation pairs only: the protected split was never queried, and Stage 3 composed sequences remain unauthorized.',
      sources: [
        { label: 'exp_cyclic_persist_01_report.md', path: 'docs/reports/exp_cyclic_persist_01_report.md' },
        {
          label: 'exp_cyclic_persist_abl_01_report.md',
          path: 'docs/reports/exp_cyclic_persist_abl_01_report.md',
        },
        { label: 'RESEARCH_STATUS.md', path: 'docs/RESEARCH_STATUS.md' },
      ],
    },
    {
      id: 'milestones',
      status: 'current',
      title: 'The state machine, evaluated end to end',
      detail:
        'With the isolation container, transaction gate, deterministic verifier, action-conditioned brancher and two-phase orchestrator implemented, five paired seeds were trained on procedurally generated pathfinding and evaluated against three parameter-matched comparators. Against the un-gated comparator the paired difference was +0.060 on validation, 95% CI [0.0424, 0.0776], and +0.056 on the single held-out pass, 95% CI [0.0192, 0.0928] — positive on both, below the preregistered +0.10 margin on both. Against the action-masking comparator the difference was exactly 0.0000, per seed as well as in aggregate. A compute-matched two-rollout comparator scored higher on both partitions (−0.1400 and −0.1040).',
      establishes:
        'A measured advantage over the parameter-matched un-gated comparator whose interval excludes zero on both partitions — and the cost of it: the same goal nodes as the shallow action-masking comparator at about 2.4x the executed FLOPs.',
      doesNotEstablish:
        'That verified speculative commit contributes anything here. The verifier rejected zero candidates and the gate rolled back zero times across every seed and both partitions, so error containment and dead-end recovery were never exercised. That leaves the mechanism untested rather than refuted — the two are not distinguishable from these runs.',
      sources: [
        {
          label: 'pre_3b_experimental_protocol.md',
          path: 'docs/research/pre_3b_experimental_protocol.md',
        },
        { label: 'PLAN.md', path: 'PLAN.md' },
      ],
    },
  ],
};

/* --------------------------------------------------------------------------
   E. Access
-------------------------------------------------------------------------- */

export interface AccessContent {
  eyebrow: string;
  heading: string;
  intro: string;
  destinations: ReadonlyArray<{
    label: string;
    hrefKey: LinkKey;
    description: string;
    meta: string;
  }>;
  closing: string;
}

export const ACCESS: AccessContent = {
  eyebrow: 'Access',
  heading: 'The record is public.',

  /** VERIFIED — docs/DOCUMENTATION_POLICY.md. */
  intro:
    'Completed experiment reports are immutable. Corrections are appended, never edited in, and superseded conclusions are kept beside the ones that replaced them.',

  destinations: [
    {
      label: 'Repository',
      hrefKey: 'repository',
      description: 'Source, the specification suite, and the full documentation set.',
      meta: 'Python · PyTorch · MIT',
    },
    {
      label: 'Research status',
      hrefKey: 'researchStatus',
      description: 'The current validated state, with every claim cited to the report it came from.',
      meta: 'Updated 2026-10-17',
    },
    {
      label: 'Experiment reports',
      hrefKey: 'reports',
      description: 'Completed reports, append-only, including the negative results.',
      meta: 'Index',
    },
  ],

  closing:
    'Nothing is reported on this page that is not also in the repository. Where a measurement is quoted, it is quoted with the document it came from.',
};

/* --------------------------------------------------------------------------
   Footer
-------------------------------------------------------------------------- */

export const FOOTER = {
  tagline: 'An experimental research framework and candidate recurrent inference architecture.',
  note: 'This site is a presentation layer over the research repository. It is not a source of record.',
  backToTop: 'Back to top',
};
