import type { StreamingEngine } from "@/core/engines/types";
import type { FileSink } from "@/core/io/sink";
import type { ParamValue } from "@/core/quality";

/**
 * Runs a streaming conversion and decides the file's fate.
 *
 * Extracted from the worker because this is where the one genuinely dangerous
 * decision in the streaming path lives, and it is worth being able to test it
 * without standing up a worker and the entire engine registry behind it.
 *
 * The rule: a file is committed only if `runStream` resolved. Anything else —
 * a throw, a corrupt input, a codec the browser turned out not to support
 * halfway through — discards it. mediabunny closes its own target from a
 * `finally` block, so by the time an error reaches here the muxer has already
 * closed the sink; without the explicit discard, whatever bytes made it out
 * would be committed as a finished file.
 *
 * Returns the size on disk, read from the file itself rather than accumulated
 * from the writes. Positioned writes overlap whenever a header is patched, so
 * a running total would report a number larger than the file it describes.
 */
export async function runStreamingConversion(
	engine: StreamingEngine,
	input: Blob,
	params: Record<string, ParamValue>,
	onProgress: (ratio: number, phase: string) => void,
	sink: FileSink,
	handle: FileSystemFileHandle,
): Promise<number> {
	try {
		await engine.runStream(input, params, onProgress, sink.sink);
	} catch (error) {
		await sink.discard();
		throw error;
	}

	await sink.commit();
	const written = await handle.getFile();
	return written.size;
}
