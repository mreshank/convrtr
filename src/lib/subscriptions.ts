/**
 * Subscription System & Audience Management.
 *
 * Local-first persistence for:
 * - Chrome Extension launch waitlist
 * - Ecosystem & product updates
 * - Engine format decoders and release notes
 * - Security & privacy compliance dispatches
 */

export type SubscriptionChannel =
	| "extension"
	| "ecosystem"
	| "releases"
	| "security";

export interface Subscriber {
	id: string;
	email: string;
	channels: SubscriptionChannel[];
	subscribedAt: number;
	status: "active" | "unsubscribed";
	source: "hero" | "extension-waitlist" | "footer" | "radar" | "admin";
	userAgent?: string;
}

const STORAGE_KEY = "convrtr_subscribers";
const INITIAL_WAITLIST_BENCHMARK = 1420;

// Benchmark seed subscribers for immediate telemetry in local-first environment
const SEED_SUBSCRIBERS: Subscriber[] = [
	{
		id: "sub-seed-1",
		email: "dev@acme-systems.io",
		channels: ["extension", "ecosystem"],
		subscribedAt: Date.now() - 86400000 * 5,
		status: "active",
		source: "extension-waitlist",
	},
	{
		id: "sub-seed-2",
		email: "alex.rivas@designcore.co",
		channels: ["extension", "releases"],
		subscribedAt: Date.now() - 86400000 * 3,
		status: "active",
		source: "hero",
	},
	{
		id: "sub-seed-3",
		email: "sec-ops@privacy-guard.org",
		channels: ["extension", "ecosystem", "security"],
		subscribedAt: Date.now() - 86400000 * 2,
		status: "active",
		source: "radar",
	},
	{
		id: "sub-seed-4",
		email: "engineer.marcus@metaverse-lab.jp",
		channels: ["releases", "extension"],
		subscribedAt: Date.now() - 86400000 * 1,
		status: "active",
		source: "extension-waitlist",
	},
];

export function getSubscribers(): Subscriber[] {
	if (typeof window === "undefined") return [...SEED_SUBSCRIBERS];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_SUBSCRIBERS));
			return [...SEED_SUBSCRIBERS];
		}
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed)) return parsed as Subscriber[];
	} catch {
		// Storage access restricted
	}
	return [...SEED_SUBSCRIBERS];
}

export function saveSubscribers(subscribers: Subscriber[]): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(subscribers));
	} catch {
		// Storage error
	}
}

export function subscribeUser(
	email: string,
	channels: SubscriptionChannel[] = ["extension", "ecosystem"],
	source: Subscriber["source"] = "extension-waitlist",
): { success: boolean; message: string; subscriber?: Subscriber } {
	const trimmed = email.trim().toLowerCase();
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(trimmed)) {
		return { success: false, message: "Please enter a valid email address." };
	}

	const list = getSubscribers();
	const existingIndex = list.findIndex(
		(s) => s.email.toLowerCase() === trimmed,
	);

	const existing = existingIndex >= 0 ? list[existingIndex] : undefined;
	if (existing) {
		const mergedChannels = Array.from(
			new Set([...existing.channels, ...channels]),
		);
		const updated: Subscriber = {
			...existing,
			channels: mergedChannels,
			status: "active",
		};
		list[existingIndex] = updated;
		saveSubscribers(list);
		return {
			success: true,
			message: "Subscription preferences updated successfully.",
			subscriber: updated,
		};
	}

	const newSub: Subscriber = {
		id: `sub-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`,
		email: trimmed,
		channels: channels.length > 0 ? channels : ["extension", "ecosystem"],
		subscribedAt: Date.now(),
		status: "active",
		source,
		userAgent:
			typeof navigator !== "undefined" ? navigator.userAgent : undefined,
	};

	list.unshift(newSub);
	saveSubscribers(list);
	return {
		success: true,
		message: "You are subscribed for Chrome Extension & ecosystem updates.",
		subscriber: newSub,
	};
}

export function deleteSubscriber(id: string): void {
	const list = getSubscribers().filter((s) => s.id !== id);
	saveSubscribers(list);
}

/**
 * Best-effort remote sync: POSTs the subscription to the first-party
 * Resend endpoint for double-opt-in / welcome email + Audience sync.
 * Local-first UX is authoritative — this never throws and never blocks
 * the UI. Returns true only on explicit 2xx.
 */
export async function syncSubscriptionRemote(
	email: string,
	channels: SubscriptionChannel[] = ["extension", "ecosystem"],
	source: Subscriber["source"] = "extension-waitlist",
): Promise<boolean> {
	try {
		if (typeof fetch === "undefined") return false;
		if (typeof navigator !== "undefined" && !navigator.onLine) return false;
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 8000);
		try {
			const res = await fetch("/api/subscribe", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify({ email, channels, source }),
				signal: controller.signal,
			});
			return res.ok;
		} finally {
			clearTimeout(timer);
		}
	} catch {
		return false;
	}
}

export function toggleSubscriberStatus(id: string): void {
	const list = getSubscribers();
	const sub = list.find((s) => s.id === id);
	if (sub) {
		sub.status = sub.status === "active" ? "unsubscribed" : "active";
		saveSubscribers(list);
	}
}

export function getSubscriptionStats(): {
	totalCount: number;
	benchmarkWaitlistTotal: number;
	extensionCount: number;
	ecosystemCount: number;
	releasesCount: number;
	activeRatio: number;
} {
	const list = getSubscribers();
	const activeList = list.filter((s) => s.status === "active");
	const extensionCount = activeList.filter((s) =>
		s.channels.includes("extension"),
	).length;
	const ecosystemCount = activeList.filter((s) =>
		s.channels.includes("ecosystem"),
	).length;
	const releasesCount = activeList.filter((s) =>
		s.channels.includes("releases"),
	).length;

	return {
		totalCount: list.length,
		benchmarkWaitlistTotal: INITIAL_WAITLIST_BENCHMARK + list.length,
		extensionCount,
		ecosystemCount,
		releasesCount,
		activeRatio: list.length > 0 ? activeList.length / list.length : 1,
	};
}

export function exportSubscribersCSV(): string {
	const list = getSubscribers();
	const header = "ID,Email,Channels,Status,SubscribedAt,Source\n";
	const rows = list
		.map(
			(s) =>
				`"${s.id}","${s.email}","${s.channels.join(";")}",` +
				`"${s.status}","${new Date(s.subscribedAt).toISOString()}","${s.source}"`,
		)
		.join("\n");
	return header + rows;
}

export function exportSubscribersJSON(): string {
	return JSON.stringify(getSubscribers(), null, 2);
}
