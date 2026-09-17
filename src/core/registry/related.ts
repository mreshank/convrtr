import { COLLECTIVES } from "@/content/collectives/registry";
import type { CollectiveMeta } from "@/content/collectives/types";
import { TOOLS, type Tool } from "./index";

export interface RelatedToolsGraph {
	/** Direct reciprocal reverse converter, e.g. WEBP -> PNG when viewing PNG -> WEBP. */
	reverseTool?: Tool;
	/** Other converters accepting the same input format, targeting different formats (e.g. PNG -> JPG, PNG -> AVIF). */
	siblingOutputs: Tool[];
	/** Other converters producing the same output format from different source formats (e.g. JPG -> WEBP, HEIC -> WEBP). */
	siblingInputs: Tool[];
	/** Sibling tools within the same category to explore topical authority. */
	categorySiblings: Tool[];
	/** Format hubs corresponding to the input and output formats. */
	formatHubs: {
		inputFormat: string;
		inputHref: string;
		outputFormat: string;
		outputHref: string;
	};
	/** Category hub details. */
	categoryHub: {
		id: string;
		label: string;
		href: string;
	};
	/** Curated collectives containing this tool. */
	collectives: CollectiveMeta[];
}

/**
 * Computes the multi-directional internal linking graph for any tool.
 * Powers crawl-spider discovery, PageRank flow, and user navigation across all 200 converters.
 */
export function getRelatedToolsGraph(tool: Tool): RelatedToolsGraph {
	const rawFrom = tool.accept.ext[0]?.toLowerCase() ?? "";
	const rawTo = tool.output.ext?.toLowerCase() ?? "";

	// 1. Reciprocal reverse tool
	const reverseTool = TOOLS.find(
		(t) =>
			t.id !== tool.id &&
			t.accept.ext.some((ext) => ext.toLowerCase() === rawTo) &&
			t.output.ext?.toLowerCase() === rawFrom,
	);

	// 2. Converters with the same input format, different output format
	const siblingOutputs = TOOLS.filter(
		(t) =>
			t.id !== tool.id &&
			t.id !== reverseTool?.id &&
			t.accept.ext.some((ext) => ext.toLowerCase() === rawFrom) &&
			t.output.ext?.toLowerCase() !== rawTo,
	).slice(0, 8);

	// 3. Converters with different input format, same output format
	const siblingInputs = TOOLS.filter(
		(t) =>
			t.id !== tool.id &&
			t.id !== reverseTool?.id &&
			!t.accept.ext.some((ext) => ext.toLowerCase() === rawFrom) &&
			t.output.ext?.toLowerCase() === rawTo,
	).slice(0, 8);

	// 4. Sibling tools in the same category
	const categorySiblings = TOOLS.filter(
		(t) =>
			t.id !== tool.id &&
			t.id !== reverseTool?.id &&
			t.category === tool.category &&
			!siblingOutputs.some((s) => s.id === t.id) &&
			!siblingInputs.some((s) => s.id === t.id),
	).slice(0, 6);

	// 5. Format hubs
	const formatHubs = {
		inputFormat: rawFrom.toUpperCase(),
		inputHref: `/groups/format/${rawFrom}`,
		outputFormat: rawTo.toUpperCase(),
		outputHref: `/groups/format/${rawTo}`,
	};

	// 6. Category hub
	const categoryLabel =
		tool.category.charAt(0).toUpperCase() + tool.category.slice(1);
	const categoryHub = {
		id: tool.category,
		label: `${categoryLabel} Tools`,
		href: `/${tool.category}`,
	};

	// 7. Collectives
	const collectives = COLLECTIVES.filter((c) => c.toolIds.includes(tool.id));

	return {
		reverseTool,
		siblingOutputs,
		siblingInputs,
		categorySiblings,
		formatHubs,
		categoryHub,
		collectives,
	};
}
