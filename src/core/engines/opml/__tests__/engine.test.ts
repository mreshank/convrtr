import { describe, expect, it } from "vitest";
import { opmlToMarkdownEngine } from "../index";
import { convertOpmlToMarkdown, parseOpml } from "../parser";

const sampleSubscriptionOpml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Tech &amp; News Subscriptions</title>
    <dateCreated>Sat, 12 Sep 2026 14:00:00 GMT</dateCreated>
    <ownerName>Researcher</ownerName>
  </head>
  <body>
    <outline text="Technology" title="Technology">
      <outline type="rss" text="Hacker News" title="Hacker News" xmlUrl="https://news.ycombinator.com/rss" htmlUrl="https://news.ycombinator.com"/>
      <outline type="rss" text="Ars Technica" title="Ars Technica" xmlUrl="https://arstechnica.com/feed/" htmlUrl="https://arstechnica.com"/>
    </outline>
  </body>
</opml>`;

const sampleHierarchyOpml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
  <head>
    <title>Project Roadmap</title>
  </head>
  <body>
    <outline text="Phase 1: Architecture" _status="checked">
      <outline text="Design zero-server pipeline" _status="checked" _note="Pure client-side WebAssembly"/>
      <outline text="Support offline workers" _status="unchecked"/>
    </outline>
    <outline text="Phase 2: Deployment">
      <outline text="Setup CI/CD pipeline" htmlUrl="https://github.com/features/actions"/>
    </outline>
  </body>
</opml>`;

describe("OPML to Markdown engine", () => {
	it("rejects non-OPML content", () => {
		expect(() => parseOpml("<div>Just HTML</div>")).toThrow(
			/missing <opml> root/i,
		);
	});

	it("parses OPML document structure accurately", () => {
		const doc = parseOpml(sampleSubscriptionOpml);
		expect(doc.version).toBe("2.0");
		expect(doc.head.title).toBe("Tech & News Subscriptions");
		expect(doc.head.ownerName).toBe("Researcher");
		expect(doc.body.length).toBe(1);
		expect(doc.body[0]?.text).toBe("Technology");
		expect(doc.body[0]?.children.length).toBe(2);
		expect(doc.body[0]?.children[0]?.xmlUrl).toBe(
			"https://news.ycombinator.com/rss",
		);
	});

	it("renders RSS subscription feeds as structured Markdown tables", () => {
		const result = convertOpmlToMarkdown(sampleSubscriptionOpml);
		expect(result.markdown).toContain("# Tech & News Subscriptions");
		expect(result.markdown).toContain("## Technology");
		expect(result.markdown).toContain("| Feed Title | Site | Feed URL |");
		expect(result.markdown).toContain(
			"| Hacker News | [Website](https://news.ycombinator.com) | [RSS Feed](https://news.ycombinator.com/rss) |",
		);
		expect(result.stats.feedCount).toBe(2);
	});

	it("renders task lists, notes, and nested hierarchies with checklists", () => {
		const result = convertOpmlToMarkdown(sampleHierarchyOpml);
		expect(result.markdown).toContain("- [x] Phase 1: Architecture");
		expect(result.markdown).toContain("  - [x] Design zero-server pipeline");
		expect(result.markdown).toContain("    > Pure client-side WebAssembly");
		expect(result.markdown).toContain("  - [ ] Support offline workers");
		expect(result.markdown).toContain(
			"  - [Setup CI/CD pipeline](https://github.com/features/actions)",
		);
	});

	it("executes cleanly through opmlToMarkdownEngine", async () => {
		const inputBuffer = new TextEncoder().encode(sampleSubscriptionOpml)
			.buffer as ArrayBuffer;
		const output = await opmlToMarkdownEngine.run(
			inputBuffer,
			{ includeFrontmatter: true },
			() => {},
		);

		expect(output).toBeInstanceOf(ArrayBuffer);
		const md = new TextDecoder().decode(output);
		expect(md).toContain('title: "Tech & News Subscriptions"');
	});
});
