import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatusNotice } from "@/design/families/StatusNotice";

describe("StatusNotice", () => {
	it("announces the message as a status", () => {
		render(
			<StatusNotice type="success" text="Subscribed." onDismiss={() => {}} />,
		);
		expect(screen.getByRole("status").textContent).toContain("Subscribed.");
	});

	it("paints success in mint and error in the strong rule", () => {
		const { rerender } = render(
			<StatusNotice type="success" text="Ok." onDismiss={() => {}} />,
		);
		const box = screen.getByRole("status");
		expect(box.style.borderColor).toBe("var(--accent)");
		rerender(<StatusNotice type="error" text="Bad." onDismiss={() => {}} />);
		expect(screen.getByRole("status").style.borderColor).toBe(
			"var(--rule-strong)",
		);
	});

	it("dismisses on [close]", () => {
		const onDismiss = vi.fn();
		render(<StatusNotice type="error" text="Bad." onDismiss={onDismiss} />);
		fireEvent.click(screen.getByRole("button", { name: "[close]" }));
		expect(onDismiss).toHaveBeenCalledOnce();
	});
});
