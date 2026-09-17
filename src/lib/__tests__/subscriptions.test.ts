import { beforeEach, describe, expect, it } from "vitest";
import {
	deleteSubscriber,
	exportSubscribersCSV,
	exportSubscribersJSON,
	getSubscribers,
	getSubscriptionStats,
	saveSubscribers,
	subscribeUser,
	toggleSubscriberStatus,
} from "../subscriptions";

describe("subscriptions", () => {
	beforeEach(() => {
		saveSubscribers([]);
	});

	it("validates email formats on subscription", () => {
		const invalid = subscribeUser("invalid-email");
		expect(invalid.success).toBe(false);

		const valid = subscribeUser("test@domain.com", ["extension"]);
		expect(valid.success).toBe(true);
		expect(valid.subscriber?.email).toBe("test@domain.com");
		expect(valid.subscriber?.channels).toEqual(["extension"]);
	});

	it("merges channels when subscribing with an existing email", () => {
		subscribeUser("test@domain.com", ["extension"]);
		const res = subscribeUser("test@domain.com", ["ecosystem"]);
		expect(res.success).toBe(true);
		expect(res.subscriber?.channels).toContain("extension");
		expect(res.subscriber?.channels).toContain("ecosystem");
	});

	it("deletes and toggles subscriber status", () => {
		const res = subscribeUser("delete-me@domain.com");
		const id = res.subscriber!.id;

		expect(getSubscribers().some((s) => s.id === id)).toBe(true);
		toggleSubscriberStatus(id);
		expect(getSubscribers().find((s) => s.id === id)?.status).toBe(
			"unsubscribed",
		);

		deleteSubscriber(id);
		expect(getSubscribers().some((s) => s.id === id)).toBe(false);
	});

	it("calculates subscription statistics", () => {
		subscribeUser("user1@domain.com", ["extension"]);
		subscribeUser("user2@domain.com", ["ecosystem"]);
		const stats = getSubscriptionStats();
		expect(stats.totalCount).toBe(2);
		expect(stats.extensionCount).toBe(1);
		expect(stats.ecosystemCount).toBe(1);
		expect(stats.benchmarkWaitlistTotal).toBeGreaterThan(1420);
	});

	it("exports subscribers to CSV and JSON", () => {
		subscribeUser("csv@domain.com", ["extension"]);
		const csv = exportSubscribersCSV();
		expect(csv).toContain("csv@domain.com");
		expect(csv).toContain("extension");

		const json = exportSubscribersJSON();
		expect(json).toContain("csv@domain.com");
	});
});
