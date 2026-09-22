import * as fflate from "fflate";
import { describe, expect, it } from "vitest";
import { mboxToZipEngine } from "../index";
import { convertMboxToZip, splitMbox } from "../parser";

const MBOX = `From ana@example.com Fri Jun 07 10:00:00 2024
From: Ana <ana@example.com>
To: Ben <ben@example.com>
Subject: Trip photos!
Date: Fri, 7 Jun 2024 10:00:00 +0000

Here are the photos.
>From the archive, remember?

From ben@example.com Fri Jun 07 11:00:00 2024
From: Ben <ben@example.com>
Subject: Re: Trip photos!
Content-Type: text/plain

Got them, thanks.
`;

function bytes(s: string = MBOX): Uint8Array {
	return new TextEncoder().encode(s);
}

describe("mbox splitter & Engine", () => {
	it("splits on From-lines and unescapes >From", () => {
		const { messageCount, zipBytes } = splitMbox(bytes());
		expect(messageCount).toBe(2);

		const entries = fflate.unzipSync(zipBytes);
		const names = Object.keys(entries);
		expect(names).toHaveLength(2);
		expect(names[0]).toMatch(/^001-trip-photos\.eml$/);
		expect(names[1]).toMatch(/^002-re-trip-photos\.eml$/);

		const first = new TextDecoder().decode(entries[names[0] as string]);
		expect(first).toContain("Subject: Trip photos!");
		expect(first).toContain("\nFrom the archive, remember?");
		expect(first).not.toContain("From ana@example.com Fri Jun");
	});

	it("packs a ZIP end-to-end through the engine", async () => {
		expect(await mboxToZipEngine.probe()).toBe(true);
		const out = await convertMboxToZip(
			bytes().buffer.slice(0) as ArrayBuffer,
			() => {},
		);
		expect(new Uint8Array(out)[0]).toBe(0x50); // PK
		expect(new Uint8Array(out)[1]).toBe(0x4b);
	});

	it("throws when no separators exist", () => {
		expect(() =>
			splitMbox(bytes("Subject: lone eml, no From line\n\nbody")),
		).toThrow("No mbox message separators");
	});
});
