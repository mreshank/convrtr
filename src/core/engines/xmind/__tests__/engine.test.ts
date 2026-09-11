import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { xmindToMarkdownEngine } from "../index";

describe("xmindToMarkdownEngine", () => {
	it("probes successfully", async () => {
		expect(await xmindToMarkdownEngine.probe()).toBe(true);
	});

	it("converts an XMind content.json tree into clean hierarchical Markdown", async () => {
		const contentJson = JSON.stringify([
			{
				id: "sheet1",
				title: "Project Mindmap",
				rootTopic: {
					id: "root",
					title: "Launch Strategy",
					notes: { plain: { content: "Core goals for Q3" } },
					children: {
						attached: [
							{
								id: "b1",
								title: "Marketing",
								children: {
									attached: [
										{ id: "sub1", title: "Reddit Announcements" },
										{ id: "sub2", title: "Twitter Threads" },
									],
								},
							},
							{
								id: "b2",
								title: "Engineering",
							},
						],
					},
				},
			},
		]);

		const zipped = zipSync({
			"content.json": new TextEncoder().encode(contentJson),
		});

		const input = zipped.buffer.slice(
			zipped.byteOffset,
			zipped.byteOffset + zipped.byteLength,
		);
		const output = await xmindToMarkdownEngine.run(input, {}, () => {});
		const md = new TextDecoder().decode(output);

		expect(md).toContain("# Launch Strategy");
		expect(md).toContain("Core goals for Q3");
		expect(md).toContain("## Marketing");
		expect(md).toContain("### Reddit Announcements");
		expect(md).toContain("### Twitter Threads");
		expect(md).toContain("## Engineering");
	});

	it("rejects non-zip files", async () => {
		const badBytes = new TextEncoder().encode("not a zip");
		await expect(
			xmindToMarkdownEngine.run(badBytes.buffer, {}, () => {}),
		).rejects.toThrow(/not a valid .xmind/i);
	});
});
