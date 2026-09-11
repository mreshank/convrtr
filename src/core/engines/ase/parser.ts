/**
 * Adobe Swatch Exchange (.ase) binary parser and CSS / Tailwind palette generator.
 * Parses RGB, CMYK, Grayscale, and Lab swatches into clean CSS custom properties and JSON tokens.
 */
import { SITE } from "@/lib/site";

export interface AseColor {
	name: string;
	group?: string;
	model: "RGB" | "CMYK" | "LAB" | "Gray";
	values: number[];
	hex: string;
	r: number;
	g: number;
	b: number;
	type: "Global" | "Spot" | "Normal";
}

export interface AseParseResult {
	colors: AseColor[];
	css: string;
}

/**
 * Converts CMYK (0.0 to 1.0) to sRGB [0..255].
 */
export function cmykToRgb(
	c: number,
	m: number,
	y: number,
	k: number,
): [number, number, number] {
	const r = Math.round(255 * (1 - c) * (1 - k));
	const g = Math.round(255 * (1 - m) * (1 - k));
	const b = Math.round(255 * (1 - y) * (1 - k));
	return [
		Math.max(0, Math.min(255, r)),
		Math.max(0, Math.min(255, g)),
		Math.max(0, Math.min(255, b)),
	];
}

/**
 * Converts CIE L*a*b* to sRGB [0..255].
 */
export function labToRgb(
	l: number,
	a: number,
	b: number,
): [number, number, number] {
	// If L is normalized to 0..1 in some exports, scale to 0..100
	const L = l <= 1.0 ? l * 100 : l;

	const fy = (L + 16) / 116;
	const fx = a / 500 + fy;
	const fz = fy - b / 200;

	const delta = 6 / 29;
	const xr = fx > delta ? fx ** 3 : (fx - 16 / 116) * 3 * delta ** 2;
	const yr = fy > delta ? fy ** 3 : (fy - 16 / 116) * 3 * delta ** 2;
	const zr = fz > delta ? fz ** 3 : (fz - 16 / 116) * 3 * delta ** 2;

	// D65 reference white
	const X = xr * 0.95047;
	const Y = yr * 1.0;
	const Z = zr * 1.08883;

	// XYZ to linear sRGB
	const rLin = X * 3.2404542 + Y * -1.5371385 + Z * -0.4985314;
	const gLin = X * -0.969266 + Y * 1.8760108 + Z * 0.041556;
	const bLin = X * 0.0556434 + Y * -0.2040259 + Z * 1.0572252;

	const gamma = (v: number) => {
		const clamped = Math.max(0, Math.min(1, v));
		return clamped <= 0.0031308
			? clamped * 12.92
			: 1.055 * clamped ** (1 / 2.4) - 0.055;
	};

	const r = Math.round(gamma(rLin) * 255);
	const g = Math.round(gamma(gLin) * 255);
	const bl = Math.round(gamma(bLin) * 255);

	return [
		Math.max(0, Math.min(255, r)),
		Math.max(0, Math.min(255, g)),
		Math.max(0, Math.min(255, bl)),
	];
}

/**
 * Converts R, G, B [0..255] to hex string #RRGGBB.
 */
export function rgbToHex(r: number, g: number, b: number): string {
	const hR = r.toString(16).padStart(2, "0");
	const hG = g.toString(16).padStart(2, "0");
	const hB = b.toString(16).padStart(2, "0");
	return `#${hR}${hG}${hB}`.toLowerCase();
}

/**
 * Normalizes a swatch name into a CSS variable slug.
 */
export function slugifyColorName(name: string, index: number): string {
	let slug = name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	if (!slug || /^[0-9]/.test(slug)) {
		slug = `color-${slug || index + 1}`;
	}
	return slug;
}

/**
 * Parses binary Adobe Swatch Exchange (.ase) file.
 */
