import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FidelityScore } from "../FidelityScore";

function ringPath(container: HTMLElement): SVGPathElement | null {
	// The <circle> is the neutral track; the <path> carries the score.
	return container.querySelector("path");
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
});

describe("monochrome state encoding", () => {
	it("draws every score in the same ink, so colour encodes nothing", () => {
		const strokes = [100, 92, 55, 10].map((score) => {
			const { container } = render(
				<FidelityScore score={score} label={`Q${score}`} />,
			);
			return ringPath(container)?.getAttribute("stroke");
		});
		expect(strokes).toEqual([
			"var(--text-primary)",
			"var(--text-primary)",
			"var(--text-primary)",
			"var(--text-primary)",
		]);
	});

	it("draws a solid ring at and above the lossy threshold", () => {
		for (const score of [75, 92, 100]) {
			const { container } = render(
				<FidelityScore score={score} label={`Q${score}`} />,
			);
			expect(ringPath(container)?.getAttribute("stroke-dasharray")).toBeNull();
		}
	});

	it("breaks the ring into dashes below the lossy threshold", () => {
		for (const score of [74, 55, 10]) {
			const { container } = render(
				<FidelityScore score={score} label={`Q${score}`} />,
			);
			expect(
				ringPath(container)?.getAttribute("stroke-dasharray"),
			).not.toBeNull();
		}
	});

	it("sets the large-arc flag only once the sweep passes halfway", () => {
		// happy-dom implements no SVG geometry, so the sweep cannot be
		// measured — but it can be read off the arc command itself. In
		// `A rx ry rot large-arc sweep x y`, the fourth parameter is 1 only
		// when the arc exceeds 180 degrees. That single bit is the whole
		// difference between a ring drawn the short way round and the long
		// way round, and getting it backwards is the classic arc bug.
		const largeArcFlag = (score: number): string | undefined => {
			const { container } = render(
				<FidelityScore score={score} label={`Q${score}`} />,
			);
			const d = ringPath(container)?.getAttribute("d") ?? "";
			return d.match(/A [\d.]+ [\d.]+ 0 (\d)/)?.[1];
		};
		expect(largeArcFlag(80)).toBe("1"); // 288 degrees — the long way
		expect(largeArcFlag(40)).toBe("0"); // 144 degrees — the short way
		expect(largeArcFlag(50)).toBe("0"); // exactly 180 — not yet "large"
	});

	it("draws a full ring at 100 and no ring at 0", () => {
		const { container: full } = render(
			<FidelityScore score={100} label="LOSSLESS" />,
		);
		expect(full.querySelector("path")?.getAttribute("d")).toContain("A");

		const { container: empty } = render(
			<FidelityScore score={0} label="LOSSY · Q0" />,
		);
		expect(empty.querySelector("path")).toBeNull();
	});
});
