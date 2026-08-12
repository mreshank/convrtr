import type { Metadata } from "next";
import { ToolSearch } from "@/components/instrument/ToolSearch";
import { TOOLS } from "@/core/registry";
import { toToolRow } from "./toolRow";

const SITE = "https://convrtr.mreshank.com";

export function generateMetadata(): Metadata {
	const title = "All tools — convrtr";
	const description =
		"Every file conversion convrtr supports, searchable in one list. Every conversion runs in your browser — nothing is uploaded.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/tools` },
		openGraph: { title, description, url: `${SITE}/tools` },
	};
}

/**
 * Rows are derived from the live registry, not written by hand — every
 * tool another agent registers shows up here automatically, with no
 * change to this file.
 */
export default function ToolsIndexPage() {
	const rows = TOOLS.map(toToolRow);

	return (
		<main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-8">
			<div className="flex flex-col gap-2">
				<h1 className="text-[28px] tracking-[-0.02em]">All tools</h1>
				<p className="text-[14px]" style={{ color: "var(--text-muted)" }}>
					{rows.length} {rows.length === 1 ? "conversion" : "conversions"}, all
					running in your browser. Nothing is uploaded.
				</p>
			</div>
			<ToolSearch rows={rows} />
		</main>
	);
}
