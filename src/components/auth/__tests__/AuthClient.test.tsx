import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthClient } from "../AuthClient";

// Mock next/navigation
vi.mock("next/navigation", () => ({
	useSearchParams: () => ({
		get: (key: string) => (key === "mode" ? "signin" : null),
	}),
}));

// Mock Clerk hook
vi.mock("@clerk/react", () => ({
	useUser: () => ({ isSignedIn: false, user: null }),
	SignIn: () => <div data-testid="clerk-signin">Clerk SignIn</div>,
	SignUp: () => <div data-testid="clerk-signup">Clerk SignUp</div>,
}));

describe("AuthClient component", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		localStorage.clear();
		vi.restoreAllMocks();
	});

	it("renders accessible tablist and capabilities", () => {
		render(<AuthClient />);

		const tablist = screen.getByRole("tablist", {
			name: "Authentication and Workspace Modes",
		});
		expect(tablist).toBeDefined();

		const workspaceTab = screen.getByRole("tab", { name: "Local Workspace" });
		expect(workspaceTab).toBeDefined();
		expect(workspaceTab.getAttribute("aria-selected")).toBe("true");

		expect(screen.getByText(/LOCAL-FIRST ARCHITECTURE/i)).toBeDefined();
	});

	it("allows naming and activating a local workspace session", () => {
		render(<AuthClient />);

		const input = screen.getByLabelText("Workspace Label");
		fireEvent.change(input, { target: { value: "Design Studio" } });

		const activateBtn = screen.getByRole("button", {
			name: "Activate Workspace",
		});
		fireEvent.click(activateBtn);

		expect(screen.getByText("LOCAL SESSION ACTIVE")).toBeDefined();
		expect(screen.getByText("Design Studio")).toBeDefined();
		expect(screen.getByRole("button", { name: "Reset Session" })).toBeDefined();
	});

	it("resets local session when Reset Session is clicked", () => {
		localStorage.setItem(
			"convrtr_workspace_session",
			JSON.stringify({ id: "ws-test", name: "Test WS", createdAt: 100 }),
		);

		render(<AuthClient />);
		expect(screen.getByText("LOCAL SESSION ACTIVE")).toBeDefined();

		const resetBtn = screen.getByRole("button", { name: "Reset Session" });
		fireEvent.click(resetBtn);

		expect(screen.queryByText("LOCAL SESSION ACTIVE")).toBeNull();
		expect(screen.getByLabelText("Workspace Label")).toBeDefined();
	});

	it("renders 2-column auth grid with capabilities on left and tabs/panels on right", () => {
		const { container } = render(<AuthClient />);

		const grid = container.querySelector("[data-auth-grid]");
		expect(grid).toBeDefined();

		const aside = container.querySelector("[data-auth-aside]");
		expect(aside).toBeDefined();
		expect(aside?.textContent).toContain(
			"WORKSPACE CAPABILITIES & PRIVACY GUARANTEE",
		);
		expect(aside?.textContent).toContain("Air-Gapped In-Browser Processing");
		expect(aside?.textContent).toContain("WASM SANDBOX");

		const main = container.querySelector("[data-auth-main]");
		expect(main).toBeDefined();
		expect(main?.querySelector('[role="tablist"]')).toBeDefined();
		expect(main?.querySelector('[role="tabpanel"]')).toBeDefined();
	});

	it("supports keyboard navigation across tabs with Arrow keys", () => {
		render(<AuthClient />);

		const workspaceTab = screen.getByRole("tab", { name: "Local Workspace" });
		workspaceTab.focus();

		fireEvent.keyDown(workspaceTab, { key: "ArrowRight" });
		const archTab = screen.getByRole("tab", { name: "Zero-Upload Security" });
		expect(archTab.getAttribute("aria-selected")).toBe("true");

		fireEvent.keyDown(archTab, { key: "ArrowLeft" });
		expect(workspaceTab.getAttribute("aria-selected")).toBe("true");

		fireEvent.keyDown(archTab, { key: "End" });
		expect(workspaceTab.getAttribute("aria-selected")).toBe("true");

		fireEvent.keyDown(workspaceTab, { key: "Home" });
		expect(archTab.getAttribute("aria-selected")).toBe("true");
	});

	it("renders offline presets and allows toggling settings", () => {
		render(<AuthClient />);

		expect(screen.getByText("OFFLINE CONVERSION PRESETS")).toBeDefined();

		// Concurrency buttons
		const fourX = screen.getByRole("button", { name: "4x" });
		fireEvent.click(fourX);

		const autoDownloadBtn = screen.getByRole("button", {
			name: /Disabled \(Manual\)/i,
		});
		fireEvent.click(autoDownloadBtn);
		expect(screen.getByText(/Enabled \(Instant\)/i)).toBeDefined();
	});

	it("allows exporting workspace backup", () => {
		render(<AuthClient />);

		const exportBtn = screen.getByRole("button", {
			name: "Export Backup (.json)",
		});
		expect(exportBtn).toBeDefined();
		fireEvent.click(exportBtn);

		expect(
			screen.getByText("Workspace backup exported successfully."),
		).toBeDefined();
	});

	it("purges history when confirmation button is clicked", () => {
		localStorage.setItem(
			"convrtr_history",
			JSON.stringify([{ id: "conv-1", file: "test.png" }]),
		);

		render(<AuthClient />);

		const clearBtn = screen.getByRole("button", { name: "Clear History" });
		fireEvent.click(clearBtn);

		const confirmBtn = screen.getByRole("button", {
			name: "Confirm Clear History?",
		});
		fireEvent.click(confirmBtn);

		expect(screen.getByText("Local audit history purged.")).toBeDefined();
		expect(localStorage.getItem("convrtr_history")).toBeNull();
	});
});
