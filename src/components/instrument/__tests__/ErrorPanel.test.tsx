import { readFileSync } from "node:fs";
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

describe("monochrome state encoding", () => {
	function panel(props: Partial<Parameters<typeof ErrorPanel>[0]> = {}) {
		render(
			<ErrorPanel
				code="ENGINE_FAILURE"
				onRetry={() => {}}
				onDismiss={() => {}}
				detail="stack: boom at line 42"
				{...props}
			/>,
		);
		// Selected by testid, not by DOM position: the root carries
		// `data-testid="error"` deliberately — its own comment explains the
		// cancel e2e depends on nothing rendering for USER_CANCELLED — and a
		// positional selector breaks the moment anything wraps the panel.
		return screen.getByTestId("error");
	}

	it("renders as an inverted block rather than a coloured one", () => {
		const root = panel();
		expect(root.style.background).toBe("var(--ground)");
		expect(root.style.color).toBe("var(--ink)");
	});

	it("inverts by redefining the system's tokens on the root, not per child", () => {
		// The whole point of doing it this way: every descendant, and every
		// rule in globals.css that names a token, resolves against the
		// terminal pair without the panel having to restate it. A
		// child-by-child override could never reach `:focus-visible`.
		const root = panel();
		expect(root.style.getPropertyValue("--ground")).toBe("var(--terminal)");
		expect(root.style.getPropertyValue("--ink")).toBe("var(--terminal-ink)");
		expect(root.style.getPropertyValue("--rule")).toBe("var(--terminal-rule)");
		expect(root.style.getPropertyValue("--ink-muted")).toBe(
			"var(--terminal-ink)",
		);
	});

	it("leaves keyboard focus visible by not restoring the page's ink underneath", () => {
		// globals.css draws `:focus-visible { outline: 1px solid var(--ink) }`.
		// When this panel's background WAS the page's --ink, that outline was
		// black on black in light mode and white on white in dark — three
		// focusable controls with no focus indication at all, in the one
		// place a user is already stuck. The fix is that --ink means
		// something else inside here, so nothing within may set it back.
		panel();
		for (const control of screen.getAllByRole("button")) {
			expect(control.style.getPropertyValue("--ink")).toBe("");
		}
	});

	it("draws the detail divider as the system's hairline, not a full-strength rule", () => {
		// Every other rule on the site is 10%. This one was full-opacity
		// --ground, which made it the heaviest hairline anywhere — a
		// consequence of hand-inverting, since --rule could not be used.
		// Redefining --rule on the root gives it back.
		panel();
		const divider = screen.getByText(/TECHNICAL DETAIL/).parentElement;
		expect(divider?.style.borderColor).toBe("var(--rule)");
	});

	it("draws no left border", () => {
		// `border-l` plus `borderLeftColor: var(--ground)` painted a
		// page-coloured hairline on an inverted panel: visually nothing, and
		// a vestige of the accent stripe the monochrome system removed.
		const root = panel();
		expect(root.className).not.toContain("border-l");
		expect(root.style.borderLeftColor).toBe("");
	});

	it("recedes the muted tier with opacity on the leaf, never on a container", () => {
		// opacity composites its whole subtree and cannot be overridden by a
		// child, so a dimmed container would drag its siblings down with it —
		// RETRY would recede along with DISMISS.
		panel();
		expect(screen.getByText(/quality setting/i).style.opacity).toBe("0.7");

		const dismiss = screen.getByRole("button", { name: /dismiss/i });
		expect(dismiss.style.opacity).toBe("0.7");
		expect(dismiss.parentElement?.style.opacity).toBe("");

		const retry = screen.getByRole("button", { name: /retry/i });
		expect(retry.style.opacity).toBe("");

		const disclosure = screen.getByText(/TECHNICAL DETAIL/);
		expect(disclosure.style.opacity).toBe("0.7");
		expect(disclosure.parentElement?.style.opacity).toBe("");
	});

	it("spends the terminal tokens the spec assigns to exactly this panel", () => {
		const source = readFileSync(
			"src/components/instrument/ErrorPanel.tsx",
			"utf8",
		);
		for (const token of ["--terminal", "--terminal-ink", "--terminal-rule"]) {
			expect(source).toContain(`var(${token})`);
		}
	});

	it("references no semantic colour token", () => {
		const source = readFileSync(
			"src/components/instrument/ErrorPanel.tsx",
			"utf8",
		);
		expect(source).not.toMatch(/--error|--lossy|--signal/);
	});
});
