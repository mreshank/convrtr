import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearWorkspaceSession,
	DEFAULT_PRESETS,
	exportWorkspaceBackup,
	formatBytes,
	getStorageQuotaEstimate,
	getWorkspacePresets,
	getWorkspaceSession,
	HISTORY_KEY,
	importWorkspaceBackup,
	saveWorkspacePresets,
	saveWorkspaceSession,
	triggerDownloadBackup,
} from "../workspace-storage";

describe("workspace-storage utility", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.restoreAllMocks();
	});

	afterEach(() => {
		localStorage.clear();
		vi.restoreAllMocks();
	});

	describe("session management", () => {
		it("returns null when no session is stored", () => {
			expect(getWorkspaceSession()).toBeNull();
		});

		it("saves and retrieves a valid workspace session", () => {
			const session = {
				id: "ws-test-123",
				name: "Audio Mastering Lab",
				createdAt: 1700000000,
			};
			saveWorkspaceSession(session);
			expect(getWorkspaceSession()).toEqual(session);
		});

		it("clears active workspace session", () => {
			saveWorkspaceSession({
				id: "ws-1",
				name: "Lab",
				createdAt: 1700000000,
			});
			expect(getWorkspaceSession()).not.toBeNull();

			clearWorkspaceSession();
			expect(getWorkspaceSession()).toBeNull();
		});
	});

	describe("presets management", () => {
		it("returns default presets when none are stored", () => {
			expect(getWorkspacePresets()).toEqual(DEFAULT_PRESETS);
		});

		it("updates and persists partial presets", () => {
			const updated = saveWorkspacePresets({
				concurrency: 8,
				autoDownload: true,
				imageQuality: "balanced",
				audioResample: "48000",
			});

			expect(updated).toEqual({
				concurrency: 8,
				autoDownload: true,
				imageQuality: "balanced",
				audioResample: "48000",
			});

			expect(getWorkspacePresets()).toEqual(updated);
		});
	});

	describe("formatBytes helper", () => {
		it("formats byte values cleanly", () => {
			expect(formatBytes(0)).toBe("0 B");
			expect(formatBytes(1024)).toBe("1 KB");
			expect(formatBytes(1024 * 1024 * 5.5)).toBe("5.5 MB");
			expect(formatBytes(1024 * 1024 * 1024 * 2)).toBe("2 GB");
		});
	});

	describe("storage quota estimate", () => {
		it("returns null if navigator.storage is undefined", async () => {
			const original = navigator.storage;
			// @ts-expect-error mocking storage
			navigator.storage = undefined;

			const result = await getStorageQuotaEstimate();
			expect(result).toBeNull();

			// @ts-expect-error restore storage
			navigator.storage = original;
		});

		it("computes usage and quota if navigator.storage.estimate is available", async () => {
			const estimateMock = vi.fn().mockResolvedValue({
				usage: 1024 * 1024 * 10, // 10 MB
				quota: 1024 * 1024 * 1000, // 1000 MB
			});

			// @ts-expect-error mocking storage
			navigator.storage = { estimate: estimateMock };

			const result = await getStorageQuotaEstimate();
			expect(result).toBeDefined();
			expect(result?.used).toBe("10 MB");
			expect(result?.quota).toBe("1000 MB");
			expect(result?.percent).toBe(1);
		});
	});

	describe("backup export and import", () => {
		it("exports workspace session, presets, and history", () => {
			saveWorkspaceSession({
				id: "ws-exp",
				name: "Export Lab",
				createdAt: 123456,
			});
			saveWorkspacePresets({ concurrency: 4, autoDownload: true });
			localStorage.setItem(
				HISTORY_KEY,
				JSON.stringify([{ id: "conv-1", tool: "669-to-wav" }]),
			);

			const backup = exportWorkspaceBackup();
			expect(backup.version).toBe(1);
			expect(backup.session?.name).toBe("Export Lab");
			expect(backup.presets.concurrency).toBe(4);
			expect(backup.presets.autoDownload).toBe(true);
			expect(backup.history.length).toBe(1);
		});

		it("imports and restores backup cleanly", () => {
			const backup = {
				version: 1,
				exportedAt: Date.now(),
				session: {
					id: "ws-imp",
					name: "Imported Studio",
					createdAt: 999999,
				},
				presets: {
					concurrency: 2,
					autoDownload: false,
					imageQuality: "compact",
					audioResample: "44100",
				},
				history: [
					{ id: "h1", file: "track.669" },
					{ id: "h2", file: "report.hwp" },
				],
			};

			const res = importWorkspaceBackup(JSON.stringify(backup));
			expect(res.success).toBe(true);
			expect(res.session?.name).toBe("Imported Studio");
			expect(res.historyCount).toBe(2);

			expect(getWorkspaceSession()?.id).toBe("ws-imp");
			expect(getWorkspacePresets().imageQuality).toBe("compact");
			expect(JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]").length).toBe(
				2,
			);
		});

		it("rejects invalid JSON backup payload", () => {
			const res = importWorkspaceBackup("not a json string");
			expect(res.success).toBe(false);
			expect(res.message).toContain("syntax error");
		});

		it("rejects unsupported backup versions", () => {
			const res = importWorkspaceBackup(JSON.stringify({ version: 99 }));
			expect(res.success).toBe(false);
			expect(res.message).toContain("missing or unsupported version");
		});

		it("triggerDownloadBackup creates a link and triggers download without throwing", () => {
			const backup = exportWorkspaceBackup();
			expect(() => triggerDownloadBackup(backup)).not.toThrow();
		});
	});
});
