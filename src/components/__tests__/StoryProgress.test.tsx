import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StoryProgress } from "@/components/StoryProgress";

const ITEMS = [
	{ index: "01", eyebrow: "THE PROBLEM" },
	{ index: "02", eyebrow: "THE JOURNEY" },
];

function mockWide(wide: boolean) {
	vi.stubGlobal(
		"matchMedia",
		vi.fn(() => ({
			matches: wide,
			media: "(min-width: 1100px)",
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})),
	);
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("StoryProgress", () => {
	it("renders nothing on narrow viewports", () => {
		mockWide(false);
		const { container } = render(<StoryProgress items={ITEMS} />);
		expect(container.textContent).toBe("");
	});

	it("renders one stop per chapter on wide viewports", () => {
		mockWide(true);
		render(<StoryProgress items={ITEMS} />);
		expect(
			screen.getByRole("link", { name: "Chapter 01: THE PROBLEM" }),
		).toBeDefined();
		expect(
			screen.getByRole("link", { name: "Chapter 02: THE JOURNEY" }),
		).toBeDefined();
	});

	it("marks the chapter crossing the viewport as current", async () => {
		mockWide(true);
		let callback: IntersectionObserverCallback = () => {};
		function MockObserver(cb: IntersectionObserverCallback) {
			callback = cb;
			return { observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() };
		}
		vi.stubGlobal("IntersectionObserver", MockObserver);
		render(<StoryProgress items={ITEMS} />);
		callback(
			[
				{
					isIntersecting: true,
					target: { getAttribute: () => "chapter-02" },
				} as unknown as IntersectionObserverEntry,
			],
			{} as IntersectionObserver,
		);
		await act(async () => {});
		expect(
			screen
				.getByRole("link", { name: "Chapter 02: THE JOURNEY" })
				.getAttribute("aria-current"),
		).toBe("true");
	});
});
