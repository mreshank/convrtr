import { describe, expect, it } from "vitest";
import { svgSpriteSheetEngine } from "../sprite-sheet";

function buf(text: string): { array: ArrayBuffer; text: string } {
	return { array: new TextEncoder().encode(text).buffer as ArrayBuffer, text };
}

const STAR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <polygon points="32,4 40,24 62,26 46,40 51,62 32,50 13,62 18,40 2,26 24,24" fill="gold"/>
</svg>`;

const CIRCLE = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">
  <circle cx="16" cy="16" r="14" fill="rebeccapurple"/>
</svg>`;

const NOT_SVG = `<html><body><p>not svg</p></body></html>`;

async function unzip(zipped: ArrayBuffer): Promise<Record<string, string>> {
	const { unzipSync } = await import("fflate");
	const files = unzipSync(new Uint8Array(zipped));
	const out: Record<string, string> = {};
	for (const [name, data] of Object.entries(files)) {
		out[name] = new TextDecoder().decode(data as Uint8Array);
	}
	return out;
}

function combine(inputs: ArrayBuffer[]): Promise<ArrayBuffer> {
	if (!svgSpriteSheetEngine.runMany) {
		throw new Error("expected runMany to be defined");
	}
	return svgSpriteSheetEngine.runMany(inputs, {}, () => {});
}

describe("svgSpriteSheetEngine", () => {
	it("refuses a single-file run — a sheet needs something to combine", async () => {
		const { array } = buf(STAR);
		await expect(svgSpriteSheetEngine.run(array, {}, () => {})).rejects.toThrow(
			/at least two SVGs/,
		);
	});

	it("throws when fewer than two inputs are combined", async () => {
		const { array } = buf(STAR);
		await expect(combine([array])).rejects.toThrow(/at least two SVGs/);
	});

	it("throws on a combined input that is not an SVG", async () => {
		const { array: star } = buf(STAR);
		const { array: bad } = buf(NOT_SVG);
		await expect(combine([star, bad])).rejects.toThrow(
			/did not contain an <svg> element/,
		);
	});

	it("produces a zip with sprite.svg, sprites.css and demo.html inside", async () => {
		const { array: star } = buf(STAR);
		const { array: circle } = buf(CIRCLE);
		const files = await unzip(await combine([star, circle]));
		expect(Object.keys(files).sort()).toEqual([
			"demo.html",
			"sprite.svg",
			"sprites.css",
		]);
	});

	it("wraps each source as a symbol with a derived viewBox", async () => {
		const { array: star } = buf(STAR);
		const { array: circle } = buf(CIRCLE);
		const files = await unzip(await combine([star, circle]));
		expect(files["sprite.svg"]).toContain(
			'<symbol id="icon-1" viewBox="0 0 64 64">',
		);
		expect(files["sprite.svg"]).toContain(
			'<symbol id="icon-2" viewBox="0 0 32 32">',
		);
		// original vector markup preserved verbatim — lossless
		expect(files["sprite.svg"]).toContain('<polygon points="32,4');
		expect(files["sprite.svg"]).toContain('<circle cx="16"');
	});

	it("hides the sheet root so symbols define content without painting", async () => {
		const { array: star } = buf(STAR);
		const { array: circle } = buf(CIRCLE);
		const files = await unzip(await combine([star, circle]));
		expect(files["sprite.svg"]).toMatch(/<svg xmlns=.*style="display:none"/);
	});

	it("emits a css class per symbol sized from each viewBox", async () => {
		const { array: star } = buf(STAR);
		const { array: circle } = buf(CIRCLE);
		const files = await unzip(await combine([star, circle]));
		expect(files["sprites.css"]).toContain(".icon-1");
		expect(files["sprites.css"]).toContain("width: 64px;");
		expect(files["sprites.css"]).toContain(".icon-2");
		expect(files["sprites.css"]).toContain("width: 32px;");
	});

	it("falls back to a generic viewBox when a source sizes itself", async () => {
		const { array: a } = buf(STAR);
		const { array: b } = buf(CIRCLE);
		const { array: malformed } = buf(
			`<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h10v10z"/></svg>`,
		);
		const files = await unzip(await combine([a, b, malformed]));
		expect(files["sprites.css"]).toContain(".icon-3");
		expect(files["sprites.css"]).toContain("width: 24px;");
	});
});
