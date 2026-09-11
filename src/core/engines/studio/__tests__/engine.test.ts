import { gzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { studio3ToSvgEngine } from "../index";

describe("studio3ToSvgEngine", () => {
	it("probes successfully", async () => {
		expect(await studio3ToSvgEngine.probe()).toBe(true);
	});

	it("converts a .studio3 zip containing XML shapes into clean SVG", async () => {
		const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<DOCUMENT width="400" height="300">
  <SHAPE DATA="M 10 10 L 50 10 L 50 50 Z" PEN_COLOR="0xFF0000" FILL_COLOR="0x00FF00" />
  <line x1="5" y1="5" x2="100" y2="100" PEN_COLOR="blue" />
  <circle cx="50" cy="50" r="20" PEN_COLOR="black" />
</DOCUMENT>`;

		const zipData = zipSync({
			"Document.xml": new TextEncoder().encode(sampleXml),
		});

		const result = await studio3ToSvgEngine.run(zipData.buffer, {}, () => {});
		const svgText = new TextDecoder().decode(result);

		expect(svgText).toContain("<svg");
		expect(svgText).toContain('viewBox="0 0 400 300"');
		expect(svgText).toContain('d="M 10 10 L 50 10 L 50 50 Z"');
		expect(svgText).toContain('<line x1="5" y1="5" x2="100" y2="100"');
		expect(svgText).toContain('<circle cx="50" cy="50" r="20"');
		expect(svgText).toContain("</svg>");
	});

	it("converts gzip-compressed .studio xml file", async () => {
		const xml = `<PAGE width="200" height="200"><path d="M 0 0 L 10 10" stroke="red" /></PAGE>`;
		const gz = gzipSync(new TextEncoder().encode(xml));

		const result = await studio3ToSvgEngine.run(gz.buffer, {}, () => {});
		const svgText = new TextDecoder().decode(result);

		expect(svgText).toContain("<svg");
		expect(svgText).toContain('viewBox="0 0 200 200"');
		expect(svgText).toContain('d="M 0 0 L 10 10"');
	});

	it("rejects files that are too small or contain no XML", async () => {
		const tooSmall = new Uint8Array([1, 2, 3]);
		await expect(
			studio3ToSvgEngine.run(tooSmall.buffer, {}, () => {}),
		).rejects.toThrow(/too small/i);

		const invalid = new TextEncoder().encode(
			"random non-xml plain text bytes that do not look like studio",
		);
		await expect(
			studio3ToSvgEngine.run(invalid.buffer, {}, () => {}),
		).rejects.toThrow(/no vector document or xml/i);
	});
});
