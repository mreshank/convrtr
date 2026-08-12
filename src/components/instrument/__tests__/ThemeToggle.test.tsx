import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { ThemeToggle } from "../ThemeToggle";

function stubMatchMedia(prefersDark: boolean) {
	vi.stubGlobal(
		"matchMedia",
		vi.fn().mockImplementation((query: string) => ({
			matches: query.includes("dark") ? prefersDark : false,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})),
	);
}

beforeEach(() => {
	window.localStorage.clear();
	document.documentElement.removeAttribute("data-theme");
	stubMatchMedia(false);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("ThemeToggle", () => {
	it("renders all three options with SYS checked by default", () => {
		render(<ThemeToggle />);
		expect(
			screen.getByRole("radio", { name: "SYS" }).getAttribute("aria-checked"),
		).toBe("true");
		expect(
			screen.getByRole("radio", { name: "LIGHT" }).getAttribute("aria-checked"),
		).toBe("false");
		expect(
			screen.getByRole("radio", { name: "DARK" }).getAttribute("aria-checked"),
		).toBe("false");
	});

	it("selecting LIGHT sets data-theme=light and persists the choice", () => {
		render(<ThemeToggle />);
		fireEvent.click(screen.getByRole("radio", { name: "LIGHT" }));

		expect(document.documentElement.getAttribute("data-theme")).toBe("light");
		expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
		expect(
			screen.getByRole("radio", { name: "LIGHT" }).getAttribute("aria-checked"),
		).toBe("true");
	});

	it("selecting DARK sets data-theme=dark and persists the choice", () => {
		render(<ThemeToggle />);
		fireEvent.click(screen.getByRole("radio", { name: "DARK" }));

		expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
		expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
	});

	it("selecting SYS resolves against the system preference and persists 'system'", () => {
		stubMatchMedia(true);
		render(<ThemeToggle />);
		fireEvent.click(screen.getByRole("radio", { name: "DARK" }));
		fireEvent.click(screen.getByRole("radio", { name: "SYS" }));

		expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
		expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("system");
	});

	it("picks up a previously stored preference on mount", () => {
		window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
		render(<ThemeToggle />);

		expect(
			screen.getByRole("radio", { name: "DARK" }).getAttribute("aria-checked"),
		).toBe("true");
	});
});
