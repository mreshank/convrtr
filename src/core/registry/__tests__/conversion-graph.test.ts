import { assert, describe, expect, it } from "vitest";
import {
	buildConversionGraph,
	fitTransform,
	graphNeighbors,
	hitTestNode,
	layoutConversionGraph,
} from "../conversion-graph";

describe("buildConversionGraph", () => {
	it("roots the search at the source format", () => {
		const graph = buildConversionGraph("jpg", 1);
		expect(graph.source).toBe("jpg");
		expect(graph.nodes[0]).toMatchObject({
			id: "fmt:jpg",
			type: "format",
			depth: 0,
		});
		expect(graph.truncated).toBe(false);
	});

	it("branches JPEG into its real one-hop formats through tool nodes", () => {
		const graph = buildConversionGraph("jpg", 1);
		const formats = new Set(
			graph.nodes.filter((n) => n.type === "format").map((n) => n.label),
		);
		for (const expected of ["JPG", "PNG", "WEBP"]) {
			expect(formats.has(expected)).toBe(true);
		}
		const tools = graph.nodes.filter((n) => n.type === "tool");
		expect(tools.length).toBeGreaterThan(0);
		// One hop out already mixes conversion with operations: compress,
		// resize, and metadata stripping all accept JPEG directly.
		expect(tools.some((t) => t.kind === "convert")).toBe(true);
		expect(tools.some((t) => t.kind !== "convert")).toBe(true);
	});

	it("walks continuous multi-hop chains like JPEG to PDF", () => {
		const graph = buildConversionGraph("jpg", 3);
		const formats = new Set(
			graph.nodes.filter((n) => n.type === "format").map((n) => n.label),
		);
		expect(formats.has("PDF")).toBe(true);
		// Every edge names nodes that exist on both ends.
		const ids = new Set(graph.nodes.map((n) => n.id));
		for (const edge of graph.edges) {
			expect(ids.has(edge.from)).toBe(true);
			expect(ids.has(edge.to)).toBe(true);
		}
	});

	it("surfaces non-conversion operations, not just converters", () => {
		// PNG is heavily tooled: metadata stripping, resize, and more live
		// alongside plain conversion.
		const graph = buildConversionGraph("png", 2);
		const kinds = new Set(
			graph.nodes.filter((n) => n.type === "tool").map((n) => n.kind),
		);
		expect(kinds.has("convert")).toBe(true);
		expect([...kinds].some((k) => k !== "convert")).toBe(true);
	});

	it("does not bridge through archive packs into unrelated zip consumers", () => {
		// favicon-generator emits ZIP from JPEG; expanding that ZIP would
		// pull shapefile and WhatsApp tools into an image walk. Archives
		// stay as destinations unless they are the root.
		const graph = buildConversionGraph("jpg", 2);
		const labels = new Set(graph.nodes.map((n) => n.label));
		expect(labels.has("ZIP")).toBe(true);
		expect(labels.has("shp-to-geojson")).toBe(false);
		expect(labels.has("whatsapp-to-markdown")).toBe(false);
		expect(labels.has("GEOJSON")).toBe(false);
	});

	it("collapses jpeg and jpg into one canonical walk", () => {
		expect(buildConversionGraph("jpeg", 2)).toEqual(
			buildConversionGraph("jpg", 2),
		);
	});

	it("caps the graph and says so", () => {
		const graph = buildConversionGraph("png", 3, 20);
		expect(graph.nodes.length).toBeLessThanOrEqual(20);
		expect(graph.truncated).toBe(true);
	});

	it("builds the same graph every time", () => {
		expect(buildConversionGraph("webp", 2)).toEqual(
			buildConversionGraph("webp", 2),
		);
	});
});

describe("graphNeighbors", () => {
	it("splits a node's edges by direction", () => {
		const graph = buildConversionGraph("jpg", 1);
		const tool = graph.nodes.find((n) => n.type === "tool");
		assert(tool, "expected at least one tool node");
		const { incoming, outgoing } = graphNeighbors(graph, tool.id);
		expect(incoming.map((n) => n.type)).toContain("format");
		expect(outgoing.map((n) => n.type)).toContain("format");
	});
});

describe("layoutConversionGraph", () => {
	it("columns depths left to right and centers each column", () => {
		const placed = layoutConversionGraph(buildConversionGraph("jpg", 2));
		const byDepth = new Map<number, number[]>();
		for (const node of placed) {
			byDepth.set(node.depth, [...(byDepth.get(node.depth) ?? []), node.y]);
		}
		const depths = [...byDepth.keys()].sort((a, b) => a - b);
		const xs = depths.map((d) => placed.find((n) => n.depth === d)?.x ?? -1);
		expect([...xs].sort((a, b) => a - b)).toEqual(xs);
		for (const ys of byDepth.values()) {
			const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
			expect(Math.abs(mean)).toBeLessThan(1);
		}
	});
});

describe("hitTestNode", () => {
	it("finds the box under the point and misses empty space", () => {
		const placed = layoutConversionGraph(buildConversionGraph("jpg", 1));
		const first = placed[0];
		assert(first, "expected at least one placed node");
		expect(hitTestNode(placed, first.x + 2, first.y + 2)?.id).toBe(first.id);
		expect(hitTestNode(placed, -9999, -9999)).toBeUndefined();
	});
});

describe("fitTransform", () => {
	it("centers content that fits and pads content that overflows", () => {
		for (const source of ["jpg", "png", "mp4", "pdf", "heic"]) {
			for (const [w, h] of [
				[1200, 440],
				[800, 440],
				[375, 440],
			] as const) {
				const placed = layoutConversionGraph(buildConversionGraph(source, 3));
				const t = fitTransform(placed, w, h);
				expect(t.k).toBeGreaterThanOrEqual(0.3);
				expect(t.k).toBeLessThanOrEqual(1);
				const lefts = placed.map((n) => n.x * t.k + t.x);
				const tops = placed.map((n) => n.y * t.k + t.y);
				const rights = placed.map((n) => (n.x + n.w) * t.k + t.x);
				const bottoms = placed.map((n) => (n.y + n.h) * t.k + t.y);
				// The top-left corner is always on screen: overflow, if any,
				// runs right and down where pan and zoom can reach it.
				expect(Math.min(...lefts)).toBeGreaterThanOrEqual(24 - 0.5);
				expect(Math.min(...tops)).toBeGreaterThanOrEqual(24 - 0.5);
				const fitsX = Math.max(...rights) - Math.min(...lefts);
				const fitsY = Math.max(...bottoms) - Math.min(...tops);
				if (fitsX <= w - 48 + 0.5 && fitsY <= h - 48 + 0.5) {
					expect(Math.max(...rights)).toBeLessThanOrEqual(w - 24 + 0.5);
					expect(Math.max(...bottoms)).toBeLessThanOrEqual(h - 24 + 0.5);
				}
			}
		}
	});

	it("returns identity for empty graphs and dead viewports", () => {
		expect(fitTransform([], 800, 440)).toEqual({ x: 0, y: 0, k: 1 });
		const placed = layoutConversionGraph(buildConversionGraph("jpg", 1));
		expect(fitTransform(placed, 0, 440)).toEqual({ x: 0, y: 0, k: 1 });
	});
});
