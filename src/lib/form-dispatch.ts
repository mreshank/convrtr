export interface FormPayload {
	type: "feedback" | "contact" | "support_ticket";
	name?: string;
	email?: string;
	topicOrCategory: string;
	subject?: string;
	message: string;
	rating?: number;
	recentError?: string;
	diagnosticReportMarkdown?: string;
}

export interface DispatchResult {
	success: boolean;
	mode: "online_transmitted" | "offline_queued" | "failed";
	mailtoUrl: string;
	ticketMarkdown: string;
	message: string;
}

const DEFAULT_RECEIVER_EMAIL = "contact@mreshank.com";
const DEFAULT_ENDPOINT = `https://formsubmit.co/ajax/${DEFAULT_RECEIVER_EMAIL}`;
const LOCAL_STORAGE_QUEUE_KEY = "convrtr_pending_submissions";
const RESEND_ENDPOINT = "/api/send";

/**
 * Fetches with a hard deadline.
 *
 * Without this a stalled network leaves the feedback form spinning forever, and
 * in non-browser test environments carrying a real fetch implementation a slow
 * or hanging endpoint does the same to the suite. The race rejects on the
 * timer rather than cancelling the request, so the caller's catch path decides
 * what a slow network means — for a form that is "queue locally and fall back
 * to mail", which is exactly the right behaviour for an endpoint that is down.
 */
