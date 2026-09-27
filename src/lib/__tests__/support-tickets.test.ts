import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildAutoTicketMarkdown,
	clearTickets,
	consumeStagedErrorReport,
	type FailureTelemetry,
	fileAutoTicket,
	getTickets,
	saveUserTicket,
	stageErrorReport,
} from "../support-tickets";

const TELEMETRY: FailureTelemetry = {
	errorCode: "ENGINE_FAILURE",
	errorMessage: "wasm trap",
	toolIds: ["image/png-to-webp"],
	failedStepIndex: 0,
	fileName: "photo.png",
	fileSize: 1024,
	inputExt: "png",
	target: "webp",
};

function mockFetch(ok: boolean) {
	return vi.fn().mockResolvedValue({ ok } as Response);
}

beforeEach(() => {
	window.localStorage.clear();
	window.sessionStorage.clear();
	vi.unstubAllGlobals();
});

describe("support tickets", () => {
	it("files an auto ticket silently and stores it locally", async () => {
		const fetchMock = mockFetch(true);
		vi.stubGlobal("fetch", fetchMock);

		const ticket = fileAutoTicket(TELEMETRY);
		expect(ticket).not.toBeNull();
		expect(ticket?.origin).toBe("auto");
		expect(getTickets()).toHaveLength(1);

		// Email resolves async; flush microtasks.
		await vi.waitFor(() => {
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe("/api/send");
		const body = JSON.parse(init.body as string);
		expect(body.type).toBe("support_ticket");
		expect(body.subject).toContain("[AUTO]");
		expect(body.diagnosticReportMarkdown).toContain("FAILURE CHAIN");
		await vi.waitFor(() => {
			expect(getTickets()[0]?.email).toBe("sent");
		});
	});

	it("never throws when storage and network are unavailable", () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
		expect(() => fileAutoTicket(TELEMETRY)).not.toThrow();
		expect(getTickets()).toHaveLength(1);
	});

	it("throttles repeat admin emails per failure signature", async () => {
		const fetchMock = mockFetch(true);
		vi.stubGlobal("fetch", fetchMock);

		fileAutoTicket(TELEMETRY);
		await vi.waitFor(() => {
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});
		// Same signature within the cooldown: stored, not emailed.
		fileAutoTicket({ ...TELEMETRY, fileName: "other.png" });
		await new Promise((r) => setTimeout(r, 20));
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(getTickets()).toHaveLength(2);
		expect(getTickets()[0]?.email).toBe("throttled");
	});

	it("saves visitor tickets into the same queue", () => {
		saveUserTicket({
			topic: "conversion_error",
			summary: "webp failed",
			userMessage: "It broke on my photo",
			telemetry: { ...TELEMETRY, errorCode: "USER_REPORTED" },
		});
		const tickets = getTickets();
		expect(tickets).toHaveLength(1);
		expect(tickets[0]?.origin).toBe("user");
		expect(tickets[0]?.userMessage).toBe("It broke on my photo");
	});

	it("clears the queue", () => {
		fileAutoTicket(TELEMETRY);
		expect(getTickets()).toHaveLength(1);
		clearTickets();
		expect(getTickets()).toHaveLength(0);
	});

	it("renders pipeline, failed step and input metadata in markdown", () => {
		const ticket = fileAutoTicket({
			...TELEMETRY,
			toolIds: ["audio/wav-to-mp3", "audio/trim-mp3"],
			failedStepIndex: 1,
			lineage: { parentName: "clip.wav", step: 2 },
		});
		expect(ticket).not.toBeNull();
		if (!ticket) throw new Error("expected a ticket");
		const md = buildAutoTicketMarkdown(ticket);
		expect(md).toContain("[audio/trim-mp3 <- FAILED]");
		expect(md).toContain("step 2 chained from `clip.wav`");
		expect(md).toContain("photo.png");
		expect(md).not.toContain("bytes of");
	});

	it("stages and consumes an error report exactly once", () => {
		expect(consumeStagedErrorReport()).toBeNull();
		stageErrorReport({
			toolId: "image/png-to-webp",
			code: "ENGINE_FAILURE",
			message: "wasm trap",
			inputName: "photo.png",
		});
		const staged = consumeStagedErrorReport();
		expect(staged?.toolId).toBe("image/png-to-webp");
		expect(consumeStagedErrorReport()).toBeNull();
	});
});
