import type { CollectiveMeta } from "../types";

export const meta: CollectiveMeta = {
	slug: "podcast-kit",
	title: "Podcast episode kit",
	why: "A recorded episode starts as a raw WAV and ends as whatever a hosting platform will actually accept. Trim the dead air and flubbed takes, normalise loudness to -16 LUFS -- the exact preset this catalogue's own WAV normaliser labels 'Podcast' -- convert to the MP3 every host expects, and pull a waveform image for a social teaser. None of these re-encode until the format itself has to change.",
	toolIds: [
		"audio/trim-wav",
		"audio/normalise-wav",
		"audio/wav-to-mp3",
		"audio/wav-waveform",
	],
};
