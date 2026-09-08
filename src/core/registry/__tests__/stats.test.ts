import { describe, expect, it } from "vitest";
import { CATEGORIES, TOOLS } from "@/core/registry";
import {
	conversionBranches,
	supportedFormats,
	toolsByCategory,
} from "@/core/registry/stats";

describe("toolsByCategory", () => {
	it("counts every tool exactly once", () => {
		const total = toolsByCategory().reduce((sum, d) => sum + d.value, 0);
		expect(total).toBe(TOOLS.length);
	});

	it("returns a row per declared category, in the declared order", () => {
		// Declared order, not count order: the chart's x-axis must be stable
		// as tools are added, or the bars reshuffle between builds.
		expect(toolsByCategory().map((d) => d.label)).toEqual([...CATEGORIES]);
	});

	it("gives an empty category a zero rather than omitting it", () => {
		// A category with no tools yet must still hold its slot, or the axis
		// silently loses a column.
		const rows = toolsByCategory();
		expect(rows.length).toBe(CATEGORIES.length);
		for (const row of rows) expect(row.value).toBeGreaterThanOrEqual(0);
	});
});

describe("supportedFormats", () => {
	it("unions the accepted and emitted extensions", () => {
		const formats = supportedFormats();
		expect(formats).toContain("png");
		expect(formats).toContain("pdf");
		expect(formats.length).toBeGreaterThan(10);
	});

	it("deduplicates and sorts, so the rail is stable between builds", () => {
		const formats = supportedFormats();
		expect(new Set(formats).size).toBe(formats.length);
		expect([...formats].sort()).toEqual(formats);
	});

	it("normalises case, so jpg and JPG are one format", () => {
		expect(supportedFormats().every((f) => f === f.toLowerCase())).toBe(true);
	});
});

describe("conversionBranches", () => {
	it("finds every output reachable from an input extension", () => {
		const outputs = conversionBranches("heic");
		expect(outputs).toContain("jpg");
		expect(outputs).toContain("png");
		expect(outputs).toContain("webp");
	});

	it("never lists an input as its own output", () => {
		// A self-edge is not a conversion, and drawing one would claim a
		// tool that does not exist.
		expect(conversionBranches("png")).not.toContain("png");
	});

	it("deduplicates and sorts, so the diagram is stable between builds", () => {
		const outputs = conversionBranches("jpg");
		expect(new Set(outputs).size).toBe(outputs.length);
		expect([...outputs].sort()).toEqual(outputs);
	});

	it("returns an empty list for an extension nothing accepts", () => {
		expect(conversionBranches("nosuchformat")).toEqual([]);
	});
});
