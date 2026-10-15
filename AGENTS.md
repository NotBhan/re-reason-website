# AGENTS.md — RE:REASON Website Development Rules

## 1. Mandatory Research Synchronization

The website documents the RE:REASON research project. Its scientific content must remain synchronized with the latest authoritative state of the RE:REASON source repository.

**For every task that creates, edits, reviews, or reorganizes website content, first inspect the current RE:REASON repository state and determine whether the website's published information is still accurate.**

The `re-reason` repository is located in the parent directory of the website project. Resolve its actual path from the website repository root, verify that it is the intended Git repository, and inspect its current state before relying on any paths or previous reports.

Do not assume that the research repository's state is unchanged from a previous coding-agent session.

This requirement applies to:
- Homepage research summaries and metrics.
- Research findings and interpretations.
- Experiment, architecture, and phase pages.
- Figures, captions, and figure provenance.
- Research status, gate outcomes, and limitations.
- Technical descriptions of algorithms, models, and architectures.
- Research-source links and artifact references.
- Any other website content that describes RE:REASON's implementation or research.

Purely visual or infrastructure-only changes do not require a full research-content review, but the agent must still avoid invalidating existing research references, claims, or provenance.

## 2. Inspect the Latest Research State Before Editing

At the beginning of a relevant task:

1. Locate the RE:REASON repository in the parent directory and verify its Git root.
2. Inspect its working-tree status, current branch, HEAD, and recent commits.
3. Identify commits and changed files relevant to the website's existing content or the requested task.
4. Inspect the authoritative research logs, experiment reports, benchmark results, architecture documents, telemetry, and artifacts relevant to those changes.
5. Compare the resulting research state against the information currently published on the website.
6. Update affected content only after the supporting evidence has been examined.

Use Git history to discover what changed, not as a substitute for inspecting the underlying evidence.

Do not repeatedly traverse the entire research repository when a targeted review of relevant commits and files is sufficient. However, do not assume that a commit summary or an earlier handoff contains all the information necessary to verify a claim.

When there are no relevant research changes, preserve accurate existing content rather than rewriting it unnecessarily.

## 3. Establish an Evidence Hierarchy

Not all research material has the same evidentiary status. Preserve the project's existing terminology and governance rules.

Distinguish explicitly between:

1. **Protocol and preregistration:** the frozen experiment design, thresholds, evaluation rules, and decision criteria.
2. **Implementation facts:** what the code actually implements, including model architecture, data splits, training procedures, and evaluation logic.
3. **Official results and telemetry:** authoritative outputs from the designated experiment runs and their corresponding artifacts.
4. **Exploratory observations:** diagnostic runs, informal measurements, debugging experiments, and observations outside the official protocol.
5. **Hypotheses and interpretations:** explanations or proposed mechanisms that have not been established by authoritative evidence.

These categories must not be silently substituted for one another.

A diagnostic run does not become an official result merely because it appears in a recent log or commit. A hypothesis does not become a finding because it explains an observed result plausibly. An implementation detail does not, by itself, establish empirical effectiveness.

When evidence is incomplete, preserve the uncertainty.

## 4. Preserve Negative Results and Research Limitations

The website must represent the research accurately, including unsuccessful experiments and unresolved questions.

Required rules:

- Preserve failed experiment outcomes, failed gates, negative results, and meaningful null findings.
- Preserve the exact preregistered thresholds and evaluation criteria applicable to each experiment.
- Do not retroactively modify thresholds, protocols, or success criteria to make a result appear successful.
- Do not present an exploratory result as a preregistered or official result.
- Do not combine incomparable evaluation tracks into a single ranking or aggregate score.
- Do not claim generalization from evidence that establishes only training-set or validation-set performance.
- Do not claim that an architecture was implemented or evaluated if it was only proposed.
- Do not remove limitations, caveats, or contradictory evidence to improve the website's presentation.
- Do not describe a result as reproducible unless the relevant evidence supports that claim.
- Do not infer scientific conclusions from commit messages, file names, plots, or summary metrics alone.

For every research entry, preserve the website's established epistemic structure, including what the evidence establishes, what it does not establish, the limitations, and the supporting sources where applicable.

Different content types may use different schemas. Do not force experiment-specific fields onto architecture or phase entries when their existing schemas use other appropriate status and evidence fields.

## 5. Handle Contradictions Without Inventing Resolutions

If the source repository contains conflicting descriptions, inconsistent metrics, missing artifacts, or disagreement between a plot and its accompanying report:

1. Identify the exact conflicting sources.
2. Inspect the authoritative artifacts and relevant run metadata where available.
3. Determine whether the discrepancy can be resolved directly from verifiable evidence.
4. If it cannot, leave the claim unresolved and document the discrepancy.
5. Do not publish a disputed figure or present its disputed interpretation as established fact.
6. Do not modify, crop, recolor, regenerate, or otherwise manipulate research evidence to force agreement.
7. Do not silently choose whichever source produces the more favorable conclusion.

A website content update is not authorization to resolve a scientific disagreement. Escalate unresolved questions to the research owner and preserve the existing publication safeguards until authoritative evidence is available.

## 6. Keep Research Content Traceable

