/**
 * Marketing and legal page bodies -- spec §7.4's `src/content/pages/`.
 *
 * **Ruling (I3, whole-branch review of the routes-and-content plan):** spec
 * §7.4 asks for MDX bodies here, reusing the blog pipeline (`meta.ts` shape,
 * the MDX components already registered in `src/mdx-components.tsx`). None
 * of the six routes this directory now backs (`/about`, `/how-it-works`,
 * `/privacy`, `/legal/privacy-policy`, `/legal/terms`, `/legal/licences`)
 * ever did that -- every one hardcoded a `PARAGRAPHS`/`SECTIONS` string
 * array directly inside its `page.tsx`, and this directory did not exist.
 * Nobody recorded that as a decision; it was just how the routes were
 * written, in a project whose whole discipline is that a deviation from the
 * spec gets ruled on, not left implicit.
 *
 * MDX was considered and declined. What MDX buys is rich formatting (embedded
 * components, nested lists, tables) and the ability to edit copy without
 * touching component code. Neither applies here: these six pages are short,
 * denser-than-editorial prose with no rich formatting need (a run of
 * paragraphs, or heading+body sections at most), and typed TypeScript
 * constants keep them checked by `tsc` the way a `.mdx` file's prose cannot
 * be. The types below (`ParagraphsPageContent`, `SectionsPageContent`) are
 * that typed-constant shape.
 *
 * What MDX would not have fixed, and typed constants alone do not either,
 * is *where* the prose lives. Every other content type in this codebase --
 * blog posts (`src/content/blog/`), collectives (`src/content/collectives/`),
 * samples (`src/content/samples/`) -- keeps its data under `src/content/**`,
 * one module boundary away from the route that resolves and renders it.
 * Prose sitting inside `page.tsx` was the one exception, and it is what let
 * the spec deviation go unnoticed for as long as it did -- a route file
 * mixing data and rendering looks unremarkable next to another route file
 * doing the same thing, whereas a route importing content from
 * `@/content/pages/*` makes the boundary visible the same way it already is
 * everywhere else. So: typed constants, not MDX, but moved out of the route
 * files into this directory, same as every sibling content type.
 */

/** One heading-and-body section, for the two formal legal documents. */
export interface ProseSection {
	heading: string;
	body: string;
}

/**
 * A page whose body is a flat run of paragraphs -- `/about`,
 * `/how-it-works`, `/privacy`. `updated` is `ArticlePage`'s `dateline` or
 * `LegalPage`'s `revised`, whichever the route hands its content to; the two
 * props name the same fact (when this text last changed) for templates that
 * use different words for it, so one field here covers both call sites.
 */
export interface ParagraphsPageContent {
	title: string;
	updated: string;
	paragraphs: string[];
}

/**
 * A page whose body is heading+body sections -- the two formal legal
 * documents, `/legal/privacy-policy` and `/legal/terms`.
 */
export interface SectionsPageContent {
	title: string;
	updated: string;
	sections: ProseSection[];
}
