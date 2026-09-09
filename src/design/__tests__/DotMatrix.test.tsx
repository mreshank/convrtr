import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DotMatrix } from "@/design/families/DotMatrix";

describe("DotMatrix", () => {
	it("renders its children", () => {
		render(
			<DotMatrix>
				<button type="button">click me</button>
			</DotMatrix>,
		);
		expect(screen.getByRole("button", { name: "click me" })).toBeDefined();
	});

	it("never intercepts pointer events", () => {
		// The grain sits above the content it textures. Without this the band
		// it covers stops taking clicks, and no DOM assertion would see it.
		const { container } = render(
			<DotMatrix>
				<span>x</span>
			</DotMatrix>,
		);
		const grain = container.querySelector("[data-grain]") as HTMLElement;
		expect(grain.style.pointerEvents).toBe("none");
	});

	it("hides the grain from assistive technology", () => {
		// It is texture. A screen reader has nothing to say about it.
		const { container } = render(
			<DotMatrix>
				<span>x</span>
			</DotMatrix>,
		);
		const grain = container.querySelector("[data-grain]") as HTMLElement;
		expect(grain.getAttribute("aria-hidden")).toBe("true");
	});

	it("draws the lattice from a token, not a literal", () => {
		const { container } = render(
			<DotMatrix>
				<span>x</span>
			</DotMatrix>,
		);
		const grain = container.querySelector("[data-grain]") as HTMLElement;
		expect(grain.style.backgroundImage).toContain("var(--rule-subtle)");
		expect(grain.style.backgroundImage).toContain("radial-gradient");
	});

	it("draws the lattice from --rule-subtle, not the stronger --rule", () => {
		// The regression this pins: `--ink-muted` (#94979e), measured against
		// the actual composited pixels behind it, is 4.39:1 over `--rule`
		// (#303236) -- under the 4.5:1 AA floor -- and 6.01:1 over
		// `--rule-subtle` (#18191b). The grain is painted OVER every band's
		// text, so its own colour is a contrast pair with that text, not a
		// free-standing decoration. `--rule` is a real border value for
		// structure someone is meant to see; drawing a background grain in
		// it instead of the near-invisible `--rule-subtle` was the defect.
		const { container } = render(
			<DotMatrix>
				<span>x</span>
			</DotMatrix>,
		);
		const grain = container.querySelector("[data-grain]") as HTMLElement;
		expect(grain.style.backgroundImage).not.toMatch(/var\(--rule\)/);
	});
});
