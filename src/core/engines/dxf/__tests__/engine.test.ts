import { describe, expect, it } from "vitest";
import { dxfToSvgEngine } from "../index";
import { parseDxf } from "../parser";

describe("AutoCAD DXF to SVG Vector Parser & Engine", () => {
	it("parses lines, circles, arcs, and polylines into structured SVG elements", () => {
		const dxfText = `
  0
SECTION
  2
ENTITIES
  0
LINE
 10
0.0
 20
0.0
 11
100.0
 21
0.0
  0
CIRCLE
 10
50.0
 20
50.0
 40
25.0
  0
ARC
 10
50.0
 20
50.0
 40
30.0
 50
0.0
 51
90.0
  0
LWPOLYLINE
 70
1
 10
10.0
 20
10.0
 10
20.0
 20
10.0
 10
20.0
 20
20.0
 10
10.0
 20
20.0
  0
ENDSEC
  0
EOF
`.trim();

		const doc = parseDxf(dxfText);

		expect(doc.entities).toHaveLength(4);
		expect(doc.entities[0]?.type).toBe("LINE");
		expect(doc.entities[1]?.type).toBe("CIRCLE");
		expect(doc.entities[2]?.type).toBe("ARC");
		expect(doc.entities[3]?.type).toBe("POLYLINE");

		// Verify SVG markup output
		expect(doc.svg).toContain("<svg");
		expect(doc.svg).toContain("<line");
		expect(doc.svg).toContain("<circle");
		expect(doc.svg).toContain("<path");
		expect(doc.svg).toContain("<polygon");
		expect(doc.svg).toContain("</svg>");
	});

	it("parses text entities and escapes XML special characters", () => {
		const dxfText = `
  0
SECTION
  2
ENTITIES
  0
TEXT
 10
15.0
 20
30.0
 40
5.0
  1
Safety & Warning <Zone 1>
  0
ENDSEC
  0
EOF
`.trim();

		const doc = parseDxf(dxfText);
		expect(doc.entities).toHaveLength(1);
		expect(doc.entities[0]?.type).toBe("TEXT");
		expect(doc.svg).toContain("Safety &amp; Warning &lt;Zone 1&gt;");
	});

	it("handles empty or entity-less DXF files gracefully with fallback bounds", () => {
		const emptyDxf = `0\nEOF`;
		const doc = parseDxf(emptyDxf);
		expect(doc.entities).toHaveLength(0);
		expect(doc.svg).toContain("<svg");
		expect(doc.svg).toContain("</svg>");
	});

	it("converts DXF to SVG ArrayBuffer via dxfToSvgEngine", async () => {
		const dxfText = `
  0
SECTION
  2
ENTITIES
  0
LINE
 10
0.0
 20
0.0
 11
50.0
 21
50.0
  0
ENDSEC
  0
EOF
`;
		const encoder = new TextEncoder();
		const inputBuf = encoder.encode(dxfText).buffer as ArrayBuffer;

		const result = await dxfToSvgEngine.run(inputBuf, {}, () => {});
		const decoder = new TextDecoder("utf-8");
		const svgStr = decoder.decode(result);

		expect(svgStr).toContain("<svg");
		expect(svgStr).toContain("<line");
		expect(svgStr).toContain("</svg>");
	});
});
