import { describe, expect, it } from "vitest";
import { convertAdif, formatAdifCsv, parseAdif } from "../parser";

describe("adif parser", () => {
	const sampleAdif = `ADIF Export from Ham Radio Deluxe
<ADIF_VER:5>3.1.4
<PROGRAMID:3>HRD
<EOH>
<CALL:4>W1AW <QSO_DATE:8>20260921 <TIME_ON:6>123000 <BAND:3>20M <MODE:2>CW <FREQ:6>14.025 <RST_SENT:3>599 <RST_RCVD:3>599 <NAME:7>ARRL HQ <EOR>
<CALL:6>DL1ABC <QSO_DATE:8>20260921 <TIME_ON:6>123512 <BAND:3>40M <MODE:3>SSB <RST_SENT:2>59 <RST_RCVD:2>59 <QTH:6>Berlin <COMMENT:13>Nice QSO, 73! <EOR>
`;

	it("parses ADIF header and contact records correctly", () => {
		const adif = parseAdif(sampleAdif);
		expect(adif.records.length).toBe(2);

		const r1 = adif.records[0];
		expect(r1?.CALL).toBe("W1AW");
		expect(r1?.QSO_DATE).toBe("20260921");
		expect(r1?.BAND).toBe("20M");
		expect(r1?.MODE).toBe("CW");
		expect(r1?.NAME).toBe("ARRL HQ");

		const r2 = adif.records[1];
		expect(r2?.CALL).toBe("DL1ABC");
		expect(r2?.MODE).toBe("SSB");
		expect(r2?.QTH).toBe("Berlin");
		expect(r2?.COMMENT).toBe("Nice QSO, 73!");
	});

	it("exports RFC 4180 compliant CSV table", () => {
		const adif = parseAdif(sampleAdif);
		const csv = formatAdifCsv(adif);

		expect(csv).toContain(
			"QSO_DATE,TIME_ON,CALL,BAND,MODE,FREQ,RST_SENT,RST_RCVD,NAME,QTH,COMMENT",
		);
		expect(csv).toContain(
			"20260921,123000,W1AW,20M,CW,14.025,599,599,ARRL HQ,,",
		);
		expect(csv).toContain('"Nice QSO, 73!"');
	});

	it("converts through convertAdif helper for CSV and JSON", () => {
		const buffer = new TextEncoder().encode(sampleAdif).buffer as ArrayBuffer;

		const csvBuf = convertAdif(buffer, false);
		const csvStr = new TextDecoder().decode(csvBuf);
		expect(csvStr).toContain("W1AW");

		const jsonBuf = convertAdif(buffer, true);
		const jsonStr = new TextDecoder().decode(jsonBuf);
		const parsed = JSON.parse(jsonStr);
		expect(parsed.length).toBe(2);
		expect(parsed[0].CALL).toBe("W1AW");
	});

	it("handles ADIF without EOH header", () => {
		const bare = `<CALL:4>K1JT <QSO_DATE:8>20260922 <MODE:3>FT8 <EOR>`;
		const adif = parseAdif(bare);
		expect(adif.records.length).toBe(1);
		expect(adif.records[0]?.CALL).toBe("K1JT");
		expect(adif.records[0]?.MODE).toBe("FT8");
	});
});
