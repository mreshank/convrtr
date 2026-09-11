import { gunzipSync } from "fflate";
import type { SvgzConversionOptions, SvgzConversionResult } from "./types";

/**
 * Checks if the buffer starts with GZIP header magic bytes (0x1F, 0x8B).
 */
export function isGzip(buffer: Uint8Array): boolean {
	return buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
}

/**
 * Decompresses an SVGZ (Gzip-compressed SVG) file into standard SVG.
 */
export function convertSvgzToSvg(
	input: Uint8Array | ArrayBuffer,
	_options: SvgzConversionOptions = {},
): SvgzConversionResult {
	const buffer = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (buffer.length < 4) {
		throw new Error("Invalid SVGZ file: input buffer is too small.");
	}

	let decompressedBytes: Uint8Array;

	if (isGzip(buffer)) {
		try {
			decompressedBytes = gunzipSync(buffer);
		} catch (err) {
			throw new Error(
				`Failed to decompress SVGZ gzip archive: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	} else {
		// Fallback: Check if file is already uncompressed SVG XML
		const peek = new TextDecoder("utf-8").decode(
			buffer.subarray(0, Math.min(buffer.length, 256)),
		);
		if (peek.includes("<svg") || peek.includes("<?xml")) {
			decompressedBytes = buffer;
		} else {
			throw new Error(
				"Invalid SVGZ file: missing GZIP header magic (0x1F, 0x8B) and not recognized as valid SVG XML.",
			);
		}
	}

	const svgText = new TextDecoder("utf-8").decode(decompressedBytes);

	if (!svgText.includes("<svg")) {
		throw new Error(
			"Invalid SVGZ content: decompressed payload does not contain an <svg> element.",
		);
	}

	// Extract basic viewport metadata
	const svgTagMatch = /<svg\b([^>]*)>/i.exec(svgText);
	const attrs = svgTagMatch ? (svgTagMatch[1] ?? "") : "";

	const widthMatch = /\bwidth=["']([^"']+)["']/i.exec(attrs);
	const heightMatch = /\bheight=["']([^"']+)["']/i.exec(attrs);
	const viewBoxMatch = /\bviewBox=["']([^"']+)["']/i.exec(attrs);

	return {
		svgText,
		svgBuffer: decompressedBytes,
		width: widthMatch ? widthMatch[1] : undefined,
		height: heightMatch ? heightMatch[1] : undefined,
		viewBox: viewBoxMatch ? viewBoxMatch[1] : undefined,
	};
}
