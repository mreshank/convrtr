import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { thankYou } from "@/content/pages/thank-you";
import { ArticlePage } from "@/design/templates";
import { buildWebPageJsonLd } from "@/lib/jsonld";
import { SITE } from "@/lib/site";

export function generateMetadata(): Metadata {
	const title = "Thank You — convrtr";
	const description =
		"Thank you for submitting feedback and contributing to convrtr development.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/thank-you` },
		openGraph: { title, description, url: `${SITE}/thank-you` },
	};
}

function ThankYouActions() {
	return (
		<div className="max-w-2xl mx-auto w-full px-4 pb-16">
			<div
				className="border p-6 flex flex-col sm:flex-row items-center justify-between gap-4"
				style={{
					background: "var(--surface)",
					borderColor: "var(--rule)",
				}}
			>
				<div className="flex flex-col">
					<span
						className="mono text-[10px] tracking-wider uppercase"
						style={{ color: "var(--ink-muted)" }}
					>
						STATUS
					</span>
					<span
						className="mono text-sm font-bold uppercase"
						style={{ color: "var(--accent)" }}
					>
						RESPONSE RECORDED
					</span>
				</div>
				<div className="flex flex-wrap gap-2 w-full sm:w-auto">
					<Link
						href="/convert"
						className="mono text-xs font-bold py-2 px-4 border text-center transition-colors cursor-pointer"
						style={{
							background: "var(--ink)",
							color: "var(--surface)",
							borderColor: "var(--ink)",
						}}
					>
						START CONVERTING ➔
					</Link>
					<Link
						href="/tools"
						className="mono text-xs py-2 px-3 border text-center transition-colors cursor-pointer"
						style={{
							color: "var(--ink)",
							borderColor: "var(--rule)",
						}}
					>
						ALL 200 TOOLS ➔
					</Link>
				</div>
			</div>
		</div>
	);
}

export default function ThankYouPage() {
	return (
		<>
			<JsonLd
				schema={buildWebPageJsonLd({
					title: "Thank You — convrtr",
					description:
						"Thank you for submitting feedback and contributing to convrtr development.",
					url: `${SITE}/thank-you`,
					breadcrumbs: [{ name: "Thank You", url: `${SITE}/thank-you` }],
					type: "WebPage",
				})}
			/>
			<div className="flex flex-col">
				<ArticlePage
					title={thankYou.title}
					dateline={thankYou.updated}
					sections={thankYou.sections}
				/>
				<ThankYouActions />
			</div>
		</>
	);
}
