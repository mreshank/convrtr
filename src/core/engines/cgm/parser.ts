import type {
	CgmConversionOptions,
	CgmConversionResult,
	CgmMetadata,
} from "./types";

function toHexColor(r: number, g: number, b: number): string {
	const c = (n: number) =>
		Math.max(0, Math.min(255, Math.round(n)))
			.toString(16)
			.padStart(2, "0");
	return `#${c(r)}${c(g)}${c(b)}`;
}

interface Point {
	x: number;
	y: number;
}

interface SvgElement {
	tag: string;
	attributes: Record<string, string | number>;
	text?: string;
}

/**
 * Checks if the buffer starts with clear-text CGM directives (ASCII BEGMF or begmf).
 */
function isClearTextCgm(bytes: Uint8Array): boolean {
	const header = new TextDecoder("ascii").decode(
		bytes.slice(0, Math.min(bytes.length, 128)),
	);
	return /^\s*begmf\b/i.test(header) || /begpic/i.test(header);
}

/**
 * Parses Clear-Text CGM commands.
 */
function parseClearTextCgm(
	text: string,
	options: CgmConversionOptions,
): {
	elements: SvgElement[];
	vdcMin: Point;
	vdcMax: Point;
	title: string;
	desc?: string;
} {
	const elements: SvgElement[] = [];
	let vdcMin: Point = { x: 0, y: 0 };
	let vdcMax: Point = { x: 1000, y: 1000 };
	let title = "CGM Vector Graphic";
	let desc: string | undefined;

	let currentStroke = toHexColor(0, 0, 0);
	let currentFill = toHexColor(255, 255, 255);
	let currentLineWidth = 1;
	let currentDashArray = "";

	// Remove comments (between % and % or after //)
	const clean = text.replace(/%[^%]*%/g, " ").replace(/\/\/.*$/gm, " ");

	// Tokenize commands ending with semicolon
	const commands = clean
		.split(";")
		.map((c) => c.trim())
		.filter(Boolean);

	for (const cmd of commands) {
		const match = cmd.match(/^([A-Za-z]+)\s*([\s\S]*)$/);
		if (!match) continue;
		const name = (match[1] ?? "").toUpperCase();
		const args = (match[2] ?? "").trim();

		switch (name) {
			case "BEGMF": {
				const titleMatch = args.match(/['"]([^'"]+)['"]/);
				if (titleMatch?.[1]) title = titleMatch[1];
				break;
			}
			case "MFDESC": {
				const descMatch = args.match(/['"]([^'"]+)['"]/);
				if (descMatch?.[1]) desc = descMatch[1];
				break;
			}
			case "VDCEXT": {
				const coords = extractNumbers(args);
				if (coords.length >= 4) {
					vdcMin = { x: coords[0] ?? 0, y: coords[1] ?? 0 };
					vdcMax = { x: coords[2] ?? 1000, y: coords[3] ?? 1000 };
				}
				break;
			}
			case "LINECOLR":
			case "EDGECOLR": {
				const colors = extractNumbers(args);
				if (colors.length >= 3) {
					currentStroke = toHexColor(
						colors[0] ?? 0,
						colors[1] ?? 0,
						colors[2] ?? 0,
					);
				} else if (colors.length === 1 && (colors[0] ?? 0) === 0) {
					currentStroke = toHexColor(0, 0, 0);
				}
				break;
			}
			case "FILLCOLR": {
				const colors = extractNumbers(args);
				if (colors.length >= 3) {
					currentFill = toHexColor(
						colors[0] ?? 255,
						colors[1] ?? 255,
						colors[2] ?? 255,
					);
				}
				break;
			}
			case "LINEWIDTH":
			case "EDGEWIDTH": {
				const w = extractNumbers(args)[0];
				if (w !== undefined) currentLineWidth = Math.max(0.5, w);
				break;
			}
			case "LINETYPE": {
				const type = extractNumbers(args)[0];
				if (type === 2) currentDashArray = "6,6";
				else if (type === 3) currentDashArray = "2,2";
				else if (type === 4) currentDashArray = "8,3,2,3";
				else currentDashArray = "";
				break;
			}
			case "LINE": {
				const pts = extractNumbers(args);
				if (pts.length >= 4) {
					const pairs: string[] = [];
					for (let i = 0; i < pts.length; i += 2) {
						pairs.push(`${pts[i]},${pts[i + 1]}`);
					}
					elements.push({
						tag: "polyline",
						attributes: {
							points: pairs.join(" "),
							fill: "none",
							stroke: currentStroke,
							"stroke-width": currentLineWidth * (options.scaleLineWidth ?? 1),
							...(currentDashArray
								? { "stroke-dasharray": currentDashArray }
								: {}),
						},
					});
				}
				break;
			}
			case "POLYGON": {
				const pts = extractNumbers(args);
				if (pts.length >= 6) {
					const pairs: string[] = [];
					for (let i = 0; i < pts.length; i += 2) {
						pairs.push(`${pts[i]},${pts[i + 1]}`);
					}
					elements.push({
						tag: "polygon",
						attributes: {
							points: pairs.join(" "),
							fill: currentFill,
							stroke: currentStroke,
							"stroke-width": currentLineWidth * (options.scaleLineWidth ?? 1),
						},
					});
				}
				break;
			}
			case "RECT": {
				const coords = extractNumbers(args);
				if (coords.length >= 4) {
					const x1 = coords[0] ?? 0;
					const y1 = coords[1] ?? 0;
					const x2 = coords[2] ?? 0;
					const y2 = coords[3] ?? 0;
					const x = Math.min(x1, x2);
					const y = Math.min(y1, y2);
					const w = Math.abs(x2 - x1);
					const h = Math.abs(y2 - y1);
					elements.push({
						tag: "rect",
						attributes: {
							x,
							y,
							width: w,
							height: h,
							fill: currentFill,
							stroke: currentStroke,
							"stroke-width": currentLineWidth * (options.scaleLineWidth ?? 1),
						},
					});
				}
				break;
			}
			case "CIRCLE": {
				const nums = extractNumbers(args);
				if (nums.length >= 3) {
					elements.push({
						tag: "circle",
						attributes: {
							cx: nums[0] ?? 0,
							cy: nums[1] ?? 0,
							r: nums[2] ?? 10,
							fill: currentFill,
							stroke: currentStroke,
							"stroke-width": currentLineWidth * (options.scaleLineWidth ?? 1),
						},
					});
				}
				break;
			}
			case "TEXT": {
				const nums = extractNumbers(args);
				const strMatch = args.match(/['"]([^'"]+)['"]/);
				if (nums.length >= 2 && strMatch?.[1]) {
					elements.push({
						tag: "text",
						attributes: {
							x: nums[0] ?? 0,
							y: nums[1] ?? 0,
							fill: currentStroke,
							"font-family": "sans-serif",
							"font-size": 16,
						},
						text: strMatch[1],
					});
				}
				break;
			}
		}
	}

	return { elements, vdcMin, vdcMax, title, desc };
}

