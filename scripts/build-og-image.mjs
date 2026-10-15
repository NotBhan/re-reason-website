#!/usr/bin/env node
/**
 * Render the social preview card to public/og.png.
 *
 *     node scripts/build-og-image.mjs
 *
 * Run by hand, like the font and figure tooling — the output is committed, so a
 * build never needs a browser.
 *
 * Why this way: the card is drawn from real HTML and the site's own self-hosted
 * Archivo, Source Serif 4 and JetBrains Mono, rendered by the Chromium that is
 * already on the machine. That keeps the wordmark, the palette and the type
 * genuinely the site's, and avoids adding an image-processing dependency for one
 * 1200x630 asset. Screenshotting a real page was the alternative and was
 * rejected: it would bake in whatever the layout happened to be that day.
 *
 * The capture is driven over the DevTools protocol rather than `--screenshot`,
 * because `--screenshot` fires on the load event — which can precede webfont
 * application, and would silently produce a card set in a fallback face.
 */

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'og.png');
const WIDTH = 1200;
const HEIGHT = 630;

/** Mirrors src/lib/site.ts. Checked against the real file below. */
const EYEBROW = 'Experimental research framework';
const DESCRIPTION =
  'RE:REASON is an experimental research framework testing whether a compact, weight-tied recurrent core can solve multi-step algorithmic problems more efficiently than compute-matched baselines.';

const MIME = {
  '.woff2': 'font/woff2',
  '.html': 'text/html; charset=utf-8',
  '.png': 'image/png',
};

function card() {
  const cells = Array.from({ length: 10 }, (_, i) => {
    const filled = i === 6 || i === 7;
    return `<span class="cell${filled ? ' on' : ''}"></span>`;
  }).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  /* font-display: block — a swap period here would render the fallback face. */
  @font-face { font-family: 'Archivo'; font-weight: 400 700;
    src: url('/fonts/archivo-latin-400_700.woff2') format('woff2'); font-display: block; }
  @font-face { font-family: 'Source Serif 4'; font-weight: 400 600;
    src: url('/fonts/source-serif-4-latin-400_600.woff2') format('woff2'); font-display: block; }
  @font-face { font-family: 'JetBrains Mono'; font-weight: 400 600;
    src: url('/fonts/jetbrains-mono-latin-400_600.woff2') format('woff2'); font-display: block; }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; }
  body {
    background: #090a0c; color: #f5f3ee;
    padding: 68px 76px 72px;
    display: flex; flex-direction: column; justify-content: space-between;
    -webkit-font-smoothing: antialiased;
  }
  .label {
    font-family: 'JetBrains Mono'; font-size: 15px; font-weight: 500;
    letter-spacing: 0.16em; text-transform: uppercase; color: #9a9a94;
  }
  header { display: flex; align-items: center; justify-content: space-between; }
  .cells { display: flex; gap: 7px; }
  .cell { width: 13px; height: 13px; background: #1f2126; }
  .cell.on { background: #ff6938; }
  .wordmark {
    font-family: 'Archivo'; font-weight: 700; font-size: 148px;
    line-height: 0.92; letter-spacing: -0.035em; color: #f5f3ee;
  }
  .rule { width: 132px; height: 3px; background: #ff6938; margin-top: 30px; }
  .lede {
    font-family: 'Source Serif 4'; font-weight: 400; font-size: 25px;
    line-height: 1.5; color: #9a9a94; max-width: 940px;
  }
</style>
</head>
<body>
  <header>
    <span class="label">${EYEBROW}</span>
    <div class="cells">${cells}</div>
  </header>
  <div>
    <div class="wordmark">RE:REASON</div>
    <div class="rule"></div>
  </div>
  <p class="lede">${DESCRIPTION}</p>
</body>
</html>`;
}

/**
 * Fail loudly if the card's copy has drifted from the site's own.
 *
 * These two strings are the site's, not this script's: the framing sentence lives
 * in src/lib/site.ts and the eyebrow in src/content/home.ts. A social card that
 * quietly keeps advertising wording the site has since changed is exactly the
 * kind of drift nobody notices.
 */
async function assertCopyMatchesSite() {
  const normalise = (s) => s.replace(/\s+/g, ' ').trim();
  const sources = [
    ['description', 'src/lib/site.ts', DESCRIPTION],
    ['eyebrow', 'src/content/home.ts', EYEBROW],
  ];
  for (const [name, relPath, value] of sources) {
    const flat = normalise(await readFile(join(ROOT, relPath), 'utf8'));
    if (!flat.includes(normalise(value))) {
      throw new Error(
        `this script's ${name} no longer matches ${relPath}.\n` +
          `Update EYEBROW/DESCRIPTION in scripts/build-og-image.mjs to match, so the card ` +
          `cannot carry copy the site has since changed.`,
      );
    }
  }
}

