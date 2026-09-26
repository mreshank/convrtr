import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CountUp } from "@/design/primitives/CountUp";
import { ScrollReveal } from "@/design/primitives/ScrollReveal";

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

describe("CountUp", () => {
	it("renders the final formatted number under reduced motion", () => {
		mockReducedMotion(true);
		render(<CountUp end={1424} />);
		expect(screen.getByText("1,424")).toBeDefined();
	});

	it("exposes the raw value as its accessible name", () => {
		mockReducedMotion(true);
		render(<CountUp end={1424} />);
		expect(screen.getByLabelText("1424")).toBeDefined();
	});

	it("starts from zero and animates when motion is allowed", () => {
		mockReducedMotion(false);
		vi.spyOn(window, "requestAnimationFrame").mockImplementation(
			() => 0 as unknown as number,
		);
		render(<CountUp end={1424} />);
		expect(screen.getByText("0")).toBeDefined();
		vi.restoreAllMocks();
	});
});

describe("ScrollReveal", () => {
	it("shows content immediately when IntersectionObserver is missing", () => {
		vi.stubGlobal("IntersectionObserver", undefined);
		const { container } = render(
			<ScrollReveal>
				<p>chapter body</p>
			</ScrollReveal>,
		);
		expect(container.textContent).toContain("chapter body");
		expect(
			container.querySelector("[data-scroll-reveal][data-visible]"),
		).not.toBeNull();
	});

	it("reveals on first intersection and then stops observing", async () => {
		let callback: IntersectionObserverCallback = () => {};
		const observe = vi.fn();
		const disconnect = vi.fn();
		function MockObserver(cb: IntersectionObserverCallback) {
			callback = cb;
			return { observe, disconnect, unobserve: vi.fn() };
		}
		vi.stubGlobal("IntersectionObserver", MockObserver);
		const { container } = render(
			<ScrollReveal>
				<p>chapter body</p>
			</ScrollReveal>,
		);
		expect(
			container.querySelector("[data-scroll-reveal]:not([data-visible])"),
		).not.toBeNull();
		callback(
			[{ isIntersecting: true } as IntersectionObserverEntry],
			{} as IntersectionObserver,
		);
		// Flush the effect's state update outside React's event system.
		await act(async () => {});
		expect(
			container.querySelector("[data-scroll-reveal][data-visible]"),
		).not.toBeNull();
		expect(disconnect).toHaveBeenCalled();
	});
});
