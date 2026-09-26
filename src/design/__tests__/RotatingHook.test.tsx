import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RotatingHook } from "@/design/primitives/RotatingHook";

function mockReducedMotion(matches: boolean) {
	vi.stubGlobal(
		"matchMedia",
		vi.fn(() => ({
			matches,
			media: "(prefers-reduced-motion: reduce)",
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})),
	);
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("RotatingHook", () => {
	it("opens on the first hook line", () => {
		mockReducedMotion(true);
		render(<RotatingHook lines={["First hook.", "Second hook."]} />);
		expect(screen.getByText("First hook.")).toBeDefined();
	});

	it("advances to the next line on its interval", () => {
		mockReducedMotion(false);
		vi.useFakeTimers();
		try {
			render(
				<RotatingHook lines={["First hook.", "Second hook."]} intervalMs={3000} />,
			);
			expect(screen.getByText("First hook.")).toBeDefined();
			act(() => {
				vi.advanceTimersByTime(3000);
			});
			act(() => {
				vi.advanceTimersByTime(150);
			});
			expect(screen.getByText("Second hook.")).toBeDefined();
		} finally {
			vi.useRealTimers();
		}
	});

	it("holds the first line under reduced motion", () => {
		mockReducedMotion(true);
		const spy = vi.spyOn(window, "setInterval");
		render(<RotatingHook lines={["First hook.", "Second hook."]} />);
		expect(screen.getByText("First hook.")).toBeDefined();
		expect(spy).not.toHaveBeenCalled();
	});

	it("renders nothing for no lines", () => {
		mockReducedMotion(true);
		const { container } = render(<RotatingHook lines={[]} />);
		expect(container.textContent).toBe("");
	});
});
