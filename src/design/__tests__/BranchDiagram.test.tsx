import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BranchDiagram, branchPath } from "@/design/families/BranchDiagram";

describe("branchPath", () => {
	// The arithmetic is checked here rather than the rendered shape, because
	// happy-dom parses a `d` attribute and draws nothing. A test asserting
	// the path is non-empty would pass for every wrong path there is.
	it("puts a single branch on the centre line", () => {
		// One branch, height 100: it should end at y = 50, dead centre.
		expect(branchPath(0, 1, 200, 100)).toBe("M 0 50 H 100 V 50 H 200");
	});

	it("spaces branches evenly, each in the middle of its own band", () => {
		// Two branches, height 100: bands are 0-50 and 50-100, so the
		// midpoints are 25 and 75.
		expect(branchPath(0, 2, 200, 100)).toBe("M 0 50 H 100 V 25 H 200");
		expect(branchPath(1, 2, 200, 100)).toBe("M 0 50 H 100 V 75 H 200");
	});

	it("elbows at the horizontal midpoint", () => {
		// The trunk runs to width/2 before turning, so every branch shares
		// the same vertical spine.
		expect(branchPath(0, 4, 400, 200)).toContain("H 200 V");
	});

	it("keeps every endpoint inside the box", () => {
		for (let i = 0; i < 6; i++) {
			const d = branchPath(i, 6, 300, 120);
			const y = Number(d.split("V ")[1]?.split(" ")[0]);
			expect(y).toBeGreaterThan(0);
			expect(y).toBeLessThan(120);
		}
	});
});

describe("BranchDiagram", () => {
	it("draws one path per output", () => {
		const { container } = render(
			<BranchDiagram from="heic" to={["jpg", "png", "webp"]} />,
		);
		expect(container.querySelectorAll("path").length).toBe(3);
	});

	it("labels the input and every output as real text", () => {
		// The lines are geometry; the format names are the content. They must
		// be readable without the SVG rendering at all.
		render(<BranchDiagram from="heic" to={["jpg", "png"]} />);
		expect(screen.getByText("HEIC")).toBeDefined();
		expect(screen.getByText("JPG")).toBeDefined();
		expect(screen.getByText("PNG")).toBeDefined();
	});

	it("strokes the lines with a token and fills nothing", () => {
		const { container } = render(<BranchDiagram from="heic" to={["jpg"]} />);
		const path = container.querySelector("path") as SVGPathElement;
		expect(path.getAttribute("stroke")).toBe("var(--rule)");
		expect(path.getAttribute("fill")).toBe("none");
	});

	it("hides the drawing from assistive technology, since the text carries it", () => {
		const { container } = render(<BranchDiagram from="heic" to={["jpg"]} />);
		expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
			"true",
		);
	});

	it("renders nothing when there is nowhere to branch to", () => {
		const { container } = render(<BranchDiagram from="nosuch" to={[]} />);
		expect(container.firstElementChild).toBeNull();
	});
});
