---
title: Speculative commit pipeline
status: deferred
implementation: not-implemented
summary: "The original conceptual architecture — isolated hypothesis branches, learned verification and transactional state commits. Feasibility studies did not support it, and it is not implemented or currently pursued."

purpose: >
  The pipeline the project set out to build: instead of writing a single candidate into the
  state, clone the committed state into isolated branches, roll each forward, score them with
  a verifier, and commit only a validated transition — with rollback when nothing validates.
  The goal was error containment, on the premise that a wrong intermediate step could be
  caught before it contaminated persistent memory.

components:
  - name: Committed domain
    detail: "The master latent state — clean, checkpointable, and read-only during a step. Only a validated transition may write to it."
  - name: Speculative working domain
    detail: "K candidate trajectories cloned from the committed state via isolated tensor clones, so a failed branch cannot alias the master state."
  - name: Recursive core
    detail: "A weight-tied residual block applied r = 1 to R times per candidate, with a halting gate."
  - name: Adaptive halting
    detail: "A learned per-branch stopping rule, so compute is allocated to the branches that need it."
  - name: Typed decision heads
    detail: "Per-candidate output and confidence projections over the register machine's typed decisions."
  - name: Verifiers
    detail: "A deterministic rule checker and a learned auxiliary scorer, combined into an accept or reject decision."
  - name: Transactional commit gate
    detail: "Accepts the best candidate, or rejects all of them and rolls the state back to the last committed snapshot."

constraints:
  - "Designed within a 500K to 15M parameter envelope."
  - "Branch exploration must be isolated by tensor cloning; the design deliberately avoids copy-on-write semantics."
  - "The pipeline is a roadmap document (docs/02_core_architecture.md), not a description of the running system."

openQuestions:
  - "Whether continuous latent search offers any advantage over discrete beam search at matched compute. The tested branching signal did not."
  - "Whether transactional rollback prevents long-horizon drift without causing deadlock. Untested."
  - "Whether weight-tied recursion generalizes to depths unseen during training. Untested."
  - "Whether a verifier can be calibrated against shortcut exploitation. The tested verifier showed no decision-relevant signal."

sources:
  - path: docs/02_core_architecture.md
  - path: docs/reports/branching_feasibility_oracle.md
  - path: docs/reports/verifier_feasibility.md
  - path: docs/reports/phase_1_evidence_synthesis.md
  - path: docs/06_risks_research_questions_and_future.md

related:
  - phase-1
  - nonlinear-candidate-mgu
---

This page documents a design that was **not built**. It is here because the reasons it
was abandoned are a result, and because the design is the best available statement of
what the project originally thought the problem was.

Two feasibility studies closed it. The branching study measured an oracle with eight
branches at 0.6913 exact match, but found the per-draw information at chance and
matched noise recovering roughly 46% of the apparent gain — the oracle was not
achievable. The verifier study found that the headline AUROC was an artefact of an
always-deterministic top-1 selector, so the verifier agreed with an argmax that could
have been computed without it.

The Phase 1 synthesis drew the conclusion explicitly: speculative multi-path mechanisms
were conceived on the premise that the underlying core reliably produces valid candidate
computations that merely need selecting. It does not. Composing search over an unverified
arithmetic core would compound error propagation rather than resolve representational
failure, so all of it — branching, verification, transactional commit, recursion,
adaptive halting — is not implemented and not currently pursued.

Documenting it publicly matters for a second reason. The project's own naming maps every
one of these mechanisms onto established literature — recurrent hidden states, universal
transformers, adaptive computation time, beam search and MCTS, multi-head projections,
copy-on-write memory. Nothing here was invented, and the site should not imply otherwise.