function pngSize(buf) {
  // IHDR is the first chunk: 8-byte signature, 4-byte length, 'IHDR', then W/H.
  if (buf.length < 24 || buf.readUInt32BE(12) !== 0x49484452) throw new Error('not a PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

async function rpcFactory(socket) {
  let id = 0;
  return (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      const onMessage = (ev) => {
        const m = JSON.parse(ev.data);
        if (m.id !== mid) return;
        socket.removeEventListener('message', onMessage);
        m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result);
      };
      socket.addEventListener('message', onMessage);
      socket.send(JSON.stringify({ id: mid, method, params }));
    });
}

async function main() {
  await assertCopyMatchesSite();

  const html = card();

  // Serve the card and the real font files over http. file:// is avoided because
  // Chromium restricts webfont loading from it.
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
    try {
      if (path === '/og.html') {
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        res.end(html);
        return;
      }
      if (path.startsWith('/fonts/')) {
        const file = join(ROOT, 'public', path);
        const body = await readFile(file);
        res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
        res.end(body);
        return;
      }
      res.writeHead(404).end();
    } catch {
      res.writeHead(404).end();
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  const profile = await mkdtemp(join(tmpdir(), 'og-profile-'));
  const chromium = spawn(
    'chromium',
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--no-sandbox',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );

  const cleanup = async () => {
    chromium.kill('SIGTERM');
    server.close();
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  };

  try {
    // --remote-debugging-port=0 writes the chosen port here once it is listening.
    const activePortFile = join(profile, 'DevToolsActivePort');
    let devtoolsPort = null;
    for (let i = 0; i < 100 && !devtoolsPort; i++) {
      await new Promise((r) => setTimeout(r, 100));
      if (existsSync(activePortFile)) {
        const [line] = (await readFile(activePortFile, 'utf8')).split('\n');
        if (line && Number(line)) devtoolsPort = Number(line);
      }
    }
    if (!devtoolsPort) throw new Error('Chromium did not open a debugging port');

    const list = await (await fetch(`http://127.0.0.1:${devtoolsPort}/json/list`)).json();
    const target = list.find((t) => t.type === 'page');
    if (!target) throw new Error('no page target available');

    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    const rpc = await rpcFactory(socket);

    await rpc('Emulation.setDeviceMetricsOverride', {
      width: WIDTH,
      height: HEIGHT,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await rpc('Page.navigate', { url: `http://127.0.0.1:${port}/og.html` });

    // Wait for the fonts, then for a paint. Without the first wait the capture
    // can land on the fallback face.
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const res = await rpc('Runtime.evaluate', {
        expression: `(document.fonts ? document.fonts.status : 'loading') === 'loaded' && document.querySelector('.wordmark') !== null`,
        returnByValue: true,
      });
      if (res.result.value === true) break;
    }
    await new Promise((r) => setTimeout(r, 400));

    const shot = await rpc('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT, scale: 1 },
      captureBeyondViewport: false,
    });

    const buf = Buffer.from(shot.data, 'base64');
    const size = pngSize(buf);
    if (size.width !== WIDTH || size.height !== HEIGHT) {
      throw new Error(`expected ${WIDTH}x${HEIGHT}, rendered ${size.width}x${size.height}`);
    }

    await writeFile(OUT, buf);
    console.log(`wrote public/og.png — ${size.width}x${size.height}, ${buf.length} bytes`);
    socket.close();
  } finally {
    await cleanup();
  }
}

main().catch((err) => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});
