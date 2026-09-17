import { describe, expect, it } from "vitest";
import {
	buildMailtoUrl,
	buildTicketMarkdown,
	dispatchFormSubmission,
	flushPendingSubmissions,
	getPendingQueue,
} from "../form-dispatch";

describe("form-dispatch", () => {
	it("builds clean markdown ticket", () => {
		const md = buildTicketMarkdown({
			type: "feedback",
			topicOrCategory: "format",
			rating: 5,
			name: "Test User",
			email: "test@example.com",
			message: "Please add WebP lossless profile engine",
			recentError: "Test conversion failed at frame 120",
			diagnosticReportMarkdown: "### SYSTEM DIAGNOSTIC AUDIT\n- PASS",
		});

		expect(md).toContain("# [CONVRTR] FEEDBACK: FORMAT");
		expect(md).toContain("**Rating**: 5/5");
		expect(md).toContain("**Sender**: Test User");
		expect(md).toContain("**Contact Email**: test@example.com");
		expect(md).toContain("Please add WebP lossless profile engine");
		expect(md).toContain("Test conversion failed at frame 120");
		expect(md).toContain("SYSTEM DIAGNOSTIC AUDIT");
	});

	it("builds valid mailto link", () => {
		const mailto = buildMailtoUrl({
			type: "contact",
			topicOrCategory: "security",
			message: "Sandbox boundary audit notice",
		});

		expect(mailto.startsWith("mailto:contact@mreshank.com?")).toBe(true);
		expect(mailto).toContain(encodeURIComponent("[INQUIRY SECURITY]"));
		expect(mailto).toContain(
			encodeURIComponent("Sandbox boundary audit notice"),
		);
	});

	it("dispatches or queues safely without throwing", async () => {
		const result = await dispatchFormSubmission({
			type: "feedback",
			topicOrCategory: "general",
			message: "Offline test feedback",
		});

		expect(result).toBeDefined();
		expect(["online_transmitted", "offline_queued", "failed"]).toContain(
			result.mode,
		);
		expect(result.mailtoUrl).toBeDefined();
		expect(result.ticketMarkdown).toContain("Offline test feedback");
	});

	it("safely handles getPendingQueue and flushPendingSubmissions in test environment", async () => {
		const queue = getPendingQueue();
		expect(Array.isArray(queue)).toBe(true);

		const flushResult = await flushPendingSubmissions();
		expect(flushResult).toBeDefined();
		expect(typeof flushResult.flushedCount).toBe("number");
		expect(typeof flushResult.failedCount).toBe("number");
	});
});
