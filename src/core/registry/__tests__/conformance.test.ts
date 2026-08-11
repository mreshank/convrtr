import { describe, expect, it } from "vitest";
import { getTool, TOOLS } from "../index";
import { ToolSchema } from "../types";

describe("registry conformance", () => {
	it("contains at least one tool", () => {
		expect(TOOLS.length).toBeGreaterThan(0);
	});

	it("validates every entry against the schema", () => {
		for (const tool of TOOLS) {
			expect(() => ToolSchema.parse(tool)).not.toThrow();
		}
	});

	it("has no duplicate ids", () => {
		const ids = TOOLS.map((t) => t.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("resolves every related tool id", () => {
		for (const tool of TOOLS) {
			for (const related of tool.seo.related) {
				expect(getTool(related), `${tool.id} → ${related}`).toBeDefined();
			}
		}
	});

	it("derives a slug that matches the id suffix", () => {
		for (const tool of TOOLS) {
			expect(tool.id).toBe(`${tool.category}/${tool.slug}`);
		}
	});
});
