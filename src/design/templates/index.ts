/**
 * The only import surface a route may use.
 *
 * `route-purity.test.ts` requires every `src/app/**\/page.tsx` to import from
 * here, so this barrel is what makes the DRY rule checkable rather than
 * aspirational.
 */

export { ArticlePage } from "./ArticlePage";
export { ConverterPage } from "./ConverterPage";
export { EditorialPage } from "./EditorialPage";
export { HubPage } from "./HubPage";
