import type { Metadata } from "next";
import { ToolSearch } from "@/components/instrument/ToolSearch";
import { TOOLS } from "@/core/registry";
import { HubPage } from "@/design/templates";
import { SITE } from "@/lib/site";
import { toToolRow } from "./toolRow";

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
		<HubPage
			title="All tools"
			lede="Every conversion runs in your browser — nothing is uploaded."
			count={{
				value: rows.length,
				noun: rows.length === 1 ? "conversion" : "conversions",
			}}
		>
			<ToolSearch rows={rows} />
		</HubPage>
	);
}
