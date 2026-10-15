#!/usr/bin/env node
/**
 * Fetch and self-host the site's webfonts.
 *
 * Why this script exists rather than a CDN <link>:
 *   - the site must not depend on an external font service at runtime;
 *   - the exact bytes served have to be reproducible and auditable;
 *   - the licence of every file has to be checkable at the source.
 *
 * What it does:
 *   1. Asks the Google Fonts CSS API (which serves the upstream, unmodified
 *      OFL-licensed binaries) for each family, as WOFF2.
 *   2. Keeps only the `latin` and `latin-ext` subsets.
 *   3. Writes the files to public/fonts/ and emits src/styles/fonts.css with
 *      the @font-face rules, rewritten to local paths and with `font-display`
 *      left at `swap`.
 *   4. Writes public/fonts/SOURCES.json recording every upstream URL, so the
 *      provenance of each binary is checkable after the fact.
 *
 * Every family below is licensed under the SIL Open Font License 1.1, which
 * permits redistribution and embedding. See docs/typography.md for the licence
 * references and the rationale for the selected pairing.
 *
 * Usage:  node scripts/fetch-fonts.mjs [--out <dir>] [--all]
 *         (--all fetches every candidate; the default fetches the selected set)
 */

import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Chrome UA is required: the CSS API serves woff2 only to modern browsers. */
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36';

/**
 * Candidate families. `axis` is the variable-font axis range where the family
 * is variable, or a list of static weights where it is not.
 */
const FAMILIES = [
  // --- Pairing A: grotesque display + serif reading -----------------------
  {
    id: 'archivo',
    family: 'Archivo',
    role: 'display-candidate',
    variable: 'wght@400..700',
  },
  {
    id: 'source-serif-4',
    family: 'Source Serif 4',
    role: 'reading-candidate',
    variable: 'wght@400..600',
  },
  // --- Pairing B: mono-influenced display + neutral reading ---------------
  {
    id: 'space-grotesk',
    family: 'Space Grotesk',
    role: 'display-candidate',
    variable: 'wght@400..700',
  },
  {
    id: 'inter',
    family: 'Inter',
    role: 'reading-candidate',
    variable: 'wght@400..600',
  },
  // --- Monospace ----------------------------------------------------------
  {
    id: 'jetbrains-mono',
    family: 'JetBrains Mono',
    role: 'mono-candidate',
    variable: 'wght@400..600',
  },
  {
    id: 'ibm-plex-mono',
    family: 'IBM Plex Mono',
    role: 'mono-candidate',
    // IBM Plex Mono is static on Google Fonts.
    variable: null,
    staticWeights: [400, 500],
  },
];

/**
 * The families kept in the repository. Chosen from the candidates above by
 * rendering both pairings in a specimen built from real page content; see
 * docs/typography.md for the comparison and the reasoning.
 *
 * Pass --all to fetch every candidate for a fresh comparison.
 */
const SELECTED = new Set(['archivo', 'source-serif-4', 'jetbrains-mono']);

const args = process.argv.slice(2);
const fetchAll = args.includes('--all');
const outFlag = args.indexOf('--out');
const publicDir = outFlag !== -1 ? args[outFlag + 1] : join(ROOT, 'public');
const fontDir = join(publicDir, 'fonts');
const cssOut = join(ROOT, 'src', 'styles', 'fonts.css');

/**
 * Subsets kept. `greek` is included because the research material sets Greek
 * symbols (gamma, kappa, rho) throughout; operators and arrows are NOT covered
 * by any subset and come from the separate symbol fallback built by
 * scripts/build-symbol-font.mjs.
 */
const SUBSETS = new Set(['latin', 'latin-ext', 'greek']);

