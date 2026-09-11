import { beforeEach, describe, expect, it } from "vitest";
import {
	clearStagedFiles,
	consumeStagedFiles,
	createOutputFile,
	hasStagedFiles,
	stageFilesForConversion,
} from "../staging";

describe("staging service", () => {
	beforeEach(() => {
		clearStagedFiles();
	});

	it("creates a File object with proper name and MIME type", () => {
		const bytes = new Uint8Array([1, 2, 3, 4]).buffer;
		const file = createOutputFile(bytes, "test.mp4", "video/mp4");

		expect(file).toBeInstanceOf(File);
		expect(file.name).toBe("test.mp4");
		expect(file.type).toBe("video/mp4");
		expect(file.size).toBe(4);
	});

	it("stages and consumes files properly", () => {
		expect(hasStagedFiles()).toBe(false);
		expect(consumeStagedFiles()).toEqual([]);

		const file1 = new File(["foo"], "foo.mp4", { type: "video/mp4" });
		const file2 = new File(["bar"], "bar.mp4", { type: "video/mp4" });

		stageFilesForConversion([file1, file2]);
		expect(hasStagedFiles()).toBe(true);

		const consumed = consumeStagedFiles();
		expect(consumed).toHaveLength(2);
		expect(consumed[0]?.file.name).toBe("foo.mp4");
		expect(consumed[1]?.file.name).toBe("bar.mp4");

		// Staging queue should be cleared after consumption
		expect(hasStagedFiles()).toBe(false);
		expect(consumeStagedFiles()).toEqual([]);
	});

	it("supports rich StagedConversion with targetExt and lineage", () => {
		const file = new File(["data"], "clip.mp4", { type: "video/mp4" });
		stageFilesForConversion([
			{
				file,
				targetExt: "webm",
				parentName: "clip.mlw",
				step: 2,
			},
		]);

		expect(hasStagedFiles()).toBe(true);
		const consumed = consumeStagedFiles();
		expect(consumed).toHaveLength(1);
		expect(consumed[0]?.file.name).toBe("clip.mp4");
		expect(consumed[0]?.targetExt).toBe("webm");
		expect(consumed[0]?.parentName).toBe("clip.mlw");
		expect(consumed[0]?.step).toBe(2);
	});

	it("clears staged files on demand", () => {
		const file = new File(["baz"], "baz.webp", { type: "image/webp" });
		stageFilesForConversion([file]);
		expect(hasStagedFiles()).toBe(true);

		clearStagedFiles();
		expect(hasStagedFiles()).toBe(false);
		expect(consumeStagedFiles()).toEqual([]);
	});
});