function extractNumbers(str: string): number[] {
	const matches = str.match(/-?\d+(?:\.\d+)?/g);
	return matches ? matches.map(Number) : [];
}

/**
 * Parses Binary Encoded CGM files (ISO/IEC 8632-3).
 */
function parseBinaryCgm(
	bytes: Uint8Array,
	options: CgmConversionOptions,
): {
	elements: SvgElement[];
	vdcMin: Point;
	vdcMax: Point;
	title: string;
	desc?: string;
} {
	const elements: SvgElement[] = [];
	let vdcMin: Point = { x: 0, y: 0 };
	let vdcMax: Point = { x: 1000, y: 1000 };
	let title = "CGM Vector Graphic";
	let desc: string | undefined;

	let currentStroke = toHexColor(0, 0, 0);
	let currentFill = toHexColor(255, 255, 255);
	let currentLineWidth = 1;

	let offset = 0;
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	while (offset + 1 < bytes.length) {
		const command = view.getUint16(offset, false);
		offset += 2;

		const elementClass = (command >> 12) & 0x0f;
		const elementId = (command >> 5) & 0x7f;
		let paramLength = command & 0x1f;

		if (paramLength === 31) {
			if (offset + 1 >= bytes.length) break;
			paramLength = view.getUint16(offset, false);
			offset += 2;
		}

		if (offset + paramLength > bytes.length) break;

		const paramBytes = bytes.subarray(offset, offset + paramLength);
		const paramView = new DataView(
			paramBytes.buffer,
			paramBytes.byteOffset,
			paramBytes.byteLength,
		);
		offset += paramLength;
		// Pad to 16-bit word boundary
		if (paramLength % 2 !== 0) {
			offset++;
		}

		// Class 0: Delimiter Elements
		if (elementClass === 0) {
			if (elementId === 1 && paramLength > 0) {
				title =
					new TextDecoder("utf-8")
						.decode(paramBytes)
						.replace(/[\0\r\n]/g, "")
						.trim() || title;
			}
			if (elementId === 2) {
				// ENDMF
				break;
			}
		}

		// Class 1: Metafile Descriptor
		if (elementClass === 1) {
			if (elementId === 2 && paramLength > 0) {
				desc = new TextDecoder("utf-8")
					.decode(paramBytes)
					.replace(/[\0\r\n]/g, "")
					.trim();
			}
		}

		// Class 2: Picture Descriptor
		if (elementClass === 2) {
			if (elementId === 6 && paramLength >= 8) {
				// VDC Extent
				const x1 = paramView.getInt16(0, false);
				const y1 = paramView.getInt16(2, false);
				const x2 = paramView.getInt16(4, false);
				const y2 = paramView.getInt16(6, false);
				vdcMin = { x: Math.min(x1, x2), y: Math.min(y1, y2) };
				vdcMax = { x: Math.max(x1, x2), y: Math.max(y1, y2) };
			}
		}

		// Class 4: Graphical Primitives
		if (elementClass === 4) {
			if (elementId === 1 && paramLength >= 4) {
				// POLYLINE
				const pointCount = Math.floor(paramLength / 4);
				const pts: string[] = [];
				for (let i = 0; i < pointCount; i++) {
					const px = paramView.getInt16(i * 4, false);
					const py = paramView.getInt16(i * 4 + 2, false);
					pts.push(`${px},${py}`);
				}
				elements.push({
					tag: "polyline",
					attributes: {
						points: pts.join(" "),
						fill: "none",
						stroke: currentStroke,
						"stroke-width": currentLineWidth * (options.scaleLineWidth ?? 1),
					},
				});
			} else if (elementId === 7 && paramLength >= 6) {
				// POLYGON
				const pointCount = Math.floor(paramLength / 4);
				const pts: string[] = [];
				for (let i = 0; i < pointCount; i++) {
					const px = paramView.getInt16(i * 4, false);
					const py = paramView.getInt16(i * 4 + 2, false);
					pts.push(`${px},${py}`);
				}
				elements.push({
					tag: "polygon",
					attributes: {
						points: pts.join(" "),
						fill: currentFill,
						stroke: currentStroke,
						"stroke-width": currentLineWidth * (options.scaleLineWidth ?? 1),
					},
				});
			} else if (elementId === 11 && paramLength >= 8) {
				// RECTANGLE
				const x1 = paramView.getInt16(0, false);
				const y1 = paramView.getInt16(2, false);
				const x2 = paramView.getInt16(4, false);
				const y2 = paramView.getInt16(6, false);
				const x = Math.min(x1, x2);
				const y = Math.min(y1, y2);
				const w = Math.abs(x2 - x1);
				const h = Math.abs(y2 - y1);
				elements.push({
					tag: "rect",
					attributes: {
						x,
						y,
						width: w,
						height: h,
						fill: currentFill,
						stroke: currentStroke,
						"stroke-width": currentLineWidth * (options.scaleLineWidth ?? 1),
					},
				});
			} else if (elementId === 12 && paramLength >= 6) {
				// CIRCLE
				const cx = paramView.getInt16(0, false);
				const cy = paramView.getInt16(2, false);
				const r = paramView.getInt16(4, false);
				elements.push({
					tag: "circle",
					attributes: {
						cx,
						cy,
						r,
						fill: currentFill,
						stroke: currentStroke,
						"stroke-width": currentLineWidth * (options.scaleLineWidth ?? 1),
					},
				});
			} else if (elementId === 4 && paramLength >= 6) {
				// TEXT
				const x = paramView.getInt16(0, false);
				const y = paramView.getInt16(2, false);
				const strBytes = paramBytes.subarray(4);
				const str = new TextDecoder("utf-8")
					.decode(strBytes)
					.replace(/[\0\r\n]/g, "")
					.trim();
				if (str) {
					elements.push({
						tag: "text",
						attributes: {
							x,
							y,
							fill: currentStroke,
							"font-family": "sans-serif",
							"font-size": 16,
						},
						text: str,
					});
				}
			}
		}

		// Class 5: Attributes
		if (elementClass === 5) {
			if (elementId === 3 && paramLength >= 2) {
				// LINE WIDTH
				currentLineWidth = Math.max(0.5, paramView.getInt16(0, false));
			} else if (elementId === 4 && paramLength >= 3) {
				// LINE COLOR (Direct RGB)
				currentStroke = toHexColor(
					paramBytes[0] ?? 0,
					paramBytes[1] ?? 0,
					paramBytes[2] ?? 0,
				);
			} else if (elementId === 23 && paramLength >= 3) {
				// FILL COLOR (Direct RGB)
				currentFill = toHexColor(
					paramBytes[0] ?? 255,
					paramBytes[1] ?? 255,
					paramBytes[2] ?? 255,
				);
			}
		}
	}

	return { elements, vdcMin, vdcMax, title, desc };
}

