# Figure audit

Every research figure considered for publication was traced to the report that
specifies it, its axes and series read, and its plot checked against the
report's own description of it. This file records the outcome, including the
figures that were **rejected**.

The repository ships 330 PNGs under `docs/reports/figures/`. Only a small subset
has a description attached to it in prose. A figure is only published here when
all of the following hold:

1. a report names the file and states what it plots;
2. the file exists in the research repository;
3. reading the plot agrees with the report's description of it;
4. the experimental conditions the figure was measured under are stated
   alongside it on the page.

A filename is not provenance. Neither is a plot that merely looks plausible.

## Published

Six figures meet all four conditions.

| Figure | Specified by | Measures | Conditions carried on the page |
| --- | --- | --- | --- |
| `experiment_g_confound_strata.png` | `experiment_g_add_commit_gap.md` §Required Figures | Gap rate by gate bin and arithmetic stratum, for E and F | candidate-correct ADDs, canonical test split, 5 seeds pooled |
| `experiment_g_gate_vs_commit_acc.png` | same | ADD destination decoding accuracy against full-vector mean gate, candidate and committed, E and F | test split, pooled seeds, both outcomes shown |
| `experiment_g_oracle_vs_committed.png` | same | Oracle-decoded candidate vs committed state, by controlled ADD category | controlled ADD builders, E and F |
| `06_register_probe_accuracy_over_time.png` | `mechanism_qa_diagnostic.md` §10 | Per-register linear probe decoding accuracy across T = 1…10 | frozen Nonlinear Candidate MGU |
| `07_retention_vs_intervening_steps.png` | same | Accuracy on untouched registers against intervening steps | frozen models; UGRNN comparison shown |
| `08_failure_rate_by_operation_type.png` | same | Error rate by dominant operation type | same run as the other QA figures |

### Reading notes carried onto the page

Two of these plots need a caution next to them, because the plot alone
overstates them:

- **`07_retention_vs_intervening_steps.png`** uses a y-axis of 99.0–100.0. The
  flat lines are therefore a genuine result (zero passive decay for both bounded
  convex models), but the Canonical UGRNN's apparent collapse is a 1.0-point
  effect amplified by the axis range. The page states the axis range.
- **`08_failure_rate_by_operation_type.png`** shows four bars, not two:
  ADD-heavy 96.4%, SET-heavy 92.2%, SWAP-heavy 86.6%, balanced 38.4%. The source
  report highlights ADD as the worst case, which the plot supports, but the plot
  also shows every operation-heavy regime failing far more than the balanced mix.
  The caption reports all four values rather than only the pair that flatters the
  headline.

## Rejected

### `03_gate_distribution.png` — contradicts its report

`mechanism_qa_diagnostic.md` §10 describes this figure as:

> Unimodal, non-binary density centered at `0.32`, proving continuous write
> modulation.

The plotted figure is **strongly bimodal**. Gate density spikes at both 0.0 and
1.0 with almost no mass in the interior; there is no mode at 0.32 and the
distribution is close to binary.

The two cannot both be right. The description and the plot disagree about the
central claim the figure is cited for, so the figure is not published and the
claim it was to support is not repeated anywhere on the site.

The likely explanations — a figure regenerated after the report text was
written, a different model or checkpoint than the report describes, or a stale
description — cannot be distinguished from this repository alone. Resolving it
requires whoever produced the QA diagnostic run to confirm which artifact is
authoritative. Until then this is an open documentation inconsistency, not a
result.

Worth noting for contrast: `02_mean_gate_over_time.png` in the same set is
described as the mean gate stabilising at ≈ 0.33. A mean near 0.33 is exactly
what a distribution concentrated at the two extremes would produce, which is
consistent with the plot being right and the §10 description of *this* figure
being wrong. That is a hypothesis, not a finding, and does not license publishing
the figure.

### `experiment_g_prediction.png` — panel titles collide

The figure plots four ROC panels. The upper row is legible and its AUCs match
the report exactly (E: `f` only 0.582, `|C−S_prev|` only 0.689, both 0.689;
F: 0.626 / 0.684 / 0.696 — the report cites 0.582/0.626 and 0.689/0.684).

The lower row's panel titles are printed on top of one another, so it is not
possible to establish from the figure what its two panels measure. It is also
not the general-stratum comparison the report discusses separately, whose AUCs
(0.76/0.77 for the gate) do not appear anywhere in the figure.

A figure whose own labels are unreadable cannot carry an interpretation, and the
plot may not be altered to fix it. Excluded.

## Not considered

The remaining ~320 figures have no description anywhere in the prose, so there
is nothing to check them against. Several are referenced only as a file list at
the top of a report (`**Figures:** filename, filename, filename`) without any
statement of what each panel shows, which establishes the generating report but
not the figure's meaning. They are left unpublished.

## Reproducing this audit

```bash
node scripts/sync-figures.mjs            # copy the published set + record hashes
node scripts/sync-figures.mjs --check    # report drift against the hash manifest
```

`public/figures/SOURCES.json` holds the SHA-256 of every published figure as
copied. Figures are copied byte for byte — no re-encoding, cropping or colour
adjustment — because chart values, axes and labels are evidence. A hash change
means the upstream plot was regenerated and the interpretation on the site needs
re-checking against its report before the page is rebuilt.
