import { describe, expect, it } from "vitest";
import { aseToCssEngine } from "../index";
import { cmykToRgb, labToRgb, parseAse, rgbToHex } from "../parser";

function buildMockAseFile(): Uint8Array {
	const chunks: Uint8Array[] = [];

	// Helper to create UTF-16 BE bytes with null terminator
	const encodeUtf16Be = (str: string) => {
		const bytes = new Uint8Array((str.length + 1) * 2);
		const v = new DataView(bytes.buffer);
		for (let i = 0; i < str.length; i++) {
			v.setUint16(i * 2, str.charCodeAt(i), false);
		}
		v.setUint16(str.length * 2, 0, false); // null terminator
		return bytes;
	};

	// 1. Group Start: "Brand Identity"
	const groupNameBytes = encodeUtf16Be("Brand Identity");
	const groupStartBytes = new Uint8Array(6 + 2 + groupNameBytes.length);
	const gv = new DataView(groupStartBytes.buffer);
	gv.setUint16(0, 0xc001, false); // Block type: Group Start
	gv.setUint32(2, 2 + groupNameBytes.length, false); // Block length
	gv.setUint16(6, groupNameBytes.length / 2, false); // Name length (chars)
	groupStartBytes.set(groupNameBytes, 8);
	chunks.push(groupStartBytes);

	// 2. Color 1: "Primary Blue" (RGB: 0.0, 0.5, 1.0 -> #0080ff)
	const c1NameBytes = encodeUtf16Be("Primary Blue");
	// Block len: 2 (nameLen) + nameBytes.length + 4 (model) + 12 (3 floats) + 2 (colorType)
	const c1Len = 2 + c1NameBytes.length + 4 + 12 + 2;
	const c1Bytes = new Uint8Array(6 + c1Len);
	const c1v = new DataView(c1Bytes.buffer);
	c1v.setUint16(0, 0x0001, false); // Color entry
	c1v.setUint32(2, c1Len, false);
	c1v.setUint16(6, c1NameBytes.length / 2, false);
	c1Bytes.set(c1NameBytes, 8);
	let off1 = 8 + c1NameBytes.length;
	// "RGB "
	c1Bytes[off1] = 0x52; // 'R'
	c1Bytes[off1 + 1] = 0x47; // 'G'
	c1Bytes[off1 + 2] = 0x42; // 'B'
	c1Bytes[off1 + 3] = 0x20; // ' '
	off1 += 4;
	c1v.setFloat32(off1, 0.0, false);
	c1v.setFloat32(off1 + 4, 0.5, false);
	c1v.setFloat32(off1 + 8, 1.0, false);
	off1 += 12;
	c1v.setUint16(off1, 0, false); // Global
	chunks.push(c1Bytes);

	// 3. Color 2: "Deep Magenta" (CMYK: 0.0, 1.0, 0.0, 0.0 -> Pure Magenta #ff00ff)
	const c2NameBytes = encodeUtf16Be("Deep Magenta");
	const c2Len = 2 + c2NameBytes.length + 4 + 16 + 2;
	const c2Bytes = new Uint8Array(6 + c2Len);
	const c2v = new DataView(c2Bytes.buffer);
	c2v.setUint16(0, 0x0001, false);
	c2v.setUint32(2, c2Len, false);
	c2v.setUint16(6, c2NameBytes.length / 2, false);
	c2Bytes.set(c2NameBytes, 8);
	let off2 = 8 + c2NameBytes.length;
	// "CMYK"
	c2Bytes[off2] = 0x43;
	c2Bytes[off2 + 1] = 0x4d;
	c2Bytes[off2 + 2] = 0x59;
	c2Bytes[off2 + 3] = 0x4b;
	off2 += 4;
	c2v.setFloat32(off2, 0.0, false); // C
	c2v.setFloat32(off2 + 4, 1.0, false); // M
	c2v.setFloat32(off2 + 8, 0.0, false); // Y
	c2v.setFloat32(off2 + 12, 0.0, false); // K
	off2 += 16;
	c2v.setUint16(off2, 1, false); // Spot
	chunks.push(c2Bytes);

	// 4. Group End
	const groupEndBytes = new Uint8Array(6);
	const gev = new DataView(groupEndBytes.buffer);
	gev.setUint16(0, 0xc002, false);
	gev.setUint32(2, 0, false);
	chunks.push(groupEndBytes);

	// 5. Color 3: "Slate Gray" (Gray: 0.5 -> #808080)
	const c3NameBytes = encodeUtf16Be("Slate Gray");
	const c3Len = 2 + c3NameBytes.length + 4 + 4 + 2;
	const c3Bytes = new Uint8Array(6 + c3Len);
	const c3v = new DataView(c3Bytes.buffer);
	c3v.setUint16(0, 0x0001, false);
	c3v.setUint32(2, c3Len, false);
	c3v.setUint16(6, c3NameBytes.length / 2, false);
	c3Bytes.set(c3NameBytes, 8);
	let off3 = 8 + c3NameBytes.length;
	// "Gray"
	c3Bytes[off3] = 0x47;
	c3Bytes[off3 + 1] = 0x72;
	c3Bytes[off3 + 2] = 0x61;
	c3Bytes[off3 + 3] = 0x79;
	off3 += 4;
	c3v.setFloat32(off3, 0.5, false);
	off3 += 4;
	c3v.setUint16(off3, 2, false); // Normal
	chunks.push(c3Bytes);

	// Total size
	let payloadSize = 0;
	for (const ch of chunks) payloadSize += ch.length;

	const fullAse = new Uint8Array(12 + payloadSize);
	const hv = new DataView(fullAse.buffer);
	// Magic "ASEF"
	fullAse[0] = 0x41;
	fullAse[1] = 0x53;
	fullAse[2] = 0x45;
	fullAse[3] = 0x46;
	hv.setUint16(4, 1, false); // Major = 1
	hv.setUint16(6, 0, false); // Minor = 0
	hv.setUint32(8, chunks.length, false); // 5 blocks

	let cursor = 12;
	for (const ch of chunks) {
		fullAse.set(ch, cursor);
		cursor += ch.length;
	}

	return fullAse;
}