/**
 * Converts Computer Graphics Metafile (CGM) binary or clear-text data into valid, clean SVG markup.
 */
export function convertCgmToSvg(
	input: Uint8Array | ArrayBuffer,
	options: CgmConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): CgmConversionResult {
	onProgress?.(0.1, "READ_INPUT");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < 4) {
		throw new Error(
			"CGM data is too small to be a valid metafile (minimum 4 bytes required)",
		);
	}

	onProgress?.(0.3, "PARSE_CGM");
	const isClearText = isClearTextCgm(bytes);

	const { elements, vdcMin, vdcMax, title, desc } = isClearText
		? parseClearTextCgm(new TextDecoder("utf-8").decode(bytes), options)
		: parseBinaryCgm(bytes, options);

	onProgress?.(0.7, "GENERATE_SVG");

	const width = Math.max(1, vdcMax.x - vdcMin.x);
	const height = Math.max(1, vdcMax.y - vdcMin.y);
	const padding = options.viewBoxPadding ?? 0;

	const viewBoxX = vdcMin.x - padding;
	const viewBoxY = vdcMin.y - padding;
	const viewBoxW = width + padding * 2;
	const viewBoxH = height + padding * 2;

	let svgElements = "";
	const counts = {
		polylines: 0,
		polygons: 0,
		circles: 0,
		rectangles: 0,
		text: 0,
	};

	if (options.backgroundColor) {
		svgElements += `  <rect x="${viewBoxX}" y="${viewBoxY}" width="${viewBoxW}" height="${viewBoxH}" fill="${options.backgroundColor}" />\n`;
	}

	for (const el of elements) {
		if (el.tag === "polyline") counts.polylines++;
		else if (el.tag === "polygon") counts.polygons++;
		else if (el.tag === "circle") counts.circles++;
		else if (el.tag === "rect") counts.rectangles++;
		else if (el.tag === "text") counts.text++;

		const attrs = Object.entries(el.attributes)
			.map(([k, v]) => `${k}="${v}"`)
			.join(" ");

		if (el.text !== undefined) {
			const escaped = el.text
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;");
			svgElements += `  <${el.tag} ${attrs}>${escaped}</${el.tag}>\n`;
		} else {
			svgElements += `  <${el.tag} ${attrs} />\n`;
		}
	}

	const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}" width="${width}" height="${height}">
  <!-- Converted from Computer Graphics Metafile (ISO/IEC 8632) by Convrtr -->
  <title>${title.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</title>
${desc ? `  <desc>${desc.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</desc>\n` : ""}${svgElements}</svg>`;

	const metadata: CgmMetadata = {
		title,
		description: desc,
		width,
		height,
		elementCount: elements.length,
		primitiveCounts: counts,
	};

	onProgress?.(1.0, "COMPLETE");
	return { svg, metadata };
}
