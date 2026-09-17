import { beforeEach, describe, expect, it } from "vitest";
import {
	clearAdminPasskey,
	hasLocalAdminOverride,
	isSuperAdminEmail,
	isSuperAdminUser,
	SUPER_ADMIN_EMAILS,
	verifyAdminPasskey,
} from "../admin-auth";

describe("admin-auth", () => {
	beforeEach(() => {
		clearAdminPasskey();
	});

	it("identifies exactly the two whitelisted super admin emails", () => {
		expect(SUPER_ADMIN_EMAILS).toEqual([
			"mreshanktyagi@gmail.com",
			"admin@mreshank.com",
		]);

		expect(isSuperAdminEmail("mreshanktyagi@gmail.com")).toBe(true);
		expect(isSuperAdminEmail("admin@mreshank.com")).toBe(true);
		expect(isSuperAdminEmail("MRESHANKTYAGI@GMAIL.COM")).toBe(true);
		expect(isSuperAdminEmail("  admin@mreshank.com  ")).toBe(true);

		// Any other email must be rejected
		expect(isSuperAdminEmail("other@gmail.com")).toBe(false);
		expect(isSuperAdminEmail("hacker@malicious.io")).toBe(false);
		expect(isSuperAdminEmail("admin@other.com")).toBe(false);
		expect(isSuperAdminEmail(null)).toBe(false);
		expect(isSuperAdminEmail(undefined)).toBe(false);
		expect(isSuperAdminEmail("")).toBe(false);
	});

	it("verifies super admin status from a Clerk user object", () => {
		expect(
			isSuperAdminUser({
				primaryEmailAddress: { emailAddress: "mreshanktyagi@gmail.com" },
			}),
		).toBe(true);

		expect(
			isSuperAdminUser({
				primaryEmailAddress: { emailAddress: "admin@mreshank.com" },
			}),
		).toBe(true);

		expect(
			isSuperAdminUser({
				primaryEmailAddress: { emailAddress: "unauthorized@user.com" },
				emailAddresses: [{ emailAddress: "admin@mreshank.com" }],
			}),
		).toBe(true);

		expect(
			isSuperAdminUser({
				primaryEmailAddress: { emailAddress: "regular@user.com" },
				emailAddresses: [{ emailAddress: "regular@user.com" }],
			}),
		).toBe(false);

		expect(isSuperAdminUser(null)).toBe(false);
	});

	it("handles local emergency passkey override", () => {
		expect(hasLocalAdminOverride()).toBe(false);

		expect(verifyAdminPasskey("wrong-key")).toBe(false);
		expect(hasLocalAdminOverride()).toBe(false);

		expect(verifyAdminPasskey("convrtr-master-admin-key-2026")).toBe(true);
		expect(hasLocalAdminOverride()).toBe(true);

		clearAdminPasskey();
		expect(hasLocalAdminOverride()).toBe(false);
	});
});
