# Typography

The selected pairing, the evidence behind it, and how to change it.

## Selection

| Slot | Family | Role | Source | Licence |
| --- | --- | --- | --- | --- |
| `--font-display` | **Archivo** | Headlines, wordmark, section numbering | [Google Fonts](https://fonts.google.com/specimen/Archivo) · [upstream repo](https://github.com/google/fonts/tree/main/ofl/archivo) | SIL OFL 1.1 |
| `--font-reading` | **Source Serif 4** | Long-form research prose | [Google Fonts](https://fonts.google.com/specimen/Source+Serif+4) · [upstream repo](https://github.com/google/fonts/tree/main/ofl/sourceserif4) | SIL OFL 1.1 |
| `--font-mono` | **JetBrains Mono** | Technical labels, metrics, identifiers, formulas | [Google Fonts](https://fonts.google.com/specimen/JetBrains+Mono) · [upstream repo](https://github.com/google/fonts/tree/main/ofl/jetbrainsmono) | SIL OFL 1.1 |
| symbol fallback | **Noto Sans Math** (subset) | Operators and arrows the text faces lack | [upstream repo](https://github.com/google/fonts/tree/main/ofl/notosansmath) | SIL OFL 1.1 |

The SIL Open Font License 1.1 permits commercial use, modification and
redistribution, including web embedding. Every family above is fetched from the
Google Fonts CSS API, which serves the **unmodified upstream binaries**; no
third-party subsetting or re-encoding is applied to them.

The symbol subset's licence is not taken on trust: `scripts/build-symbol-font.mjs`
reads the OFL notice out of the font's own name table and aborts if it is absent.

Both scripts verify their own output. `fetch-fonts.mjs` records every upstream
URL in `public/fonts/SOURCES.json`; `build-symbol-font.mjs` asserts all 15
requested codepoints survive subsetting *and* that the encoded WOFF2 round-trips
back through `woff2_decompress` intact.

## How the decision was made

Two complete pairings were built as candidates and rendered in a specimen page
containing real site content: the wordmark, the headline at its maximum size,
research prose, small tracked labels, long filenames, metric figures, and the
update-rule formula.

| | Display | Reading | Mono |
| --- | --- | --- | --- |
| **A — selected** | Archivo | Source Serif 4 | JetBrains Mono |
| B — rejected | Space Grotesk | Inter | IBM Plex Mono |

Pairing A was chosen on the following evidence, in order of weight:

1. **Display/reading contrast.** The brief asks for strong typographic contrast
   and a site that does not read as a generic landing page. A grotesque display
   face over a serif reading face produces three genuinely distinct textures
   across the page. Pairing B sets display and reading in two sans faces, which
   reads as one flat texture — and Inter is the default face of the software
   category the brief explicitly rules out.
2. **Long-form legibility.** The research pages carry sustained prose, quotations
   and limitation statements. A serif with a large x-height is the better reading
   face for that at 16–18px.
3. **Greek coverage in the mono slot.** The research material sets Greek
   (`γ`, `κ`, `ρ`, `α`, `Δ`) throughout. JetBrains Mono ships a Greek subset;
   IBM Plex Mono does not, and its formulas would have fallen back mid-expression.
4. **Restraint at scale.** Archivo holds at 104px without drawing attention to
   itself. Space Grotesk's more idiosyncratic letterforms competed with the
   content and would date faster.

Rejected alternatives and why: Inter as a reading face (generic, no contrast),
Space Grotesk as display (competes with content), IBM Plex Mono (no Greek),
Archivo/Space Grotesk as reading faces (grotesques are weaker at sustained
prose), and every system-stack fallback (no character, no contrast).

### What did not work, and why it matters

Two problems surfaced only by measurement, and both changed the implementation.

**The text faces do not carry the notation.** The `latin`, `latin-ext` and
`greek` subsets of all six candidates were measured. None of them contains
`⊙` (U+2299), `→` (U+2192), `←` (U+2190), `≈`, `≥`, `≤` or `∈`. Archivo's
*latin* subset additionally lacks `·` (U+00B7) even though its declared
`unicode-range` covers it — the range describes what the subsetter was asked
for, not what the binary contains. Relying on the declared ranges alone would
have shipped a formula whose operator silently rendered in a random system font.

Two responses:

- The site's formulas no longer depend on Unicode subscript characters
  (`U+209C`, `U+208B`, `U+2081`). All three were missing everywhere, and they
  are poor practice anyway. Formulas are now stored as tokens in
  `src/content/home.ts` and rendered as real `<sub>` markup by
  `src/components/ui/Formula.astro`.
- The remaining operators are supplied by a **1.9 kB symbol subset** appended to
  all three font stacks. Browsers consult it only for codepoints the primary
  families cannot render.

**`document.fonts.check()` is not a coverage test.** It returned `true` for
glyphs that are provably absent, because it considers the whole font stack
rather than the named family. Coverage was measured instead by comparing the
rendered advance width of each glyph in the candidate family against a
deliberately non-existent family: identical widths mean the glyph came from a
fallback. Any future coverage claim should use that method, not `check()`.

## Implementation

Fonts are self-hosted from `public/fonts/`; nothing is fetched from a third
party at runtime. `src/styles/fonts.css` is generated and holds the `@font-face`
rules with upstream `unicode-range` subsetting preserved. The symbol face is
declared in `global.css` because it belongs to the token system rather than to
the fetched family set.

```bash
node scripts/fetch-fonts.mjs          # selected families
node scripts/fetch-fonts.mjs --all    # every candidate, for a fresh comparison
node scripts/build-symbol-font.mjs    # the operator subset
```

`build-symbol-font.mjs` needs `pyftsubset` (fonttools) and `woff2_compress` on
PATH. It converts from the upstream source rather than checking in an opaque
binary, and discards its intermediates.

### Swapping a face

1. Add the family to `FAMILIES` in `scripts/fetch-fonts.mjs`, add its id to
   `SELECTED`, and run the script. Confirm the licence before doing so.
2. Repoint the slot in `@theme` in `src/styles/global.css`.

Nothing else changes — no component names a font family directly.

### Fallbacks and loading

Every stack ends in `'RE Symbols'` and then a system stack, so the page sets
correctly even if no webfont arrives.

`font-display: swap` is used throughout, so the page never blocks on a delayed
download. The measured cumulative layout shift from the swap is **CLS 0.0055**
on the homepage at 1440×900 (Chromium, no cache), well inside the 0.1 threshold,
so metric-matched fallback faces are not needed. Re-measure with a
`layout-shift` PerformanceObserver before assuming that still holds after a
change to the display scale or the prose line-height.

## Known constraint

The display face has no Greek subset, so Greek set in `--font-display` falls
through to `RE Symbols` or the system stack. Today Greek appears only in
technical and prose contexts, which use the mono and reading slots. If a future
headline needs Greek, either set it in the mono slot or revisit the display face.
