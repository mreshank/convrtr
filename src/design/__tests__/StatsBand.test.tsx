import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StatsBand } from "@/design/families/StatsBand";

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("StatsBand", () => {
	it("renders every stat label with its formatted value", () => {
		// Reduced motion renders CountUp finals immediately -- no rAF wait.
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: true,
				media: "(prefers-reduced-motion: reduce)",
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			})),
		);
		render(
			<StatsBand
				stats={[
					{ value: 204, label: "TOOLS, ALL CLIENT-SIDE" },
					{ value: 0, label: "SERVERS IN PRODUCTION" },
				]}
			/>,
		);
		expect(screen.getByText("TOOLS, ALL CLIENT-SIDE")).toBeDefined();
		expect(screen.getByText("204")).toBeDefined();
		expect(screen.getByText("SERVERS IN PRODUCTION")).toBeDefined();
		expect(screen.getByText("0")).toBeDefined();
	});

	it("renders nothing for no stats", () => {
		const { container } = render(<StatsBand stats={[]} />);
		expect(container.textContent).toBe("");
	});
});
