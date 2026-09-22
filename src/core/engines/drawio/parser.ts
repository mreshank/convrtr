import { inflateSync, unzlibSync } from "fflate";

function esc(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function decodeEntities(s: string): string {
	return s
		.replace(/&#(\d+);/g, (_m, code) =>
			String.fromCodePoint(Number.parseInt(code, 10)),
		)
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&nbsp;/g, " ")
		.replace(/&#x([0-9a-fA-F]+);/g, (_m, code) =>
			String.fromCodePoint(Number.parseInt(code, 16)),
		);
}

/** Strips HTML-ish spans from a drawio value label, keeping the text. */
function labelText(value: string | undefined): string {
	if (value == null) return "";
	const html = decodeEntities(value);
	// Value is often html=1 — pull out text between tags, join with newlines.
	const stripped = html
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/?[^>]+>/g, "");
	return stripped.replace(/\n{3,}/g, "\n\n").trim();
}

interface CellGeometry {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface DrawioCell {
	id: string;
	parent: string;
	isVertex: boolean;
	isEdge: boolean;
	value: string;
	style: string;
	source: string;
	target: string;
	geometry: CellGeometry;
	// Edge waypoints (absolute from Array/points) when present.
	points: Array<{ x: number; y: number }>;
}

interface ParseResult {
	cells: DrawioCell[];
	width: number;
	height: number;
	pageName: string;
}

function parseStyle(style: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const part of style.split(";")) {
		if (!part) continue;
		const eq = part.indexOf("=");
		if (eq < 0) {
			out[part] = "";
		} else {
			out[part.slice(0, eq)] = part.slice(eq + 1);
		}
	}
	return out;
}

/** A conservative tokeniser for mxGraphModel XML without a DOM. */
function parseModel(xml: string): ParseResult {
	let width = 848;
	let height = 480;
	let pageName = "Page-1";

	const diagramName = /<diagram[^>]*name="([^"]*)"/.exec(xml);
	if (diagramName?.[1] !== undefined) pageName = decodeEntities(diagramName[1]);

	const pageMatch = /<diagram[^>]*page="([^"]*)"/.exec(xml);
	if (pageMatch?.[1]) {
		const parts = pageMatch[1]
			.split(",")
			.map((n) => Number.parseFloat(n))
			.filter((n) => Number.isFinite(n) && n > 0);
		const w = parts[0];
		const h = parts[1];
		if (w && h) {
			width = w;
			height = h;
		}
	}

	const cells: DrawioCell[] = [];
	// Positional scanner: find each <mxCell>, read its attribute region up to
	// the closing '>', decide self-closing vs open+close, then grab the inner
	// body. Attribute values are always quoted in drawio output, so '>' inside
	// quotes (rare) is handled by the inQuote flag.
	let idx = 0;
	// biome-ignore lint/suspicious/noAssignInExpressions: streaming positional scan
	while ((idx = xml.indexOf("<mxCell", idx)) !== -1) {
		const tagStart = idx;
		idx += "<mxCell".length;
		let inQuote = false;
		let tagEnd = -1;
		for (; idx < xml.length; idx++) {
			const ch = xml[idx];
			if (ch === '"') inQuote = !inQuote;
			else if (ch === ">" && !inQuote) {
				tagEnd = idx;
				break;
			}
		}
		if (tagEnd === -1) break; // malformed; stop scanning

		const tagBody = xml.slice(tagStart + "<mxCell".length, tagEnd);
		const selfClosing = tagBody.trimEnd().endsWith("/");
		const attrsStr = selfClosing
			? tagBody.slice(0, tagBody.lastIndexOf("/")).trim()
			: tagBody.trim();
		let inner = "";
		if (selfClosing) {
			idx = tagEnd + 1;
		} else {
			const close = xml.indexOf("</mxCell>", tagEnd);
			if (close === -1) break;
			inner = xml.slice(tagEnd + 1, close);
			idx = close + "</mxCell>".length;
		}

		const attrs = parseAttrs(attrsStr);

		const id = attrs.id ?? "";
		const parent = attrs.parent ?? "";
		const isVertex = attrs.vertex === "1";
		const isEdge = attrs.edge === "1";
		const style = attrs.style ?? "";
		const points: Array<{ x: number; y: number }> = [];
		const absRe = /<Array\s+as="points"[^>]*>([\s\S]*?)<\/Array>/g;
		let am: RegExpExecArray | null;
		// biome-ignore lint/suspicious/noAssignInExpressions: streaming regex scan
		while ((am = absRe.exec(inner)) !== null) {
			const bodyStr = am[1] ?? "";
			const ptRe = /<mxPoint\b([^>]*)\/>/g;
			let pm: RegExpExecArray | null;
			// biome-ignore lint/suspicious/noAssignInExpressions: streaming regex scan
			while ((pm = ptRe.exec(bodyStr)) !== null) {
				const p = parseAttrs(pm[1] ?? "");
				const x = Number.parseFloat(p.x ?? "0");
				const y = Number.parseFloat(p.y ?? "0");
				if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x, y });
			}
		}

		// Geometry is a child element (or, for roots, absent).
		const geomRe = /<mxGeometry\b([^>]*)\/>/.exec(inner);
		const geometry: CellGeometry = { x: 0, y: 0, width: 0, height: 0 };
		if (geomRe?.[1]) {
			const g = parseAttrs(geomRe[1]);
			geometry.x = Number.parseFloat(g.x ?? "0");
			geometry.y = Number.parseFloat(g.y ?? "0");
			geometry.width = Number.parseFloat(g.width ?? "0");
			geometry.height = Number.parseFloat(g.height ?? "0");
			for (const k of ["x", "y", "width", "height"] as const) {
				if (!Number.isFinite(geometry[k])) geometry[k] = 0;
			}
		}

		if (!id) continue;
		cells.push({
			id,
			parent,
			isVertex,
			isEdge,
			value: attrs.value ?? "",
			style,
			source: attrs.source ?? "",
			target: attrs.target ?? "",
			geometry,
			points,
		});
	}

	return { cells, width, height, pageName };
}

