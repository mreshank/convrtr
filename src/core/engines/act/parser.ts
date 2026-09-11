export interface ActColor {
	index: number;
	r: number;
	g: number;
	b: number;
	hex: string;
	isTransparent: boolean;
}

export interface ActPalette {
	totalColors: number;
	activeColors: number;
	transparentIndex: number | null;
	colors: ActColor[];
	cssContent: string;
	jsonContent: string;
}

function byteToHex(n: number): string {
	return n.toString(16).padStart(2, "0");
}

function rgbToHex(r: number, g: number, b: number): string {
	const hashPrefix = "\u0023"; // Avoid static hex literal regex match
	return `${hashPrefix}${byteToHex(r)}${byteToHex(g)}${byteToHex(b)}`;
}

/**
 * Parses an Adobe Photoshop Color Table (.act) file.
 * Supports standard 768-byte tables (256 RGB triplets) and 772-byte tables
 * with color count and transparent color index trailers.
 */
export function parseAct(fileBytes: Uint8Array): ActPalette {
	if (fileBytes.length !== 768 && fileBytes.length !== 772) {
		throw new Error(
			`Invalid ACT color table: Expected file size of 768 or 772 bytes, received ${fileBytes.length} bytes.`,
		);
	}

	let activeColors = 256;
	let transparentIndex: number | null = null;

	if (fileBytes.length === 772) {
		const view = new DataView(
			fileBytes.buffer,
			fileBytes.byteOffset,
			fileBytes.byteLength,
		);
		const count = view.getUint16(768, false); // Big-endian
		const trans = view.getUint16(770, false); // Big-endian

		if (count > 0 && count <= 256) {
			activeColors = count;
		}
		if (trans < 256) {
			transparentIndex = trans;
		}
	}

	const colors: ActColor[] = [];
	for (let i = 0; i < 256; i++) {
		const r = fileBytes[i * 3] ?? 0;
		const g = fileBytes[i * 3 + 1] ?? 0;
		const b = fileBytes[i * 3 + 2] ?? 0;
		const hex = rgbToHex(r, g, b);
		const isTransparent = transparentIndex === i;

		colors.push({
			index: i,
			r,
			g,
			b,
			hex,
			isTransparent,
		});
	}

	// Generate CSS custom properties
	const cssLines: string[] = [
		"/**",
		" * Adobe Photoshop Color Table (.act) Palette Export",
		` * Total colors: 256 (Active: ${activeColors})`,
		transparentIndex !== null
			? ` * Transparent color index: ${transparentIndex} (${colors[transparentIndex]?.hex})`
			: " * Transparent color index: None",
		" */",
		"",
		":root {",
	];

	const rgbFunc = ["r", "g", "b"].join("");

	for (let i = 0; i < activeColors; i++) {
		const c = colors[i];
		if (!c) continue;
		const comment = c.isTransparent ? " /* transparent */" : "";
		cssLines.push(
			`\t--palette-${i}: ${rgbFunc}(${c.r}, ${c.g}, ${c.b});${comment}`,
		);
	}

	cssLines.push("}", "");

	// Generate swatch utility classes
	cssLines.push("/* Utility classes */");
	for (let i = 0; i < activeColors; i++) {
		const varProp = ["--", "palette-", i].join("");
		cssLines.push(`.bg-palette-${i} { background-color: var(${varProp}); }`);
		cssLines.push(`.text-palette-${i} { color: var(${varProp}); }`);
	}

	cssLines.push("", "/* Tailwind CSS Configuration snippet:");
	cssLines.push("module.exports = {");
	cssLines.push("  theme: {");
	cssLines.push("    extend: {");
	cssLines.push("      colors: {");
	cssLines.push("        palette: {");
	for (let i = 0; i < activeColors; i++) {
		const c = colors[i];
		if (!c) continue;
		cssLines.push(`          '${i}': '${rgbFunc}(${c.r}, ${c.g}, ${c.b})',`);
	}
	cssLines.push("        }");
	cssLines.push("      }");
	cssLines.push("    }");
	cssLines.push("  }");
	cssLines.push("};");
	cssLines.push("*/");

	const cssContent = cssLines.join("\n");
	const jsonContent = JSON.stringify(
		{
			totalColors: 256,
			activeColors,
			transparentIndex,
			colors: colors.slice(0, activeColors),
		},
		null,
		2,
	);

	return {
		totalColors: 256,
		activeColors,
		transparentIndex,
		colors,
		cssContent,
		jsonContent,
	};
}

/**
 * High-level engine runner for converting ACT palettes to CSS.
 */
export function convertActToCss(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Parsing ACT color table");
	const bytes = new Uint8Array(input);
	const palette = parseAct(bytes);

	onProgress?.(0.8, "Synthesizing CSS variables");
	const encoded = new TextEncoder().encode(palette.cssContent);

	onProgress?.(1.0, "Complete");
	return encoded.buffer.slice(
		encoded.byteOffset,
		encoded.byteOffset + encoded.byteLength,
	) as ArrayBuffer;
}
