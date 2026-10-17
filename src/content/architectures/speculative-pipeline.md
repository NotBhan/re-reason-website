---
title: Speculative commit pipeline
status: active
implementation: implemented
summary: "The state-machine architecture the project set out to build: isolated hypothesis branches, deterministic transition verification and transactional state commits. After being closed as a design in Phase 1, its core machinery was implemented across Milestones 1 to 3A and evaluated end to end in Milestone 3B."

purpose: >
  The pipeline the project set out to build: instead of writing a single candidate into the
  state, clone the committed state into isolated branches, roll each forward, score them with a
  verifier, and commit only a validated transition — with rollback when nothing validates.
  The goal was error containment, on the premise that a wrong intermediate step could be
  caught before it contaminated persistent memory.

components:
  - name: Committed domain
    detail: "The master latent state — clean, checkpointable, and read-only during a step. Only a validated transition may write to it. Implemented: LatentState and StateContainer carry save_checkpoint() and restore_checkpoint(), the latter restored bit-exactly across completed commits while preserving container object identity."
  - name: Speculative working domain
    detail: "K candidate trajectories cloned from the committed state via isolated tensor clones, so a failed branch cannot alias the master state. Implemented: SpeculativeCandidateSet gives each candidate an explicit ACTIVE / COMMITTED / ROLLED_BACK / DISCARDED lifecycle over the master state."
  - name: Recursive core
    detail: "A weight-tied residual block applied r = 1 to R times per candidate, with a halting gate. Not integrated into the evaluated pipeline: the branch core applies a single residual transition per candidate, and the weight-tied CognitionCore is unused by it."
  - name: Adaptive halting
    detail: "A learned per-branch stopping rule, so compute is allocated to the branches that need it. Not implemented — there is no halting head, halting probability or dynamic-compute loss in the repository."
  - name: Typed decision heads
    detail: "Per-candidate output and confidence projections over the task's typed decisions. Partially implemented: a single linear policy head over the twelve legal moves, with no calibrated confidence head and no multi-head typed structure."
  - name: Verifiers
    detail: "A deterministic rule checker and a learned auxiliary scorer, combined into an accept or reject decision. Deterministic half implemented: PathfindingVerifier decides edge connectivity and blockade status against the ground-truth map. The learned scorer remains unimplemented; the tested learned verifier carried no decision-relevant signal and was formally rejected in Phase 1."
  - name: Transactional commit gate
    detail: "Accepts the best candidate, or rejects all of them and rolls the state back to the last committed snapshot. Implemented: TransactionCommitGate ranks deterministically, fails closed on missing metadata, re-validates before applying, and aborts to the exact master state."

updateRule:
  - "S"
  - sub: t+1
  - " = s"
  - sub: "(k*)"
  - ",  k* = arg max"
  - sub: "k"
  - " score(s"
  - sub: "(k)"
  - ")  subject to  V"
  - sub: "det"
  - " = 1;  otherwise S"
  - sub: "t+1"
  - " = S"
  - sub: "t"
updateRuleNote: >
  The gate commits a verified candidate or aborts to the previous committed state. In the
  evaluated run the abort branch was never taken and no candidate was ever rejected.

constraints:
  - "Designed within a 500K to 15M parameter envelope; the evaluated instance carries 171,660 trainable parameters, matched bit-for-bit against every comparator."
  - "Branch exploration is isolated by tensor cloning; the design deliberately avoids copy-on-write semantics."
  - "Recursive cognition at R > 1 and adaptive halting are not implemented, and their integration is a later milestone gated on the branching and verification results."
  - "The learned verifier half of the verification component is not implemented. Only the deterministic rule checker exists, and it is the only verifier the evaluated pipeline consults."
  - "The evaluated run measured the pipeline's forward path. The verifier rejected zero candidates and the gate rolled back zero times, so error containment, dead-end recovery and rollback were not exercised."

openQuestions:
  - "Whether the gating mechanism is inert on this benchmark or merely untriggered. Zero verifier rejections across every seed and both partitions is consistent with either, and the two are not distinguishable from these runs."
  - "Why a compute-matched two-rollout comparator outperformed the pipeline on both partitions. Spending the equivalent budget on sequential stochastic exploration scored higher than intra-step candidate branching."
  - "Whether continuous latent search offers any advantage over discrete beam search at matched compute. The tested branching signal did not, and the original Gaussian-perturbation formulation remains falsified."
  - "Whether transactional rollback prevents long-horizon drift without causing deadlock. The bounded retry budget exists; it was never entered."
  - "Whether weight-tied recursion generalizes to depths unseen during training. Untested."
  - "Whether a learned verifier can be calibrated against shortcut exploitation. The tested verifier showed no decision-relevant signal."

sources:
  - path: docs/02_core_architecture.md
  - path: docs/reports/architecture_gap_audit_and_milestone_proposal.md
  - path: docs/research/pre_3b_experimental_protocol.md
  - path: docs/reports/branching_feasibility_oracle.md
  - path: docs/reports/verifier_feasibility.md
  - path: docs/reports/phase_1_evidence_synthesis.md
  - path: docs/06_risks_research_questions_and_future.md

related:
  - experiment-3b-pathfinding-evaluation
  - phase-1-6
  - phase-1
  - nonlinear-candidate-mgu
---

This page has been through both states a design can be in here, which is why it is worth
reading in full. It documents a pipeline that was **not built** when the Phase 1 synthesis
closed it, and that was built afterwards — its isolation, branching, verification and commit
machinery now exist in code and were evaluated end to end.

The closure was not wrong, and it was not reversed. Two Phase-1 feasibility studies measured
the specific mechanisms that were proposed at the time and found them empty. The branching
study measured an oracle with eight branches at 0.6913 exact match, but found the per-draw
information at chance and matched noise recovering roughly 46% of the apparent gain — the
oracle was not achievable. The verifier study found the headline AUROC was an artefact of an
always-deterministic top-1 selector, so the verifier agreed with an argmax that could have
been computed without it. Composing search over an unverified arithmetic core would have
compounded error propagation rather than resolved representational failure, so on the register
machine the synthesis declined to pursue it.

What changed was not the evidence but the task. An architecture audit found five of the seven
target mechanisms absent from active model code and concluded that continuing on straight-line
modular addition would refine a conventional recurrent cell without exercising any of them. It
recommended constrained graph pathfinding — a task with genuine alternative paths, a
transitions rule that can be checked against ground truth, dead ends, and something for
rollback to do. On that task the isolation container, the transaction gate, a deterministic
verifier, an action-conditioned brancher and a two-phase orchestrator were implemented and
unit-tested, and then trained and evaluated.

That is the sense in which the entry above is honest rather than triumphant. The mechanism the
architecture exists for did not fire: across every seed and both partitions the verifier
rejected no candidate, so nothing was ever rolled back and the pipeline's realised behaviour is
indistinguishable, per seed, from masking the policy to legal moves and committing. The
pipeline did beat its parameter-matched un-gated comparator by about six points, on a paired
interval that excludes zero, but it stayed below the margin the protocol fixed in advance and
lost to a compute-matched comparator that spends the same budget on two sequential rollouts.

Documenting the design publicly matters for a second reason, unchanged by any of this. The
project's own naming maps every one of these mechanisms onto established literature — recurrent
hidden states, universal transformers, adaptive computation time, beam search and MCTS,
multi-head projections, copy-on-write memory. Nothing here was invented, and the site should
not imply otherwise.
