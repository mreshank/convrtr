import type SevenZipFactory from "7z-wasm";
import type { PDFImage } from "pdf-lib";

export interface Cb7ExtractionResult {
	pageCount: number;
	totalPagesFound: number;
	pdfBytes: Uint8Array;
}

/** Browsers are not batch stations: refuse half-gigabyte comics up front. */
export const MAX_CB7_BYTES = 500_000_000;

export function naturalSort(a: string, b: string): number {
	return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function isPngImage(bytes: Uint8Array): boolean {
	return (
		bytes.length >= 8 &&
		bytes[0] === 0x89 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x4e &&
		bytes[3] === 0x47 &&
		bytes[4] === 0x0d &&
		bytes[5] === 0x0a &&
		bytes[6] === 0x1a &&
		bytes[7] === 0x0a
	);
}

function isJpgImage(bytes: Uint8Array): boolean {
	return (
		bytes.length >= 3 &&
		bytes[0] === 0xff &&
		bytes[1] === 0xd8 &&
		bytes[2] === 0xff
	);
}

interface SevenZipHandle {
	FS: {
		writeFile(path: string, data: Uint8Array): void;
		readFile(path: string): Uint8Array;
		readdir(path: string): string[];
		stat(path: string): { mode: number };
		isDir(mode: number): boolean;
		unlink(path: string): void;
		rmdir(path: string): void;
	};
	callMain(args: string[]): void;
}

export type { SevenZipHandle };

/** Lists every file under an unpacked scratch directory (for tests/tools). */
export function listUnpackedFiles(
	seven: SevenZipHandle,
	outDir: string,
): string[] {
	const out: string[] = [];
	collectFiles(seven, outDir, out);
	return out;
}

/** Reads one unpacked file (for tests/tools). */
export function readUnpackedFile(
	seven: SevenZipHandle,
	path: string,
): Uint8Array {
	return seven.FS.readFile(path);
}

let cached: Promise<SevenZipHandle> | null = null;

async function load7z(): Promise<SevenZipHandle> {
	if (!cached) {
		cached = (async () => {
			const factory = (await import("7z-wasm"))
				.default as unknown as typeof SevenZipFactory;
			const errors: string[] = [];
			// Note: `window` exists under happy-dom in vitest, so sniff node
			// instead — browsers never have process.versions.node.
			const isNode = typeof process !== "undefined" && !!process.versions?.node;
			if (isNode) {
				// Node/vitest: feed the binary directly (no HTTP to fetch it from).
				const { createRequire } = await import("node:module");
				const { readFileSync } = await import("node:fs");
				const wasmPath = createRequire(import.meta.url).resolve(
					"7z-wasm/7zz.wasm",
				);
				const wasm = readFileSync(wasmPath);
				const wasmBinary = wasm.buffer.slice(
					wasm.byteOffset,
					wasm.byteOffset + wasm.byteLength,
				) as ArrayBuffer;
				const handle = (await factory({
					wasmBinary,
					printErr: (text: string) => {
						errors.push(text);
					},
				})) as unknown as SevenZipHandle;
				(handle as unknown as { __errors?: string[] }).__errors = errors;
				return handle;
			}
			const handle = (await factory({
				locateFile: (file: string) => `/7z/${file}`,
				printErr: (text: string) => {
					errors.push(text);
				},
			})) as unknown as SevenZipHandle;
			(handle as unknown as { __errors?: string[] }).__errors = errors;
			return handle;
		})();
	}
	return cached;
}

export function reset7zForTests(): void {
	cached = null;
}

function collectFiles(seven: SevenZipHandle, dir: string, out: string[]): void {
	for (const name of seven.FS.readdir(dir)) {
		if (name === "." || name === "..") continue;
		const path = `${dir}/${name}`;
		if (seven.FS.isDir(seven.FS.stat(path).mode))
			collectFiles(seven, path, out);
		else out.push(path);
	}
}

function engineError(seven: SevenZipHandle, fallback: string): Error {
	const errors = (seven as unknown as { __errors?: string[] }).__errors ?? [];
	const detail = errors.join(" ").slice(0, 300);
	if (/wrong password|password|encrypted/i.test(detail)) {
		return new Error(
			"This archive is password-encrypted — convrtr cannot open encrypted comics.",
		);
	}
	if (/not implemented|unsupported|cannot open/i.test(detail)) {
		return new Error(
			`7-Zip cannot open this file as an archive (${detail || "unknown codec"}).`,
		);
	}
	return new Error(detail ? `Could not unpack archive: ${detail}` : fallback);
}

/**
 * Unpacks any 7-Zip-readable archive (7z, RAR, ZIP…) into isolated MEMFS
 * scratch space. Shared by the cb7 and cbr engines — one 7-Zip core serves
 * the whole comic family.
 */
export async function unpackSevenZip(
	input: ArrayBuffer | Uint8Array,
	maxBytes: number,
	label: string,
	onProgress?: (ratio: number, phase: string) => void,
): Promise<{ seven: SevenZipHandle; outDir: string; cleanup: () => void }> {
	onProgress?.(0.05, "READ");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (bytes.length > maxBytes) {
		throw new Error(
			`Archive is ${(bytes.length / 1_000_000).toFixed(0)}MB — over the 500MB browser limit. Extract on desktop and convert the pages instead.`,
		);
	}

	onProgress?.(0.15, "LOAD 7-ZIP");
	const seven = await load7z();

	onProgress?.(0.3, "UNPACK");
	// Unique scratch paths: the 7-Zip MEMFS persists across calls in one tab.
	const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
	const inPath = `/in-${tag}.archive`;
	const outDir = `/out-${tag}`;
	try {
		seven.FS.writeFile(inPath, bytes);
	} catch {
		throw new Error("Could not stage the archive for extraction.");
	}
	try {
		seven.callMain(["x", inPath, `-o${outDir}`, "-y"]);
	} catch {
		throw engineError(
			seven,
			`Could not unpack this ${label} archive (corrupt or encrypted?).`,
		);
	} finally {
		try {
			seven.FS.unlink(inPath);
		} catch {
			// ignore cleanup failure
		}
	}
	return { seven, outDir, cleanup: () => cleanupScratch(seven, outDir) };
}

/**
 * Binds natural-sorted page images from an unpacked archive directory into
 * a native-resolution PDF. Shared by the cb7 and cbr engines.
 */
export async function bindComicPages(
	seven: SevenZipHandle,
	outDir: string,
	label: string,
	onProgress?: (ratio: number, phase: string) => void,
): Promise<Cb7ExtractionResult> {
	const allPaths: string[] = [];
	collectFiles(seven, outDir, allPaths);
	const supportedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
	const pagePaths = allPaths
		.filter((path) => {
			const lower = path.toLowerCase();
			if (lower.includes("__macosx") || lower.includes("/.ds_store"))
				return false;
			return supportedExtensions.some((ext) => lower.endsWith(ext));
		})
		.sort(naturalSort);

	if (pagePaths.length === 0) {
		throw new Error(
			`No valid comic page images (.jpg, .png, .webp) found inside this ${label} archive.`,
		);
	}

	onProgress?.(0.55, "ASSEMBLE");
	const { PDFDocument } = await import("pdf-lib");
	const pdfDoc = await PDFDocument.create();
	pdfDoc.setProducer("convrtr (100% In-Browser Comic Converter)");

	let pagesAdded = 0;
	for (let i = 0; i < pagePaths.length; i++) {
		const path = pagePaths[i];
		if (!path) continue;
		let imgBytes: Uint8Array;
		try {
			imgBytes = seven.FS.readFile(path);
		} catch {
			continue;
		}
		if (imgBytes.length === 0) continue;

		try {
			let embeddedImage: PDFImage;
			if (isPngImage(imgBytes)) {
				embeddedImage = await pdfDoc.embedPng(imgBytes);
			} else if (isJpgImage(imgBytes)) {
				embeddedImage = await pdfDoc.embedJpg(imgBytes);
			} else {
				embeddedImage = path.toLowerCase().endsWith(".png")
					? await pdfDoc.embedPng(imgBytes)
					: await pdfDoc.embedJpg(imgBytes);
			}
			const page = pdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
			page.drawImage(embeddedImage, {
				x: 0,
				y: 0,
				width: embeddedImage.width,
				height: embeddedImage.height,
			});
			pagesAdded++;
		} catch {
			// Skip un-embeddable pages without aborting the comic.
		}
		onProgress?.(0.55 + (i / pagePaths.length) * 0.3, "ASSEMBLE");
	}

	if (pagesAdded === 0) {
		throw new Error(
			"Failed to embed any comic pages: images could not be parsed into PDF format.",
		);
	}

	onProgress?.(0.9, "ENCODE");
	const pdfBytes = await pdfDoc.save();
	onProgress?.(1.0, "COMPLETE");
	cleanupScratch(seven, outDir);
	return { pageCount: pagesAdded, totalPagesFound: pagePaths.length, pdfBytes };
}

function cleanupScratch(seven: SevenZipHandle, outDir: string): void {
	try {
		const paths: string[] = [];
		collectFiles(seven, outDir, paths);
		for (const p of paths) {
			try {
				seven.FS.unlink(p);
			} catch {
				// ignore
			}
		}
		seven.FS.rmdir(outDir);
	} catch {
		// MEMFS leftovers are bounded by the input size guard; ignore.
	}
}

/**
 * Converts a Comic Book 7-Zip (`.cb7`) archive into a single bound PDF.
 *
 * Full 7-Zip (24.09, WASM) unpacks the archive in-memory — any 7z codec the
 * desktop tool reads, including solid blocks — then pages bind through the
 * shared natural-sorted, native-resolution pdf-lib pipeline.
 * Encrypted archives and 500MB+ files fail with specific errors instead of
 * hanging the tab.
 */
export async function convertCb7ToPdf(
	input: ArrayBuffer | Uint8Array,
	onProgress?: (ratio: number, phase: string) => void,
): Promise<Cb7ExtractionResult> {
	const { seven, outDir, cleanup } = await unpackSevenZip(
		input,
		MAX_CB7_BYTES,
		".cb7",
		onProgress,
	);
	try {
		return await bindComicPages(seven, outDir, ".cb7", onProgress);
	} finally {
		cleanup();
	}
}
