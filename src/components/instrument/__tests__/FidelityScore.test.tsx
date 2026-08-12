import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FidelityScore } from "../FidelityScore";

function ringStroke(container: HTMLElement): string | null {
	const circles = container.querySelectorAll("circle");
	// The first circle is the neutral track; the second carries the score.
	return circles[1]?.getAttribute("stroke") ?? null;
}

describe("FidelityScore", () => {
	it("renders the rounded score as text", () => {
		render(<FidelityScore score={92.4} label="VISUALLY LOSSLESS" />);
		expect(screen.getByText("92")).toBeDefined();
	});

	it("clamps a score above 100 down to 100", () => {
		render(<FidelityScore score={140} label="LOSSLESS" />);
		expect(screen.getByText("100")).toBeDefined();
	});

	it("clamps a score below 0 up to 0", () => {
		render(<FidelityScore score={-20} label="LOSSY · Q0" />);
		expect(screen.getByText("0")).toBeDefined();
	});

	it("exposes role=img with a label containing the score and the given label", () => {
		render(<FidelityScore score={92} label="VISUALLY LOSSLESS" />);
		const el = screen.getByRole("img");
		expect(el.getAttribute("aria-label")).toContain("92");
		expect(el.getAttribute("aria-label")).toContain("VISUALLY LOSSLESS");
	});

	it("produces a distinct stroke colour at 100, 92, 55, and 10", () => {
		const { container: c100 } = render(
			<FidelityScore score={100} label="LOSSLESS" />,
		);
		const { container: c92 } = render(
			<FidelityScore score={92} label="VISUALLY LOSSLESS" />,
		);
		const { container: c55 } = render(
			<FidelityScore score={55} label="LOSSY · Q55" />,
		);
		const { container: c10 } = render(
			<FidelityScore score={10} label="LOSSY · Q10" />,
		);

		const colors = [c100, c92, c55, c10].map((c) => ringStroke(c));
		expect(colors).toEqual([
			"color-mix(in oklab, var(--signal) 100%, var(--lossy))",
			"color-mix(in oklab, var(--signal) 68%, var(--lossy))",
			"color-mix(in oklab, var(--lossy) 73.33%, var(--error))",
			"color-mix(in oklab, var(--lossy) 13.33%, var(--error))",
		]);

		// Every one of the four must be unique — no two scores collapse to
		// the same colour.
		expect(new Set(colors).size).toBe(4);
	});

	it("resolves to pure --lossy at the boundary score of 75", () => {
		// 75 falls on the >=75 branch, so it is expressed as 0% signal mixed
		// into --lossy — visually identical to, but not the same expression
		// as, 100% --lossy mixed into --error from the other branch.
		const { container } = render(
			<FidelityScore score={75} label="LOSSY · Q75" />,
		);
		expect(ringStroke(container)).toBe(
			"color-mix(in oklab, var(--signal) 0%, var(--lossy))",
		);
	});
});
