import { describe, expect, it } from "vitest";
import { COLLECTIVES, getCollective } from "@/content/collectives/registry";
import { getTool } from "@/core/registry";

describe("collectives registry", () => {
	it("has at least two collectives", () => {
		expect(COLLECTIVES.length).toBeGreaterThanOrEqual(2);
	});

	it("names only tools that exist", () => {
		// A collective referencing a removed tool is a broken page, and this
		// is the only place it can be caught.
		for (const collective of COLLECTIVES) {
			for (const id of collective.toolIds) {
				expect(
					getTool(id),
					`${collective.slug} names missing tool ${id}`,
				).toBeDefined();
			}
		}
	});

	it("has unique slugs", () => {
		const slugs = COLLECTIVES.map((c) => c.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
	});

	it("resolves a known slug and rejects an unknown one", () => {
		const first = COLLECTIVES[0];
		expect(first).toBeDefined();
		if (first) expect(getCollective(first.slug)?.slug).toBe(first.slug);
		expect(getCollective("no-such-collective")).toBeUndefined();
	});

	it("gives every collective a reason, not just a list", () => {
		// The difference between a collective and a group is editorial
		// intent. One without a stated reason is a group with extra steps.
		for (const collective of COLLECTIVES) {
			expect(collective.why.length).toBeGreaterThan(20);
		}
	});
});
