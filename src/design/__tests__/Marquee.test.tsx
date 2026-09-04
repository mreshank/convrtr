import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Marquee } from "@/design/primitives/Marquee";

describe("Marquee", () => {
	it("duplicates the track so the loop is seamless", () => {
		const { container } = render(
			<Marquee ariaLabel="Featured conversions">
				<span>item</span>
			</Marquee>,
		);
		expect(container.querySelectorAll("[data-marquee]").length).toBe(2);
	});

	it("puts data-marquee on the animated track, never the container", () => {
		// The reduced-motion rule in globals.css is
		// `[data-marquee] { animation-play-state: paused }`, which pauses only
		// the element it matches. If the attribute sat on the container the
		// rule would match an element carrying no animation, and would
		// silently do nothing for exactly the people who need it to work.
		const { container } = render(
			<Marquee ariaLabel="Featured">
				<span>item</span>
			</Marquee>,
		);
		const outer = container.firstElementChild as HTMLElement;
		expect(outer.hasAttribute("data-marquee")).toBe(false);
		for (const track of container.querySelectorAll<HTMLElement>(
			"[data-marquee]",
		)) {
			expect(track.style.animationName).toBe("marquee-scroll");
		}
	});

	it("names the region once and hides the duplicate track", () => {
		render(
			<Marquee ariaLabel="Featured conversions">
				<span>item</span>
			</Marquee>,
		);
		const region = screen.getByLabelText("Featured conversions");
		const tracks = region.querySelectorAll("[data-marquee]");
		expect(tracks[0]?.getAttribute("aria-hidden")).toBeNull();
		expect(tracks[1]?.getAttribute("aria-hidden")).toBe("true");
	});
});
