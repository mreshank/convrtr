import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AsymCard } from "@/design/primitives/AsymCard";

describe("AsymCard", () => {
	it("applies DESIGN.md's three radius patterns", () => {
		const radii = (variant: "a" | "b" | "c") => {
			const { container } = render(
				<AsymCard variant={variant}>
					<span>x</span>
				</AsymCard>,
			);
			return (container.firstElementChild as HTMLElement).style;
		};

		expect(radii("a").borderTopLeftRadius).toBe("var(--radius-card-lg)");
		expect(radii("b").borderTopRightRadius).toBe("var(--radius-card-lg)");
		expect(radii("b").borderBottomLeftRadius).toBe("var(--radius-card)");
		expect(radii("c").borderRadius).toBe("var(--radius-card)");
	});

	it("uses only radius tokens, never literal pixels", () => {
		// The design-system sweep allows {0,4,40,100}; writing them as
		// literals here would pass that sweep and still fork the source of
		// truth for the card system.
		const { container } = render(
			<AsymCard variant="a">
				<span>x</span>
			</AsymCard>,
		);
		const style = (container.firstElementChild as HTMLElement).getAttribute(
			"style",
		);
		expect(style).not.toMatch(/\d+px/);
	});

	it("carries the requested aspect ratio", () => {
		const { container } = render(
			<AsymCard variant="a" aspect="5/7">
				<span>x</span>
			</AsymCard>,
		);
		// CSSOM always serialises a <ratio> with spaces around the slash on
		// readback — verified directly against this project's DOM
		// environment (happy-dom), and matching real-browser behaviour for
		// the same property: `el.style.aspectRatio = "5/7"` reads back as
		// "5 / 7" regardless of how it was set (property, attribute, or
		// cssText). The brief's literal expectation of "5/7" can never pass
		// here — no component implementation changes what the browser's own
		// CSSStyleDeclaration returns — so the assertion is corrected to the
		// normalised form rather than contorting AsymCard around it.
		expect((container.firstElementChild as HTMLElement).style.aspectRatio).toBe(
			"5 / 7",
		);
	});
});
