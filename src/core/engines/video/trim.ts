import type { ParamValue } from "@/core/quality";
import type { Engine, OutputSink } from "../types";

/**
 * Cuts a section out of a video without re-encoding a single frame.
 *
 * ## Why this is not `Conversion` with a `trim` option
 *
 * mediabunny's `Conversion` accepts `trim: { start, end }`, and using it here
 * would be the obvious approach — but it re-encodes. Its copy path requires
 * `firstTimestamp >= startTimestamp`, so asking to start anywhere inside the
 * file fails that check and every frame goes through a decoder and encoder.
 * That is the correct behaviour for an API that promises a cut at the exact
 * requested time, and it is precisely the trade this tool refuses: a trim that
 * silently costs a generation of quality is what every other browser trimmer
 * does.
 *
 * So the copy is done at the packet level instead. Packets are read out of the
 * source and written into the output untouched, with only their timestamps
 * shifted. Nothing is decoded.
 *
 * ## Why the cut moves
 *
 * Video frames are not independent. A frame in the middle of a group of
 * pictures is stored as a difference from earlier frames, so it cannot be
 * decoded without them — starting there yields either nothing or visible
 * garbage until the next keyframe. A cut that copies packets must therefore
 * begin at a keyframe, and keyframes are typically seconds apart.
 *
 * The alternative is to re-encode the frames between the requested point and
 * the next keyframe, which is what a frame-accurate trim does and why it
 * costs quality. This tool moves the cut back to the nearest keyframe instead
 * and says by how much, so the user can decide whether that matters to them.
 * Silently moving a cut by two seconds would be worse than either.
 */

type Mediabunny = typeof import("mediabunny");

/** Containers this can trim, writing the same container back out. */
const TRIMMABLE = ["mp4", "mkv", "webm"] as const;
export type TrimContainer = (typeof TRIMMABLE)[number];

async function outputFormatFor(container: TrimContainer) {
	const { Mp4OutputFormat, MkvOutputFormat, WebMOutputFormat } = await import(
		"mediabunny"
	);
	switch (container) {
		case "mp4":
			return new Mp4OutputFormat();
		case "mkv":
			return new MkvOutputFormat();
		case "webm":
			return new WebMOutputFormat();
	}
}

function formatSeconds(value: number): string {
	const minutes = Math.floor(value / 60);
	const seconds = value - minutes * 60;
	return `${minutes}:${seconds.toFixed(2).padStart(5, "0")}`;
}

