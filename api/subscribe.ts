/**
 * POST /api/subscribe — release radar / newsletter subscribe.
 *
 * Keeps the existing localStorage-first UX intact: the client still writes
 * locally, then POSTs here for the real double-opt-in + welcome email and
 * optional Resend Audience sync.
 *
 * Body: { email: string, channels?: string[], source?: string }
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
	checkRateLimit,
	escapeHtml,
	getAudienceId,
	getClientIp,
	getMailFrom,
	getResend,
	isValidEmail,
	mailLayout,
	truncate,
} from "./_lib/mail";

const ALLOWED_CHANNELS = new Set([
	"extension",
	"ecosystem",
	"releases",
	"security",
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "POST") {
		res.setHeader("Allow", "POST");
		return res.status(405).json({ error: "Method not allowed" });
	}
	if (!process.env.RESEND_API_KEY) {
		return res.status(503).json({ error: "Mail service not configured" });
	}

	const ip = getClientIp(req);
	if (!checkRateLimit(`subscribe:${ip}`, 10, 60_000)) {
		return res.status(429).json({ error: "Rate limit exceeded" });
	}

	const rawEmail = String(req.body?.email ?? "")
		.trim()
		.toLowerCase();
	if (!isValidEmail(rawEmail)) {
		return res.status(400).json({ error: "Invalid email" });
	}
	const rawChannels: unknown[] = Array.isArray(req.body?.channels)
		? (req.body.channels as unknown[])
		: [];
	const channels =
		rawChannels.length > 0
			? [
					...new Set(
						rawChannels
							.map((c) => String(c))
							.filter((c) => ALLOWED_CHANNELS.has(c)),
					),
				].slice(0, 4)
			: ["extension", "ecosystem"];
	const source = truncate(String(req.body?.source ?? "website"), 60);

	const from = getMailFrom();
	const channelList = channels.length > 0 ? channels.join(", ") : "extension";

	try {
		const resend = getResend();

		// Optional Audience sync — skipped silently when no audience is configured.
		const audienceId = getAudienceId();
		if (audienceId) {
			try {
				await resend.contacts.create({
					email: rawEmail,
					audienceId,
					unsubscribed: false,
				});
			} catch (err) {
				// Contact may already exist — not fatal for the welcome email.
				console.warn("[/api/subscribe] audience sync skipped", err);
			}
		}

		const unsubscribeUrl = `https://convrtr.mreshank.com/api/unsubscribe?email=${encodeURIComponent(rawEmail)}`;
		await resend.emails.send({
			from,
			to: rawEmail,
			subject: "Welcome to the convrtr release radar",
			html: mailLayout({
				eyebrow: "CONVRTR // SUBSCRIPTION CONFIRMED",
				title: "You are on the list",
				bodyHtml: `<p>Subscribed as <strong>${escapeHtml(rawEmail)}</strong> via <strong>${escapeHtml(source)}</strong>.</p>
        <p>Channels: <strong>${escapeHtml(channelList)}</strong></p>
        <p>You will receive extension changelogs, new WASM decoder drops, ecosystem releases, events, and product updates. No spam, no tracking pixels beyond Resend delivery basics.</p>
        <p style="font-size:11px;">Unsubscribe anytime: <a href="${escapeHtml(unsubscribeUrl)}">${escapeHtml(unsubscribeUrl)}</a></p>`,
				footerNote:
					"You received this because you subscribed on convrtr.mreshank.com. Unsubscribe via the link above.",
			}),
			text: `You are subscribed (${channelList}) via ${source}.\n\nUnsubscribe: ${unsubscribeUrl}`,
		});

		return res.status(200).json({ ok: true, email: rawEmail, channels });
	} catch (err) {
		console.error("[/api/subscribe] resend error", err);
		return res.status(502).json({ error: "Subscribe failed" });
	}
}
