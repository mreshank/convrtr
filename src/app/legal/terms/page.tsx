import type { Metadata } from "next";
import { terms } from "@/content/pages/terms";
import { LegalPage } from "@/design/templates";
import { SITE } from "@/lib/site";

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
		<LegalPage title={terms.title} revised={terms.updated}>
			<div className="flex flex-col gap-6">
				{terms.sections.map((section) => (
					<section key={section.heading} className="flex flex-col gap-2">
						<h2 className="meta">{section.heading}</h2>
						<p>{clean(section.body)}</p>
					</section>
				))}
			</div>
		</LegalPage>
	);
}