async function postWithTimeout(
	endpoint: string,
	init: RequestInit,
	timeoutMs = 4000,
): Promise<Response> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timerPromise = new Promise<never>((_resolve, reject) => {
		timer = setTimeout(() => {
			reject(new DOMException("Request timed out", "AbortError"));
		}, timeoutMs);
	});
	try {
		return await Promise.race([fetch(endpoint, init), timerPromise]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}

/**
 * Formats a clean, readable Markdown ticket for the user to copy or submit to GitHub/email.
 */
export function buildTicketMarkdown(payload: FormPayload): string {
	const lines: string[] = [
		`# [CONVRTR] ${payload.type.toUpperCase()}: ${payload.subject || payload.topicOrCategory.toUpperCase()}`,
		"",
		`**Type**: ${payload.type.toUpperCase()}`,
		`**Topic / Category**: ${payload.topicOrCategory}`,
	];

	if (payload.rating !== undefined) {
		lines.push(`**Rating**: ${payload.rating}/5`);
	}
	if (payload.name) {
		lines.push(`**Sender**: ${payload.name}`);
	}
	if (payload.email) {
		lines.push(`**Contact Email**: ${payload.email}`);
	}

	lines.push(`**Date**: ${new Date().toISOString()}`);
	lines.push("");
	lines.push("### DETAILS");
	lines.push(payload.message.trim());

	if (payload.recentError) {
		lines.push("");
		lines.push("### RECENT CONVERSION ERROR DETECTED");
		lines.push("```text");
		lines.push(payload.recentError);
		lines.push("```");
	}

	if (payload.diagnosticReportMarkdown) {
		lines.push("");
		lines.push(payload.diagnosticReportMarkdown);
	}

	return lines.join("\n");
}

/**
 * Builds a valid mailto: URL pre-filled with the user's inquiry and diagnostics.
 */
export function buildMailtoUrl(payload: FormPayload): string {
	const subjectPrefix =
		payload.type === "feedback"
			? `[FEEDBACK ${payload.topicOrCategory.toUpperCase()}]`
			: payload.type === "support_ticket"
				? `[SUPPORT ${payload.topicOrCategory.toUpperCase()}]`
				: `[INQUIRY ${payload.topicOrCategory.toUpperCase()}]`;

	const subject = `${subjectPrefix} ${payload.subject || payload.message.slice(0, 40) || "Project Communication"}`;
	const body = buildTicketMarkdown(payload);

	return `mailto:${DEFAULT_RECEIVER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Dispatches form data. If online, posts to form service. If offline or error occurs,
 * queues locally and returns pre-filled mailto and markdown fallback.
 */
export async function dispatchFormSubmission(
	payload: FormPayload,
): Promise<DispatchResult> {
	const ticketMarkdown = buildTicketMarkdown(payload);
	const mailtoUrl = buildMailtoUrl(payload);
	const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

	// If offline, save directly to local queue
	if (!isOnline) {
		saveToPendingQueue(payload);
		return {
			success: true,
			mode: "offline_queued",
			mailtoUrl,
			ticketMarkdown,
			message:
				"DEVICE IS OFFLINE. Message recorded in local cache. You can dispatch via email or copy the ticket.",
		};
	}

	// 1. Primary: first-party Resend intake (same-origin JSON metadata only —
	// never file bytes). Falls through silently when the static preview has
	// no /api/* functions or the mail service is unconfigured.
	if (await postToResendIntake(payload)) {
		return {
			success: true,
			mode: "online_transmitted",
			mailtoUrl,
			ticketMarkdown,
			message:
				"TRANSMISSION SUCCESSFUL. Your message has been received by the project maintainer.",
		};
	}

	const endpoint = process.env.NEXT_PUBLIC_FORM_ENDPOINT || DEFAULT_ENDPOINT;

	try {
		const res = await postWithTimeout(endpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({
				_subject: `[convrtr ${payload.type.toUpperCase()}] ${payload.topicOrCategory}`,
				_replyto: payload.email || DEFAULT_RECEIVER_EMAIL,
				name: payload.name || "convrtr user",
				email: payload.email || "unspecified@convrtr.app",
				category: payload.topicOrCategory,
				rating: payload.rating,
				message: payload.message,
				recent_error: payload.recentError || "none",
				diagnostics: payload.diagnosticReportMarkdown || "none",
				submitted_at: new Date().toISOString(),
			}),
		});

		if (res.ok) {
			return {
				success: true,
				mode: "online_transmitted",
				mailtoUrl,
				ticketMarkdown,
				message:
					"TRANSMISSION SUCCESSFUL. Your message has been received by the project maintainer.",
			};
		}

		// Fallback on server response error
		saveToPendingQueue(payload);
		return {
			success: false,
			mode: "failed",
			mailtoUrl,
			ticketMarkdown,
			message:
				"NETWORK ENDPOINT UNREACHABLE. Saved to local cache. Please use mail client or copy ticket.",
		};
	} catch {
		// Fallback on fetch/network rejection
		saveToPendingQueue(payload);
		return {
			success: false,
			mode: "failed",
			mailtoUrl,
			ticketMarkdown,
			message:
				"NETWORK DISPATCH FAILED. Saved to local cache. Please use mail client or copy ticket.",
		};
	}
}

export function getPendingQueue(): Array<FormPayload & { queuedAt: string }> {
	if (typeof window === "undefined") return [];
	try {
		const raw = localStorage.getItem(LOCAL_STORAGE_QUEUE_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

export async function flushPendingSubmissions(): Promise<{
	flushedCount: number;
	failedCount: number;
}> {
	if (typeof window === "undefined" || !navigator.onLine) {
		return { flushedCount: 0, failedCount: 0 };
	}
	const queue = getPendingQueue();
	if (queue.length === 0) {
		return { flushedCount: 0, failedCount: 0 };
	}

	const endpoint = process.env.NEXT_PUBLIC_FORM_ENDPOINT || DEFAULT_ENDPOINT;
	const remaining: Array<FormPayload & { queuedAt: string }> = [];
	let flushedCount = 0;

	for (const item of queue) {
		// Queued items retry Resend first — same metadata-only contract.
		if (await postToResendIntake(item)) {
			flushedCount++;
			continue;
		}
		try {
			const res = await postWithTimeout(endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify({
					_subject: `[convrtr QUEUED ${item.type.toUpperCase()}] ${item.topicOrCategory}`,
					_replyto: item.email || DEFAULT_RECEIVER_EMAIL,
					name: item.name || "convrtr user",
					email: item.email || "unspecified@convrtr.app",
					category: item.topicOrCategory,
					rating: item.rating,
					message: item.message,
					recent_error: item.recentError || "none",
					diagnostics: item.diagnosticReportMarkdown || "none",
					queued_at: item.queuedAt,
					submitted_at: new Date().toISOString(),
				}),
			});
			if (res.ok) {
				flushedCount++;
			} else {
				remaining.push(item);
			}
		} catch {
			remaining.push(item);
		}
	}

	try {
		localStorage.setItem(LOCAL_STORAGE_QUEUE_KEY, JSON.stringify(remaining));
	} catch {
		// Ignore storage quota errors
	}

	return { flushedCount, failedCount: remaining.length };
}

function saveToPendingQueue(payload: FormPayload): void {
	if (typeof window === "undefined") return;
	try {
		const raw = localStorage.getItem(LOCAL_STORAGE_QUEUE_KEY);
		const list: Array<FormPayload & { queuedAt: string }> = raw
			? JSON.parse(raw)
			: [];
		list.push({
			...payload,
			queuedAt: new Date().toISOString(),
		});
		localStorage.setItem(
			LOCAL_STORAGE_QUEUE_KEY,
			JSON.stringify(list.slice(-30)),
		);
	} catch {
		// Ignore storage quota errors
	}
}

/**
 * Primary intake: first-party Resend endpoint (Vercel Function).
 *
 * Sends JSON metadata only — never file bytes. Returns true only on an
 * explicit 2xx; every other outcome (404 in static preview, 503 when the
 * mail service is unconfigured, timeout, offline) falls through so the
 * caller can try FormSubmit / local queue. Never throws.
 */
async function postToResendIntake(payload: FormPayload): Promise<boolean> {
	try {
		if (typeof fetch === "undefined") return false;
		const res = await postWithTimeout(
			RESEND_ENDPOINT,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify({
					type: payload.type,
					topicOrCategory: payload.topicOrCategory,
					name: payload.name,
					email: payload.email,
					subject: payload.subject,
					message: payload.message,
					rating: payload.rating,
					recentError: payload.recentError,
					diagnosticReportMarkdown: payload.diagnosticReportMarkdown,
				}),
			},
			8000,
		);
		return res.ok;
	} catch {
		return false;
	}
}
