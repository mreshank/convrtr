import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HOME } from "@/app/home-content";
import { HomePage } from "@/design/templates/HomePage";

describe("HomePage", () => {
	it("renders every band the home page declares", () => {
		const { container } = render(<HomePage content={HOME} />);
		// The hero, plus one wrapper per band, inside EditorialPage's shell.
		const shell = container.querySelector("[data-editorial]") as HTMLElement;
		expect(shell).not.toBeNull();
		expect(shell.children.length).toBeGreaterThanOrEqual(7);
	});

	it("delegates the shell to EditorialPage rather than reimplementing it", () => {
		// Two templates, two jobs: EditorialPage knows the rhythm, HomePage
		// knows the sequence. A HomePage that laid out its own bands would
		// duplicate the one thing EditorialPage exists for.
		const { container } = render(<HomePage content={HOME} />);
		const shell = container.querySelector("[data-editorial]") as HTMLElement;
		expect(shell.style.getPropertyValue("gap")).toBe("var(--section-pad)");
	});

	it("puts the page's one h1 in the hero", () => {
		const { container } = render(<HomePage content={HOME} />);
		expect(container.querySelectorAll("h1").length).toBe(1);
	});
});