function cssUrl(family, variable, weights) {
  const spec = variable ? `${family.replace(/ /g, '+')}:${variable}` : `${family.replace(/ /g, '+')}:wght@${weights.join(';')}`;
  return `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
}

/** Splits a Google Fonts stylesheet into fully described @font-face records. */
function parseFaces(css) {
  const faces = [];
  const blockRe = /\/\*\s*([a-z0-9-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;
  let m;
  while ((m = blockRe.exec(css)) !== null) {
    const subset = m[1];
    const body = m[2];
    const url = /url\((https:[^)]+\.woff2)\)/.exec(body)?.[1];
    const weight = /font-weight:\s*([^;]+);/.exec(body)?.[1]?.trim();
    const family = /font-family:\s*'([^']+)'/.exec(body)?.[1];
    const range = /unicode-range:\s*([^;]+);/.exec(body)?.[1]?.trim();
    if (url && family && range) faces.push({ subset, url, weight, family, range });
  }
  return faces;
}

async function fetchFamily(spec) {
  const specs = spec.variable ? [spec.variable] : [null];
  const collected = [];

  for (const variable of specs) {
    const url = cssUrl(spec.family, variable, spec.staticWeights ?? []);
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`${spec.family}: CSS request failed (${res.status})`);
    const css = await res.text();
    const faces = parseFaces(css);
    if (!faces.length) throw new Error(`${spec.family}: no @font-face blocks parsed`);

    for (const face of faces) {
      if (!SUBSETS.has(face.subset)) continue;
      collected.push({ ...face, source: url });
    }
  }

  const written = [];
  await mkdir(fontDir, { recursive: true });

  for (const face of collected) {
    const weightTag = (face.weight ?? '400').replace(/\s+/g, '_');
    const name = `${spec.id}-${face.subset}-${weightTag}.woff2`;
    const res = await fetch(face.url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`${name}: download failed (${res.status})`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(join(fontDir, name), buf);
    written.push({
      file: name,
      bytes: buf.length,
      subset: face.subset,
      weight: face.weight,
      family: face.family,
      // Carried through so the generated @font-face blocks keep the upstream
      // unicode-range subsetting rather than silently declaring every block as
      // covering the whole range.
      range: face.range,
      upstream: face.url,
      cssSource: face.source,
    });
  }

  return { spec, written };
}

function faceRule(entry) {
  return `@font-face {
  font-family: '${entry.family}';
  font-style: normal;
  font-weight: ${entry.weight};
  font-display: swap;
  src: url('/fonts/${entry.file}') format('woff2');
  unicode-range: ${entry.range};
}`;
}

async function main() {
  const targets = fetchAll ? FAMILIES : FAMILIES.filter((f) => SELECTED.has(f.id));
  if (!targets.length) {
    console.error('No families selected. Pass --all to fetch every candidate.');
    process.exit(1);
  }

  /*
    Remove only the files this script previously wrote, recorded in the manifest.
    Blanket-deleting the directory would also remove re-symbols.woff2, which is
    built by scripts/build-symbol-font.mjs and is not this script's to manage —
    and without the symbol fallback the site's maths glyphs (the Hadamard
    operator, the arrows) silently fall through to a system font.
  */
  try {
    const previous = JSON.parse(await readFile(join(fontDir, 'SOURCES.json'), 'utf8'));
    for (const entry of previous.families ?? []) {
      await rm(join(fontDir, entry.file), { force: true });
    }
  } catch {
    /* no previous run */
  }

  await mkdir(fontDir, { recursive: true });

  const manifest = [];
  const rules = [];

  for (const spec of targets) {
    process.stdout.write(`fetching ${spec.family} ... `);
    const { written } = await fetchFamily(spec);
    process.stdout.write(`${written.length} files\n`);

    for (const entry of written) {
      manifest.push({ ...entry, id: spec.id, role: spec.role });
      rules.push(faceRule(entry));
    }
  }

  const header = `/* ---------------------------------------------------------------------------
   Self-hosted webfonts — GENERATED FILE, DO NOT EDIT BY HAND.
   Regenerate with: node scripts/fetch-fonts.mjs --all
   Provenance and licence: see docs/typography.md and public/fonts/SOURCES.json
   --------------------------------------------------------------------------- */

`;

  await writeFile(cssOut, header + rules.join('\n\n') + '\n');
  await writeFile(
    join(fontDir, 'SOURCES.json'),
    JSON.stringify(
      {
        note: 'Upstream URLs for every self-hosted font binary. All families are licensed under the SIL Open Font License 1.1 (https://openfontlicense.org). Fetched via the Google Fonts CSS API, which serves the unmodified upstream binaries.',
        generated: new Date().toISOString().slice(0, 10),
        families: manifest.map(({ file, family, id, role, subset, weight, bytes, upstream }) => ({
          file,
          family,
          id,
          role,
          subset,
          weight,
          bytes,
          upstream,
        })),
      },
      null,
      2,
    ) + '\n',
  );

  console.log(`\nwrote ${rules.length} @font-face rules to src/styles/fonts.css`);
  console.log(`wrote ${manifest.length} files to ${fontDir}`);
}

main().catch((err) => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});
