import type { Metadata } from "next";
import { privacyPolicy } from "@/content/pages/privacy-policy";
import { LegalPage } from "@/design/templates";
import { SITE } from "@/lib/site";

export function generateMetadata(): Metadata {
	const title = "Privacy Policy — convrtr";
	const description = "The formal privacy policy for convrtr.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/legal/privacy-policy` },
		openGraph: { title, description, url: `${SITE}/legal/privacy-policy` },
	};
}

function clean(text: string) {
	return text.replace(/\s+/g, " ").trim();
}

export default function PrivacyPolicyPage() {
	return (
		<LegalPage title={privacyPolicy.title} revised={privacyPolicy.updated}>
			<div className="flex flex-col gap-6">
				{privacyPolicy.sections.map((section) => (
					<section key={section.heading} className="flex flex-col gap-2">
						<h2 className="meta">{section.heading}</h2>
						<p>{clean(section.body)}</p>
					</section>
				))}
			</div>
		</LegalPage>
	);
}
