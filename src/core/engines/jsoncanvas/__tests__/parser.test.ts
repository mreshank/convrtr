import { describe, expect, it } from "vitest";
import { canvasToMarkdownEngine } from "../index";
import { convertCanvasToMarkdown, parseCanvas } from "../parser";

const CANVAS = {
	nodes: [
		{
			id: "n1",
			type: "text",
			x: 0,
			y: 0,
			width: 200,
			height: 100,
			text: "Thesis\nSupport line",
		},
		{
			id: "n2",
			type: "file",
			x: 250,
			y: 0,
			width: 200,
			height: 100,
			file: "paper.pdf",
		},
		{
			id: "n3",
			type: "link",
			x: 0,
			y: 150,
			width: 200,
			height: 60,
			url: "https://example.com",
		},
		{
			id: "n4",
			type: "group",
			x: -50,
			y: -50,
			width: 600,
			height: 300,
			label: "Chapter 1",
		},
	],
	edges: [{ id: "e1", fromNode: "n1", toNode: "n2", label: "cites" }],
};

function bytes(v: unknown): Uint8Array {
	return new TextEncoder().encode(JSON.stringify(v));
}

describe("JSON Canvas Parser & Engine", () => {
	it("flattens all four node types plus edges", () => {
		const doc = parseCanvas(bytes(CANVAS));
		expect(doc.nodeCount).toBe(4);
		expect(doc.edgeCount).toBe(1);
		expect(doc.nodes[0]?.title).toBe("Thesis");
		expect(doc.nodes[1]?.body).toBe("![[paper.pdf]]");
		expect(doc.nodes[2]?.body).toBe(
			"[https://example.com](https://example.com)",
		);
		expect(doc.nodes[3]?.title).toBe("Group: Chapter 1");
		expect(doc.edges[0]).toMatchObject({
			from: "Thesis",
			to: "paper.pdf",
			label: "cites",
		});
	});

	it("renders sections and connections through the engine", async () => {
		expect(await canvasToMarkdownEngine.probe()).toBe(true);
		const out = await convertCanvasToMarkdown(
			bytes(CANVAS).buffer.slice(0) as ArrayBuffer,
			() => {},
		);
		const md = new TextDecoder().decode(out);
		expect(md).toContain("## Thesis");
		expect(md).toContain("## Connections");
		expect(md).toContain("cites");
	});

	it("rejects non-JSON and canvasless JSON", () => {
		expect(() => parseCanvas(new TextEncoder().encode("nope"))).toThrow(
			"not valid JSON",
		);
		expect(() => parseCanvas(bytes({ hello: 1 }))).toThrow("missing `nodes`");
	});
});
