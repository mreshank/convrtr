import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeatureGrid } from "@/design/families/FeatureGrid";

const ITEMS = [
	{ label: "No upload", body: "Conversion runs in the page." },
	{ label: "No account", body: "Nothing to sign up for." },
	{ label: "No telemetry", body: "No analytics beacon." },
	{ label: "Stated fidelity", body: "Lossless is labelled lossless." },
	{ label: "Open formats", body: "Every extension in and out." },
	{ label: "Offline", body: "Cached and usable with no network." },
];

describe("FeatureGrid", () => {
	it("renders six cells in three columns, routed through a custom property", () => {
		const { container } = render(<FeatureGrid items={ITEMS} />);
		expect(container.querySelectorAll("[data-cell]").length).toBe(6);
		const grid = container.querySelector("[data-feature-grid]") as HTMLElement;
		// The template routes through `--grid-cols` rather than a literal
		// `repeat(3, ...)`, so a media query can change the column count later.
		expect(grid.style.gridTemplateColumns).toBe(
			"repeat(var(--grid-cols), minmax(0, 1fr))",
		);
		// And -- this is the part that is easy to get wrong -- the grid must
		// NOT set `--grid-cols` on itself. An inline value on this element
		// would outrank any external rule that later targets this same
		// element for this same property, media query or not, defeating the
		// responsive collapse in `families.css` just as thoroughly as a
		// literal inline `grid-template-columns` would. The default has to
		// come from inheritance instead.
		expect(grid.style.getPropertyValue("--grid-cols")).toBe("");
	});

	it("declares the default column count in tokens.css, where the grid inherits it from", () => {
		const tokens = readFileSync("src/design/tokens.css", "utf8");
		expect(tokens).toMatch(/--grid-cols:\s*3;/);
	});

	it("keeps every cell square and transparent", () => {
		// v2's guardrail names this one directly: never round the
		// feature-grid cards, 0px radius is structural.
		const { container } = render(<FeatureGrid items={ITEMS} />);
		for (const cell of container.querySelectorAll("[data-cell]")) {
			const el = cell as HTMLElement;
			expect(el.style.borderRadius).toBe("");
			expect(el.style.background).toBe("transparent");
		}
	});

	it("tints the glyph with mint and leaves it a glyph, not a fill", () => {
		const { container } = render(<FeatureGrid items={ITEMS} />);
		const glyph = container.querySelector("[data-glyph]") as HTMLElement;
		expect(glyph.style.color).toBe("var(--accent)");
		expect(glyph.style.background).toBe("");
	});

	it("hides the glyphs from assistive technology", () => {
		// They are decoration above a real label; announcing them adds noise.
		const { container } = render(<FeatureGrid items={ITEMS} />);
		for (const glyph of container.querySelectorAll("[data-glyph]")) {
			expect(glyph.getAttribute("aria-hidden")).toBe("true");
		}
	});

	it("splits emphasis between label and body", () => {
		render(<FeatureGrid items={ITEMS} />);
		expect(screen.getByText("No upload").style.color).toBe("var(--ink)");
		expect(screen.getByText("Conversion runs in the page.").style.color).toBe(
			"var(--ink-muted)",
		);
	});

	it("carries no call to action, because the grid is informational", () => {
		const { container } = render(<FeatureGrid items={ITEMS} />);
		expect(container.querySelectorAll("a, button").length).toBe(0);
	});
});
