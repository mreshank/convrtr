import { Resend } from "resend";

let resendSingleton: Resend | null = null;

export function getResend(): Resend {
	const apiKey = process.env.RESEND_API_KEY;
	if (!apiKey) {
		throw new Error("RESEND_API_KEY is not configured");
	}
	if (!resendSingleton) {
		resendSingleton = new Resend(apiKey);
	}
	return resendSingleton;
}

export function getMailFrom(): string {
	return (
		process.env.MAIL_FROM ??
		process.env.RESEND_FROM ??
		"hello@convrtr.mreshank.com"
	);
}

export function getMailTo(): string {
	return process.env.MAIL_TO ?? "contact@mreshank.com";
}

export function getAudienceId(): string | undefined {
	return process.env.RESEND_AUDIENCE_ID;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
	if (email.length > 254) return false;
	return EMAIL_RE.test(email.trim().toLowerCase());
}

export function truncate(input: string, max: number): string {
	if (input.length <= max) return input;
	return `${input.slice(0, max)}…`;
}

export function escapeHtml(input: string): string {
	return input
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/**
 * Minimal per-instance rate limiter for Vercel serverless.
 * Stateless across instances by design — this is best-effort abuse
 * protection on top of Resend's own limits, not a security boundary.
 */
const hits = new Map<string, number[]>();

export function checkRateLimit(
	key: string,
	limit = 10,
	windowMs = 60_000,
): boolean {
	const now = Date.now();
	const arr = hits.get(key) ?? [];
	const fresh = arr.filter((t) => now - t < windowMs);
	if (fresh.length >= limit) {
		hits.set(key, fresh);
		return false;
	}
	fresh.push(now);
	// Bound memory: drop oldest keys when the map grows.
	if (hits.size > 5000) {
		const oldest = [...hits.keys()].slice(0, 1000);
		for (const k of oldest) hits.delete(k);
	} else {
		hits.set(key, fresh);
	}
	return true;
}

export function getClientIp(req: {
	headers?: Record<string, string | string[] | undefined>;
}): string {
	const h = req.headers ?? {};
	const forwarded = h["x-forwarded-for"];
	if (typeof forwarded === "string" && forwarded.length > 0) {
		return forwarded.split(",")[0]?.trim() ?? "unknown";
	}
	if (Array.isArray(forwarded) && forwarded.length > 0) {
		return forwarded[0]?.split(",")[0]?.trim() ?? "unknown";
	}
	const realIp = h["x-real-ip"];
	if (typeof realIp === "string" && realIp.length > 0) return realIp;
	return "unknown";
}

export function verifyAdminSecret(req: {
	headers?: Record<string, string | string[] | undefined>;
}): boolean {
	const secret = process.env.ADMIN_API_SECRET;
	// Fail closed: without a configured secret the campaign endpoint
	// must not send anything.
	if (!secret) return false;
	const h = req.headers ?? {};
	const auth = h.authorization ?? h.Authorization;
	const value = Array.isArray(auth) ? auth[0] : auth;
	if (typeof value !== "string") return false;
	const token = value.startsWith("Bearer ") ? value.slice(7) : value;
	return token.length > 0 && token === secret;
}

export function mailLayout(params: {
	eyebrow: string;
	title: string;
	bodyHtml: string;
	footerNote?: string;
}): string {
	const footer =
		params.footerNote ??
		"convrtr runs 100% client-side. This email never contains file contents — only the metadata you submitted.";
	return `<!doctype html><html><body style="font-family:ui-monospace,Menlo,Consolas,monospace;background:#000;color:#111; margin:0;padding:24px;">
<div style="max-width:640px;margin:0 auto;background:#fff;border:2px solid #000;padding:24px;">
<div style="font-size:11px;letter-spacing:0.12em;color:#555;">${escapeHtml(params.eyebrow)}</div>
<h1 style="font-size:20px;margin:8px 0 16px;">${escapeHtml(params.title)}</h1>
<div style="font-size:13px;line-height:1.6;">${params.bodyHtml}</div>
<hr style="border:none;border-top:1px solid #ddd;margin:24px 0 12px;" />
<div style="font-size:11px;color:#666;">${escapeHtml(footer)}<br/>convrtr · https://convrtr.mreshank.com</div>
</div></body></html>`;
}
