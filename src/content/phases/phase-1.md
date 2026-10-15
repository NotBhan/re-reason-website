---
title: Phase 1 — diagnostic programme
number: "1"
status: closed
date: "2026-10-13"
summary: "Thirty-four conceptual experiments establishing that passive state persistence works, that active modular arithmetic does not, and that the failure is neither an information limit at the task interface nor repairable by intervening on the frozen core."

objectives:
  - "Establish whether a bounded convex recurrent core can track register state over ten steps."
  - "Identify which architectural components are causally responsible for tracking performance, by ablation at matched parameter counts."
  - "Localise the residual failures to a stage of the computation rather than to the system as a whole."
  - "Determine whether any local intervention on the frozen core recovers sequence-level capability."
  - "Determine whether the task interface itself carries the information needed, independent of the model."

scope: >
  Synthetic procedural benchmarks with exact ground truth — principally Register Tracking
  (4 registers, values in {0…9}, 4 operation types, ten-step horizon), plus controlled ADD
  builders for wrap, repetition, isolation and source-operand masking. All work on frozen
  checkpoints unless stated, and no ad-hoc patching of the architecture.

results:
  - label: Experiments
    value: "28 formal letter-designated reports (G–AH)"
    note: "Preceded by 11 foundational architecture, feasibility, diagnostic and ablation reports covering Models A–F."
  - label: Register Tracking T=10 exact match
    value: 0.755 ± 0.019
    note: "Under candidate/local supervision (Model E) — raised from 0.540 ± 0.018 under terminal-only supervision with the architecture held fixed."
  - label: Register Tracking T=20, zero-shot
    value: 0.407 ± 0.023
  - label: Untouched-register terminal corruption
    value: "0%"
    note: "Passive state persistence is the programme's most solid positive result."
  - label: Repeated-ADD terminal exact match
    value: "about 0.15"
    note: "Under every objective tested."
  - label: Held-out-operand arithmetic transfer
    value: 0.072–0.143 balanced accuracy vs 0.10 chance
    note: "Across bounded sequence readers, data scale, update budget, optimizer family, pool balancing and reader capacity."

decisions:
  - label: "Decision A — Phase 1 empirical cycle closure"
    outcome: >
      GO. The pre-registered diagnostic questions were answered within the scope of the frozen
      checkpoints, tested reader families and fixed protocol, and further sweeps inside that
      envelope gave diminishing returns.
  - label: "Decision B — post-Phase-1 direction"
    outcome: >
      NO-GO on demonstrated arithmetic rule generalisation; NO-GO on core architecture, gating,
      readout and candidate interventions; NO-GO on an immediate transition to Phase 2. Exactly
      one next action was recommended: formulate a separate proposal for architectural
      reformulation before writing or modifying model code.

notPlanned:
  - "Ad-hoc patching of the frozen core, ruled out by Experiments J, K and O — each degraded sequence exact match."
  - "A transition to Phase 2 speculative machinery, ruled out because verification showed no decision-relevant signal and the branching oracle proved unachievable."
  - "Any claim of general reasoning capability from Phase-1 results."

artifacts:
  - path: docs/reports/phase_1_evidence_synthesis.md
  - path: docs/RESEARCH_STATUS.md
  - path: docs/research/RE_REASON_RESEARCH_REFERENCES.md

sources:
  - path: docs/reports/phase_1_evidence_synthesis.md
  - path: docs/RESEARCH_STATUS.md
  - path: docs/reports/experiment_p_sequence_error_budget.md
  - path: docs/reports/experiment_u_task_interface.md
  - path: docs/reports/experiment_ah_training_pool_stress.md

related:
  - nonlinear-candidate-mgu
  - speculative-pipeline
  - experiment-p-sequence-error-budget
  - phase-1-6
---

The Phase 1 record is unusual in that its most defensible statements are negative. Passive
persistence works, was measured, and survived. Active arithmetic does not generalise, four
independent classes of intervention were tried and each degraded the endpoint, and the
synthesis closed the cycle rather than continuing to sweep.

Two results are what make the closure credible rather than a give-up.

The first is that the failure is not an information limit. The raw causal observation
history determines the target exactly — from a four-step window, Bayes accuracy is at
least 0.998, and the full causal prefix reaches 1.000 with zero ambiguity. The
information is present at the interface. Bounded learners then fail to exploit it, but
the report is explicit that this establishes availability under the tested
representation and nothing about what the model "should" be able to do.

The second is that the diagnostics were run to saturation before the cycle was closed.
Data volume was swept by roughly 6.7 times, the update budget by 5 times, two optimizer
families and several recipes were tried, training pools were rebalanced, and reader
capacity was raised along a pre-registered ladder. Held-out operand accuracy stayed at
chance throughout, and the fit–transfer gap proved capacity-insensitive. Continuing
inside that envelope was not going to produce a different answer.

The synthesis still declined to claim that the architecture is insufficient. Its stated
conclusion is narrower and more useful: within the tested benchmark, model families and
training protocols, generic continuous recurrent representations under empirical risk
minimization fit the training distribution by memorization rather than acquiring a
general modular arithmetic mechanism.
