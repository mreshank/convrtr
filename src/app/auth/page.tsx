import type { Metadata } from "next";
import { AuthClient } from "@/components/auth/AuthClient";
import { ConverterPage } from "@/design/templates";
import { SITE } from "@/lib/site";

export function generateMetadata(): Metadata {
	const title = "Account & Authentication — convrtr";
	const description =
		"Optional account sign-in with Google or Email. Unlock 30-day cross-device conversion history, saved presets, and high-concurrency batch processing.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/auth` },
		openGraph: {
			title,
			description,
			url: `${SITE}/auth`,
		},
	};
}

export default function AuthPage() {
	return (
		<ConverterPage
			eyebrow="AUTHENTICATION // OPTIONAL WORKSPACE SESSION"
			title="Sign In or Create Account"
			lede="Sign in with Google Quick One Tap or Email to synchronize your conversion audit history across devices, save custom quality presets, and run high-volume batches."
		>
			<AuthClient />
		</ConverterPage>
	);
}
