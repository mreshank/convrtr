/**
 * GET /api/unsubscribe?email=… — one-click unsubscribe.
 * POST /api/unsubscribe — { email } JSON variant for forms.
 *
 * Removes the contact from the Resend Audience (when configured) and
 * confirms by email. GET renders a minimal confirmation page so the link
 * inside welcome/campaign emails works without JavaScript.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
	escapeHtml,
	getAudienceId,
	getMailFrom,
	getResend,
	isValidEmail,
} from "./_lib/mail";

async function doUnsubscribe(email: string): Promise<void> {
	const audienceId = getAudienceId();
	if (!audienceId) return;
	const resend = getResend();
	try {
		// Legacy audience path (RESEND_AUDIENCE_ID): remove by email.
		// New segments model needs a segment id, which we don't have here,
		// so fall back to marking unsubscribed.
		try {
			await resend.contacts.remove({ email, audienceId });
		} catch {
			await resend.contacts.update({ email, audienceId, unsubscribed: true });
		}
	} catch (err) {
		console.warn("[/api/unsubscribe] audience removal skipped", err);
	}
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	const email =
		req.method === "POST"
			? String(req.body?.email ?? "")
					.trim()
					.toLowerCase()
			: String(req.query?.email ?? "")
					.trim()
					.toLowerCase();

	if (!email || !isValidEmail(email)) {
		if (req.method === "GET") {
			res.setHeader("Content-Type", "text/html; charset=utf-8");
			return res
				.status(400)
				.send("<h1>Invalid unsubscribe link</h1><p>Missing email.</p>");
		}
		return res.status(400).json({ error: "Invalid email" });
	}

	if (!process.env.RESEND_API_KEY) {
		if (req.method === "GET") {
			res.setHeader("Content-Type", "text/html; charset=utf-8");
			return res.status(503).send("<h1>Mail service not configured</h1>");
		}
		return res.status(503).json({ error: "Mail service not configured" });
	}

	await doUnsubscribe(email);

	try {
		await getResend().emails.send({
			from: getMailFrom(),
			to: email,
			subject: "Unsubscribed from convrtr",
			text: `You have been unsubscribed (${email}). Resubscribe anytime at https://convrtr.mreshank.com/#extension-waitlist`,
		});
	} catch (err) {
		console.warn("[/api/unsubscribe] confirmation email skipped", err);
	}

	if (req.method === "GET") {
		res.setHeader("Content-Type", "text/html; charset=utf-8");
		return res
			.status(200)
			.send(
				`<!doctype html><html><body style="font-family:monospace;background:#000;color:#fff;padding:32px;">` +
					`<h1>UNSUBSCRIBED</h1><p>${escapeHtml(email)} removed from convrtr mail.</p>` +
					`<a style="color:#fff;" href="https://convrtr.mreshank.com/">Return to convrtr</a></body></html>`,
			);
	}
	return res.status(200).json({ ok: true, email });
}
