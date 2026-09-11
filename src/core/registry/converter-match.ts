import { TOOLS, type Tool } from "./index";

export type TargetOption = {
	ext: string;
	label: string;
	toolId: string;
	tool: Tool;
};

const MIME_MAP: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/jpg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"image/avif": "avif",
	"image/heic": "heic",
	"image/heif": "heic",
	"image/jxl": "jxl",
	"image/svg+xml": "svg",
	"image/gif": "gif",
	"video/mp4": "mp4",
	"video/quicktime": "mov",
	"video/webm": "webm",
	"video/x-matroska": "mkv",
	"video/x-msvideo": "avi",
	"audio/wav": "wav",
	"audio/x-wav": "wav",
	"audio/wave": "wav",
	"audio/mpeg": "mp3",
	"audio/mp3": "mp3",
	"audio/flac": "flac",
	"audio/x-flac": "flac",
	"audio/opus": "opus",
	"audio/ogg": "opus",
	"audio/mp4": "m4a",
	"audio/x-m4a": "m4a",
	"application/pdf": "pdf",
	"application/x-procreate": "procreate",
	"application/vnd.xmind.workbook": "xmind",
	"video/x-dav": "dav",
	"video/h264": "h264",
	"application/x-sqlite3": "clip",
	"audio/x-soundfont": "sf2",
	"audio/soundfont": "sf2",
	"application/x-soundfont": "sf2",
	"application/x-wallpaper-engine": "pkg",
	"application/x-goodnotes": "goodnotes",
	"application/x-silhouette": "studio3",
	"application/x-godot-package": "pck",
	"application/x-rpa": "rpa",
	"application/vnd.ms-outlook": "msg",
	"application/x-msg": "msg",
	"message/rfc822": "eml",
	"audio/x-adx": "adx",
	"audio/adx": "adx",
	"application/x-scorm": "scorm",
	"image/x-icns": "icns",
	"image/icns": "icns",
	"multipart/related": "mhtml",
	"application/x-mimearchive": "mhtml",
	"message/rfc822-mhtml": "mhtml",
	"text/vcard": "vcf",
	"text/x-vcard": "vcf",
	"application/vcard": "vcf",
	"application/x-vcard": "vcf",
	"text/directory": "vcf",
	"image/x-dds": "dds",
	"image/dds": "dds",
	"application/x-dds": "dds",
	"application/dds": "dds",
	"application/x-doom-wad": "wad",
	"application/x-wad": "wad",
	"application/x-quake-pak": "pak",
	"application/x-pak": "pak",
	"application/x-photoshop-brush": "abr",
	"image/x-photoshop-brush": "abr",
	"application/x-navi-animation": "ani",
	"image/x-ani": "ani",
	"application/vnd.ant.fit": "fit",
	"application/x-fit": "fit",
	"application/fit": "fit",
	"image/x-cur": "cur",
	"application/x-adobe-swatch-exchange": "ase",
	"application/x-webarchive": "webarchive",
	"text/x-vnote": "vnt",
	"text/vnote": "vnt",
	"application/vnt": "vnt",
	"image/x-gimp-brush": "gbr",
	"application/x-gimp-brush": "gbr",
	"image/gbr": "gbr",
	"application/cdr": "cdr",
	"application/x-cdr": "cdr",
	"image/x-cdr": "cdr",
	"application/coreldraw": "cdr",
	"application/x-sami": "smi",
	"text/x-sami": "smi",
	"application/sami": "smi",
	"image/x-tga": "tga",
	"image/tga": "tga",
	"image/x-targa": "tga",
	"application/x-tga": "tga",
	"application/x-source-bsp": "bsp",
	"application/x-quake-bsp": "bsp",
	"text/x-microdvd": "sub",
	"application/x-subviewer": "sub",
	"text/x-ssa": "ass",
	"text/x-ass": "ass",
	"application/x-ass": "ass",
	"application/vnd.ms-htmlhelp": "chm",
	"application/x-chm": "chm",
	"application/chm": "chm",
	"audio/silk": "silk",
	"audio/x-silk": "silk",
	"application/x-silk": "silk",
	"image/x-pcx": "pcx",
	"image/pcx": "pcx",
	"application/x-pcx": "pcx",
	"application/x-photoshop-color-table": "act",
	"image/x-vtf": "vtf",
	"image/vtf": "vtf",
	"application/x-vtf": "vtf",
	"image/x-aseprite": "aseprite",
	"application/x-aseprite": "aseprite",
	"image/x-iff": "iff",
	"image/x-ilbm": "iff",
	"image/ilbm": "iff",
	"application/x-ilbm": "iff",
	"application/x-cue": "cue",
	"text/x-cue": "cue",
	"application/dxf": "dxf",
	"application/x-dxf": "dxf",
	"image/vnd.dxf": "dxf",
	"image/x-dxf": "dxf",
	"image/x-xbitmap": "xbm",
	"image/xbm": "xbm",
	"image/x-xbm": "xbm",
	"audio/x-voc": "voc",
	"audio/voc": "voc",
	"application/x-voc": "voc",
	"image/wmf": "wmf",
	"image/x-wmf": "wmf",
	"image/x-win-metafile": "wmf",
	"application/x-msmetafile": "wmf",
	"application/wmf": "wmf",
	"application/gpx+xml": "gpx",
	"application/x-gpx+xml": "gpx",
	"audio/basic": "au",
	"audio/x-au": "au",
	"audio/au": "au",
	"audio/snd": "au",
	"image/x-xpixmap": "xpm",
	"image/x-xpm": "xpm",
	"image/xpm": "xpm",
	"text/x-xpixmap": "xpm",
	"application/vnd.google-earth.kml+xml": "kml",
	"application/kml": "kml",
	"audio/aiff": "aiff",
	"audio/x-aiff": "aiff",
	"sound/aiff": "aiff",
	"audio/x-pn-aiff": "aiff",
	"image/x-sun-raster": "ras",
	"image/x-raster": "ras",
	"image/sun-raster": "ras",
	"application/x-sun-raster": "ras",
	"application/vnd.garmin.tcx+xml": "tcx",
	"application/x-tcx+xml": "tcx",
	"audio/x-ircam": "ircam",
	"audio/ircam": "ircam",
	"sound/ircam": "ircam",
	"image/x-sgi": "sgi",
	"image/sgi": "sgi",
	"image/x-rgb": "rgb",
	"image/rgb": "rgb",
	"application/x-sgi": "sgi",
	"application/vnd.google-earth.kmz": "kmz",
	"application/x-kmz": "kmz",
	"audio/x-nist": "sph",
	"audio/nist": "sph",
	"audio/x-sphere": "sph",
	"image/x-xwindowdump": "xwd",
	"image/xwd": "xwd",
	"image/x-xwd": "xwd",
	"application/x-xwd": "xwd",
	"application/x-openstreetmap+xml": "osm",
	"application/osm+xml": "osm",
	"audio/x-dsf": "dsf",
	"audio/dsf": "dsf",
	"audio/x-dsd": "dsf",
	"audio/dsd": "dsf",
	"image/fits": "fits",
	"application/fits": "fits",
	"image/x-fits": "fits",
	"application/gml+xml": "gml",
	"audio/x-mod": "mod",
	"audio/mod": "mod",
	"audio/x-protracker": "mod",
	"text/vtt": "vtt",
	"text/x-vtt": "vtt",
	"image/svg+xml-compressed": "svgz",
	"audio/x-caf": "caf",
	"audio/caf": "caf",
	"image/x-portable-pixmap": "ppm",
	"image/x-portable-graymap": "pgm",
	"image/x-portable-bitmap": "pbm",
	"image/x-portable-anymap": "pnm",
	"application/vnd.comicbook+zip": "cbz",
	"application/x-cbz": "cbz",
	"application/x-subrip": "srt",
	"image/x-icon": "ico",
	"image/vnd.microsoft.icon": "ico",
	"application/epub+zip": "epub",
	"application/x-epub": "epub",
	"audio/x-8svx": "8svx",
	"audio/8svx": "8svx",
	"image/x-tim": "tim",
	"image/tim": "tim",
	"application/x-tim": "tim",
	"application/rtf": "rtf",
	"text/rtf": "rtf",
	"text/richtext": "rtf",
	"application/x-rtf": "rtf",
	"audio/x-dsp": "dsp",
	"audio/dsp": "dsp",
	"application/x-dsp": "dsp",
	"image/x-macpaint": "mac",
	"image/macpaint": "mac",
	"image/x-pntg": "mac",
	"application/x-macpaint": "mac",
	"application/x-latex": "tex",
	"text/x-latex": "tex",
	"text/x-tex": "tex",
	"application/x-tex": "tex",
	"audio/vox": "vox",
	"audio/x-vox": "vox",
};

