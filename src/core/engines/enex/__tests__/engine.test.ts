import { describe, expect, it } from "vitest";
import { convertEnexToMarkdown } from "../parser";

const SAMPLE_ENEX = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export4.dtd">
<en-export export-date="20230501T153000Z" application="Evernote" version="10.50">
  <note>
    <title>Project Roadmap &amp; Tasks</title>
    <content>
      <![CDATA[<?xml version="1.0" encoding="UTF-8"?>
      <!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
      <en-note>
        <div><b>Q3 Priorities</b></div>
        <div><en-todo checked="true"/>Ship client-side WASM decoders</div>
        <div><en-todo checked="false"/>Optimize bundle sizes</div>
        <div>Visit <a href="https://convrtr.io">convrtr.io</a> for updates.</div>
        <pre><code>const zeroServer = true;</code></pre>
        <table>
          <tr><th>Feature</th><th>Status</th></tr>
          <tr><td>Zero Server</td><td>Complete</td></tr>
        </table>
        <en-media hash="abcdef012345" type="image/png"/>
      </en-note>]]>
    </content>
    <created>20230501T100000Z</created>
    <updated>20230502T120000Z</updated>
    <tag>engineering</tag>
    <tag>roadmap</tag>
  </note>
  <note>
    <title>Meeting Notes</title>
    <content>
      <![CDATA[<en-note><div>Discussion on <i>privacy</i> &amp; performance.</div></en-note>]]>
    </content>
    <created>20230503T090000Z</created>
    <tag>meetings</tag>
  </note>
</en-export>
`;

describe("ENEX to Markdown engine", () => {
	it("extracts multiple notes with YAML frontmatter, checklists, tables, and tags", () => {
		const result = convertEnexToMarkdown(SAMPLE_ENEX);

		expect(result.metadata.noteCount).toBe(2);
		expect(result.metadata.tagList).toContain("engineering");
		expect(result.metadata.tagList).toContain("roadmap");
		expect(result.metadata.tagList).toContain("meetings");
		expect(result.metadata.earliestDate).toBe("2023-05-01T10:00:00Z");

		expect(result.notes.length).toBe(2);
		const [note1, note2] = result.notes;
		expect(note1).toBeDefined();
		expect(note2).toBeDefined();
		if (!note1 || !note2) return;

		expect(note1.title).toBe("Project Roadmap & Tasks");
		expect(note1.created).toBe("2023-05-01T10:00:00Z");
		expect(note1.tags).toEqual(["engineering", "roadmap"]);
		expect(note1.markdown).toContain("- [x] Ship client-side WASM decoders");
		expect(note1.markdown).toContain("- [ ] Optimize bundle sizes");
		expect(note1.markdown).toContain("[convrtr.io](https://convrtr.io)");
		expect(note1.markdown).toContain("```");
		expect(note1.markdown).toContain("| Feature | Status |");
		expect(note1.markdown).toContain("[Attachment: image/png]");

		expect(note2.title).toBe("Meeting Notes");
		expect(note2.markdown).toContain("*privacy* & performance.");

		// Verify overall combined markdown contains both notes with frontmatter
		expect(result.markdown).toContain('title: "Project Roadmap & Tasks"');
		expect(result.markdown).toContain('title: "Meeting Notes"');
		expect(result.markdown).toContain("tags:\n  - engineering\n  - roadmap");
	});

	it("supports options to omit frontmatter", () => {
		const result = convertEnexToMarkdown(SAMPLE_ENEX, {
			includeFrontmatter: false,
		});

		expect(result.markdown).not.toContain('title: "Project Roadmap');
		expect(result.markdown).toContain("# Project Roadmap & Tasks");
		expect(result.markdown).toContain("# Meeting Notes");
	});

	it("reports progress across conversion phases", () => {
		const phases: string[] = [];
		convertEnexToMarkdown(SAMPLE_ENEX, {}, (_, phase) => {
			phases.push(phase);
		});

		expect(phases).toContain("READ_INPUT");
		expect(phases).toContain("EXTRACT_NOTES");
		expect(phases).toContain("FORMAT_MARKDOWN");
		expect(phases).toContain("COMPLETE");
	});

	it("throws an error for invalid ENEX data", () => {
		expect(() => convertEnexToMarkdown("Invalid plain text")).toThrow(
			/Missing '<en-export>' root or '<note>' elements/,
		);
	});
});
