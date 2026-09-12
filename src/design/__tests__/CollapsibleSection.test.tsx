import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CollapsibleSection } from "@/design/families/CollapsibleSection";

describe("CollapsibleSection", () => {
	it("renders expanded by default with accessible button and region", () => {
		render(
			<CollapsibleSection heading="BY TYPE" total={8} unit="types">
				<div>Content inside</div>
			</CollapsibleSection>,
		);

		const trigger = screen.getByRole("button", { name: /BY TYPE/i });
		expect(trigger).toBeDefined();
		expect(trigger.getAttribute("aria-expanded")).toBe("true");
		expect(screen.getByText("8 types")).toBeDefined();
		expect(screen.getByText("[ − ] COLLAPSE")).toBeDefined();

		const content = screen.getByRole("region");
		expect(content.getAttribute("data-collapsed")).toBe("false");
		expect(screen.getByText("Content inside")).toBeDefined();
	});

	it("toggles collapsed and expanded states on click", () => {
		render(
			<CollapsibleSection heading="BY TASK" total={12}>
				<div>Task content</div>
			</CollapsibleSection>,
		);

		const trigger = screen.getByRole("button", { name: /BY TASK/i });
		const content = screen.getByRole("region");

		// Click to collapse
		fireEvent.click(trigger);
		expect(trigger.getAttribute("aria-expanded")).toBe("false");
		expect(content.getAttribute("data-collapsed")).toBe("true");
		expect(screen.getByText("[ + ] EXPAND")).toBeDefined();

		// Click to expand
		fireEvent.click(trigger);
		expect(trigger.getAttribute("aria-expanded")).toBe("true");
		expect(content.getAttribute("data-collapsed")).toBe("false");
		expect(screen.getByText("[ − ] COLLAPSE")).toBeDefined();
	});

	it("renders children directly without trigger when heading is omitted", () => {
		render(
			<CollapsibleSection>
				<div>Bare content</div>
			</CollapsibleSection>,
		);

		expect(screen.queryByRole("button")).toBeNull();
		expect(screen.getByText("Bare content")).toBeDefined();
	});
});
