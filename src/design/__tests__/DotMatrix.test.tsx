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
		expect(grain.style.backgroundImage).toContain("var(--rule)");
		expect(grain.style.backgroundImage).toContain("radial-gradient");
	});
});
