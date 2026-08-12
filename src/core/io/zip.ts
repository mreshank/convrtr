import { Zip, ZipDeflate, ZipPassThrough } from "fflate";

export type ZipEntry = { name: string; data: ArrayBuffer };

/**
 * Extensions whose bytes are already compressed by their own format.
 * Re-running DEFLATE over WebP/JPEG/PNG/AVIF/etc. output spends CPU for
 * roughly 0% size reduction (compressed bytes are close to incompressible),
 * so entries with these extensions are stored in the archive instead of
 * deflated.
 */
const PRECOMPRESSED_EXTENSIONS = new Set([
	"webp",
	"jpg",
	"jpeg",
	"png",
	"avif",
	"heic",
	"heif",
	"jxl",
	"gif",
	"mp4",
	"webm",
	"mov",
	"mp3",
	"m4a",
	"ogg",
	"zip",
	"pdf",
]);

/** Whether `name`'s extension identifies an already-compressed format (see
 * `PRECOMPRESSED_EXTENSIONS`). Exported so the compression decision is
 * directly unit-testable without building a whole archive. */
export function isPrecompressed(name: string): boolean {
	const dot = name.lastIndexOf(".");
	if (dot === -1) return false;
	return PRECOMPRESSED_EXTENSIONS.has(name.slice(dot + 1).toLowerCase());
}

/**
 * Disambiguates a filename against the set of names already used in this
 * archive, mimicking the "photo.webp", "photo (2).webp", "photo (3).webp"
 * convention. Mutates `used` to record whatever name it hands back, so
 * repeated calls against the same set stay consistent as more entries are
 * added. Exported so the disambiguation logic is directly testable.
 */
export function dedupeName(name: string, used: Set<string>): string {
	if (!used.has(name)) {
		used.add(name);
		return name;
	}

	const dot = name.lastIndexOf(".");
	const stem = dot === -1 ? name : name.slice(0, dot);
	const ext = dot === -1 ? "" : name.slice(dot);

	let attempt = 2;
	let candidate = `${stem} (${attempt})${ext}`;
	while (used.has(candidate)) {
		attempt += 1;
		candidate = `${stem} (${attempt})${ext}`;
	}
	used.add(candidate);
	return candidate;
}

/** Chunk size used when feeding a single entry's bytes into the archive
 * writer. Keeps any one `push()` call — and thus any one `ondata` chunk —
 * bounded, rather than handing the writer (and, downstream, the array of
 * chunks a `Blob` is built from) one multi-hundred-megabyte copy per file. */
const CHUNK_SIZE = 1 << 20; // 1 MiB

function pushChunked(
	file: ZipPassThrough | ZipDeflate,
	bytes: Uint8Array,
): void {
	if (bytes.byteLength === 0) {
		file.push(bytes, true);
		return;
	}
	for (let offset = 0; offset < bytes.byteLength; offset += CHUNK_SIZE) {
		const end = Math.min(offset + CHUNK_SIZE, bytes.byteLength);
		file.push(bytes.subarray(offset, end), end === bytes.byteLength);
	}
}

/**
 * Builds a ZIP archive from `entries` and returns it as a `Blob`, ready to
 * hand to `saveOutput`.
 *
 * Uses fflate's streaming `Zip` writer (chunked `add`/`push`/`ondata`)
 * rather than `zipSync`/`zip()` over a pre-assembled directory object. Two
 * things fall out of that: (1) each file's bytes are fed in bounded chunks
 * instead of the writer needing the concatenation of every file's bytes
 * up front, and (2) the output is accumulated as an array of chunks that
 * `Blob` accepts directly — no final concatenation copy of the whole
 * archive either. This is what lets the archive scale past what fits
 * comfortably in memory at once, which is the entire point of a save-all
 * feature: the moment it needs everything resident together to produce one
 * byte, it has given up the property that made it worth building.
 *
 * Duplicate names (common when two dropped folders both contain
 * `photo.webp`) are disambiguated via `dedupeName` before being written, so
 * two different files never collide on one archive entry. Already-
 * compressed formats are stored rather than deflated (see
 * `isPrecompressed`).
 */
export function zipOutputs(entries: ZipEntry[]): Promise<Blob> {
	return new Promise((resolve, reject) => {
		const chunks: Uint8Array<ArrayBuffer>[] = [];
		const zip = new Zip((error, chunk, final) => {
			if (error) {
				reject(error);
				return;
			}
			chunks.push(chunk);
			if (final) resolve(new Blob(chunks));
		});

		const used = new Set<string>();
		for (const entry of entries) {
			const name = dedupeName(entry.name, used);
			const file = isPrecompressed(name)
				? new ZipPassThrough(name)
				: new ZipDeflate(name);
			zip.add(file);
			pushChunked(file, new Uint8Array(entry.data));
		}

		zip.end();
	});
}
