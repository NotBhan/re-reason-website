// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import { resolveSiteUrl, TRAILING_SLASH } from './src/lib/site-url.ts';

/*
  Production origin.

  The domain has not been chosen, so it is supplied through the environment and
  never guessed. This is the only place the variable is read: components take the
  resolved origin from `Astro.site`, so there is no second path to drift from it.

    SITE_URL=https://<domain> npm run build

  Absent  — a warning, and no `site` set. The build stays domain-agnostic: no
            canonical, no absolute Open Graph URL, no sitemap. Nothing is faked.
  Invalid — the build fails. A malformed origin would otherwise produce metadata
            that looks right and is not, and that is worse than no metadata.
*/
const site = resolveSiteUrl(process.env.SITE_URL);

if (site.status === 'invalid') {
  throw new Error(
    `SITE_URL is set but unusable: ${site.reason}\n` +
      `Expected a bare origin such as https://example.org — no path, query or fragment.`,
  );
}

if (site.status === 'absent') {
  console.warn(
    '\n  SITE_URL is not set — building domain-agnostic.\n' +
      '  Omitted: <link rel="canonical">, absolute Open Graph URLs, sitemap.xml.\n' +
      '  robots.txt will disallow crawling, so an unconfigured build cannot be indexed by mistake.\n' +
      '  Set SITE_URL=https://<domain> for a release build. See docs/deployment.md.\n',
  );
} else if (site.loopback) {
  console.warn(`\n  SITE_URL is a loopback origin (${site.origin}) — for local verification only.\n`);
} else {
  console.log(`\n  SITE_URL = ${site.origin}  (trailingSlash policy: ${TRAILING_SLASH})\n`);
}

// https://astro.build/config
export default defineConfig({
  // Static-first: the site ships as pre-rendered HTML. Interactive pieces are
  // opted into client-side JavaScript individually with Astro client directives.
  integrations: [
    react(),
    /*
      Added only when an origin is known. @astrojs/sitemap requires `site`, and
      emitting a sitemap full of relative or invented URLs would be worse than
      emitting none — the file exists to tell crawlers canonical absolute
      locations.
    */
    ...(site.status === 'valid' ? [sitemap()] : []),
  ],

  // Undefined when SITE_URL is absent, which is what lets every layout omit
  // absolute URLs rather than invent them.
  site: site.status === 'valid' ? site.origin : undefined,

  vite: {
    // Tailwind CSS v4 is wired in through the official Vite plugin. The
    // stylesheet itself is imported once, from `src/styles/global.css`.
    plugins: [tailwindcss()],
  },
});