export function parseAse(fileBytes: Uint8Array): AseParseResult {
	if (fileBytes.length < 12) {
		throw new Error(
			"Invalid .ase file: File too small to contain a valid ASE header.",
		);
	}

	const sig = String.fromCharCode(
		fileBytes[0] ?? 0,
		fileBytes[1] ?? 0,
		fileBytes[2] ?? 0,
		fileBytes[3] ?? 0,
	);
	if (sig !== "ASEF") {
		throw new Error(
			`Invalid .ase file: Header signature '${sig}' does not match 'ASEF'.`,
		);
	}

	const view = new DataView(
		fileBytes.buffer,
		fileBytes.byteOffset,
		fileBytes.byteLength,
	);
	const majorVersion = view.getUint16(4, false);
	const minorVersion = view.getUint16(6, false);

	if (majorVersion !== 1 || minorVersion !== 0) {
		// Log warning or continue as version 1.0 is standard
	}

	const numBlocks = view.getUint32(8, false);
	const colors: AseColor[] = [];
	let currentGroup: string | undefined;

	let cur = 12;
	for (let b = 0; b < numBlocks && cur + 6 <= fileBytes.length; b++) {
		const blockType = view.getUint16(cur, false);
		const blockLength = view.getUint32(cur + 2, false);
		const blockEnd = cur + 6 + blockLength;
		cur += 6;

		if (blockType === 0xc001) {
			// Group start
			if (cur + 2 <= blockEnd) {
				const nameLen = view.getUint16(cur, false);
				cur += 2;
				let groupName = "";
				for (let i = 0; i < nameLen - 1 && cur + 2 <= blockEnd; i++) {
					groupName += String.fromCharCode(view.getUint16(cur, false));
					cur += 2;
				}
				if (nameLen > 0 && cur + 2 <= blockEnd) {
					cur += 2; // Skip null terminator
				}
				currentGroup = groupName.trim();
			}
			cur = blockEnd;
		} else if (blockType === 0xc002) {
			// Group end
			currentGroup = undefined;
			cur = blockEnd;
		} else if (blockType === 0x0001) {
			// Color entry
			if (cur + 2 <= blockEnd) {
				const nameLen = view.getUint16(cur, false);
				cur += 2;
				let colorName = "";
				for (let i = 0; i < nameLen - 1 && cur + 2 <= blockEnd; i++) {
					colorName += String.fromCharCode(view.getUint16(cur, false));
					cur += 2;
				}
				if (nameLen > 0 && cur + 2 <= blockEnd) {
					cur += 2; // Skip null terminator
				}

				if (cur + 4 <= blockEnd) {
					const model = String.fromCharCode(
						fileBytes[cur] ?? 0,
						fileBytes[cur + 1] ?? 0,
						fileBytes[cur + 2] ?? 0,
						fileBytes[cur + 3] ?? 0,
					).trim();
					cur += 4;

					let r = 0;
					let g = 0;
					let bl = 0;
					const values: number[] = [];

					if (model === "RGB" && cur + 12 <= blockEnd) {
						const red = view.getFloat32(cur, false);
						const grn = view.getFloat32(cur + 4, false);
						const blu = view.getFloat32(cur + 8, false);
						cur += 12;
						values.push(red, grn, blu);
						r = Math.round(Math.max(0, Math.min(1, red)) * 255);
						g = Math.round(Math.max(0, Math.min(1, grn)) * 255);
						bl = Math.round(Math.max(0, Math.min(1, blu)) * 255);
					} else if (model === "CMYK" && cur + 16 <= blockEnd) {
						const c = view.getFloat32(cur, false);
						const m = view.getFloat32(cur + 4, false);
						const y = view.getFloat32(cur + 8, false);
						const k = view.getFloat32(cur + 12, false);
						cur += 16;
						values.push(c, m, y, k);
						[r, g, bl] = cmykToRgb(c, m, y, k);
					} else if (model === "LAB" && cur + 12 <= blockEnd) {
						const l = view.getFloat32(cur, false);
						const a = view.getFloat32(cur + 4, false);
						const bVal = view.getFloat32(cur + 8, false);
						cur += 12;
						values.push(l, a, bVal);
						[r, g, bl] = labToRgb(l, a, bVal);
					} else if (model === "Gray" && cur + 4 <= blockEnd) {
						const gray = view.getFloat32(cur, false);
						cur += 4;
						values.push(gray);
						const val = Math.round(Math.max(0, Math.min(1, gray)) * 255);
						r = val;
						g = val;
						bl = val;
					}

					let colorType: "Global" | "Spot" | "Normal" = "Normal";
					if (cur + 2 <= blockEnd) {
						const typeCode = view.getUint16(cur, false);
						cur += 2;
						if (typeCode === 0) colorType = "Global";
						else if (typeCode === 1) colorType = "Spot";
					}

					const hex = rgbToHex(r, g, bl);
					colors.push({
						name: colorName.trim() || `Color ${colors.length + 1}`,
						group: currentGroup,
						model: model as "RGB" | "CMYK" | "LAB" | "Gray",
						values,
						hex,
						r,
						g,
						b: bl,
						type: colorType,
					});
				}
			}
			cur = blockEnd;
		} else {
			cur = blockEnd;
		}
	}

	// Generate clean CSS and Tailwind configuration comments
	const cssLines: string[] = [
		"/**",
		` * Generated by convrtr (${SITE})`,
		" * Source: Adobe Swatch Exchange (.ase)",
		` * Total Swatches: ${colors.length}`,
		" */",
		"",
		":root {",
	];

	const tailwindMap: Record<string, string> = {};

	for (const [i, c] of colors.entries()) {
		const slug = slugifyColorName(c.name, i);
		cssLines.push(`  --${slug}: ${c.hex}; /* ${c.name} (${c.model}) */`);
		tailwindMap[slug] = c.hex;
	}

	cssLines.push("}", "");
	cssLines.push("/* Tailwind CSS Color Palette Configuration: */");
	cssLines.push("/*");
	cssLines.push("module.exports = {");
	cssLines.push("  theme: {");
	cssLines.push("    extend: {");
	cssLines.push("      colors: {");
	const entries = Object.entries(tailwindMap);
	for (const [i, [k, v]] of entries.entries()) {
		const comma = i < entries.length - 1 ? "," : "";
		cssLines.push(`        "${k}": "${v}"${comma}`);
	}
	cssLines.push("      }");
	cssLines.push("    }");
	cssLines.push("  }");
	cssLines.push("};");
	cssLines.push("*/");
	cssLines.push("");

	return {
		colors,
		css: cssLines.join("\n"),
	};
}

/**
 * Converts an Adobe Swatch Exchange (.ase) file into CSS stylesheet ArrayBuffer.
 */
export function convertAseToCss(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "PARSING_ASE");
	const result = parseAse(new Uint8Array(input));

	onProgress?.(0.7, "GENERATING_CSS");
	const encoder = new TextEncoder();
	const encoded = encoder.encode(result.css);

	onProgress?.(1.0, "DONE");
	return encoded.buffer as ArrayBuffer;
}
