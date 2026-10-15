---
identifier: P
title: Sequence-level error-budget attribution
date: "2026-10-07"
status: completed
classification: candidate generation (Class A) dominates the first-error budget
summary: Of sequences that fail at T=10, the earliest observed task-level error is a candidate written-register error in 59.7%, a candidate-to-commit residual in 32.5%, and a terminal or readout residual in 8.0%.

question: >
  Where does the frozen model's T=10/T=20 exact-match error budget live? Among failed
  sequences, what fraction first become observably wrong at candidate generation, at the
  candidate-to-commit residual, or only at the terminal readout?

motivation: >
  Experiments G through O had characterized the commit residual in isolation. Attribution
  asks a different question: not how large each mechanism is, but which one a failing
  sequence encounters first. That ordering is what determines where an intervention could
  plausibly act.

frozen:
  - "E_candidate (primary) and F_combined (secondary control), seeds 42–46, 226,358 parameters, SHA-256 pinned"
  - "Measurement only — no training, no optimizer, no modification of parameter, readout, gate or commit"
  - "No intervention, no branching, no verifier, no oracle repair, no counterfactual rollout"

procedure:
  - "For each failed sequence, identified the earliest timestep at which a task-level error is observable, and attributed the sequence to that site"
  - "Class A — candidate written-register error; Class B — candidate-to-commit residual; Class C — terminal/readout residual, subdivided into untouched (C1), written (C2) and near-boundary (C3); Class D — empty"
  - "Reported per seed, not pooled, and checked the ordering for seed consistency"
  - "Reproduced the established terminal exact-match values as an internal consistency check (E 0.7547 / 0.4068; F 0.7370 / 0.3898)"

results:
  - label: T=10 first-error attribution
    value: "A 59.7% / B 32.5% / C 8.0% (E)"
    note: "F is statistically indistinguishable (A 59.4%, B 31.8%, C 8.7%). Class A dominates in 5/5 seeds with a mean gap of +0.27 over Class B."
  - label: T=20 first-error attribution
    value: "A 67.2% / B 30.2% / C 2.6% (E)"
    note: "Dominance strengthens with horizon; gap +0.37, 5/5 seeds. F agrees (67.6% / 29.9% / 2.5%)."
  - label: Untouched-register terminal corruption
    value: "0%"
    note: "C1 is empty. The model does not corrupt registers it was not asked to write."
  - label: Composition of Class A errors
    value: almost entirely ADD
    note: "568 no-wrap plus 542 wrap adds of roughly 1,203; 93 SWAP; 0 SET."
  - label: Recovery of written-register errors
    value: 74–80% recover later; 31–42% reach full-state correctness
    note: "Recovery at the register level does not imply sequence-level recovery."
  - label: T=10 failure predicts T=20 failure
    value: "P = 0.731 vs 0.544, OR about 2.3"

establishes: >
  An observed first-error budget in which candidate generation dominates, seed-consistently,
  at both horizons — and which strengthens rather than washes out at the longer horizon.

doesNotEstablish: >
  A cause. "Candidate-origin" means only that the earliest observed task-level error occurs
  when the frozen candidate is already wrong. The report states this terminology restriction
  explicitly: a numerically dominant class is not thereby a validated recoverable target.

limitations:
  - "First-error attribution is an ordering statement about a failing sequence, not a causal decomposition of the failure."
  - "Class A being dominant does not mean fixing candidate generation would fix sequence accuracy; later experiments found the Class-A information only weakly recoverable from the frozen candidate vector."
  - "The classification uses one definition of an observable task-level error. A different definition would move mass between classes."
  - "E and F are statistically indistinguishable throughout."

nextStep: >
  The dominance of Class A motivated a probe programme (Experiments Q onwards) asking
  whether the correct value is recoverable from the frozen candidate vector. It is only
  weakly recoverable, which is at most consistent with a candidate-representation
  limitation and is not a causal claim.

artifacts:
  - path: experiments/run_experiment_p.py
  - path: experiments/analyze_experiment_p.py
  - path: experiments/experiment_p_error_budget.npz
  - path: experiments/experiment_p_error_budget_meta.json
  - path: experiments/experiment_p_results.json
  - path: tests/test_experiment_p.py

sources:
  - path: docs/reports/experiment_p_sequence_error_budget.md

related:
  - experiment-g-add-commit-gap
  - experiment-j-commit-intervention
  - phase-1
---

This experiment redirected the project. Before it, the commit residual was the most
detailed object of study; after it, the weight of attention moved upstream, because even
a perfect commit could not repair a sequence whose candidate was already wrong.

It is also the clearest example of the project's own terminology discipline. The headline
number — "59.7% of failures are candidate-origin" — is easy to misread as "candidate
generation causes 59.7% of the error and fixing it would recover 59.7%". The report
forecloses that reading in its second paragraph, and the probe programme that followed
(Experiments Q to AH) largely confirmed the caution: the target is only weakly recoverable
from the frozen candidate, and does not generalise to held-out operands.

The zero for untouched-register corruption is the complementary finding, and it is why
the model's passive state persistence remains the project's most solid result — see the
[active architecture](/research/architectures/nonlinear-candidate-mgu).
