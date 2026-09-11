import { describe, expect, it } from "vitest";
import { COMPARISONS, getComparison } from "../registry";

describe("compare registry", () => {
	it("contains unique slugs", () => {
		const slugs = COMPARISONS.map((c) => c.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
	});

	it("retrieves comparisons by slug", () => {
		const comp = getComparison("webp-vs-avif");
		expect(comp).toBeDefined();
		expect(comp?.formatA).toBe("WebP");
		expect(comp?.formatB).toBe("AVIF");
		expect(comp?.specs.length).toBeGreaterThan(3);
	});

	it("all comparisons have non-empty specs, pros, and related tools", () => {
		for (const c of COMPARISONS) {
			expect(c.title.length).toBeGreaterThan(10);
			expect(c.description.length).toBeGreaterThan(20);
			expect(c.prosA.length).toBeGreaterThanOrEqual(3);
			expect(c.prosB.length).toBeGreaterThanOrEqual(3);
			expect(c.specs.length).toBeGreaterThanOrEqual(4);
			expect(c.relatedTools.length).toBeGreaterThanOrEqual(1);
		}
	});
});
