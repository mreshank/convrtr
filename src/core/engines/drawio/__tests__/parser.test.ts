import { zlibSync } from "fflate";
import { describe, expect, it } from "vitest";
import { convertDrawioToSvg, renderDrawioSvg } from "../parser";

const DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net">
  <diagram id="abc123" name="Network Map" page="1000,600">
    <mxGraphModel dx="800" dy="600" grid="1" gridSize="10">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="2" value="Router" style="rounded=1;fillColor=#dae8fc;strokeColor=#6c8ebf;strokewidth=2;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="120" height="60" as="geometry" />
        </mxCell>
        <mxCell id="3" value="Switch&#10;Layer 2" style="shape=rhombus;fillColor=#fff2cc;strokeColor=#d6b656;" vertex="1" parent="1">
          <mxGeometry x="240" y="40" width="120" height="60" as="geometry" />
        </mxCell>
        <mxCell id="4" value="Server" style="ellipse;fillColor=#f8cecc;strokeColor=#b85450;strokewidth=3;whiteSpace=wrap;html=1;" vertex="1" parent="1">
          <mxGeometry x="240" y="200" width="120" height="60" as="geometry" />
        </mxCell>
        <mxCell id="5" value="" style="endArrow=block;dashed=1;" edge="1" parent="1" source="2" target="4">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

describe("renderDrawioSvg", () => {
	it("renders a plain-XML diagram to an SVG", () => {
		const svg = renderDrawioSvg(new TextEncoder().encode(DIAGRAM));
		expect(svg).toContain("<svg");
		expect(svg).toContain('viewBox="-20 -20 1040 640"');
		expect(svg).toContain("<title>Network Map</title>");
		// shapes
		expect(svg).toContain(
			`<rect x="40" y="40" width="120" height="60" fill="#dae8fc" stroke="#6c8ebf" stroke-width="2" rx="8" ry="8"/>`,
		);
		expect(svg).toContain("<polygon");
		expect(svg).toContain("<ellipse");
		// label text
		expect(svg).toContain(">Router</tspan>");
		expect(svg).toContain(">Switch</tspan>");
		expect(svg).toContain(">Layer 2</tspan>");
		// connector
		expect(svg).toContain('stroke-dasharray="8 5"');
	});

	it("inflates a zlib-compressed drawio container", () => {
		const compressed = zlibSync(new TextEncoder().encode(DIAGRAM));
		const svg = renderDrawioSvg(new Uint8Array(compressed.buffer));
		expect(svg).toContain("<title>Network Map</title>");
		expect(svg).toContain('fill="#dae8fc"');
	});

	it("throws for non-drawio input", () => {
		expect(() =>
			renderDrawioSvg(new TextEncoder().encode("not a diagram at all")),
		).toThrow(/no mxGraphModel root/);
	});

	it("throws when the model has no vertex cells", () => {
		const empty = `<?xml version="1.0"?><mxfile><diagram><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>`;
		expect(() => renderDrawioSvg(new TextEncoder().encode(empty))).toThrow(
			/no vertex/,
		);
	});
});

describe("convertDrawioToSvg", () => {
	it("returns SVG bytes", () => {
		const out = convertDrawioToSvg(
			new TextEncoder().encode(DIAGRAM).buffer as ArrayBuffer,
			() => {},
		);
		const svg = new TextDecoder().decode(out);
		expect(svg).toContain("<svg");
	});
});
