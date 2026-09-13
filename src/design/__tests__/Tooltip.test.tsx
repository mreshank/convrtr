import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Tooltip } from "@/design/primitives/Tooltip";

describe("Tooltip primitive", () => {
	it("renders child trigger element without tooltip initially", () => {
		render(
			<Tooltip content="Helper information">
				<button type="button">Trigger Button</button>
			</Tooltip>,
		);

		const button = screen.getByRole("button", { name: "Trigger Button" });
		expect(button).toBeDefined();
		expect(button.getAttribute("aria-describedby")).toBeNull();
		expect(screen.queryByRole("tooltip")).toBeNull();
	});

	it("reveals tooltip immediately on focus and binds aria-describedby", () => {
		render(
			<Tooltip content="Focus description">
				<button type="button">Focusable</button>
			</Tooltip>,
		);

		const button = screen.getByRole("button", { name: "Focusable" });
		fireEvent.focus(button);

		const tooltip = screen.getByRole("tooltip");
		expect(tooltip).toBeDefined();
		expect(tooltip.textContent).toBe("Focus description");
		expect(button.getAttribute("aria-describedby")).toBe(tooltip.id);
	});

	it("hides tooltip on blur", () => {
		render(
			<Tooltip content="Blur test">
				<button type="button">Focusable</button>
			</Tooltip>,
		);

		const button = screen.getByRole("button", { name: "Focusable" });
		fireEvent.focus(button);
		expect(screen.getByRole("tooltip")).toBeDefined();

		fireEvent.blur(button);
		expect(screen.queryByRole("tooltip")).toBeNull();
		expect(button.getAttribute("aria-describedby")).toBeNull();
	});

	it("dismisses tooltip when Escape key is pressed", () => {
		render(
			<Tooltip content="Escape dismiss test">
				<button type="button">Escape target</button>
			</Tooltip>,
		);

		const button = screen.getByRole("button", { name: "Escape target" });
		fireEvent.focus(button);
		expect(screen.getByRole("tooltip")).toBeDefined();

		fireEvent.keyDown(button, { key: "Escape" });
		expect(screen.queryByRole("tooltip")).toBeNull();
	});

	it("reveals tooltip on hover after delay", () => {
		vi.useFakeTimers();

		render(
			<Tooltip content="Hover detail" delayMs={100}>
				<button type="button">Hover me</button>
			</Tooltip>,
		);

		const button = screen.getByRole("button", { name: "Hover me" });
		fireEvent.mouseEnter(button);

		expect(screen.queryByRole("tooltip")).toBeNull();

		act(() => {
			vi.advanceTimersByTime(100);
		});

		expect(screen.getByRole("tooltip")).toBeDefined();
		expect(screen.getByRole("tooltip").textContent).toBe("Hover detail");

		fireEvent.mouseLeave(button);
		expect(screen.queryByRole("tooltip")).toBeNull();

		vi.useRealTimers();
	});

	it("supports directional positions (top, bottom, left, right)", () => {
		const { rerender } = render(
			<Tooltip content="Position test" position="top">
				<button type="button">Top</button>
			</Tooltip>,
		);

		const topButton = screen.getByRole("button", { name: "Top" });
		fireEvent.focus(topButton);
		let tooltip = screen.getByRole("tooltip");
		expect(tooltip.getAttribute("data-position")).toBe("top");

		rerender(
			<Tooltip content="Position test" position="right">
				<button type="button">Right</button>
			</Tooltip>,
		);
		const rightButton = screen.getByRole("button", { name: "Right" });
		fireEvent.focus(rightButton);
		tooltip = screen.getByRole("tooltip");
		expect(tooltip.getAttribute("data-position")).toBe("right");
	});
});
