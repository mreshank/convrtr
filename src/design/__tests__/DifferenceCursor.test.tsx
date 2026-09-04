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

	// Fine pointer + reduced motion together had zero coverage: each of the
	// four tests above picks one axis or the other, never both. That gap is
	// exactly where a bug shipped — a CSS transition on `transform` that
	// happy-dom cannot execute, so every test above stayed green while a
	// real browser still eased the "exact" tracking reduced motion promises.
	// happy-dom cannot run a CSS transition, so this asserts only what is
	// actually observable: the JS-driven position update, and the inline
	// `transition` declaration itself.
	it("tracks the pointer synchronously under reduced motion, with no CSS transition on transform", () => {
		mockPointer(true, true);
		const { container } = render(<DifferenceCursor />);
		const el = container.firstElementChild as HTMLElement;

		window.dispatchEvent(
			new PointerEvent("pointermove", { clientX: 120, clientY: 80 }),
		);

		// Updated by the pointermove handler itself, not by a
		// requestAnimationFrame callback — reduced motion skips the rAF
		// lerp entirely and paints on every move instead.
		expect(el.style.transform).toBe("translate3d(104px, 64px, 0)");

		// No transition survives under reduced motion: not on transform
		// (which never carries one, in either motion mode), and not on
		// scale either — the hover ease is dropped so that state change
		// snaps instead of easing.
		expect(el.style.transition).toBe("");
	});

	it("eases the hover scale over --dur-min when motion is not reduced, and never eases transform", () => {
		// This is the other half of the bug this task fixes: `scale` is
		// DESIGN.md's hover state and spec 4.6 requires it to ease over a
		// minimum of 500ms, but `transform` is driven imperatively by the
		// rAF lerp and must never also carry a CSS transition — that would
		// double-ease every already-eased frame.
		mockPointer(true, false);
		const { container } = render(<DifferenceCursor />);
		const el = container.firstElementChild as HTMLElement;
		expect(el.style.transition).toBe("scale var(--dur-min) var(--ease)");
		expect(el.style.transition).not.toContain("transform");
	});
});
