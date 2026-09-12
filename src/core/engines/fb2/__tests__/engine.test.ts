import { describe, expect, it } from "vitest";
import { convertFb2ToMarkdown } from "../parser";

const SAMPLE_FB2 = `<?xml version="1.0" encoding="utf-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0" xmlns:l="http://www.w3.org/1999/xlink">
  <description>
    <title-info>
      <genre>science_fiction</genre>
      <genre>space_opera</genre>
      <author>
        <first-name>Arthur</first-name>
        <middle-name>C.</middle-name>
        <last-name>Clarke</last-name>
      </author>
      <book-title>Rendezvous with Rama</book-title>
      <date>1973</date>
      <lang>en</lang>
    </title-info>
  </description>
  <body>
    <title>
      <p>Rendezvous with Rama</p>
    </title>
    <epigraph>
      <p>The celestial wanderer had arrived.</p>
      <p>Knowledge is our only shield.</p>
    </epigraph>
    <section>
      <title>
        <p>Chapter 1: Spaceguard</p>
      </title>
      <p>Sooner or later, it was bound to happen.</p>
      <p>Commander <strong>Norton</strong> surveyed the <i>cylindrical artifact</i> through the panoramic viewport.</p>
      <empty-line/>
      <p>Details were captured in the ship logs at <a href="https://example.org/logs">Station Central</a>.</p>
      <poem>
        <stanza>
          <v>Stars like diamonds in the deep,</v>
          <v>Silent watch the voyagers keep.</v>
        </stanza>
      </poem>
      <image l:href="#cover.jpg"/>
    </section>
  </body>
  <binary id="cover.jpg" content-type="image/jpeg">
    /9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=
  </binary>
</FictionBook>
`;

describe("FictionBook 2.0 (FB2) to Markdown engine", () => {
	it("parses metadata, frontmatter, chapters, epigraphs, poems, and embedded images", () => {
		const result = convertFb2ToMarkdown(SAMPLE_FB2);

		expect(result.metadata.title).toBe("Rendezvous with Rama");
		expect(result.metadata.authors).toEqual(["Arthur C. Clarke"]);
		expect(result.metadata.genres).toContain("science_fiction");
		expect(result.metadata.genres).toContain("space_opera");
		expect(result.metadata.date).toBe("1973");
		expect(result.metadata.language).toBe("en");
		expect(result.metadata.imageCount).toBe(1);
		expect(result.metadata.sectionCount).toBeGreaterThanOrEqual(1);

		expect(result.images.length).toBe(1);
		const cover = result.images[0];
		expect(cover?.id).toBe("cover.jpg");
		expect(cover?.contentType).toBe("image/jpeg");
		expect(cover?.dataUri).toContain("data:image/jpeg;base64,");

		// Verify Markdown content
		expect(result.markdown).toContain('title: "Rendezvous with Rama"');
		expect(result.markdown).toContain('authors:\n  - "Arthur C. Clarke"');
		expect(result.markdown).toContain("# Rendezvous with Rama");
		expect(result.markdown).toContain("> The celestial wanderer had arrived.");
		expect(result.markdown).toContain("## Chapter 1: Spaceguard");
		expect(result.markdown).toContain("**Norton**");
		expect(result.markdown).toContain("*cylindrical artifact*");
		expect(result.markdown).toContain(
			"[Station Central](https://example.org/logs)",
		);
		expect(result.markdown).toContain("Stars like diamonds in the deep");
		expect(result.markdown).toContain("![cover.jpg](data:image/jpeg;base64,");
	});

	it("supports disabling frontmatter", () => {
		const result = convertFb2ToMarkdown(SAMPLE_FB2, {
			includeFrontmatter: false,
		});

		expect(result.markdown).not.toContain("---");
		expect(result.markdown).toContain("# Rendezvous with Rama");
	});

	it("reports progress across conversion phases", () => {
		const phases: string[] = [];
		convertFb2ToMarkdown(SAMPLE_FB2, {}, (_, phase) => {
			phases.push(phase);
		});

		expect(phases).toContain("READ_INPUT");
		expect(phases).toContain("EXTRACT_METADATA");
		expect(phases).toContain("EXTRACT_IMAGES");
		expect(phases).toContain("PARSE_SECTIONS");
		expect(phases).toContain("COMPLETE");
	});

	it("throws an error for non-FB2 input", () => {
		expect(() => convertFb2ToMarkdown("Plain text without xml")).toThrow(
			/Missing root '<FictionBook>' or '<body>'/,
		);
	});
});
