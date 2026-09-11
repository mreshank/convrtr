import { describe, expect, it } from "vitest";
import { vcfToCsvEngine } from "../index";

function buildMockVcf(): string {
	return [
		"BEGIN:VCARD",
		"VERSION:3.0",
		"N:Doe;John;M.;Mr.;",
		"FN:John Doe",
		"ORG:Acme Corp;Engineering",
		"TITLE:Senior Architect",
		"TEL;TYPE=CELL:(555) 123-4567",
		"TEL;TYPE=WORK:(555) 987-6543",
		"EMAIL;TYPE=INTERNET:john.doe@example.com",
		"ADR;TYPE=HOME:;;123 Maple Street;Springfield;IL;62701;USA",
		"NOTE:Met at tech conference 2026.\\nPrefers morning calls.",
		"URL:https://johndoe.me",
		"BDAY:1985-04-12",
		"END:VCARD",
		"BEGIN:VCARD",
		"VERSION:2.1",
		"N:Smith;Jane;;;",
		"FN:Jane Smith",
		"TEL;TYPE=PREF,VOICE:+1-800-555-0199",
		"EMAIL:jane.smith@corporation.org",
		"NOTE;ENCODING=QUOTED-PRINTABLE:First line of note=0D=0ASecond line of note",
		"END:VCARD",
		"BEGIN:VCARD",
		"VERSION:3.0",
		"N: folded name test;",
		"FN:Folded Name",
		"NOTE:This is a very long line that is folded ",
		" according to the RFC 2425 standard.",
		"END:VCARD",
	].join("\r\n");
}

describe("vcfToCsvEngine", () => {
	it("probes successfully", async () => {
		const supported = await vcfToCsvEngine.probe();
		expect(supported).toBe(true);
	});

	it("converts multi-contact vCard to clean RFC 4180 CSV with UTF-8 BOM", async () => {
		const mockVcf = buildMockVcf();
		const inputBuffer = new TextEncoder().encode(mockVcf).buffer as ArrayBuffer;
		const progress: string[] = [];

		const result = await vcfToCsvEngine.run(
			inputBuffer,
			{},
			(_ratio, phase) => {
				progress.push(phase);
			},
		);

		expect(result.byteLength).toBeGreaterThan(0);
		const csvStr = new TextDecoder("utf-8").decode(result);

		// Verify UTF-8 BOM is present in raw output bytes (0xEF, 0xBB, 0xBF)
		const rawBytes = new Uint8Array(result);
		expect(rawBytes[0]).toBe(0xef);
		expect(rawBytes[1]).toBe(0xbb);
		expect(rawBytes[2]).toBe(0xbf);

		// Header checks
		expect(csvStr).toContain("First Name,Last Name,Full Name");
		expect(csvStr).toContain("Mobile Phone,Work Phone,Home Phone");

		// Record 1 checks
		expect(csvStr).toContain("John,Doe,John Doe");
		expect(csvStr).toContain("Acme Corp,Senior Architect,Engineering");
		expect(csvStr).toContain("(555) 123-4567,(555) 987-6543");
		expect(csvStr).toContain("123 Maple Street,Springfield,IL,62701,USA");
		expect(csvStr).toContain("https://johndoe.me");

		// Record 2 checks
		expect(csvStr).toContain("Jane,Smith,Jane Smith");
		expect(csvStr).toContain("+1-800-555-0199");
		expect(csvStr).toContain("jane.smith@corporation.org");

		// Record 3 folding check
		expect(csvStr).toContain(
			"This is a very long line that is folded according to the RFC 2425 standard.",
		);

		expect(progress).toContain("READ_VCF");
		expect(progress).toContain("PARSE_CONTACTS");
		expect(progress).toContain("GENERATE_CSV");
		expect(progress).toContain("DONE");
	});

	it("handles contacts with commas and quotes gracefully", async () => {
		const vcfWithCommas = [
			"BEGIN:VCARD",
			"VERSION:3.0",
			'FN:Smith, "Agent" John',
			"ORG:Smith, Jones & Partners, LLC",
			"END:VCARD",
		].join("\n");

		const inputBuffer = new TextEncoder().encode(vcfWithCommas)
			.buffer as ArrayBuffer;
		const result = await vcfToCsvEngine.run(inputBuffer, {}, () => {});
		const csvStr = new TextDecoder("utf-8").decode(result);

		// CSV escaping: cells with commas or quotes must be wrapped in double quotes, with internal quotes escaped as ""
		expect(csvStr).toContain('"Smith, ""Agent"" John"');
		expect(csvStr).toContain('"Smith, Jones & Partners, LLC"');
	});

	it("rejects non-vCard files", async () => {
		const plainText = new TextEncoder().encode("Hello, this is not a vcard")
			.buffer as ArrayBuffer;
		await expect(vcfToCsvEngine.run(plainText, {}, () => {})).rejects.toThrow(
			/not a valid vcard/i,
		);
	});
});
