import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { scrivToMarkdownEngine } from "../index";

function rtf(author: string, body: string): string {
	return `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Arial;}}
{\\info{\\title Scrivener Project}{\\author ${author}}{\\*\\generator Literature & Latte}}
\\f0\\fs36 \\b Header\\b0\\par
${body}\\par
}`;
}

function toBuffer(bytes: Uint8Array): ArrayBuffer {
	return bytes.buffer.slice(
		bytes.byteOffset,
		bytes.byteOffset + bytes.byteLength,
	) as ArrayBuffer;
}

describe("Scrivener (.scriv) to Markdown Engine", () => {
	it("extracts the compiled manuscript from content.rtf in a Scrivener 3 package", async () => {
		const zip = zipSync({
			"content.rtf": new TextEncoder().encode(
				rtf("Jane Writer", "The old mill stood\\par at the edge of the lake."),
			),
			"Settings/Data.xml": new TextEncoder().encode("<project/>"),
			"data.xml": new TextEncoder().encode("<project/>"),
		});

		const output = await scrivToMarkdownEngine.run(toBuffer(zip), {}, () => {});
		const md = new TextDecoder().decode(output);
		expect(md).toContain("The old mill stood");
		expect(md).toContain("Jane Writer");
	});

	it("joins legacy Files/ documents in path order when there is no content.rtf", async () => {
		const zip = zipSync({
			"MyProject.scriv/Files/1/22/Chapter 01.rtf": new TextEncoder().encode(
				rtf("Jane Writer", "Chapter one opening."),
			),
			"MyProject.scriv/Files/1/22/Chapter 02.rtf": new TextEncoder().encode(
				rtf("Jane Writer", "Chapter two continues."),
			),
			"MyProject.scriv/Settings/prefs.rtf": new TextEncoder().encode(
				rtf("System", "internal settings, must be ignored"),
			),
		});

		const output = await scrivToMarkdownEngine.run(toBuffer(zip), {}, () => {});
		const md = new TextDecoder().decode(output);
		expect(md.indexOf("Chapter one opening.")).toBeGreaterThan(-1);
		expect(md.indexOf("Chapter two continues.")).toBeGreaterThan(
			md.indexOf("Chapter one opening."),
		);
		expect(md).not.toContain("internal settings, must be ignored");
	});

	it("rejects a bundle that is not a ZIP package", async () => {
		const notAzip = new Uint8Array(64);
		await expect(
			scrivToMarkdownEngine.run(toBuffer(notAzip), {}, () => {}),
		).rejects.toThrow(/doesn't look like a Scrivener project/);
	});

	it("rejects a ZIP with no Rich Text manuscript", async () => {
		const zip = zipSync({
			"Settings/Data.xml": new TextEncoder().encode("<project/>"),
		});
		await expect(
			scrivToMarkdownEngine.run(toBuffer(zip), {}, () => {}),
		).rejects.toThrow(/contains no Rich Text manuscript/);
	});
});
