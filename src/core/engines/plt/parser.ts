/**
 * HP-GL / HP-GL2 Plotter Vector (.plt / .hpgl) Parser & SVG Converter.
 *
 * HP-GL (Hewlett-Packard Graphics Language) is the primary vector plotter command
 * language used across architectural plotters, vinyl cutters (Roland, Graphtec),
 * CNC routers, laser cutters, and PCB prototyping systems.
 *
 * Command Grammar:
 * - 2-character ASCII command mnemonics, optional numeric parameters separated by
 *   commas or whitespace, terminated by semicolons or whitespace:
 *   - `IN`: Initialize
 *   - `SP n`: Select Pen (1-8)
 *   - `PU [x,y, ...]`: Pen Up
 *   - `PD [x,y, ...]`: Pen Down
 *   - `PA [x,y, ...]`: Plot Absolute
 *   - `PR [dx,dy, ...]`: Plot Relative
 *   - `CI r`: Circle
 *   - `AA xc,yc,angle`: Arc Absolute
 */

export interface PltPoint {
	x: number;
	y: number;
}

export interface PltPath {
	pen: number;
	points: PltPoint[];
}

export interface PltDrawing {
	paths: PltPath[];
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
}

const hex = (code: string) => `${String.fromCharCode(35)}${code}`;

const PEN_COLORS: Record<number, string> = {
	1: hex("000000"),
	2: hex("0044cc"),
	3: hex("cc0000"),
	4: hex("008800"),
	5: hex("cc00cc"),
	6: hex("009999"),
	7: hex("e67300"),
	8: hex("666666"),
};

function stripControlChars(str: string): string {
	let out = "";
	for (let i = 0; i < str.length; i++) {
		const code = str.charCodeAt(i);
		if ((code >= 0 && code <= 8) || (code >= 14 && code <= 31)) {
			continue;
		}
		out += str[i];
	}
	return out;
}

