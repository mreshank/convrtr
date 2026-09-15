import { describe, expect, it } from "vitest";
import { convertManToMarkdown, manToMarkdownEngine } from "../index";

const sampleManPage = `.\\" Copyright (C) 2024 Test Project
.TH EXAMPLE 1 "March 2024" "Example Suite 2.0" "User Commands"
.SH NAME
example \\- an exemplary command line utility
.SH SYNOPSIS
.B example
[\\fB\\-v\\fR]
[\\fB\\-o\\fR \\fIfile\\fR]
.SH DESCRIPTION
\\fBexample\\fR is a test utility demonstrating roff man page conversion.
It supports multiple features including \\fBbold\\fR, \\fIitalic\\fR, and \\f(CWmonospace\\fR text.
.SS Options
The following options are accepted:
.TP
\\fB\\-v\\fR, \\fB\\-\\^verbose\\fR
Enable verbose output mode.
.TP
\\fB\\-o\\fR \\fIFILE\\fR
Write output to the specified \\fIFILE\\fR instead of stdout.
.IP \\(bu 4
Item number one
.IP \\(bu 4
Item number two
.SH EXAMPLES
Run basic verification:
.nf
$ example --verbose -o out.txt
$ cat out.txt
.fi
.SH "SEE ALSO"
.BR ls (1),
.BR cat (1)
`;

const sampleMdocPage = `.Dd March 15, 2024
.Dt HELLO 1
.Os "FreeBSD"
.Sh NAME
.Nm hello
.Nd greeting utility
.Sh SYNOPSIS
.Nm
.Op Fl v
.Ar target
.Sh DESCRIPTION
The
.Nm
utility prints a greeting to
.Ar target .
`;

describe("Unix Man Page Parser Engine", () => {
	it("parses standard roff man page into GitHub Flavored Markdown", () => {
		const result = convertManToMarkdown(sampleManPage);

		expect(result.metadata.title).toBe("EXAMPLE");
		expect(result.metadata.section).toBe("1");
		expect(result.metadata.date).toBe("March 2024");
		expect(result.metadata.source).toBe("Example Suite 2.0");
		expect(result.metadata.manual).toBe("User Commands");
		expect(result.metadata.sectionCount).toBeGreaterThanOrEqual(4);

		expect(result.markdown).toContain("# EXAMPLE(1) — User Commands");
		expect(result.markdown).toContain("## NAME");
		expect(result.markdown).toContain("example - an exemplary command line utility");
		expect(result.markdown).toContain("## SYNOPSIS");
		expect(result.markdown).toContain("### Options");
		expect(result.markdown).toContain(": Enable verbose output mode.");
		expect(result.markdown).toContain("```\n$ example --verbose -o out.txt\n$ cat out.txt\n```");
		expect(result.markdown).toContain("## SEE ALSO");
		expect(result.markdown).toContain("**ls**(1)");
	});

	it("parses mdoc format man page", () => {
		const result = convertManToMarkdown(sampleMdocPage);

		expect(result.metadata.title).toBe("HELLO");
		expect(result.metadata.section).toBe("1");
		expect(result.markdown).toContain("# HELLO(1)");
		expect(result.markdown).toContain("## NAME");
		expect(result.markdown).toContain("**hello**");
		expect(result.markdown).toContain("— greeting utility");
		expect(result.markdown).toContain("[**-v**]");
		expect(result.markdown).toContain("*target*");
	});

	it("runs through the engine interface", async () => {
		const encoder = new TextEncoder();
		const buffer = encoder.encode(sampleManPage).buffer;

		const output = await manToMarkdownEngine.run(buffer, {}, () => {});
		const text = new TextDecoder().decode(output);

		expect(text).toContain("# EXAMPLE(1)");
		expect(text).toContain("## DESCRIPTION");
	});
});
