import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MediaFrame } from "@/design/primitives/MediaFrame";

describe("MediaFrame", () => {
	it("starts fully desaturated", () => {
		// DESIGN.md permits colour nowhere except photography, and only on
		// hover. At rest this frame is part of the monochrome system.
		const { container } = render(
			<MediaFrame>
				<span>img</span>
			</MediaFrame>,
		);
		const el = container.firstElementChild as HTMLElement;
		expect(el.style.filter).toBe("grayscale(100%)");
	});

	it("transitions over the hover duration with the system easing", () => {
		const { container } = render(
			<MediaFrame>
				<span>img</span>
			</MediaFrame>,
		);
		const el = container.firstElementChild as HTMLElement;
		expect(el.style.transitionDuration).toBe("var(--dur-hover)");
		expect(el.style.transitionTimingFunction).toBe("var(--ease)");
	});

	it("is marked so the stylesheet can reach it on hover", () => {
		const { container } = render(
			<MediaFrame>
				<span>img</span>
			</MediaFrame>,
		);
		expect(
			(container.firstElementChild as HTMLElement).hasAttribute("data-media"),
		).toBe(true);
	});
});
