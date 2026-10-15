---
title: "Phase 1.6 — architectural reformulation"
number: "1.6"
status: proposed
date: "2026-10-13"
summary: "A standalone proposal to test whether explicit binding and cyclic arithmetic inductive biases can produce compositional modular arithmetic. The Stage 1 pilot has run; Stage 2 is not authorized."

objectives:
  - "Test whether architectures carrying an explicit arithmetic or binding inductive bias acquire modular arithmetic compositionally rather than by memorization."
  - "Evaluate two trainable candidates against a vanilla recurrent baseline under a matched end-to-end optimizer protocol."
  - "Establish an exact-rule deterministic reference against which trainable candidates and the baseline can be compared."
  - "Keep the diagnostic that failed in Phase 1 — bounded sequence readers on frozen artifacts — out of the critical path."

scope: >
  A standalone proposal, deliberately separate from Phase 1 rather than an extension of it.
  Three candidates are specified within the registered parameter envelope: two trainable
  (Slot-MGU with explicit slot addressing, and Cyclic-MGU with a cyclic-arithmetic inductive
  bias) and one parameter-free deterministic analytical reference (the Modular Slot Machine,
  MSM, which receives zero parameter-training runs and is not described as a neural candidate).
  Evaluation is split into structurally separate tracks: trained end-to-end pilots for
  architectures with learned ALUs, and deterministic component pre-flight checks for the
  architectures with hardwired cyclic priors.

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
  - label: Held-out test set
    value: zero queries
    note: "The held-out split was strictly firewalled during the pilot, and pilot-trained parameters were discarded — no persistent checkpoints were created."

decisions:
  - label: "Candidate 3 (MSM)"
    outcome: >
      Adopted as a parameter-free deterministic analytical reference under Option B, removing a
      causally disconnected auxiliary branch. It is explicitly not described as a trainable
      neural candidate, nor as a general Bayes-optimal solution.
  - label: Track outcome
    outcome: >
      Track 1B passing establishes that the deterministic infrastructure is exact. It does not
      establish that gradient descent can learn the same computation — the report states this
      limitation directly, since the learned pathways were never exercised.
  - label: Advancement
    outcome: >
      Stage 2 (address binding), composed sequence training and the full campaign remain
      unauthorized. Advancement requires principal-investigator review under the registered
      contingency ladder.

notPlanned:
  - "Composed sequence training for Candidate 1 (Slot-MGU), halted because its primitive arithmetic was falsified."
  - "Any Stage 2 or composed-sequence training without explicit authorization."
  - "Curriculum changes, added candidates, or protocol amendments in response to the pilot outcome."

artifacts:
  - path: docs/reports/phase_1_6_architectural_reformulation_proposal.md
  - path: experiments/phase1_6_stage1_pilot_results.json
  - path: docs/RESEARCH_STATUS.md

sources:
  - path: docs/reports/phase_1_6_architectural_reformulation_proposal.md
  - path: docs/RESEARCH_STATUS.md
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

The pilot's outcome is reported here in full because it is negative and because that is
the point. Both trained candidates memorized 64 seen pairs perfectly and generalized not
at all, failing a gate that required 0.950 validation accuracy by reaching zero. In the
same stage, both deterministic components passed exactly. The two results together are
the useful finding: the exact arithmetic is implementable, and the learning of it is not
solved by adding an inductive bias alone.

It is also worth being precise about what Track 1B passing does not show. A
parameter-free rotation operator applied to an exact cyclic encoding is correct by
construction. Passing that check verifies the numerical implementation of the component;
it says nothing about whether a network can learn the equivalent computation. The
proposal says so itself, and this page repeats it rather than letting a green check mark
stand for more than it is.

Nothing beyond Stage 1 is authorized. The next step is review, not further training.
