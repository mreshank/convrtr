import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { dedupeName, isPrecompressed, type ZipEntry, zipOutputs } from "../zip";

function u8(data: ArrayBuffer): Uint8Array {
	return new Uint8Array(data);
}

async function blobBytes(blob: Blob): Promise<Uint8Array> {
	return new Uint8Array(await blob.arrayBuffer());
}

describe("isPrecompressed", () => {
	it("recognizes common already-compressed image extensions", () => {
		expect(isPrecompressed("photo.webp")).toBe(true);
		expect(isPrecompressed("photo.jpg")).toBe(true);
		expect(isPrecompressed("photo.jpeg")).toBe(true);
		expect(isPrecompressed("photo.png")).toBe(true);
		expect(isPrecompressed("photo.avif")).toBe(true);
	});

	it("is case-insensitive", () => {
		expect(isPrecompressed("PHOTO.WEBP")).toBe(true);
	});

	it("does not flag genuinely compressible formats", () => {
		expect(isPrecompressed("notes.txt")).toBe(false);
		expect(isPrecompressed("data.json")).toBe(false);
		expect(isPrecompressed("image.bmp")).toBe(false);
	});

	it("returns false for a name with no extension", () => {
		expect(isPrecompressed("noext")).toBe(false);
	});
});

describe("dedupeName", () => {
	it("returns the name unchanged the first time it is seen", () => {
		const used = new Set<string>();
		expect(dedupeName("photo.webp", used)).toBe("photo.webp");
	});

	it("appends a counter suffix on collision", () => {
		const used = new Set<string>();
		expect(dedupeName("photo.webp", used)).toBe("photo.webp");
		expect(dedupeName("photo.webp", used)).toBe("photo (2).webp");
		expect(dedupeName("photo.webp", used)).toBe("photo (3).webp");
	});

	it("skips a suffix that is already taken by an unrelated entry", () => {
		const used = new Set<string>(["photo.webp", "photo (2).webp"]);
		expect(dedupeName("photo.webp", used)).toBe("photo (3).webp");
	});

	it("handles names without an extension", () => {
		const used = new Set<string>();
		expect(dedupeName("README", used)).toBe("README");
		expect(dedupeName("README", used)).toBe("README (2)");
	});
});

describe("zipOutputs", () => {
	it("disambiguates duplicate names and preserves each file's own bytes", async () => {
		const entries: ZipEntry[] = [
			{
				name: "photo.webp",
				data: new TextEncoder().encode("first").buffer as ArrayBuffer,
			},
			{
				name: "photo.webp",
				data: new TextEncoder().encode("second").buffer as ArrayBuffer,
			},
		];

		const blob = await zipOutputs(entries);
		const unzipped = unzipSync(await blobBytes(blob));

		expect(Object.keys(unzipped).sort()).toEqual([
			"photo (2).webp",
			"photo.webp",
		]);
		expect(new TextDecoder().decode(unzipped["photo.webp"])).toBe("first");
		expect(new TextDecoder().decode(unzipped["photo (2).webp"])).toBe("second");
	});

	it("round-trips a payload spanning multiple internal chunks", async () => {
		// Larger than the 1 MiB chunk size zipOutputs pushes at a time, so this
		// exercises the multi-push path for a single entry.
		const size = 1024 * 1024 + 12_345;
		const data = new Uint8Array(size);
		data.fill(7);
		const entries: ZipEntry[] = [{ name: "big.bin", data: data.buffer }];

		const blob = await zipOutputs(entries);
		const unzipped = unzipSync(await blobBytes(blob));

		expect(unzipped["big.bin"]).toEqual(data);
	});

	it("stores already-compressed formats instead of deflating them, unlike a genuinely compressible format", async () => {
		const size = 1024 * 1024 + 1_000;
		const compressible = new Uint8Array(size);
		compressible.fill(42); // maximally compressible: one repeated byte

		const storedBlob = await zipOutputs([
			{ name: "photo.webp", data: compressible.buffer },
		]);
		const deflatedBlob = await zipOutputs([
			{ name: "photo.bin", data: compressible.buffer },
		]);

		// A stored entry is at least as large as the raw payload (no
		// compression applied); the deflated baseline for the same
		// maximally-compressible payload shrinks dramatically. If webp were
		// being deflated too, the two blob sizes would be close instead of
		// off by orders of magnitude.
		expect(storedBlob.size).toBeGreaterThanOrEqual(size);
		expect(deflatedBlob.size).toBeLessThan(size / 10);

		const storedUnzipped = unzipSync(u8(await storedBlob.arrayBuffer()));
		expect(storedUnzipped["photo.webp"]).toEqual(compressible);
	});

	it("resolves an empty archive for no entries", async () => {
		const blob = await zipOutputs([]);
		const unzipped = unzipSync(await blobBytes(blob));
		expect(Object.keys(unzipped)).toEqual([]);
	});
});
