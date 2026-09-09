import type { SectionedPageContent } from "./types";

/**
 * No invented legal text: every clause below is either mechanically true
 * of this codebase (cited inline) or, where a real terms document needs a
 * jurisdiction, an entity or a contact this project has not settled,
 * marked plainly as a placeholder rather than filled with something
 * plausible-sounding.
 *
 * `lead` is each section's pre-existing heading, unchanged. `cont` is a
 * short clause already present, verbatim or near-verbatim, in that same
 * section's own `paragraphs` below it — never a new claim. No `eyebrow`:
 * the heading already names the topic, and a mono label above it would
 * relabel the same word twice.
 */
export const terms: SectionedPageContent = {
	title: "Terms",
	updated: "9 September 2026",
	sections: [
		{
			lead: "Acceptance",
			cont: "You agree to these terms.",
			paragraphs: [
				`By using convrtr, you agree to these terms. If you don't
				agree, don't use it.`,
			],
		},
		{
			lead: "The Service",
			cont: "Converts files entirely within your own browser.",
			paragraphs: [
				`convrtr converts files between formats entirely within your
				own browser, using open-source WebAssembly engines listed at
				/legal/licences. No file you process is uploaded, stored, or
				transmitted by the Service — see /privacy and
				/legal/privacy-policy for how that is enforced and checked.`,
			],
		},
		{
			lead: "No Warranty",
			cont: `Provided "as is", without warranty.`,
			paragraphs: [
				`The Service is provided "as is", without warranty of any
				kind, express or implied, including without limitation warranties
				of merchantability, fitness for a particular purpose, or
				non-infringement. Conversion is not guaranteed to be lossless,
				complete, or error-free for every file or format.`,
			],
		},
		{
			lead: "Limitation of Liability",
			cont: "Keep your own copies of files.",
			paragraphs: [
				`To the fullest extent permitted by law, the maintainers of
				convrtr are not liable for damages arising from use of, or
				inability to use, the Service, including loss of data. Keep your
				own copies of files before and after converting them.`,
			],
		},
		{
			lead: "Your Files, Your Responsibility",
			cont: "You are solely responsible.",
			paragraphs: [
				`You are solely responsible for the files you choose to
				convert and for having the right to convert them. The Service
				performs no review of file content, because it never sees the
				content of your files at all — the same architecture the privacy
				pages describe.`,
			],
		},
		{
			lead: "Open Source",
			cont: "Governed by the AGPL-3.0.",
			paragraphs: [
				`The source code of convrtr is licensed under the GNU Affero
				General Public License v3.0 — see LICENSE in the repository. These
				Terms govern your use of the hosted Service; the AGPL-3.0 governs
				your rights to the underlying source code, and the two are not the
				same document.`,
			],
		},
		{
			lead: "Changes",
			cont: "These Terms may change.",
			paragraphs: [
				`These Terms may change as the Service changes. The revision
				date above reflects the last change.`,
			],
		},
		{
			lead: "Governing Law and Contact",
			cont: "PLACEHOLDER.",
			paragraphs: [
				`PLACEHOLDER — pending the project owner's input. A terms
				document conventionally names a governing jurisdiction and a
				contact address. Neither is filled in here: inventing one would
				misstate who is legally responsible for this Service. Until this
				section is completed, use the GitHub issue tracker linked in this
				site's footer.`,
			],
		},
	],
};
