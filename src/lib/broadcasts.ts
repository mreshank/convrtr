/**
 * Broadcasts, Alerts & Notification System.
 *
 * Enables Super Admins to push, track, and manage:
 * - Top-level announcement banners (e.g. Chrome Extension live + release radar)
 * - Modal alerts & popups
 * - Floating notification toasts
 * - System updates and release reminders
 */

export type BroadcastType = "banner" | "popup" | "toast" | "reminder";
export type BroadcastLevel = "info" | "accent" | "warning" | "critical";
export type BroadcastTarget = "all" | "home" | "convert" | "tools";

export interface BroadcastMessage {
	id: string;
	type: BroadcastType;
	title: string;
	content: string;
	level: BroadcastLevel;
	target: BroadcastTarget;
	active: boolean;
	cta?: {
		label: string;
		href: string;
	};
	createdAt: number;
	expiresAt?: number;
	impressions: number;
	clicks: number;
	dismissible: boolean;
}

const STORAGE_KEY = "convrtr_broadcast_messages";
const DISMISSED_KEY = "convrtr_dismissed_broadcasts";

// Default system announcements
const INITIAL_BROADCASTS: BroadcastMessage[] = [
	{
		id: "broadcast-ext-live-01",
		type: "banner",
		title: "CHROME EXTENSION // NOW LIVE",
		content:
			"convrtr for Chrome is live. Install in 1 click — subscribe for release radar, new decoders, events, and engine updates.",
		level: "accent",
		target: "all",
		active: true,
		cta: {
			label: "GET RELEASE UPDATES ↗",
			href: "#extension-waitlist",
		},
		createdAt: Date.now() - 86400000 * 2,
		impressions: 4892,
		clicks: 614,
		dismissible: true,
	},
	{
		id: "broadcast-engine-release-02",
		type: "banner",
		title: "CORE ENGINE V0.2.1",
		content:
			"200 dedicated tools running 100% client-side WebAssembly with zero server telemetry.",
		level: "info",
		target: "convert",
		active: false,
		cta: {
			label: "HOW IT WORKS ➔",
			href: "/how-it-works",
		},
		createdAt: Date.now() - 86400000 * 7,
		impressions: 1204,
		clicks: 89,
		dismissible: true,
	},
];

export function getBroadcasts(): BroadcastMessage[] {
	if (typeof window === "undefined") return [...INITIAL_BROADCASTS];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BROADCASTS));
			return [...INITIAL_BROADCASTS];
		}
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed)) {
			// Migrate stale pre-launch banner cached in returning visitors.
			// Old ID `broadcast-ext-launch-01` ("launching soon / waitlist")
			// is replaced by `broadcast-ext-live-01` so the live copy shows.
			const hasStale = (parsed as BroadcastMessage[]).some(
				(m) => m?.id === "broadcast-ext-launch-01",
			);
			if (hasStale) {
				const migrated = (parsed as BroadcastMessage[]).filter(
					(m) => m?.id !== "broadcast-ext-launch-01",
				);
				if (!migrated.some((m) => m?.id === "broadcast-ext-live-01")) {
					migrated.unshift(...INITIAL_BROADCASTS);
				}
				localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
				return migrated;
			}
			return parsed as BroadcastMessage[];
		}
	} catch {
		// LocalStorage access restricted
	}
	return [...INITIAL_BROADCASTS];
}

export function saveBroadcasts(messages: BroadcastMessage[]): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
	} catch {
		// Storage error
	}
}

export function createBroadcast(
	input: Omit<BroadcastMessage, "id" | "createdAt" | "impressions" | "clicks">,
): BroadcastMessage {
	const messages = getBroadcasts();
	const newMsg: BroadcastMessage = {
		...input,
		id: `bc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
		createdAt: Date.now(),
		impressions: 0,
		clicks: 0,
	};
	messages.unshift(newMsg);
	saveBroadcasts(messages);
	return newMsg;
}

export function toggleBroadcastActive(id: string): void {
	const messages = getBroadcasts();
	const msg = messages.find((m) => m.id === id);
	if (msg) {
		msg.active = !msg.active;
		saveBroadcasts(messages);
	}
}

export function deleteBroadcast(id: string): void {
	const messages = getBroadcasts().filter((m) => m.id !== id);
	saveBroadcasts(messages);
}

export function trackBroadcastImpression(id: string): void {
	if (typeof window === "undefined") return;
	const messages = getBroadcasts();
	const msg = messages.find((m) => m.id === id);
	if (msg) {
		msg.impressions = (msg.impressions || 0) + 1;
		saveBroadcasts(messages);
	}
}

export function trackBroadcastClick(id: string): void {
	if (typeof window === "undefined") return;
	const messages = getBroadcasts();
	const msg = messages.find((m) => m.id === id);
	if (msg) {
		msg.clicks = (msg.clicks || 0) + 1;
		saveBroadcasts(messages);
	}
}

export function getDismissedBroadcastIds(): string[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = localStorage.getItem(DISMISSED_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

export function dismissBroadcast(id: string): void {
	if (typeof window === "undefined") return;
	try {
		const dismissed = getDismissedBroadcastIds();
		if (!dismissed.includes(id)) {
			dismissed.push(id);
			localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
		}
	} catch {
		// Storage error
	}
}

export function getActiveBroadcastsForPath(
	pathname: string,
): BroadcastMessage[] {
	const dismissed = getDismissedBroadcastIds();
	const messages = getBroadcasts();
	return messages.filter((m) => {
		if (!m.active) return false;
		if (dismissed.includes(m.id)) return false;
		if (m.target === "all") return true;
		if (m.target === "home" && (pathname === "/" || pathname === ""))
			return true;
		if (m.target === "convert" && pathname.startsWith("/convert")) return true;
		if (m.target === "tools" && pathname.startsWith("/tools")) return true;
		return false;
	});
}
