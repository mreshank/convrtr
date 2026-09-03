import { defineVideoConversion } from "./defineVideoConversion";

export const mkvToMp4 = defineVideoConversion({
	from: "mkv",
	to: "mp4",
	commonlyCopies: true,
	seo: {
		title: "Convert MKV to MP4 without re-encoding | convrtr",
		h1: "Convert MKV to MP4",
		intent:
			"Most MKV files already hold H.264 video and AAC audio — exactly what MP4 carries natively. So this rewrites the container and copies the streams untouched: the result is bit-identical video, and it finishes in seconds rather than the many minutes a re-encode would take. Almost every online converter re-encodes regardless, costing you both time and a generation of quality for a file that never needed it. It all runs in your browser; the video is never uploaded.",
		faq: [
			{
				q: "Does this reduce quality?",
				a: "Not when the streams can be copied, which is the usual case for MKV. The compressed video and audio are moved into the new container byte for byte — nothing is decoded, so nothing is degraded. If the file holds a codec MP4 cannot carry, the tool re-encodes and tells you it did.",
			},
			{
				q: "Why is it so much faster than other converters?",
				a: "Because it does not decode the video. Re-encoding means decompressing every frame and compressing it again, which is minutes of work on a long file. Rewriting a container is mostly reading and writing headers.",
			},
			{
				q: "What happens to subtitles and extra audio tracks?",
				a: "MKV can hold things MP4 cannot. Anything that has to be dropped is named before the conversion runs, rather than silently discarded — an incomplete file you believe is complete is worse than one you know about.",
			},
			{
				q: "Is there a file size limit?",
				a: "It is bounded by your device's memory, not by us. Large files are checked before conversion starts and refused up front if they will not fit, rather than crashing partway through.",
			},
		],
		related: ["video/mov-to-mp4", "video/webm-to-mp4", "video/mp4-to-webm"],
	},
});
