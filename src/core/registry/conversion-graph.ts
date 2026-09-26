import { TOOLS, type Tool } from "./index";

/**
 * The registry as a walkable graph: formats and operations as two kinds of
 * nodes, tools as the edges between what they accept and what they emit.
 *
 * A flat branch list (`conversionBranches`) answers "what can this become"
 * one hop out. This answers the continuous question -- JPEG to AVIF to PDF
 * to ZIP, with detours through extract, compress, resize, edit and generate
 * operations -- by alternating format and tool layers in a breadth-first
 * search from any source extension.
 */

export type GraphNodeType = "format" | "tool";

export interface ConversionGraphNode {
	/** Stable identity: `fmt:<ext>` or `tool:<id>`. */
	id: string;
	type: GraphNodeType;
	/** Uppercase ext for formats, tool slug for operations. */
	label: string;
	/** Operation kind for tool nodes; undefined for formats. */
	kind?: Tool["kind"];
	/** Registry id for tool nodes; undefined for formats. */
	toolId?: string;
	/** Edges travelled from the source. Even depths are formats. */
	depth: number;
}

export interface ConversionGraphEdge {
	from: string;
	to: string;
	kind: Tool["kind"];
}

export interface ConversionGraph {
	/** Lowercased source extension the search started from. */
	source: string;
	nodes: ConversionGraphNode[];
	edges: ConversionGraphEdge[];
	/** True when the node cap stopped the search early. */
	truncated: boolean;
}

/** Alias map so jpeg/jpg (and friends) collapse to one format node. */
const EXT_ALIASES: Record<string, string> = {
	jpeg: "jpg",
	tif: "tiff",
	htm: "html",
	markdown: "md",
};

/**
 * Formats that are valid destinations (favicon packs, zip tools) but make
 * terrible intermediate bridges -- expanding them fans the graph into every
 * unrelated archive consumer (shapefile zips, WhatsApp exports, etc.).
 * They stay expandable only when they *are* the walk's source.
 */
const ARCHIVE_BRIDGES = new Set(["zip", "tar", "tgz", "gz", "7z", "rar", "cbz"]);

/** Canonical file extension for graph identity and tool matching. */
export function canonicalExt(ext: string): string {
	const lower = ext.toLowerCase();
	return EXT_ALIASES[lower] ?? lower;
}

function formatId(ext: string): string {
	return `fmt:${canonicalExt(ext)}`;
}

function toolId(tool: Tool): string {
	return `tool:${tool.id}`;
}

function toolAccepts(tool: Tool, ext: string): boolean {
	const want = canonicalExt(ext);
	return tool.accept.ext.some((e) => canonicalExt(e) === want);
}

/**
 * Breadth-first search over the format-operation graph from a source
 * extension. `maxHops` counts format-to-format hops (each hop passes
 * through one tool layer); `maxNodes` bounds the drawn graph so rich
 * sources like PNG stay readable and cheap to render.
 *
 * Tools and formats sort by id/extension, so the same registry always
 * yields the same graph -- layout and tests can rely on the order.
 */
export function buildConversionGraph(
	sourceExt: string,
	maxHops = 3,
	maxNodes = 140,
): ConversionGraph {
	const source = canonicalExt(sourceExt);
	const nodes = new Map<string, ConversionGraphNode>();
	const edges: ConversionGraphEdge[] = [];
	const seenEdges = new Set<string>();
	let truncated = false;

	const root: ConversionGraphNode = {
		id: formatId(source),
		type: "format",
		label: source.toUpperCase(),
		depth: 0,
	};
	nodes.set(root.id, root);

	const queue: ConversionGraphNode[] = [root];
	const addEdge = (from: string, to: string, kind: Tool["kind"]) => {
		const key = `${from}>${to}`;
		if (seenEdges.has(key)) return;
		seenEdges.add(key);
		edges.push({ from, to, kind });
	};

	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) break;
		// Each format-to-format hop crosses two half-layers (format, tool).
		if (current.depth >= maxHops * 2) continue;

		if (current.type === "format") {
			const ext = canonicalExt(current.label);
			// Archive packs are real destinations (favicon -> ZIP) but not
			// bridges into every zip consumer on the registry.
			if (current.depth > 0 && ARCHIVE_BRIDGES.has(ext)) continue;

			const tools = TOOLS.filter((tool) => toolAccepts(tool, ext)).sort(
				(a, b) => (a.id < b.id ? -1 : 1),
			);
			for (const tool of tools) {
				if (nodes.size >= maxNodes) {
					truncated = true;
					break;
				}
				const id = toolId(tool);
				if (!nodes.has(id)) {
					nodes.set(id, {
						id,
						type: "tool",
						label: tool.slug,
						kind: tool.kind,
						toolId: tool.id,
						depth: current.depth + 1,
					});
					queue.push(nodes.get(id)!);
				}
				addEdge(current.id, id, tool.kind);
			}
			if (truncated) break;
		} else {
			const tool = TOOLS.find((t) => toolId(t) === current.id);
			if (!tool) continue;
			const out = canonicalExt(tool.output.ext);
			if (nodes.size >= maxNodes) {
				truncated = true;
				break;
			}
			const id = formatId(out);
			if (!nodes.has(id)) {
				nodes.set(id, {
					id,
					type: "format",
					label: out.toUpperCase(),
					depth: current.depth + 1,
				});
				queue.push(nodes.get(id)!);
			}
			addEdge(current.id, id, tool.kind);
		}
	}

	return { source, nodes: [...nodes.values()], edges, truncated };
}

