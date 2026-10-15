import type { APIRoute } from 'astro';

/*
  robots.txt is generated rather than static so its policy can follow the build's
  configuration. A static file cannot tell a release build from a preview one, and
  guessing wrong in either direction is a real failure:

    origin configured    → allow crawling, and advertise the sitemap.
    origin not configured → disallow crawling.

  The second case is the important one. A build with no configured origin is, by
  definition, not the production site — it is a local or preview build — and
  letting crawlers index it would let a staging URL end up as the search result
  for the project. The failure is deliberately asymmetric: forgetting SITE_URL on
  a real release leaves the site unindexed (a visible, recoverable problem that
  the build also warns about at length), whereas the opposite mistake silently
  publishes a non-production site as the real one.

  `Disallow: /` is a request, not an access control: it does not make anything
  private and does not prevent a URL being fetched or linked. See
  docs/deployment.md.
*/

export const GET: APIRoute = ({ site }) => {
  const lines = site
    ? [
        'User-agent: *',
        'Allow: /',
        '',
        `Sitemap: ${new URL('/sitemap-index.xml', site).href}`,
      ]
    : [
        '# Built without SITE_URL, so this cannot be identified as the production',
        '# site. Crawling is disallowed so a local or preview build cannot be',
        '# indexed as the real thing.',
        '#',
        '# This is a crawler request, not access control, and does not make any URL',
        '# private. To produce a release build: SITE_URL=https://<domain> npm run build',
        'User-agent: *',
        'Disallow: /',
      ];

  return new Response(`${lines.join('\n')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
