/**
 * Support tickets: user-raised and automatic.
 *
 * Two origins feed one local queue, which the admin dashboard's tickets tab
 * reads:
 *
 * - `user`: filed explicitly from `/support` after the visitor submits the
 *   ticket generator. Visible, opt-in, carries whatever they typed.
 * - `auto`: filed silently on every conversion failure by the instrument
 *   (`MasterConverterClient`, `ToolClient`). The visitor sees nothing change
 *   -- no prompt, no delay, no extra UI -- while the failure's full
 *   telemetry lands here and (subject to a per-signature cooldown) in the
 *   admin inbox via `/api/send`.
 *
 * Privacy: tickets carry file *metadata* (name, size, extension) -- never
 * bytes, never content. That matches `core/history` records, which already
 * persist `inputName`, and the `/api/send` contract, which accepts JSON
 * metadata only.
 */

export type TicketOrigin = "auto" | "user";
export type TicketSource = "website" | "extension";
export type TicketEmailStatus = "sent" | "throttled" | "failed" | "local-only";

/** Everything an admin needs to reproduce a failure without the file. */
export interface FailureTelemetry {
	/** Machine-readable taxonomy code (`ErrorCode`) or equivalent. */
	errorCode: string;
	/** Engine / pipeline error message. */
	errorMessage: string;
	/** Tool ids attempted, in pipeline order. Empty for non-tool jobs. */
	toolIds: string[];
	/** Named operation for jobs with no tool (e.g. `merge-pdf`). */
	operation?: string;
	/** Index into `toolIds` of the step that threw, if known. */
	failedStepIndex?: number;
	/** Source file metadata -- never bytes. */
	fileName: string;
	fileSize: number;
	inputExt: string;
	/** Requested target (ext or tool id). */
	target?: string;
	/** Multi-hop chain (`StagedConversion.lineage`), when chained. */
	lineage?: { parentName: string; step: number };
	/** Quality preset active at failure time. */
	presetId?: string;
	/** Wall-clock conversion time before failure, when measured. */
	durationMs?: number;
	/** Page / surface where it failed. */
	path?: string;
	userAgent?: string;
	cores?: number;
	/** Full system-diagnostics markdown, when collected. */
	systemMarkdown?: string;
}

export interface SupportTicket {
	id: string;
	createdAt: number;
	origin: TicketOrigin;
	source: TicketSource;
	topic: string;
	summary: string;
	/** Only on `user` tickets: what the visitor wrote. */
	userMessage?: string;
	telemetry: FailureTelemetry;
	email: TicketEmailStatus;
}

const STORE_KEY = "convrtr_support_tickets_v1";
const COOLDOWN_KEY = "convrtr_auto_ticket_cooldown_v1";
const STAGED_KEY = "convrtr_staged_error_report_v1";
/** Local queue cap: failures are frequent, admin attention is not. */
const MAX_STORED = 200;
/** One admin email per failure signature per hour; the local queue still
 * records every occurrence, so throttling mail never loses signal. */
const EMAIL_COOLDOWN_MS = 60 * 60 * 1000;
const EMAIL_TIMEOUT_MS = 4000;

function storage(): Storage | null {
	if (typeof window === "undefined") return null;
	try {
		return window.sessionStorage && window.localStorage;
	} catch {
		return null;
	}
}

