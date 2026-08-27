import { describe, expect, it, vi } from "vitest";
import {
	clearScratch,
	isOpfsAvailable,
	OPFS_THRESHOLD_BYTES,
	readScratch,
	removeScratch,
	shouldUseOpfs,
	writeScratch,
} from "../opfs";

/**
 * happy-dom has no OPFS, so these drive an in-memory fake through the
 * injectable provider seam. That tests the module's own logic — threshold
 * decisions, cleanup on failure, sweeping — which is where the bugs would be;
 * the browser's own filesystem implementation is not ours to verify.
 */
function fakeOpfs() {
	const files = new Map<string, Uint8Array>();
	const dirs = new Map<string, unknown>();

	function makeDir(): FileSystemDirectoryHandle {
		return {
			async getFileHandle(name: string, options?: { create?: boolean }) {
				if (!files.has(name)) {
					if (!options?.create) throw new Error(`NotFoundError: ${name}`);
					files.set(name, new Uint8Array());
				}
				return {
					async createWritable() {
						const chunks: Uint8Array[] = [];
						return new WritableStream<Uint8Array>({
							write(chunk) {
								chunks.push(chunk);
							},
							close() {
								const total = chunks.reduce((n, c) => n + c.length, 0);
								const merged = new Uint8Array(total);
								let at = 0;
								for (const c of chunks) {
									merged.set(c, at);
									at += c.length;
								}
								files.set(name, merged);
							},
						});
					},
					async getFile() {
						// Copy into a fresh Uint8Array so its buffer is typed as a
						// plain ArrayBuffer. What Map.get returns is
						// Uint8Array<ArrayBufferLike>, which TypeScript 5.9 rejects
						// as a BlobPart because it could be backed by a
						// SharedArrayBuffer.
						const stored = files.get(name) ?? new Uint8Array();
						const copy = new Uint8Array(stored.length);
						copy.set(stored);
						return new File([copy], name);
					},
				} as unknown as FileSystemFileHandle;
			},
			async removeEntry(name: string) {
				if (!files.has(name)) throw new Error("NotFoundError");
				files.delete(name);
			},
			keys() {
				return (async function* () {
					for (const key of [...files.keys()]) yield key;
				})();
			},
		} as unknown as FileSystemDirectoryHandle;
	}

	const dir = makeDir();
	dirs.set("convrtr-scratch", dir);

	const root = {
		async getDirectoryHandle() {
			return dir;
		},
	} as unknown as FileSystemDirectoryHandle;

	return { provider: async () => root, files };
}

function stream(text: string): ReadableStream<Uint8Array> {
	const bytes = new TextEncoder().encode(text);
	return new ReadableStream({
		start(controller) {
			// Deliberately several chunks — the point of streaming is that the
			// whole payload is never resident at once.
			for (let i = 0; i < bytes.length; i += 4) {
				controller.enqueue(bytes.subarray(i, i + 4));
			}
			controller.close();
		},
	});
}

describe("shouldUseOpfs", () => {
	it("keeps ordinary images in memory", () => {
		// A 5MB photo taking the disk path would be slower for no benefit.
		expect(shouldUseOpfs(5 * 1024 * 1024)).toBe(false);
	});

	it("sends large media to disk", () => {
		expect(shouldUseOpfs(500 * 1024 * 1024)).toBe(true);
	});

	it("puts the threshold well above any plausible image", () => {
		expect(OPFS_THRESHOLD_BYTES).toBeGreaterThanOrEqual(32 * 1024 * 1024);
	});
});

describe("isOpfsAvailable", () => {
	it("reports false rather than throwing when OPFS is unavailable", async () => {
		// Private browsing and restrictive embeddings both hit this, and the
		// caller must be able to fall back to memory instead of failing.
		const provider = vi.fn(async () => {
			throw new Error("SecurityError");
		});
		expect(await isOpfsAvailable(provider)).toBe(false);
	});

	it("reports true when a directory can be opened", async () => {
		const { provider } = fakeOpfs();
		expect(await isOpfsAvailable(provider)).toBe(true);
	});
});

describe("scratch round trip", () => {
	it("streams a payload in and reads it back intact", async () => {
		const { provider } = fakeOpfs();
		await writeScratch("job.bin", stream("hello scratch world"), provider);
		const file = await readScratch("job.bin", provider);
		expect(await file.text()).toBe("hello scratch world");
	});

	it("removes a partial file when the stream fails mid-write", async () => {
		// A truncated scratch file must not survive to be mistaken for a
		// complete conversion result.
		const { provider, files } = fakeOpfs();
		const failing = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(new Uint8Array([1, 2, 3]));
				controller.error(new Error("source failed"));
			},
		});
		await expect(
			writeScratch("broken.bin", failing, provider),
		).rejects.toThrow();
		expect(files.has("broken.bin")).toBe(false);
	});

	it("treats removing a missing file as a no-op", async () => {
		const { provider } = fakeOpfs();
		await expect(
			removeScratch("never-existed.bin", provider),
		).resolves.toBeUndefined();
	});
});

describe("clearScratch", () => {
	it("sweeps files left behind by a crashed session", async () => {
		// A tab that is force quit never runs its cleanup, so without a startup
		// sweep these accumulate against the origin's quota until writes start
		// failing for reasons nobody can diagnose.
		const { provider, files } = fakeOpfs();
		await writeScratch("a.bin", stream("aaa"), provider);
		await writeScratch("b.bin", stream("bbb"), provider);
		expect(files.size).toBe(2);

		const removed = await clearScratch(provider);
		expect(removed).toBe(2);
		expect(files.size).toBe(0);
	});

	it("does nothing when OPFS is unavailable", async () => {
		const provider = vi.fn(async () => {
			throw new Error("SecurityError");
		});
		expect(await clearScratch(provider)).toBe(0);
	});
});
