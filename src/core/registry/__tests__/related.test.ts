import { describe, expect, it } from "vitest";
import { getTool } from "../index";
import { getRelatedToolsGraph } from "../related";

describe("getRelatedToolsGraph", () => {
	it("finds the reverse tool for bidirectional conversions", () => {
		const pngToWebp = getTool("image/png-to-webp");
		expect(pngToWebp).toBeDefined();
		if (!pngToWebp) return;

		const graph = getRelatedToolsGraph(pngToWebp);
		expect(graph.reverseTool).toBeDefined();
		expect(graph.reverseTool?.id).toBe("image/webp-to-png");
	});

	it("identifies sibling output formats from the same input format", () => {
		const pngToWebp = getTool("image/png-to-webp");
		if (!pngToWebp) return;

		const graph = getRelatedToolsGraph(pngToWebp);
		expect(graph.siblingOutputs.length).toBeGreaterThan(0);
		// All sibling outputs should accept png and produce something other than webp
		for (const sibling of graph.siblingOutputs) {
			expect(sibling.accept.ext.map((e) => e.toLowerCase())).toContain("png");
			expect(sibling.output.ext.toLowerCase()).not.toBe("webp");
		}
	});

	it("identifies sibling input formats targeting the same output format", () => {
		const pngToWebp = getTool("image/png-to-webp");
		if (!pngToWebp) return;

		const graph = getRelatedToolsGraph(pngToWebp);
		expect(graph.siblingInputs.length).toBeGreaterThan(0);
		// All sibling inputs should produce webp and NOT accept png
		for (const sibling of graph.siblingInputs) {
			expect(sibling.output.ext.toLowerCase()).toBe("webp");
			expect(sibling.accept.ext.map((e) => e.toLowerCase())).not.toContain(
				"png",
			);
		}
	});

	it("provides category hub and format hub endpoints", () => {
		const wavToMp3 = getTool("audio/wav-to-mp3");
		if (!wavToMp3) return;

		const graph = getRelatedToolsGraph(wavToMp3);
		expect(graph.categoryHub.href).toBe("/audio");
		expect(graph.categoryHub.label).toBe("Audio Tools");
		expect(graph.formatHubs.inputHref).toBe("/groups/format/wav");
		expect(graph.formatHubs.outputHref).toBe("/groups/format/mp3");
	});
});
