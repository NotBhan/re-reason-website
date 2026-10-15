---
title: NonlinearCandidateMGU
status: active
implementation: implemented
summary: "The active Phase-1 architecture — a bounded convex recurrent state machine that commits a candidate vector into a persistent state coordinate by coordinate. Classified in the literature as a known recurrence, with no novelty claim."

purpose: >
  A persistent latent state that carries a computation across steps without emitting tokens.
  The state is updated by a bounded convex combination of its previous value and a candidate
  vector, so every update is an interpolation between holding and moving rather than an
  unbounded write.

components:
  - name: Observation encoder
    detail: "Maps the 22-dimensional instruction encoding to a 256-dimensional embedding e_t."
  - name: Gate network
    detail: "Produces the gate vector f_t, one value per state coordinate. Its element-wise identity — not its mean — carries the mechanism."
  - name: Candidate MLP
    detail: "One hidden layer of 146 dimensions producing the candidate C_t from the pre-gated state and the observation embedding."
  - name: Convex commit
    detail: "The bounded convex combination that writes the candidate into the state. Bounded and convex by construction, so no single step can move the state arbitrarily far."
  - name: Terminal readout
    detail: "A single linear layer from state to the per-register decision distributions."

updateRule:
  - "S"
  - sub: t
  - " = (1 − f"
  - sub: t
  - ") ⊙ S"
  - sub: t−1
  - " + f"
  - sub: t
  - " ⊙ C"
  - sub: t
  - ",  C"
  - sub: t
  - " = tanh(MLP"
  - sub: cand
  - "([f"
  - sub: t
  - " ⊙ S"
  - sub: t−1
  - ", e"
  - sub: t
  - "]))"
updateRuleNote: >
  f_t is a full 212-dimensional vector, the circled dot is the element-wise product, and the
  commit is applied coordinate by coordinate. Measured parameters 226,358. State 212-dimensional.

constraints:
  - "226,358 parameters, 212-dimensional state, 256-dimensional observation embedding, 146-dimensional candidate hidden layer."
  - "Classified as a known recurrence — Update-Gate RNN and MGU family — with an MLP parameterization variant. The project makes no novelty claim for it."
  - "Trained on the Register Tracking benchmark — 4 registers, values in {0…9}, 22-dimensional instruction encoding, operations SET, SWAP, READ and ADD, with ADD defined modulo 10."
  - "Bounded convexity is the causal driver, identified by ablation rather than assumed."

openQuestions:
  - "Whether the bounded convex update can be made to generalise modular arithmetic across held-out operands; the frozen model does not."
  - "Whether repeated-ADD chains require an architecture-level change — terminal exact match collapses to roughly 0.15 under every objective tested."
  - "Why the passive state persists without decay while active arithmetic updates fail."

sources:
  - path: docs/RESEARCH_STATUS.md
  - path: docs/reports/parameterization_isolation_audit.md
  - path: docs/reports/mechanism_qa_diagnostic.md
  - path: docs/reports/model_e_novelty_and_mechanism_audit.md
  - path: docs/reports/phase_1_evidence_synthesis.md

figures:
  - file: 06_register_probe_accuracy_over_time.png
    title: Per-register linear decodability over time
    caption: >
      Accuracy of a linear probe reading each of the four registers out of the state, at every
      timestep from 1 to 10.
    context: >
      Frozen Nonlinear Candidate MGU. Decodability is not the same as correctness — it shows the
      information is present and linearly accessible in the state, not that the model's decisions
      are right.
    alt: >
      A line chart with four series, one per register, all starting at 100% at timestep 1 and
      declining to between 77% and 80% by timestep 10.
  - file: 07_retention_vs_intervening_steps.png
    title: Retention on untouched registers
    caption: >
      Accuracy on a register that no instruction writes, as a function of how many steps
      intervene.
    context: >
      Frozen models, with a Canonical UGRNN comparison. Note the y-axis range is 99.0 to 100.0:
      both bounded convex models are exactly flat, while the UGRNN comparison shows a 1.0-point
      decline that the axis range amplifies. Read the numbers, not the slope.
    alt: >
      A line chart. Nonlinear Candidate MGU and Model D (Bounded Convex) are flat at 100.0%
      across k = 1 to 8. Canonical UGRNN declines slightly, ending at 99.0%.
  - file: 08_failure_rate_by_operation_type.png
    title: Error rate by dominant operation type
    caption: >
      Share of sequences failing exact match, grouped by which operation dominates the sequence.
    context: >
      Frozen Nonlinear Candidate MGU. All four groups are shown: ADD-heavy 96.4%, SET-heavy
      92.2%, SWAP-heavy 86.6%, balanced 38.4%. ADD is the worst case, but every operation-heavy
      regime fails far more often than the balanced mix.
    alt: >
      A bar chart with four bars: SET_heavy 92.2%, SWAP_heavy 86.6%, ADD_heavy 96.4%, and
      Balanced 38.4%, plotted as error rate against a 0 to 100% axis.

related:
  - phase-1
  - speculative-pipeline
  - experiment-g-add-commit-gap
  - experiment-j-commit-intervention
---

The architecture's strongest result and its central failure are the same system
observed at two different tasks. Passive persistence is close to perfect: a register
nothing writes is still decodable eight intervening steps later, with no measurable
decay, and terminal corruption of untouched registers is exactly zero. Active
arithmetic is not: the model does not acquire a general modular-arithmetic rule, and
its failures concentrate on addition.

The ablations that produced this design are worth stating, because the components
were not assumed to be useful. Removing the non-linear activation from the
state–observation mixing drops exact match from 47.27% to 11.60%. Splitting the gate
and candidate trunks into separate MLPs changes nothing (+0.02%, p = 0.996) — coupling
is not what matters. MGU-style pre-gating against a purely affine UGRNN is worth
+26.23% on its own, which is why the pre-gated state is kept.

That last point is the honest shape of the project: the architecture is a
best-of-the-tested-combination result under a fixed parameter budget, not a design
derived from a theory. The project says so itself and refuses a novelty claim.

The commit rule is frozen. Two interventional attempts to improve it —
[Experiment J](/research/experiments/experiment-j-commit-intervention) on gate
magnitude and Experiment K on gate shape — moved local measurements in the
hypothesised direction and improved no sequence endpoint, and a mean-matched
coordinate scramble destroys accuracy entirely. That combination is what closed the
diagnostic cycle and moved the open question to inductive bias rather than patching.
