import { defineAudioExtraction } from "./defineAudioExtraction";

export const mp4ToM4a = defineAudioExtraction({
	from: "mp4",
	to: "m4a",
	// MP4 video almost always carries AAC, and .m4a is an MP4 holding only that
	// audio track — so the stream copies out with nothing touched at all.
	commonlyCopies: true,
	seo: {
		title: "Extract audio from MP4 — lossless, in your browser | convrtr",
		h1: "Extract audio from MP4",
		intent:
			"Pull the audio track out of an MP4 without re-encoding it. The AAC stream is copied out bit-for-bit into an .m4a file, so the audio is identical to the original. Runs entirely in your browser — the video never leaves your device.",
		faq: [
			{
				q: "Why .m4a and not .mp3?",
				a: "Because .m4a is the honest answer. An MP4 already contains AAC audio, and an .m4a file is that same audio in the same container with nothing re-encoded — so the result is bit-for-bit identical to what was in the video. Converting to MP3 would mean decoding the AAC and re-encoding it, which throws away quality permanently to reach a format that is older and generally worse at the same bitrate. Every current phone, browser and music player handles .m4a.",
			},
			{
				q: "Is the extracted audio really identical?",
				a: "Yes, when the codec can be carried — which for MP4 means AAC, the usual case. convrtr copies the encoded packets straight across rather than decoding them, so the audio bytes in the .m4a are the audio bytes from the MP4. Where a source uses a codec the target cannot hold, the tool says so instead of re-encoding quietly.",
			},
			{
				q: "Why is the extracted file a few milliseconds longer?",
				a: "Because AAC has encoder pre-roll. The first fraction of a second of an AAC stream decodes to samples that come before the intended start, and a video file hides them with an instruction telling players to skip that much. Copying the audio out byte-for-byte brings those samples with it — around 23 milliseconds on a 44.1kHz file — so the extracted audio begins that much later than it did in the video. The alternative is to decode and re-encode in order to trim them, and we measured that: it gives the new encoder its own pre-roll and padding, producing a file further from the original than the copy while also being lossy. So convrtr copies, and tells you about the 23 milliseconds.",
			},
			{
				q: "How large a video can it handle?",
				a: "Large ones. The video is read in slices and the audio written straight to disk as it is extracted, so a multi-gigabyte file does not have to fit in memory. In browsers without that capability the file is processed in memory instead, and convrtr says up front if it will not fit.",
			},
			{
				q: "Are my files uploaded anywhere?",
				a: "No. convrtr has no server that receives files. Everything runs in your browser, and you can confirm it by opening your network tab while extracting — or by going offline first.",
			},
		],
		related: ["video/mkv-to-mp4", "video/mp4-to-webm", "video/mov-to-mp4"],
	},
});
