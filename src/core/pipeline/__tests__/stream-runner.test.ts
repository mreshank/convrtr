import { describe, expect, it, vi } from "vitest";
import type { StreamingEngine } from "@/core/engines/types";
import type { FileSink } from "@/core/io/sink";
import { runStreamingConversion } from "../stream-runner";

function fakeSink() {
	const calls: string[] = [];
	return {
		calls,
		sink: {
			sink: new WritableStream(),
			commit: async () => {
				calls.push("commit");
			},
			discard: async () => {
				calls.push("discard");
			},
		} satisfies FileSink,
	};
}

function fakeHandle(size: number) {
	return {
		getFile: async () => ({ size }) as File,
	} as unknown as FileSystemFileHandle;
}

function engineThat(behaviour: StreamingEngine["runStream"]): StreamingEngine {
	return {
		id: "video:mkv->mp4",
		probe: async () => true,
		run: async () => new ArrayBuffer(0),
		runStream: behaviour,
	};
}

describe("runStreamingConversion", () => {
	it("commits the file and reports its size on disk", async () => {
		const { sink, calls } = fakeSink();
		const engine = engineThat(async () => {});

		const bytes = await runStreamingConversion(
			engine,
			new Blob(["x"]),
			{},
			() => {},
			sink,
			fakeHandle(4096),
		);

		expect(calls).toEqual(["commit"]);
		expect(bytes).toBe(4096);
	});

	it("discards the file when the conversion throws, and never commits", async () => {
		const { sink, calls } = fakeSink();
		const engine = engineThat(async () => {
			throw new Error("codec died mid-file");
		});

		await expect(
			runStreamingConversion(
				engine,
				new Blob(["x"]),
				{},
				() => {},
				sink,
				fakeHandle(4096),
			),
		).rejects.toThrow("codec died mid-file");

		// The whole reason this function exists. A commit here would leave a
		// truncated video on disk that plays its opening seconds and then stops,
		// which is far worse than no file at all.
		expect(calls).toEqual(["discard"]);
	});

	it("reports the size from the file rather than from the bytes written", async () => {
		const { sink } = fakeSink();
		// A muxer patching its header writes the same offsets twice, so summing
		// writes would exceed the real file size.
		const engine = engineThat(async (_input, _params, _onProgress, target) => {
			const writer = target.getWriter();
			await writer.write({
				type: "write",
				position: 0,
				data: new Uint8Array(1000),
			});
			await writer.write({
				type: "write",
				position: 0,
				data: new Uint8Array(1000),
			});
			writer.releaseLock();
		});

		const bytes = await runStreamingConversion(
			engine,
			new Blob(["x"]),
			{},
			() => {},
			sink,
			fakeHandle(1000),
		);

		expect(bytes).toBe(1000);
	});

	it("passes progress through untouched so the UI can report the real phase", async () => {
		const { sink } = fakeSink();
		const seen: [number, string][] = [];
		const engine = engineThat(async (_input, _params, onProgress) => {
			onProgress(0.5, "COPY");
		});

		await runStreamingConversion(
			engine,
			new Blob(["x"]),
			{},
			(ratio, phase) => seen.push([ratio, phase]),
			sink,
			fakeHandle(10),
		);

		expect(seen).toEqual([[0.5, "COPY"]]);
	});

	it("hands the engine the params it was given", async () => {
		const { sink } = fakeSink();
		const runStream = vi.fn().mockResolvedValue(undefined);
		const engine: StreamingEngine = {
			id: "video:mkv->mp4",
			probe: async () => true,
			run: async () => new ArrayBuffer(0),
			runStream,
		};
		const input = new Blob(["x"]);

		await runStreamingConversion(
			engine,
			input,
			{ forceTranscode: true },
			() => {},
			sink,
			fakeHandle(10),
		);

		expect(runStream).toHaveBeenCalledWith(
			input,
			{ forceTranscode: true },
			expect.any(Function),
			sink.sink,
		);
	});
});
