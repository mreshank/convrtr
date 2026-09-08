import { existsSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "../not-found";

/**
 * What these tests can and cannot hold.
 *
 * The defect was a composited one: Next's built-in not-found UI injects
 * `body{color:#000;background:#fff;margin:0}` inside `<body>`, later in
 * document order than the head stylesheet and at the same specificity, so
 * it won and `/404.html` rendered white. happy-dom composites nothing and
 * resolves no cascade, so no test in this file can measure a contrast
 * ratio or catch that rule winning — that verification is a browser
 * against the real `out/` export, and it is recorded in the fix report.
 *
 * What is mechanically checkable is the *cause*: the built-in page is
 * served only when this file is absent, and the page's own root is what
 * makes it independent of whatever `body` ends up carrying. Both are
 * asserted below, so deleting the file or dropping the explicit tokens
 * fails here rather than shipping.
 */
describe("the 404 page exists at all", () => {
	it("keeps src/app/not-found.tsx on disk", () => {
		// Delete this file and Next silently substitutes its own error page,
		// which carries the previous design system's white ground. Nothing
		// else in the suite notices: typecheck, lint and build all stay
		// green, and `out/404.html` — the file `vercel.json` serves for
		// every unmatched path — is what changes.
		//
		// The import at the top of this file is what actually holds the
		// line: removing the page makes this whole suite fail to resolve,
		// which is a louder failure than an assertion. This restates it as
		// a named test so the reason is legible in the report rather than
		// only in a module-resolution error.
		expect(existsSync("src/app/not-found.tsx")).toBe(true);
	});
});

describe("NotFound", () => {
	it("states the canvas on its own root instead of inheriting it", () => {
		// The injected `body` rule is precisely what this page overrides, so
		// it does not rely on `body` for its ground or its ink.
		const { container } = render(<NotFound />);
		const root = container.querySelector("main") as HTMLElement;
		expect(root.style.background).toBe("var(--ground)");
		expect(root.style.color).toBe("var(--ink)");
	});

	it("fills the remaining column height so the ground reaches the fold", () => {
		// A ground only as tall as the text leaves the rest of the viewport
		// showing whatever `body` carries — the thing this page must not
		// depend on.
		const { container } = render(<NotFound />);
		const root = container.querySelector("main") as HTMLElement;
		expect(root.className).toContain("flex-1");
	});

	it("offers a way back into the site", () => {
		render(<NotFound />);
		expect(
			screen
				.getByRole("link", { name: /all converters/i })
				.getAttribute("href"),
		).toBe("/tools");
	});
});
