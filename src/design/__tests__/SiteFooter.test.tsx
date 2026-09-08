import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "@/design/chrome/SiteFooter";

const PROPS = {
	bio: "Every conversion runs in your browser.",
	socials: [{ href: "https://example.com", label: "GitHub" }],
	contact: [{ href: "mailto:a@b.c", label: "Email" }],
	credit: "2026",
};

describe("SiteFooter", () => {
	it("inverts by redefining tokens locally, not by overriding children", () => {
		// ErrorPanel's hand-inversion caused two defects: the global
		// focus-visible outline resolved to the page's --ink and drew black
		// on black, and --rule was unreachable so its divider rendered at
		// full opacity. Redefining the tokens on the root fixes both for
		// every descendant at once.
		const { container } = render(<SiteFooter {...PROPS} />);
		const footer = container.querySelector("footer") as HTMLElement;
		expect(footer.style.getPropertyValue("--ground")).toBe(
			"var(--surface-alt)",
		);
		expect(footer.style.getPropertyValue("--ink")).toBe("var(--ink-inverse)");
		expect(footer.style.getPropertyValue("--rule")).toBe("var(--rule-subtle)");
	});

	it("paints itself from the redefined tokens", () => {
		const { container } = render(<SiteFooter {...PROPS} />);
		const footer = container.querySelector("footer") as HTMLElement;
		expect(footer.style.background).toBe("var(--ground)");
		expect(footer.style.color).toBe("var(--ink)");
	});

	it("overrides no descendant colour", () => {
		// Any hardcoded child colour is the bug this pattern exists to stop.
		const { container } = render(<SiteFooter {...PROPS} />);
		for (const el of container.querySelectorAll<HTMLElement>("footer *")) {
			expect(el.style.color).toBe("");
		}
	});

	it("leaves keyboard focus visible by letting no descendant redeclare the ground, ink or rule tokens", () => {
		// Mirrors ErrorPanel.test.tsx's "leaves keyboard focus visible by not
		// restoring the page's ink underneath". A descendant re-declaring one
		// of the tokens this footer redefines on its root changes nothing
		// about that element's own rendered colour — `color` is inherited
		// from the root as an already-resolved value, not re-evaluated at
		// the leaf, so the "overrides no descendant colour" test above stays
		// green even when this one doesn't. But it silently redirects
		// `:focus-visible { outline: 1px solid var(--ink) }` for that
		// subtree, reintroducing the invisible-focus defect this whole
		// pattern exists to prevent.
		const { container } = render(<SiteFooter {...PROPS} />);
		for (const el of container.querySelectorAll<HTMLElement>("footer *")) {
			expect(el.style.getPropertyValue("--ground")).toBe("");
			expect(el.style.getPropertyValue("--ink")).toBe("");
			expect(el.style.getPropertyValue("--rule")).toBe("");
		}
	});

	it("does not spend the display tracking raw at the wordmark's size", () => {
		// `--display-tracking` is -2.7px, which v2 specifies against its own
		// 68px display size (`DESIGN.v2.md:16-21`) — -0.0397em. Letter
		// spacing in px does not scale with the font, so taking the token
		// unchanged at this 32px wordmark gave -0.0844em: 2.13x tighter than
		// v2 asks for, and the word rendered 96.53px against 115.42px
		// untracked on the real export, letters nearly touching.
		//
		// The assertion is negative because of what happy-dom can parse. It
		// keeps a bare `var()` but silently drops a `calc()` containing one,
		// so the fixed value reads back as the empty string here and cannot
		// be asserted positively. What it can hold is the defect's exact
		// shape: the bare token would parse and stick, so reverting to it
		// fails this line. The scaling factor is pinned from the source
		// below, and the rendered width was measured in a browser.
		const { container } = render(<SiteFooter {...PROPS} />);
		const wordmark = container.querySelector("p") as HTMLElement;
		expect(wordmark.textContent).toBe("convrtr");
		expect(wordmark.style.fontSize).toBe("32px");
		expect(wordmark.style.letterSpacing).not.toBe("var(--display-tracking)");
	});

	it("derives that tracking from the token and v2's 68px reference size", () => {
		// Read from source rather than the DOM for the parsing reason above.
		// Naming both the token and the 68 keeps the two halves of the fix
		// together: a value that stops referencing `--display-tracking` has
		// left the system, and one that stops dividing by 68 has lost the
		// reference size the token's -2.7px was specified against.
		const source = readFileSync("src/design/chrome/SiteFooter.tsx", "utf8");
		expect(source).toMatch(
			/letterSpacing:\s*"calc\(var\(--display-tracking\)[^"]*68\)"/,
		);
	});

	it("renders the brand, bio, socials and contact", () => {
		render(<SiteFooter {...PROPS} />);
		expect(screen.getByText(PROPS.bio)).toBeDefined();
		expect(screen.getByRole("link", { name: "GitHub" })).toBeDefined();
		expect(screen.getByRole("link", { name: "Email" })).toBeDefined();
	});

	it("names its two link groups so they are distinguishable", () => {
		render(<SiteFooter {...PROPS} />);
		expect(screen.getByRole("navigation", { name: /socials/i })).toBeDefined();
		expect(screen.getByRole("navigation", { name: /contact/i })).toBeDefined();
	});
});
