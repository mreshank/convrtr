import { fireEvent, render, screen } from "@testing-library/react";
import { assert, beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildConversionGraph,
	fitTransform,
	layoutConversionGraph,
} from "@/core/registry/conversion-graph";
import { LineageExplorer } from "@/design/families/LineageExplorer";

function mockCanvas2d() {
	const stub = new Proxy(
		{},
		{
			get: (_target, prop) => {
				if (prop === "canvas") return {};
				return vi.fn();
			},
			set: () => true,
		},
	);
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
		stub as unknown as CanvasRenderingContext2D,
	);
}

function mockSize(width: number) {
	function MockObserver(callback: ResizeObserverCallback) {
		callback(
			[{ contentRect: { width } } as unknown as ResizeObserverEntry],
			{} as unknown as ResizeObserver,
		);
		return { observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() };
	}
	vi.stubGlobal("ResizeObserver", MockObserver);
	vi.spyOn(
		HTMLCanvasElement.prototype,
		"getBoundingClientRect",
	).mockReturnValue({
		left: 0,
		top: 0,
		width,
		height: 440,
		right: width,
		bottom: 440,
		x: 0,
		y: 0,
		toJSON: () => ({}),
	});
}

beforeEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	mockCanvas2d();
});

describe("LineageExplorer", () => {
	it("renders source chips and a labelled canvas", () => {
		render(<LineageExplorer sources={["jpg", "png"]} />);
		expect(screen.getByRole("button", { name: "JPG" })).toBeDefined();
		expect(screen.getByRole("button", { name: "PNG" })).toBeDefined();
		const canvas = screen.getByRole("img", {
			name: /Conversion graph for JPG/,
		});
		expect(canvas.textContent).toBe("");
		expect(canvas.getAttribute("aria-label")).toMatch(/operations/);
	});

	it("re-centers the walk when another source is picked", () => {
		render(<LineageExplorer sources={["jpg", "png"]} />);
		fireEvent.click(screen.getByRole("button", { name: "PNG" }));
		expect(
			screen.getByRole("img", { name: /Conversion graph for PNG/ }),
		).toBeDefined();
	});

	it("legends the operation kinds present in the walk", () => {
		const { container } = render(<LineageExplorer sources={["jpg"]} />);
		expect(container.textContent).toContain("CONVERT");
	});

	it("selects the root node on canvas click and offers a walk onward", () => {
		mockSize(800);
		const { container } = render(<LineageExplorer sources={["jpg"]} />);
		// Mirror the component's own fit to land the click on the root
		// format node (depth 0 sits alone in its column at y 0).
		const placed = layoutConversionGraph(buildConversionGraph("jpg", 2));
		const t = fitTransform(placed, 800, 440);
		const root = placed.find((n) => n.id === "fmt:jpg");
		assert(root, "expected the jpg root node");
		const clientX = root.x * t.k + t.x + 4;
		const clientY = root.y * t.k + t.y + 4;

		const canvas = screen.getByRole("img", {
			name: /Conversion graph for JPG/,
		});
		fireEvent.pointerDown(canvas, { clientX, clientY, pointerId: 1 });
		fireEvent.pointerUp(canvas, { clientX, clientY, pointerId: 1 });

		expect(container.textContent).toContain("FORMAT · JPG");
		expect(screen.getByRole("button", { name: "Walk PNG ➔" })).toBeDefined();
	});
});
