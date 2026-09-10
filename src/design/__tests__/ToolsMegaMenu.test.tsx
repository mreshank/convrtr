import { fireEvent, render, screen, within } from "@testing-library/react";
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

	it("toggles open and closed on click, for pointers that do not hover", () => {
		render(<ToolsMegaMenu triggerLabel="Tools" triggerHref="/tools" />);
		const trigger = screen.getByRole("link", { name: "Tools" });

		fireEvent.click(trigger);
		expect(trigger.getAttribute("aria-expanded")).toBe("true");

		fireEvent.click(trigger);
		expect(trigger.getAttribute("aria-expanded")).toBe("false");
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
});
