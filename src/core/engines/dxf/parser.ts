export interface DxfPoint {
	x: number;
	y: number;
}

export interface DxfLine {
	type: "LINE";
	start: DxfPoint;
	end: DxfPoint;
}

export interface DxfCircle {
	type: "CIRCLE";
	center: DxfPoint;
	radius: number;
}

export interface DxfArc {
	type: "ARC";
	center: DxfPoint;
	radius: number;
	startAngle: number; // degrees
	endAngle: number; // degrees
}

export interface DxfPolyline {
	type: "POLYLINE";
	vertices: DxfPoint[];
	closed: boolean;
}

export interface DxfText {
	type: "TEXT";
	position: DxfPoint;
	text: string;
	height: number;
}

export type DxfEntity = DxfLine | DxfCircle | DxfArc | DxfPolyline | DxfText;

export interface DxfDocument {
	entities: DxfEntity[];
	bounds: {
		minX: number;
		minY: number;
		maxX: number;
		maxY: number;
		width: number;
		height: number;
	};
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

/**
 * Parses ASCII AutoCAD DXF line pairs into structured entity tokens.
 */
export function parseDxf(dxfContent: string): DxfDocument {
	const lines = dxfContent.split(/\r?\n/);
	const entities: DxfEntity[] = [];

	let inEntitiesSection = false;
	let currentEntityType = "";
	let currentEntityData: Record<number, string[]> = {};

	const commitCurrentEntity = () => {
		if (!currentEntityType) return;

		if (currentEntityType === "LINE") {
			const x1 = Number.parseFloat(currentEntityData[10]?.[0] ?? "0");
			const y1 = Number.parseFloat(currentEntityData[20]?.[0] ?? "0");
			const x2 = Number.parseFloat(currentEntityData[11]?.[0] ?? "0");
			const y2 = Number.parseFloat(currentEntityData[21]?.[0] ?? "0");
			if (
				!Number.isNaN(x1) &&
				!Number.isNaN(y1) &&
				!Number.isNaN(x2) &&
				!Number.isNaN(y2)
			) {
				entities.push({
					type: "LINE",
					start: { x: x1, y: y1 },
					end: { x: x2, y: y2 },
				});
			}
		} else if (currentEntityType === "CIRCLE") {
			const cx = Number.parseFloat(currentEntityData[10]?.[0] ?? "0");
			const cy = Number.parseFloat(currentEntityData[20]?.[0] ?? "0");
			const r = Number.parseFloat(currentEntityData[40]?.[0] ?? "0");
			if (!Number.isNaN(cx) && !Number.isNaN(cy) && !Number.isNaN(r) && r > 0) {
				entities.push({
					type: "CIRCLE",
					center: { x: cx, y: cy },
					radius: r,
				});
			}
		} else if (currentEntityType === "ARC") {
			const cx = Number.parseFloat(currentEntityData[10]?.[0] ?? "0");
			const cy = Number.parseFloat(currentEntityData[20]?.[0] ?? "0");
			const r = Number.parseFloat(currentEntityData[40]?.[0] ?? "0");
			const startAngle = Number.parseFloat(currentEntityData[50]?.[0] ?? "0");
			const endAngle = Number.parseFloat(currentEntityData[51]?.[0] ?? "0");
			if (!Number.isNaN(cx) && !Number.isNaN(cy) && !Number.isNaN(r) && r > 0) {
				entities.push({
					type: "ARC",
					center: { x: cx, y: cy },
					radius: r,
					startAngle,
					endAngle,
				});
			}
		} else if (currentEntityType === "LWPOLYLINE") {
			const xs = currentEntityData[10] ?? [];
			const ys = currentEntityData[20] ?? [];
			const flags = Number.parseInt(currentEntityData[70]?.[0] ?? "0", 10);
			const closed = (flags & 1) === 1;

			const vertices: DxfPoint[] = [];
			const count = Math.min(xs.length, ys.length);
			for (let i = 0; i < count; i++) {
				const vx = Number.parseFloat(xs[i] ?? "0");
				const vy = Number.parseFloat(ys[i] ?? "0");
				if (!Number.isNaN(vx) && !Number.isNaN(vy)) {
					vertices.push({ x: vx, y: vy });
				}
			}

			if (vertices.length > 0) {
				entities.push({
					type: "POLYLINE",
					vertices,
					closed,
				});
			}
		} else if (currentEntityType === "TEXT" || currentEntityType === "MTEXT") {
			const x = Number.parseFloat(currentEntityData[10]?.[0] ?? "0");
			const y = Number.parseFloat(currentEntityData[20]?.[0] ?? "0");
			const text = currentEntityData[1]?.[0] ?? "";
			const height = Number.parseFloat(currentEntityData[40]?.[0] ?? "10");
			if (!Number.isNaN(x) && !Number.isNaN(y) && text) {
				entities.push({
					type: "TEXT",
					position: { x, y },
					text,
					height: Number.isNaN(height) || height <= 0 ? 10 : height,
				});
			}
		}

		currentEntityType = "";
		currentEntityData = {};
	};

	let i = 0;
	while (i < lines.length) {
		while (i < lines.length && (lines[i]?.trim() ?? "") === "") {
			i++;
		}
		if (i >= lines.length) break;

		const codeLine = lines[i]?.trim() ?? "";
		const valLine = lines[i + 1]?.trim() ?? "";
		i += 2;

		const code = Number.parseInt(codeLine, 10);
		if (Number.isNaN(code)) continue;

		if (code === 0) {
			if (valLine === "SECTION") {
				// Peek next line for section name
				const nextCode = lines[i]?.trim();
				const nextVal = lines[i + 1]?.trim();
				if (nextCode === "2" && nextVal === "ENTITIES") {
					inEntitiesSection = true;
					i += 2;
				}
				continue;
			}

			if (valLine === "ENDSEC") {
				commitCurrentEntity();
				inEntitiesSection = false;
				continue;
			}

			if (valLine === "EOF") {
				commitCurrentEntity();
				break;
			}

			// If in entities section or generic DXF stream, process entity
			if (inEntitiesSection || !dxfContent.includes("SECTION")) {
				commitCurrentEntity();
				currentEntityType = valLine;
				continue;
			}
		}

		if (currentEntityType) {
			if (!currentEntityData[code]) {
				currentEntityData[code] = [];
			}
			currentEntityData[code].push(valLine);
		}
	}

	commitCurrentEntity();

	// Calculate bounding box
	let minX = Number.POSITIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;

	for (const ent of entities) {
		if (ent.type === "LINE") {
			minX = Math.min(minX, ent.start.x, ent.end.x);
			minY = Math.min(minY, ent.start.y, ent.end.y);
			maxX = Math.max(maxX, ent.start.x, ent.end.x);
			maxY = Math.max(maxY, ent.start.y, ent.end.y);
		} else if (ent.type === "CIRCLE" || ent.type === "ARC") {
			minX = Math.min(minX, ent.center.x - ent.radius);
			minY = Math.min(minY, ent.center.y - ent.radius);
			maxX = Math.max(maxX, ent.center.x + ent.radius);
			maxY = Math.max(maxY, ent.center.y + ent.radius);
		} else if (ent.type === "POLYLINE") {
			for (const v of ent.vertices) {
				minX = Math.min(minX, v.x);
				minY = Math.min(minY, v.y);
				maxX = Math.max(maxX, v.x);
				maxY = Math.max(maxY, v.y);
			}
		} else if (ent.type === "TEXT") {
			minX = Math.min(minX, ent.position.x);
			minY = Math.min(minY, ent.position.y);
			maxX = Math.max(maxX, ent.position.x + ent.height * 2);
			maxY = Math.max(maxY, ent.position.y + ent.height);
		}
	}

	if (
		!Number.isFinite(minX) ||
		!Number.isFinite(minY) ||
		!Number.isFinite(maxX) ||
		!Number.isFinite(maxY)
	) {
		minX = 0;
		minY = 0;
		maxX = 100;
		maxY = 100;
	}

	const rawWidth = maxX - minX || 100;
	const rawHeight = maxY - minY || 100;
	const padding = Math.max(Math.max(rawWidth, rawHeight) * 0.05, 5);

	const boxMinX = minX - padding;
	const boxMinY = minY - padding;
	const boxMaxX = maxX + padding;
	const boxMaxY = maxY + padding;
	const boxWidth = boxMaxX - boxMinX;
	const boxHeight = boxMaxY - boxMinY;

	// Invert Y coordinate for SVG (+Y down)
	const toSvgX = (x: number) => (x - boxMinX).toFixed(3);
	const toSvgY = (y: number) => (boxMaxY - y).toFixed(3);

	// Generate SVG elements
	const svgElements: string[] = [];

	for (const ent of entities) {
		if (ent.type === "LINE") {
			const x1 = toSvgX(ent.start.x);
			const y1 = toSvgY(ent.start.y);
			const x2 = toSvgX(ent.end.x);
			const y2 = toSvgY(ent.end.y);
			svgElements.push(
				`  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke" />`,
			);
		} else if (ent.type === "CIRCLE") {
			const cx = toSvgX(ent.center.x);
			const cy = toSvgY(ent.center.y);
			svgElements.push(
				`  <circle cx="${cx}" cy="${cy}" r="${ent.radius.toFixed(3)}" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke" />`,
			);
		} else if (ent.type === "ARC") {
			const cx = ent.center.x;
			const cy = ent.center.y;
			const r = ent.radius;

			const rad1 = (ent.startAngle * Math.PI) / 180;
			const rad2 = (ent.endAngle * Math.PI) / 180;

			const startX = cx + r * Math.cos(rad1);
			const startY = cy + r * Math.sin(rad1);
			const endX = cx + r * Math.cos(rad2);
			const endY = cy + r * Math.sin(rad2);

			let delta = ent.endAngle - ent.startAngle;
			if (delta < 0) delta += 360;
			const largeArc = delta > 180 ? 1 : 0;

			// Because Y is flipped in SVG, CCW in DXF becomes CW (sweep-flag 0)
			const sx = toSvgX(startX);
			const sy = toSvgY(startY);
			const ex = toSvgX(endX);
			const ey = toSvgY(endY);

			svgElements.push(
				`  <path d="M ${sx} ${sy} A ${r.toFixed(3)} ${r.toFixed(3)} 0 ${largeArc} 0 ${ex} ${ey}" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke" />`,
			);
		} else if (ent.type === "POLYLINE") {
			const pts = ent.vertices
				.map((v) => `${toSvgX(v.x)},${toSvgY(v.y)}`)
				.join(" ");
			if (ent.closed) {
				svgElements.push(
					`  <polygon points="${pts}" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke" />`,
				);
			} else {
				svgElements.push(
					`  <polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke" />`,
				);
			}
		} else if (ent.type === "TEXT") {
			const tx = toSvgX(ent.position.x);
			const ty = toSvgY(ent.position.y);
			svgElements.push(
				`  <text x="${tx}" y="${ty}" font-size="${ent.height.toFixed(1)}" font-family="sans-serif" fill="currentColor">${escapeXml(ent.text)}</text>`,
			);
		}
	}

	const svgString = [
		`<?xml version="1.0" encoding="UTF-8"?>`,
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${boxWidth.toFixed(3)} ${boxHeight.toFixed(3)}" width="100%" height="100%">`,
		...svgElements,
		`</svg>`,
	].join("\n");

	return {
		entities,
		bounds: {
			minX,
			minY,
			maxX,
			maxY,
			width: rawWidth,
			height: rawHeight,
		},
		svg: svgString,
	};
}

/**
 * Converts DXF buffer to clean SVG ArrayBuffer.
 */
export function convertDxfToSvg(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Reading DXF vector CAD data");
	const decoder = new TextDecoder("utf-8");
	const text = decoder.decode(input);

	onProgress?.(0.5, "Parsing 2D CAD entities & projecting coordinates");
	const doc = parseDxf(text);

	onProgress?.(0.9, "Serializing SVG vector document");
	const encoder = new TextEncoder();
	const uint8 = encoder.encode(doc.svg);

	return uint8.buffer.slice(
		uint8.byteOffset,
		uint8.byteOffset + uint8.byteLength,
	) as ArrayBuffer;
}
