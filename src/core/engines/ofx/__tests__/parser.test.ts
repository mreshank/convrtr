import { describe, expect, it } from "vitest";
import { ofxToCsvEngine } from "../index";
import { convertBankToCsv, parseBankFile } from "../parser";

const OFX = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKACCTFROM>
<ACCTID>12345678
</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240607120000.000[-4:EDT]
<TRNAMT>-12.50
<FITID>20240607001
<NAME>COFFEE SHOP
<MEMO>Oat latte, "large"
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240608
<TRNAMT>2000.00
<FITID>20240608001
<NAME>EMPLOYER
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`;

const QIF = `!Type:Bank
D06/07/2024
T-12.50
PCoffee Shop
MOat latte
^
D06/08/24
T2000.00
PEmployer
^
`;

function bytes(s: string): Uint8Array {
	return new TextEncoder().encode(s);
}

describe("Bank export (OFX/QIF) Parser & Engine", () => {
	it("parses OFX blocks with account, quoting and short dates", () => {
		const rows = parseBankFile(bytes(OFX));
		expect(rows).toHaveLength(2);
		expect(rows[0]).toMatchObject({
			date: "2024-06-07",
			type: "DEBIT",
			amount: "-12.50",
			fitId: "20240607001",
			name: "COFFEE SHOP",
			memo: 'Oat latte, "large"',
			account: "12345678",
		});
		expect(rows[1]?.date).toBe("2024-06-08");
	});

	it("parses QIF records including 2-digit years", () => {
		const rows = parseBankFile(bytes(QIF));
		expect(rows).toHaveLength(2);
		expect(rows[0]).toMatchObject({
			date: "2024-06-07",
			amount: "-12.50",
			name: "Coffee Shop",
		});
		expect(rows[1]?.date).toBe("2024-06-08");
	});

	it("emits BOM-headed RFC 4180 CSV through the engine", async () => {
		expect(await ofxToCsvEngine.probe()).toBe(true);
		const out = await convertBankToCsv(
			bytes(OFX).buffer.slice(0) as ArrayBuffer,
			() => {},
		);
		const raw = new Uint8Array(out);
		expect([raw[0], raw[1], raw[2]]).toEqual([0xef, 0xbb, 0xbf]); // UTF-8 BOM
		const csv = new TextDecoder().decode(out);
		expect(csv).toContain("date,type,amount,fitid,name,memo,account");
		expect(csv).toContain('"Oat latte, ""large"""');
	});

	it("rejects unknown bank files and empty OFX", () => {
		expect(() => parseBankFile(bytes("hello"))).toThrow(
			"Unrecognised bank file",
		);
		expect(() => parseBankFile(bytes("<OFX></OFX>"))).toThrow("no `<STMTTRN>`");
	});
});
