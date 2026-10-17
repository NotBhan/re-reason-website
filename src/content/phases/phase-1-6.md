---
title: "Phase 1.6 — architectural reformulation"
number: "1.6"
status: in-progress
date: "2026-10-17"
summary: "A standalone programme testing whether explicit binding and cyclic arithmetic inductive biases produce compositional modular arithmetic. Stage 1 failed at 0.0000; Stage 2 bound slot addresses but not arithmetic; the Cyclic-MGU pilot failed rejection; destination supervision reached 0.6750, joint destination-plus-persistence supervision passed at 0.9875, persistence alone reached 0.5375."

objectives:
  - "Test whether architectures carrying an explicit arithmetic or binding inductive bias acquire modular arithmetic compositionally rather than by memorization."
  - "Evaluate two trainable candidates against a vanilla recurrent baseline under a matched end-to-end optimizer protocol."
  - "Establish an exact-rule deterministic reference against which trainable candidates and the baseline can be compared."
  - "Keep the diagnostic that failed in Phase 1 — bounded sequence readers on frozen artifacts — out of the critical path."

scope: >
  A standalone programme, deliberately separate from Phase 1 rather than an extension of it.
  Three candidates were specified within the registered parameter envelope: two trainable
  (Slot-MGU with explicit slot addressing, and Cyclic-MGU with a cyclic-arithmetic inductive
  bias) and one parameter-free deterministic analytical reference (the Modular Slot Machine,
  MSM, which receives zero parameter-training runs and is not described as a neural candidate).
  Evaluation is split into structurally separate tracks: trained end-to-end pilots for
  architectures with learned ALUs, and deterministic component pre-flight checks for the
  architectures with hardwired cyclic priors. Stage 1 and Stage 2 have both been executed and
  closed, and a deterministic execution kernel (Candidate 1H) was added afterwards as an
  analytical reference. Four cyclic-MGU experiments have since run to completion against one
  architecture at an invariant 219,018 trainable parameters, completing the 2x2 auxiliary
  supervision grid. Stage 3 composed sequence training has not been authorized, and an
  architecture audit recommends de-prioritizing it.

