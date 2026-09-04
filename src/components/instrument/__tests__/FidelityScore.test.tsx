import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { fidelityState, initialQuality } from "@/core/quality";
import { pngToJpg } from "@/core/registry/tools/png-to-jpg";
import { pngToWebp } from "@/core/registry/tools/png-to-webp";
import { FidelityScore, type FidelityState } from "../FidelityScore";

function ringPath(container: HTMLElement): SVGPathElement | null {
	// The <circle> is the neutral track; the <path> carries the score.
	return container.querySelector("path");
}

/**
 * Counts elliptical-arc ("A") commands in a path's `d` attribute.
 *
 * A single arc spanning 360 degrees has identical start and end points,
 * which real SVG renderers treat as a no-op and draw nothing — but the
 * string still contains the letter "A", so a presence check (`toContain`)
 * cannot tell a correct two-half-arc full sweep from a broken single-arc
 * one. Counting is the only way to see the difference.
 */
function arcCommandCount(d: string): number {
	return d.match(/A /g)?.length ?? 0;
}

describe("FidelityScore", () => {
	it("renders the rounded score as text", () => {
		render(
			<FidelityScore
				score={92.4}
				label="VISUALLY LOSSLESS"
				fidelity="visually-lossless"
			/>,
		);
		expect(screen.getByText("92")).toBeDefined();
	});

	it("clamps a score above 100 down to 100", () => {
		render(<FidelityScore score={140} label="LOSSLESS" fidelity="lossless" />);
		expect(screen.getByText("100")).toBeDefined();
	});

	it("clamps a score below 0 up to 0", () => {
		render(<FidelityScore score={-20} label="LOSSY · Q0" fidelity="lossy" />);
		expect(screen.getByText("0")).toBeDefined();
	});

	it("exposes role=img with a label containing the score and the given label", () => {
		render(
			<FidelityScore
				score={92}
				label="VISUALLY LOSSLESS"
				fidelity="visually-lossless"
			/>,
		);
		const el = screen.getByRole("img");
		expect(el.getAttribute("aria-label")).toContain("92");
		expect(el.getAttribute("aria-label")).toContain("VISUALLY LOSSLESS");
	});
});

