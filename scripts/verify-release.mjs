#!/usr/bin/env node
/**
 * Verify a build in `dist/` before it is released.
 *
 *     node scripts/verify-release.mjs                    # detect the mode
 *     node scripts/verify-release.mjs --expect=domain-agnostic
 *     node scripts/verify-release.mjs --expect=configured --origin=https://example.invalid
 *
 * Exits 0 when every check passes, 1 otherwise, and prints what failed and why.
 *
 * Two build modes exist and they are both correct, so the checker has to know
 * which one it is looking at. A build with no `SITE_URL` *should* have no
 * canonical link; treating that as an error would make the domain-agnostic build
 * unverifiable and pressure someone into inventing an origin to make the check
 * pass. The mode is therefore detected from the output, and can be asserted
 * explicitly where the caller knows which one it produced.
 *
 * Expected routes are derived from the repository — the page templates and the
 * content collections — rather than listed here, so this cannot drift from the
 * routes that actually exist. Anything in `dist/` that is not derivable is
 * reported: that is how a draft or an in-progress page gets caught before it
 * ships.
 *
 * Deliberately dependency-free and browser-free. Browser verification lives in
 * scripts/webkit-check.py, which needs a GTK stack this script must not inherit.
 */

import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// arguments
// ---------------------------------------------------------------------------

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=');
    return [k, v];
  }),
);

// `resolve`, not `join`: --dist may be an absolute path outside the repository,
// and join would silently treat the leading slash as relative.
const DIST = resolve(ROOT, args.get('dist') ?? 'dist');
const EXPECT = args.get('expect') ?? 'auto';
const ORIGIN_ARG = args.get('origin') ?? null;

let DIST_REL = relative(ROOT, DIST) || 'dist';

const failures = [];
const notes = [];

function fail(message) {
  failures.push(message);
}

// ---------------------------------------------------------------------------
// expected routes, derived from the repository
// ---------------------------------------------------------------------------

/**
 * Derive every public route from the repository.
 *
 * Each collection directory under src/content that has both a category index
 * template and a detail template contributes a category route plus one route per
 * entry. Every step is checked for existence, so if the page structure is
 * reorganised this stops finding routes and the missing-route check fires rather
 * than the list quietly going stale.
 */
async function expectedRoutes() {
  const pages = join(ROOT, 'src', 'pages');
  const content = join(ROOT, 'src', 'content');
  const routes = new Set();

  if (existsSync(join(pages, 'index.astro'))) routes.add('/');
  if (existsSync(join(pages, 'research', 'index.astro'))) routes.add('/research/');

  const entries = await readdir(content, { withFileTypes: true });
  const collections = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  const hasCategoryTemplate = existsSync(join(pages, 'research', '[category]', 'index.astro'));

  for (const collection of collections) {
    if (hasCategoryTemplate) routes.add(`/research/${collection}/`);

    if (!existsSync(join(pages, 'research', collection, '[id].astro'))) continue;
    for (const file of await readdir(join(content, collection))) {
      if (!file.endsWith('.md')) continue;
      routes.add(`/research/${collection}/${file.replace(/\.md$/, '')}/`);
    }
  }

  return [...routes].sort();
}

/**
 * Every HTML route present in dist.
 *
 * Directory indexes are the shape this build emits, but a bare `.html` file is a
 * published URL too: anything dropped into `public/` is copied into the output
 * verbatim, and a host serves it directly. Collecting only `index.html` made
 * those invisible — in both modes — which is the one outcome the unexpected-route
 * check exists to prevent. A stray file is now reported like any other route.
 */
async function builtRoutes() {
  const routes = new Set();
  for (const file of await htmlFiles(DIST)) {
    const rel = relative(DIST, file);
    if (rel === 'index.html') {
      routes.add('/');
    } else if (rel.endsWith(`${sep}index.html`)) {
      routes.add(`/${rel.slice(0, -'index.html'.length).split(sep).join('/')}`);
    } else {
      routes.add(`/${rel.split(sep).join('/')}`);
    }
  }
  return [...routes].sort();
}

