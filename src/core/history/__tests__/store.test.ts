import { beforeEach, describe, expect, it } from "vitest";
import {
	addHistoryRecord,
	calculateHistoryStats,
	clearHistory,
	exportHistoryAsCsv,
	exportHistoryAsJson,
	getHistory,
} from "../store";

describe("conversion history store", () => {
	beforeEach(() => {
		clearHistory();
	});

	it("adds and retrieves history records", () => {
		const record = addHistoryRecord({
			toolId: "audio/wav-to-mp3",
			category: "audio",
			inputName: "test.wav",
			inputSize: 1024,
			outputName: "test.mp3",
			outputSize: 512,
			durationMs: 120,
			status: "success",
		});

		const history = getHistory();
		expect(history.length).toBe(1);
		expect(history[0]?.id).toBe(record.id);
		expect(history[0]?.inputName).toBe("test.wav");
		expect(history[0]?.outputName).toBe("test.mp3");
	});

	it("prunes records older than retention period", () => {
		const oldTimestamp = Date.now() - 31 * 24 * 60 * 60 * 1000;
		addHistoryRecord({
			id: "old_rec",
			timestamp: oldTimestamp,
			toolId: "audio/flac-to-wav",
			category: "audio",
			inputName: "old.flac",
			inputSize: 2048,
			outputName: "old.wav",
			outputSize: 4096,
			durationMs: 200,
			status: "success",
		});

		addHistoryRecord({
			id: "recent_rec",
			timestamp: Date.now(),
			toolId: "image/avif-to-png",
			category: "image",
			inputName: "recent.avif",
			inputSize: 500,
			outputName: "recent.png",
			outputSize: 1500,
			durationMs: 50,
			status: "success",
		});

		const history = getHistory();
		expect(history.length).toBe(1);
		expect(history[0]?.id).toBe("recent_rec");
	});

	it("calculates history aggregate statistics correctly", () => {
		const records = [
			{
				id: "1",
				timestamp: Date.now(),
				toolId: "audio/wav-to-mp3",
				category: "audio",
				inputName: "a.wav",
				inputSize: 1000,
				outputName: "a.mp3",
				outputSize: 400,
				durationMs: 100,
				status: "success" as const,
			},
			{
				id: "2",
				timestamp: Date.now(),
				toolId: "document/rpa-to-zip",
				category: "document",
				inputName: "game.rpa",
				inputSize: 5000,
				outputName: "game.zip",
				outputSize: 4800,
				durationMs: 300,
				status: "success" as const,
			},
		];

		const stats = calculateHistoryStats(records);
		expect(stats.totalConversions).toBe(2);
		expect(stats.totalInputBytes).toBe(6000);
		expect(stats.totalOutputBytes).toBe(5200);
		expect(stats.totalDurationMs).toBe(400);
	});

	it("exports records to CSV format", () => {
		const records = [
			{
				id: "csv_test",
				timestamp: 1700000000000,
				toolId: "image/compress-jpg",
				category: "image",
				inputName: "photo.jpg",
				inputSize: 2000,
				outputName: "photo.min.jpg",
				outputSize: 1000,
				durationMs: 75,
				status: "success" as const,
			},
		];

		const csv = exportHistoryAsCsv(records);
		expect(csv).toContain("csv_test");
		expect(csv).toContain("image/compress-jpg");
		expect(csv).toContain("photo.jpg");
		expect(csv).toContain("photo.min.jpg");
		expect(csv).toContain("2000");
		expect(csv).toContain("1000");
	});

	it("exports records to JSON format", () => {
		const records = [
			{
				id: "json_test",
				timestamp: 1700000000000,
				toolId: "image/compress-jpg",
				category: "image",
				inputName: "photo.jpg",
				inputSize: 2000,
				outputName: "photo.min.jpg",
				outputSize: 1000,
				durationMs: 75,
				status: "success" as const,
			},
		];

		const json = exportHistoryAsJson(records);
		const parsed = JSON.parse(json);
		expect(parsed.length).toBe(1);
		expect(parsed[0].id).toBe("json_test");
		expect(parsed[0].toolId).toBe("image/compress-jpg");
	});

	it("clears history completely", () => {
		addHistoryRecord({
			toolId: "audio/trim-wav",
			category: "audio",
			inputName: "audio.wav",
			inputSize: 1024,
			outputName: "trimmed.wav",
			outputSize: 512,
			durationMs: 40,
			status: "success",
		});

		expect(getHistory().length).toBe(1);
		clearHistory();
		expect(getHistory().length).toBe(0);
	});
});
