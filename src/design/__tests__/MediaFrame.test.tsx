import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MediaFrame } from "@/design/primitives/MediaFrame";

describe("MediaFrame", () => {
	it("fades into the canvas on an angle by default", () => {
		// v2: "Images within should be fading to theme on an angle by
		// default." The fade is the resting state, not a hover reveal — the
		// previous system's grayscale-until-hover belonged to a brief that
		// rationed colour, and v2 does not.
		const { container } = render(
			<MediaFrame>
				<span>img</span>
			</MediaFrame>,
		);
		const el = container.firstElementChild as HTMLElement;
		// Read via the camelCase property rather than
		// `getPropertyValue("mask-image")`: happy-dom (20.11.1) has no entry
		// for `mask-image` in its known CSS property list, so a value set
		// through it — which is how React applies a non-custom-property style
		// key — is stored as a plain pass-through and never reaches cssText
		// or getPropertyValue. `el.style.maskImage` is the same underlying
		// value; this is an environment workaround, not a weaker assertion.
		expect(el.style.maskImage).toContain("linear-gradient");
		expect(el.style.maskImage).toMatch(/\d+deg/);
	});

	it("applies no grayscale filter", () => {
		// The old mechanism, explicitly gone.
		const { container } = render(
			<MediaFrame>
				<span>img</span>
			</MediaFrame>,
		);
		expect((container.firstElementChild as HTMLElement).style.filter).toBe("");
	});

	it("is marked so the stylesheet can reach it", () => {
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