// ---------------------------------------------------------------------------
// html helpers
// ---------------------------------------------------------------------------

async function htmlFiles(dir = DIST, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await htmlFiles(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function meta(html, property) {
  const re = new RegExp(`<meta\\s+(?:property|name)="${property}"\\s+content="([^"]*)"`, 'i');
  return re.exec(html)?.[1] ?? null;
}

function canonicalOf(html) {
  return /<link\s+rel="canonical"\s+href="([^"]*)"/i.exec(html)?.[1] ?? null;
}

/**
 * Stand-in domains, as they appear in free text. Deliberately narrow: this is
 * applied to prose as well as URLs, and a research site quotes file names, so a
 * rule broad enough to catch every reserved TLD would flag a path like
 * `setup.test.ts`. Host-level checking of the build's own origin is done
 * separately, by `isNonProductionOrigin`.
 */
const RESERVED_PLACEHOLDER_DOMAIN =
  /\b(?:example\.(?:com|org|net|invalid)|your-?domain|foo\.test)\b/i;

/**
 * Hosts that can never serve the production site.
 *
 * RFC 6761 reserves `.test`, `.invalid`, `.example` and `localhost`, and IANA
 * reserves example.com/org/net for documentation, so none of them is a domain a
 * real release could be published on. Applied to a parsed hostname rather than to
 * text, which is why it can be this broad without producing false positives.
 */
const NON_PRODUCTION_HOST =
  /(?:^|\.)(?:test|invalid|example|localhost)$|(?:^|\.)example\.(?:com|org|net)$|^127\.0\.0\.1$|^\[?::1\]?$|(?:^|\.)your-?domain\./i;

function isNonProductionOrigin(origin) {
  try {
    return NON_PRODUCTION_HOST.test(new URL(origin).hostname);
  } catch {
    return false;
  }
}

/**
 * Local and placeholder paths that must never appear in published output.
 *
 * The reserved-domain check is the important one: it is what stops a synthetic
 * origin from being carried into a release. It is applied to the text with the
 * origin under test removed first, so verifying a release candidate with
 * `--origin=https://rc-test.example.invalid` proves the origin was used correctly
 * while still failing on any placeholder nobody asked for. A real release is
 * built without `--origin`, and then no reserved domain is exempt — including the
 * build's own, which `main()` rejects outright.
 */
