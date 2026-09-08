import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeatureStrip } from "@/design/families/FeatureStrip";

const ITEMS = [
	{ label: "Local", body: "Files never leave the device." },
	{ label: "Fast", body: "No round trip to a server." },
	{ label: "Private", body: "No account, no telemetry." },
	{ label: "Offline", body: "Works with the network off." },
	{ label: "Honest", body: "Fidelity is stated, not implied." },
];

describe("FeatureStrip", () => {
	it("renders one column per item", () => {
		const { container } = render(<FeatureStrip items={ITEMS} />);
		expect(container.querySelectorAll("[data-feature]").length).toBe(5);
	});

	it("splits emphasis between an ink label and a muted clause", () => {
		render(<FeatureStrip items={ITEMS} />);
		const label = screen.getByText("Local");
		const body = screen.getByText("Files never leave the device.");
		expect(label.style.color).toBe("var(--ink)");
		expect(body.style.color).toBe("var(--ink-muted)");
	});

	it("gives the cards no border, no radius and no background", () => {
		// v2: transparent card background, no border, zero radius,
		// edge-bleeding media.
		const { container } = render(<FeatureStrip items={ITEMS} />);
		const card = container.querySelector("[data-feature]") as HTMLElement;
		expect(card.style.background).toBe("transparent");
		expect(card.style.border).toBe("");
		expect(card.style.borderRadius).toBe("");
		expect(card.style.padding).toBe("");
	});

	it("declares five equal columns through a custom property rather than a literal", () => {
		const { container } = render(<FeatureStrip items={ITEMS} />);
		const grid = container.querySelector("[data-feature-strip]") as HTMLElement;
		// The template routes through `--strip-cols` rather than a literal
		// `repeat(5, ...)`, so a media query can change the column count later.
		expect(grid.style.gridTemplateColumns).toBe(
			"repeat(var(--strip-cols), minmax(0, 1fr))",
		);
		// And -- this is the part that is easy to get wrong -- the grid must
		// NOT set `--strip-cols` on itself. An inline value on this element
		// would outrank any external rule that later targets this same
		// element for this same property, media query or not, exactly as it
		// would for any other property, defeating the responsive collapse in
		// `families.css` just as thoroughly as a literal inline
		// `grid-template-columns` did. The default has to come from
		// inheritance instead.
		expect(grid.style.getPropertyValue("--strip-cols")).toBe("");
	});

	it("declares the default column count in tokens.css, where the grid inherits it from", () => {
		const tokens = readFileSync("src/design/tokens.css", "utf8");
		expect(tokens).toMatch(/--strip-cols:\s*5;/);
	});
});
