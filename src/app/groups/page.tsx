import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { CATEGORIES, type Category, type Tool } from "@/core/registry";
import {
	deriveFormatGroups,
	deriveTaskGroups,
	deriveTypeGroups,
	type FormatGroup,
	type TaskGroup,
	type TypeGroup,
} from "@/core/registry/groups";
import { HubPage } from "@/design/templates";
import { buildGroupsIndexJsonLd } from "@/lib/jsonld";
import { SITE } from "@/lib/site";

function label(text: string): string {
	return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function categoriesSpanned(tools: Tool[]): Category[] {
	const present = new Set(tools.map((tool) => tool.category));
	return CATEGORIES.filter((category) => present.has(category));
}

function formatsCovered(tools: Tool[]): string[] {
	const set = new Set<string>();
	for (const tool of tools) {
		for (const ext of tool.accept.ext) set.add(ext.toUpperCase());
		set.add(tool.output.ext.toUpperCase());
	}
	return [...set].sort();
}

function toolCount(tools: Tool[]): string {
	return `${tools.length} ${tools.length === 1 ? "tool" : "tools"}`;
}

function toolItems(tools: Tool[]) {
	return tools.map((tool) => ({
		href: `/${tool.id}`,
		title: tool.seo.title,
		kind: tool.kind,
		category: tool.category,
		acceptExt: tool.accept.ext,
		outputExt: tool.output.ext,
	}));
}

function toTypeItem(group: TypeGroup) {
	return {
		href: `/${group.category}`,
		title: group.label,
		meta: toolCount(group.tools),
		description: formatsCovered(group.tools).join(", "),
		tools: toolItems(group.tools),
	};
}

function toFormatItem(group: FormatGroup) {
	return {
		href: `/groups/format/${group.format}`,
		title: group.format.toUpperCase(),
		meta: toolCount(group.tools),
		description: categoriesSpanned(group.tools).join(", "),
		tools: toolItems(group.tools),
	};
}

function toTaskItem(group: TaskGroup) {
	return {
		href: `/groups/task/${group.kind}`,
		title: label(group.kind),
		meta: toolCount(group.tools),
		description: categoriesSpanned(group.tools).join(", "),
		tools: toolItems(group.tools),
	};
}

export function generateMetadata(): Metadata {
	const title = "Browse by type, format, or task — convrtr";
	const description =
		"Every conversion convrtr supports, grouped by file type, by format, and by what it does to a file.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/groups` },
		openGraph: { title, description, url: `${SITE}/groups` },
	};
}

export default function GroupsIndexPage() {
	const typeGroups = deriveTypeGroups();
	const formatGroups = deriveFormatGroups();
	const taskGroups = deriveTaskGroups();

	return (
		<>
			<JsonLd schema={buildGroupsIndexJsonLd(`${SITE}/groups`)} />
			<HubPage
				title="Browse by type, format, or task"
				lede="Every conversion, grouped three ways: by file type, by format, and by what it does."
				count={{
					value: typeGroups.length + formatGroups.length + taskGroups.length,
					noun: "groups",
				}}
				grid={[
					{ heading: "BY TYPE", items: typeGroups.map(toTypeItem) },
					{ heading: "BY FORMAT", items: formatGroups.map(toFormatItem) },
					{ heading: "BY TASK", items: taskGroups.map(toTaskItem) },
				]}
			/>
		</>
	);
}
