import { describe, expect, it } from "vitest";
import { convertDcmToPng, dcmToPngEngine } from "../index";

function createMockDicomFile(options: {
	modality?: string;
	rows?: number;
	cols?: number;
	bitsAllocated?: number;
	windowCenter?: number;
	windowWidth?: number;
	samplesPerPixel?: number;
}): Uint8Array {
	const rows = options.rows ?? 4;
	const cols = options.cols ?? 4;
	const bitsAllocated = options.bitsAllocated ?? 16;
	const modality = options.modality ?? "MR";

	const buffer: number[] = [];

	// 128-byte preamble
	for (let i = 0; i < 128; i++) buffer.push(0);

	// 'DICM'
	buffer.push(0x44, 0x49, 0x43, 0x4d);

	function writeElement(group: number, element: number, vr: string, data: Uint8Array) {
		// Group (2 bytes LE)
		buffer.push(group & 0xff, (group >> 8) & 0xff);
		// Element (2 bytes LE)
		buffer.push(element & 0xff, (element >> 8) & 0xff);
		// VR (2 bytes ASCII)
		buffer.push(vr.charCodeAt(0), vr.charCodeAt(1));

		const isLong = ["OB", "OW", "OF", "SQ", "UT", "UN"].includes(vr);
		if (isLong) {
			buffer.push(0, 0); // reserved
			const len = data.length;
			buffer.push(len & 0xff, (len >> 8) & 0xff, (len >> 16) & 0xff, (len >> 24) & 0xff);
		} else {
			const len = data.length;
			buffer.push(len & 0xff, (len >> 8) & 0xff);
		}

		for (let i = 0; i < data.length; i++) {
			buffer.push(data[i] ?? 0);
		}
		// Pad to even length if odd
		if (data.length % 2 !== 0) {
			buffer.push(0);
		}
	}

	function writeUint16(group: number, element: number, val: number) {
		const b = new Uint8Array(2);
		new DataView(b.buffer).setUint16(0, val, true);
		writeElement(group, element, "US", b);
	}

	function writeString(group: number, element: number, vr: string, s: string) {
		writeElement(group, element, vr, new TextEncoder().encode(s));
	}

	// Modality (0008,0060)
	writeString(0x0008, 0x0060, "CS", modality);
	// Rows (0028,0010)
	writeUint16(0x0028, 0x0010, rows);
	// Columns (0028,0011)
	writeUint16(0x0028, 0x0011, cols);
	// Bits Allocated (0028,0100)
	writeUint16(0x0028, 0x0100, bitsAllocated);

	if (options.windowCenter !== undefined) {
		writeString(0x0028, 0x1050, "DS", String(options.windowCenter));
	}
	if (options.windowWidth !== undefined) {
		writeString(0x0028, 0x1051, "DS", String(options.windowWidth));
	}

	// Pixel Data (7FE0,0010)
	const pixelCount = rows * cols;
	if (bitsAllocated === 16) {
		const pData = new Uint8Array(pixelCount * 2);
		const pv = new DataView(pData.buffer);
		for (let i = 0; i < pixelCount; i++) {
			pv.setUint16(i * 2, i * 100, true);
		}
		writeElement(0x7fe0, 0x0010, "OW", pData);
	} else {
		const pData = new Uint8Array(pixelCount);
		for (let i = 0; i < pixelCount; i++) {
			pData[i] = i * 16;
		}
		writeElement(0x7fe0, 0x0010, "OB", pData);
	}

	return new Uint8Array(buffer);
}

describe("DICOM to PNG Engine", () => {
	it("decodes 16-bit CT/MR DICOM file into lossless 32-bit PNG", () => {
		const dcmBytes = createMockDicomFile({
			modality: "CT",
			rows: 8,
			cols: 8,
			bitsAllocated: 16,
			windowCenter: 500,
			windowWidth: 1000,
		});

		const result = convertDcmToPng(dcmBytes);

		expect(result.metadata.modality).toBe("CT");
		expect(result.metadata.rows).toBe(8);
		expect(result.metadata.columns).toBe(8);
		expect(result.metadata.bitsAllocated).toBe(16);

		// PNG header signature: 0x89 'P' 'N' 'G'
		expect(result.pngBytes[0]).toBe(0x89);
		expect(result.pngBytes[1]).toBe(0x50);
		expect(result.pngBytes[2]).toBe(0x4e);
		expect(result.pngBytes[3]).toBe(0x47);
	});

	it("decodes 8-bit grayscale ultrasound/X-ray DICOM file", () => {
		const dcmBytes = createMockDicomFile({
			modality: "US",
			rows: 4,
			cols: 4,
			bitsAllocated: 8,
		});

		const result = convertDcmToPng(dcmBytes);
		expect(result.metadata.modality).toBe("US");
		expect(result.metadata.bitsAllocated).toBe(8);
		expect(result.pngBytes.length).toBeGreaterThan(50);
	});

	it("supports invert contrast option", () => {
		const dcmBytes = createMockDicomFile({
			rows: 4,
			cols: 4,
			bitsAllocated: 16,
		});

		const normal = convertDcmToPng(dcmBytes, { invert: false });
		const inverted = convertDcmToPng(dcmBytes, { invert: true });

		expect(normal.pngBytes).not.toEqual(inverted.pngBytes);
	});

	it("throws error for file too small for DICOM header", () => {
		const tooShort = new Uint8Array(50);
		expect(() => convertDcmToPng(tooShort)).toThrow(
			"Invalid DICOM file: File size (50 bytes) is too small",
		);
	});

	it("runs through engine execution runner with progress updates", async () => {
		const dcmBytes = createMockDicomFile({
			rows: 4,
			cols: 4,
			bitsAllocated: 16,
		});

		const phases: string[] = [];
		const outputBuffer = await dcmToPngEngine.run(
			dcmBytes.buffer as ArrayBuffer,
			{ windowCenter: "500", windowWidth: "1000" },
			(_ratio, phase) => {
				phases.push(phase);
			},
		);

		const pngBytes = new Uint8Array(outputBuffer);
		expect(pngBytes[0]).toBe(0x89);
		expect(pngBytes[1]).toBe(0x50);
		expect(phases).toContain("DECODE_PIXELS");
		expect(phases).toContain("ENCODE_PNG");
	});
});
