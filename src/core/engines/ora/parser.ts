import { unzipSync } from "fflate";
import type {
	OraConversionOptions,
	OraConversionResult,
	OraLayer,
	OraStack,
} from "./types";

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

function isPng(bytes: Uint8Array): boolean {
	if (bytes.length < 8) return false;
	for (let i = 0; i < 8; i++) {
		if (bytes[i] !== PNG_SIGNATURE[i]) return false;
	}
	return true;
}

export function parseStackXml(xmlText: string): OraStack {
	let width = 0;
	let height = 0;

	const imageMatch = xmlText.match(/<image\b([^>]*?)>/i);
	if (imageMatch?.[1]) {
		const attrStr = imageMatch[1];
		const wMatch = attrStr.match(/\bw=["'](\d+)["']/i);
		const hMatch = attrStr.match(/\bh=["'](\d+)["']/i);
		if (wMatch?.[1]) width = parseInt(wMatch[1], 10);
		if (hMatch?.[1]) height = parseInt(hMatch[1], 10);
	}

	const layers: OraLayer[] = [];
	const layerRegex = /<layer\b([^>]*?)(?:\/?>|>([\s\S]*?)<\/layer>)/gi;
	let match = layerRegex.exec(xmlText);

	while (match) {
		const attrs = match[1] ?? "";
		const srcMatch = attrs.match(/\bsrc=["']([^"']+)["']/i);
		const nameMatch = attrs.match(/\bname=["']([^"']+)["']/i);
		const xMatch = attrs.match(/\bx=["'](-?\d+)["']/i);
		const yMatch = attrs.match(/\by=["'](-?\d+)["']/i);
		const opacityMatch = attrs.match(/\bopacity=["']([0-9.]+)["']/i);
		const visMatch = attrs.match(/\bvisibility=["']([^"']+)["']/i);
		const compMatch = attrs.match(/\bcomposite-op=["']([^"']+)["']/i);

		const src = srcMatch?.[1] || "";
		const name = nameMatch?.[1] || `Layer ${layers.length + 1}`;
		const x = xMatch?.[1] ? parseInt(xMatch[1], 10) : 0;
		const y = yMatch?.[1] ? parseInt(yMatch[1], 10) : 0;
		const opacity = opacityMatch?.[1] ? parseFloat(opacityMatch[1]) : 1.0;
		const visibility =
			visMatch?.[1]?.toLowerCase() === "hidden" ? "hidden" : "visible";
		const compositeOp = compMatch?.[1] || "svg:src-over";

		if (src) {
			layers.push({
				src,
				name,
				x,
				y,
				opacity,
				visibility,
				compositeOp,
			});
		}

		match = layerRegex.exec(xmlText);
	}

	return {
		width,
		height,
		layers,
	};
}

export function convertOraToPng(
	input: Uint8Array | ArrayBuffer,
	options: OraConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): OraConversionResult {
	onProgress?.(0.1, "READ_ARCHIVE");

	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < 30) {
		throw new Error(
			"Invalid OpenRaster file: File size is too small to be a valid ZIP container",
		);
	}

	// Verify PKZIP magic bytes (0x50, 0x4B)
	if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
		throw new Error(
			"Invalid OpenRaster file: Missing standard PKZIP header signature",
		);
	}

	onProgress?.(0.3, "UNPACK_CONTAINER");
	let unzipped: Record<string, Uint8Array>;
	try {
		unzipped = unzipSync(bytes);
	} catch (err) {
		throw new Error(
			`Failed to decompress OpenRaster ZIP package: ${err instanceof Error ? err.message : String(err)}`,
		);
	}

	// Normalize unzipped keys (remove leading slashes)
	const files: Record<string, Uint8Array> = {};
	for (const key of Object.keys(unzipped)) {
		const normalized = key.replace(/^\/+/, "");
		const content = unzipped[key];
		if (content) {
			files[normalized] = content;
		}
	}

	onProgress?.(0.6, "PARSING_STACK");
	let stack: OraStack = { width: 0, height: 0, layers: [] };
	const stackFile = files["stack.xml"];
	if (stackFile) {
		try {
			const stackXml = new TextDecoder("utf-8").decode(stackFile);
			stack = parseStackXml(stackXml);
		} catch {
			// fallback if stack.xml cannot be decoded
		}
	}

	// Select best PNG payload
	let targetPng: Uint8Array | undefined;
	let extractedFrom: "mergedimage" | "layer" = "mergedimage";

	const preferMerged = options.preferMergedImage !== false;

	if (preferMerged && files["mergedimage.png"]) {
		targetPng = files["mergedimage.png"];
		extractedFrom = "mergedimage";
	} else if (stack.layers.length > 0) {
		// Find top-most visible layer
		for (let i = stack.layers.length - 1; i >= 0; i--) {
			const layer = stack.layers[i];
			if (layer && layer.visibility === "visible" && files[layer.src]) {
				targetPng = files[layer.src];
				extractedFrom = "layer";
				break;
			}
		}
	}

	// If still not found, check mergedimage.png regardless of preference
	if (!targetPng && files["mergedimage.png"]) {
		targetPng = files["mergedimage.png"];
		extractedFrom = "mergedimage";
	}

	// Fallback to any PNG in data/ directory
	if (!targetPng) {
		const dataPngKey = Object.keys(files).find(
			(k) => k.startsWith("data/") && k.toLowerCase().endsWith(".png"),
		);
		if (dataPngKey && files[dataPngKey]) {
			targetPng = files[dataPngKey];
			extractedFrom = "layer";
		}
	}

	// Fallback to thumbnail
	if (!targetPng && files["Thumbnails/thumbnail.png"]) {
		targetPng = files["Thumbnails/thumbnail.png"];
		extractedFrom = "mergedimage";
	}

	if (!targetPng) {
		throw new Error(
			"OpenRaster package does not contain a renderable PNG image or layer",
		);
	}

	if (!isPng(targetPng)) {
		throw new Error(
			"Extracted OpenRaster image layer is corrupt or not a valid PNG",
		);
	}

	onProgress?.(1.0, "COMPLETE");

	return {
		pngBytes: targetPng,
		stack,
		extractedFrom,
	};
}
