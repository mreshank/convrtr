import { describe, expect, it } from "vitest";
import { convertPltToSvg, formatPltSvg, parsePlt } from "../parser";

describe("HP-GL / PLT Parser & SVG Converter", () => {
	it("parses basic pen movements and coordinates into paths", () => {
		const hpgl = "IN;SP1;PU100,100;PD200,100,200,200,100,200,100,100;PU;";
		const drawing = parsePlt(hpgl);

		expect(drawing.paths.length).toBeGreaterThan(0);
		expect(drawing.minX).toBe(100);
		expect(drawing.maxX).toBe(200);
		expect(drawing.minY).toBe(100);
		expect(drawing.maxY).toBe(200);

		const firstPath = drawing.paths[0];
		expect(firstPath).toBeDefined();
		expect(firstPath?.pen).toBe(1);
		expect(firstPath?.points.length).toBe(5);
	});

	it("supports multiple pens and circles", () => {
		const hpgl = `
			IN;
			SP 2;
			PA 500, 500;
			CI 50;
			SP 3;
			PU 600, 600;
			PD;
			PR 100, 0;
			PR 0, 100;
			PU;
		`;
		const drawing = parsePlt(hpgl);
		expect(drawing.paths.length).toBeGreaterThanOrEqual(2);

		// CI generates circle points
		const circle = drawing.paths.find((p) => p.points.length > 20);
		expect(circle).toBeDefined();
		expect(circle?.pen).toBe(2);
	});

	it("formats clean scalable SVG output", () => {
		const drawing = parsePlt("IN;SP1;PU0,0;PD100,100;PU;");
		const svg = formatPltSvg(drawing);

		expect(svg).toContain("<svg");
		expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
		expect(svg).toContain('<path d="M');
		expect(svg).toContain('stroke="#000000"');
		expect(svg).toContain("</svg>");
	});

	it("converts ArrayBuffer of PLT commands to SVG ArrayBuffer", () => {
		const text = "IN;SP2;PU10,10;PD50,10,50,50,10,50,10,10;PU;";
		const input = new TextEncoder().encode(text).buffer as ArrayBuffer;

		const output = convertPltToSvg(input);
		const svgStr = new TextDecoder().decode(output);

		expect(svgStr).toContain("<svg");
		expect(svgStr).toContain('stroke="#0044cc"'); // Pen 2 color
		expect(svgStr).toContain("</svg>");
	});
});
