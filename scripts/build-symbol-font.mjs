#!/usr/bin/env node
/**
 * Build the site's symbol fallback font.
 *
 * The site sets notation that the text webfonts do not carry: the Hadamard
 * product operator, arrows, and a few comparison operators. Every candidate
 * family was measured, and their `latin` / `latin-ext` / `greek` subsets omit
 * these codepoints, which would leave the browser to substitute an arbitrary
 * system font mid-formula.
 *
 * Rather than accept that, this script subsets the operators we actually need
 * out of **Noto Sans Math** (SIL Open Font License 1.1, checked from the font's
 * own name table) and emits a two-kilobyte WOFF2 that sits at the end of every
 * font stack. Browsers consult it only for glyphs the primary families lack, so
 * it is a fallback, never a substitute for the text faces.
 *
 * Requires `pyftsubset` (fonttools) and `woff2_compress` on PATH, so the
 * conversion is reproducible from the upstream source rather than checked in
 * as an opaque binary. The intermediate TTF is discarded.
 *
 * Usage: node scripts/build-symbol-font.mjs
 */

import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Upstream source. OFL 1.1; the licence string is verified below. */
const SOURCE = {
  family: 'Noto Sans Math',
  url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/notosansmath/NotoSansMath-Regular.ttf',
  licenseUrl: 'https://raw.githubusercontent.com/google/fonts/main/ofl/notosansmath/OFL.txt',
  licenseFile: 'noto-sans-math-OFL.txt',
  licence: 'SIL Open Font License 1.1',
  repo: 'https://github.com/google/fonts/tree/main/ofl/notosansmath',
};

/**
 * Operators and symbols the site sets. Kept deliberately small: the file is a
 * fallback for gaps in the text faces, not a general symbol library.
 */
const CODEPOINTS = [
  0x00b7, // ·  middle dot            (Archivo lacks it in its latin subset)
  0x2032, // ′  prime
  0x2190, // ←  leftwards arrow
  0x2191, // ↑  upwards arrow
  0x2192, // →  rightwards arrow
  0x2193, // ↓  downwards arrow
  0x2205, // ∅  empty set
  0x2208, // ∈  element of
  0x2211, // ∑  n-ary summation
  0x221a, // √  square root
  0x2248, // ≈  almost equal to
  0x2260, // ≠  not equal to
  0x2264, // ≤  less-than or equal
  0x2265, // ≥  greater-than or equal
  0x2299, // ⊙  circled dot operator
];

const name = 're-symbols.woff2';
const outFile = join(ROOT, 'public', 'fonts', name);

function have(tool) {
  try {
    execFileSync('which', [tool], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  for (const tool of ['pyftsubset', 'woff2_compress']) {
    if (!have(tool)) {
      console.error(`Missing required tool: ${tool}`);
      console.error('Install fonttools and the woff2 utilities, then retry.');
      process.exit(1);
    }
  }

  const work = await mkdtemp(join(tmpdir(), 're-symbols-'));

  try {
    process.stdout.write(`downloading ${SOURCE.family} ... `);
    const res = await fetch(SOURCE.url);
    if (!res.ok) throw new Error(`download failed (${res.status})`);
    const ttf = join(work, 'source.ttf');
    await writeFile(ttf, Buffer.from(await res.arrayBuffer()));
    console.log('ok');

    // Verify the licence claim from the font itself rather than trusting the
    // repository path: the name table carries the OFL notice for OFL fonts.
    const licence = execFileSync(
      'python3',
      [
        '-c',
        [
          'from fontTools.ttLib import TTFont',
          `f = TTFont(${JSON.stringify(ttf)})`,
          "print(f['name'].getDebugName(13) or '')",
        ].join('\n'),
      ],
      { encoding: 'utf8' },
    );
    if (!/SIL Open Font License/i.test(licence)) {
      throw new Error(
        `licence check failed: expected an SIL OFL notice in the name table, got: ${licence.slice(0, 120)}`,
      );
    }
    console.log(`licence verified: ${SOURCE.licence}`);

    const subsetTtf = join(work, 'subset.ttf');
    execFileSync(
      'pyftsubset',
      [
        ttf,
        `--unicodes=${CODEPOINTS.map((c) => `U+${c.toString(16).toUpperCase()}`).join(',')}`,
        `--output-file=${subsetTtf}`,
        '--no-hinting',
        '--desubroutinize',
        '--drop-tables+=DSIG',
        '--layout-features=',
      ],
      { stdio: 'pipe' },
    );

    // Confirm every requested codepoint survived subsetting, before encoding.
    // woff2 is verified below by round-tripping it back through woff2_decompress
    // when that tool is available, since fontTools cannot read woff2 without
    // the optional brotli module.
    const verify = (file) =>
      execFileSync(
        'python3',
        [
          '-c',
          [
            'from fontTools.ttLib import TTFont',
            `f = TTFont(${JSON.stringify(file)})`,
            'cmap = f.getBestCmap()',
            `need = ${JSON.stringify(CODEPOINTS)}`,
            "missing = [hex(c) for c in need if c not in cmap]",
            "print('MISSING:' + ','.join(missing) if missing else 'ALL_PRESENT')",
          ].join('\n'),
        ],
        { encoding: 'utf8' },
      ).trim();

    const check = verify(subsetTtf);
    if (check !== 'ALL_PRESENT') {
      throw new Error(`subset is incomplete: ${check}`);
    }

    execFileSync('woff2_compress', [subsetTtf], { stdio: 'pipe' });
    // woff2_compress replaces the extension rather than appending to it.
    const produced = subsetTtf.replace(/\.ttf$/, '.woff2');
    const bytes = await readFile(produced);
    await writeFile(outFile, bytes);

    // Round-trip the encoded file so the checked-in binary is known-readable.
    // woff2_decompress writes alongside its input, replacing the extension, so
    // the encoded file is copied to a scratch name first.
    if (have('woff2_decompress')) {
      const scratch = join(work, 'roundtrip.woff2');
      await writeFile(scratch, bytes);
      execFileSync('woff2_decompress', [scratch], { stdio: 'pipe' });
      const decodedCheck = verify(join(work, 'roundtrip.ttf'));
      if (decodedCheck !== 'ALL_PRESENT') {
        throw new Error(`woff2 round-trip lost glyphs: ${decodedCheck}`);
      }
      console.log('woff2 round-trip verified');
    }

    console.log(
      `wrote public/fonts/${name} — ${bytes.length} bytes, ${CODEPOINTS.length}/${CODEPOINTS.length} codepoints present`,
    );

    /*
      Ship the licence with the binary.

      Subsetting is modification, and the SIL OFL requires the copyright notice
      and licence text to accompany the Font Software in any form it is
      redistributed — modified or not.
    */
    const licenseDir = join(ROOT, 'public', 'fonts', 'licenses');
    await mkdir(licenseDir, { recursive: true });
    const licenseRes = await fetch(SOURCE.licenseUrl);
    if (!licenseRes.ok) {
      throw new Error(`licence text unavailable (${licenseRes.status}) from ${SOURCE.licenseUrl}`);
    }
    const licenseText = await licenseRes.text();
    if (!/SIL OPEN FONT LICENSE/i.test(licenseText)) {
      throw new Error(`${SOURCE.licenseUrl} does not contain an OFL notice`);
    }
    await writeFile(join(licenseDir, SOURCE.licenseFile), licenseText);
    console.log(`wrote public/fonts/licenses/${SOURCE.licenseFile}`);
    console.log(`source: ${SOURCE.repo}`);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});
