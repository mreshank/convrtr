import type { Metadata } from "next";
import { CATEGORIES, type Category, type Tool } from "@/core/registry";
import { deriveFormatGroups, deriveTaskGroups } from "@/core/registry/groups";
import { HubPage } from "@/design/templates";
import { SITE } from "@/lib/site";

function label(text: string): string {
	return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

/**
 * The distinct categories a group's tools touch, in `CATEGORIES`' declared
 * order rather than `Set` iteration order -- so "image, video" reads the
 * same regardless of which tool in the group happens to be registered
 * first, the same stability reason `toolsByCategory` sorts by the declared
 * list rather than by count.
 */
function categoriesSpanned(tools: Tool[]): Category[] {
	const present = new Set(tools.map((tool) => tool.category));
	return CATEGORIES.filter((category) => present.has(category));
}

/** "1 tool" / "12 tools" -- v2's data-readout voice, singular-aware. */
function toolCount(tools: Tool[]): string {
	return `${tools.length} ${tools.length === 1 ? "tool" : "tools"}`;
}

export function generateMetadata(): Metadata {
	const title = "Browse by format or task — convrtr";
	const description =
		"Every conversion convrtr supports, grouped by file format and by what it does to a file.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/groups` },
		openGraph: { title, description, url: `${SITE}/groups` },
	};
}

/**
 * Both dimensions are derived from the live registry -- see
 * `src/core/registry/groups.ts` -- so a link here can never point at a
 * route the export didn't actually produce: `deriveFormatGroups` and
 * `deriveTaskGroups` already drop any group with no tools, and a tool
 * registered elsewhere shows up under its formats and its kind with no
 * change to this file.
 *
 * Each row's `meta` and `description` are both derived from the same
 * `group.tools` the link itself points at -- a tool count and the
 * categories that count spans, never a hand-written figure. That is what
 * turns "PNG" into an answer to "what's in there" before the reader even
 * clicks through.
 */
export default function GroupsIndexPage() {
	const formatGroups = deriveFormatGroups();
	const taskGroups = deriveTaskGroups();

	return (
		<HubPage
			title="Browse by format or task"
			lede="Every conversion, grouped two ways: by file format, and by what it does."
			count={{
				value: formatGroups.length + taskGroups.length,
				noun: "groups",
			}}
			sections={[
				{
					heading: "BY FORMAT",
					items: formatGroups.map((group) => ({
						href: `/groups/format/${group.format}`,
						title: group.format.toUpperCase(),
						meta: toolCount(group.tools),
						description: categoriesSpanned(group.tools).join(", "),
					})),
				},
				{
					heading: "BY TASK",
					items: taskGroups.map((group) => ({
						href: `/groups/task/${group.kind}`,
						title: label(group.kind),
						meta: toolCount(group.tools),
						description: categoriesSpanned(group.tools).join(", "),
					})),
				},
			]}
		/>
	);
}
