import type { Tool } from "../../types";

export type VideoContainer = "mp4" | "webm" | "mkv" | "mov" | "ts";

const CONTAINER_MIME: Record<VideoContainer, string[]> = {
	mp4: ["video/mp4"],
	webm: ["video/webm"],
	mkv: ["video/x-matroska"],
	mov: ["video/quicktime"],
	ts: ["video/mp2t"],
};

export interface DefineVideoConversionInput {
	from: VideoContainer;
	to: "mp4" | "webm" | "mkv";
	extraExt?: string[];
	/**
	 * Whether the common codec pairing for this source can be copied straight
	 * into the target. Drives `losslessAvailable`, and therefore whether the
	 * fidelity ring can honestly read 100.
	 */
	commonlyCopies: boolean;
	seo: {
		title: string;
		h1: string;
		intent: string;
		faq: { q: string; a: string }[];
		related: string[];
	};
}

/**
 * Builds a container-conversion `Tool`.
 *
 * The quality model here is unlike the image tools': there is no quality
 * slider on the default path, because the default path does not re-encode
 * anything. Presenting a quality control for an operation that copies packets
 * byte for byte would imply a trade-off that does not exist.
 *
 * `forceTranscode` is offered in the advanced tier for the case where someone
 * genuinely needs a re-encode — an older player that chokes on the source
 * codec, say — rather than being the silent default it is in most converters.
 */
export function defineVideoConversion(input: DefineVideoConversionInput): Tool {
	const slug = `${input.from}-to-${input.to}`;
	return {
		id: `video/${slug}`,
		slug,
		category: "video",
		kind: "convert",
		accept: {
			mime: CONTAINER_MIME[input.from],
			ext: [input.from, ...(input.extraExt ?? [])],
		},
		output: { ext: input.to, mime: `video/${input.to}` },
		engines: [`video:${input.from}->${input.to}`],
		quality: {
			losslessAvailable: input.commonlyCopies,
			defaultPreset: input.commonlyCopies ? "lossless" : "visually-lossless",
			presets: input.commonlyCopies
				? [
						{
							id: "lossless",
							label: "Lossless",
							explanation:
								"Copies the video and audio streams untouched and rewrites only the container. Seconds, not minutes.",
							params: { forceTranscode: false },
						},
						{
							id: "visually-lossless",
							label: "Re-encode",
							explanation:
								"Decodes and re-encodes. Only worth choosing if a player rejects the original codec.",
							params: { forceTranscode: true },
						},
					]
				: [
						{
							id: "visually-lossless",
							label: "Visually lossless",
							explanation:
								"The source codec cannot go into this container, so the video is re-encoded at high quality.",
							params: { forceTranscode: false },
						},
					],
			advanced: [
				{
					control: "toggle",
					key: "forceTranscode",
					label: "Force re-encode even when the streams could be copied",
					group: "Encoder",
					default: false,
				},
			],
		},
		seo: input.seo,
	};
}