/**
 * Normalizes and extracts the file extension from a File or filename.
 */
export function detectFileExtension(fileOrName: File | string): string {
	const name = typeof fileOrName === "string" ? fileOrName : fileOrName.name;
	const dotIndex = name.lastIndexOf(".");
	if (dotIndex !== -1 && dotIndex < name.length - 1) {
		const ext = name.slice(dotIndex + 1).toLowerCase();
		if (ext === "jpeg") return "jpg";
		return ext;
	}

	if (typeof fileOrName !== "string" && fileOrName.type) {
		const mapped = MIME_MAP[fileOrName.type.toLowerCase()];
		if (mapped) return mapped;
	}

	return "";
}

/**
 * Returns all available target formats and tools for a given input file or extension.
 */
export function getAvailableTargetFormatsForFile(
	fileOrExt: File | string,
): TargetOption[] {
	const ext =
		typeof fileOrExt === "string" && !fileOrExt.includes(".")
			? fileOrExt.toLowerCase()
			: detectFileExtension(fileOrExt);

	if (!ext) return [];

	const matchingTools = TOOLS.filter((tool) =>
		tool.accept.ext.map((e) => e.toLowerCase()).includes(ext),
	);

	const optionMap = new Map<string, TargetOption>();

	for (const tool of matchingTools) {
		const targetExt = tool.output.ext.toLowerCase();
		const existing = optionMap.get(targetExt);

		// Prefer explicit "convert" tools over utility/inspect tools
		if (
			!existing ||
			(tool.kind === "convert" && existing.tool.kind !== "convert")
		) {
			optionMap.set(targetExt, {
				ext: targetExt,
				label: targetExt.toUpperCase(),
				toolId: tool.id,
				tool,
			});
		}
	}

	return Array.from(optionMap.values()).sort((a, b) =>
		a.label.localeCompare(b.label),
	);
}

