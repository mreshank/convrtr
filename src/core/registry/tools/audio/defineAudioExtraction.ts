import type { Tool } from "../../types";

export type SourceContainer = "mp4" | "mkv" | "mov" | "webm";
export type AudioTarget = "m4a" | "ogg" | "wav";

const CONTAINER_MIME: Record<SourceContainer, string[]> = {
	mp4: ["video/mp4"],
	mkv: ["video/x-matroska"],
	mov: ["video/quicktime"],
	webm: ["video/webm"],
};

/**
 * Declared here rather than imported from the engine, for the same reason the
 * image tools declare their MIME types locally: importing an engine value into
 * the registry drags every codec into the build graph of every page. Held in
 * step by `mime-parity`.
 */
const TARGET_MIME: Record<AudioTarget, string> = {
	m4a: "audio/mp4",
	ogg: "audio/ogg",
	wav: "audio/wav",
};

export interface DefineAudioExtractionInput {
	from: SourceContainer;
	to: AudioTarget;
	extraExt?: string[];
	/**
	 * Whether the codec this source usually carries can be copied straight into
	 * the target. Drives `losslessAvailable`, and so whether the fidelity ring
	 * can honestly read 100.
	 */
	commonlyCopies: boolean;
	seo: Tool["seo"];
}

/**
 * Builds an audio-extraction `Tool`.
 *
 * There is no quality control on the copy path, because nothing is being
 * re-encoded — offering a bitrate slider for an operation that copies packets
 * byte for byte would imply a trade-off that does not exist. Where the source
 * codec cannot be carried, the tool says so in the preset explanation instead
 * of quietly re-encoding behind a "lossless" label.
 */
export function defineAudioExtraction(input: DefineAudioExtractionInput): Tool {
	const slug = `${input.from}-to-${input.to}`;
	return {
		id: `audio/${slug}`,
		slug,
		category: "audio",
		kind: "extract",
		accept: {
			mime: CONTAINER_MIME[input.from],
			ext: [input.from, ...(input.extraExt ?? [])],
		},
		output: { ext: input.to, mime: TARGET_MIME[input.to] },
		engines: [`audio:${input.from}->${input.to}`],
		// The input is a video file, so it can be far larger than memory even
		// though the audio coming out is small. Kept in step with the engine by
		// `streamable-parity`.
		streamable: true,
		quality: {
			losslessAvailable: input.commonlyCopies,
			defaultPreset: input.commonlyCopies ? "lossless" : "visually-lossless",
			presets: input.commonlyCopies
				? [
						{
							id: "lossless",
							label: "Lossless",
							explanation:
								"Copies the audio stream out byte for byte — no re-encoding at all. Includes the codec's ~23ms of encoder pre-roll, which the video hid, so playback starts a hair later than in the original.",
							params: { preserveTimeline: true },
						},
					]
				: [
						{
							id: "visually-lossless",
							label: "High quality",
							explanation:
								"This container cannot carry the source codec, so the audio is decoded and re-encoded at high quality.",
							params: {},
						},
					],
			// No control for the trim path, deliberately.
			//
			// It was built and measured, and it does not do what it would have
			// to do to be worth offering. Re-encoding to drop AAC's encoder
			// pre-roll gives the *new* encoder its own pre-roll and padding: on
			// a 2.020s source, the copy came out 2.043s and the re-encode 2.113s
			// — further from the original, not closer, while also being lossy.
			// A preset labelled "exact timing" that is worse on both axes is
			// just a trap, so this tool has one honest mode and the FAQ explains
			// the pre-roll instead.
			advanced: [],
		},
		seo: input.seo,
	};
}
