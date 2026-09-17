import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { feedback } from "@/content/pages/feedback";
import { ArticlePage } from "@/design/templates";
import { buildWebPageJsonLd } from "@/lib/jsonld";
import { SITE } from "@/lib/site";
import { FeedbackClient } from "./FeedbackClient";

export function generateMetadata(): Metadata {
	const title = "Feedback — convrtr";
	const description =
		"Provide user feedback, rate your conversion experience, suggest new format engines, or report issues to the convrtr project.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/feedback` },
		openGraph: { title, description, url: `${SITE}/feedback` },
	};
}

export default function FeedbackPage() {
	return (
		<>
			<JsonLd
				schema={buildWebPageJsonLd({
					title: "Feedback — convrtr",
					description:
						"Provide user feedback, rate your conversion experience, suggest new format engines, or report issues to the convrtr project.",
					url: `${SITE}/feedback`,
					breadcrumbs: [{ name: "Feedback", url: `${SITE}/feedback` }],
					type: "ContactPage",
				})}
			/>
			<div className="flex flex-col">
				<ArticlePage
					breadcrumbs={[{ name: "Home", href: "/" }, { name: "Feedback" }]}
					title={feedback.title}
					dateline={feedback.updated}
					sections={feedback.sections}
				/>
				<div className="px-4 pb-16">
					<FeedbackClient />
				</div>
			</div>
		</>
	);
}
