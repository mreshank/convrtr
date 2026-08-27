import { describe, expect, it } from "vitest";
import { svgOptimiseEngine } from "../optimise";

function buf(text: string): ArrayBuffer {
	return new TextEncoder().encode(text).buffer as ArrayBuffer;
}

function text(output: ArrayBuffer): string {
	return new TextDecoder().decode(output);
}

const MESSY = `<?xml version="1.0"?>
<!-- drawn in some editor -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <metadata>tool fingerprint and a filesystem path</metadata>
  <g>
    <rect id="keep-me" x="10.000000" y="10.000000" width="80.000000" height="80.000000" fill="#ff0000"/>
  </g>
</svg>`;

describe("svgOptimiseEngine", () => {
	it("shrinks the file", async () => {
		const input = buf(MESSY);
		const out = await svgOptimiseEngine.run(input, {}, () => {});
		expect(out.byteLength).toBeLessThan(input.byteLength);
	});

	it("removes comments and metadata", async () => {
		const out = text(await svgOptimiseEngine.run(buf(MESSY), {}, () => {}));
		expect(out).not.toContain("drawn in some editor");
		expect(out).not.toContain("filesystem path");
	});

	it("keeps viewBox — removing it breaks responsive scaling", async () => {
		// SVGO's own default removes viewBox. That is wrong for web use, where
		// scaling to a container is the main reason to choose SVG at all, so the
		// preset is explicitly overridden.
		const out = text(await svgOptimiseEngine.run(buf(MESSY), {}, () => {}));
		expect(out).toContain("viewBox");
	});

	it("keeps ids by default — they may be referenced from outside the file", async () => {
		// An id can be targeted by external CSS, JS, or <use> in another
		// document. Renaming it saves bytes and silently breaks the reference.
		const out = text(await svgOptimiseEngine.run(buf(MESSY), {}, () => {}));
		expect(out).toContain("keep-me");
	});

	it("still renders the shape it was given", async () => {
		const out = text(await svgOptimiseEngine.run(buf(MESSY), {}, () => {}));
		expect(out).toContain("<svg");
		expect(out).toMatch(/rect|path/);
		expect(out.toLowerCase()).toMatch(/red|#f00|#ff0000/);
	});

	it("respects a lower coordinate precision", async () => {
		const precise = text(
			await svgOptimiseEngine.run(
				buf(
					'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M1.23456 2.34567 L3.45678 4.56789"/></svg>',
				),
				{ floatPrecision: 5 },
				() => {},
			),
		);
		const rounded = text(
			await svgOptimiseEngine.run(
				buf(
					'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M1.23456 2.34567 L3.45678 4.56789"/></svg>',
				),
				{ floatPrecision: 1 },
				() => {},
			),
		);
		expect(rounded.length).toBeLessThan(precise.length);
	});

	it("rejects input that is not an SVG", async () => {
		await expect(
			svgOptimiseEngine.run(buf("just some text"), {}, () => {}),
		).rejects.toThrow(/svg/i);
	});

	it("reports monotonic progress ending at 1", async () => {
		const ticks: number[] = [];
		await svgOptimiseEngine.run(buf(MESSY), {}, (ratio) => ticks.push(ratio));
		expect(ticks).toEqual([...ticks].sort((a, b) => a - b));
		expect(ticks.at(-1)).toBe(1);
	});
});
