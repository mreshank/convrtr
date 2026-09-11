import { describe, expect, it } from "vitest";
import { acoToCssEngine } from "../index";
import { parseAco } from "../parser";

function createSyntheticAcoV1(): Uint8Array {
	// 2 swatches: Red (65535, 0, 0) and Blue (0, 0, 65535)
	const buffer = new ArrayBuffer(4 + 2 * 10);
	const view = new DataView(buffer);

	view.setUint16(0, 1); // Version 1
	view.setUint16(2, 2); // 2 colors

	// Swatch 1: RGB (0) Red
	view.setUint16(4, 0); // Color space 0 (RGB)
	view.setUint16(6, 65535); // w = R (65535)
	view.setUint16(8, 0); // x = G (0)
	view.setUint16(10, 0); // y = B (0)
	view.setUint16(12, 0); // z = unused

	// Swatch 2: RGB (0) Blue
	view.setUint16(14, 0); // Color space 0 (RGB)
	view.setUint16(16, 0); // w = R (0)
	view.setUint16(18, 0); // x = G (0)
	view.setUint16(20, 65535); // y = B (65535)
	view.setUint16(22, 0); // z = unused

	return new Uint8Array(buffer);
}

function createSyntheticAcoV2(): Uint8Array {
	// V1 block (2 colors) followed by V2 block with names "Coral" and "Sky"
	const v1 = createSyntheticAcoV1();

	const name1 = "Coral\0";
	const name2 = "Sky\0";

	// V2 header (4 bytes) + 2 colors (each: 10 bytes specs + 2 bytes reserved + 4 bytes len + len*2 chars)
	const v2Len =
		4 +
		(10 + 2 + 4 + name1.length * 2) +
		(10 + 2 + 4 + name2.length * 2);

	const v2Buffer = new ArrayBuffer(v2Len);
	const view = new DataView(v2Buffer);

	view.setUint16(0, 2); // Version 2
	view.setUint16(2, 2); // 2 colors

	let offset = 4;

	// Swatch 1: Coral
	view.setUint16(offset, 0); // RGB
	view.setUint16(offset + 2, 65535);
	view.setUint16(offset + 4, 32768);
	view.setUint16(offset + 6, 32768);
	view.setUint16(offset + 8, 0);
	offset += 10;
	view.setUint16(offset, 0); // reserved
	offset += 2;
	view.setUint32(offset, name1.length);
	offset += 4;
	for (let i = 0; i < name1.length; i++) {
		view.setUint16(offset + i * 2, name1.charCodeAt(i));
	}
	offset += name1.length * 2;

	// Swatch 2: Sky
	view.setUint16(offset, 0); // RGB
	view.setUint16(offset + 2, 0);
	view.setUint16(offset + 4, 32768);
	view.setUint16(offset + 6, 65535);
	view.setUint16(offset + 8, 0);
	offset += 10;
	view.setUint16(offset, 0); // reserved
	offset += 2;
	view.setUint32(offset, name2.length);
	offset += 4;
	for (let i = 0; i < name2.length; i++) {
		view.setUint16(offset + i * 2, name2.charCodeAt(i));
	}

	const combined = new Uint8Array(v1.length + v2Len);
	combined.set(v1, 0);
	combined.set(new Uint8Array(v2Buffer), v1.length);

	return combined;
}

describe("Adobe Photoshop (.aco) Parser & Engine", () => {
	it("parses Version 1 files and produces CSS custom properties", () => {
		const acoBytes = createSyntheticAcoV1();
		const result = parseAco(acoBytes, { format: "css" });

		expect(result.version).toBe(1);
		expect(result.colors).toHaveLength(2);
		expect(result.colors[0]?.hex).toBe("#ff0000");
		expect(result.colors[1]?.hex).toBe("#0000ff");
		expect(result.cssText).toContain("--color-1: #ff0000;");
		expect(result.cssText).toContain("--color-2: #0000ff;");
	});

	it("parses Version 2 files, extracts swatch names and prioritizes v2", () => {
		const acoBytes = createSyntheticAcoV2();
		const result = parseAco(acoBytes, { format: "css" });

		expect(result.version).toBe(2);
		expect(result.colors).toHaveLength(2);
		expect(result.colors[0]?.name).toBe("Coral");
		expect(result.colors[0]?.slug).toBe("coral");
		expect(result.colors[1]?.name).toBe("Sky");
		expect(result.colors[1]?.slug).toBe("sky");
		expect(result.cssText).toContain("--coral:");
		expect(result.cssText).toContain("--sky:");
	});

	it("exports Tailwind CSS config format", () => {
		const acoBytes = createSyntheticAcoV2();
		const result = parseAco(acoBytes, { format: "tailwind" });

		expect(result.cssText).toContain("module.exports = {");
		expect(result.cssText).toContain('"coral":');
		expect(result.cssText).toContain('"sky":');
	});

	it("exports JSON format", () => {
		const acoBytes = createSyntheticAcoV2();
		const result = parseAco(acoBytes, { format: "json" });

		const parsedJson = JSON.parse(result.cssText);
		expect(Array.isArray(parsedJson)).toBe(true);
		expect(parsedJson[0].name).toBe("Coral");
		expect(parsedJson[0].rgb).toBeDefined();
		expect(parsedJson[0].hsl).toBeDefined();
	});

	it("throws on corrupted or undersized file", () => {
		const badBytes = new Uint8Array([0x00, 0x05]); // invalid version
		expect(() => parseAco(badBytes)).toThrow(/too small/);
	});

	it("executes via acoToCssEngine", async () => {
		const acoBytes = createSyntheticAcoV2();
		const outputBuffer = await acoToCssEngine.run(
			acoBytes.buffer as ArrayBuffer,
			{ format: "css" },
			() => {},
		);

		const text = new TextDecoder().decode(outputBuffer);
		expect(text).toContain(":root {");
		expect(text).toContain("--coral:");
	});
});
