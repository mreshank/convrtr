import * as fflate from "fflate";
import { describe, expect, it } from "vitest";
import { mmapToMarkdownEngine } from "../index";
import { convertMmapToMarkdown, parseMmap } from "../parser";

const DOCUMENT_XML = `<?xml version="1.0"?>
<ap:Map xmlns:ap="http://schemas.mindjet.com/MindManager/Application/2003">
<ap:OneTopic><ap:Topic>
<ap:Text PlainText="Project plan"/>
<ap:SubTopics>
<ap:Topic>
<ap:Text PlainText="Research"/>
<ap:Task Priority="1" Progress="50"/>
<ap:Notes><ap:Note><ap:P>Check rivals</ap:P></ap:Note></ap:Notes>
<ap:SubTopics>
<ap:Topic><ap:Text PlainText="Interviews"/></ap:Topic>
</ap:SubTopics>
</ap:Topic>
<ap:Topic>
<ap:Text PlainText="Launch"/>
<ap:Task Progress="100"/>
<ap:Hyperlink Url="https://example.com/ship"/>
</ap:Topic>
</ap:SubTopics>
</ap:Topic></ap:OneTopic>
</ap:Map>`;

function makeMmap(xml: string = DOCUMENT_XML): Uint8Array {
	return fflate.zipSync({ "Document.xml": new TextEncoder().encode(xml) });
}

describe("MindManager (.mmap) Parser & Engine", () => {
	it("walks topics, tasks, notes and links", () => {
		const root = parseMmap(makeMmap());
		expect(root.text).toBe("Project plan");
		expect(root.children).toHaveLength(2);

		const research = root.children[0];
		expect(research?.text).toBe("Research");
		expect(research?.done).toBe(false);
		expect(research?.progress).toBe("50");
		expect(research?.notes).toEqual(["Check rivals"]);
		expect(research?.children[0]?.text).toBe("Interviews");

		const launch = root.children[1];
		expect(launch?.done).toBe(true);
		expect(launch?.link).toBe("https://example.com/ship");
	});

	it("renders a task-aware outline through the engine", async () => {
		expect(await mmapToMarkdownEngine.probe()).toBe(true);
		const file = makeMmap();
		const out = await convertMmapToMarkdown(
			file.buffer.slice(
				file.byteOffset,
				file.byteOffset + file.byteLength,
			) as ArrayBuffer,
			() => {},
		);
		const md = new TextDecoder().decode(out);
		expect(md).toContain("# Project plan");
		expect(md).toContain("- [ ] Research (50%)");
		expect(md).toContain("> Check rivals");
		expect(md).toContain("- [x] Launch");
	});

	it("rejects non-ZIP input and maps without topics", () => {
		expect(() => parseMmap(new Uint8Array(20).fill(7))).toThrow(
			"ZIP container",
		);
		const noDoc = fflate.zipSync({
			"other.txt": new TextEncoder().encode("x"),
		});
		expect(() => parseMmap(noDoc)).toThrow("Document.xml");
		const empty = makeMmap("<ap:Map/>");
		expect(() => parseMmap(empty)).toThrow("No topics");
	});
});
