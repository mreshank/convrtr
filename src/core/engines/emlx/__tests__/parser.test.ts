import { describe, expect, it } from "vitest";
import { emlxToEmlEngine } from "../index";
import { convertEmlxToEml, parseEmlx } from "../parser";

const MESSAGE = `From: Ana <ana@example.com>
To: Ben <ben@example.com>
Subject: Hello

Hi Ben.
`;

function makeEmlx(withPlist = true): Uint8Array {
	const msg = new TextEncoder().encode(MESSAGE);
	const head = new TextEncoder().encode(`${msg.length}\n`);
	const plist = withPlist
		? new TextEncoder().encode(
				`<?xml version="1.0"?><plist version="1.0"><dict><key>flags</key><integer>3</integer></dict></plist>`,
			)
		: new Uint8Array(0);
	const out = new Uint8Array(head.length + msg.length + plist.length);
	out.set(head, 0);
	out.set(msg, head.length);
	out.set(plist, head.length + msg.length);
	return out;
}

describe("Apple Mail (.emlx) Parser & Engine", () => {
	it("extracts the message bit-exact and reports the plist trailer", () => {
		const r = parseEmlx(makeEmlx(true));
		expect(new TextDecoder().decode(r.emlBytes)).toBe(MESSAGE);
		expect(r.hasPlistTrailer).toBe(true);
	});

	it("works without a plist trailer", () => {
		const r = parseEmlx(makeEmlx(false));
		expect(new TextDecoder().decode(r.emlBytes)).toBe(MESSAGE);
		expect(r.hasPlistTrailer).toBe(false);
	});

	it("round-trips through the engine", async () => {
		expect(await emlxToEmlEngine.probe()).toBe(true);
		const file = makeEmlx(true);
		const out = await convertEmlxToEml(
			file.buffer.slice(
				file.byteOffset,
				file.byteOffset + file.byteLength,
			) as ArrayBuffer,
			() => {},
		);
		expect(new TextDecoder().decode(out)).toBe(MESSAGE);
	});

	it("rejects non-emlx input and truncated files", () => {
		expect(() =>
			parseEmlx(new TextEncoder().encode("From: x\n\nbody")),
		).toThrow("not a decimal message length");
		const head = new TextEncoder().encode("99999\nshort");
		expect(() => parseEmlx(head)).toThrow("Truncated Apple Mail file");
	});
});
