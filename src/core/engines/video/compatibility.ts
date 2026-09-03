/**
 * Decides, per stream, whether a container change can copy the compressed
 * data or must re-encode it.
 *
 * This is the single most consequential piece of logic in the video pack.
 * Nearly every browser-based converter re-encodes unconditionally: hand one an
 * MKV holding H.264 video and AAC audio, ask for MP4, and it decodes every
 * frame and encodes it again — minutes of CPU and a lost generation of
 * quality, for a file whose streams were already legal in the target. Copying
 * the packets and writing a new container instead is bit-exact and takes
 * seconds because no pixel is ever decoded.
 *
 * The decision is per stream, not per file: a WebM holding AV1 video and
 * Vorbis audio can copy its video into MP4 while its audio must be re-encoded.
 */

export type Container = "mp4" | "webm" | "mkv" | "mov" | "ts" | "avi";
export type VideoCodec = "h264" | "hevc" | "av1" | "vp8" | "vp9" | "mpeg4";
export type AudioCodec =
	| "aac"
	| "opus"
	| "vorbis"
	| "mp3"
	| "flac"
	| "alac"
	| "pcm";

/**
 * Codecs each container can legally carry.
 *
 * "Legal" is not the same as "plays everywhere" — see WELL_SUPPORTED below.
 * MKV is deliberately near-universal; it was designed to carry anything.
 */
const CONTAINER_VIDEO: Record<Container, VideoCodec[]> = {
	mp4: ["h264", "hevc", "av1", "vp9", "mpeg4"],
	webm: ["vp8", "vp9", "av1"],
	mkv: ["h264", "hevc", "av1", "vp8", "vp9", "mpeg4"],
	// MOV and MP4 are both ISOBMFF, which is why MOV→MP4 is so often a pure
	// container rewrite.
	mov: ["h264", "hevc", "av1", "mpeg4"],
	ts: ["h264", "hevc", "mpeg4"],
	avi: ["mpeg4", "h264"],
};

const CONTAINER_AUDIO: Record<Container, AudioCodec[]> = {
	mp4: ["aac", "mp3", "alac", "opus", "flac"],
	webm: ["opus", "vorbis"],
	mkv: ["aac", "opus", "vorbis", "mp3", "flac", "alac", "pcm"],
	mov: ["aac", "mp3", "alac", "pcm"],
	ts: ["aac", "mp3"],
	avi: ["mp3", "pcm"],
};

/**
 * Combinations that are spec-legal but poorly played in practice.
 *
 * VP9 in MP4 is the important case: the specification permits it, but many
 * players, editors and platform decoders choke on it.
 *
 * This originally transcoded such combinations by default, reasoning that a
 * lossless file which will not open is worse than an honest re-encode. That
 * was the wrong call, and the engine never implemented it — mediabunny copies
 * whatever the container can legally carry, so the policy described here and
 * the behaviour that shipped disagreed, with the policy being the dead half.
 *
 * Copying is now the documented default too, because re-encoding by default
 * destroys quality that cannot be recovered in order to fix a problem the user
 * may not have — their player may handle VP9-in-MP4 perfectly well. The cost
 * of copying is a file that might not open, which the user discovers
 * immediately and can fix by re-running with a re-encode. The cost of
 * transcoding is quality gone for good, discovered never. So: copy, name the
 * caveat plainly, and leave the re-encode available.
 */
const POORLY_SUPPORTED: Array<{
	container: Container;
	codec: VideoCodec | AudioCodec;
	note: string;
}> = [
	{
		container: "mp4",
		codec: "vp9",
		note: "VP9 in MP4 is spec-legal but many players cannot decode it",
	},
	{
		container: "mp4",
		codec: "flac",
		note: "FLAC in MP4 is spec-legal but support is patchy",
	},
];

/** The codec chosen when a stream cannot be copied into the target. */
const TRANSCODE_TARGET: Record<
	Container,
	{ video: VideoCodec; audio: AudioCodec }
> = {
	mp4: { video: "h264", audio: "aac" },
	webm: { video: "vp9", audio: "opus" },
	mkv: { video: "h264", audio: "aac" },
	mov: { video: "h264", audio: "aac" },
	ts: { video: "h264", audio: "aac" },
	avi: { video: "mpeg4", audio: "mp3" },
};

