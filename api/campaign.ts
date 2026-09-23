/**
 * POST /api/campaign — admin-only broadcast email.
 *
 * Protected by ADMIN_API_SECRET (Bearer token, fail-closed). The subscriber
 * list lives in the admin's browser (localStorage-first), so the client
 * supplies the explicit recipient list; the server validates, caps, and
 * batch-sends via Resend. No file bytes are ever accepted here.
 *
 * Body: { subject: string, bodyMarkdown: string, recipients: string[] }
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
	checkRateLimit,
	escapeHtml,
	getClientIp,
	getMailFrom,
	getResend,
	isValidEmail,
	mailLayout,
	truncate,
	verifyAdminSecret,
} from "./_lib/mail";

const MAX_RECIPIENTS = 500;
const MAX_SUBJECT = 140;
const MAX_BODY = 20000;

function renderMarkdownLite(md: string): string {
	// Tiny safe renderer: paragraphs + line breaks only. Campaign bodies are
	// admin-authored; escaping first keeps this injection-safe by construction.
	return escapeHtml(md)
		.split(/\n{2,}/)
		.map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
		.join("");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "POST") {
		res.setHeader("Allow", "POST");
		return res.status(405).json({ error: "Method not allowed" });
	}
	if (!process.env.RESEND_API_KEY) {
		return res.status(503).json({ error: "Mail service not configured" });
	}
	if (!verifyAdminSecret(req)) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	const ip = getClientIp(req);
	if (!checkRateLimit(`campaign:${ip}`, 5, 60_000)) {
		return res.status(429).json({ error: "Rate limit exceeded" });
	}

	const subject = truncate(String(req.body?.subject ?? "").trim(), MAX_SUBJECT);
	const bodyMarkdown = String(req.body?.bodyMarkdown ?? req.body?.body ?? "");
	const rawRecipients: unknown[] = Array.isArray(req.body?.recipients)
		? (req.body.recipients as unknown[])
		: [];

	if (subject.length < 4) {
		return res.status(400).json({ error: "Subject too short" });
	}
	if (bodyMarkdown.trim().length < 4 || bodyMarkdown.length > MAX_BODY) {
		return res.status(400).json({ error: "Body must be 4-20000 characters" });
	}

	const recipients: string[] = [
		...new Set(
			rawRecipients
				.map((r) => String(r).trim().toLowerCase())
				.filter((e) => isValidEmail(e)),
		),
	].slice(0, MAX_RECIPIENTS);

	if (recipients.length === 0) {
		return res.status(400).json({ error: "No valid recipients" });
	}

	const from = getMailFrom();
	const html = mailLayout({
		eyebrow: "CONVRTR // RELEASE DISPATCH",
		title: subject,
		bodyHtml: renderMarkdownLite(truncate(bodyMarkdown, MAX_BODY)),
		footerNote:
			"You received this because you subscribed on convrtr.mreshank.com. Reply to unsubscribe.",
	});
	const text = `${subject}\n\n${truncate(bodyMarkdown, MAX_BODY)}`;

	try {
		const resend = getResend();
		// Resend batch API accepts up to 100 messages per call.
		const chunks: string[][] = [];
		for (let i = 0; i < recipients.length; i += 100) {
			chunks.push(recipients.slice(i, i + 100));
		}
		let sent = 0;
		for (const chunk of chunks) {
			const batch = chunk.map((to) => ({ from, to, subject, html, text }));
			const result = await resend.batch.send(batch);
			if (result.error) throw result.error;
			sent += chunk.length;
		}
		return res.status(200).json({ ok: true, sent });
	} catch (err) {
		console.error("[/api/campaign] resend error", err);
		return res.status(502).json({ error: "Campaign dispatch failed" });
	}
}