function parseAttrs(tag: string): Record<string, string> {
	const out: Record<string, string> = {};
	const re = /([\w-]+)="([^"]*)"/g;
	let m: RegExpExecArray | null;
	// biome-ignore lint/suspicious/noAssignInExpressions: streaming regex scan
	while ((m = re.exec(tag)) !== null) {
		const k = m[1];
		const v = m[2];
		if (k && v !== undefined) {
			out[k] = decodeEntities(v);
		}
	}
	return out;
}

/**
 * Renders an mxGraphModel (.drawio / .drawio.xml / .dio) to a simplified SVG.
 *
 * Faithful where it matters: page bounds, vertex geometry, the four dominant
 * shapes (rounded/ellipse/rhombus/rectangle), fill and stroke palettes, and
 * connector lines with their waypoints. Openly simplified where a full replay
 * of the editor would be thousands of lines: swimlanes, ports, arrowheads,
 * HTML-rich labels and the edge layout algorithms (orthogonal, entity
 * relation) are flattened — connectors draw straight through waypoints, and
 * rich HTML labels become plain text.
 */
export function renderDrawioSvg(input: Uint8Array): string {
	let xml: string;
	// drawio saves deflate-compressed by default: a zlib header whose first two
	// bytes are 0x78 followed by the CMF/FLG pair (0x01 stored, 0x9C default,
	// 0xDA best compression). Check raw bytes — a TextDecoder would map 0x9C
	// through the legacy 8-bit charset to a non-0x9C code point.
	const isZlib =
		input.length >= 2 &&
		input[0] === 0x78 &&
		(input[1] === 0x9c || input[1] === 0xda || input[1] === 0x01);

	if (isZlib) {
		// zlib-deflated drawio container
		try {
			xml = new TextDecoder("utf-8").decode(unzlibSync(input));
		} catch {
			xml = new TextDecoder("utf-8").decode(inflateSync(input));
		}
	} else {
		xml = new TextDecoder("utf-8", { fatal: false }).decode(input);
	}

	if (!xml.includes("<mxGraphModel")) {
		throw new Error(
			"Invalid .drawio file: no mxGraphModel root found after inflating the XML.",
		);
	}

	const { cells, width, height, pageName } = parseModel(xml);
	const vertices = cells.filter((c) => c.isVertex);
	if (vertices.length === 0) {
		throw new Error(
			"Invalid .drawio file: the model contains no vertex (shape) cells.",
		);
	}

	const byId = new Map<string, DrawioCell>();
	for (const c of cells) byId.set(c.id, c);

	// ---- compute the canvas bounds (page attrs or cell extents) ----
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	const grow = (x: number, y: number) => {
		if (Number.isFinite(x) && Number.isFinite(y)) {
			if (x < minX) minX = x;
			if (y < minY) minY = y;
			if (x > maxX) maxX = x;
			if (y > maxY) maxY = y;
		}
	};

	for (const v of vertices) {
		const g = v.geometry;
		grow(g.x, g.y);
		grow(g.x + g.width, g.y + g.height);
	}

	const pageHasRoom = maxX <= width && maxY <= height;
	const vbW = pageHasRoom ? width : Math.max(maxX - minX, 1);
	const vbH = pageHasRoom ? height : Math.max(maxY - minY, 1);
	const vbX = pageHasRoom ? 0 : Math.min(minX, 0);
	const vbY = pageHasRoom ? 0 : Math.min(minY, 0);

	// ---- shapes ----
	const colorsUsed = new Set<string>();
	const body: string[] = [];

	function shapeFor(v: DrawioCell): string {
		const st = v.style;
		if (st.includes("shape=ellipse") || st.includes("ellipse"))
			return "ellipse";
		if (st.includes("shape=rhombus") || st.includes("rhombus"))
			return "rhombus";
		if (st.includes("rounded=1") || st.includes("shape=rect") || !st) {
			return "rect";
		}
		return "rect";
	}

	const DEFAULT_FILL = "transparent";
	const DEFAULT_STROKE = "currentColor";

	for (const v of vertices) {
		const g = v.geometry;
		const st = parseStyle(v.style);
		const fill = st.fillColor ?? DEFAULT_FILL;
		const stroke = st.strokeColor ?? DEFAULT_STROKE;
		const sw = st.strokewidth ? Number.parseFloat(st.strokewidth) : 1;
		colorsUsed.add(fill);
		colorsUsed.add(stroke);
		const shape = shapeFor(v);
		const common = `stroke="${esc(stroke)}" stroke-width="${sw || 1}"`;
		const label = labelText(v.value);

		let shapeEl = "";
		if (shape === "ellipse") {
			shapeEl = `<ellipse cx="${g.x + g.width / 2}" cy="${g.y + g.height / 2}" rx="${Math.abs(g.width / 2)}" ry="${Math.abs(g.height / 2)}" fill="${esc(fill)}" ${common}/>`;
		} else if (shape === "rhombus") {
			shapeEl = `<polygon points="${g.x + g.width / 2},${g.y} ${g.x + g.width},${g.y + g.height / 2} ${g.x + g.width / 2},${g.y + g.height} ${g.x},${g.y + g.height / 2}" fill="${esc(fill)}" ${common}/>`;
		} else {
			const rx =
				v.style.includes("rounded=1") || v.style.includes("arcSize=")
					? ` rx="${Math.min(8, g.width / 2)}" ry="${Math.min(8, g.height / 2)}"`
					: "";
			shapeEl = `<rect x="${g.x}" y="${g.y}" width="${g.width}" height="${g.height}" fill="${esc(fill)}" ${common}${rx}/>`;
		}

		body.push(shapeEl);

		if (label) {
			const lines = label.split("\n");
			const tspans = lines
				.map(
					(ln, i) =>
						`<tspan x="${g.x + g.width / 2}" dy="${i === 0 ? 0 : 14}">${esc(ln)}</tspan>`,
				)
				.join("");
			body.push(
				`<text x="${g.x + g.width / 2}" y="${g.y + g.height / 2}" text-anchor="middle" font-family="sans-serif" fill="${esc(st.fontColor ?? st.strokeColor ?? DEFAULT_STROKE)}" font-size="12">${tspans}</text>`,
			);
		}
	}

	// ---- connectors ----
	function centerOf(id: string): { x: number; y: number } | null {
		const c = byId.get(id);
		if (!c?.isVertex) return null;
		return {
			x: c.geometry.x + c.geometry.width / 2,
			y: c.geometry.y + c.geometry.height / 2,
		};
	}

	const connectors = cells.filter((c) => c.isEdge || (c.source && c.target));

	for (const e of connectors) {
		const st = parseStyle(e.style);
		const stroke = st.strokeColor ?? DEFAULT_STROKE;
		const sw = st.strokewidth ? Number.parseFloat(st.strokewidth) : 1;
		colorsUsed.add(stroke);
		const line: Array<{ x: number; y: number }> = [];
		const src = centerOf(e.source);
		const tgt = centerOf(e.target);
		if (src) line.push(src);
		for (const p of e.points) line.push(p);
		if (tgt) line.push(tgt);
		if (line.length < 2) continue;

		const dashes = e.style.includes("dashed=1")
			? ' stroke-dasharray="8 5"'
			: "";
		if (line.length === 2) {
			const a = line[0];
			const b = line[1];
			if (a && b) {
				body.push(
					`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${esc(stroke)}" stroke-width="${sw || 1}"${dashes}/>`,
				);
			}
		} else {
			const pts = line.map((p) => `${p.x},${p.y}`).join(" ");
			body.push(
				`<polyline points="${pts}" fill="none" stroke="${esc(stroke)}" stroke-width="${sw || 1}"${dashes}/>`,
			);
		}
	}

	const pad = 20;
	const rectW = vbW + pad * 2;
	const rectH = vbH + pad * 2;

	return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX - pad} ${vbY - pad} ${rectW} ${rectH}" width="${Math.round(rectW)}" height="${Math.round(rectH)}">\n<title>${esc(pageName)}</title>\n<desc>${vertices.length} shapes. Simplified drawio render: orthogonal edge routing and rich HTML labels flattened to straight waypoint lines and plain text.</desc>\n<rect x="${vbX - pad}" y="${vbY - pad}" width="${rectW}" height="${rectH}" fill="none"/>\n${body.join("\n")}\n</svg>\n`;
}

export function convertDrawioToSvg(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Inflating / reading diagram XML...");
	const svg = renderDrawioSvg(new Uint8Array(input));
	onProgress?.(0.8, "Rendering simplified diagram SVG...");
	onProgress?.(1, "Complete");
	return new TextEncoder().encode(svg).buffer as ArrayBuffer;
}
