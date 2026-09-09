import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RootLayout from "@/app/layout";

describe("RootLayout", () => {
	// Rendering a layout that returns <html> inside a container produces a
	// DOM-nesting warning but a usable tree; we assert on the chrome, not on
	// the document shape.
	it("renders the site header and footer, not an ad-hoc bar", () => {
		const { container } = render(
			<RootLayout params={Promise.resolve({})}>
				<main>content</main>
			</RootLayout>,
		);
		expect(container.querySelector("header")).not.toBeNull();
		expect(container.querySelector("footer")).not.toBeNull();
	});

	it("gives the header a wordmark home link and a CTA", () => {
		render(
			<RootLayout params={Promise.resolve({})}>
				<main>content</main>
			</RootLayout>,
		);
		expect(
			screen.getByRole("link", { name: "convrtr" }).getAttribute("href"),
		).toBe("/");
		expect(screen.getByRole("link", { name: /convert/i })).toBeDefined();
	});

	it("routes every nav destination to a route that exists", () => {
		// A header link to a route with no page.tsx is a 404 shipped in the
		// chrome of every page. Task 5 adds the marketing and legal pages;
		// groups and collectives are still being built by other agents and
		// stay off this list until they land.
		render(
			<RootLayout params={Promise.resolve({})}>
				<main>content</main>
			</RootLayout>,
		);
		const built = new Set([
			"/",
			"/tools",
			"/blog",
			"/about",
			"/how-it-works",
			"/privacy",
			"/legal/terms",
			"/legal/privacy-policy",
			"/legal/licences",
		]);
		for (const link of screen.getAllByRole("link")) {
			const href = link.getAttribute("href") ?? "";
			if (href.startsWith("/")) expect(built.has(href)).toBe(true);
		}
	});
});
