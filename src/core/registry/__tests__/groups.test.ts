import { describe, expect, it } from "vitest";
import { TOOLS } from "@/core/registry";
import { deriveFormatGroups, deriveTaskGroups } from "@/core/registry/groups";

describe("deriveFormatGroups", () => {
	it("groups every tool under each format it accepts or emits", () => {
		const groups = deriveFormatGroups();
		const png = groups.find((g) => g.format === "png");
		expect(png).toBeDefined();
		expect(png?.tools.length).toBeGreaterThan(1);
	});

	it("lists a tool under both its input and its output format", () => {
		// png-to-webp belongs in the png group and the webp group. A group
		// keyed on input alone would hide half the answer to "what can I do
		// with a webp file?".
		const groups = deriveFormatGroups();
		const ids = (f: string) =>
			groups.find((g) => g.format === f)?.tools.map((t) => t.id) ?? [];
		const both = ids("png").filter((id) => ids("webp").includes(id));
		expect(both.length).toBeGreaterThan(0);
	});

	it("emits no empty group", () => {
		for (const group of deriveFormatGroups()) {
			expect(group.tools.length).toBeGreaterThan(0);
		}
	});

	it("returns formats sorted, so routes are stable between builds", () => {
		const formats = deriveFormatGroups().map((g) => g.format);
		expect([...formats].sort()).toEqual(formats);
	});
});

describe("deriveTaskGroups", () => {
	it("groups tools by kind and omits kinds no tool declares", () => {
		const groups = deriveTaskGroups();
		const kinds = groups.map((g) => g.kind);
		expect(kinds).toContain("convert");
		// `inspect` is in the schema but no tool uses it — a route for it
		// would list nothing.
		expect(kinds).not.toContain("inspect");
		for (const group of groups) expect(group.tools.length).toBeGreaterThan(0);
	});

	it("accounts for every tool exactly once", () => {
		const total = deriveTaskGroups().reduce((n, g) => n + g.tools.length, 0);
		expect(total).toBe(TOOLS.length);
	});
});
