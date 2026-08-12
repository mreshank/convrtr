import type { Tool } from "@/core/registry";

export type ToolRow = {
	id: string;
	href: string;
	name: string;
	/** Truncated `seo.intent`, for display in the dense table. */
	description: string;
	/** Untruncated `seo.intent`, for search matching. */
	intent: string;
	category: string;
	fromExt: string;
	toExt: string;
};

const DESCRIPTION_MAX_LENGTH = 88;

/**
 * Truncates on a word boundary so the table never cuts a word in half.
 * Text at or under the limit passes through untouched.
 */
export function truncate(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	const slice = text.slice(0, maxLength);
	const lastSpace = slice.lastIndexOf(" ");
	const cut = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
	return `${cut.trimEnd()}…`;
}

/**
 * The only place a `Tool` becomes a table row. Every field is derived from
 * the registry entry — nothing about a specific tool is hand-typed here —
 * so a tool registered elsewhere shows up on /tools and its category hub
 * without either page changing.
 */
export function toToolRow(tool: Tool): ToolRow {
	return {
		id: tool.id,
		href: `/${tool.id}`,
		name: tool.seo.h1,
		description: truncate(tool.seo.intent, DESCRIPTION_MAX_LENGTH),
		intent: tool.seo.intent,
		category: tool.category,
		fromExt: tool.accept.ext[0] ?? tool.output.ext,
		toExt: tool.output.ext,
	};
}
