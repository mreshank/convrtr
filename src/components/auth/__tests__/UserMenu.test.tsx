import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserMenu } from "../UserMenu";

// Mock Clerk hook
vi.mock("@clerk/react", () => ({
	useUser: () => ({ isSignedIn: false, user: null }),
	UserButton: () => <div data-testid="user-button">User Button</div>,
}));

describe("UserMenu component", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		localStorage.clear();
		vi.restoreAllMocks();
	});

	it("renders user avatar icon button with accessible aria-label and no raw text", () => {
		render(<UserMenu />);

		const button = screen.getByRole("link", { name: "Sign In" });
		expect(button).toBeDefined();
		expect(button.getAttribute("href")).toBe("/auth");

		// Ensure it renders SVG icon rather than plain text "Sign In" inside the link
		const svg = button.querySelector("svg");
		expect(svg).toBeDefined();
		expect(svg?.getAttribute("aria-hidden")).toBe("true");
	});

	it("shows Tooltip on focus of the avatar button", () => {
		render(<UserMenu />);

		const link = screen.getByRole("link", { name: "Sign In" });
		fireEvent.focus(link);

		const tooltip = screen.getByRole("tooltip");
		expect(tooltip).toBeDefined();
		expect(tooltip.textContent).toBe("Sign In");
	});

	it("indicates active workspace session when local session is stored", () => {
		localStorage.setItem(
			"convrtr_workspace_session",
			JSON.stringify({ id: "ws-123", name: "Studio", createdAt: 12345 }),
		);

		render(<UserMenu />);

		const link = screen.getByRole("link", {
			name: "Manage active workspace session",
		});
		expect(link).toBeDefined();

		fireEvent.focus(link);
		const tooltip = screen.getByRole("tooltip");
		expect(tooltip.textContent).toContain("Workspace Active");
	});
});
