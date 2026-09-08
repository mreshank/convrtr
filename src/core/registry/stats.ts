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