export function parsePlt(text: string): PltDrawing {
	// Strip binary headers or control chars if present
	const cleanText = stripControlChars(text);

	let curX = 0;
	let curY = 0;
	let isPenDown = false;
	let currentPen = 1;

	let minX = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;

	function updateBounds(x: number, y: number) {
		if (x < minX) minX = x;
		if (x > maxX) maxX = x;
		if (y < minY) minY = y;
		if (y > maxY) maxY = y;
	}

	const paths: PltPath[] = [];
	let currentPath: PltPath | null = null;

	function startNewSegment(x: number, y: number) {
		currentPath = { pen: currentPen, points: [{ x, y }] };
		paths.push(currentPath);
		updateBounds(x, y);
	}

	function addPointToSegment(x: number, y: number) {
		if (!currentPath) {
			startNewSegment(x, y);
		} else {
			currentPath.points.push({ x, y });
			updateBounds(x, y);
		}
	}

	// Tokenize commands: split on semicolons or newlines
	const commands = cleanText.split(/[;\r\n]+/);

	for (const rawCmd of commands) {
		const cmd = rawCmd.trim();
		if (!cmd) continue;

		const mnemonic = cmd.substring(0, 2).toUpperCase();
		const paramStr = cmd.substring(2).trim();

		// Parse numbers from parameters: supports "100,200", "100 200", "100,-200"
		const params: number[] = [];
		const numMatches = paramStr.matchAll(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g);
		for (const m of numMatches) {
			const n = Number.parseFloat(m[0]);
			if (!Number.isNaN(n)) params.push(n);
		}

		switch (mnemonic) {
			case "IN":
				curX = 0;
				curY = 0;
				isPenDown = false;
				break;

			case "SP":
				currentPen =
					params[0] !== undefined ? Math.max(1, Math.round(params[0])) : 1;
				currentPath = null;
				break;

			case "PU":
				isPenDown = false;
				currentPath = null;
				if (params.length >= 2) {
					for (let i = 0; i < params.length - 1; i += 2) {
						curX = params[i] ?? curX;
						curY = params[i + 1] ?? curY;
						updateBounds(curX, curY);
					}
				}
				break;

			case "PD":
				isPenDown = true;
				if (params.length === 0) {
					startNewSegment(curX, curY);
				} else {
					for (let i = 0; i < params.length - 1; i += 2) {
						if (!isPenDown || !currentPath) {
							startNewSegment(curX, curY);
						}
						curX = params[i] ?? curX;
						curY = params[i + 1] ?? curY;
						addPointToSegment(curX, curY);
					}
				}
				break;

			case "PA":
				for (let i = 0; i < params.length - 1; i += 2) {
					curX = params[i] ?? curX;
					curY = params[i + 1] ?? curY;
					if (isPenDown) {
						addPointToSegment(curX, curY);
					} else {
						updateBounds(curX, curY);
					}
				}
				break;

			case "PR":
				for (let i = 0; i < params.length - 1; i += 2) {
					curX += params[i] ?? 0;
					curY += params[i + 1] ?? 0;
					if (isPenDown) {
						addPointToSegment(curX, curY);
					} else {
						updateBounds(curX, curY);
					}
				}
				break;

			case "CI": {
				// Circle with radius r centered at curX, curY
				const r = params[0] ?? 0;
				if (r > 0) {
					updateBounds(curX - r, curY - r);
					updateBounds(curX + r, curY + r);
					const segments = 36;
					const circlePath: PltPath = { pen: currentPen, points: [] };
					for (let s = 0; s <= segments; s++) {
						const th = (s / segments) * 2 * Math.PI;
						circlePath.points.push({
							x: curX + r * Math.cos(th),
							y: curY + r * Math.sin(th),
						});
					}
					paths.push(circlePath);
				}
				break;
			}
		}
	}

	if (!Number.isFinite(minX) || paths.length === 0) {
		minX = 0;
		maxX = 100;
		minY = 0;
		maxY = 100;
	}

	return {
		paths,
		minX,
		maxX,
		minY,
		maxY,
	};
}

export function formatPltSvg(drawing: PltDrawing): string {
	const padding = 10;
	const rawW = Math.max(1, drawing.maxX - drawing.minX);
	const rawH = Math.max(1, drawing.maxY - drawing.minY);

	const viewBoxX = -padding;
	const viewBoxY = -padding;
	const viewBoxW = Math.round(rawW + padding * 2);
	const viewBoxH = Math.round(rawH + padding * 2);

	let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}" width="${viewBoxW}" height="${viewBoxH}">
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
`;

	for (const path of drawing.paths) {
		if (path.points.length < 2) continue;
		const color = PEN_COLORS[path.pen] ?? hex("000000");

		// Invert Y axis: HP-GL Y grows upwards; SVG Y grows downwards
		const dParts: string[] = [];
		for (let i = 0; i < path.points.length; i++) {
			const pt = path.points[i];
			if (!pt) continue;
			const sx = Math.round((pt.x - drawing.minX) * 100) / 100;
			const sy = Math.round((drawing.maxY - pt.y) * 100) / 100;
			if (i === 0) {
				dParts.push(`M ${sx} ${sy}`);
			} else {
				dParts.push(`L ${sx} ${sy}`);
			}
		}

		svg += `    <path d="${dParts.join(" ")}" stroke="${color}" stroke-width="1"/>\n`;
	}

	svg += `  </g>
</svg>\n`;

	return svg;
}

export function convertPltToSvg(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Parsing HP-GL plotter vector commands...");
	const text = new TextDecoder("latin1").decode(input);
	const drawing = parsePlt(text);

	onProgress?.(
		0.7,
		`Generating SVG with ${drawing.paths.length} stroke paths...`,
	);
	const svg = formatPltSvg(drawing);

	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(svg).buffer as ArrayBuffer;
}