async function runTrim(
	lib: Mediabunny,
	input: InstanceType<Mediabunny["Input"]>,
	output: InstanceType<Mediabunny["Output"]>,
	params: Record<string, ParamValue>,
	onProgress: (ratio: number, phase: string) => void,
	onNotice?: (message: string) => void,
): Promise<void> {
	const requestedStart =
		typeof params.start === "number" ? Math.max(0, params.start) : 0;
	const requestedEnd =
		typeof params.end === "number" && params.end > 0
			? params.end
			: Number.POSITIVE_INFINITY;

	if (requestedEnd <= requestedStart) {
		throw new Error(
			"The end of the clip must come after its start. Move the handles so the selection covers some video.",
		);
	}

	const videoTrack = await input.getPrimaryVideoTrack();
	const audioTrack = await input.getPrimaryAudioTrack();
	if (!videoTrack && !audioTrack) {
		throw new Error("This file has no video or audio track to trim.");
	}

	onProgress(0.05, "COPY");

	// The cut point. `verifyKeyPackets` matters: a container's index can claim a
	// packet is a keyframe when it is not, and starting a copy on a mislabelled
	// frame produces a file that looks fine until it is played.
	let actualStart = requestedStart;
	let startPacket: InstanceType<Mediabunny["EncodedPacket"]> | null = null;
	if (videoTrack) {
		const sink = new lib.EncodedPacketSink(videoTrack);
		startPacket = await sink.getKeyPacket(requestedStart, {
			verifyKeyPackets: true,
		});
		if (!startPacket) {
			throw new Error(
				"No keyframe was found at or before that point, so the clip cannot start there without re-encoding.",
			);
		}
		actualStart = startPacket.timestamp;

		// A tenth of a second is below the threshold of anyone caring, and
		// reporting a 0.02s shift on every trim would train people to ignore the
		// message that matters when the shift is two seconds.
		if (requestedStart - actualStart > 0.1) {
			onNotice?.(
				`The clip starts at ${formatSeconds(actualStart)} rather than ${formatSeconds(requestedStart)}: that is the nearest keyframe before your cut, and starting anywhere else would mean re-encoding the video. Nothing was re-encoded, so the picture is identical to the original.`,
			);
		}
	}

	const duration = await input.computeDuration();
	const span = Math.min(requestedEnd, duration) - actualStart;

	// Every track must be declared before the muxer starts: `start()` writes the
	// container header, which has to know what streams the file contains. The
	// first version added the video track, started, and then added audio, which
	// threw partway through — the e2e caught it, and only because it drove a
	// file that actually had both.
	// A track whose codec the demuxer could not identify cannot be copied: the
	// output must declare what the packets contain, and a guessed codec makes a
	// file no player can read.
	if (videoTrack && !videoTrack.codec) {
		throw new Error(
			"The video track uses a codec convrtr could not identify, so its packets cannot be copied into a new file.",
		);
	}
	if (audioTrack && !audioTrack.codec) {
		throw new Error(
			"The audio track uses a codec convrtr could not identify, so its packets cannot be copied into a new file.",
		);
	}

	// Captured as consts so the null check above narrows them here; TypeScript
	// cannot carry a guard across statements on a property access.
	const videoCodec = videoTrack?.codec ?? null;
	const audioCodec = audioTrack?.codec ?? null;

	const videoSource =
		startPacket && videoCodec
			? new lib.EncodedVideoPacketSource(videoCodec)
			: null;
	if (videoSource) output.addVideoTrack(videoSource);

	const audioSource = audioCodec
		? new lib.EncodedAudioPacketSource(audioCodec)
		: null;
	if (audioSource) output.addAudioTrack(audioSource);

	await output.start();

	if (videoTrack && startPacket && videoSource) {
		const sink = new lib.EncodedPacketSink(videoTrack);
		const meta = {
			decoderConfig: (await videoTrack.getDecoderConfig()) ?? undefined,
		};
		let first = true;
		for await (const packet of sink.packets(startPacket, undefined, {
			verifyKeyPackets: true,
		})) {
			if (packet.timestamp >= requestedEnd) break;
			// Only the timestamp changes. The encoded bytes are the source's.
			await videoSource.add(
				packet.clone({ timestamp: packet.timestamp - actualStart }),
				first ? meta : undefined,
			);
			first = false;
			if (span > 0) {
				const done = (packet.timestamp - actualStart) / span;
				onProgress(0.05 + Math.min(1, Math.max(0, done)) * 0.9, "COPY");
			}
		}
	}

	if (audioTrack && audioSource) {
		const sink = new lib.EncodedPacketSink(audioTrack);
		const meta = {
			decoderConfig: (await audioTrack.getDecoderConfig()) ?? undefined,
		};
		const from = await sink.getKeyPacket(actualStart);
		let first = true;
		if (from) {
			for await (const packet of sink.packets(from, undefined)) {
				if (packet.timestamp >= requestedEnd) break;
				// Audio packets are short and independently decodable, so the
				// audio can start exactly where the video does rather than being
				// dragged back with it.
				if (packet.timestamp < actualStart) continue;
				await audioSource.add(
					packet.clone({ timestamp: packet.timestamp - actualStart }),
					first ? meta : undefined,
				);
				first = false;
			}
		}
	}

	onProgress(0.98, "MUX");
	await output.finalize();
	onProgress(1, "MUX");
}

export function createVideoTrimEngine(container: TrimContainer): Engine {
	return {
		id: `trim:${container}`,

		async probe() {
			// Nothing is decoded or encoded on this path, so no codec support is
			// needed — only the demuxer and muxer, which are WASM-free.
			return typeof WebAssembly === "object";
		},

		async run(
			input: ArrayBuffer,
			params: Record<string, ParamValue>,
			onProgress: (ratio: number, phase: string) => void,
			onNotice?: (message: string) => void,
		) {
			const lib = await import("mediabunny");
			onProgress(0.02, "DEMUX");

			const source = new lib.Input({
				source: new lib.BufferSource(input),
				formats: lib.ALL_FORMATS,
			});
			const output = new lib.Output({
				format: await outputFormatFor(container),
				target: new lib.BufferTarget(),
			});

			await runTrim(lib, source, output, params, onProgress, onNotice);

			const buffer = output.target.buffer;
			if (!buffer) {
				throw new Error(
					"trimming produced no output — the muxer returned an empty buffer",
				);
			}
			return buffer;
		},

		async runStream(
			input: Blob,
			params: Record<string, ParamValue>,
			onProgress: (ratio: number, phase: string) => void,
			sink: OutputSink,
			onNotice?: (message: string) => void,
		) {
			const lib = await import("mediabunny");
			onProgress(0.02, "DEMUX");

			const source = new lib.Input({
				source: new lib.BlobSource(input),
				formats: lib.ALL_FORMATS,
			});
			const output = new lib.Output({
				format: await outputFormatFor(container),
				target: new lib.StreamTarget(sink, { chunked: true }),
			});

			await runTrim(lib, source, output, params, onProgress, onNotice);
		},
	};
}
