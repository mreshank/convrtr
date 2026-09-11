import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolTable } from "@/app/tools/ToolTable";
import { toToolRow } from "@/app/tools/toolRow";
import { JsonLd } from "@/components/seo/JsonLd";
import { deriveTaskGroups } from "@/core/registry/groups";
import { HubPage } from "@/design/templates";
import { buildTaskGroupJsonLd } from "@/lib/jsonld";
import { SITE } from "@/lib/site";

function label(kind: string): string {
	return `${kind.charAt(0).toUpperCase()}${kind.slice(1)}`;
}

/**
 * One route per kind the registry actually produces a non-empty group for.
 * `inspect` is declared in `ToolSchema` but no tool uses it, so
 * `deriveTaskGroups` never returns it and no route is generated for it --
 * there is no empty-group filter needed here, the same as
 * `/groups/format/[format]`.
 */
export function generateStaticParams() {
	return deriveTaskGroups().map((group) => ({ kind: group.kind }));
}

// Fully static export, like `/[category]`: a kind not returned above has no
// server to render it on demand, so it 404s rather than dynamically
// rendering something `generateStaticParams` never produced.
export const dynamicParams = false;

export async function generateMetadata({
	params,
}: {
	params: Promise<{ kind: string }>;
}): Promise<Metadata> {
	const { kind } = await params;
	const group = deriveTaskGroups().find((g) => g.kind === kind);
	if (!group) return {};

	const title = `${label(kind)} tools — convrtr`;
	const description = `${group.tools.length} ${
		group.tools.length === 1 ? "tool" : "tools"
	} that ${kind} a file, all running in your browser.`;
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/groups/task/${kind}` },
		openGraph: { title, description, url: `${SITE}/groups/task/${kind}` },
	};
}

export default async function TaskGroupPage({
	params,
}: {
	params: Promise<{ kind: string }>;
}) {
	const { kind } = await params;
	const group = deriveTaskGroups().find((g) => g.kind === kind);
	if (!group) notFound();

	const rows = group.tools.map(toToolRow);

	return (
		<>
			<JsonLd
				schema={buildTaskGroupJsonLd(
					kind,
					group.tools,
					`${SITE}/groups/task/${kind}`,
				)}
			/>
			<HubPage
				title={`${label(kind)} tools`}
				lede={`Every tool that can ${kind} a file, all running in your browser.`}
				count={{
					value: rows.length,
					noun: rows.length === 1 ? "tool" : "tools",
				}}
			>
				<ToolTable rows={rows} caption={`${label(kind)} tools`} />
			</HubPage>
		</>
	);
}