Every substantive research claim published on the website must be traceable to its supporting source.

When updating research content:

- Use actual source paths, experiment identifiers, commit references, or artifact references where appropriate.
- Preserve source-document references and the project's existing citation conventions.
- Verify that linked files and artifacts exist in the current repository state.
- Ensure captions describe what the corresponding figures actually show.
- Preserve figure hashes and provenance records when the asset-integrity workflow requires them.
- Keep figures unpublished when their provenance or interpretation cannot be verified.
- Update source references when authoritative files move or are renamed.
- Do not invent paths, commits, run identifiers, numerical results, or citations.
- Do not use a newer commit timestamp as evidence that every file in that commit represents a scientifically newer or more authoritative result.

When a website entry changes, update its source references and relevant metadata alongside its claims.

## 7. Update the Website When the Research Changes

When the latest research state materially changes a published claim, result, architecture description, or project status, update the affected website content as part of the same website task when the evidence is sufficient.

Examples include:

- A new official experiment result superseding an earlier result.
- A failed or passed gate changing the status of a phase.
- An architecture being implemented, revised, rejected, or formally abandoned.
- A benchmark protocol or evaluation split changing under an explicitly authorized protocol revision.
- An artifact being invalidated, corrected, or replaced by an authoritative version.
- A previously unresolved discrepancy being reconciled with supporting evidence.
- A report correcting a number or interpretation currently shown on the website.

Do not update content merely because a newer commit exists. Establish that the change is relevant and that its evidence supports the proposed website update.

For each material update, verify consistency across all affected surfaces, including the homepage, research indexes, detail pages, figure captions, source links, and release documentation.

Avoid leaving one page with a superseded result while another page presents the newer result as authoritative.

## 8. Preserve the Separation Between Research and Presentation

The website may use dramatic typography, animation, computational diagrams, and editorial storytelling. These presentation choices must not alter the meaning or evidentiary status of research.

Therefore:

- Visual polish must never take precedence over factual accuracy.
- Do not exaggerate metrics, simplify away important limitations, or use misleading scales.
- Label illustrative diagrams as illustrative when they are not logged experimental data.
- Preserve axis ranges, categories, and qualifications needed for an honest interpretation.
- Do not make a visual representation appear to be an actual measurement unless it is derived from the corresponding data.
- Do not turn a proposed architecture into an implemented one through wording or imagery.
- Do not change research claims merely to fit a headline, layout, animation, or social preview.

Keep presentation changes and scientific-content changes conceptually separate, even when both are included in the same implementation task.

## 9. Protect Repository Boundaries

The website repository and the RE:REASON research repository are separate projects with separate Git histories.

For website work:

- Treat the RE:REASON repository as an authoritative research source, not as part of the website's writable working tree.
- Do not modify, stage, commit, push, reset, or rewrite the research repository unless the user explicitly authorizes that work.
- Do not accidentally include research-repository changes in the website's Git operations.
- Do not assume that a nested repository, cloned dependency, or research artifact is ordinary website source.
- Preserve all existing user changes in both repositories.
- Do not stage, commit, push, deploy, or rewrite website Git history without explicit authorization.

If the research repository contains uncommitted changes relevant to a claim, inspect them carefully and distinguish working-tree observations from committed, reproducible results. Do not treat uncommitted exploratory outputs as official results without evidence of their status.

## 10. Verification Requirements

After updating research-related website content:

1. Recheck each modified claim against its authoritative source.
2. Verify source paths and artifact references.
3. Verify that numerical values, thresholds, units, and evaluation labels are exact.
4. Check for contradictions between the homepage and research detail pages.
5. Run the project's existing schema and content validation.
6. Run `npm run check` and `npm run build`.
7. Run `npm run verify:release` when available and relevant.
8. Verify that published figure hashes and provenance records remain valid.
9. Confirm that unresolved or rejected research artifacts remain unpublished.
10. Report any evidence that could not be inspected or any scientific discrepancy that remains unresolved.

Do not report a check as passing unless it actually ran successfully.

Do not claim that a website update is scientifically verified merely because its schema, TypeScript checks, or production build passes.

## 11. Required Final Report for Research-Related Changes

When a task changes or audits research-related website content, include a concise section in the final report covering:

- **Research state inspected:** repository HEAD and relevant commits or files reviewed.
- **Content updated:** affected website routes, claims, metrics, figures, or statuses.
- **Evidence basis:** the authoritative reports, logs, telemetry, or artifacts supporting those changes.
- **Preserved qualifications:** relevant failures, thresholds, limitations, and uncertainty.
- **Unresolved issues:** conflicting evidence or sources that require research-owner review.
- **Verification:** checks actually executed and their outcomes.

If no research content needed updating, state that the relevant sources were checked and no material content change was justified. Do not manufacture a content update merely to demonstrate that the rule was followed.

## 12. Governing Principle

**The website must reflect the latest authoritative state of RE:REASON, not merely the last state the website developer remembers.**

Research freshness is a permanent requirement for future website work. Inspect the current source repository, verify the underlying evidence, update affected content when justified, preserve uncertainty when unresolved, and maintain traceability from every substantive published claim to its authoritative source.

When accuracy and presentation conflict, accuracy takes precedence.