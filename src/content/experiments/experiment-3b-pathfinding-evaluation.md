---
identifier: "3B"
title: Milestone 3B — end-to-end pathfinding evaluation
date: "2026-10-17"
status: completed
classification: "practical_improvement_not_supported (positive_below_threshold) on both partitions; the deterministic verifier rejected no candidate in any run, and the gated pipeline is per-seed identical to the action-masking comparator"
summary: >
  The first end-to-end evaluation of the assembled state machine on procedurally generated
  pathfinding. The paired difference against the parameter-matched un-gated comparator was
  +0.060 on validation and +0.056 on the single held-out pass — below the preregistered
  +0.10 margin. The verifier rejected no candidate in any run.

question: >
  Does a latent recurrent core with isolated hypothesis exploration and verifier-gated state
  commits reach goal nodes more often than parameter-matched recurrent comparators on
  procedurally generated pathfinding with dynamic blockades — by at least the preregistered
  +0.10 practical margin — and does gating contain the cost of a wrong transition better than
  the same core without it?

motivation: >
  The Phase 1 diagnostic programme closed with the open question moved from measurement to
  architecture, and Phase 1.6's arithmetic line then closed its supervision grid. An
  architecture-to-implementation audit found five of seven target state-machine mechanisms
  absent from active model code and recommended constrained graph pathfinding — a task with
  alternative paths, verifiable transitions, dead ends and rollback — as the vehicle that
  would actually exercise them. This is the first evaluation of that assembled pipeline.

frozen:
  - "RE:Reason ActionConditionedBrancher and the three comparator baselines, each exactly 171,660 trainable parameters, sharing the node embedding table, observation encoder and policy head."
  - "Five paired seeds (1–5); candidate budget K = 3 per round, step horizon T_max = 24, retry budget R_max = 3."
  - "Procedurally generated graphs from a fixed base seed 42: 200 train, 50 validation and 50 test episodes; the test partition generated at base_seed + 90000."
  - "Behavioural cloning on BFS shortest-path demonstrations: 200 training episodes, 844 demonstration transitions, 30 epochs, batch 16, AdamW at lr 1e-3 and weight decay 1e-4, gradient clipping at norm 1.0 — 360 optimizer steps per seed, with zero non-finite gradient incidents."
  - "Two-rollout comparator fixed at temperature τ = 1.0 with static horizons T1 = 26 and T2 = 27."
  - "Evaluation on host CPU with a zero initial latent state; the held-out test partition evaluated exactly once, with no retraining, tuning, seed expansion or rerun."

procedure:
  - "Trained five paired seeds of RE:Reason and each comparator on the same demonstration set under the same behavioural-cloning objective and the same RNG namespaces"
  - "Evaluated every system on the same 50-episode validation partition, and applied the seed-expansion rule on validation only"
  - "Formed the paired per-seed difference against the designated un-gated comparator, took the two-sided 95% Student t-interval (t_crit = 2.776 at S = 5), and mapped it against the ratified margin δ = +0.10"
  - "Executed one authorized held-out test pass on the frozen checkpoints, 50 episodes, under a hard single-pass guard"
  - "Recorded verifier rejections, rollbacks, dead-end aborts, invalid transition attempts, executed FLOPs and path optimality alongside the primary metric"

results:
  - label: "Validation — vs un-gated recurrent"
    value: "RE:Reason 0.528 vs 0.468; paired Δ +0.060, 95% CI [0.0424, 0.0776]"
    note: >
      practical_improvement_not_supported, subcase positive_below_threshold: the upper bound
      falls below the +0.10 margin, so the preregistered seed expansion to S = 10 was not
      triggered.
  - label: "Held-out test, single authorized pass — vs un-gated recurrent"
    value: "RE:Reason 0.524 vs 0.468; paired Δ +0.056, 95% CI [0.0192, 0.0928]"
    note: >
      Same category and subcase. The practical margin was not met on either partition, and the
      test partition has now been consumed by its single permitted pass.
  - label: "vs action-masking recurrent"
    value: "Δ 0.0000 on both partitions"
    note: >
      Identical per seed as well as in aggregate (validation 0.46, 0.60, 0.50, 0.54, 0.54; test
      0.50, 0.58, 0.54, 0.50, 0.50). Masking policy logits to legal moves and committing
      unconditionally reproduces the gated pipeline's behaviour on this benchmark.
  - label: "vs two-rollout recurrent, compute-matched"
    value: "Validation Δ −0.1400, 95% CI [−0.2278, −0.0522]; test Δ −0.1040, 95% CI [−0.1751, −0.0329]"
    note: >
      negative_effect on both partitions. The two-rollout comparator scored 0.668 on validation
      and 0.628 on test, spending the equivalent compute budget on two sequential stochastic
      rollouts instead of intra-step candidate branching.
  - label: "Verifier and transaction-gate activity"
    value: "0 rejections, 0 rollbacks — every seed, both partitions"
    note: >
      No candidate was ever rejected, so no non-first candidate was ever committed and no
      rollback ever occurred; the re-proposal round was never entered. The run exercises the
      pipeline's forward path, not its containment behaviour.
  - label: "Failure mode"
    value: "0 invalid transition attempts; failures are dead-end aborts"
    note: >
      On validation the aborted-decision counts (27, 20, 25, 23, 23) are exactly the failure
      counts, and horizon exhaustions are 0. The un-gated comparator accumulated a mean 467.2
      invalid transition attempts and 25.0 horizon exhaustions per seed.
  - label: "Executed compute per episode"
    value: "4.26 MFLOPs (RE:Reason) vs 1.77 (action-masking) vs 3.60 (two-rollout), validation"
    note: >
      The gated pipeline reached the same goal nodes as the action-masking comparator at
      roughly 2.4× the executed FLOPs.
  - label: "Path optimality on successful episodes"
    value: "Validation 1.0845 (RE:Reason), 1.0956 (un-gated), 1.0510 (two-rollout)"
    note: "Descriptive only, and computed over successful episodes alone."

