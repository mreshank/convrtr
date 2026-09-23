import { describe, expect, it, vi } from "vitest";
import {
	checkRateLimit,
	escapeHtml,
	isValidEmail,
	mailLayout,
	truncate,
	verifyAdminSecret,
} from "./mail";

describe("mail lib", () => {
	it("validates emails", () => {
		expect(isValidEmail("hello@convrtr.mreshank.com")).toBe(true);
		expect(isValidEmail("bad")).toBe(false);
		expect(isValidEmail("a@b")).toBe(false);
		expect(isValidEmail(`${"a".repeat(250)}@x.com`)).toBe(false);
	});

	it("truncates and escapes", () => {
		expect(truncate("abcdef", 4)).toBe("abcd…");
		expect(truncate("abc", 4)).toBe("abc");
		expect(escapeHtml('<b>"&"</b>')).toBe(
			"&lt;b&gt;&quot;&amp;&quot;&lt;/b&gt;",
		);
	});

	it("renders layout without injecting HTML", () => {
		const html = mailLayout({
			eyebrow: "TEST",
			title: "<script>",
			bodyHtml: "<p>hi</p>",
		});
		expect(html).toContain("&lt;script&gt;");
		// bodyHtml is trusted admin/authored HTML by contract
		expect(html).toContain("<p>hi</p>");
	});

	it("rate limits per key", () => {
		const key = `test-${Date.now()}-${Math.random()}`;
		expect(checkRateLimit(key, 2, 60_000)).toBe(true);
		expect(checkRateLimit(key, 2, 60_000)).toBe(true);
		expect(checkRateLimit(key, 2, 60_000)).toBe(false);
	});

	it("verifies admin secret fail-closed", () => {
		vi.stubEnv("ADMIN_API_SECRET", "");
		expect(verifyAdminSecret({ headers: { authorization: "Bearer x" } })).toBe(
			false,
		);
		vi.stubEnv("ADMIN_API_SECRET", "s3cret");
		expect(
			verifyAdminSecret({ headers: { authorization: "Bearer s3cret" } }),
		).toBe(true);
		expect(
			verifyAdminSecret({ headers: { authorization: "Bearer wrong" } }),
		).toBe(false);
		expect(verifyAdminSecret({ headers: {} })).toBe(false);
		vi.unstubAllEnvs();
	});
});