results:
  - label: "Track 1A — trained end-to-end pilot"
    value: FAILED its gate
    note: >
      Slot-MGU (223,414 parameters) and the Vanilla GRU control (220,874 parameters) both
      reached 100% training fit with complete memorization overfitting, giving validation
      accuracy 0.0000 (0/16) across all five seeds. The gate required validation accuracy of at
      least 0.950; all seeds fell below 0.250.
  - label: "Track 1B — deterministic component pre-flight"
    value: PASSED exactly, 16/16
    note: >
      The Cyclic-MGU fixed cyclic rotation ALU reached exact accuracy 1.0000 with a maximum
      rotation error of 1.87e-6 and zero block-norm errors. The MSM deterministic reference
      reached exact accuracy 1.0000 with zero slot-preservation violations and exact atomic
      SWAP and READ routing. The learned read, write and gate networks were not exercised.
  - label: "Stage 2 — address binding, Slot-MGU"
    value: PASSED, 1.0000 on 5/5 seeds
    note: >
      The gate required a behavioural read exact match of at least 0.950 across at least four of
      five seeds, with none below 0.850. Slot-MGU reached 1.0000 on all five seeds over 1,200
      validation sequences. This is address binding, not arithmetic, and it does not reverse the
      Stage 1 arithmetic failure.
  - label: "Stage 2 — address binding, Cyclic-MGU and Vanilla GRU"
    value: FAILED, 5/5 below the boundary
    note: >
      Cyclic-MGU (219,018 parameters) scored 0.339 to 0.347 and the Vanilla GRU control
      (220,874 parameters) 0.352 to 0.380 per seed — none reached the 0.950 gate and all five
      seeds fell below the 0.850 rejection boundary.
  - label: "EXP-CYCLIC-ADD-01 — Cyclic-MGU integration pilot"
    value: FAIL_REJECTION
    note: >
      Cyclic-MGU's fixed, parameter-free Givens rotation ALU embedded in a monolithic
      continuous 212-dimensional state. Per-seed validation accuracy was 0.0000, 0.0625, 0.1250,
      0.1250 and 0.0000: 0/5 seeds reached 0.950 and 5/5 fell below 0.250, mean 0.0625 against
      chance 0.10. The hypothesis was contradicted under the registered protocol.
  - label: "EXP-CYCLIC-STEPWISE-01 — step-wise destination supervision"
    value: INCONCLUSIVE_INTERMEDIATE
    note: >
      One isolated intervention on the same monolithic Cyclic-MGU at an unchanged 219,018
      trainable parameters: auxiliary supervision of the destination register values at steps 0
      and 1, at coefficient 1.0. Selected-checkpoint validation accuracy per seed was 0.7500,
      0.8750, 0.4375, 0.6250 and 0.6875 — macro 0.6750 (10.8/16), against 0.0625 for the
      terminal-only predecessor — but 0/5 seeds reached the 0.950 gate and 0/5 fell below the
      0.250 rejection boundary. The preregistered matrix returns BEHAVIOR_INTERMEDIATE with
      REP_PARTIAL: macro read alignment 0.5471, with the register written immediately before the
      addition aligned (0.8368) and the register written one recurrent transition earlier
      degraded (0.2573).
  - label: "Held-out test set"
    value: zero queries
    note: "The held-out split was strictly firewalled at every stage, with zero queries across all runs."
  - label: "EXP-CYCLIC-PERSIST-01 — multi-register persistence supervision"
    value: PASSED, 0.9875
    note: >
      One registered change to the same monolithic Cyclic-MGU at an unchanged 219,018 trainable
      parameters: auxiliary supervision of the unaddressed register r0 across the S1 to S2
      transition, at coefficient 0.5 alongside the existing destination terms. Selected-checkpoint
      validation accuracy per seed was 1.0000, 1.0000, 1.0000, 0.9375 and 1.0000 — macro 0.9875
      (15.8/16) — so 4/5 seeds reached the 0.950 gate and 0/5 fell below the 0.250 boundary. The
      preregistered matrix returns BEHAVIORAL_PASS_CANONICAL_FULL with REP_CANONICAL_FULL, and the
      register read asymmetry is resolved: C_read(r0) 0.8879 and C_read(r1) 0.9303, both at or
      above 0.80, with macro C_read 0.9091, S_context 0.8584 and C_ALU 0.8496.
  - label: "EXP-CYCLIC-PERSIST-ABL-01 — persistence-only ablation"
    value: INCONCLUSIVE_INTERMEDIATE
    note: >
      The same architecture under the same protocol with the destination terms removed
      (coefficient 0.0), completing the 2x2 supervision grid. Per-seed selected-checkpoint
      accuracy was 0.3750, 0.5000, 0.6250, 0.4375 and 0.7500 — macro 0.5375 (43/80) — so 0/5 seeds
      reached the gate and 0/5 fell below the rejection boundary. Macro S_context 0.3360 and
      C_ALU 0.4384. The read asymmetry inverts rather than disappearing: r0 survives at 0.7710
      while the never-supervised write register r1 collapses to 0.2597, with step-1 destination
      readout at 0.1250 against a 0.10 chance rate.

