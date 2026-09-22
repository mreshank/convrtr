import { describe, expect, it } from "vitest";
import { convertSolToJson, parseSol } from "../parser";

describe("sol parser", () => {
	function createMockSol(name: string, payload: Uint8Array): Uint8Array {
		const nameBytes = new TextEncoder().encode(name);
		const totalLen = 16 + 2 + nameBytes.length + 4 + payload.length;
		const buf = new Uint8Array(totalLen);

		// Header 0x00 0xBF
		buf[0] = 0x00;
		buf[1] = 0xbf;

		// Total length (uint32 BE)
		buf[2] = (totalLen >> 24) & 0xff;
		buf[3] = (totalLen >> 16) & 0xff;
		buf[4] = (totalLen >> 8) & 0xff;
		buf[5] = totalLen & 0xff;

		// "TCSO"
		const tcso = new TextEncoder().encode("TCSO");
		buf.set(tcso, 6);

		// Padding / version (0x00 0x04 0x00 0x00)
		buf[10] = 0x00;
		buf[11] = 0x04;
		buf[12] = 0x00;
		buf[13] = 0x00;

		let pos = 14;
		// Name length (uint16 BE)
		buf[pos++] = (nameBytes.length >> 8) & 0xff;
		buf[pos++] = nameBytes.length & 0xff;
		buf.set(nameBytes, pos);
		pos += nameBytes.length;

		// 4 bytes padding
		buf[pos++] = 0x00;
		buf[pos++] = 0x00;
		buf[pos++] = 0x00;
		buf[pos++] = 0x00;

		buf.set(payload, pos);
		return buf;
	}

	it("parses string, number, and boolean properties", () => {
		// Payload:
		// Property 1: "highScore" (len=9) -> Number 9999
		// Property 2: "playerName" (len=10) -> String "Hero" (len=4)
		// Property 3: "isCompleted" (len=11) -> Boolean true (1)
		const prop1Key = new TextEncoder().encode("highScore");
		const prop2Key = new TextEncoder().encode("playerName");
		const prop2Val = new TextEncoder().encode("Hero");
		const prop3Key = new TextEncoder().encode("isCompleted");

		const payloadLen =
			2 +
			prop1Key.length +
			1 +
			8 +
			2 +
			prop2Key.length +
			1 +
			2 +
			prop2Val.length +
			2 +
			prop3Key.length +
			1 +
			1;

		const payload = new Uint8Array(payloadLen);
		let p = 0;

		// 1. highScore
		payload[p++] = (prop1Key.length >> 8) & 0xff;
		payload[p++] = prop1Key.length & 0xff;
		payload.set(prop1Key, p);
		p += prop1Key.length;
		payload[p++] = 0x00; // Number type
		const view = new DataView(
			payload.buffer,
			payload.byteOffset,
			payload.byteLength,
		);
		view.setFloat64(p, 9999, false);
		p += 8;

		// 2. playerName
		payload[p++] = (prop2Key.length >> 8) & 0xff;
		payload[p++] = prop2Key.length & 0xff;
		payload.set(prop2Key, p);
		p += prop2Key.length;
		payload[p++] = 0x02; // String type
		payload[p++] = (prop2Val.length >> 8) & 0xff;
		payload[p++] = prop2Val.length & 0xff;
		payload.set(prop2Val, p);
		p += prop2Val.length;

		// 3. isCompleted
		payload[p++] = (prop3Key.length >> 8) & 0xff;
		payload[p++] = prop3Key.length & 0xff;
		payload.set(prop3Key, p);
		p += prop3Key.length;
		payload[p++] = 0x01; // Boolean type
		payload[p++] = 0x01; // true

		const solBytes = createMockSol("gameSave", payload);
		const parsed = parseSol(solBytes);

		expect(parsed.name).toBe("gameSave");
		expect(parsed.data.highScore).toBe(9999);
		expect(parsed.data.playerName).toBe("Hero");
		expect(parsed.data.isCompleted).toBe(true);
	});

	it("converts Flash save to valid JSON string", () => {
		const key = new TextEncoder().encode("gold");
		const payload = new Uint8Array(2 + key.length + 1 + 8);
		payload[0] = 0x00;
		payload[1] = key.length;
		payload.set(key, 2);
		payload[2 + key.length] = 0x00;
		const view = new DataView(
			payload.buffer,
			payload.byteOffset,
			payload.byteLength,
		);
		view.setFloat64(2 + key.length + 1, 500, false);

		const solBytes = createMockSol("save", payload);
		const jsonBuf = convertSolToJson(solBytes.buffer as ArrayBuffer, true);
		const jsonStr = new TextDecoder().decode(jsonBuf);
		const obj = JSON.parse(jsonStr);

		expect(obj.gold).toBe(500);
	});

	it("throws on invalid header magic", () => {
		const bad = new Uint8Array(30);
		expect(() => parseSol(bad)).toThrow("Invalid .sol header");
	});
});