establishes: >
  A measured end-to-end comparison on the pathfinding benchmark in which the gated pipeline
  reached goal nodes more often than its parameter-matched un-gated comparator on both
  partitions, with the paired interval bounded away from zero — and in which that advantage
  stayed below the preregistered +0.10 margin, did not separate the pipeline from a shallow
  action-masking comparator at all, and left the deterministic verifier with nothing to
  reject.

doesNotEstablish: >
  That verified speculative commit contributes anything on this benchmark. The verifier
  rejected no candidate and the gate never rolled back, so the experiment does not exercise —
  and therefore does not support or refute — error containment, dead-end recovery or
  rollback. It also does not show that the mechanism cannot work: it was never triggered. The
  identical action-masking result is consistent with the gating being inert rather than with
  the two mechanisms being equivalent in general.

limitations:
  - "The held-out test partition was consumed by its single authorized pass. No further test access is authorized, so this estimate cannot be replicated on that partition."
  - "The verifier rejected zero candidates on both partitions. Every conclusion about gating, rollback and error containment is therefore untested by these runs rather than negative."
  - "Five paired seeds. The protocol applies nominal 95% intervals sequentially at S = 5 and, if inconclusive, S = 10, without alpha correction; the effective family-wise error rate may slightly exceed 5%."
  - "Comparators are the parameter-matched residual recurrent baselines defined in the protocol. Nothing here is a claim about GRUs, or about architectures beyond the four evaluated systems."
  - "Training used behavioural cloning from optimal demonstrations, which supplies no direct transition supervision and carries exposure mismatch at inference; the protocol documents both."
  - "Outcomes are on procedurally generated graphs from one fixed generator seed, not on a public benchmark."
  - "Registration of this outcome in the research repository's status and log, and the principal investigator's disposition of it, are pending; the numbers here are read from the run artifacts."

nextStep: >
  An independent audit of the held-out evaluation driver, artifact and single-pass compliance was
  pending at the sync point, followed by the principal investigator's disposition of the
  result. No further training, tuning, seed expansion or test rerun is authorized, and no
  scientific success is claimed.

artifacts:
  - path: experiments/run_phase3b_training.py
  - path: experiments/run_phase3b_validation.py
  - path: experiments/run_phase3b_test_evaluation.py
  - path: experiments/phase3b_validation_runs/phase3b_validation_20261017T135606Z/validation_results.json
  - path: experiments/phase3b_test_runs/phase3b_test_20261017T142017Z/test_results.json
  - path: tests/test_phase3b_validation.py
  - path: tests/test_phase3b_test_evaluation.py
  - path: tests/test_phase3b_runner.py
  - path: src/re_reason/hypothesis/pathfinding_branching.py
  - path: src/re_reason/hypothesis/two_phase_orchestrator.py
  - path: src/re_reason/core/pathfinding_baselines.py
  - path: src/re_reason/training/behavioral_cloning.py
  - path: src/re_reason/benchmarks/pathfinding_benchmark.py
  - path: src/re_reason/utils/rng_namespaces.py

sources:
  - path: docs/research/pre_3b_experimental_protocol.md
  - path: docs/reports/architecture_gap_audit_and_milestone_proposal.md
  - path: PLAN.md

related:
  - speculative-pipeline
  - phase-1-6
---

This is the first time the project trained and evaluated the pipeline the whole programme
was proposed to build, rather than a component of it. The result is the least dramatic
kind it could have produced, and the report of it should be read as exactly that.

Two measured facts carry most of the weight. The first is that the paired interval against
the un-gated comparator excludes zero on both partitions — the gated pipeline was better,
replicably, by roughly six points. The second is that this did not reach the margin the
protocol fixed in advance, and that the pipeline's score is identical to a comparator that
does no speculative work at all: mask the policy to legal moves, take the argmax, commit.
Per-seed, those two systems are indistinguishable.

The mechanism that was supposed to explain the difference did not run. Across every seed on
both partitions the deterministic verifier rejected zero candidates, so no alternative
candidate was ever committed and no rollback ever fired. That makes the notable
result not "gating does not help" but "gating was not exercised", which is a different and
weaker statement — and it is why the identical action-masking number is best read as
evidence that the gating was inert here, not as evidence that it cannot work.

What the benchmark did measure was the cost side. RE:Reason's failures are all dead-end
aborts with zero invalid transition attempts, while the un-gated comparator accumulated
hundreds of invalid attempts per seed and lost more episodes to horizon exhaustion. The
gated system paid about 2.4 times the executed FLOPs of the action-masking comparator to
reach the same goal nodes. And the compute-matched comparator that spends its budget on two
sequential stochastic rollouts — the option the architecture was meant to beat — scored
higher than the pipeline on both partitions.

One limit on the interpretation is structural rather than statistical. Because the held-out
partition has now been used, this estimate cannot be sharpened on that data; the protocol
fixed a single pass in advance precisely so that the number would mean something, and it
means what it says. Disposition of the outcome sits with the principal investigator.
