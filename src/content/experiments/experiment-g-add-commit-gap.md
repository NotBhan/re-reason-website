---
identifier: G
title: Localizing the ADD candidate-to-commit gap
date: "2026-10-05"
status: completed
classification: C — gate dilution and blend/readout failure both materially contribute
summary: The ADD candidate-to-commit gap is real, small, concentrated, and mechanistically mixed. It is confined almost entirely to two-register adds with nonzero operands, and no causal claim is made.

question: >
  Where in the commit does the ADD candidate-to-commit residual arise — is the gate
  under-transferring the candidate into the state, or is the committed state landing
  somewhere the readout cannot decode back to either endpoint?

motivation: >
  Adopting candidate/local supervision removed the first-order bottleneck and raised
  T=10 exact match from 0.540 to 0.755. A residual remained in which the candidate is
  already correct but the committed state decodes to a wrong value. Experiment G is a
  measurement-only localization of that residual: it does not train, does not modify the
  model, and does not run rollouts.

frozen:
  - "E_candidate (official Phase-1 objective) and F_combined (control), 5 seeds each, 226,358 parameters"
  - "No training, no model changes, no checkpoints written"
  - "Data collected by a single forward pass with states returned, over the canonical strict test split (1,200 sequences × 10 steps, never trained on) and five controlled ADD builders"
  - "31,763 ADD transitions per model recorded"

procedure:
  - "Recorded per transition, for both models and all seeds: model, seed, sequence id, timestep, source and destination registers, operand values, wrap and repetition flags, candidate/committed/previous destination correctness, decoded values, full-vector gate mean/min/max, three displacement norms, cosine, and destination cross-entropy"
  - "Validated the collector against independently produced per-operation values (agreement within ±0.0005 on all four models and categories)"
  - "Decomposed the gap by gate bin, by arithmetic stratum, and by decode signature"
  - "Ran an analysis-only oracle decode of the candidate as an upper bound, and grouped 5-fold cross-validated ROC analysis for predictability"

results:
  - label: Share of candidate-correct ADDs that commit wrong
    value: "5.5%"
    note: "E 764/13,958; F 770/13,940. Seed-level 5.47% ± 0.48% (E) vs 5.52% ± 0.74% (F), paired p = 0.89."
  - label: Share of those failures in the general stratum
    value: 95.8% (E) / 96.1% (F)
    note: "Destination ≠ source register and source operand > 0. No-op adds and same-register adds are essentially gap-free (0.25–0.61%)."
  - label: Gap rate by full-vector mean gate, general stratum
    value: 34.7% → 16.3% → 1.2% (E)
    note: "f < 0.3 → 0.3 ≤ f < 0.4 → f ≥ 0.4. F follows the same monotone shape (42.1% → 18.6% → 2.1%)."
  - label: Gate as a discriminator within the general stratum
    value: oriented AUC 0.76 (E) / 0.77 (F)
    note: "Stronger than candidate displacement in that stratum (0.56 / 0.61)."
  - label: Fraction of committed failures decoding to the old value
    value: 31.8% (E) / 28.6% (F)
    note: "The rest — 68.2% / 71.4% — decode to a third value, i.e. the state moved toward the candidate but the readout maps the partial blend to neither endpoint."
  - label: Pooled ADD predictability
    value: displacement AUC 0.689 / 0.684 vs gate 0.582 / 0.626
    note: "The pooled displacement advantage is largely a stratum-composition effect; adding the gate to displacement yields no gain for E."

establishes: >
  That the ADD candidate-to-commit residual is a real, small and highly concentrated
  phenomenon, that within the general stratum the gate is its strongest single
  discriminator, and that the dominant signature is blend/readout rather than simple
  old-state dominance.

doesNotEstablish: >
  A cause. The report states explicitly that no causal claim is made, and that the
  evidence for gate dilution and for blend/readout failure is both present rather than
  one excluding the other.

