import type { Metadata } from "next";
import { ArticlePage } from "@/design/templates";
import { SITE } from "@/lib/site";
import { IssuesRedirectClient } from "./IssuesRedirectClient";

const GITHUB_ISSUES_URL = "https://github.com/mreshank/convrtr/issues";

export function generateMetadata(): Metadata {
	const title = "Issues — convrtr";
	const description =
		"Redirecting to the official convrtr issue tracker on GitHub.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/issues` },
		openGraph: { title, description, url: `${SITE}/issues` },
		other: {
			refresh: `0; url=${GITHUB_ISSUES_URL}`,
		},
	};
}

export default function IssuesPage() {
	return (
		<ArticlePage
			title="Issues"
			dateline="Redirecting to GitHub"
		>
			<IssuesRedirectClient />
		</ArticlePage>
	);
}
