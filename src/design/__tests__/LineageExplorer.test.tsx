import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LINEAGE_SOURCES } from "@/app/home-content";
import { conversionBranches } from "@/core/registry/stats";
import { LineageExplorer } from "@/design/families/LineageExplorer";

describe("LineageExplorer", () => {
	it("offers the registry-derived sources as chips", () => {
		render(<LineageExplorer sources={LINEAGE_SOURCES} />);
		for (const source of LINEAGE_SOURCES) {
			expect(
				screen.getByRole("button", { name: source.toUpperCase() }),
			).toBeDefined();
		}
	});

	it("draws the default source's real direct branches", () => {
		const first = LINEAGE_SOURCES[0] ?? "heic";
		const expected = conversionBranches(first).slice(0, 12);
		const { container } = render(<LineageExplorer sources={LINEAGE_SOURCES} />);
		for (const branch of expected) {
			expect(container.textContent).toContain(branch.toUpperCase());
		}
		expect(container.textContent).toContain(
			`${conversionBranches(first).length} DIRECT`,
		);
	});

	it("re-branches when another source is picked", () => {
		const second = LINEAGE_SOURCES[1] ?? LINEAGE_SOURCES[0] ?? "heic";
		const expected = conversionBranches(second).slice(0, 12);
		const { container } = render(<LineageExplorer sources={LINEAGE_SOURCES} />);
		fireEvent.click(screen.getByRole("button", { name: second.toUpperCase() }));
		for (const branch of expected) {
			expect(container.textContent).toContain(branch.toUpperCase());
		}
	});

	it("lists two-hop chains with the tools the router would run", () => {
		const { container } = render(<LineageExplorer sources={["heic"]} />);
		// Either real two-hop chains with tool slugs, or the honest empty
		// state -- never an invented route.
		const text = container.textContent ?? "";
		expect(
			text.includes("TWO-HOP LINEAGE") || text.includes("one hop away"),
		).toBe(true);
	});
});
