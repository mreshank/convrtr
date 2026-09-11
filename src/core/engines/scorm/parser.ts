import { unzipSync, zipSync } from "fflate";

export type ScormMetadata = {
	title: string;
	identifier: string;
	mediaCount: number;
};

/**
 * Extracts course title and metadata from SCORM imsmanifest.xml.
 */
function parseManifest(xmlText: string): { title: string; id: string } {
	let title = "SCORM Course Assets";
	let id = "scorm-package";

	const titleMatch =
		xmlText.match(/<title[^>]*>([^<]+)<\/title>/i) ||
		xmlText.match(/<string[^>]*>([^<]+)<\/string>/i);
	if (titleMatch?.[1]) {
		title = titleMatch[1].trim();
	}

	const idMatch = xmlText.match(/identifier="([^"]+)"/i);
	if (idMatch?.[1]) {
		id = idMatch[1].trim();
	}

	return { title, id };
}

const MEDIA_EXTS = new Set([
	"mp4",
	"webm",
	"mov",
	"m4v",
	"mp3",
	"wav",
	"m4a",
	"ogg",
	"aac",
	"png",
	"jpg",
	"jpeg",
	"webp",
	"svg",
	"gif",
	"pdf",
	"vtt",
	"srt",
]);

/**
 * Unpacks SCORM / Articulate / Captivate course package and isolates
 * all videos, audio voiceovers, PDFs, and artwork into a structured ZIP.
 */
export function extractScormToZip(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "UNZIP");

	let entries: Record<string, Uint8Array>;
	try {
		entries = unzipSync(new Uint8Array(input));
	} catch {
		throw new Error(
			"extractScorm: Invalid or corrupted ZIP archive in SCORM package",
		);
	}

	const fileNames = Object.keys(entries);
	if (fileNames.length === 0) {
		throw new Error("extractScorm: Archive is empty");
	}

	// Verify SCORM or e-learning signature
	const manifestKey = fileNames.find((k) =>
		k.toLowerCase().endsWith("imsmanifest.xml"),
	);
	const hasStoryline = fileNames.some(
		(k) => k.includes("story_content") || k.includes("scormcontent"),
	);
	const hasCaptivate = fileNames.some(
		(k) => k.includes("dr/") || k.includes("ar/"),
	);

	if (!manifestKey && !hasStoryline && !hasCaptivate) {
		throw new Error(
			"extractScorm: No SCORM manifest (imsmanifest.xml) or e-learning package structure found",
		);
	}

	onProgress?.(0.3, "PARSE_MANIFEST");

	let courseTitle = "SCORM Course Assets";
	let courseId = "scorm-package";

	if (manifestKey) {
		const manifestBytes = entries[manifestKey];
		if (manifestBytes) {
			const xmlStr = new TextDecoder().decode(manifestBytes);
			const meta = parseManifest(xmlStr);
			courseTitle = meta.title;
			courseId = meta.id;
		}
	}

	onProgress?.(0.5, "COLLECT_MEDIA");

	const zipOutput: Record<string, Uint8Array> = {};
	let videoCount = 0;
	let audioCount = 0;
	let imageCount = 0;
	let docCount = 0;

	// Used to prevent filename collision in flat categorized directories
	const seenNames = new Set<string>();

	for (const path of fileNames) {
		const dotIdx = path.lastIndexOf(".");
		if (dotIdx === -1) continue;
		const ext = path.slice(dotIdx + 1).toLowerCase();

		if (!MEDIA_EXTS.has(ext)) continue;

		const fileData = entries[path];
		if (!fileData || fileData.length === 0) continue;

		// Extract raw filename
		const slashIdx = path.lastIndexOf("/");
		const rawBaseName = slashIdx !== -1 ? path.slice(slashIdx + 1) : path;

		// Disregard tiny UI icons/sprites (< 1.5 KB) that are part of player chrome
		if (
			fileData.length < 1500 &&
			(ext === "png" || ext === "gif" || ext === "svg") &&
			(rawBaseName.startsWith("icon") ||
				rawBaseName.startsWith("btn_") ||
				rawBaseName.startsWith("player_"))
		) {
			continue;
		}

		let categoryDir = "other";
		if (["mp4", "webm", "mov", "m4v"].includes(ext)) {
			categoryDir = "videos";
			videoCount++;
		} else if (["mp3", "wav", "m4a", "ogg", "aac"].includes(ext)) {
			categoryDir = "audio";
			audioCount++;
		} else if (["png", "jpg", "jpeg", "webp", "svg", "gif"].includes(ext)) {
			categoryDir = "images";
			imageCount++;
		} else if (["pdf", "vtt", "srt"].includes(ext)) {
			categoryDir = "documents";
			docCount++;
		}

		let targetName = `${categoryDir}/${rawBaseName}`;
		let counter = 1;
		while (seenNames.has(targetName)) {
			const nameWithoutExt = rawBaseName.slice(0, rawBaseName.lastIndexOf("."));
			targetName = `${categoryDir}/${nameWithoutExt}_${counter++}.${ext}`;
		}
		seenNames.add(targetName);
		zipOutput[targetName] = fileData;
	}

	const totalMedia = videoCount + audioCount + imageCount + docCount;
	if (totalMedia === 0) {
		throw new Error(
			"extractScorm: No media assets (video, audio, images, or documents) discovered in course package",
		);
	}

	// Create human-readable summary
	const summaryMd = [
		`# ${courseTitle}`,
		"",
		`- **Package ID:** \`${courseId}\``,
		`- **Extracted Videos:** ${videoCount}`,
		`- **Extracted Audio Clips:** ${audioCount}`,
		`- **Extracted Artwork & Images:** ${imageCount}`,
		`- **Extracted Documents & Subtitles:** ${docCount}`,
		"",
		"---",
		"Extracted cleanly via convrtr with Zero-Server Guarantee.",
		"",
	].join("\n");

	zipOutput["COURSE_SUMMARY.md"] = new TextEncoder().encode(summaryMd);

	onProgress?.(0.8, "COMPRESS_ZIP");
	const compressed = zipSync(zipOutput);

	onProgress?.(1.0, "DONE");
	return compressed.buffer as ArrayBuffer;
}
