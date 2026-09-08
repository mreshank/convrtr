import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroBand } from "@/design/families/HeroBand";

const PROPS = {
	lead: "Convert files in your browser.",
	cont: "Nothing is uploaded.",
	cta: { href: "/tools", label: "Start converting" },
	secondary: { href: "/how-it-works", label: "How it works" },
};

describe("HeroBand", () => {
	it("makes the headline the page's h1", () => {
		render(<HeroBand {...PROPS} />);
		expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
	});

	it("fills the primary pill and only outlines the secondary", () => {
		// v2: the outline variant is secondary, never primary. Swapping them
		// inverts the emphasis of the first screen.
		render(<HeroBand {...PROPS} />);
		const primary = screen.getByRole("link", { name: PROPS.cta.label });
		const secondary = screen.getByRole("link", { name: PROPS.secondary.label });
		expect(primary.style.background).toBe("var(--ink)");
		expect(primary.style.color).toBe("var(--ground)");
		expect(secondary.style.background).toBe("transparent");
		// Longhands, not the `border` shorthand: a shorthand whose parts are
		// all var() cannot be reparsed into its components and round-trips
		// through the CSSOM as `var(--rule) var(--rule) var(--rule)` --
		// see SiteHeader.tsx:67 -- so a `.toContain("var(--rule)")` on
		// `.style.border` would pass on that mangled string without proving
		// the border is actually drawn from `--rule`.
		expect(secondary.style.borderWidth).toBe("var(--rule-width)");
		expect(secondary.style.borderStyle).toBe("solid");
		expect(secondary.style.borderColor).toBe("var(--rule)");
	});

	it("gives both pills full pill corners and v2's height", () => {
		render(<HeroBand {...PROPS} />);
		for (const label of [PROPS.cta.label, PROPS.secondary.label]) {
			const pill = screen.getByRole("link", { name: label });
			expect(pill.style.borderRadius).toBe("var(--radius-pill)");
			expect(pill.style.height).toBe("44px");
		}
	});

	it("never outlines a mint call to action", () => {
		// Mint means two things and shape keeps them apart: a CTA is a mint
		// pill FILL, the lossless fidelity ring is a mint stroke TINT.
		// Outlining a CTA in mint collapses the distinction.
		render(<HeroBand {...PROPS} />);
		for (const link of screen.getAllByRole("link")) {
			if (link.style.borderColor?.includes("--accent")) {
				throw new Error(`mint used as a stroke on a CTA: ${link.textContent}`);
			}
		}
	});

	it("renders the chart without making it the page's headline", () => {
		const { container } = render(<HeroBand {...PROPS} />);
		expect(container.querySelectorAll("[data-bar]").length).toBeGreaterThan(0);
	});
});