/**
 * Finds the best matching Tool for a given fromExt and toTarget.
 */
export function findToolForConversion(
	fromExt: string,
	toTarget: string,
): Tool | undefined {
	const from = fromExt.toLowerCase();
	const to = toTarget.toLowerCase();

	const candidates = TOOLS.filter(
		(tool) =>
			tool.accept.ext.map((e) => e.toLowerCase()).includes(from) &&
			tool.output.ext.toLowerCase() === to,
	);

	if (candidates.length === 0) return undefined;

	// Prefer direct conversion tools if multiple match
	const convertTool = candidates.find((t) => t.kind === "convert");
	return convertTool ?? candidates[0];
}

/**
 * Returns the intersection of target format extensions shared across all given files.
 */
export function getCommonTargetFormats(files: File[]): string[] {
	if (files.length === 0) return [];

	const allTargetsPerFile = files.map((file) => {
		const targets = getAvailableTargetFormatsForFile(file);
		return new Set(targets.map((t) => t.ext));
	});

	const firstSet = allTargetsPerFile[0];
	if (!firstSet) return [];

	const common = Array.from(firstSet).filter((target) =>
		allTargetsPerFile.every((set) => set.has(target)),
	);

	return common.sort();
}

/**
 * Returns the union of all available target format extensions across the given files.
 */
export function getAllTargetFormats(files: File[]): string[] {
	const seen = new Set<string>();
	for (const file of files) {
		for (const target of getAvailableTargetFormatsForFile(file)) {
			seen.add(target.ext);
		}
	}
	return Array.from(seen).sort();
}