decisions:
  - label: "Candidate 3 (MSM)"
    outcome: >
      Adopted as a parameter-free deterministic analytical reference under Option B, removing a
      causally disconnected auxiliary branch. It is explicitly not described as a trainable
      neural candidate, nor as a general Bayes-optimal solution.
  - label: "Candidate 4 (Monolithic-MLP-MGU)"
    outcome: >
      Rejected and not adopted, at 221,138 parameters. The design would have combined explicit
      slot addressing and cyclic arithmetic units in a single trainable recurrent model.
      Ratifying Factorial Option 1 instead left the study an unbalanced comparison of two
      trainable candidates, the Vanilla GRU baseline and the MSM reference, rather than a
      balanced factorial design — and no claim is made that such a combined architecture was
      tested, trained or validated.
  - label: "Track outcome"
    outcome: >
      Track 1B passing establishes that the deterministic infrastructure is exact. It does not
      establish that gradient descent can learn the same computation — the report states this
      limitation directly, since the learned pathways were never exercised.
  - label: "EXP-CYCLIC-ADD-01"
    outcome: >
      Closed as FAIL_REJECTION; the hypothesis is contradicted for monolithic Cyclic-MGU under
      the registered Stage 1 protocol. Embedding a fixed analytical arithmetic component in a
      continuous recurrent architecture was insufficient for out-of-training-pair generalization
      when the surrounding neural routing networks did not preserve canonical basis coordinates.
  - label: "EXP-CYCLIC-STEPWISE-01"
    outcome: >
      Closed as INCONCLUSIVE_INTERMEDIATE under the preregistered matrix — neither the
      progression gate nor the rejection boundary was met. The intervention substantially
      improved generalization over terminal-only supervision (macro 0.6750 against 0.0625),
      which shows that intermediate supervision aids alignment for a register written immediately
      before it is read; it did not preserve canonical coordinates for an unaddressed register
      across a recurrent transition. The protected test split was never queried.
  - label: "EXP-CYCLIC-PERSIST-01"
    outcome: >
      Closed as BEHAVIORAL_PASS_CANONICAL_FULL — the first Phase 1.6 candidate to pass the
      progression gate. This establishes that the continued failure of the identical monolithic
      architecture under terminal-only and destination-only supervision was an objective and
      supervision-horizon limitation rather than an intrinsic routing failure, with the parameter
      count invariant at 219,018 throughout. It does not establish learned arithmetic: the cyclic
      ALU is fixed and analytical, so the result validates neural routing and coordinate
      preservation into that component, not the emergence of arithmetic from data. The protected
      split was not queried.
  - label: "EXP-CYCLIC-PERSIST-ABL-01"
    outcome: >
      Closed as INCONCLUSIVE_INTERMEDIATE. Persistence supervision alone is not sufficient: it
      preserves the unaddressed register but leaves the write register ungrounded, and the inverted
      asymmetry it produces is near-symmetric in magnitude with the destination-only case. Joint
      destination and persistence supervision remains the only validated objective for this
      architecture on this task, and the 2x2 supervision grid is empirically complete across seeds
      42–46.
  - label: "Stage 1 investigation"
    outcome: >
      Officially closed. The telemetry defect that hid the training curves was corrected, and
      the validation failure was confirmed as a failure to generalize on the registered
      validation pairs rather than a logging artifact. Broader Phase 1.6 questions remain open.
  - label: "Advancement"
    outcome: >
      The persistence protocol was authorized and executed, and its ablation closed the grid. An
      architecture-to-implementation audit then found five of the seven target state-machine
      mechanisms absent from active model code and recommended de-prioritizing Stage 3 composed
      sequence training: it contains no candidate branching, no transition verifier, no
      transaction gate and no rollback, so extending the recurrence horizon would refine a
      conventional recurrent cell without advancing the architecture the project exists to test.
      The audit recommended constrained graph pathfinding as the end-to-end vehicle instead,
      together with preserving the protected test firewall, hardening the official runners against
      artifact overwrite, and implementing the state-isolation and transaction-gate machinery.
      Stage 3 has not been authorized.

notPlanned:
  - "Composed sequence training for Candidate 1 (Slot-MGU), halted because its primitive arithmetic was falsified. Its Stage 2 address-binding pass does not reverse that."
  - "Any Stage 3 composed-sequence training without explicit authorization; the audit recommends de-prioritizing it rather than authorizing it."
  - "Curriculum changes, added candidates, or protocol amendments in response to the pilot outcome."
  - "Coefficient tuning or further sweeps on 3-step modular addition, which the completed 2x2 grid would not inform."
  - "Evaluation of the protected test split (b ∈ {0, 5}) at this stage. The audit recommends preserving the firewall for an integrated candidate rather than spending it on a 3-step arithmetic model with a fixed analytical ALU."

