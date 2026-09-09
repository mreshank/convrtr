import type { Metadata } from "next";
import { deriveFormatGroups, deriveTaskGroups } from "@/core/registry/groups";
import { HubPage } from "@/design/templates";
import { SITE } from "@/lib/site";

function label(text: string): string {
	return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
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
						meta: String(group.tools.length),
					})),
				},
				{
					heading: "BY TASK",
					items: taskGroups.map((group) => ({
						href: `/groups/task/${group.kind}`,
						title: label(group.kind),
						meta: String(group.tools.length),
					})),
				},
			]}
		/>
	);
}
