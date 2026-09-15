import { describe, expect, it } from "vitest";
import { convertTexinfoToMarkdown, texinfoToMarkdownEngine } from "../index";

const SAMPLE_TEXINFO = `\\input texinfo
@setfilename sample.info
@settitle The GNU Sample Manual

@c This is a comment that should be stripped.

@node Top
@top GNU Sample Overview

This manual documents the @code{sample} utility version 1.0.
Visit the official manual at @uref{https://www.gnu.org/software/sample, GNU Project}.
Contact the maintainers at @email{maintainer@example.org}.

@menu
* Invoking sample:: How to run the command.
* Options:: List of command-line flags.
@end menu

@node Invoking sample
@chapter Invoking sample

The syntax for invoking @command{sample} is:

@example
sample [options] file...
sample --verbose --output=out.bin input.dat
@end example

@section Command Line Options

@table @samp
@item -v
@itemx --verbose
Run in verbose debugging mode.

@item -o @var{file}
Write output to @var{file} instead of standard output.
@end table

@subsection Features List

@itemize @bullet
@item Fast parsing with @strong{zero allocations}.
@item Full support for @emph{Unicode} UTF-8.
@end itemize

@enumerate
@item First installation step.
@item Second build step.
@end enumerate

@bye
`;

describe("GNU Texinfo Document Engine", () => {
	it("converts Texinfo document into clean GFM Markdown", () => {
		const result = convertTexinfoToMarkdown(SAMPLE_TEXINFO);

		expect(result.metadata.title).toBe("The GNU Sample Manual");
		expect(result.metadata.chapterCount).toBe(2); // @top and @chapter
		expect(result.metadata.sectionCount).toBe(1); // @section

		// Headings
		expect(result.markdown).toContain("# GNU Sample Overview");
		expect(result.markdown).toContain("# Invoking sample");
		expect(result.markdown).toContain("## Command Line Options");
		expect(result.markdown).toContain("### Features List");

		// Inline formatting
		expect(result.markdown).toContain("`sample`");
		expect(result.markdown).toContain(
			"[GNU Project](https://www.gnu.org/software/sample)",
		);
		expect(result.markdown).toContain("<maintainer@example.org>");
		expect(result.markdown).toContain("**zero allocations**");
		expect(result.markdown).toContain("*Unicode*");

		// Code example
		expect(result.markdown).toContain("```\nsample [options] file...");

		// Lists
		expect(result.markdown).toContain(
			"- Fast parsing with **zero allocations**.",
		);
		expect(result.markdown).toContain("1. First installation step.");
		expect(result.markdown).toContain("2. Second build step.");

		// Comments and menus stripped
		expect(result.markdown).not.toContain("This is a comment");
		expect(result.markdown).not.toContain("* Invoking sample::");
	});

	it("runs through the engine interface", async () => {
		const buffer = new TextEncoder().encode(SAMPLE_TEXINFO);
		const output = await texinfoToMarkdownEngine.run(
			buffer.buffer.slice(0) as ArrayBuffer,
			{},
			() => {},
		);

		expect(output.byteLength).toBeGreaterThan(100);
		const decoded = new TextDecoder().decode(output);
		expect(decoded).toContain("# GNU Sample Overview");
	});
});
