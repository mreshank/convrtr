/**
 * convrtr — Client-Side Session Persistence Engine
 *
 * Persists and restores active conversion queues and states across browsing contexts
 * (Side Panel, Quick Popup, Full Tab Studio) using IndexedDB.
 *
 * Adheres to strict Zero Emojis and Dieter Rams technical instrument guidelines.
 */

import type { ErrorCode } from "@/core/pipeline/protocol";

export interface SerializedItem {
	id: string;
	name: string;
	size: number;
	type: string;
	lastModified: number;
	fileData: ArrayBuffer;
	ext: string;
	selected: boolean;
	targetExt: string;
	targetId?: string;
	toolId?: string;
	customParams?: Record<string, number | string | boolean>;
	status: "idle" | "queued" | "converting" | "done" | "error" | "cancelled";
	ratio: number;
	phase: string;
	output?: ArrayBuffer;
	outputSize?: number;
	outputName?: string;
	durationMs?: number;
	errorDetail?: string;
	error?: { code: ErrorCode; message: string };
	lineage?: { parentName: string; step: number };
}

export interface PersistedSession {
	updatedAt: number;
	globalTarget: string;
	qualityPreset: string;
	configuredPreset: { from: string; to: string } | null;
	items: SerializedItem[];
}

const DB_NAME = "convrtr_session_db";
const STORE_NAME = "active_session_store";
const DB_VERSION = 1;
const SESSION_RECORD_KEY = "current_active_session";

function openSessionDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		if (typeof indexedDB === "undefined") {
			reject(new Error("IndexedDB is not supported in this environment"));
			return;
		}

		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME);
			}
		};

		request.onsuccess = () => {
			resolve(request.result);
		};

		request.onerror = () => {
			reject(request.error || new Error("Failed to open IndexedDB"));
		};
	});
}

/**
 * Persists the active session state including all file buffers and conversion outputs.
 */
export async function saveActiveSession(
	session: PersistedSession,
): Promise<void> {
	try {
		const db = await openSessionDb();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction([STORE_NAME], "readwrite");
			const store = transaction.objectStore(STORE_NAME);
			const putRequest = store.put(session, SESSION_RECORD_KEY);

			putRequest.onsuccess = () => {
				resolve();
			};

			putRequest.onerror = () => {
				reject(putRequest.error || new Error("Failed to write session record"));
			};

			transaction.oncomplete = () => {
				db.close();
			};
		});
	} catch (err) {
		console.warn("[convrtr:session] Failed to persist active session:", err);
	}
}

/**
 * Loads the currently persisted session from IndexedDB if available.
 */
export async function loadActiveSession(): Promise<PersistedSession | null> {
	try {
		const db = await openSessionDb();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction([STORE_NAME], "readonly");
			const store = transaction.objectStore(STORE_NAME);
			const getRequest = store.get(SESSION_RECORD_KEY);

			getRequest.onsuccess = () => {
				const result = getRequest.result as PersistedSession | undefined;
				resolve(result ?? null);
			};

			getRequest.onerror = () => {
				reject(getRequest.error || new Error("Failed to load session record"));
			};

			transaction.oncomplete = () => {
				db.close();
			};
		});
	} catch (err) {
		console.warn("[convrtr:session] Failed to load active session:", err);
		return null;
	}
}

/**
 * Clears the active session record from IndexedDB (e.g. on manual reset or queue wipe).
 */
export async function clearActiveSession(): Promise<void> {
	try {
		const db = await openSessionDb();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction([STORE_NAME], "readwrite");
			const store = transaction.objectStore(STORE_NAME);
			const deleteRequest = store.delete(SESSION_RECORD_KEY);

			deleteRequest.onsuccess = () => {
				resolve();
			};

			deleteRequest.onerror = () => {
				reject(
					deleteRequest.error || new Error("Failed to delete session record"),
				);
			};

			transaction.oncomplete = () => {
				db.close();
			};
		});
	} catch (err) {
		console.warn("[convrtr:session] Failed to clear active session:", err);
	}
}
