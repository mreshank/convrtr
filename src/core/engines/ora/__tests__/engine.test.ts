import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { oraToPngEngine } from "../index";
import { convertOraToPng, parseStackXml } from "../parser";

// 8-byte PNG header + minimal dummy PNG chunk
const validPngBytes = new Uint8Array([
	137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0,
	0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137,
]);

function createMockOraArchive(includeMerged = true): Uint8Array {
	const files: Record<string, Uint8Array> = {
		mimetype: new TextEncoder().encode("image/openraster"),
		"stack.xml": new TextEncoder().encode(
			`<image w="800" h="600">
				<stack>
					<layer name="Background" src="data/layer1.png" x="0" y="0" opacity="1.0" visibility="visible" composite-op="svg:src-over" />
					<layer name="Character" src="data/layer2.png" x="50" y="20" opacity="0.9" visibility="visible" composite-op="svg:src-over" />
					<layer name="Draft Notes" src="data/layer3.png" x="0" y="0" opacity="0.5" visibility="hidden" />
				</stack>
			</image>`,
		),
		"data/layer1.png": validPngBytes,
		"data/layer2.png": validPngBytes,
	};

	if (includeMerged) {
		files["mergedimage.png"] = validPngBytes;
	}

	return zipSync(files);
}

describe("OpenRaster (.ora) Engine", () => {
	it("rejects non-ZIP files or truncated buffers", () => {
		expect(() => convertOraToPng(new Uint8Array([1, 2, 3]))).toThrow(
			/too small/i,
		);

		const fakeNonZip = new Uint8Array(50);
		expect(() => convertOraToPng(fakeNonZip)).toThrow(
			/missing standard pkzip header/i,
		);
	});

	it("parses stack.xml layers and dimensions correctly", () => {
		const xml = `<image w="1920" h="1080">
			<stack>
				<layer name="Sky" src="data/sky.png" x="0" y="0" opacity="1.0" visibility="visible" />
				<layer name="Mountain" src="data/mountain.png" x="100" y="200" opacity="0.8" visibility="hidden" />
			</stack>
		</image>`;

		const stack = parseStackXml(xml);
		expect(stack.width).toBe(1920);
		expect(stack.height).toBe(1080);
		expect(stack.layers.length).toBe(2);
		expect(stack.layers[0]?.name).toBe("Sky");
		expect(stack.layers[0]?.visibility).toBe("visible");
		expect(stack.layers[1]?.name).toBe("Mountain");
		expect(stack.layers[1]?.visibility).toBe("hidden");
		expect(stack.layers[1]?.opacity).toBe(0.8);
	});

	it("extracts canonical mergedimage.png by default", () => {
		const archive = createMockOraArchive(true);
		const result = convertOraToPng(archive);

		expect(result.extractedFrom).toBe("mergedimage");
		expect(result.pngBytes[0]).toBe(137);
		expect(result.pngBytes[1]).toBe(80); // 'P'
		expect(result.pngBytes[2]).toBe(78); // 'N'
		expect(result.pngBytes[3]).toBe(71); // 'G'
		expect(result.stack.width).toBe(800);
		expect(result.stack.height).toBe(600);
	});

	it("falls back to visible layer when mergedimage is missing or preferMergedImage is false", () => {
		const archiveNoMerged = createMockOraArchive(false);
		const result = convertOraToPng(archiveNoMerged, {
			preferMergedImage: false,
		});

		expect(result.extractedFrom).toBe("layer");
		expect(result.pngBytes[0]).toBe(137);
		expect(result.pngBytes[1]).toBe(80);
	});

	it("executes cleanly via oraToPngEngine", async () => {
		const archive = createMockOraArchive(true);
		const result = await oraToPngEngine.run(
			archive.buffer as ArrayBuffer,
			{ preferMergedImage: true },
			() => {},
		);

		expect(result).toBeInstanceOf(ArrayBuffer);
		const outBytes = new Uint8Array(result);
		expect(outBytes[0]).toBe(137);
		expect(outBytes[1]).toBe(80);
	});
});
