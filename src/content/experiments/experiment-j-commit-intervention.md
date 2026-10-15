---
identifier: J
title: Controlled inference-time commit-rule intervention
date: "2026-10-06"
status: completed
classification: B — partial causal support, with respect to the commit rule only
summary: Intervening only on the element-wise commit gate is causally effective at the local level and causally insufficient at the sequence level. No amplification improves the endpoint, and coordinate scrambling collapses it.

question: >
  If we intervene only on the actual element-wise commit gate, leaving architecture,
  weights, optimizer, readout, data and task generator frozen, can we recover
  sequence-level capability — or is the under-movement residual a local symptom rather
  than the sufficient cause of long-horizon failure?

motivation: >
  Experiment I had decomposed the residual into decision space and found coordinate-wise
  under-movement: failures deliver less of the candidate's decision-margin movement than
  successes do. If under-movement were the cause of sequence failure, scaling the gate up
  should improve endpoint accuracy. This experiment tests that directly rather than by
  correlation.

frozen:
  - "E_candidate (primary) and F_combined (control), seeds 42–46, 226,358 parameters, SHA-256 pinned"
  - "Architecture, weights, optimizer, readout, data and task generator all unchanged"
  - "Only the commit combination modified; at gamma = 1 the forward pass reproduces the frozen model bit-identically (max float difference < 1e-5)"

procedure:
  - "Primary intervention family applied to the full 212-dimensional gate, with recursive rollout from frozen checkpoints"
  - "Evaluated over a pre-registered gamma grid, plus a secondary monotone family"
  - "Measured local decision-margin delivery on a fixed baseline candidate-correct general-ADD set, net transition rescue and regression per seed, sequence endpoint exact match at T=10 and T=20, and operation-level effects"
  - "Ran a mean-matched coordinate-scrambled control at every gamma, rescaling the permuted gate to within about 0.005 of the original mean"

results:
  - label: Baseline parity at gamma = 1
    value: bit-identical
    note: "Reproduces the headline metrics exactly (E T=10 0.7547 ± 0.0191, T=20 0.4068; F T=10 0.7370 ± 0.0149). Rescue and regression counts are exactly 0."
  - label: Local margin delivery rises monotonically
    value: ρ_margin 0.884 → 0.930
    note: "Gamma from 1.0 to 2.0, paired dz +15 to +59, 5/5 seeds, p < 1e-4. The local hypothesis is confirmed."
  - label: Sequence endpoint, E T=10 exact match
    value: 0.7525 (gamma 1.10) → 0.7107 (gamma 2.00)
    note: "No gamma above 1 improves the endpoint. Gamma of 1.25 and above degrades it with sign-consistent paired effects."
  - label: Transfer reduction
    value: 0.7240 (gamma 0.90) → 0.5860 (gamma 0.75)
    note: "Gamma below 1 is strongly harmful."
  - label: Net transition rescue per seed
    value: +5.0 at gamma 1.10, −11.6 at gamma 2.00
    note: "The intervention recovers a minority of baseline failures but breaks a comparable or larger number of baseline successes."
  - label: Mean-matched coordinate scramble
    value: E T=10 exact match collapses to 0.008–0.013
    note: "At every gamma including 1.0. Aggregate transfer is not the mechanism; the specific coordinate routing is."
  - label: Off-path failures not resolved by amplification
    value: 6.4% rescued at gamma 1.10, 22.6% at gamma 2.00
    note: "Of failures that had already delivered at least the scalar-equivalent transfer needed."

establishes: >
  That the commit gate is a real local bottleneck — intervening on it alone moves margin
  delivery monotonically in the hypothesised direction — and that the coordinate identity
  of gate delivery is functionally essential, since a mean-matched permutation destroys
  the endpoint even at baseline.

doesNotEstablish: >
  That the commit rule is the dominant long-horizon bottleneck, that untuned global
  amplification is an adequate intervention, that the modified rule is the correct
  architecture, or that the underlying representation is understood. The test is
  interventional with respect to the commit rule only.

limitations:
  - "The intervention is local to the commit rule; nothing else about the system is identified."
  - "Untuned global amplification is what was tested. A tuned, coordinate-aware intervention is not ruled out by this result."
  - "Operation-level regressions appear at gamma 1.25 and above, so the higher-gamma points measure a degraded system as well as a scaled gate."
  - "E and F agree, so the result is not specific to the official objective."

nextStep: >
  The companion shape intervention (Experiment K) tested a coordinate-preserving monotone
  remap rather than a magnitude change, to separate gate magnitude from gate shape.

artifacts:
  - path: experiments/run_experiment_j.py
  - path: experiments/analyze_experiment_j.py
  - path: experiments/experiment_j_records.json
  - path: experiments/experiment_j_results.json
  - path: tests/test_experiment_j.py

sources:
  - path: docs/reports/experiment_j_commit_intervention.md

related:
  - experiment-g-add-commit-gap
  - experiment-p-sequence-error-budget
  - nonlinear-candidate-mgu
---

This is the clearest negative result in the Phase 1 sequence, and it is the reason the
commit rule is now frozen. The local hypothesis was correct and did not matter: a
mechanism can be causally active at the level it was measured and still not be the
lever on the outcome.

The scramble control is what turns this from a null result into an informative one.
Had amplification simply failed, the natural reading would be that the gate does
nothing. The control shows the opposite — the gate does a great deal, and it does it
through coordinate-specific routing rather than through aggregate magnitude. That is
consistent with the coordinate-wise decoding result from Experiment H and with the
[first-error budget](/research/experiments/experiment-p-sequence-error-budget), which
places most failures upstream of the commit entirely.
