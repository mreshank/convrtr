import { CATEGORIES, TOOLS } from "./index";
import type { Category } from "./types";

/**
 * Tool counts per category, derived from the registry at build time.
 *
 * Derived rather than authored so the hero's chart cannot drift from the
 * product it describes. A page whose headline claim is verifiable should not
 * carry a chart of numbers nobody can check.
 *
 * Rows come back in `CATEGORIES` order rather than sorted by count, so the
 * axis stays put as tools are added instead of reshuffling between builds.
 */
export function toolsByCategory(): { label: Category; value: number }[] {
	return CATEGORIES.map((label) => ({
		label,
		value: TOOLS.filter((tool) => tool.category === label).length,
	}));
}

/**
 * Every file extension the product accepts or emits, lowercased, deduplicated
 * and sorted.
 *
 * Sorted for the same reason the categories are not: this feeds a scrolling
 * rail, and a set's iteration order is insertion order, which would change
 * whenever the registry is reordered.
 */
export function supportedFormats(): string[] {
	const formats = new Set<string>();
	for (const tool of TOOLS) {
		for (const ext of tool.accept.ext) formats.add(ext.toLowerCase());
		formats.add(tool.output.ext.toLowerCase());
	}
	return [...formats].sort();
}

/**
 * Every output extension reachable from a given input, across the whole
 * registry.
 *
 * The branching diagram's content, derived rather than drawn: `heic` really
 * does branch to jpg, png and webp, because three tools accept it. A network
 * graphic of invented nodes would decorate the page and say nothing.
 *
 * A self-edge is excluded. `png` accepting png and emitting png happens for
 * resize and metadata tools, but drawing png -> png as a *conversion* would
 * claim something the diagram does not mean.
 */
export function conversionBranches(from: string): string[] {
	const needle = from.toLowerCase();
	const outputs = new Set<string>();

	for (const tool of TOOLS) {
		if (!tool.accept.ext.some((ext) => ext.toLowerCase() === needle)) continue;
		const out = tool.output.ext.toLowerCase();
		if (out !== needle) outputs.add(out);
	}

	return [...outputs].sort();
}
