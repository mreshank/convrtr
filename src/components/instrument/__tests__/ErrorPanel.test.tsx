import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorPanel } from "../ErrorPanel";

describe("ErrorPanel", () => {
	it("renders nothing for USER_CANCELLED", () => {
		const { container } = render(<ErrorPanel code="USER_CANCELLED" />);
		expect(container.innerHTML).toBe("");
	});

	it("announces itself with role=alert for a real error", () => {
		render(<ErrorPanel code="ENGINE_FAILURE" />);
		expect(screen.getByRole("alert")).toBeDefined();
	});

	it("renders a distinct title per error code", () => {
		const codes = [
			"UNSUPPORTED_INPUT",
			"CORRUPT_INPUT",
			"CAPABILITY_MISSING",
			"OUT_OF_MEMORY",
			"ENGINE_FAILURE",
		] as const;

		const titles = codes.map((code) => {
			const { container, unmount } = render(<ErrorPanel code={code} />);
			const title = container.querySelector(
				'[role="alert"] > span',
			)?.textContent;
			unmount();
			return title;
		});

		expect(new Set(titles).size).toBe(codes.length);
		for (const title of titles) {
			expect(title).toBeTruthy();
		}
	});

	it("names the input format for UNSUPPORTED_INPUT when given", () => {
		render(<ErrorPanel code="UNSUPPORTED_INPUT" inputFormat="AVI" />);
		expect(screen.getByRole("alert").textContent).toContain("AVI");
	});

	it("still gives guidance for UNSUPPORTED_INPUT without an inputFormat", () => {
		render(<ErrorPanel code="UNSUPPORTED_INPUT" />);
		expect(screen.getByRole("alert").textContent?.length).toBeGreaterThan(0);
	});

	it("explains CORRUPT_INPUT as a parse failure and suggests re-exporting", () => {
		render(<ErrorPanel code="CORRUPT_INPUT" />);
		const text = screen.getByRole("alert").textContent ?? "";
		expect(text.toLowerCase()).toContain("parse");
		expect(text.toLowerCase()).toContain("re-export");
	});

	it("attributes CAPABILITY_MISSING to the device, not the file", () => {
		render(<ErrorPanel code="CAPABILITY_MISSING" />);
		const text = screen.getByRole("alert").textContent ?? "";
		expect(text.toLowerCase()).toContain("browser");
		expect(text.toLowerCase()).not.toContain("your file");
	});

	it("attributes OUT_OF_MEMORY to the device and suggests splitting the file", () => {
		render(<ErrorPanel code="OUT_OF_MEMORY" />);
		const text = screen.getByRole("alert").textContent ?? "";
		expect(text.toLowerCase()).toContain("memory");
		expect(text.toLowerCase()).toContain("split");
	});

	it("offers retry and mentions quality as a workaround for ENGINE_FAILURE", () => {
		render(<ErrorPanel code="ENGINE_FAILURE" onRetry={vi.fn()} />);
		const text = screen.getByRole("alert").textContent ?? "";
		expect(text.toLowerCase()).toContain("retry");
		expect(text.toLowerCase()).toContain("quality");
	});

	it("never implies the loaded file was discarded, across every renderable code", () => {
		const codes = [
			"UNSUPPORTED_INPUT",
			"CORRUPT_INPUT",
			"CAPABILITY_MISSING",
			"OUT_OF_MEMORY",
			"ENGINE_FAILURE",
		] as const;

		for (const code of codes) {
			const { container, unmount } = render(<ErrorPanel code={code} />);
			const text = (container.textContent ?? "").toLowerCase();
			expect(text).not.toContain("select your file again");
			expect(text).not.toContain("choose your file again");
			expect(text).not.toContain("upload again");
			unmount();
		}
	});

	it("hides the technical detail behind a collapsed disclosure by default", () => {
		render(
			<ErrorPanel code="ENGINE_FAILURE" detail="stack: boom at line 42" />,
		);
		expect(screen.queryByText("stack: boom at line 42")).toBeNull();
		expect(screen.getByText(/TECHNICAL DETAIL/)).toBeDefined();
	});

	it("reveals the technical detail once the disclosure is opened", () => {
		render(
			<ErrorPanel code="ENGINE_FAILURE" detail="stack: boom at line 42" />,
		);
		fireEvent.click(screen.getByText(/TECHNICAL DETAIL/));
		expect(screen.getByText("stack: boom at line 42")).toBeDefined();
	});

	it("does not render a detail disclosure when no detail is given", () => {
		render(<ErrorPanel code="ENGINE_FAILURE" />);
		expect(screen.queryByText(/TECHNICAL DETAIL/)).toBeNull();
	});

	it("fires onRetry when the retry button is clicked", () => {
		const onRetry = vi.fn();
		render(<ErrorPanel code="ENGINE_FAILURE" onRetry={onRetry} />);
		fireEvent.click(screen.getByRole("button", { name: /retry/i }));
		expect(onRetry).toHaveBeenCalledOnce();
	});

	it("fires onDismiss when the dismiss button is clicked", () => {
		const onDismiss = vi.fn();
		render(<ErrorPanel code="ENGINE_FAILURE" onDismiss={onDismiss} />);
		fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
		expect(onDismiss).toHaveBeenCalledOnce();
	});

	it("omits retry and dismiss buttons when their handlers are not provided", () => {
		render(<ErrorPanel code="ENGINE_FAILURE" />);
		expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
		expect(screen.queryByRole("button", { name: /dismiss/i })).toBeNull();
	});
});
