import type { Metadata } from "next";
import { LegalPage } from "@/design/templates";
import { SITE } from "@/lib/site";

const REVISED = "9 September 2026";

/**
 * No invented legal text: every clause below is either mechanically true
 * of this codebase (cited inline) or, where a real terms document needs a
 * jurisdiction, an entity or a contact this project has not settled,
 * marked plainly as a placeholder rather than filled with something
 * plausible-sounding.
 */
const SECTIONS: { heading: string; body: string }[] = [
	{
		heading: "Acceptance",
		body: `By using convrtr, you agree to these terms. If you don't
		agree, don't use it.`,
	},
	{
		heading: "The Service",
		body: `convrtr converts files between formats entirely within your
		own browser, using open-source WebAssembly engines listed at
		/legal/licences. No file you process is uploaded, stored, or
		transmitted by the Service — see /privacy and
		/legal/privacy-policy for how that is enforced and checked.`,
	},
	{
		heading: "No Warranty",
		body: `The Service is provided "as is", without warranty of any
		kind, express or implied, including without limitation warranties
		of merchantability, fitness for a particular purpose, or
		non-infringement. Conversion is not guaranteed to be lossless,
		complete, or error-free for every file or format.`,
	},
	{
		heading: "Limitation of Liability",
		body: `To the fullest extent permitted by law, the maintainers of
		convrtr are not liable for damages arising from use of, or
		inability to use, the Service, including loss of data. Keep your
		own copies of files before and after converting them.`,
	},
	{
		heading: "Your Files, Your Responsibility",
		body: `You are solely responsible for the files you choose to
		convert and for having the right to convert them. The Service
		performs no review of file content, because it never sees the
		content of your files at all — the same architecture the privacy
		pages describe.`,
	},
	{
		heading: "Open Source",
		body: `The source code of convrtr is licensed under the GNU Affero
		General Public License v3.0 — see LICENSE in the repository. These
		Terms govern your use of the hosted Service; the AGPL-3.0 governs
		your rights to the underlying source code, and the two are not the
		same document.`,
	},
	{
		heading: "Changes",
		body: `These Terms may change as the Service changes. The revision
		date above reflects the last change.`,
	},
	{
		heading: "Governing Law and Contact",
		body: `PLACEHOLDER — pending the project owner's input. A terms
		document conventionally names a governing jurisdiction and a
		contact address. Neither is filled in here: inventing one would
		misstate who is legally responsible for this Service. Until this
		section is completed, use the GitHub issue tracker linked in this
		site's footer.`,
	},
];

export function generateMetadata(): Metadata {
	const title = "Terms — convrtr";
	const description = "The terms of service for convrtr.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/legal/terms` },
		openGraph: { title, description, url: `${SITE}/legal/terms` },
	};
}

function clean(text: string) {
	return text.replace(/\s+/g, " ").trim();
}

export default function TermsPage() {
	return (
		<LegalPage title="Terms" revised={REVISED}>
			<div className="flex flex-col gap-6">
				{SECTIONS.map((section) => (
					<section key={section.heading} className="flex flex-col gap-2">
						<h2 className="meta">{section.heading}</h2>
						<p>{clean(section.body)}</p>
					</section>
				))}
			</div>
		</LegalPage>
	);
}
