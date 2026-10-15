/**
 * Production origin resolution and canonical URL construction.
 *
 * The production domain has not been chosen, and nothing here guesses one. When
 * `SITE_URL` is absent the site builds exactly as it did before this module
 * existed: no canonical link, no absolute Open Graph URL, no sitemap. Those are
 * *omitted* rather than fabricated, and the build prints what is missing so a
 * domain-less build cannot be mistaken for a configured one.
 *
 * `astro.config.mjs` is the single reader of the environment variable. Every
 * component reaches the resolved origin through `Astro.site`, so there is one
 * configuration path and no second source of truth to drift from it.
 */

/** Absent means "not configured yet"; invalid means "configured wrongly". */
export type SiteUrlResolution =
  | { status: 'absent' }
  | { status: 'invalid'; reason: string }
  | { status: 'valid'; url: URL; origin: string; loopback: boolean };

/**
 * Hosts for which plain `http` is tolerated, so canonicals can be exercised
 * locally without weakening the production rule. A public host over http is
 * always rejected: a canonical URL pointing at an insecure origin is worse than
 * no canonical at all, because it is actively wrong rather than merely absent.
 */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Validate a candidate origin.
 *
 * Deliberately strict — anything ambiguous is rejected rather than normalised,
 * because silently rewriting a malformed value produces metadata that looks
 * correct and is not.
 */
export function resolveSiteUrl(raw: string | undefined | null): SiteUrlResolution {
  const value = (raw ?? '').trim();
  if (!value) return { status: 'absent' };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { status: 'invalid', reason: `not an absolute URL: ${JSON.stringify(value)}` };
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { status: 'invalid', reason: `unsupported scheme ${url.protocol} — expected https` };
  }
  if (url.username || url.password) {
    return { status: 'invalid', reason: 'must not embed credentials' };
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    return {
      status: 'invalid',
      reason: `must be a bare origin with no path, query or fragment (got ${url.pathname}${url.search}${url.hash})`,
    };
  }

  const loopback = LOOPBACK_HOSTS.has(url.hostname);
  if (url.protocol === 'http:' && !loopback) {
    return { status: 'invalid', reason: 'must use https — plain http is allowed only for loopback hosts' };
  }

  return { status: 'valid', url, origin: url.origin, loopback };
}

/**
 * Trailing-slash policy for canonical URLs.
 *
 * Astro's `trailingSlash` is left at its default (`'ignore'`) and `build.format`
 * at `'directory'`, so the build emits `dist/research/index.html` and that route
 * answers on both `/research` and `/research/`. A canonical URL cannot express
 * that ambiguity — it has to name one form.
 *
 * This follows the emitted file layout: every route is a directory index, so the
 * canonical form carries the trailing slash. The production host must therefore
 * not redirect `/x/` to `/x`, or every canonical will point at a redirect. See
 * docs/deployment.md, which makes that a documented host requirement rather than
 * an assumption.
 *
 * Changing this is a deliberate act: set `TRAILING_SLASH` here *and* align
 * Astro's `trailingSlash` with it, or the canonicals and the served routes
 * disagree.
 */
export type TrailingSlashPolicy = 'always' | 'never';

export const TRAILING_SLASH: TrailingSlashPolicy = 'always';

/** Apply the trailing-slash policy to a pathname. `/` is always just `/`. */
export function canonicalPath(pathname: string, policy: TrailingSlashPolicy = TRAILING_SLASH): string {
  if (pathname === '/' || pathname === '') return '/';
  const stripped = pathname.replace(/\/+$/, '');
  return policy === 'never' ? stripped : `${stripped}/`;
}

/** Absolute canonical URL for a pathname, or null when no origin is configured. */
export function canonicalUrl(
  origin: string | URL | undefined | null,
  pathname: string,
  policy: TrailingSlashPolicy = TRAILING_SLASH,
): URL | null {
  if (!origin) return null;
  return new URL(canonicalPath(pathname, policy), origin);
}
