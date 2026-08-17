import { avifToJpg } from "../avif-to-jpg";
import { avifToPng } from "../avif-to-png";
import { heicToJpg } from "../heic-to-jpg";
import { heicToPng } from "../heic-to-png";
import { heicToWebp } from "../heic-to-webp";
import { jpgToAvif } from "../jpg-to-avif";
import { jpgToJxl } from "../jpg-to-jxl";
import { jpgToPng } from "../jpg-to-png";
import { jpgToWebp } from "../jpg-to-webp";
import { pngToAvif } from "../png-to-avif";
import { pngToJpg } from "../png-to-jpg";
import { pngToJxl } from "../png-to-jxl";
import { pngToWebp } from "../png-to-webp";
import { webpToJpg } from "../webp-to-jpg";
import { webpToPng } from "../webp-to-png";

export {
	avifToJpg,
	avifToPng,
	heicToJpg,
	heicToPng,
	heicToWebp,
	jpgToAvif,
	jpgToJxl,
	jpgToPng,
	jpgToWebp,
	pngToAvif,
	pngToJpg,
	pngToJxl,
	pngToWebp,
	webpToJpg,
	webpToPng,
};

/**
 * Every image conversion tool declared under `src/core/registry/tools/`,
 * including the migrated `png-to-webp`. A convenience for whoever wires
 * these into the top-level `TOOLS` array in `src/core/registry/index.ts` —
 * `TOOLS: Tool[] = [...IMAGE_TOOLS]` instead of one import line per tool —
 * and for this package's own tests, which check schema conformance without
 * depending on that wiring existing yet.
 */
export const IMAGE_TOOLS = [
	pngToWebp,
	heicToJpg,
	heicToPng,
	heicToWebp,
	jpgToWebp,
	jpgToPng,
	jpgToAvif,
	jpgToJxl,
	pngToJpg,
	pngToAvif,
	pngToJxl,
	webpToPng,
	webpToJpg,
	avifToJpg,
	avifToPng,
];
