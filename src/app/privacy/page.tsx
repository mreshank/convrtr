import type { Metadata } from "next";
import { privacy } from "@/content/pages/privacy";
import { LegalPage } from "@/design/templates";
import { SITE } from "@/lib/site";

export function generateMetadata(): Metadata {
	const title = "Privacy — convrtr";
	const description =
		"convrtr transmits no file you convert. What that claim rests on, and the test that checks it.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/privacy` },
		openGraph: { title, description, url: `${SITE}/privacy` },
	};
}

function clean(text: string) {
	return text.replace(/\s+/g, " ").trim();
}

export default function PrivacyPage() {
	return (
		<LegalPage title={privacy.title} revised={privacy.updated}>
			<div className="flex flex-col gap-4">
				{privacy.paragraphs.map((paragraph, index) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: static, never reordered
					<p key={index}>{clean(paragraph)}</p>
				))}
			</div>
		</LegalPage>
	);
}
