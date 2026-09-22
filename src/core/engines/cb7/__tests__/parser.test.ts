import { describe, expect, it } from "vitest";
import { encodeRgbaToPng } from "../../dds/parser";
import { cb7ToPdfEngine } from "../index";
import { convertCb7ToPdf } from "../parser";

async function makeCb7(): Promise<Uint8Array> {
	const mod = (await import("7z-wasm")) as unknown as {
		default: (opts?: Record<string, unknown>) => Promise<{
			FS: {
				mkdir(path: string): void;
				writeFile(path: string, data: Uint8Array): void;
				readFile(path: string): Uint8Array;
			};
			callMain(args: string[]): void;
		}>;
	};
	const seven = await mod.default();
	const p1 = encodeRgbaToPng(8, 8, new Uint8Array(8 * 8 * 4).fill(200));
	const p2 = encodeRgbaToPng(8, 8, new Uint8Array(8 * 8 * 4).fill(40));
	seven.FS.mkdir("/pages");
	seven.FS.writeFile("/pages/002.png", p2);
	seven.FS.writeFile("/pages/001.png", p1);
	seven.callMain(["a", "/t.cb7", "/pages"]);
	return seven.FS.readFile("/t.cb7");
}

describe("Comic 7-Zip (.cb7) Engine", () => {
	it("round-trips a real 7z archive into a PDF", async () => {
		expect(await cb7ToPdfEngine.probe()).toBe(true);
		const file = await makeCb7();
		expect(file[0]).toBe(0x37); // '7'
		const result = await convertCb7ToPdf(
			file.buffer.slice(
				file.byteOffset,
				file.byteOffset + file.byteLength,
			) as ArrayBuffer,
			() => {},
		);
		expect(result.pageCount).toBe(2);
		expect(result.totalPagesFound).toBe(2);
		const head = new TextDecoder().decode(result.pdfBytes.subarray(0, 5));
		expect(head).toBe("%PDF-");
	}, 120000);

	it("rejects non-archives with a clear error", async () => {
		await expect(
			convertCb7ToPdf(
				new TextEncoder().encode("this is not a 7z archive at all............")
					.buffer as ArrayBuffer,
			),
		).rejects.toThrow();
	}, 120000);
});
