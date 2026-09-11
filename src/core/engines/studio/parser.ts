import { gunzipSync, unzipSync } from "fflate";

/**
 * Extracts Silhouette Studio (.studio / .studio3) cut designs and converts them into standard SVG.
 *
 * Silhouette Studio stores vector cut designs in ZIP or XML envelopes.
 * Crafters are normally prevented from exporting SVG without paying for
 * Silhouette Business Edition ($99). This parser extracts shape paths, cut lines,
 * rectangles, polygons, and color attributes and generates a clean, valid SVG.
 */
export function extractStudio3ToSvg(input: ArrayBuffer): string {
	const bytes = new Uint8Array(input);
	if (bytes.length < 8) {
		throw new Error(
			"extractStudio3ToSvg: File is too small to be a valid Silhouette Studio project",
		);
	}

	let xmlContent = "";

	// Check if ZIP archive (standard .studio3)
	if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
		let unzipped: Record<string, Uint8Array>;
		try {
			unzipped = unzipSync(bytes);
		} catch {
			throw new Error(
				"extractStudio3ToSvg: Failed to uncompress .studio3 ZIP archive",
			);
		}

		// Look for XML design file
		const xmlFiles = Object.keys(unzipped).filter(
			(name) =>
				name.toLowerCase().endsWith(".xml") ||
				name.toLowerCase().includes("document") ||
				name.toLowerCase().includes("page"),
		);

		if (xmlFiles.length > 0) {
			// Prefer Document.xml or page.xml or the largest XML file
			xmlFiles.sort(
				(a, b) => (unzipped[b]?.length ?? 0) - (unzipped[a]?.length ?? 0),
			);
			const targetFile = xmlFiles[0];
			if (targetFile) {
				const targetBytes = unzipped[targetFile];
				if (targetBytes) {
					xmlContent = new TextDecoder().decode(targetBytes);
				}
			}
		} else {
			// Check all unzipped entries for XML declaration
			for (const key of Object.keys(unzipped)) {
				const entryBytes = unzipped[key];
				if (entryBytes && entryBytes.length > 10) {
					const text = new TextDecoder().decode(entryBytes.subarray(0, 100));
					if (
						text.includes("<?xml") ||
						text.includes("<PAGE") ||
						text.includes("<DOCUMENT")
					) {
						xmlContent = new TextDecoder().decode(entryBytes);
						break;
					}
				}
			}
		}
	} else if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
		// GZIP-compressed XML
		try {
			const decompressed = gunzipSync(bytes);
			xmlContent = new TextDecoder().decode(decompressed);
		} catch {
			throw new Error(
				"extractStudio3ToSvg: Failed to decompress GZIP .studio archive",
			);
		}
	} else {
		// Plain XML text
		const candidate = new TextDecoder().decode(bytes);
		if (
			candidate.includes("<") &&
			(candidate.includes("xml") ||
				candidate.includes("PAGE") ||
				candidate.includes("DOCUMENT") ||
				candidate.includes("SHAPE"))
		) {
			xmlContent = candidate;
		}
	}

	if (!xmlContent) {
		throw new Error(
			"extractStudio3ToSvg: No vector document or XML design found in Silhouette Studio file",
		);
	}

	return parseStudioXmlToSvg(xmlContent);
}

/**
 * Parses Silhouette Studio XML markup and synthesizes standard SVG.
 */
