/**
 * Workspace Storage & Preset Management.
 *
 * Provides local-first persistence for:
 * - Offline workspace sessions (name, id, timestamp)
 * - User conversion preferences and quality presets
 * - Full workspace backup export and import (JSON)
 * - Browser storage quota estimation (IndexedDB / CacheStorage)
 */

export interface WorkspaceSession {
	id: string;
	name: string;
	createdAt: number;
}

export interface WorkspacePresets {
	concurrency: "auto" | 2 | 4 | 8;
	autoDownload: boolean;
	imageQuality: "lossless" | "balanced" | "compact";
	audioResample: "original" | "44100" | "48000";
}

export interface WorkspaceBackup {
	version: 1;
	exportedAt: number;
	session: WorkspaceSession | null;
	presets: WorkspacePresets;
	history: unknown[];
}

export const DEFAULT_PRESETS: WorkspacePresets = {
	concurrency: "auto",
	autoDownload: false,
	imageQuality: "lossless",
	audioResample: "original",
};

export const SESSION_KEY = "convrtr_workspace_session";
export const PRESETS_KEY = "convrtr_workspace_presets";
export const HISTORY_KEY = "convrtr_history";

export function getWorkspaceSession(): WorkspaceSession | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = localStorage.getItem(SESSION_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (
			parsed &&
			typeof parsed.id === "string" &&
			typeof parsed.name === "string"
		) {
			return parsed as WorkspaceSession;
		}
	} catch {
		// LocalStorage restricted or parsing failed
	}
	return null;
}

export function saveWorkspaceSession(session: WorkspaceSession): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(SESSION_KEY, JSON.stringify(session));
	} catch {
		// Storage error
	}
}

export function clearWorkspaceSession(): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.removeItem(SESSION_KEY);
	} catch {
		// Storage error
	}
}

export function getWorkspacePresets(): WorkspacePresets {
	if (typeof window === "undefined") return { ...DEFAULT_PRESETS };
	try {
		const raw = localStorage.getItem(PRESETS_KEY);
		if (!raw) return { ...DEFAULT_PRESETS };
		const parsed = JSON.parse(raw);
		return {
			concurrency:
				parsed.concurrency === 2 ||
				parsed.concurrency === 4 ||
				parsed.concurrency === 8 ||
				parsed.concurrency === "auto"
					? parsed.concurrency
					: DEFAULT_PRESETS.concurrency,
			autoDownload:
				typeof parsed.autoDownload === "boolean"
					? parsed.autoDownload
					: DEFAULT_PRESETS.autoDownload,
			imageQuality:
				parsed.imageQuality === "lossless" ||
				parsed.imageQuality === "balanced" ||
				parsed.imageQuality === "compact"
					? parsed.imageQuality
					: DEFAULT_PRESETS.imageQuality,
			audioResample:
				parsed.audioResample === "original" ||
				parsed.audioResample === "44100" ||
				parsed.audioResample === "48000"
					? parsed.audioResample
					: DEFAULT_PRESETS.audioResample,
		};
	} catch {
		return { ...DEFAULT_PRESETS };
	}
}

export function saveWorkspacePresets(
	updates: Partial<WorkspacePresets>,
): WorkspacePresets {
	const current = getWorkspacePresets();
	const next: WorkspacePresets = { ...current, ...updates };
	if (typeof window !== "undefined") {
		try {
			localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
		} catch {
			// Storage error
		}
	}
	return next;
}

export function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

export async function getStorageQuotaEstimate(): Promise<{
	used: string;
	quota: string;
	percent: number;
} | null> {
	if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
		return null;
	}
	try {
		const estimate = await navigator.storage.estimate();
		const usage = estimate.usage ?? 0;
		const quota = estimate.quota ?? 0;
		const percent = quota > 0 ? Math.min(100, (usage / quota) * 100) : 0;
		return {
			used: formatBytes(usage),
			quota: formatBytes(quota),
			percent: Math.round(percent * 10) / 10,
		};
	} catch {
		return null;
	}
}

export function exportWorkspaceBackup(): WorkspaceBackup {
	const session = getWorkspaceSession();
	const presets = getWorkspacePresets();
	let history: unknown[] = [];
	if (typeof window !== "undefined") {
		try {
			const raw = localStorage.getItem(HISTORY_KEY);
			if (raw) {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) history = parsed;
			}
		} catch {
			// Ignore read error
		}
	}

	return {
		version: 1,
		exportedAt: Date.now(),
		session,
		presets,
		history,
	};
}

export function triggerDownloadBackup(backup: WorkspaceBackup): void {
	if (typeof window === "undefined") return;
	const blob = new Blob([JSON.stringify(backup, null, 2)], {
		type: "application/json",
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	const dateStr = new Date().toISOString().split("T")[0];
	a.href = url;
	a.download = `convrtr-workspace-backup-${dateStr}.json`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

export function importWorkspaceBackup(jsonStr: string): {
	success: boolean;
	message: string;
	session?: WorkspaceSession | null;
	presets?: WorkspacePresets;
	historyCount?: number;
} {
	try {
		const parsed = JSON.parse(jsonStr);
		if (!parsed || typeof parsed !== "object" || parsed.version !== 1) {
			return {
				success: false,
				message:
					"Invalid workspace backup format: missing or unsupported version",
			};
		}

		if (parsed.session) {
			if (
				typeof parsed.session.id === "string" &&
				typeof parsed.session.name === "string"
			) {
				saveWorkspaceSession({
					id: parsed.session.id,
					name: parsed.session.name,
					createdAt: Number(parsed.session.createdAt) || Date.now(),
				});
			}
		}

		let savedPresets: WorkspacePresets | undefined;
		if (parsed.presets && typeof parsed.presets === "object") {
			savedPresets = saveWorkspacePresets(parsed.presets);
		}

		let historyCount = 0;
		if (Array.isArray(parsed.history) && typeof window !== "undefined") {
			localStorage.setItem(HISTORY_KEY, JSON.stringify(parsed.history));
			historyCount = parsed.history.length;
		}

		return {
			success: true,
			message: `Workspace backup restored (${historyCount} history items, custom presets imported)`,
			session: parsed.session ?? null,
			presets: savedPresets,
			historyCount,
		};
	} catch {
		return {
			success: false,
			message: "Failed to parse JSON backup file: syntax error",
		};
	}
}
