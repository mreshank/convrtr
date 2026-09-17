import { beforeEach, describe, expect, it } from "vitest";
import {
	createBroadcast,
	deleteBroadcast,
	dismissBroadcast,
	getActiveBroadcastsForPath,
	getBroadcasts,
	saveBroadcasts,
	toggleBroadcastActive,
	trackBroadcastClick,
	trackBroadcastImpression,
} from "../broadcasts";

describe("broadcasts", () => {
	beforeEach(() => {
		saveBroadcasts([]);
	});

	it("creates and manages broadcasts", () => {
		const bc = createBroadcast({
			type: "banner",
			title: "TEST BANNER",
			content: "Test message",
			level: "accent",
			target: "all",
			active: true,
			dismissible: true,
		});

		expect(bc.id).toBeDefined();
		expect(bc.title).toBe("TEST BANNER");
		expect(getBroadcasts().some((b) => b.id === bc.id)).toBe(true);

		toggleBroadcastActive(bc.id);
		expect(getBroadcasts().find((b) => b.id === bc.id)?.active).toBe(false);

		toggleBroadcastActive(bc.id);
		expect(getBroadcasts().find((b) => b.id === bc.id)?.active).toBe(true);

		deleteBroadcast(bc.id);
		expect(getBroadcasts().some((b) => b.id === bc.id)).toBe(false);
	});

	it("tracks impressions and clicks", () => {
		const bc = createBroadcast({
			type: "toast",
			title: "METRIC TEST",
			content: "Track me",
			level: "info",
			target: "all",
			active: true,
			dismissible: true,
		});

		trackBroadcastImpression(bc.id);
		trackBroadcastImpression(bc.id);
		trackBroadcastClick(bc.id);

		const updated = getBroadcasts().find((b) => b.id === bc.id);
		expect(updated?.impressions).toBe(2);
		expect(updated?.clicks).toBe(1);
	});

	it("filters active broadcasts by path and handles dismissals", () => {
		const homeOnly = createBroadcast({
			type: "banner",
			title: "HOME ONLY",
			content: "Only on home",
			level: "accent",
			target: "home",
			active: true,
			dismissible: true,
		});

		const convertOnly = createBroadcast({
			type: "banner",
			title: "CONVERT ONLY",
			content: "Only on convert",
			level: "warning",
			target: "convert",
			active: true,
			dismissible: true,
		});

		expect(
			getActiveBroadcastsForPath("/").some((b) => b.id === homeOnly.id),
		).toBe(true);
		expect(
			getActiveBroadcastsForPath("/").some((b) => b.id === convertOnly.id),
		).toBe(false);

		expect(
			getActiveBroadcastsForPath("/convert").some(
				(b) => b.id === convertOnly.id,
			),
		).toBe(true);

		// Dismiss
		dismissBroadcast(homeOnly.id);
		expect(
			getActiveBroadcastsForPath("/").some((b) => b.id === homeOnly.id),
		).toBe(false);
	});
});
