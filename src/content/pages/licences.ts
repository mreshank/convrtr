/**
 * Unlike the other five pages in this directory, `/legal/licences`'s body
 * is mostly *derived* data (`getLicenceReport()`, read live from each
 * engine's own installed `package.json`), not authored prose -- so there is
 * no `paragraphs`/`sections` array to move here. The one piece of static
 * copy is the lede above that list, and it carries an inline `<code>`
 * element the route renders directly, so it is split either side of that
 * element rather than flattened into a single string that would lose it.
 */
export type LicencesPageContent = {
	title: string;
	updated: string;
	/** Text before the inline `<code>package.json</code>` the route renders. */
	introBefore: string;
	/** Text after it, starting with the em dash that follows the code span. */
	introAfter: string;
};

// Single-line strings, not the multi-line wrapped template literals the
// other five pages in this directory use: those rely on the route running
// `clean()` over each one to collapse the wrapping whitespace, but this
// route renders these two halves straight into JSX text nodes either side
// of an inline `<code>` element, so introducing `clean()` here would be a
// second mechanism doing the same job for one file alone.
export const licences: LicencesPageContent = {
	title: "Licences",
	updated: "9 September 2026",
	introBefore:
		"convrtr runs every conversion locally using the open-source engines below. This list is generated from each engine's own installed",
	introAfter:
		"— version and licence read live, not typed by hand — and, for the engines that ship WebAssembly, a scan of the files each one actually installs. A version bump cannot make this page stale.",
};
