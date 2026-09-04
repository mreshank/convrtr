import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DifferenceCursor } from "@/design/primitives/DifferenceCursor";

function mockPointer(fine: boolean, reducedMotion = false) {
	vi.stubGlobal(
		"matchMedia",
		vi.fn((query: string) => ({
			matches: query.includes("pointer: fine")
				? fine
				: query.includes("prefers-reduced-motion")
					? reducedMotion
					: false,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})),
	);
}

afterEach(() => {
	vi.unstubAllGlobals();
	document.body.classList.remove("has-custom-cursor");
});

describe("DifferenceCursor", () => {
	it("renders nothing on a coarse pointer", () => {
		// A touch user has no cursor to replace. Rendering one would put a
		// circle on screen that never moves.
		mockPointer(false);
		const { container } = render(<DifferenceCursor />);
		expect(container.firstElementChild).toBeNull();
	});

	it("never hides the system cursor on a coarse pointer", () => {
		mockPointer(false);
		render(<DifferenceCursor />);
		expect(document.body.classList.contains("has-custom-cursor")).toBe(false);
	});

	it("hides the system cursor only while it is mounted on a fine pointer", () => {
		// The class is added from the component rather than written into
		// globals.css. A static `cursor: none` would hide the pointer for
		// visitors whose JavaScript failed or has not hydrated, leaving them
		// with nothing at all and no way to recover it.
		mockPointer(true);
		const { unmount } = render(<DifferenceCursor />);
		expect(document.body.classList.contains("has-custom-cursor")).toBe(true);
		unmount();
		expect(document.body.classList.contains("has-custom-cursor")).toBe(false);
	});

	it("renders a non-interactive difference-blended circle", () => {
		mockPointer(true);
		const { container } = render(<DifferenceCursor />);
		const el = container.firstElementChild as HTMLElement;
		expect(el.style.position).toBe("fixed");
		expect(el.style.pointerEvents).toBe("none");
		expect(el.style.mixBlendMode).toBe("difference");
		expect(el.style.zIndex).toBe("9999");
	});
});