const FORBIDDEN_PATTERNS = [
  ['file:// URL', /file:\/\//],
  // One backslash or two. The obvious `\\\\` in a regex literal means *two*
  // literal backslashes, so it silently missed the ordinary `C:\Users\…` form.
  ['absolute filesystem path', /(?:\/home\/|\/Users\/|[A-Z]:[\\/]{1,2}[Uu]sers)/],
  ['development server', /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?/],
  ['Astro dev port', /:4321\b/],
  ['reserved placeholder domain', RESERVED_PLACEHOLDER_DOMAIN],
  ['unfilled placeholder', /\b(?:TODO|FIXME|REPLACE_ME|CHANGEME)\b/],
];

// ---------------------------------------------------------------------------
// checks
// ---------------------------------------------------------------------------

async function checkRoutes() {
  const expected = await expectedRoutes();
  const built = await builtRoutes();

  for (const route of expected) {
    if (!built.includes(route)) fail(`route missing from the build: ${route}`);
  }
  for (const route of built) {
    if (!expected.includes(route)) {
      fail(
        `unexpected route in the build: ${route}\n` +
          `      If this is intentional, it needs a case in scripts/verify-release.mjs — ` +
          `otherwise it looks like a draft that reached the output.`,
      );
    }
  }
  notes.push(`routes: ${built.length} built, ${expected.length} expected`);
  return built;
}

async function checkInternalLinks(files) {
  let checked = 0;
  const bad = [];

  for (const file of files) {
    const html = await readFile(file, 'utf8');
    for (const [, href] of html.matchAll(/href="(\/[^"]*)"/g)) {
      const path = href.split('#')[0].split('?')[0];
      if (!path) continue;
      checked++;
      const target = join(DIST, path.replace(/^\//, ''));
      const ok =
        path === '/' || existsSync(target) || existsSync(join(target, 'index.html'));
      if (!ok) bad.push(`${relative(DIST, file)} → ${href}`);
    }
  }

  for (const b of bad.slice(0, 10)) fail(`internal link has no target: ${b}`);
  if (bad.length > 10) fail(`…and ${bad.length - 10} more unresolved internal links`);
  notes.push(`internal links: ${checked} checked, ${bad.length} unresolved`);
}

async function checkMetadata(files, mode, origin) {
  const html = await Promise.all(files.map(async (f) => [f, await readFile(f, 'utf8')]));
  const withCanonical = html.filter(([, h]) => canonicalOf(h));
  const withOgUrl = html.filter(([, h]) => meta(h, 'og:url'));

  if (mode === 'domain-agnostic') {
    if (withCanonical.length) {
      fail(
        `domain-agnostic build emits ${withCanonical.length} canonical link(s), ` +
          `starting with ${relative(DIST, withCanonical[0][0])} — an origin was configured after all`,
      );
    }
    if (withOgUrl.length) fail(`domain-agnostic build emits og:url on ${withOgUrl.length} page(s)`);
    if (html.some(([, h]) => meta(h, 'og:image'))) fail('domain-agnostic build emits og:image');
    notes.push('metadata: no canonical or absolute social URLs (expected in this mode)');
    return;
  }

  // configured mode
  const missing = html.filter(([, h]) => !canonicalOf(h)).map(([f]) => relative(DIST, f));
  for (const f of missing.slice(0, 5)) fail(`configured build has no canonical URL: ${f}`);

  for (const [file, h] of html) {
    const rel = relative(DIST, file);
    const canonical = canonicalOf(h);
    if (!canonical) continue;

    if (origin && !canonical.startsWith(origin)) {
      fail(`${rel}: canonical is not on the configured origin: ${canonical}`);
    }

    // A canonical must name a real route in this build.
    const path = new URL(canonical).pathname;
    const target = join(DIST, path.replace(/^\//, ''));
    if (!(path === '/' || existsSync(target) || existsSync(join(target, 'index.html')))) {
      fail(`${rel}: canonical points at a path with no page: ${canonical}`);
    }

    // No doubled segment, which is what an origin carrying a path produces.
    const originPath = origin ? new URL(origin).pathname : '/';
    if (originPath !== '/' && canonical.includes(`${originPath}${originPath.replace(/^\//, '')}`)) {
      fail(`${rel}: canonical repeats the origin path: ${canonical}`);
    }

    const url = new URL(canonical);
    if (url.search) fail(`${rel}: canonical carries a query string: ${canonical}`);
    if (url.hash) fail(`${rel}: canonical carries a fragment: ${canonical}`);

    const ogUrl = meta(h, 'og:url');
    if (ogUrl !== canonical) {
      fail(`${rel}: og:url (${ogUrl}) disagrees with canonical (${canonical})`);
    }

    const ogImage = meta(h, 'og:image');
    if (!ogImage) fail(`${rel}: configured build has no og:image`);
    else if (!/^https?:\/\//.test(ogImage)) fail(`${rel}: og:image is not absolute: ${ogImage}`);
  }

  const titles = html.map(([, h]) => /<title>(.*?)<\/title>/is.exec(h)?.[1]?.trim()).filter(Boolean);
  const descriptions = html
    .map(([, h]) => meta(h, 'description'))
    .filter(Boolean);
  if (new Set(titles).size !== titles.length) fail('two pages share a title');
  if (new Set(descriptions).size !== descriptions.length) fail('two pages share a description');

  notes.push(
    `metadata: ${withCanonical.length}/${html.length} pages with canonical; ` +
      `${new Set(titles).size} distinct titles, ${new Set(descriptions).size} distinct descriptions`,
  );
}

/**
 * Every text file a visitor downloads, so a placeholder cannot hide in an asset
 * the HTML scan never opens.
 *
 * The built stylesheet is included because a stray `url(https://example.com/…)`
 * is a runtime dependency on a third party, and an unfilled token in a CSS comment
 * would ship unexamined. The bundled JavaScript is deliberately NOT scanned: it is
 * mostly vendor code this repository does not author, and a development-host
 * literal inside a framework bundle would fail the check for no real reason.
 */
async function checkNoPlaceholders(files, origin) {
  const textLike = [...files];
  for (const extra of ['robots.txt', 'sitemap-0.xml', 'sitemap-index.xml']) {
    const p = join(DIST, extra);
    if (existsSync(p)) textLike.push(p);
  }
  const cssDir = join(DIST, '_astro');
  if (existsSync(cssDir)) {
    for (const entry of await readdir(cssDir)) {
      if (entry.endsWith('.css')) textLike.push(join(cssDir, entry));
    }
  }

  const hits = new Map();
  for (const file of textLike) {
    let text = await readFile(file, 'utf8');
    // Strip the origin the caller asserted before scanning, so the check is about
    // placeholders nobody asked for rather than the one under test.
    if (origin) text = text.split(origin).join('');
    for (const [label, pattern] of FORBIDDEN_PATTERNS) {
      if (pattern.test(text)) {
        if (!hits.has(label)) hits.set(label, []);
        hits.get(label).push(relative(DIST, file));
      }
    }
  }
  for (const [label, where] of hits) {
    fail(`${label} appears in ${where.length} file(s), e.g. ${where[0]}`);
  }
  if (!hits.size) {
    notes.push(
      origin
        ? `no placeholder or development URLs beyond the origin under test (${origin})`
        : 'no placeholder, filesystem or development URLs in the output',
    );
  }
}

async function checkSitemapAndRobots(mode, built, origin) {
  const robots = join(DIST, 'robots.txt');
  if (!existsSync(robots)) {
    fail('robots.txt is missing from the build');
    return;
  }
  const robotsText = await readFile(robots, 'utf8');

  const sitemaps = ['sitemap-index.xml', 'sitemap-0.xml']
    .map((f) => join(DIST, f))
    .filter((f) => existsSync(f));

  if (mode === 'domain-agnostic') {
    if (sitemaps.length) fail('domain-agnostic build emitted a sitemap');
    if (!/^Disallow:\s*\/\s*$/m.test(robotsText)) {
      fail('domain-agnostic build should disallow crawling (no SITE_URL was supplied)');
    }
    if (/^Sitemap:/m.test(robotsText)) fail('domain-agnostic robots.txt advertises a sitemap');
    notes.push('robots: disallows crawling (expected — no origin was configured)');
    return;
  }

  if (!sitemaps.length) fail('configured build emitted no sitemap');
  if (!/^Allow:\s*\/\s*$/m.test(robotsText)) fail('configured robots.txt does not allow crawling');
  if (!/^Sitemap:\s*https?:\/\/\S+/m.test(robotsText)) {
    fail('configured robots.txt has no absolute Sitemap: line');
  }
  if (/^Disallow:\s*\/\s*$/m.test(robotsText)) {
    fail('configured robots.txt still disallows everything');
  }

  /*
    Every absolute URL this build publishes has to sit on the one origin it was
    configured with. The canonical and og:url are checked in `checkMetadata`;
    these two are the same claim for the sitemap and the robots `Sitemap:` line,
    and were previously only checked for shape, not for which host they name.
  */
  const advertised = /^Sitemap:\s*(https?:\/\/\S+)/m.exec(robotsText)?.[1];
  if (advertised && origin && new URL(advertised).origin !== origin) {
    fail(`robots.txt advertises a sitemap on a different origin: ${advertised}`);
  }

  if (sitemaps.length) {
    const xml = await readFile(sitemaps.find((f) => f.endsWith('sitemap-0.xml')), 'utf8');
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    if (urls.length !== new Set(urls).size) fail('sitemap contains duplicate URLs');

    if (origin) {
      const foreign = urls.find((u) => new URL(u).origin !== origin);
      if (foreign) fail(`sitemap lists a URL on a different origin: ${foreign}`);
    }

    const listed = urls.map((u) => new URL(u).pathname);
    for (const path of listed) {
      const target = join(DIST, path.replace(/^\//, ''));
      if (!(path === '/' || existsSync(target) || existsSync(join(target, 'index.html')))) {
        fail(`sitemap lists a path with no page: ${path}`);
      }
    }
    // Every built route must be listed, and nothing else.
    for (const route of built) {
      if (!listed.includes(route)) fail(`sitemap is missing the route ${route}`);
    }
    for (const path of listed) {
      if (!built.includes(path)) fail(`sitemap lists ${path}, which is not a built route`);
    }
    notes.push(`sitemap: ${urls.length} entries, all matching built routes`);
  }

  notes.push('robots: allows crawling and advertises the sitemap');
}

async function checkAssets() {
  const required = [
    'favicon.svg',
    'og.png',
    'fonts/SOURCES.json',
    'figures/SOURCES.json',
  ];
  for (const rel of required) {
    if (!existsSync(join(DIST, rel))) fail(`required asset missing: ${rel}`);
  }

  // Every font the stylesheet asks for must exist in the build.
  const cssDir = existsSync(join(DIST, '_astro')) ? join(DIST, '_astro') : null;
  const cssFiles = cssDir ? (await readdir(cssDir)).filter((f) => f.endsWith('.css')) : [];
  const referenced = new Set();
  for (const f of cssFiles) {
    const css = await readFile(join(cssDir, f), 'utf8');
    for (const m of css.matchAll(/url\((["']?)(\/fonts\/[^"')]+)\1\)/g)) {
      referenced.add(m[2]);
    }
  }
  for (const url of referenced) {
    if (!existsSync(join(DIST, url.replace(/^\//, '')))) {
      fail(`stylesheet references a font that is not in the build: ${url}`);
    }
  }
  if (!referenced.size) fail('no @font-face URLs found in the built stylesheet — fonts may not be wired up');
  notes.push(`fonts: ${referenced.size} referenced by the stylesheet, all present`);

  // Licences ship with the binaries.
  const licDir = join(DIST, 'fonts', 'licenses');
  if (!existsSync(licDir)) {
    fail('font licence texts are missing from the build');
  } else {
    const licences = (await readdir(licDir)).filter((f) => f.endsWith('.txt'));
    if (licences.length < 4) fail(`expected at least 4 font licence texts, found ${licences.length}`);
    for (const f of licences) {
      const text = await readFile(join(licDir, f), 'utf8');
      if (!/SIL OPEN FONT LICENSE/i.test(text)) fail(`${f} contains no OFL notice`);
    }
    notes.push(`licences: ${licences.length} OFL texts present`);
  }

  const symbol = join(DIST, 'fonts', 're-symbols.woff2');
  if (!existsSync(symbol)) {
    fail('the mathematical symbol subset is missing — operators would fall back to a system font');
  }
}

async function checkFigureIntegrity() {
  const manifestPath = join(ROOT, 'public', 'figures', 'SOURCES.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

  for (const entry of manifest.figures ?? []) {
    const distFile = join(DIST, 'figures', entry.file);
    if (!existsSync(distFile)) {
      fail(`published figure missing from the build: ${entry.file}`);
      continue;
    }
    const buf = await readFile(distFile);
    const sha = createHash('sha256').update(buf).digest('hex');
    if (sha !== entry.sha256) fail(`figure hash mismatch for ${entry.file}`);
    if (buf.length !== entry.bytes) fail(`figure size mismatch for ${entry.file}`);
  }

  // Withheld figures must not reappear.
  const withheld = ['03_gate_distribution.png', 'experiment_g_prediction.png'];
  for (const name of withheld) {
    if (existsSync(join(DIST, 'figures', name))) fail(`withheld figure was published: ${name}`);
    if (existsSync(join(ROOT, 'public', 'figures', name))) {
      fail(`withheld figure is present in public/figures: ${name}`);
    }
  }
  notes.push(
    `figures: ${(manifest.figures ?? []).length} verified against manifest, ` +
      `${withheld.length} withheld and absent`,
  );
}

async function checkNoDevelopmentFiles() {
  const offenders = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.name === 'node_modules' || entry.name === '.astro') {
        offenders.push(relative(DIST, full));
        continue;
      }
      if (entry.isDirectory()) await walk(full);
      else if (/\.(map|md|ts|tsx)$/.test(entry.name)) offenders.push(relative(DIST, full));
    }
  }
  await walk(DIST);
  for (const o of offenders.slice(0, 8)) fail(`development file in the build output: ${o}`);
  if (offenders.length > 8) fail(`…and ${offenders.length - 8} more`);
  if (!offenders.length) notes.push('no development files in the output');
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  if (!existsSync(DIST)) {
    console.error(`No build at ${DIST_REL}. Run \`npm run build\` first.`);
    process.exit(2);
  }

  const files = await htmlFiles(DIST);
  if (!files.length) {
    console.error(`No HTML in ${DIST_REL}. Run \`npm run build\` first.`);
    process.exit(2);
  }

  // Detect the mode from the artefacts when the caller did not assert one.
  let mode = EXPECT;
  const sample = await readFile(files[0], 'utf8');
  const looksConfigured = Boolean(canonicalOf(sample));
  if (mode === 'auto') {
    mode = looksConfigured ? 'configured' : 'domain-agnostic';
    notes.push(`mode: detected ${mode} (override with --expect=…)`);
  } else if (mode === 'domain-agnostic' && looksConfigured) {
    fail('expected a domain-agnostic build, but the output contains canonical URLs');
  } else if (mode === 'configured' && !looksConfigured) {
    fail('expected a configured build, but the output contains no canonical URLs');
  }

  let origin = ORIGIN_ARG;
  if (!origin && mode === 'configured') {
    const canonical = canonicalOf(sample);
    if (canonical) origin = new URL(canonical).origin;
  }

  /*
    An origin the caller asserted with `--origin` is a test origin, and the
    placeholder scan exempts it by design. An origin merely *observed* in the
    output is not the same thing, and treating it as exempt removed the guard this
    file exists to provide: a build whose canonical, og:url, sitemap and robots
    line all sit consistently on a host that cannot be production — example.com,
    or anything under a reserved TLD — would verify clean, because the checker had
    quietly adopted it as "the origin under test". Nothing asserted it, so refuse.
  */
  if (!ORIGIN_ARG && origin && isNonProductionOrigin(origin)) {
    fail(
      `the build is published on a non-production origin: ${origin}\n` +
        `      Re-run with --origin=${origin} if this is a test-origin build, or rebuild ` +
        `with the real SITE_URL.`,
    );
  }

  console.log(`\n  verify-release: ${DIST_REL}  [${mode}${origin ? `, ${origin}` : ''}]\n`);

  const built = await checkRoutes();
  await checkInternalLinks(files);
  await checkMetadata(files, mode, origin);
  await checkNoPlaceholders(files, origin);
  await checkSitemapAndRobots(mode, built, origin);
  await checkAssets();
  await checkFigureIntegrity();
  await checkNoDevelopmentFiles();

  for (const note of notes) console.log(`  · ${note}`);

  if (failures.length) {
    console.error(`\n  FAILED — ${failures.length} problem(s):\n`);
    for (const f of failures) console.error(`    ✗ ${f}`);
    console.error('');
    process.exit(1);
  }

  console.log('\n  All release checks passed.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error(`\n  verify-release crashed: ${err.message}\n`);
  process.exit(2);
});
