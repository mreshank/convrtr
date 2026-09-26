import {
	Field,
	Int32,
	List,
	Table,
	tableToIPC,
	vectorFromArray,
} from "apache-arrow";
import { describe, expect, it } from "vitest";
import { arrowToCsvEngine } from "../index";
import { dumpArrowToCsv } from "../parser";

function makeArrowIpc(): Uint8Array {
	const table = new Table({
		id: vectorFromArray([1, 2, 3], new Int32()),
		name: vectorFromArray(["a,b", 'q"q', "c"]),
		flag: vectorFromArray([true, false, true]),
		tags: vectorFromArray(
			[[1, 2], [], [3]],
			new List(new Field("item", new Int32())),
		),
	});
	const bytes = tableToIPC(table, "file");
	return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

describe("Arrow IPC dump Engine", () => {
	it("reads file-format batches into exact CSV", () => {
		const file = makeArrowIpc();
		const { columns, rowCount, csv } = dumpArrowToCsv(
			file.buffer.slice(
				file.byteOffset,
				file.byteOffset + file.byteLength,
			) as ArrayBuffer,
		);
		expect(columns).toEqual(["id", "name", "flag", "tags"]);
		expect(rowCount).toBe(3);
		expect(csv.charCodeAt(0)).toBe(0xfeff);
		expect(csv).toContain("id,name,flag,tags");
		expect(csv).toContain('"a,b",true,"[1,2]"');
		expect(csv).toContain('"q""q",false,[]');
	});

	it("exposes the same path through the engine", async () => {
		expect(await arrowToCsvEngine.probe()).toBe(true);
		const file = makeArrowIpc();
		const out = await arrowToCsvEngine.run(
			file.buffer.slice(
				file.byteOffset,
				file.byteOffset + file.byteLength,
			) as ArrayBuffer,
			{},
			() => {},
		);
		expect(new TextDecoder().decode(out)).toContain("id,name,flag,tags");
	});

	it("rejects non-Arrow input", () => {
		expect(() =>
			dumpArrowToCsv(
				new TextEncoder().encode("not arrow at all......")
					.buffer as ArrayBuffer,
			),
		).toThrow("Not Arrow IPC");
	});
});