artifacts:
  - path: experiments/phase1_6_stage1_pilot_results.json
  - path: experiments/phase1_6_stage2_pilot_results.json
  - path: experiments/exp_cyclic_add_01_results.json
  - path: experiments/run_exp_cyclic_add_01.py
  - path: tests/test_exp_cyclic_add_01.py
  - path: experiments/exp_cyclic_stepwise_01_results.json
  - path: experiments/run_exp_cyclic_stepwise_01.py
  - path: tests/test_exp_cyclic_stepwise_01.py
  - path: experiments/exp_cyclic_persist_01_results.json
  - path: experiments/run_exp_cyclic_persist_01.py
  - path: tests/test_exp_cyclic_persist_01.py
  - path: experiments/exp_cyclic_persist_abl_01_results.json
  - path: experiments/run_exp_cyclic_persist_abl_01.py
  - path: tests/test_exp_cyclic_persist_abl_01.py
  - path: src/re_reason/core/register_machine_models.py

sources:
  - path: docs/reports/phase_1_6_architectural_reformulation_proposal.md
  - path: docs/reports/exp_cyclic_stepwise_01_report.md
  - path: docs/reports/exp_cyclic_persist_01_report.md
  - path: docs/reports/exp_cyclic_persist_abl_01_report.md
  - path: docs/reports/architecture_gap_audit_and_milestone_proposal.md
  - path: docs/research/exp_cyclic_stepwise_01_specification.md
  - path: docs/research/exp_cyclic_persist_01_specification.md
  - path: docs/research/exp_cyclic_persist_abl_01_specification.md
  - path: docs/RESEARCH_STATUS.md
  - path: docs/RESEARCH_LOG.md
  - path: docs/reports/phase_1_evidence_synthesis.md

related:
  - phase-1
  - nonlinear-candidate-mgu
  - experiment-3b-pathfinding-evaluation
---

Phase 1.6 exists because Phase 1 concluded that the open question had changed. The
diagnostic programme had saturated: it knew where the frozen model failed, that the
information needed was present at the interface, and that no intervention on the existing
core improved the outcome. What remained was a design question — how to build recurrence
and representation binding so that discrete modular arithmetic is composed rather than
memorized.

Two stages have now been executed, and both negative results are reported here in full
because they are the point. Stage 1's trained pilot memorized 64 seen pairs perfectly and
generalized not at all, failing a gate that required 0.950 validation accuracy by reaching
zero. In the same stage, both deterministic components passed exactly. Stage 2 then separated
the two bottlenecks the proposal had distinguished from the start: Slot-MGU's discrete slot
partitioning supported address binding — a behavioural read exact match of 1.0000 on all five
seeds over 1,200 validation sequences, against a gate of 0.950 — while the same stage falsified
that capability for the monolithic alternatives, Cyclic-MGU and the Vanilla GRU control both
sitting between 0.34 and 0.38 and below the rejection boundary on every seed.

A third executed pilot closed the remaining possibility that the arithmetic could simply be
supplied as a fixed component. EXP-CYCLIC-ADD-01 embedded Cyclic-MGU's parameter-free Givens
rotation ALU — an exact operator — inside a trainable continuous state, and the surrounding
learned routing did not preserve the coordinates it depends on. Mean validation accuracy was
0.0625 against a chance rate of 0.10. The deterministic arithmetic is implementable; neither
learning it, nor routing through it, follows from having it.

