import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolTable } from "@/app/tools/ToolTable";
import { toToolRow } from "@/app/tools/toolRow";
import { deriveFormatGroups } from "@/core/registry/groups";
import { HubPage } from "@/design/templates";
import { SITE } from "@/lib/site";

/**
 * One route per format the registry actually produces a non-empty group
 * for. Unlike `/[category]`, there is no fixed list to filter here --
 * `deriveFormatGroups` never returns an empty group in the first place, so
 * every group it yields already earns a page.
 */
export function generateStaticParams() {
	return deriveFormatGroups().map((group) => ({ format: group.format }));
}

// Fully static export, like `/[category]`: a format not returned above has
// no server to render it on demand, so it 404s rather than dynamically
// rendering something `generateStaticParams` never produced.
export const dynamicParams = false;

export async function generateMetadata({
	params,
}: {
	params: Promise<{ format: string }>;
}): Promise<Metadata> {
	const { format } = await params;
	const group = deriveFormatGroups().find((g) => g.format === format);
	if (!group) return {};

	const title = `${format.toUpperCase()} tools — convrtr`;
	const description = `${group.tools.length} ${
		group.tools.length === 1 ? "tool" : "tools"
	} that accept or produce ${format.toUpperCase()}, all running in your browser.`;
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/groups/format/${format}` },
		openGraph: {
			title,
			description,
			url: `${SITE}/groups/format/${format}`,
		},
	};
}

export default async function FormatGroupPage({
	params,
}: {
	params: Promise<{ format: string }>;
}) {
	const { format } = await params;
	const group = deriveFormatGroups().find((g) => g.format === format);
	if (!group) notFound();

	const rows = group.tools.map(toToolRow);

	return (
		<HubPage
			title={`${format.toUpperCase()} tools`}
			lede={`Every conversion that accepts or produces ${format.toUpperCase()}, all running in your browser.`}
			count={{
				value: rows.length,
				noun: rows.length === 1 ? "tool" : "tools",
			}}
		>
			<ToolTable rows={rows} caption={`${format.toUpperCase()} tools`} />
		</HubPage>
	);
}
