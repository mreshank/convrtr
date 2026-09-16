import { describe, expect, it } from "vitest";
import { convertTroffToMarkdown, troffToMarkdownEngine } from "../index";

const sampleTroffDoc = `.\\" AT&T Bell Laboratories Technical Memorandum
.TL
Typesetting by Computing
.AU
Brian W. Kernighan
.ds PR \\fBTroff 2.0\\fR
.NH 1
Introduction
.PP
The \\*(PR program is a classical phototypesetting compiler developed for
the Graphic Systems CAT phototypesetter.
It supports multiple typefaces including \\fBbold\\fR, \\fIitalic\\fR, and \\f(CWmonospace\\fR.
.NH 2
Macro Facility
.de XX
.\\" Custom internal macro definition
.sp
..
The macro facility allows users to define custom abbreviations.
.QP
"The only way to learn a new programming language is by writing programs in it."
.sp
.IP \\(bu
First item in list
.IP \\(bu
Second item in list
.SH Code Example
.nf
#include <stdio.h>
int main() {
    printf("hello, world\\n");
    return 0;
}
.fi
`;

describe("AT&T Troff Document Engine", () => {
	it("parses classical troff document into GitHub Flavored Markdown", () => {
		const result = convertTroffToMarkdown(sampleTroffDoc);

		expect(result.metadata.title).toBe("Typesetting by Computing");
		expect(result.metadata.headingCount).toBeGreaterThanOrEqual(3);
		expect(result.metadata.macrosDefined).toBe(1);

		expect(result.markdown).toContain("# Typesetting by Computing");
		expect(result.markdown).toContain("## Introduction");
		expect(result.markdown).toContain("The **Troff 2.0** program");
		expect(result.markdown).toContain("### Macro Facility");
		expect(result.markdown).toContain(
			'> "The only way to learn a new programming language is by writing programs in it."',
		);
		expect(result.markdown).toContain("## Code Example");
		expect(result.markdown).toContain('printf("hello, world\\n");');
	});

	it("parses three-part title .tl request", () => {
		const doc = `.tl ''The C Programming Language''
.PP
A technical reference manual.
`;
		const result = convertTroffToMarkdown(doc);
		expect(result.metadata.title).toBe("The C Programming Language");
		expect(result.markdown).toContain("# The C Programming Language");
	});

	it("runs through the engine interface", async () => {
		const encoder = new TextEncoder();
		const buffer = encoder.encode(sampleTroffDoc).buffer;

		const output = await troffToMarkdownEngine.run(buffer, {}, () => {});
		const text = new TextDecoder().decode(output);

		expect(text).toContain("# Typesetting by Computing");
		expect(text).toContain("## Introduction");
	});
});
