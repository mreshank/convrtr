import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { parseOrgToMarkdown } from "./parser";
import type { OrgToMarkdownOptions } from "./types";

export * from "./parser";
export * from "./types";

/**
 * Emacs Org Mode (.org) to GitHub Flavored Markdown conversion engine.
 * Converts Org headings, todo states, checkboxes, tables, code blocks, and metadata into clean Markdown.
 */
export const orgToMarkdownEngine: Engine = {
	id: "extract:org-to-markdown",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		onProgress?.(0.1, "READING_ORG");
		const includeFrontmatter =
			params.frontmatter === undefined
				? true
				: params.frontmatter === true || params.frontmatter === "true";
		const options: OrgToMarkdownOptions = {
			includeFrontmatter,
		};

		onProgress?.(0.4, "PARSING_STRUCTURE");
		const result = parseOrgToMarkdown(input, options);

		onProgress?.(1.0, "COMPLETE");
		return new TextEncoder().encode(result.markdown).buffer as ArrayBuffer;
	},
};
