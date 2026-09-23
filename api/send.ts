/**
 * POST /api/send — transactional intake for contact / feedback / support_ticket.
 *
 * Accepts JSON metadata only. Never accepts file bytes, Blobs, or base64
 * payloads. Conversions stay 100% client-side; this endpoint only routes
 * the text a user typed into Resend.
 *
 * Body:
 * {
 *   type: "contact" | "feedback" | "support_ticket",
 *   topicOrCategory: string,
 *   name?: string, email?: string,
 *   subject?: string, message: string,
 *   rating?: number, recentError?: string,
 *   diagnosticReportMarkdown?: string
 * }
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
	checkRateLimit,
	escapeHtml,
	getClientIp,
	getMailFrom,
	getMailTo,
	getResend,
	isValidEmail,
	mailLayout,
	truncate,
} from "./_lib/mail";

type SendType = "contact" | "feedback" | "support_ticket";

const MAX_MESSAGE = 8000;
const MAX_DIAGNOSTICS = 20000;

interface SendBody {
	type?: SendType;
	topicOrCategory?: string;
	name?: string;
	email?: string;
	subject?: string;
	message?: string;
	rating?: number;
	recentError?: string;
	diagnosticReportMarkdown?: string;
}

function subjectFor(body: Required<Pick<SendBody, "type">> & SendBody): string {
	const prefix =
		body.type === "feedback"
			? `[FEEDBACK ${(body.topicOrCategory ?? "general").toUpperCase()}]`
			: body.type === "support_ticket"
				? `[SUPPORT ${(body.topicOrCategory ?? "general").toUpperCase()}]`
				: `[INQUIRY ${(body.topicOrCategory ?? "general").toUpperCase()}]`;
	const summary = (body.subject ?? body.message ?? "Project Communication")
		.trim()
		.slice(0, 80);
	return `${prefix} ${summary}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "POST") {
		res.setHeader("Allow", "POST");
		return res.status(405).json({ error: "Method not allowed" });
	}

	if (!process.env.RESEND_API_KEY) {
		return res.status(503).json({ error: "Mail service not configured" });
	}

	const ip = getClientIp(req);
	if (!checkRateLimit(`send:${ip}`, 10, 60_000)) {
		return res.status(429).json({ error: "Rate limit exceeded" });
	}

	const body = (req.body ?? {}) as SendBody;
	const type: SendType = body.type ?? "contact";

	if (!["contact", "feedback", "support_ticket"].includes(type)) {
		return res.status(400).json({ error: "Invalid type" });
	}
	const message = (body.message ?? "").trim();
	if (message.length < 2 || message.length > MAX_MESSAGE) {
		return res
			.status(400)
			.json({ error: `Message must be 2-${MAX_MESSAGE} characters` });
	}
	const topic = truncate((body.topicOrCategory ?? "general").trim(), 80);
	const senderEmail = (body.email ?? "").trim();
	if (senderEmail && !isValidEmail(senderEmail)) {
		return res.status(400).json({ error: "Invalid email" });
	}
	if (body.rating !== undefined) {
		const r = Number(body.rating);
		if (!Number.isFinite(r) || r < 1 || r > 5) {
			return res.status(400).json({ error: "Rating must be 1-5" });
		}
	}
	const diagnostics = body.diagnosticReportMarkdown
		? truncate(body.diagnosticReportMarkdown, MAX_DIAGNOSTICS)
		: "";

	const from = getMailFrom();
	const to = getMailTo();
	const subject = subjectFor({ ...body, type, message });
	const date = new Date().toISOString();

	const rows: Array<[string, string]> = [
		["Type", type.toUpperCase()],
		["Topic / Category", topic],
		["Date", date],
	];
	if (body.name) rows.push(["Sender", truncate(body.name.trim(), 120)]);
	if (senderEmail) rows.push(["Contact email", senderEmail.toLowerCase()]);
	if (body.rating !== undefined) rows.push(["Rating", `${body.rating}/5`]);

	const detailHtml = rows
		.map(
			([k, v]) =>
				`<div><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</div>`,
		)
		.join("");

	const maintainerHtml = mailLayout({
		eyebrow: `CONVRTR // ${type.toUpperCase()} INTAKE`,
		title: subject,
		bodyHtml: `${detailHtml}
      <h3 style="font-size:13px;margin:16px 0 8px;">MESSAGE</h3>
      <pre style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border:1px solid #ddd;">${escapeHtml(message)}</pre>
      ${
				body.recentError
					? `<h3 style="font-size:13px;margin:16px 0 8px;">RECENT CONVERSION ERROR</h3>
      <pre style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border:1px solid #ddd;">${escapeHtml(truncate(body.recentError, 4000))}</pre>`
					: ""
			}
      ${
				diagnostics
					? `<h3 style="font-size:13px;margin:16px 0 8px;">DIAGNOSTICS</h3>
      <pre style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border:1px solid #ddd;font-size:11px;">${escapeHtml(diagnostics)}</pre>`
					: ""
			}
      <p style="font-size:11px;color:#666;">Reply-To: ${escapeHtml(senderEmail || "not provided")}</p>`,
	});

	try {
		const resend = getResend();
		await resend.emails.send({
			from,
			to,
			subject,
			html: maintainerHtml,
			text: [
				`convrtr ${type}: ${topic}`,
				`Date: ${date}`,
				body.name ? `Sender: ${body.name}` : "",
				senderEmail ? `Contact: ${senderEmail}` : "",
				"",
				message,
				body.recentError ? `\nRecent error:\n${body.recentError}` : "",
				diagnostics ? `\nDiagnostics:\n${diagnostics}` : "",
			]
				.filter(Boolean)
				.join("\n"),
			replyTo: senderEmail || undefined,
		});

		// Auto-reply so the sender knows a human (not a queue) received it.
		if (senderEmail) {
			await resend.emails.send({
				from,
				to: senderEmail,
				subject: `Received — ${subject}`,
				html: mailLayout({
					eyebrow: "CONVRTR // RECEIPT CONFIRMED",
					title: "Message received",
					bodyHtml: `<p>Thanks — your ${escapeHtml(type.replace("_", " "))} on <strong>${escapeHtml(topic)}</strong> reached the maintainer inbox.</p>
          <pre style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border:1px solid #ddd;">${escapeHtml(truncate(message, 2000))}</pre>
          <p style="font-size:11px;color:#666;">No files were transmitted. Only the text above and optional diagnostics left your browser.</p>`,
				}),
				text: `Thanks — your ${type} on ${topic} reached the maintainer inbox.\n\n${truncate(message, 2000)}`,
			});
		}

		return res.status(200).json({ ok: true, via: "resend" });
	} catch (err) {
		console.error("[/api/send] resend error", err);
		return res.status(502).json({ error: "Mail dispatch failed" });
	}
}
