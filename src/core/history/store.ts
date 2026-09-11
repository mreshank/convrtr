import type { ConversionHistoryRecord, HistoryStats } from "./types";

const STORAGE_KEY = "convrtr_conversion_history_v1";
export const DEFAULT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getStorage(): Storage | null {
	if (typeof window === "undefined") return null;
	try {
		return window.localStorage;
	} catch {
		return null;
	}
}

/**
 * Returns all saved conversion history records, pruned to the retention period.
 */
export function getHistory(
	retentionMs: number = DEFAULT_RETENTION_MS,
): ConversionHistoryRecord[] {
	const storage = getStorage();
	if (!storage) return [];

	try {
		const raw = storage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const records: ConversionHistoryRecord[] = JSON.parse(raw);
		const cutoff = Date.now() - retentionMs;
		const valid = records.filter((r) => r.timestamp >= cutoff);
		if (valid.length !== records.length) {
			storage.setItem(STORAGE_KEY, JSON.stringify(valid));
		}
		return valid.sort((a, b) => b.timestamp - a.timestamp);
	} catch {
		return [];
	}
}

/**
 * Adds a new conversion record to history, automatically pruning expired records.
 */
export function addHistoryRecord(
	record: Omit<ConversionHistoryRecord, "id" | "timestamp"> & {
		id?: string;
		timestamp?: number;
	},
	retentionMs: number = DEFAULT_RETENTION_MS,
): ConversionHistoryRecord {
	const storage = getStorage();
	const newRecord: ConversionHistoryRecord = {
		...record,
		id:
			record.id ??
			`rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
		timestamp: record.timestamp ?? Date.now(),
	};

	if (!storage) return newRecord;

	try {
		const existing = getHistory(retentionMs);
		const updated = [
			newRecord,
			...existing.filter((r) => r.id !== newRecord.id),
		];
		// Cap at maximum 500 records locally to prevent storage bloat
		const capped = updated.slice(0, 500);
		storage.setItem(STORAGE_KEY, JSON.stringify(capped));
		// Dispatch storage event or custom event for reactive UI update
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("convrtr-history-updated"));
		}
	} catch {
		// Ignore storage quota errors
	}

	return newRecord;
}

/**
 * Clears all recorded conversion history.
 */
export function clearHistory(): void {
	const storage = getStorage();
	if (!storage) return;
	try {
		storage.removeItem(STORAGE_KEY);
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("convrtr-history-updated"));
		}
	} catch {
		// Ignore
	}
}

/**
 * Computes aggregate statistics from the current history.
 */
export function calculateHistoryStats(
	records: ConversionHistoryRecord[],
): HistoryStats {
	return records.reduce(
		(acc, curr) => {
			acc.totalConversions += 1;
			acc.totalInputBytes += curr.inputSize || 0;
			acc.totalOutputBytes += curr.outputSize || 0;
			acc.totalDurationMs += curr.durationMs || 0;
			return acc;
		},
		{
			totalConversions: 0,
			totalInputBytes: 0,
			totalOutputBytes: 0,
			totalDurationMs: 0,
		},
	);
}

/**
 * Exports history records as a formatted CSV string.
 */
export function exportHistoryAsCsv(records: ConversionHistoryRecord[]): string {
	const headers = [
		"ID",
		"Timestamp",
		"Date (UTC)",
		"Tool ID",
		"Category",
		"Input Name",
		"Input Bytes",
		"Output Name",
		"Output Bytes",
		"Duration (ms)",
		"Status",
	];

	const rows = records.map((r) => [
		r.id,
		r.timestamp,
		new Date(r.timestamp).toISOString(),
		`"${r.toolId.replace(/"/g, '""')}"`,
		`"${r.category.replace(/"/g, '""')}"`,
		`"${r.inputName.replace(/"/g, '""')}"`,
		r.inputSize,
		`"${r.outputName.replace(/"/g, '""')}"`,
		r.outputSize,
		r.durationMs,
		r.status,
	]);

	return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}
