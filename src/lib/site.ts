/**
 * The one place the site's origin is named. Every route's metadata,
 * `sitemap.ts` and `robots.ts` import this rather than declaring their own
 * copy -- there used to be sixteen literal copies, one per route file that
 * needed the origin for a canonical URL or an OpenGraph `url` field, all
 * agreeing only because nothing forced them to. `src/lib/__tests__/site.test.ts`
 * fails if a second declaration reappears anywhere else in the source tree.
 */
export const SITE = "https://convrtr.mreshank.com";
