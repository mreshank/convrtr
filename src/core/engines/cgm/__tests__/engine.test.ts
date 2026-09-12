import { describe, expect, it } from "vitest";
import { convertCgmToSvg } from "../parser";

describe("CGM to SVG engine", () => {
	it("converts clear-text CGM with multiple primitives into valid SVG", () => {
		const cgmText = `
BEGMF 'Schematic 101';
MFDESC 'Aerospace hydraulic diagram';
VDCEXT (0, 0) (800, 600);
LINECOLR 1;
LINEWIDTH 2;
LINE (50, 50) (200, 50) (200, 200);
FILLCOLR 255 0 0;
RECT (100, 100) (250, 180);
CIRCLE (400, 300) 50;
POLYGON (500, 100) (600, 150) (550, 250);
TEXT (100, 30) 'VALVE PUMP-A';
ENDPIC;
ENDMF;
`;
		const bytes = new TextEncoder().encode(cgmText);
		const result = convertCgmToSvg(bytes);

		expect(result.metadata.title).toBe("Schematic 101");
		expect(result.metadata.description).toBe("Aerospace hydraulic diagram");
		expect(result.metadata.width).toBe(800);
		expect(result.metadata.height).toBe(600);
		expect(result.metadata.elementCount).toBe(5);
		expect(result.metadata.primitiveCounts.polylines).toBe(1);
		expect(result.metadata.primitiveCounts.rectangles).toBe(1);
		expect(result.metadata.primitiveCounts.circles).toBe(1);
		expect(result.metadata.primitiveCounts.polygons).toBe(1);
		expect(result.metadata.primitiveCounts.text).toBe(1);

		expect(result.svg).toContain("<svg");
		expect(result.svg).toContain('viewBox="0 0 800 600"');
		expect(result.svg).toContain("<polyline");
		expect(result.svg).toContain("<rect");
		expect(result.svg).toContain("<circle");
		expect(result.svg).toContain("<polygon");
		expect(result.svg).toContain("VALVE PUMP-A");
		expect(result.svg).toContain("</svg>");
	});

	it("converts binary encoded CGM commands", () => {
		// Construct synthetic binary CGM
		const buffer = new ArrayBuffer(256);
		const view = new DataView(buffer);
		const bytes = new Uint8Array(buffer);
		let offset = 0;

		// 1. BEGMF (Class 0, ID 1, len 8: "TEST CGM")
		const begmfCmd = (0 << 12) | (1 << 5) | 8;
		view.setUint16(offset, begmfCmd, false);
		offset += 2;
		new TextEncoder().encodeInto(
			"TEST CGM",
			bytes.subarray(offset, offset + 8),
		);
		offset += 8;

		// 2. VDCEXT (Class 2, ID 6, len 8: 0, 0, 500, 400)
		const vdcCmd = (2 << 12) | (6 << 5) | 8;
		view.setUint16(offset, vdcCmd, false);
		offset += 2;
		view.setInt16(offset, 0, false);
		view.setInt16(offset + 2, 0, false);
		view.setInt16(offset + 4, 500, false);
		view.setInt16(offset + 6, 400, false);
		offset += 8;

		// 3. RECT (Class 4, ID 11, len 8: 10, 10, 200, 150)
		const rectCmd = (4 << 12) | (11 << 5) | 8;
		view.setUint16(offset, rectCmd, false);
		offset += 2;
		view.setInt16(offset, 10, false);
		view.setInt16(offset + 2, 10, false);
		view.setInt16(offset + 4, 200, false);
		view.setInt16(offset + 6, 150, false);
		offset += 8;

		// 4. ENDMF (Class 0, ID 2, len 0)
		const endmfCmd = (0 << 12) | (2 << 5) | 0;
		view.setUint16(offset, endmfCmd, false);
		offset += 2;

		const validBytes = bytes.subarray(0, offset);
		const result = convertCgmToSvg(validBytes);

		expect(result.metadata.title).toBe("TEST CGM");
		expect(result.metadata.width).toBe(500);
		expect(result.metadata.height).toBe(400);
		expect(result.metadata.primitiveCounts.rectangles).toBe(1);
		expect(result.svg).toContain("<rect");
	});

	it("reports progress accurately across phases", () => {
		const phases: string[] = [];
		const ratios: number[] = [];
		const cgmText =
			"BEGMF 'Test'; VDCEXT (0,0) (100,100); LINE (0,0) (100,100); ENDMF;";

		convertCgmToSvg(new TextEncoder().encode(cgmText), {}, (ratio, phase) => {
			ratios.push(ratio);
			phases.push(phase);
		});

		expect(phases).toContain("READ_INPUT");
		expect(phases).toContain("PARSE_CGM");
		expect(phases).toContain("GENERATE_SVG");
		expect(phases).toContain("COMPLETE");
		expect(ratios[ratios.length - 1]).toBe(1.0);
	});

	it("throws an error for truncated or invalid data", () => {
		expect(() => convertCgmToSvg(new Uint8Array([1, 2]))).toThrow(
			/too small to be a valid metafile/,
		);
	});
});