describe("aseToCssEngine & ASE Parser", () => {
	it("probes successfully", async () => {
		const supported = await aseToCssEngine.probe();
		expect(supported).toBe(true);
	});

	it("converts CMYK and Lab color spaces to sRGB correctly", () => {
		// Pure cyan CMYK: 1, 0, 0, 0 -> RGB(0, 255, 255) -> #00ffff
		const [rC, gC, bC] = cmykToRgb(1.0, 0.0, 0.0, 0.0);
		expect(rC).toBe(0);
		expect(gC).toBe(255);
		expect(bC).toBe(255);
		expect(rgbToHex(rC, gC, bC)).toBe("#00ffff");

		// Pure black CMYK: 0, 0, 0, 1 -> RGB(0, 0, 0)
		const [rK, gK, bK] = cmykToRgb(0.0, 0.0, 0.0, 1.0);
		expect(rK).toBe(0);
		expect(gK).toBe(0);
		expect(bK).toBe(0);

		// Pure white Lab: L=100, a=0, b=0 -> RGB(255, 255, 255)
		const [rW, gW, bW] = labToRgb(100, 0, 0);
		expect(rW).toBe(255);
		expect(gW).toBe(255);
		expect(bW).toBe(255);
	});

	it("parses binary ASE palette into colors and structured CSS", () => {
		const aseBytes = buildMockAseFile();
		const result = parseAse(aseBytes);

		expect(result.colors).toHaveLength(3);
		const [c1, c2, c3] = result.colors;
		expect(c1).toBeDefined();
		expect(c2).toBeDefined();
		expect(c3).toBeDefined();
		if (!c1 || !c2 || !c3) return;

		// Color 1: Primary Blue (RGB)
		expect(c1.name).toBe("Primary Blue");
		expect(c1.group).toBe("Brand Identity");
		expect(c1.model).toBe("RGB");
		expect(c1.hex).toBe("#0080ff");
		expect(c1.type).toBe("Global");

		// Color 2: Deep Magenta (CMYK)
		expect(c2.name).toBe("Deep Magenta");
		expect(c2.group).toBe("Brand Identity");
		expect(c2.model).toBe("CMYK");
		expect(c2.hex).toBe("#ff00ff");
		expect(c2.type).toBe("Spot");

		// Color 3: Slate Gray (Gray)
		expect(c3.name).toBe("Slate Gray");
		expect(c3.group).toBeUndefined();
		expect(c3.model).toBe("Gray");
		expect(c3.hex).toBe("#808080");

		// CSS output check
		expect(result.css).toContain(":root {");
		expect(result.css).toContain("--primary-blue: #0080ff;");
		expect(result.css).toContain("--deep-magenta: #ff00ff;");
		expect(result.css).toContain("--slate-gray: #808080;");
		expect(result.css).toContain(
			"/* Tailwind CSS Color Palette Configuration: */",
		);
		expect(result.css).toContain('"primary-blue": "#0080ff"');
		expect(result.css).toContain('"deep-magenta": "#ff00ff"');
	});

	it("runs end-to-end via engine producing valid CSS ArrayBuffer", async () => {
		const aseBytes = buildMockAseFile();
		const progress: string[] = [];

		const result = await aseToCssEngine.run(
			aseBytes.buffer as ArrayBuffer,
			{},
			(_ratio, phase) => {
				progress.push(phase);
			},
		);

		expect(result.byteLength).toBeGreaterThan(0);
		const cssText = new TextDecoder("utf-8").decode(result);
		expect(cssText).toContain("--primary-blue: #0080ff;");
		expect(cssText).toContain("--deep-magenta: #ff00ff;");

		expect(progress).toContain("PARSING_ASE");
		expect(progress).toContain("GENERATING_CSS");
		expect(progress).toContain("DONE");
	});

	it("rejects non-ASE binary files", async () => {
		const invalid = new Uint8Array([
			0x4e, 0x4f, 0x50, 0x45, 0, 1, 0, 0, 0, 0, 0, 0,
		]);
		expect(() => parseAse(invalid)).toThrow(/does not match 'ASEF'/i);
	});
});
