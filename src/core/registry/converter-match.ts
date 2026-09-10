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
