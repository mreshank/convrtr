import { CATEGORIES, TOOLS } from "./index";
import type { Category, Tool } from "./types";

/**
 * A tool's declared `kind`, read off `Tool` rather than re-declared here --
 * this can never drift from what `ToolSchema` actually allows.
 */
export type Kind = Tool["kind"];

export type FormatGroup = { format: string; tools: Tool[] };
export type TaskGroup = { kind: Kind; tools: Tool[] };
export type TypeGroup = { category: Category; label: string; tools: Tool[] };

export const TYPE_LABELS: Record<Category, string> = {
	image: "Images",
	video: "Videos",
	audio: "Audio",
	document: "Documents",
	data: "Data",
};

/**
 * Every tool, grouped by high-level file type (category) that ordinary users
 * understand (Images, Videos, Audio, Documents).
 *
 * Normal people identify files by broad type rather than technical extensions
 * (HEIC, JXL, FLAC, Opus). Grouping by type provides an intuitive first-tier
 * hierarchy. Categories with no registered tools are omitted.
 *
 * Order follows `CATEGORIES` declaration order for stability.
 */
export function deriveTypeGroups(): TypeGroup[] {
	return CATEGORIES.map((category) => ({
		category,
		label: TYPE_LABELS[category],
		tools: TOOLS.filter((tool) => tool.category === category),
	})).filter((group) => group.tools.length > 0);
}

/**
 * Every tool, grouped by every file-format extension it touches on either
 * side of the conversion.
 *
 * A tool is listed under both its input format and its output format --
 * `png-to-webp` appears in the `png` group AND the `webp` group. A group
 * keyed on input alone would answer only "what can I convert this to",
 * never "what can I do with a file already in this format", which is half
 * of what a hub keyed on format promises to answer. Extensions are
 * lowercased so a registry entry spelled `PNG` doesn't fork into a second
 * group next to `png`.
 *
 * There is no registry of formats to maintain: a format only enters the
 * map because some tool named it in `accept.ext` or `output.ext`, so an
 * empty group can never be produced, and every tool another agent adds to
 * `TOOLS` appears here, under every format it touches, without this file
 * changing.
 *
 * Sorted by format so `generateStaticParams` returns the same route list
 * between builds -- reordering `TOOLS` would otherwise reshuffle route
 * generation order for no reason a route list should ever have.
 */
export function deriveFormatGroups(): FormatGroup[] {
	const byFormat = new Map<string, Tool[]>();

	for (const tool of TOOLS) {
		const formats = new Set([
			...tool.accept.ext.map((ext) => ext.toLowerCase()),
			tool.output.ext.toLowerCase(),
		]);
		for (const format of formats) {
			const group = byFormat.get(format);
			if (group) group.push(tool);
			else byFormat.set(format, [tool]);
		}
	}

	return [...byFormat.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([format, tools]) => ({ format, tools }));
}

/**
 * Every tool, grouped by its declared `kind`.
 *
 * A kind no tool declares is omitted entirely rather than emitted with an
 * empty `tools` array: `ToolSchema` declares `inspect` for a category of
 * tool that does not exist in the registry yet, and a route built for it
 * would ship a page listing nothing -- the same thin, contentless page
 * `/[category]/page.tsx`'s `getToolsByCategory(category).length > 0` guard
 * exists to prevent, applied here to the registry's other axis.
 *
 * Sorted by kind for the same route-stability reason as
 * `deriveFormatGroups`.
 */
export function deriveTaskGroups(): TaskGroup[] {
	const byKind = new Map<Kind, Tool[]>();

	for (const tool of TOOLS) {
		const group = byKind.get(tool.kind);
		if (group) group.push(tool);
		else byKind.set(tool.kind, [tool]);
	}

	return [...byKind.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([kind, tools]) => ({ kind, tools }));
}
