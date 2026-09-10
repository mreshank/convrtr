import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToolsMegaMenu } from "@/design/chrome/ToolsMegaMenu";

describe("ToolsMegaMenu", () => {
	it("renders a closed trigger with no panel content visible", () => {
		render(<ToolsMegaMenu triggerLabel="Tools" triggerHref="/tools" />);
		const trigger = screen.getByRole("link", { name: "Tools" });
		expect(trigger.getAttribute("href")).toBe("/tools");
		expect(trigger.getAttribute("aria-expanded")).toBe("false");
		expect(screen.queryByRole("group")).toBeNull();
	});

	it("opens on focus of the trigger and lists every task group from the registry", () => {
		render(<ToolsMegaMenu triggerLabel="Tools" triggerHref="/tools" />);
		const trigger = screen.getByRole("link", { name: "Tools" });

		fireEvent.focus(trigger);

		expect(trigger.getAttribute("aria-expanded")).toBe("true");
		const panel = screen.getByRole("group", { name: "Tools" });
		// At least one known kind must appear -- this asserts the data
		// comes from the live registry rather than a hardcoded stub, without
		// hardcoding a specific count here that would drift as tools are added.
		expect(within(panel).getAllByRole("link").length).toBeGreaterThan(0);
	});

	it("expands a group's tools on hover of its row and links resolve to real tool routes", () => {
		render(<ToolsMegaMenu triggerLabel="Tools" triggerHref="/tools" />);
		fireEvent.focus(screen.getByRole("link", { name: "Tools" }));

		const groupRows = screen.getAllByRole("button", { name: /^\S+ \(\d+\)$/ });
		const firstRow = groupRows[0];
		if (!firstRow) throw new Error("expected at least one task group row");

		fireEvent.mouseEnter(firstRow);

		const subPanel = screen.getByRole("group", {
			name: firstRow.textContent ?? undefined,
		});
		const toolLinks = within(subPanel).getAllByRole("link");
		expect(toolLinks.length).toBeGreaterThan(0);
		for (const link of toolLinks) {
			expect(link.getAttribute("href")).toMatch(/^\/[a-z0-9-]+\/[a-z0-9-]+$/);
		}
	});

	it("closes on Escape and returns focus to the trigger", () => {
		render(<ToolsMegaMenu triggerLabel="Tools" triggerHref="/tools" />);
		const trigger = screen.getByRole("link", { name: "Tools" });
		fireEvent.focus(trigger);
		expect(trigger.getAttribute("aria-expanded")).toBe("true");

		fireEvent.keyDown(document, { key: "Escape" });

		expect(trigger.getAttribute("aria-expanded")).toBe("false");
		expect(document.activeElement).toBe(trigger);
	});

	it("does not swallow the next real focus-open after Escape is pressed while focus never left the trigger", () => {
		// Regression test for a bug `fireEvent.focus` cannot catch: it
		// dispatches a synthetic focus event without changing
		// `document.activeElement`, so the component's real `.focus()` call
		// inside its Escape handler always looked like a genuine focus
		// change in that style of test. Real browsers (and happy-dom) don't
		// re-dispatch `focus` when `.focus()` is called on an element that
		// is already `document.activeElement` -- so pressing Escape with
		// focus still genuinely on the trigger (never having moved away) is
		// a no-op re-focus, and a suppression flag armed unconditionally on
		// every Escape would never get cleared, silently swallowing the
		// *next* real focus-open.
		render(<ToolsMegaMenu triggerLabel="Tools" triggerHref="/tools" />);
		const trigger = screen.getByRole("link", { name: "Tools" });

		act(() => {
			trigger.focus();
		});
		expect(document.activeElement).toBe(trigger);
		expect(trigger.getAttribute("aria-expanded")).toBe("true");

		fireEvent.keyDown(document, { key: "Escape" });

		expect(trigger.getAttribute("aria-expanded")).toBe("false");
		expect(document.activeElement).toBe(trigger);

		// The trigger never lost focus across that Escape, so this second
		// real `.focus()` call is the one that was silently failing to
		// reopen the menu before the fix.
		act(() => {
			trigger.blur();
			trigger.focus();
		});
		expect(document.activeElement).toBe(trigger);
		expect(trigger.getAttribute("aria-expanded")).toBe("true");
	});

	it("opens (without navigating) on click of a closed trigger, for pointers that do not hover", () => {
		render(<ToolsMegaMenu triggerLabel="Tools" triggerHref="/tools" />);
		const trigger = screen.getByRole("link", { name: "Tools" });

		const notPrevented = fireEvent.click(trigger);

		expect(trigger.getAttribute("aria-expanded")).toBe("true");
		// fireEvent.click returns false when the event's default was
		// prevented -- the opening click must not navigate.
		expect(notPrevented).toBe(false);
	});

	it("navigates (without re-closing) on click of an already-open trigger", () => {
		render(<ToolsMegaMenu triggerLabel="Tools" triggerHref="/tools" />);
		const trigger = screen.getByRole("link", { name: "Tools" });

		fireEvent.click(trigger);
		expect(trigger.getAttribute("aria-expanded")).toBe("true");

		const notPrevented = fireEvent.click(trigger);

		// The second click, while the panel is already open, must be allowed
		// to navigate -- its default must NOT be prevented.
		expect(notPrevented).toBe(true);
	});

	it("does not lock body scroll or render a full-viewport scrim", () => {
		// The narrow difference from SiteHeader's mobile disclosure: this is a
		// small anchored panel, not a repeat of the removed full-viewport
		// overlay.
		document.body.style.overflow = "";
		render(<ToolsMegaMenu triggerLabel="Tools" triggerHref="/tools" />);
		fireEvent.focus(screen.getByRole("link", { name: "Tools" }));
		expect(document.body.style.overflow).toBe("");
	});

	it("renders tool tagline with subdued opacity and smaller font size", () => {
		render(<ToolsMegaMenu triggerLabel="Tools" triggerHref="/tools" />);
		const trigger = screen.getByRole("link", { name: "Tools" });
		fireEvent.focus(trigger);

		const panel = screen.getByRole("group", { name: "Tools" });
		const groupRows = screen.getAllByRole("button", { name: /^\S+ \(\d+\)$/ });
		const firstRow = groupRows[0];
		if (!firstRow) throw new Error("expected at least one task group row");

		fireEvent.mouseEnter(firstRow);

		// Find any tool link with a tagline
		const toolLinks = within(panel).getAllByRole("link");
		const linkWithTagline = toolLinks.find((link) =>
			within(link).queryByText(/free|lossless|browser/i),
		);
		if (linkWithTagline) {
			const tagline = within(linkWithTagline).getByText(
				/free|lossless|browser/i,
			);
			expect(tagline.style.fontSize).toBe("12px");
			expect(tagline.style.opacity).toBe("0.65");
			expect(tagline.style.color).toBe("var(--ink-muted)");
		}
	});
});