export type StreamPlan =
	| { action: "copy"; reason: string }
	| { action: "transcode"; to: VideoCodec | AudioCodec; reason: string }
	| { action: "drop"; reason: string };

export interface RemuxPlan {
	video?: StreamPlan;
	audio?: StreamPlan;
	/** True only when every present stream is copied — nothing re-encoded. */
	lossless: boolean;
	/** Set when a copy is possible but deliberately not taken by default. */
	caveat?: string;
}

/**
 * The playback caveat for a container/codec pair, if there is one.
 *
 * Exported so the conversion engine warns using the same table this module
 * plans with. Two copies of "which combinations play badly" would drift, and
 * the drift would show up as a missing warning rather than as a crash.
 */
export function playbackCaveat(
	container: Container,
	// A plain string rather than this module's codec unions: the caller reads
	// codec names off mediabunny's tracks, and its union is wider than the set
	// this module plans with. Narrowing at the boundary would mean casting a
	// value that may legitimately not be in the local union, which is exactly
	// how an unrecognised codec would turn into a crash instead of "no
	// caveat".
	codec: string,
): string | undefined {
	return POORLY_SUPPORTED.find(
		(entry) => entry.container === container && entry.codec === codec,
	)?.note;
}

function poorNote(
	container: Container,
	codec: VideoCodec | AudioCodec,
): string | undefined {
	return POORLY_SUPPORTED.find(
		(entry) => entry.container === container && entry.codec === codec,
	)?.note;
}

/**
 * @param source            the file's container and the codecs it actually holds
 * @param target            the container being written
 * @param avoidPoorSupport  re-encode rather than copy where playback support
 *                          is known to be patchy — for a caller who needs the
 *                          output to open everywhere and accepts the loss
 */
export function planRemux(
	source: {
		container: Container;
		video?: VideoCodec;
		audio?: AudioCodec;
	},
	target: Container,
	avoidPoorSupport = false,
): RemuxPlan {
	const plan: RemuxPlan = { lossless: true };
	let caveat: string | undefined;

	if (source.video) {
		const legal = CONTAINER_VIDEO[target].includes(source.video);
		const poor = poorNote(target, source.video);

		if (legal && (!poor || !avoidPoorSupport)) {
			// Copied even where support is patchy, with the caveat attached
			// rather than silently paid for in quality.
			if (poor) {
				caveat = `${poor}. The streams were copied so nothing was lost — re-run with a re-encode if your player rejects the file.`;
			}
			plan.video = {
				action: "copy",
				reason: `${source.video} is carried natively by ${target}`,
			};
		} else if (legal && poor) {
			// The caller asked to avoid patchy support and accepted the loss.
			caveat = `${poor}. Re-encoded to ${TRANSCODE_TARGET[target].video} for compatibility, at the cost of a re-encode.`;
			plan.video = {
				action: "transcode",
				to: TRANSCODE_TARGET[target].video,
				reason: poor,
			};
			plan.lossless = false;
		} else {
			plan.video = {
				action: "transcode",
				to: TRANSCODE_TARGET[target].video,
				reason: `${target} cannot carry ${source.video}`,
			};
			plan.lossless = false;
		}
	}

	if (source.audio) {
		const legal = CONTAINER_AUDIO[target].includes(source.audio);
		const poor = poorNote(target, source.audio);

		if (legal && (!poor || !avoidPoorSupport)) {
			if (poor) {
				caveat = `${poor}. The streams were copied so nothing was lost — re-run with a re-encode if your player rejects the file.`;
			}
			plan.audio = {
				action: "copy",
				reason: `${source.audio} is carried natively by ${target}`,
			};
		} else {
			plan.audio = {
				action: "transcode",
				to: TRANSCODE_TARGET[target].audio,
				reason: poor ?? `${target} cannot carry ${source.audio}`,
			};
			plan.lossless = false;
		}
	}

	if (caveat) plan.caveat = caveat;
	return plan;
}

/** True when the whole conversion is a container rewrite with no re-encoding. */
export function isPureRemux(plan: RemuxPlan): boolean {
	return plan.lossless;
}