describe("monochrome state encoding", () => {
	it("draws every score in the same ink, so colour encodes nothing", () => {
		const strokes = [100, 92, 55, 10].map((score) => {
			const { container } = render(
				<FidelityScore score={score} label={`Q${score}`} fidelity="lossless" />,
			);
			return ringPath(container)?.getAttribute("stroke");
		});
		expect(strokes).toEqual([
			"var(--ink)",
			"var(--ink)",
			"var(--ink)",
			"var(--ink)",
		]);
	});

	function dashArray(
		score: number,
		fidelity: FidelityState,
	): string | null | undefined {
		const { container } = render(
			<FidelityScore score={score} label="—" fidelity={fidelity} />,
		);
		return ringPath(container)?.getAttribute("stroke-dasharray");
	}

	it("draws a solid ring only for the two states that gave nothing visible up", () => {
		expect(dashArray(100, "lossless")).toBeNull();
		expect(dashArray(92, "visually-lossless")).toBeNull();
	});

	it("breaks the ring for both lossy states, whatever the score says", () => {
		// The scores here are the point. 78 and 92 sit high on the dial and
		// a numeric threshold would draw them solid — but a quantised JPEG
		// gave something up, and a solid ring in this design system is a
		// claim that nothing was.
		expect(dashArray(78, "lossy")).not.toBeNull();
		expect(dashArray(92, "inherently-lossy")).not.toBeNull();
		expect(dashArray(99, "inherently-lossy")).not.toBeNull();
		expect(dashArray(10, "lossy")).not.toBeNull();
	});

	it("dashes the ring the shipped default JPEG conversion actually draws", () => {
		// Not a hand-picked state: this is `balanced`, the default preset of
		// the most-used conversion on the site, read straight out of the
		// registry. It scores 78 — the exact case the old numeric threshold
		// drew solid.
		const quality = initialQuality(pngToJpg);
		expect(dashArray(78, fidelityState(pngToJpg, quality))).not.toBeNull();
	});

	it("leaves the shipped default WebP conversion solid, because it is lossless", () => {
		const quality = initialQuality(pngToWebp);
		expect(dashArray(100, fidelityState(pngToWebp, quality))).toBeNull();
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
				<FidelityScore score={score} label={`Q${score}`} fidelity="lossless" />,
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
			<FidelityScore score={100} label="LOSSLESS" fidelity="lossless" />,
		);
		const fullD = full.querySelector("path")?.getAttribute("d") ?? "";
		// Not `.toContain("A")`: a single 360-degree arc also contains the
		// letter "A" and would pass that check while rendering an empty ring
		// in a real browser (identical start/end points are a no-op there).
		// A full sweep is only correct if it is drawn as two half-arcs.
		expect(arcCommandCount(fullD)).toBe(2);

		const { container: empty } = render(
			<FidelityScore score={0} label="LOSSY · Q0" fidelity="lossy" />,
		);
		expect(empty.querySelector("path")).toBeNull();
	});

	it("sweeps clockwise from twelve o'clock, pinned by hand at a quarter turn", () => {
		// Values below are derived from the component's own documented
		// contract (default size 36, strokeWidth = size*0.1, radius =
		// size/2 - strokeWidth/2 - 1), not copied from whatever the
		// component currently prints — a copied value would pin a sign or
		// sweep-flag bug in place instead of catching it.
		//
		// size 36 -> strokeWidth 3.6 -> radius 18 - 1.8 - 1 = 15.2, center 18.
		// A quarter sweep (score 25) runs clockwise from twelve o'clock,
		// (18, 18-15.2) = (18, 2.8), to three o'clock, (18+15.2, 18) =
		// (33.2, 18). Nothing before this test inspected the sweep flag or
		// either endpoint, so flipping the sign of the sine term or the
		// sweep flag from 1 to 0 — which reverses the ring — passed every
		// existing assertion.
		const center = 18;
		const radius = 15.2;
		const expectedStartX = center;
		const expectedStartY = center - radius; // 2.8, modulo float noise
		const expectedEndX = center + radius; // 33.2
		const expectedEndY = center; // 18

		const { container } = render(
			<FidelityScore score={25} label="Q25" fidelity="lossless" />,
		);
		const d = ringPath(container)?.getAttribute("d") ?? "";

		expect(arcCommandCount(d)).toBe(1);

		const match = d.match(
			/^M ([\d.]+) ([\d.]+) A ([\d.]+) ([\d.]+) 0 (\d) (\d) ([\d.]+) ([\d.]+)$/,
		);
		if (match === null) {
			throw new Error(`path "d" did not match the expected arc shape: ${d}`);
		}
		const [, startX, startY, rx, ry, largeArc, sweep, endX, endY] = match;

		expect(Number(startX)).toBe(expectedStartX);
		// The unrounded start point can carry IEEE-754 subtraction noise
		// (e.g. 2.8000000000000007), which is a separate, already-recorded
		// concern — toBeCloseTo tolerates that noise without hiding a real
		// sign or magnitude error.
		expect(Number(startY)).toBeCloseTo(expectedStartY, 9);
		expect(Number(rx)).toBe(radius);
		expect(Number(ry)).toBe(radius);
		expect(largeArc).toBe("0");
		// The bit that a presence-only check on "A" could never catch: drawn
		// backwards, this same quarter sweep would still produce one arc
		// command and a plausible-looking endpoint, just on the wrong side.
		expect(sweep).toBe("1");
		expect(Number(endX)).toBe(expectedEndX);
		expect(Number(endY)).toBe(expectedEndY);
	});
});
