/**
 * Scratch storage in the Origin Private File System.
 *
 * `readFile` pulls a whole file into an ArrayBuffer, which is fine for photos
 * and fatal for video: a 2 GB file needs 2 GB of contiguous memory to read and
 * roughly that again to hold the output, and the tab dies before the codec
 * ever runs. OPFS gives a real filesystem inside the origin, so large inputs
 * and outputs can live on disk and be streamed rather than held.
 *
 * Nothing here weakens the privacy guarantee. OPFS is origin-private and
 * never leaves the device — it is local disk, not storage in the sense people
 * worry about. Scratch files are deleted as soon as the work using them
 * finishes, and any survivors are swept on the next visit.
 */

/** Everything this module writes lives under one directory it fully owns. */
const SCRATCH_DIR = "convrtr-scratch";

/**
 * Above this, a file goes to OPFS instead of memory.
 *
 * 64 MB is well under what a phone will tolerate for a single allocation while
 * being far above any image the tool is likely to see — so photos keep the
 * fast in-memory path and only genuinely large media pays for disk.
 */
export const OPFS_THRESHOLD_BYTES = 64 * 1024 * 1024;

type DirectoryProvider = () => Promise<FileSystemDirectoryHandle>;

function defaultProvider(): Promise<FileSystemDirectoryHandle> {
	const storage = navigator.storage as StorageManager & {
		getDirectory?: () => Promise<FileSystemDirectoryHandle>;
	};
	if (!storage?.getDirectory) {
		return Promise.reject(new Error("OPFS is not available in this browser"));
	}
	return storage.getDirectory();
}

/**
 * Whether OPFS can actually be used here.
 *
 * Feature-detects rather than assuming: OPFS is unavailable in some private
 * browsing modes and in embeddings with restrictive storage policies, and a
 * caller must be able to fall back to memory rather than failing outright.
 */
export async function isOpfsAvailable(
	provider: DirectoryProvider = defaultProvider,
): Promise<boolean> {
	try {
		await provider();
		return true;
	} catch {
		return false;
	}
}

/** True when a payload of this size should go to disk rather than memory. */
export function shouldUseOpfs(
	bytes: number,
	threshold: number = OPFS_THRESHOLD_BYTES,
): boolean {
	return bytes > threshold;
}

async function scratchDir(
	provider: DirectoryProvider,
): Promise<FileSystemDirectoryHandle> {
	const root = await provider();
	return root.getDirectoryHandle(SCRATCH_DIR, { create: true });
}

/**
 * Streams `source` into a scratch file and returns a handle to it.
 *
 * The stream is piped rather than buffered, so peak memory is one chunk
 * rather than the whole payload — which is the entire reason for this module.
 */
export async function writeScratch(
	name: string,
	source: ReadableStream<Uint8Array>,
	provider: DirectoryProvider = defaultProvider,
): Promise<FileSystemFileHandle> {
	const dir = await scratchDir(provider);
	const handle = await dir.getFileHandle(name, { create: true });
	const writable = await handle.createWritable();
	try {
		await source.pipeTo(writable);
	} catch (error) {
		// A failed pipe can leave a partial file behind. Remove it rather than
		// letting a truncated scratch file be mistaken for a complete one.
		await writable.abort().catch(() => {});
		await dir.removeEntry(name).catch(() => {});
		throw error;
	}
	return handle;
}

/** Reads a scratch file back as a `File`, suitable for the save path. */
export async function readScratch(
	name: string,
	provider: DirectoryProvider = defaultProvider,
): Promise<File> {
	const dir = await scratchDir(provider);
	const handle = await dir.getFileHandle(name);
	return handle.getFile();
}

/** Removes one scratch file. Missing files are not an error. */
export async function removeScratch(
	name: string,
	provider: DirectoryProvider = defaultProvider,
): Promise<void> {
	try {
		const dir = await scratchDir(provider);
		await dir.removeEntry(name);
	} catch {
		// Already gone, or OPFS unavailable — either way there is nothing to do.
	}
}

/**
 * Deletes every scratch file.
 *
 * Called on startup rather than only on unload: a tab that crashes or is force
 * quit never runs its cleanup, and without a sweep those files would
 * accumulate against the origin's storage quota indefinitely — eventually
 * causing writes to fail for reasons a user could never diagnose.
 */
export async function clearScratch(
	provider: DirectoryProvider = defaultProvider,
): Promise<number> {
	let removed = 0;
	try {
		const root = await provider();
		const dir = await root.getDirectoryHandle(SCRATCH_DIR, { create: true });
		const names: string[] = [];
		// `keys()` is an async iterator on the directory handle.
		for await (const name of (
			dir as FileSystemDirectoryHandle & {
				keys(): AsyncIterableIterator<string>;
			}
		).keys()) {
			names.push(name);
		}
		for (const name of names) {
			await dir.removeEntry(name, { recursive: true }).catch(() => {});
			removed += 1;
		}
	} catch {
		// OPFS unavailable: nothing was ever written, so nothing to clear.
	}
	return removed;
}
