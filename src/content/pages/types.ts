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
 * be. The types below are that typed-constant shape.
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
 *
 * **Amendment (texture-and-page-quality, task 5):** the flat
 * `paragraphs: string[]` shape this file used to export rendered `/about`,
 * `/how-it-works` and `/privacy` as a title over an undifferentiated column
 * -- no heading, nothing to skim by, the weakest available form for a page
 * whose whole job is explaining how something works. `PageSection` below
 * replaces it: one section per topic, each carrying the mono
 * eyebrow-then-`FusedHeadline` pattern v2 already uses for every other
 * content band (`HubPage`, `ConverterPage`), composed by `ArticlePage` and
 * `LegalPage` rather than restated per route.
 *
 * `lead` and `cont` are never invented copy. Each pair is drawn from the
 * paragraph it introduces -- the paragraph's own opening clause split in
 * two, or (for the two formal legal documents) the section's pre-existing
 * heading paired with a short clause already present in its body -- and the
 * full paragraph stays intact, unabridged, in `paragraphs` right below the
 * headline it summarises. Nothing here asserts a fact the paragraph beneath
 * it does not already state.
 */

/** One section of running prose: an eyebrow-optional fused headline, then its paragraphs. */
export interface PageSection {
	/** Small mono label above the headline. Optional -- not every section needs one. */
	eyebrow?: string;
	/** The bold opening clause of the section's headline, fed to `FusedHeadline`. */
	lead: string;
	/** The muted continuation, fused onto the same line as `lead`. */
	cont: string;
	/** The section's full body text, one string per paragraph. */
	paragraphs: string[];
}

/**
 * A page whose body is a sequence of sections -- all five prose pages this
 * directory backs except `/legal/licences`, whose body is mostly *derived*
 * data (see `LicencesPageContent` below) rather than authored prose.
 *
 * `updated` is `ArticlePage`'s `dateline` or `LegalPage`'s `revised`,
 * whichever the route hands its content to; the two props name the same
 * fact (when this text last changed) for templates that use different words
 * for it, so one field here covers both call sites.
 */
export interface SectionedPageContent {
	title: string;
	updated: string;
	sections: PageSection[];
}
