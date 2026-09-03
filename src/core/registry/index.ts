import { mp4ToM4a } from "./tools/audio/mp4-to-m4a";
import { avifToJpg } from "./tools/avif-to-jpg";
import { avifToPng } from "./tools/avif-to-png";
import { compressJpg } from "./tools/compress-jpg";
import { faviconPack } from "./tools/favicon-pack";
import { gifFrames } from "./tools/gif-frames";
import { heicToJpg } from "./tools/heic-to-jpg";
import { heicToPng } from "./tools/heic-to-png";
import { heicToWebp } from "./tools/heic-to-webp";
import { jpgToAvif } from "./tools/jpg-to-avif";
import { jpgToJxl } from "./tools/jpg-to-jxl";
import { jpgToPdf } from "./tools/jpg-to-pdf";
import { jpgToPng } from "./tools/jpg-to-png";
import { jpgToWebp } from "./tools/jpg-to-webp";
import { optimiseSvg } from "./tools/optimise-svg";
import { pngToAvif } from "./tools/png-to-avif";
import { pngToJpg } from "./tools/png-to-jpg";
import { pngToJxl } from "./tools/png-to-jxl";
import { pngToPdf } from "./tools/png-to-pdf";
import { pngToWebp } from "./tools/png-to-webp";
import { removeExifJpg } from "./tools/remove-exif-jpg";
import { removeMetadataPng } from "./tools/remove-metadata-png";
import { resizeJpg } from "./tools/resize-jpg";
import { resizePng } from "./tools/resize-png";
import { resizeWebp } from "./tools/resize-webp";
import { frameMp4 } from "./tools/video/frame-mp4";
import { mkvToMp4 } from "./tools/video/mkv-to-mp4";
import { mlwToMp4 } from "./tools/video/mlw-to-mp4";
import { movToMp4 } from "./tools/video/mov-to-mp4";
import { mp4ToWebm } from "./tools/video/mp4-to-webm";
import { trimMp4 } from "./tools/video/trim-mp4";
import { webmToMp4 } from "./tools/video/webm-to-mp4";
import { webpToJpg } from "./tools/webp-to-jpg";
import { webpToPng } from "./tools/webp-to-png";
import type { Category, Tool } from "./types";

export * from "./types";

/**
 * The catalogue. Every route, page title, structured-data block, options panel
 * and file-type validation in the product is derived from these declarations,
 * so adding a conversion means adding one file here and nothing in `src/app`.
 *
 * Ordered by input format, then output — this is the order the `/tools` index
 * and the category hubs present them in.
 */
export const TOOLS: Tool[] = [
	heicToJpg,
	heicToPng,
	heicToWebp,
	jpgToPng,
	jpgToWebp,
	jpgToAvif,
	jpgToJxl,
	pngToJpg,
	pngToWebp,
	pngToAvif,
	pngToJxl,
	webpToJpg,
	webpToPng,
	avifToJpg,
	avifToPng,
	resizePng,
	resizeJpg,
	resizeWebp,
	removeExifJpg,
	removeMetadataPng,
	compressJpg,
	faviconPack,
	jpgToPdf,
	pngToPdf,
	optimiseSvg,
	gifFrames,
	mlwToMp4,
	mkvToMp4,
	movToMp4,
	webmToMp4,
	mp4ToWebm,
	mp4ToM4a,
	trimMp4,
	frameMp4,
];

export function getTool(id: string): Tool | undefined {
	return TOOLS.find((t) => t.id === id);
}

export function getToolsByCategory(category: Category): Tool[] {
	return TOOLS.filter((t) => t.category === category);
}
