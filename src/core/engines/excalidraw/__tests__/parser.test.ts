import { describe, expect, it } from "vitest";
import { excalidrawToSvgEngine } from "../index";
import { convertExcalidrawToSvg, renderExcalidrawSvg } from "../parser";

const SCENE = {
	type: "excalidraw",
	version: 2,
	source: "https://excalidraw.com",
	elements: [
		{
			id: "r1",
			type: "rectangle",
			x: 10,
			y: 20,
			width: 100,
			height: 50,
			angle: 0,
			strokeColor: "#1e1e1e",
			backgroundColor: "#ffc9c9",
			strokeWidth: 2,
			strokeStyle: "solid",
			opacity: 100,
			isDeleted: false,
		},
		{
			id: "t1",
			type: "text",
			x: 10,
			y: 80,
			width: 60,
			height: 25,
			angle: 0,
			strokeColor: "#000000",
			fontSize: 20,
			textAlign: "left",
			text: "Hello\nWorld",
			opacity: 100,
			isDeleted: false,
		},
		{
			id: "a1",
			type: "arrow",
			x: 0,
			y: 0,
			width: 50,
			height: 0,
			angle: 0,
			strokeColor: "#1971c2",
			strokeWidth: 2,
			strokeStyle: "solid",
			opacity: 100,
			points: [
				[0, 0],
				[50, 0],
			],
			endArrowhead: "arrow",
			isDeleted: false,
		},
		{
			id: "gone",
			type: "ellipse",
			x: 0,
			y: 0,
			width: 5,
			height: 5,
			isDeleted: true,
		},
	],
	appState: { viewBackgroundColor: "#ffffff" },
	files: {},
};

function bytes(v: unknown): Uint8Array {
	return new TextEncoder().encode(JSON.stringify(v));
}

describe("Excalidraw scene Parser & Engine", () => {
	it("renders shapes, multiline text and arrowheads; skips deleted", () => {
		const svg = renderExcalidrawSvg(bytes(SCENE));
		expect(svg).toContain("<rect");
		expect(svg).toContain('fill="#ffc9c9"');
		expect(svg).toContain("<tspan");
		expect(svg).toContain("Hello");
		expect(svg).toContain("marker-end");
		expect(svg).not.toContain("ellipse");
		expect(svg).toContain("viewBox=");
	});

	it("round-trips through the engine", async () => {
		expect(await excalidrawToSvgEngine.probe()).toBe(true);
		const out = await convertExcalidrawToSvg(
			bytes(SCENE).buffer.slice(0) as ArrayBuffer,
			() => {},
		);
		expect(new TextDecoder().decode(out)).toContain("<svg");
	});

	it("rejects non-JSON, wrong shapes and empty scenes", () => {
		expect(() => renderExcalidrawSvg(new TextEncoder().encode("nope"))).toThrow(
			"not valid JSON",
		);
		expect(() =>
			renderExcalidrawSvg(bytes({ type: "other", elements: [] })),
		).toThrow('expected `{"type": "excalidraw"');
		expect(() =>
			renderExcalidrawSvg(bytes({ type: "excalidraw", elements: [] })),
		).toThrow("no drawable elements");
	});
});
