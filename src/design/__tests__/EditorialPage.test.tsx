import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorialPage } from "@/design/templates/EditorialPage";

const HERO = <div data-testid="hero">hero</div>;
const BANDS = [
	{ key: "a", node: <section data-testid="band-a">a</section> },
	{ key: "b", node: <section data-testid="band-b">b</section> },
];

describe("EditorialPage", () => {
	it("renders the hero first, then every band in order", () => {
		const { container } = render(<EditorialPage hero={HERO} bands={BANDS} />);
		const seen = [...container.querySelectorAll("[data-testid]")].map((el) =>
			el.getAttribute("data-testid"),
		);
		expect(seen).toEqual(["hero", "band-a", "band-b"]);
	});

	it("spaces bands from the scale, never from a literal", () => {
		// The previous plan shipped a stub wrapper whose gap-4 clamped every
		// band to 16px apart and whose max-w-4xl made every family's own
		// --max-width permanently dead. The template owns this now.
		const { container } = render(<EditorialPage hero={HERO} bands={BANDS} />);
		const shell = container.querySelector("[data-editorial]") as HTMLElement;
		expect(shell.style.getPropertyValue("gap")).toBe("var(--section-pad)");
	});

	it("imposes no max-width of its own", () => {
		// Each family carries its own var(--max-width). A competing clamp on
		// the shell is what made those dead last time.
		const { container } = render(<EditorialPage hero={HERO} bands={BANDS} />);
		const shell = container.querySelector("[data-editorial]") as HTMLElement;
		expect(shell.style.maxWidth).toBe("");
	});

	it("renders nothing for an empty band list rather than an empty shell", () => {
		const { container } = render(<EditorialPage hero={HERO} bands={[]} />);
		expect(container.querySelectorAll("section").length).toBe(0);
	});
});