limitations:
  - "The model never opens the ADD gate widely (observed mean-gate range ≈ 0.23–0.51), so the high-transfer regime is essentially unobserved."
  - "The gate bin with the largest gap rate in the confound-free view contains only 113 transitions (E), so that point rests on limited support."
  - "E and F are statistically indistinguishable on this residual, so the finding is not specific to the official objective."
  - "The analysis is descriptive; the classification records which mechanisms are consistent with the measurements, not which one is operative."

nextStep: >
  An analysis-only lambda-interpolation decode sweep (Experiment H) decoding
  head((1−λ)·S_(t−1) + λ·C_t) over λ in [0, 1], to determine whether the readout can decode
  blends at any λ or only above a threshold. The report notes this is a measurement, not a fix.

artifacts:
  - path: experiments/run_experiment_g.py
  - path: experiments/analyze_experiment_g.py
  - path: experiments/experiment_g_transitions.npz
  - path: experiments/experiment_g_transitions_meta.json
  - path: experiments/experiment_g_results.json
  - path: tests/test_experiment_g.py

sources:
  - path: docs/reports/experiment_g_add_commit_gap.md

figures:
  - file: experiment_g_confound_strata.png
    title: Gap rate by gate and arithmetic stratum
    caption: >
      Probability of a wrong commit given a correct candidate, against the full-vector mean
      gate, split by arithmetic stratum, for E (left) and F (right).
    context: >
      Candidate-correct ADD transitions on the canonical test split, 5 seeds pooled. Point
      labels are the number of transitions in each bin. The general stratum falls steeply with
      the gate; the no-op and same-register strata sit on the floor throughout.
    alt: >
      Two side-by-side line charts titled E_candidate and F_combined. In both, a red general
      line falls from roughly 0.35 at low gate to roughly 0.02 at high gate, while grey
      no_op_src0 and purple same_register_src_gt0 lines stay near zero across the whole range.
  - file: experiment_g_gate_vs_commit_acc.png
    title: ADD destination decoding against the gate
    caption: >
      Destination accuracy for candidate and committed state as a function of the full-vector
      mean gate, for both models.
    context: >
      ADD transitions on the test split, seeds pooled, binned by mean gate. Sample size per bin
      is printed at each point. Accuracy is U-shaped: both candidate and committed accuracy dip
      in the mid-gate band and recover at high gate.
    alt: >
      A line chart with four series, E_candidate candidate and committed and F_combined candidate
      and committed. All four start near 0.9 at low gate, dip to about 0.80 to 0.86 around gate
      0.35, and rise to about 0.98 to 0.99 at gate 0.7.
  - file: experiment_g_oracle_vs_committed.png
    title: Oracle candidate decode against the committed state
    caption: >
      Accuracy of the committed state versus an analysis-only oracle decode of the candidate
      vector, by controlled ADD category.
    context: >
      Controlled ADD builders (isolated, no-wrap, wrap, 4x repeated), E and F. The gap between
      the two bars in each pair is the commit residual for that category. The oracle decode is an
      upper bound for analysis; it is not an achievable operating point.
    alt: >
      Two grouped bar charts, E_candidate and F_combined, with four categories on the x-axis. In
      each, the grey committed-state bar is lower than the orange oracle-candidate bar by a
      printed delta of +0.07 to +0.14.

related:
  - experiment-j-commit-intervention
  - experiment-p-sequence-error-budget
---

Experiment G is a localization, not a causal test. Its value is the concentration
finding: a residual that affected one in twenty candidate-correct additions overall
was almost entirely a property of general two-register adds, and disappeared
entirely for no-op and same-register adds.

The two explanations it leaves open — the gate under-transferring the candidate, and
the readout failing to decode a partial blend — are not alternatives it resolves.
The decode signature is the reason the report refuses to pick one: a majority of
failures land on a third value rather than on the old value, which is not what plain
dilution predicts, while the monotone relationship with the gate is hard to explain
if the gate is not involved.

The scalar gate statistic used throughout is a summary of a 212-dimensional vector.
The report flags this explicitly, and Experiment H was run to test whether the
scalar projection is adequate. It is not — see
[Experiment J](/research/experiments/experiment-j-commit-intervention) and the
[active architecture](/research/architectures/nonlinear-candidate-mgu).
