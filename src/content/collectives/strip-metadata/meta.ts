import type { CollectiveMeta } from "../types";

export const meta: CollectiveMeta = {
	slug: "strip-metadata",
	title: "Strip metadata before sharing",
	why: "A file carries more than the picture or the sound: a JPG's EXIF block can hold the GPS coordinates of where it was taken, a PNG's text chunks can hold the authoring tool's name and a filesystem path, an MP3's ID3 frames and a FLAC's Vorbis comments can hold the same. Each of these four tools rewrites only that structure and copies the image or audio data across untouched, so what changes is what the file says about itself, not what it contains.",
	toolIds: [
		"image/remove-exif-jpg",
		"image/remove-metadata-png",
		"audio/remove-tags-mp3",
		"audio/remove-tags-flac",
	],
};
