import { readFileSync } from "node:fs";
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
	// exactly where a bug shipped — a CSS transition on the position
	// property that happy-dom cannot execute, so every test above stayed
	// green while a real browser still eased the "exact" tracking reduced
	// motion promises. happy-dom cannot run a CSS transition, so this
	// asserts only what is actually observable: the JS-driven position
	// update, and the inline `transition` declaration itself.
	it("tracks the pointer synchronously under reduced motion, with no CSS transition on the position", () => {
		mockPointer(true, true);
		const { container } = render(<DifferenceCursor />);
		const el = container.firstElementChild as HTMLElement;

		window.dispatchEvent(
			new PointerEvent("pointermove", { clientX: 120, clientY: 80 }),
		);

		// Updated by the pointermove handler itself, not by a
		// requestAnimationFrame callback — reduced motion skips the rAF
		// lerp entirely and paints on every move instead.
		//
		// The position lives on the individual `translate` property, never
		// on `transform`. See "cursor position and hover scale" below for
		// why that distinction is the difference between a cursor that
		// tracks the pointer and one that leaves the viewport.
		expect(el.style.translate).toBe("104px 64px");

		// No transition survives under reduced motion: not on the position
		// (which never carries one, in either motion mode), and not on
		// scale either — the hover ease is dropped so that state change
		// snaps instead of easing.
		expect(el.style.transition).toBe("");
	});

	it("eases the hover scale over --dur-min when motion is not reduced, and never eases the position", () => {
		// This is the other half of the bug this task fixes: `scale` is
		// DESIGN.md's hover state and spec 4.6 requires it to ease over a
		// minimum of 500ms, but the position is driven imperatively by the
		// rAF lerp and must never also carry a CSS transition — that would
		// double-ease every already-eased frame.
		mockPointer(true, false);
		const { container } = render(<DifferenceCursor />);
		const el = container.firstElementChild as HTMLElement;
		expect(el.style.transition).toBe("scale var(--dur-min) var(--ease)");
		expect(el.style.transition).not.toContain("translate");
		expect(el.style.transition).not.toContain("transform");
	});
});

/*
 * The position and the hover scale must never be the same CSS property, and
 * the position must never be `transform`.
 *
 * CSS composes the individual transform properties in a fixed order —
 * translate, rotate, scale — on top of whatever `transform` itself declares,
 * and `transform`'s own matrix is applied FIRST. So a translation written
 * into `transform` is *multiplied* by any `scale` set elsewhere on the same
 * element. Measured in headless Chromium with two identical 32px fixed divs
 * positioned to (800, 600) and then given `scale: 2.5`:
 *
 *   rest    transform-positioned (800, 600)   translate-positioned (800, 600)
 *   scaled  transform-positioned (1976, 1476) translate-positioned (800, 600)
 *
 * The transform-positioned one leaves the viewport, easing over 500ms as it
 * goes — while `body.has-custom-cursor * { cursor: none }` is in force, so
 * the user is left with no pointer at all over the links they are aiming at.
 *
 * happy-dom composites nothing, so no rendering test can catch this. What a
 * unit test CAN assert is the structural fact underneath it: the property the
 * component writes the position into is not the property the stylesheet
 * scales, and is not `transform`. That is the whole bug, so that is the
 * guard.
 */
const CURSOR_SOURCE = readFileSync(
	"src/design/primitives/DifferenceCursor.tsx",
	"utf8",
);
const PRIMITIVES_CSS = readFileSync(
	"src/design/primitives/primitives.css",
	"utf8",
);

/** Block comments are prose, not code — a property named there is not set. */
function withoutComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/** Every CSS property the component assigns to the circle imperatively. */
function positionProperties(source: string): string[] {
	return [
		...withoutComments(source).matchAll(/dot\.style\.([A-Za-z]+)\s*=/g),
	].map((match) => match[1] as string);
}

/** Every property declared by the hover rule that scales the cursor. */
function hoverProperties(css: string): string[] {
	const block = withoutComments(css).match(
		/body\.has-custom-cursor:has\([^)]*\)\s*\[data-cursor\]\s*\{([^}]*)\}/,
	)?.[1];
	if (block === undefined) return [];
	return [...block.matchAll(/([a-z-]+)\s*:/g)].map(
		(match) => match[1] as string,
	);
}

describe("cursor position and hover scale", () => {
	const position = positionProperties(CURSOR_SOURCE);
	const hover = hoverProperties(PRIMITIVES_CSS);

	it("finds the two rules it is guarding", () => {
		// Both sweeps have to actually match something, or every assertion
		// below passes over an empty list and proves nothing.
		expect(position.length).toBeGreaterThan(0);
		expect(hover).toContain("scale");
	});

	it("never writes the position into transform", () => {
		// `transform` is applied first and then multiplied by the individual
		// properties, so a position there is displaced by the hover scale in
		// proportion to its distance from the viewport origin.
		expect(position).not.toContain("transform");
	});

	it("writes the position into a property the hover rule does not set", () => {
		for (const property of position) {
			expect(hover).not.toContain(property);
		}
	});
});
