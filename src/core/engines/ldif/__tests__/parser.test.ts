import { describe, expect, it } from "vitest";
import { ldifToCsvEngine } from "../index";
import { convertLdifToCsv, parseLdif } from "../parser";

const LDIF = `version: 1
dn: uid=ana,ou=people,dc=example,dc=com
cn: Ana Example
cn: A. Example
mail: ana@example.com
description:: VGhlIHF1aWNr
 IGJyb3du
memberOf: cn=staff,ou=groups,dc=example,dc=com
memberOf: cn=admins,ou=groups,dc=example,dc=com

dn: uid=ben,ou=people,dc=example,dc=com
cn: Ben
mail: ben@example.com

# a comment line
dn: uid=ops,ou=people,dc=example,dc=com
changetype: modify
cn: Ops
`;

function bytes(s: string = LDIF): Uint8Array {
	return new TextEncoder().encode(s);
}

describe("LDIF Parser & Engine", () => {
	it("unfolds, decodes base64, joins multi-values, skips directives", () => {
		const { columns, rows } = parseLdif(bytes());
		expect(columns[0]).toBe("dn");
		expect(columns).toContain("cn");
		expect(columns).toContain("memberOf");
		expect(rows).toHaveLength(3);
		expect(rows[0]?.[0]).toBe("uid=ana,ou=people,dc=example,dc=com");
		const cnIdx = columns.indexOf("cn");
		expect(rows[0]?.[cnIdx]).toBe("Ana Example | A. Example");
		const descIdx = columns.indexOf("description");
		expect(rows[0]?.[descIdx]).toBe("The quick brown");
		const memIdx = columns.indexOf("memberOf");
		expect(rows[0]?.[memIdx]).toContain("cn=staff");
		expect(rows[2]?.[cnIdx]).toBe("Ops");
	});

	it("emits BOM-headed CSV through the engine", async () => {
		expect(await ldifToCsvEngine.probe()).toBe(true);
		const out = await convertLdifToCsv(
			bytes().buffer.slice(0) as ArrayBuffer,
			() => {},
		);
		const raw = new Uint8Array(out);
		expect([raw[0], raw[1], raw[2]]).toEqual([0xef, 0xbb, 0xbf]);
		expect(new TextDecoder().decode(out)).toContain("uid=ana");
	});

	it("rejects non-LDIF input", () => {
		expect(() => parseLdif(bytes("just some text\nno entries"))).toThrow("dn:");
	});
});
