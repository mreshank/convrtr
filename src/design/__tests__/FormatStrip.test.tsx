import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormatStrip } from "@/design/families/FormatStrip";

const FORMATS = ["avif", "flac", "gif", "heic", "jpg", "pdf", "png", "webp"];

describe("FormatStrip", () => {
	it("renders every format", () => {
		const { container } = render(<FormatStrip formats={FORMATS} />);
		// The marquee duplicates its track for a seamless loop, so each
		// format appears twice: once real, once in the aria-hidden copy.
		const text = container.textContent ?? "";
		for (const format of FORMATS) expect(text).toContain(format.toUpperCase());
	});

	it("scrolls through the existing marquee primitive, not its own loop", () => {
		// Reimplementing the scroll would duplicate the primitive's seamless
		// track, its aria-hidden duplicate, and the reduced-motion pause that
		// is keyed on [data-marquee].
		const { container } = render(<FormatStrip formats={FORMATS} />);
		expect(container.querySelector("[data-marquee]")).not.toBeNull();
	});

	it("announces the list once, not twice", () => {
		// The duplicate track exists for the loop, not for the reader.
		const { container } = render(<FormatStrip formats={FORMATS} />);
		const hidden = container.querySelectorAll('[aria-hidden="true"]');
		expect(hidden.length).toBeGreaterThan(0);
	});

	it("renders nothing at all when there are no formats", () => {
		// An empty marquee still animates an empty track, which is a moving
		// blank band. Better to render nothing.
		const { container } = render(<FormatStrip formats={[]} />);
		expect(container.firstElementChild).toBeNull();
	});
});
