export interface WmfBounds {
	left: number;
	top: number;
	right: number;
	bottom: number;
	width: number;
	height: number;
}

export interface WmfDocument {
	bounds: WmfBounds;
	elementCount: number;
	svg: string;
}

function escapeXml(unsafe: string): string {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

// GDI 16-bit Record Function Codes
const META_EOF = 0x0000;
const META_SETWINDOWORG = 0x020b;
const META_SETWINDOWEXT = 0x020c;
const META_LINETO = 0x0213;
const META_MOVETO = 0x0214;
const META_POLYLINE = 0x0325;
const META_POLYGON = 0x0324;
const META_POLYPOLYGON = 0x0538;
const META_RECTANGLE = 0x041b;
const META_ELLIPSE = 0x0418;
const META_ROUNDRECT = 0x061c;
const META_ARC = 0x0817;
const META_CHORD = 0x0830;
const META_PIE = 0x081a;
const META_TEXTOUT = 0x0521;

/**
 * Parses a Windows Metafile (.wmf) binary buffer and renders clean SVG vector paths.
 */
export function parseWmf(buffer: Uint8Array): WmfDocument {
	if (buffer.length < 18) {
		throw new Error(
			"Invalid WMF file: Buffer size is smaller than the 18-byte WMF header.",
		);
	}

	const view = new DataView(
		buffer.buffer,
		buffer.byteOffset,
		buffer.byteLength,
	);

	let headerOffset = 0;
	let placeableBounds: {
		left: number;
		top: number;
		right: number;
		bottom: number;
	} | null = null;

	// Check for Aldus Placeable Header (0x9AC6CDD7 in little endian)
	const apmKey = view.getUint32(0, true);
	if (apmKey === 0x9ac6cdd7) {
		if (buffer.length < 22 + 18) {
			throw new Error("Invalid WMF file: Truncated placeable metafile header.");
		}
		const left = view.getInt16(6, true);
		const top = view.getInt16(8, true);
		const right = view.getInt16(10, true);
		const bottom = view.getInt16(12, true);
		placeableBounds = { left, top, right, bottom };
		headerOffset = 22;
	}

	// Read standard WMF header
	const fileType = view.getUint16(headerOffset, true);
	const headerSizeWords = view.getUint16(headerOffset + 2, true);
	if (fileType !== 1 && fileType !== 2 && fileType !== 0) {
		// Tolerant check for common variations
	}

	const recordsStart = headerOffset + headerSizeWords * 2;
	if (recordsStart > buffer.length) {
		throw new Error("Invalid WMF file: Record stream starts beyond buffer.");
	}

	let windowOrg = { x: 0, y: 0 };
	let windowExt = { width: 0, height: 0 };
	let currentPoint = { x: 0, y: 0 };

	const svgElements: string[] = [];
	let elementCount = 0;

	let trackedMinX = Number.POSITIVE_INFINITY;
	let trackedMinY = Number.POSITIVE_INFINITY;
	let trackedMaxX = Number.NEGATIVE_INFINITY;
	let trackedMaxY = Number.NEGATIVE_INFINITY;

	const trackPoint = (x: number, y: number) => {
		trackedMinX = Math.min(trackedMinX, x);
		trackedMinY = Math.min(trackedMinY, y);
		trackedMaxX = Math.max(trackedMaxX, x);
		trackedMaxY = Math.max(trackedMaxY, y);
	};

	let offset = recordsStart;
	const maxOffset = buffer.length;

	while (offset + 6 <= maxOffset) {
		const recordSizeWords = view.getUint32(offset, true);
		const func = view.getUint16(offset + 4, true);

		if (recordSizeWords < 3) {
			break;
		}

		const recordSizeBytes = recordSizeWords * 2;
		if (offset + recordSizeBytes > maxOffset) {
			break;
		}

		if (func === META_EOF) {
			break;
		}

		const paramOffset = offset + 6;

		switch (func) {
			case META_SETWINDOWORG: {
				const y = view.getInt16(paramOffset, true);
				const x = view.getInt16(paramOffset + 2, true);
				windowOrg = { x, y };
				break;
			}

			case META_SETWINDOWEXT: {
				const cy = view.getInt16(paramOffset, true);
				const cx = view.getInt16(paramOffset + 2, true);
				windowExt = { width: cx, height: cy };
				break;
			}

			case META_MOVETO: {
				const y = view.getInt16(paramOffset, true);
				const x = view.getInt16(paramOffset + 2, true);
				currentPoint = { x, y };
				trackPoint(x, y);
				break;
			}

			case META_LINETO: {
				const y = view.getInt16(paramOffset, true);
				const x = view.getInt16(paramOffset + 2, true);
				trackPoint(x, y);
				trackPoint(currentPoint.x, currentPoint.y);

				svgElements.push(
					`  <line x1="${currentPoint.x}" y1="${currentPoint.y}" x2="${x}" y2="${y}" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke" />`,
				);
				currentPoint = { x, y };
				elementCount++;
				break;
			}

			case META_POLYLINE: {
				const count = view.getInt16(paramOffset, true);
				if (
					count > 0 &&
					paramOffset + 2 + count * 4 <= offset + recordSizeBytes
				) {
					const points: string[] = [];
					for (let p = 0; p < count; p++) {
						const px = view.getInt16(paramOffset + 2 + p * 4, true);
						const py = view.getInt16(paramOffset + 4 + p * 4, true);
						trackPoint(px, py);
						points.push(`${px},${py}`);
					}
					svgElements.push(
						`  <polyline points="${points.join(" ")}" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke" />`,
					);
					elementCount++;
				}
				break;
			}

			case META_POLYGON: {
				const count = view.getInt16(paramOffset, true);
				if (
					count > 0 &&
					paramOffset + 2 + count * 4 <= offset + recordSizeBytes
				) {
					const points: string[] = [];
					for (let p = 0; p < count; p++) {
						const px = view.getInt16(paramOffset + 2 + p * 4, true);
						const py = view.getInt16(paramOffset + 4 + p * 4, true);
						trackPoint(px, py);
						points.push(`${px},${py}`);
					}
					svgElements.push(
						`  <polygon points="${points.join(" ")}" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke" />`,
					);
					elementCount++;
				}
				break;
			}

			case META_POLYPOLYGON: {
				const polyCount = view.getInt16(paramOffset, true);
				let ptCountsOffset = paramOffset + 2;
				let pointsOffset = ptCountsOffset + polyCount * 2;

				for (let i = 0; i < polyCount; i++) {
					if (ptCountsOffset + 2 > pointsOffset) break;
					const ptCount = view.getInt16(ptCountsOffset, true);
					ptCountsOffset += 2;

					if (
						ptCount > 0 &&
						pointsOffset + ptCount * 4 <= offset + recordSizeBytes
					) {
						const points: string[] = [];
						for (let p = 0; p < ptCount; p++) {
							const px = view.getInt16(pointsOffset, true);
							const py = view.getInt16(pointsOffset + 2, true);
							pointsOffset += 4;
							trackPoint(px, py);
							points.push(`${px},${py}`);
						}
						svgElements.push(
							`  <polygon points="${points.join(" ")}" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke" />`,
						);
						elementCount++;
					}
				}
				break;
			}

			case META_RECTANGLE: {
				const bottom = view.getInt16(paramOffset, true);
				const right = view.getInt16(paramOffset + 2, true);
				const top = view.getInt16(paramOffset + 4, true);
				const left = view.getInt16(paramOffset + 6, true);

				const x = Math.min(left, right);
				const y = Math.min(top, bottom);
				const w = Math.abs(right - left);
				const h = Math.abs(bottom - top);

				trackPoint(left, top);
				trackPoint(right, bottom);

				svgElements.push(
					`  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke" />`,
				);
				elementCount++;
				break;
			}

			case META_ELLIPSE: {
				const bottom = view.getInt16(paramOffset, true);
				const right = view.getInt16(paramOffset + 2, true);
				const top = view.getInt16(paramOffset + 4, true);
				const left = view.getInt16(paramOffset + 6, true);

				const cx = (left + right) / 2;
				const cy = (top + bottom) / 2;
				const rx = Math.abs(right - left) / 2;
				const ry = Math.abs(bottom - top) / 2;

				trackPoint(left, top);
				trackPoint(right, bottom);

				svgElements.push(
					`  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke" />`,
				);
				elementCount++;
				break;
			}

			case META_ROUNDRECT: {
				const ellipseHeight = view.getInt16(paramOffset, true);
				const ellipseWidth = view.getInt16(paramOffset + 2, true);
				const bottom = view.getInt16(paramOffset + 4, true);
				const right = view.getInt16(paramOffset + 6, true);
				const top = view.getInt16(paramOffset + 8, true);
				const left = view.getInt16(paramOffset + 10, true);

				const x = Math.min(left, right);
				const y = Math.min(top, bottom);
				const w = Math.abs(right - left);
				const h = Math.abs(bottom - top);
				const rx = Math.abs(ellipseWidth) / 2;
				const ry = Math.abs(ellipseHeight) / 2;

				trackPoint(left, top);
				trackPoint(right, bottom);

				svgElements.push(
					`  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ry="${ry}" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke" />`,
				);
				elementCount++;
				break;
			}

			case META_ARC:
			case META_CHORD:
			case META_PIE: {
				const yEnd = view.getInt16(paramOffset, true);
				const xEnd = view.getInt16(paramOffset + 2, true);
				const yStart = view.getInt16(paramOffset + 4, true);
				const xStart = view.getInt16(paramOffset + 6, true);
				const bottom = view.getInt16(paramOffset + 8, true);
				const right = view.getInt16(paramOffset + 10, true);
				const top = view.getInt16(paramOffset + 12, true);
				const left = view.getInt16(paramOffset + 14, true);

				trackPoint(left, top);
				trackPoint(right, bottom);

				const rx = Math.abs(right - left) / 2;
				const ry = Math.abs(bottom - top) / 2;

				svgElements.push(
					`  <path d="M ${xStart} ${yStart} A ${rx} ${ry} 0 0 1 ${xEnd} ${yEnd}" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke" />`,
				);
				elementCount++;
				break;
			}

			case META_TEXTOUT: {
				const stringLen = view.getInt16(paramOffset, true);
				if (stringLen > 0) {
					const textBytes = buffer.subarray(
						paramOffset + 2,
						paramOffset + 2 + stringLen,
					);
					const text = new TextDecoder("latin1").decode(textBytes);
					const alignedOffset =
						paramOffset + 2 + stringLen + (stringLen % 2 === 1 ? 1 : 0);
					if (alignedOffset + 4 <= offset + recordSizeBytes) {
						const y = view.getInt16(alignedOffset, true);
						const x = view.getInt16(alignedOffset + 2, true);
						trackPoint(x, y);
						svgElements.push(
							`  <text x="${x}" y="${y}" font-family="sans-serif" font-size="12" fill="currentColor">${escapeXml(text)}</text>`,
						);
						elementCount++;
					}
				}
				break;
			}

			default:
				// Ignored GDI record (palettes, pens, brushes, mapping modes)
				break;
		}

		offset += recordSizeBytes;
	}

	// Compute final viewBox
	let finalMinX = 0;
	let finalMinY = 0;
	let finalWidth = 100;
	let finalHeight = 100;

	if (placeableBounds) {
		finalMinX = Math.min(placeableBounds.left, placeableBounds.right);
		finalMinY = Math.min(placeableBounds.top, placeableBounds.bottom);
		finalWidth = Math.abs(placeableBounds.right - placeableBounds.left) || 100;
		finalHeight = Math.abs(placeableBounds.bottom - placeableBounds.top) || 100;
	} else if (windowExt.width !== 0 && windowExt.height !== 0) {
		finalMinX = windowOrg.x;
		finalMinY = windowOrg.y;
		finalWidth = Math.abs(windowExt.width);
		finalHeight = Math.abs(windowExt.height);
	} else if (
		Number.isFinite(trackedMinX) &&
		Number.isFinite(trackedMinY) &&
		Number.isFinite(trackedMaxX) &&
		Number.isFinite(trackedMaxY)
	) {
		const rawW = trackedMaxX - trackedMinX || 100;
		const rawH = trackedMaxY - trackedMinY || 100;
		const pad = Math.max(Math.max(rawW, rawH) * 0.05, 5);
		finalMinX = trackedMinX - pad;
		finalMinY = trackedMinY - pad;
		finalWidth = rawW + pad * 2;
		finalHeight = rawH + pad * 2;
	}

	const svgString = [
		`<?xml version="1.0" encoding="UTF-8"?>`,
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${finalMinX} ${finalMinY} ${finalWidth} ${finalHeight}" width="100%" height="100%">`,
		...svgElements,
		`</svg>`,
	].join("\n");

	return {
		bounds: {
			left: finalMinX,
			top: finalMinY,
			right: finalMinX + finalWidth,
			bottom: finalMinY + finalHeight,
			width: finalWidth,
			height: finalHeight,
		},
		elementCount,
		svg: svgString,
	};
}

/**
 * Converts a WMF buffer into an SVG ArrayBuffer.
 */
export function convertWmfToSvg(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Reading Windows Metafile binary stream");
	const uint8 = new Uint8Array(input);

	onProgress?.(0.5, "Parsing 16-bit GDI graphics records");
	const doc = parseWmf(uint8);

	onProgress?.(0.9, "Serializing clean SVG document");
	const encoded = new TextEncoder().encode(doc.svg);

	return encoded.buffer.slice(
		encoded.byteOffset,
		encoded.byteOffset + encoded.byteLength,
	) as ArrayBuffer;
}