A fourth executed pilot asked whether the remaining failure was supervision rather than
architecture. EXP-CYCLIC-STEPWISE-01 kept the model fixed — the same monolithic Cyclic-MGU,
the same 219,018 trainable parameters, the same parameter-free rotation ALU — and registered a
single change: auxiliary supervision of the destination register values at steps 0 and 1, at
coefficient 1.0. Macro validation accuracy rose from 0.0625 to 0.6750 (10.8/16), with every
seed training to 100% and landing between 0.4375 and 0.8750 — above the rejection boundary,
below the gate — and the preregistered matrix returns INCONCLUSIVE_INTERMEDIATE: intermediate
behaviour with partial representation alignment. The representation diagnostics locate what
remains: the register written immediately before the addition reads at canonical alignment
0.8368, while the register written one recurrent transition earlier reads at 0.2573.
Supervision made the routing learnable; it did not make an unaddressed operand survive a state
update.

It is also worth being precise about what each pass does not show. A parameter-free rotation
operator applied to an exact cyclic encoding is correct by construction: passing that check
verifies the numerical implementation of the component and says nothing about whether a
network can learn the equivalent computation. The MSM reference and Candidate 1H are
analytical references rather than trained models — 1H executes the register machine exactly
over all 100 addition pairs, the 16 Stage 1 validation pairs and the 1,200 Stage 2 sequences
at zero parameters, which establishes the reference and not any learned capability. And Stage
2's address-binding pass is not a reversal of Stage 1: Slot-MGU binds addresses, and it still
does not compute modular arithmetic.

A fifth executed pilot answered the question the step-wise result left open, and it passed.
EXP-CYCLIC-PERSIST-01 changed one thing again — the same architecture, the same 219,018
parameters, the same fixed ALU — by supervising the *unaddressed* register across the state
update rather than only the register being written. Macro validation accuracy went from 0.6750
to 0.9875, four of five seeds reached the 0.950 gate, and the read asymmetry that had blocked
the previous attempt resolved rather than shifted: the two operands read at 0.8879 and 0.9303,
both above the canonical threshold, with context consistency at 0.8584 and ALU alignment at
0.8496. It is the first Phase 1.6 result classified BEHAVIORAL_PASS_CANONICAL_FULL, and it
establishes something specific: a continuous monolithic state does not need discrete slot
isolation to hold two registers independently, provided both writing and persistence are
supervised. It does not establish that the network learned arithmetic — the rotation ALU is
parameter-free and exact, so what was learned is the routing into it.

The sixth experiment removed the destination terms to ask whether persistence alone would have
sufficed, and it did not. EXP-CYCLIC-PERSIST-ABL-01 reached 0.5375, with the asymmetry simply
inverted: the supervised unaddressed register survived at 0.7710 while the never-supervised
write register collapsed to 0.2597, and the step-1 destination readout sat at 0.1250 against
0.10 chance. That completes a 2x2 grid over the same architecture, seed cohort, data and
optimizer — terminal-only 0.0625, destination-only 0.6750, persistence-only 0.5375, joint
0.9875 — and the joint cell is the only one that passes.

Then the programme changed direction, on evidence rather than on the result. An
architecture-to-implementation audit found that five of the seven mechanisms in the project's
own target state machine were absent from active model code, and concluded that extending the
recurrence horizon with Stage 3 composed sequences would refine a conventional recurrent cell
without exercising any of them. It recommended de-prioritizing Stage 3 and moving the
end-to-end work to a task with real alternatives, checkable transitions, dead ends and
something for rollback to do. That recommendation was acted on: the isolation and
transaction-gate machinery, a deterministic verifier, an action-conditioned brancher and a
two-phase orchestrator were implemented, and the first
[end-to-end evaluation](/research/experiments/experiment-3b-pathfinding-evaluation) of the
assembled pipeline has now run and been recorded.

So the honest summary of Phase 1.6 is that it closed its own supervision question and then
stopped being the critical path. The arithmetic finding is real and bounded — joint supervision
carries a monolithic recurrent state to near-perfect validation accuracy on a three-step trace
with a fixed analytical ALU, on seen operand pairs only, with the protected split untouched and
the ALU never learned. What it did not do is produce evidence about branching, verification or
error containment, which is why the audit moved the programme rather than extending this one.
Stage 3 remains unauthorized, and the protected test split remains firewalled.