function makeId(prefix: string): string {
	return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Failure signature for email cooldown: same tool + code + step = same bug. */
function signatureOf(t: FailureTelemetry): string {
	return [
		t.toolIds.join(">") || t.operation || "unknown",
		t.errorCode,
		t.failedStepIndex ?? "-",
	].join("|");
}

export function getTickets(): SupportTicket[] {
	const store = storage();
	if (!store) return [];
	try {
		const raw = store.getItem(STORE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return (parsed as SupportTicket[]).sort(
			(a, b) => b.createdAt - a.createdAt,
		);
	} catch {
		return [];
	}
}

function saveTickets(tickets: SupportTicket[]): void {
	const store = storage();
	if (!store) return;
	try {
		store.setItem(STORE_KEY, JSON.stringify(tickets.slice(0, MAX_STORED)));
	} catch {
		// Quota: drop oldest silently -- the queue is diagnostic, not data.
		try {
			store.setItem(STORE_KEY, JSON.stringify(tickets.slice(0, 50)));
		} catch {
			// Unavailable storage; the email path below still fires.
		}
	}
}

export function clearTickets(): void {
	const store = storage();
	if (!store) return;
	try {
		store.removeItem(STORE_KEY);
	} catch {
		// Unavailable storage.
	}
}

function cooldownHit(signature: string): boolean {
	const store = storage();
	if (!store) return false;
	try {
		const raw = store.getItem(COOLDOWN_KEY);
		if (!raw) return false;
		const map = JSON.parse(raw) as Record<string, number>;
		const last = map[signature];
		return typeof last === "number" && Date.now() - last < EMAIL_COOLDOWN_MS;
	} catch {
		return false;
	}
}

function markCooldown(signature: string): void {
	const store = storage();
	if (!store) return;
	try {
		const raw = store.getItem(COOLDOWN_KEY);
		const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
		map[signature] = Date.now();
		store.setItem(COOLDOWN_KEY, JSON.stringify(map));
	} catch {
		// Unavailable storage.
	}
}

export function buildAutoTicketMarkdown(ticket: SupportTicket): string {
	const t = ticket.telemetry;
	const lines = [
		`# [CONVRTR] AUTO-FAILURE: ${t.toolIds.join(" > ") || t.operation || "unknown"} — ${t.errorCode}`,
		"",
		`**Ticket**: ${ticket.id}`,
		`**Date**: ${new Date(ticket.createdAt).toISOString()}`,
		`**Source**: ${ticket.source} (automatic, visitor not interrupted)`,
		"",
		"## FAILURE CHAIN",
		`- Error: \`${t.errorCode}\` — ${t.errorMessage}`,
		`- Pipeline: ${t.toolIds.length > 0 ? t.toolIds.map((id, i) => (i === t.failedStepIndex ? `[${id} <- FAILED]` : id)).join(" > ") : (t.operation ?? "unknown")}`,
		t.lineage
			? `- Process chain: step ${t.lineage.step} chained from \`${t.lineage.parentName}\``
			: "- Process chain: single conversion (no chaining)",
		t.durationMs !== undefined ? `- Time to failure: ${t.durationMs}ms` : null,
		"",
		"## INPUT (metadata only, never bytes)",
		`- File: \`${t.fileName}\` (${t.fileSize} bytes, .${t.inputExt})`,
		t.target ? `- Target: \`${t.target}\`` : null,
		t.presetId ? `- Quality preset: \`${t.presetId}\`` : null,
		"",
		"## ENVIRONMENT",
		t.path ? `- Path: \`${t.path}\`` : null,
		t.cores !== undefined ? `- Cores: ${t.cores}` : null,
		t.userAgent ? `- UA: ${t.userAgent}` : null,
		t.systemMarkdown ? "" : null,
		t.systemMarkdown ? t.systemMarkdown : null,
	].filter((line): line is string => line !== null);
	return lines.join("\n");
}

async function sendAdminAlert(
	ticket: SupportTicket,
): Promise<TicketEmailStatus> {
	const signature = signatureOf(ticket.telemetry);
	if (cooldownHit(signature)) return "throttled";
	try {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS);
		let res: Response;
		try {
			res = await fetch("/api/send", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					type: "support_ticket",
					topicOrCategory: "auto-failure",
					subject: `[AUTO] ${ticket.telemetry.toolIds.join(" > ") || ticket.telemetry.operation || "unknown"} — ${ticket.telemetry.errorCode}`,
					message: ticket.summary,
					diagnosticReportMarkdown: buildAutoTicketMarkdown(ticket),
				}),
				signal: controller.signal,
			});
		} finally {
			clearTimeout(timer);
		}
		if (!res.ok) return "failed";
		markCooldown(signature);
		return "sent";
	} catch {
		// Static preview without /api/*, offline, or mail unconfigured --
		// the local queue below is the fallback, never an error.
		return "local-only";
	}
}

