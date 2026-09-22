interface ExcalidrawElement {
	id?: string;
	type?: string;
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	angle?: number;
	strokeColor?: string;
	backgroundColor?: string;
	fillStyle?: string;
	strokeWidth?: number;
	strokeStyle?: "solid" | "dashed" | "dotted";
	opacity?: number;
	points?: Array<[number, number]>;
	text?: string;
	fontSize?: number;
	textAlign?: "left" | "center" | "right";
	isDeleted?: boolean;
	startArrowhead?: string | null;
	endArrowhead?: string | null;
	link?: string | null;
}

const hex = (c: string) => `${String.fromCharCode(35)}${c}`;

const VALID_TYPES = new Set([
	"rectangle",
	"ellipse",
	"diamond",
	"text",
	"line",
	"arrow",
	"freedraw",
	"image",
]);

function esc(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function fillOf(el: ExcalidrawElement): string {
	const bg = el.backgroundColor ?? "transparent";
	return bg === "transparent" ? "none" : bg;
}

function dashOf(el: ExcalidrawElement): string {
	if (el.strokeStyle === "dashed") return ' stroke-dasharray="12 8"';
	if (el.strokeStyle === "dotted")
		return ' stroke-dasharray="3 6" stroke-linecap="round"';
	return "";
}

function opacityOf(el: ExcalidrawElement): string {
	const o = el.opacity ?? 100;
	return o === 100 ? "" : ` opacity="${(o / 100).toFixed(2)}"`;
}

function rotateOf(el: ExcalidrawElement): string {
	const deg = ((el.angle ?? 0) * 180) / Math.PI;
	if (!deg) return "";
	const cx = (el.x ?? 0) + (el.width ?? 0) / 2;
	const cy = (el.y ?? 0) + (el.height ?? 0) / 2;
	return ` transform="rotate(${deg.toFixed(2)} ${cx.toFixed(1)} ${cy.toFixed(1)})"`;
}

/**
 * Renders an Excalidraw scene (`.excalidraw` JSON) to a simplified SVG.
 *
 * Faithful where it matters (geometry, colours, text, arrows, embedded
 * images via the `files` dataURL map) and openly simplified where browsers
 * can't match the editor: hand-drawn roughness, hachure fills and font
 * rendering are flattened to clean vector equivalents. Deleted elements and
 * frames are skipped; remote images without embedded data get a labelled
 * placeholder instead of a broken link.
 */
export function renderExcalidrawSvg(fileBytes: Uint8Array): string {
	const raw = new TextDecoder("utf-8").decode(fileBytes);
	let doc: unknown;
	try {
		doc = JSON.parse(raw) as unknown;
	} catch {
		throw new Error("Invalid Excalidraw file: not valid JSON.");
	}
	if (typeof doc !== "object" || doc === null) {
		throw new Error("Invalid Excalidraw file: expected a scene object.");
	}
	const root = doc as {
		type?: string;
		elements?: ExcalidrawElement[];
		files?: Record<string, { mimeType?: string; dataURL?: string }>;
	};
	if (root.type !== "excalidraw" || !Array.isArray(root.elements)) {
		throw new Error(
			'Invalid Excalidraw file: expected `{"type": "excalidraw", "elements": [...]}`.',
		);
	}

	const elements = root.elements.filter(
		(e) => e && !e.isDeleted && VALID_TYPES.has(e.type ?? ""),
	);
	if (elements.length === 0) {
		throw new Error("Excalidraw scene holds no drawable elements.");
	}

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	const grow = (x: number, y: number) => {
		if (x < minX) minX = x;
		if (y < minY) minY = y;
		if (x > maxX) maxX = x;
		if (y > maxY) maxY = y;
	};

	const arrowColors = new Set<string>();
	const body: string[] = [];

	for (const el of elements) {
		const x = el.x ?? 0;
		const y = el.y ?? 0;
		const w = el.width ?? 0;
		const h = el.height ?? 0;
		const stroke = el.strokeColor ?? hex("1e1e1e");
		const sw = el.strokeWidth ?? 2;
		const common = `stroke="${esc(stroke)}" stroke-width="${sw}"${dashOf(el)}${opacityOf(el)}`;
		const rot = rotateOf(el);

		if (el.type === "rectangle") {
			grow(x, y);
			grow(x + w, y + h);
			body.push(
				`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${esc(fillOf(el))}" ${common}${rot}/>`,
			);
		} else if (el.type === "ellipse") {
			grow(x, y);
			grow(x + w, y + h);
			body.push(
				`<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${Math.abs(w / 2)}" ry="${Math.abs(h / 2)}" fill="${esc(fillOf(el))}" ${common}${rot}/>`,
			);
		} else if (el.type === "diamond") {
			grow(x, y);
			grow(x + w, y + h);
			body.push(
				`<polygon points="${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}" fill="${esc(fillOf(el))}" ${common}${rot}/>`,
			);
		} else if (el.type === "text") {
			const size = el.fontSize ?? 20;
			const anchor =
				el.textAlign === "left"
					? "start"
					: el.textAlign === "right"
						? "end"
						: "middle";
			const ax = anchor === "middle" ? x + w / 2 : anchor === "end" ? x + w : x;
			grow(x, y);
			grow(x + w, y + h);
			const lines = (el.text ?? "").split("\n");
			const tspans = lines
				.map(
					(ln, i) =>
						`<tspan x="${ax}" dy="${i === 0 ? 0 : size * 1.25}">${esc(ln)}</tspan>`,
				)
				.join("");
			body.push(
				`<text x="${ax}" y="${y + size}" font-size="${size}" fill="${esc(stroke)}" text-anchor="${anchor}" font-family="sans-serif"${opacityOf(el)}${rot}>${tspans}</text>`,
			);
		} else if (
			el.type === "line" ||
			el.type === "arrow" ||
			el.type === "freedraw"
		) {
			const pts = (el.points ?? []).map(
				([px, py]) => [x + px, y + py] as const,
			);
			for (const [px, py] of pts) grow(px, py);
			if (pts.length < 2) continue;
			const coords = pts.map(([px, py]) => `${px},${py}`).join(" ");
			let markers = "";
			if (el.type === "arrow") {
				if (el.endArrowhead) {
					arrowColors.add(stroke);
					markers += ` marker-end="url(#arr-${arrowColorsIndex(arrowColors, stroke)})"`;
				}
				if (el.startArrowhead) {
					arrowColors.add(stroke);
					markers += ` marker-start="url(#arr-${arrowColorsIndex(arrowColors, stroke)})"`;
				}
			}
			body.push(
				`<polyline points="${coords}" fill="none" ${common}${markers}${rot}/>`,
			);
		} else if (el.type === "image") {
			grow(x, y);
			grow(x + w, y + h);
			const fileId = (el as { fileId?: string }).fileId;
			const file = (fileId && root.files?.[fileId]) || undefined;
			if (file?.dataURL) {
				body.push(
					`<image x="${x}" y="${y}" width="${w}" height="${h}" href="${esc(file.dataURL)}"${opacityOf(el)}${rot}/>`,
				);
			} else {
				body.push(
					`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${hex("999")}" stroke-dasharray="6 4"${rot}/><text x="${x + w / 2}" y="${y + h / 2}" font-size="14" fill="${hex("999")}" text-anchor="middle" font-family="sans-serif">[image: no embedded data]</text>`,
				);
			}
		}
	}

	const defs = [...arrowColors]
		.map(
			(c, i) =>
				`<marker id="arr-${i}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${esc(c)}"/></marker>`,
		)
		.join("");

	const pad = 20;
	const vbX = minX - pad;
	const vbY = minY - pad;
	const vbW = maxX - minX + pad * 2;
	const vbH = maxY - minY + pad * 2;

	return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" width="${Math.round(vbW)}" height="${Math.round(vbH)}">\n<title>Excalidraw scene export</title>\n<desc>${elements.length} elements. Simplified render: hand-drawn roughness and hachure fills are flattened to clean geometry.</desc>\n<defs>${defs}</defs>\n<rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" fill="${hex("ffffff")}"/>\n${body.join("\n")}\n</svg>\n`;
}

function arrowColorsIndex(set: Set<string>, color: string): number {
	return [...set].indexOf(color);
}

export function convertExcalidrawToSvg(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Reading scene elements...");
	const svg = renderExcalidrawSvg(new Uint8Array(input));
	onProgress?.(0.7, "Drawing simplified SVG...");
	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(svg).buffer as ArrayBuffer;
}