/** Formats and tools directly connected to a node, split by direction. */
export function graphNeighbors(
	graph: ConversionGraph,
	nodeId: string,
): { incoming: ConversionGraphNode[]; outgoing: ConversionGraphNode[] } {
	const byId = new Map(graph.nodes.map((n) => [n.id, n]));
	const incoming: ConversionGraphNode[] = [];
	const outgoing: ConversionGraphNode[] = [];
	for (const edge of graph.edges) {
		if (edge.to === nodeId) {
			const node = byId.get(edge.from);
			if (node) incoming.push(node);
		}
		if (edge.from === nodeId) {
			const node = byId.get(edge.to);
			if (node) outgoing.push(node);
		}
	}
	return { incoming, outgoing };
}

export const GRAPH_COL_X = 200;
export const GRAPH_ROW_H = 30;

export interface PlacedNode extends ConversionGraphNode {
	x: number;
	y: number;
	w: number;
	h: number;
}

/**
 * Deterministic layered layout: one column per BFS depth, rows spread
 * evenly within each column. Node widths are estimated from label length
 * (7px per mono glyph plus chrome) so layout needs no canvas context --
 * pure, synchronous, and testable. The renderer measures nothing; it
 * draws the boxes it is given.
 */
export function layoutConversionGraph(graph: ConversionGraph): PlacedNode[] {
	const byDepth = new Map<number, ConversionGraphNode[]>();
	for (const node of graph.nodes) {
		const column = byDepth.get(node.depth) ?? [];
		column.push(node);
		byDepth.set(node.depth, column);
	}
	const placed: PlacedNode[] = [];
	for (const [depth, column] of [...byDepth.entries()].sort(
		(a, b) => a[0] - b[0],
	)) {
		column.forEach((node, index) => {
			const w =
				node.type === "format"
					? node.label.length * 8 + 28
					: node.label.length * 7 + 30;
			placed.push({
				...node,
				x: depth * GRAPH_COL_X,
				y: (index - (column.length - 1) / 2) * GRAPH_ROW_H,
				w,
				h: 22,
			});
		});
	}
	return placed;
}

/**
 * Topmost-first hit test over placed boxes. Later nodes draw over earlier
 * ones, so reverse order matches what the eye sees.
 */
export function hitTestNode(
	nodes: PlacedNode[],
	px: number,
	py: number,
): PlacedNode | undefined {
	for (let i = nodes.length - 1; i >= 0; i--) {
		const node = nodes[i];
		if (!node) continue;
		if (
			px >= node.x &&
			px <= node.x + node.w &&
			py >= node.y &&
			py <= node.y + node.h
		) {
			return node;
		}
	}
	return undefined;
}

export interface FitTransform {
	x: number;
	y: number;
	k: number;
}

/**
 * Fit a placed graph inside a viewport with padding on all sides,
 * preserving aspect (one scale factor, never upscale past 1:1, never
 * below 0.3). Content that fits is centered; content denser than the
 * viewport hugs the top-left pad instead of centering itself half off
 * screen -- the leftover is reachable by pan and zoom, which the canvas
 * always offers. Pure, so the placement contract is unit-testable.
 */
export function fitTransform(
	nodes: PlacedNode[],
	viewportW: number,
	viewportH: number,
	pad = 24,
): FitTransform {
	if (nodes.length === 0 || viewportW <= 0 || viewportH <= 0) {
		return { x: 0, y: 0, k: 1 };
	}
	const minX = Math.min(...nodes.map((n) => n.x));
	const maxX = Math.max(...nodes.map((n) => n.x + n.w));
	const minY = Math.min(...nodes.map((n) => n.y));
	const maxY = Math.max(...nodes.map((n) => n.y + n.h));
	const contentW = maxX - minX;
	const contentH = maxY - minY;
	const k = Math.max(
		0.3,
		Math.min(
			1,
			(viewportW - pad * 2) / Math.max(1, contentW),
			(viewportH - pad * 2) / Math.max(1, contentH),
		),
	);
	return {
		k,
		x: pad - minX * k + Math.max(0, viewportW - pad * 2 - contentW * k) / 2,
		y: pad - minY * k + Math.max(0, viewportH - pad * 2 - contentH * k) / 2,
	};
}
