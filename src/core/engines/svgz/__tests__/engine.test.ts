import { gzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { convertSvgzToSvg, isGzip } from "../parser";

describe("SVGZ Engine", () => {
	it("detects GZIP magic correctly", () => {
		const gz = new Uint8Array([0x1f, 0x8b, 0x08, 0x00]);
		expect(isGzip(gz)).toBe(true);

		const plain = new TextEncoder().encode("<svg></svg>");
		expect(isGzip(plain)).toBe(false);
	});

	it("decompresses valid SVGZ into standard SVG with attributes", () => {
		const rawSvg = `<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <circle cx="400" cy="300" r="100" fill="red" />
</svg>`;
		const rawBytes = new TextEncoder().encode(rawSvg);
		const compressed = gzipSync(rawBytes);

		const result = convertSvgzToSvg(compressed);
		expect(result.svgText).toBe(rawSvg);
		expect(result.width).toBe("800");
		expect(result.height).toBe("600");
		expect(result.viewBox).toBe("0 0 800 600");
		expect(result.svgBuffer.length).toBe(rawBytes.length);
	});

	it("handles uncompressed SVG as a graceful fallback", () => {
		const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>`;
		const rawBytes = new TextEncoder().encode(rawSvg);

		const result = convertSvgzToSvg(rawBytes);
		expect(result.svgText).toBe(rawSvg);
	});

	it("throws on invalid corrupted archive or non-SVG payload", () => {
		const badGz = new Uint8Array([0x1f, 0x8b, 0x99, 0x99, 0x01, 0x02]);
		expect(() => convertSvgzToSvg(badGz)).toThrow(/Failed to decompress/);

		const nonSvg = gzipSync(
			new TextEncoder().encode("Hello world this is plain text"),
		);
		expect(() => convertSvgzToSvg(nonSvg)).toThrow(
			/does not contain an <svg> element/,
		);
	});
});
