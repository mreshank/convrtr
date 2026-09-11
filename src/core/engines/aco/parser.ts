import { SITE } from "@/lib/site";
import type { AcoColor, AcoParseResult, AcoToCssOptions } from "./types";

function rgbToHex(r: number, g: number, b: number): string {
	const toHex = (n: number) =>
		Math.max(0, Math.min(255, Math.round(n)))
			.toString(16)
			.padStart(2, "0");
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
	const rn = r / 255;
	const gn = g / 255;
	const bn = b / 255;

	const max = Math.max(rn, gn, bn);
	const min = Math.min(rn, gn, bn);
	const delta = max - min;

	let h = 0;
	let s = 0;
	const l = (max + min) / 2;

	if (delta !== 0) {
		s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

		if (max === rn) {
			h = (gn - bn) / delta + (gn < bn ? 6 : 0);
		} else if (max === gn) {
			h = (bn - rn) / delta + 2;
		} else {
			h = (rn - gn) / delta + 4;
		}
		h /= 6;
	}

	return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hsbToRgb(
	hNorm: number,
	sNorm: number,
	bNorm: number,
): [number, number, number] {
	const h = hNorm * 360;
	const s = sNorm;
	const v = bNorm;

	const c = v * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = v - c;

	let r1 = 0;
	let g1 = 0;
	let b1 = 0;

	if (h >= 0 && h < 60) {
		r1 = c;
		g1 = x;
	} else if (h >= 60 && h < 120) {
		r1 = x;
		g1 = c;
	} else if (h >= 120 && h < 180) {
		g1 = c;
		b1 = x;
	} else if (h >= 180 && h < 240) {
		g1 = x;
		b1 = c;
	} else if (h >= 240 && h < 300) {
		r1 = x;
		b1 = c;
	} else {
		r1 = c;
		b1 = x;
	}

	return [
		Math.round((r1 + m) * 255),
		Math.round((g1 + m) * 255),
		Math.round((b1 + m) * 255),
	];
}

function cmykToRgb(
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

function labToRgb(
	lStar: number,
	aStar: number,
	bStar: number,
): [number, number, number] {
	const fy = (lStar + 16) / 116;
	const fx = aStar / 500 + fy;
	const fz = fy - bStar / 200;

	const epsilon = 216 / 24389;
	const kappa = 24389 / 27;

	const xr = fx ** 3 > epsilon ? fx ** 3 : (116 * fx - 16) / kappa;
	const yr =
		lStar > kappa * epsilon ? ((lStar + 16) / 116) ** 3 : lStar / kappa;
	const zr = fz ** 3 > epsilon ? fz ** 3 : (116 * fz - 16) / kappa;

	// D65 reference white
	const x = xr * 95.047;
	const y = yr * 100.0;
	const z = zr * 108.883;

	// sRGB matrix transformation
	const rLin = (x * 3.2406 + y * -1.5372 + z * -0.4986) / 100;
	const gLin = (x * -0.9689 + y * 1.8758 + z * 0.0415) / 100;
	const bLin = (x * 0.0557 + y * -0.204 + z * 1.057) / 100;

	const gamma = (c: number) =>
		c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;

	return [
		Math.max(0, Math.min(255, Math.round(gamma(rLin) * 255))),
		Math.max(0, Math.min(255, Math.round(gamma(gLin) * 255))),
		Math.max(0, Math.min(255, Math.round(gamma(bLin) * 255))),
	];
}

function slugify(text: string): string {
	return (
		text
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "") || "color"
	);
}

/**
 * Parses Adobe Photoshop Color Swatches (.aco) binary files (Version 1 and Version 2).
 */
export function parseAco(
	input: Uint8Array | ArrayBuffer,
	options: AcoToCssOptions = {},
): AcoParseResult {
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < 4) {
		throw new Error(
			`Invalid Adobe Color (.aco) file: File size (${bytes.length} bytes) is too small.`,
		);
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const initialVersion = view.getUint16(0);

	if (initialVersion !== 1 && initialVersion !== 2) {
		throw new Error(
			`Invalid Adobe Color (.aco) file: Unsupported version ${initialVersion}. Expected 1 or 2.`,
		);
	}

	let parseVersion = initialVersion;
	let startOffset = 0;

	// Check if a Version 2 block exists after Version 1 records
	if (initialVersion === 1) {
		const v1Count = view.getUint16(2);
		const v2Offset = 4 + v1Count * 10;
		if (v2Offset + 4 <= bytes.length) {
			const v2Version = view.getUint16(v2Offset);
			if (v2Version === 2) {
				parseVersion = 2;
				startOffset = v2Offset;
			}
		}
	}

	const colors: AcoColor[] = [];
	const count = view.getUint16(startOffset + 2);
	let currentOffset = startOffset + 4;

	for (let i = 0; i < count; i++) {
		if (currentOffset + 10 > bytes.length) break;

		const colorSpace = view.getUint16(currentOffset);
		const w = view.getUint16(currentOffset + 2);
		const x = view.getUint16(currentOffset + 4);
		const y = view.getUint16(currentOffset + 6);
		const z = view.getUint16(currentOffset + 8);
		currentOffset += 10;

		let name = `Color ${i + 1}`;

		if (parseVersion === 2 && currentOffset + 6 <= bytes.length) {
			// Skip reserved 2 bytes (0x0000)
			currentOffset += 2;
			const nameLen = view.getUint32(currentOffset);
			currentOffset += 4;

			if (nameLen > 0 && currentOffset + nameLen * 2 <= bytes.length) {
				const chars: string[] = [];
				for (let c = 0; c < nameLen; c++) {
					const code = view.getUint16(currentOffset + c * 2);
					if (code !== 0) chars.push(String.fromCharCode(code));
				}
				currentOffset += nameLen * 2;
				const decodedName = chars.join("").trim();
				if (decodedName) name = decodedName;
			}
		}

		let rgb: [number, number, number] = [0, 0, 0];
		let spaceName = "RGB";

		switch (colorSpace) {
			case 0: // RGB
				rgb = [Math.round(w / 257), Math.round(x / 257), Math.round(y / 257)];
				spaceName = "RGB";
				break;
			case 1: // HSB
				rgb = hsbToRgb(w / 65535, x / 65535, y / 65535);
				spaceName = "HSB";
				break;
			case 2: // CMYK
				rgb = cmykToRgb(
					1 - w / 65535,
					1 - x / 65535,
					1 - y / 65535,
					1 - z / 65535,
				);
				spaceName = "CMYK";
				break;
			case 7: // Lab
				rgb = labToRgb(
					w / 100,
					(x > 32767 ? x - 65536 : x) / 100,
					(y > 32767 ? y - 65536 : y) / 100,
				);
				spaceName = "Lab";
				break;
			case 8: // Grayscale
				{
					const val = Math.round((w / 10000) * 255);
					rgb = [val, val, val];
					spaceName = "Grayscale";
				}
				break;
			default:
				rgb = [Math.round(w / 257), Math.round(x / 257), Math.round(y / 257)];
				spaceName = `Space(${colorSpace})`;
				break;
		}

		const hex = rgbToHex(...rgb);
		const hsl = rgbToHsl(...rgb);
		const slug = slugify(name);

		colors.push({
			name,
			slug,
			hex,
			rgb,
			hsl,
			space: spaceName,
		});
	}

	const format = options.format ?? "css";
	let cssText = "";

	if (format === "tailwind") {
		const colorEntries = colors
			.map((c) => `      "${c.slug}": "${c.hex}",`)
			.join("\n");
		cssText = [
			"/**",
			` * Generated by convrtr (${SITE})`,
			" * Source: Adobe Photoshop Color Swatches (.aco)",
			` * Total Swatches: ${colors.length}`,
			" */",
			"module.exports = {",
			"  theme: {",
			"    extend: {",
			"      colors: {",
			colorEntries,
			"      },",
			"    },",
			"  },",
			"};",
		].join("\n");
	} else if (format === "json") {
		cssText = JSON.stringify(colors, null, 2);
	} else {
		// CSS Custom Properties
		const cssVars = colors
			.map((c) => `  --${c.slug}: ${c.hex}; /* ${c.name} (${c.space}) */`)
			.join("\n");
		cssText = [
			"/**",
			` * Generated by convrtr (${SITE})`,
			" * Source: Adobe Photoshop Color Swatches (.aco)",
			` * Total Swatches: ${colors.length}`,
			" */",
			":root {",
			cssVars,
			"}",
		].join("\n");
	}

	return {
		colors,
		cssText,
		version: parseVersion,
	};
}
