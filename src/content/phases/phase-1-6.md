---
title: "Phase 1.6 — architectural reformulation"
number: "1.6"
status: in-progress
date: "2026-10-15"
summary: "A standalone programme testing whether explicit binding and cyclic arithmetic inductive biases produce compositional modular arithmetic. The Stage 1 trained pilot failed its gate at 0.0000 (0/16); Stage 2 established address binding with discrete slots but not arithmetic; the Cyclic-MGU integration pilot failed its preregistered rejection boundary."

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
  analytical reference. Stage 3 composed sequence training has not been authorized.

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
  - label: "Held-out test set"
    value: zero queries
    note: "The held-out split was strictly firewalled at every stage, and pilot-trained parameters were discarded — no persistent checkpoints were created."

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
  - label: "Stage 1 investigation"
    outcome: >
      Officially closed. The telemetry defect that hid the training curves was corrected, and
      the validation failure was confirmed as a failure to generalize on the registered
      validation pairs rather than a logging artifact. Broader Phase 1.6 questions remain open.
  - label: "Advancement"
    outcome: >
      Stage 3 composed sequence training and the full campaign remain unauthorized. Advancement
      requires principal-investigator review under the registered contingency ladder, and the
      recorded next step is PI review of the EXP-CYCLIC-ADD-01 outcome and a determination on
      research direction.

notPlanned:
  - "Composed sequence training for Candidate 1 (Slot-MGU), halted because its primitive arithmetic was falsified. Its Stage 2 address-binding pass does not reverse that."
  - "Any Stage 3 composed-sequence training without explicit authorization."
  - "Curriculum changes, added candidates, or protocol amendments in response to the pilot outcome."

artifacts:
  - path: experiments/phase1_6_stage1_pilot_results.json
  - path: experiments/phase1_6_stage2_pilot_results.json
  - path: experiments/exp_cyclic_add_01_results.json
  - path: experiments/run_exp_cyclic_add_01.py
  - path: tests/test_exp_cyclic_add_01.py
  - path: src/re_reason/core/register_machine_models.py

sources:
  - path: docs/reports/phase_1_6_architectural_reformulation_proposal.md
  - path: docs/RESEARCH_STATUS.md
  - path: docs/RESEARCH_LOG.md
  - path: docs/reports/phase_1_evidence_synthesis.md

related:
  - phase-1
  - nonlinear-candidate-mgu
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

It is also worth being precise about what each pass does not show. A parameter-free rotation
operator applied to an exact cyclic encoding is correct by construction: passing that check
verifies the numerical implementation of the component and says nothing about whether a
network can learn the equivalent computation. The MSM reference and Candidate 1H are
analytical references rather than trained models — 1H executes the register machine exactly
over all 100 addition pairs, the 16 Stage 1 validation pairs and the 1,200 Stage 2 sequences
at zero parameters, which establishes the reference and not any learned capability. And Stage
2's address-binding pass is not a reversal of Stage 1: Slot-MGU binds addresses, and it still
does not compute modular arithmetic.

The open question recorded at closure is whether modular arithmetic generalization strictly
requires discrete slot partitioning combined with canonical coordinate enforcement, or whether
some other coordinate regularization could let a monolithic or continuous architecture
preserve harmonic coordinates. Nothing beyond Stage 2 is authorized. The next step is review,
not further training.
