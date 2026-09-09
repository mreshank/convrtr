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

export default function PrivacyPolicyPage() {
	return (
		<LegalPage
			title={privacyPolicy.title}
			revised={privacyPolicy.updated}
			sections={privacyPolicy.sections}
		/>
	);
}