/**
 * File an automatic ticket for a failed conversion. Never throws, never
 * touches the UI: the visitor's retry/dismiss flow continues untouched
 * while telemetry lands in the local queue and (cooldown permitting) the
 * admin inbox. Fire-and-forget -- callers must not await it.
 */
export function fileAutoTicket(
	telemetry: FailureTelemetry,
	source: TicketSource = "website",
): SupportTicket | null {
	try {
		const ticket: SupportTicket = {
			id: makeId("auto"),
			createdAt: Date.now(),
			origin: "auto",
			source,
			topic: "auto-failure",
			summary: `${telemetry.toolIds.join(" > ") || telemetry.operation || "conversion"} failed (${telemetry.errorCode}): ${telemetry.fileName}`,
			telemetry: {
				...telemetry,
				path:
					telemetry.path ??
					(typeof window !== "undefined"
						? window.location.pathname
						: undefined),
				userAgent:
					telemetry.userAgent ??
					(typeof navigator !== "undefined" ? navigator.userAgent : undefined),
				cores:
					telemetry.cores ??
					(typeof navigator !== "undefined"
						? navigator.hardwareConcurrency
						: undefined),
			},
			email: "local-only",
		};
		saveTickets([ticket, ...getTickets()]);
		// Email resolves after the store write so the queue never depends
		// on the network; status is patched in when it settles.
		void sendAdminAlert(ticket).then((status) => {
			try {
				const tickets = getTickets().map((t) =>
					t.id === ticket.id ? { ...t, email: status } : t,
				);
				saveTickets(tickets);
			} catch {
				// Store patch is best-effort.
			}
		});
		return ticket;
	} catch {
		return null;
	}
}

/** Persist a visitor-submitted ticket alongside auto ones for one admin queue. */
export function saveUserTicket(input: {
	topic: string;
	summary: string;
	userMessage?: string;
	source?: TicketSource;
	telemetry: FailureTelemetry;
	email?: TicketEmailStatus;
}): SupportTicket | null {
	try {
		const ticket: SupportTicket = {
			id: makeId("user"),
			createdAt: Date.now(),
			origin: "user",
			source: input.source ?? "website",
			topic: input.topic,
			summary: input.summary,
			userMessage: input.userMessage,
			telemetry: input.telemetry,
			email: input.email ?? "sent",
		};
		saveTickets([ticket, ...getTickets()]);
		return ticket;
	} catch {
		return null;
	}
}

export interface StagedErrorReport {
	toolId: string;
	code: string;
	message: string;
	inputName?: string;
	stagedAt: number;
}

/**
 * Handoff from an `ErrorPanel` "report issue" action to `/support`: the
 * panel stages the failure, navigates, and the support page consumes it to
 * prefill the ticket generator. Session-scoped -- a staged report never
 * survives a tab close, and consuming deletes it.
 */
export function stageErrorReport(
	report: Omit<StagedErrorReport, "stagedAt">,
): void {
	try {
		if (typeof window === "undefined") return;
		window.sessionStorage.setItem(
			STAGED_KEY,
			JSON.stringify({ ...report, stagedAt: Date.now() }),
		);
	} catch {
		// Storage unavailable; the support page works unprefilled.
	}
}

export function consumeStagedErrorReport(): StagedErrorReport | null {
	try {
		if (typeof window === "undefined") return null;
		const raw = window.sessionStorage.getItem(STAGED_KEY);
		if (!raw) return null;
		window.sessionStorage.removeItem(STAGED_KEY);
		const parsed = JSON.parse(raw) as StagedErrorReport;
		if (!parsed || typeof parsed.toolId !== "string") return null;
		return parsed;
	} catch {
		return null;
	}
}
