import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Radar from "../Radar";

describe("Radar", () => {
	it("renders an aria-hidden backdrop container that fills its parent", () => {
		const { container } = render(<Radar />);
		const backdrop = container.querySelector('[aria-hidden="true"]');
		expect(backdrop).not.toBeNull();
		expect(backdrop?.getAttribute("style")).toContain("width: 100%");
		expect(backdrop?.getAttribute("style")).toContain("height: 100%");
	});

	it("renders nothing WebGL-dependent without a context (no throw)", () => {
		// happy-dom provides no WebGL context, so the effect must bail
		// before touching ogl -- the container div is all that remains.
		const { container } = render(<Radar brightness={0.5} />);
		expect(container.querySelector("canvas")).toBeNull();
	});
});
