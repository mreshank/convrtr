import { describe, expect, it } from "vitest";
import { convertWalToPng, walToPngEngine } from "../index";

function createMockWal(
	width = 16,
	height = 16,
	name = "base_wall/comp1",
	animName = "",
): Uint8Array {
	const headerSize = 100;
	const m0 = width * height;
	const m1 = Math.floor(width / 2) * Math.floor(height / 2);
	const m2 = Math.floor(width / 4) * Math.floor(height / 4);
	const m3 = Math.floor(width / 8) * Math.floor(height / 8);

	const offset0 = headerSize;
	const offset1 = offset0 + m0;
	const offset2 = offset1 + m1;
	const offset3 = offset2 + m2;
	const totalSize = offset3 + m3;

	const buffer = new Uint8Array(totalSize);
	const view = new DataView(buffer.buffer);

	// Name (char[32])
	const nameBytes = new TextEncoder().encode(name);
	buffer.set(nameBytes.subarray(0, 31), 0);

	// Dimensions
	view.setUint32(32, width, true);
	view.setUint32(36, height, true);

	// Offsets
	view.setUint32(40, offset0, true);
	view.setUint32(44, offset1, true);
	view.setUint32(48, offset2, true);
	view.setUint32(52, offset3, true);

	// AnimName (char[32])
	if (animName) {
		const animBytes = new TextEncoder().encode(animName);
		buffer.set(animBytes.subarray(0, 31), 56);
	}

	// Flags, Contents, Value
	view.setUint32(88, 1, true); // flags
	view.setUint32(92, 2, true); // contents
	view.setUint32(96, 50, true); // value

	// Fill pixel mipmaps with patterned color indices
	for (let i = offset0; i < offset1; i++) {
		buffer[i] = (i - offset0) % 256;
	}
	for (let i = offset1; i < offset2; i++) {
		buffer[i] = 10;
	}
	for (let i = offset2; i < offset3; i++) {
		buffer[i] = 20;
	}
	for (let i = offset3; i < totalSize; i++) {
		buffer[i] = 30;
	}

	return buffer;
}

describe("Quake II WAL Image Engine", () => {
	it("converts a valid Quake II WAL texture to PNG", () => {
		const walBytes = createMockWal(32, 32, "textures/e1u1/metal1");
		const result = convertWalToPng(walBytes);

		expect(result.pngBuffer.byteLength).toBeGreaterThan(50);
		expect(result.metadata.name).toBe("textures/e1u1/metal1");
		expect(result.metadata.width).toBe(32);
		expect(result.metadata.height).toBe(32);
		expect(result.metadata.flags).toBe(1);
		expect(result.metadata.contents).toBe(2);
		expect(result.metadata.value).toBe(50);
		expect(result.metadata.selectedMipmap).toBe(0);

		// PNG header check
		const view = new DataView(result.pngBuffer);
		expect(view.getUint32(0, false)).toBe(0x89504e47); // "\x89PNG"
	});

	it("decodes smaller mipmap levels accurately", () => {
		const walBytes = createMockWal(64, 64);
		const resultLevel1 = convertWalToPng(walBytes, { mipmapLevel: 1 });
		expect(resultLevel1.metadata.width).toBe(32);
		expect(resultLevel1.metadata.height).toBe(32);
		expect(resultLevel1.metadata.selectedMipmap).toBe(1);

		const resultLevel2 = convertWalToPng(walBytes, { mipmapLevel: 2 });
		expect(resultLevel2.metadata.width).toBe(16);
		expect(resultLevel2.metadata.height).toBe(16);
		expect(resultLevel2.metadata.selectedMipmap).toBe(2);
	});

	it("throws on invalid or truncated WAL files", () => {
		expect(() => convertWalToPng(new Uint8Array([0, 1, 2]))).toThrow(
			"Invalid Quake II WAL file: File size is smaller than the 100-byte header.",
		);

		const invalidHeader = new Uint8Array(100);
		expect(() => convertWalToPng(invalidHeader)).toThrow(
			"Invalid Quake II WAL dimensions: 0x0 is out of bounds.",
		);
	});

	it("runs through the engine interface", async () => {
		const walBytes = createMockWal(16, 16);
		const output = await walToPngEngine.run(
			walBytes.buffer.slice(0) as ArrayBuffer,
			{ mipmapLevel: 0 },
			() => {},
		);
		expect(output.byteLength).toBeGreaterThan(40);
	});
});
