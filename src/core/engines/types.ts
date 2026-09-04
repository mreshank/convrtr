import type { ParamValue } from "@/core/quality";

/**
 * One positioned write against the output file.
 *
 * Muxers do not write strictly forwards. MP4 keeps its `moov` index at the
 * front of the file but cannot know its contents until every sample has been
 * written, so it seeks back and patches the header afterwards. That is why a
 * chunk carries a `position` instead of being a plain byte stream: an
 * append-only sink cannot mux MP4 without buffering the entire file first,
 * which is the exact allocation streaming exists to avoid.
 *
 * The shape deliberately matches both mediabunny's `StreamTargetChunk` and
 * `FileSystemWritableFileStream.write()`, so bytes travel from muxer to disk
 * without an adapter in the middle keeping them alive.
 */
export type WriteChunk = {
	type: "write";
	data: Uint8Array<ArrayBuffer>;
	position: number;
};

/** Where a streaming engine writes its output. */
export type OutputSink = WritableStream<WriteChunk>;

/**
 * Something the user needs to know about a finished conversion, as opposed to
 * something that went wrong.
 *
 * Progress phases were the only channel an engine had, and phases flash past:
 * the "DROPPING: ..." message warning that a subtitle track had been discarded
 * was displayed inside a progress bar that is removed the moment the
 * conversion ends. Nobody reads a warning that is only visible while they are
 * waiting. Notices persist next to the result instead.
 */
/**
 * What an engine actually produced, when the tool cannot know in advance.
 *
 * Almost every tool has a fixed output — a PNG encoder writes PNG. A few do
 * not: extracted cover art is whatever the file happened to embed, JPEG or
 * PNG, and naming a PNG `.jpg` because the registry guessed would hand the
 * user a file their tools mis-read.
 *
 * Reported rather than declared, and only by the engines that need it.
 */
export type OutputType = { ext: string; mime: string };

export interface Engine {
	id: string;
	probe(): Promise<boolean>;
	run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
		onNotice?: (message: string) => void,
		onOutputType?: (type: OutputType) => void,
	): Promise<ArrayBuffer>;

	/**
	 * Combines several files into one.
	 *
	 * Every other engine here is one-in, one-out, and the batch runner turns
	 * that into many-in-many-out by calling it repeatedly. Merging is neither:
	 * the whole point is that the inputs meet, so it needs them together.
	 *
	 * Optional because almost nothing needs it. Order is the order given, which
	 * for merging is the order the files were dropped — the caller owns that
	 * decision and the tool says so rather than sorting by name behind the
	 * user's back.
	 */
	runMany?(
		inputs: ArrayBuffer[],
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
		onNotice?: (message: string) => void,
	): Promise<ArrayBuffer>;

	/**
	 * Converts without ever holding the whole file in memory.
	 *
	 * `run` takes an `ArrayBuffer` and returns one, which means peak memory is
	 * at least input + output. For a 3GB video that is fatal on any device, and
	 * no amount of care elsewhere rescues it — the allocation is in the
	 * signature.
	 *
	 * This variant takes a `Blob` (read lazily, in slices, as the demuxer asks
	 * for byte ranges) and writes into a sink, so peak memory is a few chunks
	 * regardless of file size. It returns nothing: by the time it resolves the
	 * bytes are already at their destination, so there is no result to hand
	 * back and nothing to preview.
	 *
	 * Optional because most engines genuinely cannot stream. An image codec
	 * needs the whole decoded bitmap resident to work on it at all, so
	 * pretending otherwise would buy nothing. Callers must therefore treat its
	 * absence as normal and fall back to `run`.
	 */
	runStream?(
		input: Blob,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
		sink: OutputSink,
		onNotice?: (message: string) => void,
	): Promise<void>;
}

/** An engine that combines several inputs into one output. */
export type CombiningEngine = Engine & Required<Pick<Engine, "runMany">>;

/** Narrows to an engine that can combine inputs. */
export function supportsCombining(engine: Engine): engine is CombiningEngine {
	return typeof engine.runMany === "function";
}

/** An engine that can convert without holding the whole file. */
export type StreamingEngine = Engine & Required<Pick<Engine, "runStream">>;

/**
 * Narrows to an engine that can stream.
 *
 * A type predicate rather than a boolean so callers get a `runStream` that
 * TypeScript knows is present, instead of a non-null assertion at every call
 * site that would survive the method being renamed.
 */
export function supportsStreaming(engine: Engine): engine is StreamingEngine {
	return typeof engine.runStream === "function";
}