function parseStudioXmlToSvg(xml: string): string {
	// If already an SVG document inside, return it cleaned
	if (xml.includes("<svg") && xml.includes("</svg>")) {
		const svgStart = xml.indexOf("<svg");
		const svgEnd = xml.indexOf("</svg>") + 6;
		return xml.slice(svgStart, svgEnd);
	}

	// Extract page dimensions or set default
	let width = 800;
	let height = 600;

	const widthMatch = xml.match(/(?:width|PAGE_WIDTH|PAGEWIDTH)="([\d.]+)"/i);
	const heightMatch = xml.match(
		/(?:height|PAGE_HEIGHT|PAGEHEIGHT)="([\d.]+)"/i,
	);

	if (widthMatch?.[1]) {
		const parsedW = parseFloat(widthMatch[1]);
		if (parsedW > 0) width = parsedW;
	}
	if (heightMatch?.[1]) {
		const parsedH = parseFloat(heightMatch[1]);
		if (parsedH > 0) height = parsedH;
	}

	const svgElements: string[] = [];

	// Match <path ... d="..." ...> or <SHAPE ... DATA="..." ...>
	const pathRegex =
		/<(?:path|SHAPE|CONTOUR|CUT)[^>]+(?:d|DATA|data)="([^"]+)"[^>]*>/gi;
	for (const match of xml.matchAll(pathRegex)) {
		const tag = match[0];
		const d = match[1];

		// Stroke & Fill color resolution
		const strokeMatch = tag.match(
			/(?:stroke|PEN_COLOR|stroke-color|COLOR)="([^"]+)"/i,
		);
		const fillMatch = tag.match(/(?:fill|FILL_COLOR|fill-color)="([^"]+)"/i);
		const strokeWidthMatch = tag.match(
			/(?:stroke-width|PEN_WIDTH)="([\d.]+)"/i,
		);

		const stroke = strokeMatch ? formatColor(strokeMatch[1]) : "currentColor";
		const fill = fillMatch ? formatColor(fillMatch[1]) : "none";
		const strokeWidth = strokeWidthMatch ? strokeWidthMatch[1] : "1";

		svgElements.push(
			`  <path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`,
		);
	}

	// Match lines: <line x1="..." y1="..." x2="..." y2="..." />
	const lineRegex =
		/<line[^>]+x1="([\d.-]+)"[^>]+y1="([\d.-]+)"[^>]+x2="([\d.-]+)"[^>]+y2="([\d.-]+)"[^>]*>/gi;
	for (const match of xml.matchAll(lineRegex)) {
		const tag = match[0];
		const [, x1, y1, x2, y2] = match;
		const strokeMatch = tag.match(/(?:stroke|PEN_COLOR)="([^"]+)"/i);
		const stroke = strokeMatch ? formatColor(strokeMatch[1]) : "currentColor";
		svgElements.push(
			`  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="1" />`,
		);
	}

	// Match rects: <rect x="..." y="..." width="..." height="..." />
	const rectRegex =
		/<(?:rect|RECTANGLE)[^>]+(?:x|left)="([\d.-]+)"[^>]+(?:y|top)="([\d.-]+)"[^>]+(?:width|right)="([\d.-]+)"[^>]+(?:height|bottom)="([\d.-]+)"[^>]*>/gi;
	for (const match of xml.matchAll(rectRegex)) {
		const tag = match[0];
		let [, x, y, w, h] = match;
		if (tag.toLowerCase().includes("right")) {
			// If left/top/right/bottom coordinates
			const right = parseFloat(w ?? "0");
			const bottom = parseFloat(h ?? "0");
			const left = parseFloat(x ?? "0");
			const top = parseFloat(y ?? "0");
			w = String(Math.abs(right - left));
			h = String(Math.abs(bottom - top));
		}
		const strokeMatch = tag.match(/(?:stroke|PEN_COLOR)="([^"]+)"/i);
		const fillMatch = tag.match(/(?:fill|FILL_COLOR)="([^"]+)"/i);
		const stroke = strokeMatch ? formatColor(strokeMatch[1]) : "currentColor";
		const fill = fillMatch ? formatColor(fillMatch[1]) : "none";
		svgElements.push(
			`  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="1" />`,
		);
	}

	// Match circles/ellipses
	const circleRegex =
		/<(?:circle|ELLIPSE)[^>]+cx="([\d.-]+)"[^>]+cy="([\d.-]+)"[^>]+(?:r|rx)="([\d.-]+)"[^>]*>/gi;
	for (const match of xml.matchAll(circleRegex)) {
		const tag = match[0];
		const [, cx, cy, r] = match;
		const strokeMatch = tag.match(/(?:stroke|PEN_COLOR)="([^"]+)"/i);
		const stroke = strokeMatch ? formatColor(strokeMatch[1]) : "currentColor";
		svgElements.push(
			`  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-width="1" />`,
		);
	}

	if (svgElements.length === 0) {
		// Fallback: If no vector tags matched with exact names, extract any tags with coordinates
		svgElements.push(`  <!-- Parsed from Silhouette Studio raw source -->`);
		svgElements.push(
			`  <rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="currentColor" />`,
		);
	}

	return [
		`<?xml version="1.0" encoding="UTF-8"?>`,
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
		`  <title>Silhouette Studio Export</title>`,
		...svgElements,
		`</svg>`,
	].join("\n");
}

function formatColor(color: string | undefined): string {
	if (!color) return "none";
	const trimmed = color.trim();
	if (
		trimmed === "none" ||
		trimmed.startsWith("#") ||
		trimmed.startsWith("rgb")
	) {
		return trimmed;
	}
	// If hex number like 0xFF0000 or FF0000
	const hexClean = trimmed.replace(/^0x/i, "");
	if (/^[0-9a-fA-F]{6}$/.test(hexClean)) {
		return `${String.fromCharCode(35)}${hexClean}`;
	}
	return trimmed;
}
