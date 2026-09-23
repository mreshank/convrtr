import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	emailsSend: vi.fn(),
	batchSend: vi.fn(),
	contactsCreate: vi.fn(),
	contactsRemove: vi.fn(),
	contactsUpdate: vi.fn(),
}));

vi.mock("resend", () => ({
	Resend: class {
		emails = { send: mocks.emailsSend };
		batch = { send: mocks.batchSend };
		contacts = {
			create: mocks.contactsCreate,
			remove: mocks.contactsRemove,
			update: mocks.contactsUpdate,
		};
	},
}));

import campaignHandler from "./campaign";
import sendHandler from "./send";
import subscribeHandler from "./subscribe";
import unsubscribeHandler from "./unsubscribe";

function makeReq(parts: {
	method?: string;
	body?: unknown;
	headers?: Record<string, string>;
	query?: Record<string, string>;
}): VercelRequest {
	return {
		method: parts.method ?? "POST",
		body: parts.body ?? {},
		headers: parts.headers ?? {},
		query: parts.query ?? {},
	} as unknown as VercelRequest;
}

interface CapturingResponse {
	capturedStatus?: number;
	payload?: unknown;
	status: (code: number) => CapturingResponse;
	json: (body: unknown) => CapturingResponse;
	send: (body: unknown) => CapturingResponse;
	setHeader: (k: string, v: string | string[]) => CapturingResponse;
}

function makeRes(): CapturingResponse {
	const res = {} as CapturingResponse;
	res.status = (code: number) => {
		res.capturedStatus = code;
		return res;
	};
	res.json = (payload: unknown) => {
		res.payload = payload;
		return res;
	};
	res.send = (payload: unknown) => {
		res.payload = payload;
		return res;
	};
	res.setHeader = () => res;
	return res;
}

function asRes(res: CapturingResponse): VercelResponse {
	return res as unknown as VercelResponse;
}

const okEmail = { data: { id: "msg-1" }, error: null };

beforeEach(() => {
	vi.unstubAllEnvs();
	vi.stubEnv("RESEND_API_KEY", "test-key");
	vi.stubEnv("MAIL_FROM", "hello@convrtr.mreshank.com");
	vi.stubEnv("MAIL_TO", "contact@mreshank.com");
	vi.stubEnv("ADMIN_API_SECRET", "admin-secret");
	for (const fn of Object.values(mocks)) {
		fn.mockReset();
	}
	mocks.emailsSend.mockResolvedValue(okEmail);
	mocks.batchSend.mockResolvedValue({ data: [{ id: "b-1" }], error: null });
	mocks.contactsCreate.mockResolvedValue({ data: { id: "c-1" }, error: null });
	mocks.contactsRemove.mockResolvedValue({ data: {}, error: null });
});

describe("/api/send", () => {
	it("rejects non-POST", async () => {
		const res = makeRes();
		await sendHandler(makeReq({ method: "GET" }), asRes(res));
		expect(res.capturedStatus).toBe(405);
	});

	it("fails closed without API key", async () => {
		vi.stubEnv("RESEND_API_KEY", "");
		const res = makeRes();
		await sendHandler(
			makeReq({ body: { type: "contact", message: "hi there" } }),
			asRes(res),
		);
		expect(res.capturedStatus).toBe(503);
	});

	it("validates type, message, email, rating", async () => {
		for (const body of [
			{ type: "nope", message: "hello world" },
			{ type: "contact", message: "x" },
			{ type: "contact", message: "hello world", email: "bad" },
			{ type: "feedback", message: "hello world", rating: 9 },
		]) {
			const res = makeRes();
			await sendHandler(makeReq({ body }), asRes(res));
			expect(res.capturedStatus).toBe(400);
		}
		expect(mocks.emailsSend).not.toHaveBeenCalled();
	});

	it("sends maintainer email plus auto-reply", async () => {
		const res = makeRes();
		await sendHandler(
			makeReq({
				body: {
					type: "support_ticket",
					topicOrCategory: "conversion_error",
					email: "user@example.com",
					message: "AVIF decode failed",
				},
			}),
			asRes(res),
		);
		expect(res.capturedStatus).toBe(200);
		expect(mocks.emailsSend).toHaveBeenCalledTimes(2);
		const maintainer = mocks.emailsSend.mock.calls[0]?.[0];
		expect(maintainer.to).toBe("contact@mreshank.com");
		expect(maintainer.replyTo).toBe("user@example.com");
		const receipt = mocks.emailsSend.mock.calls[1]?.[0];
		expect(receipt.to).toBe("user@example.com");
	});

	it("rate limits abusive IPs", async () => {
		const headers = { "x-forwarded-for": "10.9.9.9" };
		let last = makeRes();
		for (let i = 0; i < 11; i++) {
			last = makeRes();
			await sendHandler(
				makeReq({
					body: { type: "contact", message: `message number ${i}` },
					headers,
				}),
				asRes(last),
			);
		}
		expect(last.capturedStatus).toBe(429);
	});
});

