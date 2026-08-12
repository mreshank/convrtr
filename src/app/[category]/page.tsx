import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolTable } from "@/app/tools/ToolTable";
import { toToolRow } from "@/app/tools/toolRow";
import { CATEGORIES, type Category, getToolsByCategory } from "@/core/registry";

const SITE = "https://convrtr.mreshank.com";

function isCategory(value: string): value is Category {
	return (CATEGORIES as readonly string[]).includes(value);
}

function label(category: Category): string {
	return `${category.charAt(0).toUpperCase()}${category.slice(1)}`;
}

/**
 * Only categories that currently hold at least one registered tool get a
 * page. An empty hub would be a thin doorway page with nothing on it —
 * search engines discount those and visitors bounce. As other agents
 * register tools in the remaining categories, this list — and the set of
 * generated pages — grows on its own; nothing here is hand-maintained.
 */
export function generateStaticParams() {
	return CATEGORIES.filter(
		(category) => getToolsByCategory(category).length > 0,
	).map((category) => ({ category }));
}

// This is a fully static export: a category not returned above has no
// server to render it on demand, so it must 404 rather than fall through
// to a dynamic render that can never happen.
export const dynamicParams = false;

export async function generateMetadata({
	params,
}: {
	params: Promise<{ category: string }>;
}): Promise<Metadata> {
	const { category } = await params;
	if (!isCategory(category)) return {};
	const tools = getToolsByCategory(category);
	if (tools.length === 0) return {};

	const title = `${label(category)} tools — convrtr`;
	const description = `${tools.length} ${
		tools.length === 1 ? "tool" : "tools"
	} for converting ${category} files, running entirely in your browser.`;
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/${category}` },
		openGraph: { title, description, url: `${SITE}/${category}` },
	};
}

export default async function CategoryPage({
	params,
}: {
	params: Promise<{ category: string }>;
}) {
	const { category } = await params;
	if (!isCategory(category)) notFound();

	const tools = getToolsByCategory(category);
	if (tools.length === 0) notFound();

	const rows = tools.map(toToolRow);

	return (
		<main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-8">
			<div className="flex flex-col gap-2">
				<h1 className="text-[28px] tracking-[-0.02em]">{label(category)}</h1>
				<p className="text-[14px]" style={{ color: "var(--text-muted)" }}>
					{tools.length} {tools.length === 1 ? "tool" : "tools"} for converting{" "}
					{category} files, all running in your browser.
				</p>
			</div>
			<ToolTable rows={rows} caption={`${label(category)} tools`} />
		</main>
	);
}
