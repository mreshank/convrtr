import { avifToJpg } from "./tools/avif-to-jpg";
import { avifToPng } from "./tools/avif-to-png";
import { heicToJpg } from "./tools/heic-to-jpg";
import { heicToPng } from "./tools/heic-to-png";
import { heicToWebp } from "./tools/heic-to-webp";
import { jpgToAvif } from "./tools/jpg-to-avif";
import { jpgToJxl } from "./tools/jpg-to-jxl";
import { jpgToPng } from "./tools/jpg-to-png";
import { jpgToWebp } from "./tools/jpg-to-webp";
import { pngToAvif } from "./tools/png-to-avif";
import { pngToJpg } from "./tools/png-to-jpg";
import { pngToJxl } from "./tools/png-to-jxl";
import { pngToWebp } from "./tools/png-to-webp";
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
];

export function getTool(id: string): Tool | undefined {
	return TOOLS.find((t) => t.id === id);
}

export function getToolsByCategory(category: Category): Tool[] {
	return TOOLS.filter((t) => t.category === category);
}
