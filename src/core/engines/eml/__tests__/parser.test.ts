import { describe, expect, it } from "vitest";
import { emlToTxtEngine } from "../index";
import { convertEmlToTxt, parseEml } from "../parser";

const SIMPLE = `From: =?UTF-8?Q?Ana_M=C3=BCller?= <ana@example.com>
To: Ben <ben@example.com>
Date: Fri, 7 Jun 2024 10:00:00 +0000
Subject: Hello
Content-Type: text/plain; charset=utf-8

Hi Ben, café?
`;

const MULTIPART = `From: Ana <ana@example.com>
To: Ben <ben@example.com>
Subject: Report
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="BOUND42"

--BOUND42
Content-Type: text/plain; charset=us-ascii

See attached.
--BOUND42
Content-Type: text/html; charset=utf-8
Content-Transfer-Encoding: quoted-printable

<p>See <b>attached</b>=2E</p>
--BOUND42
Content-Type: application/pdf; name="doc.pdf"
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename="doc.pdf"

JVBERi0=
--BOUND42--
`;

const HTML_ONLY = `From: Ana <ana@example.com>
Subject: Hi
Content-Type: text/html; charset=utf-8

<p>Hello<br>World</p>
`;

function bytes(s: string): Uint8Array {
	return new TextEncoder().encode(s);
}

describe("EML to text Parser & Engine", () => {
	it("decodes headers and plain bodies", () => {
		const eml = parseEml(bytes(SIMPLE));
		expect(eml.from).toContain("Ana Müller");
		expect(eml.subject).toBe("Hello");
		expect(eml.body).toBe("Hi Ben, café?");
		expect(eml.attachments).toEqual([]);
	});

	it("prefers plain parts, strips HTML fallback, manifests files", () => {
		const eml = parseEml(bytes(MULTIPART));
		expect(eml.body).toBe("See attached.");
		expect(eml.attachments).toEqual(["doc.pdf"]);
	});

	it("falls back to stripped HTML", () => {
		const eml = parseEml(bytes(HTML_ONLY));
		expect(eml.body).toBe("Hello\nWorld");
	});

	it("renders headers plus body through the engine", async () => {
		expect(await emlToTxtEngine.probe()).toBe(true);
		const out = await convertEmlToTxt(
			bytes(SIMPLE).buffer.slice(0) as ArrayBuffer,
			() => {},
		);
		const txt = new TextDecoder().decode(out);
		expect(txt).toContain("Subject: Hello");
		expect(txt).toContain("café?");
	});

	it("rejects empty messages", () => {
		expect(() => parseEml(bytes("From: x@y.z\n\n"))).toThrow(
			"No readable text",
		);
	});
});