describe("/api/subscribe", () => {
	it("rejects invalid email and filters channels", async () => {
		const bad = makeRes();
		await subscribeHandler(makeReq({ body: { email: "bad" } }), asRes(bad));
		expect(bad.capturedStatus).toBe(400);

		const good = makeRes();
		await subscribeHandler(
			makeReq({
				body: {
					email: "User@Example.com",
					channels: ["extension", "bogus"],
					source: "extension-waitlist",
				},
			}),
			asRes(good),
		);
		expect(good.capturedStatus).toBe(200);
		expect(good.payload).toMatchObject({
			email: "user@example.com",
			channels: ["extension"],
		});
		expect(mocks.emailsSend).toHaveBeenCalledTimes(1);
	});

	it("skips audience sync when unconfigured", async () => {
		vi.stubEnv("RESEND_AUDIENCE_ID", "");
		const res = makeRes();
		await subscribeHandler(
			makeReq({ body: { email: "a@b.co", channels: ["releases"] } }),
			asRes(res),
		);
		expect(res.capturedStatus).toBe(200);
		expect(mocks.contactsCreate).not.toHaveBeenCalled();
	});
});

describe("/api/unsubscribe", () => {
	it("rejects invalid email", async () => {
		const res = makeRes();
		await unsubscribeHandler(makeReq({ body: { email: "bad" } }), asRes(res));
		expect(res.capturedStatus).toBe(400);
	});

	it("confirms via POST and via GET page", async () => {
		vi.stubEnv("RESEND_AUDIENCE_ID", "aud-1");
		const post = makeRes();
		await unsubscribeHandler(
			makeReq({ body: { email: "gone@example.com" } }),
			asRes(post),
		);
		expect(post.capturedStatus).toBe(200);
		expect(mocks.contactsRemove).toHaveBeenCalledWith({
			email: "gone@example.com",
			audienceId: "aud-1",
		});

		const get = makeRes();
		await unsubscribeHandler(
			makeReq({ method: "GET", query: { email: "gone@example.com" } }),
			asRes(get),
		);
		expect(get.capturedStatus).toBe(200);
		expect(String(get.payload)).toContain("UNSUBSCRIBED");
	});
});

describe("/api/campaign", () => {
	const validBody = {
		subject: "convrtr for Chrome is live",
		bodyMarkdown: "Download it today.",
		recipients: ["a@example.com", "bad", "A@example.com"],
	};

	it("requires admin secret (fail-closed)", async () => {
		vi.stubEnv("ADMIN_API_SECRET", "");
		const closed = makeRes();
		await campaignHandler(
			makeReq({
				body: validBody,
				headers: { authorization: "Bearer admin-secret" },
			}),
			asRes(closed),
		);
		expect(closed.capturedStatus).toBe(401);

		vi.stubEnv("ADMIN_API_SECRET", "admin-secret");
		const wrong = makeRes();
		await campaignHandler(
			makeReq({
				body: validBody,
				headers: { authorization: "Bearer wrong" },
			}),
			asRes(wrong),
		);
		expect(wrong.capturedStatus).toBe(401);
	});

	it("validates subject, body, recipients", async () => {
		const auth = { authorization: "Bearer admin-secret" };
		for (const body of [
			{ ...validBody, subject: "hi" },
			{ ...validBody, bodyMarkdown: "x" },
			{ ...validBody, recipients: ["bad", "also-bad"] },
		]) {
			const res = makeRes();
			await campaignHandler(makeReq({ body, headers: auth }), asRes(res));
			expect(res.capturedStatus).toBe(400);
		}
		expect(mocks.batchSend).not.toHaveBeenCalled();
	});

	it("dedupes recipients and batch-sends", async () => {
		const res = makeRes();
		await campaignHandler(
			makeReq({
				body: validBody,
				headers: { authorization: "Bearer admin-secret" },
			}),
			asRes(res),
		);
		expect(res.capturedStatus).toBe(200);
		expect(res.payload).toMatchObject({ ok: true, sent: 1 });
		expect(mocks.batchSend).toHaveBeenCalledTimes(1);
		const batch = mocks.batchSend.mock.calls[0]?.[0];
		expect(batch).toHaveLength(1);
		expect(batch[0].to).toBe("a@example.com");
	});
});
