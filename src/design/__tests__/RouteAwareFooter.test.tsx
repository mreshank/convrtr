import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	isConverterRoute,
	RouteAwareFooter,
} from "@/design/chrome/RouteAwareFooter";

/**
 * `texture-placement.test.ts` proves no converter *route file* imports
 * `@/design/texture`, but it is a source-level import sweep -- it cannot
 * see through the root layout's own `SiteFooter`, which renders a
 * `ShaderSurface` unconditionally on every route the layout wraps,
 * converter routes included. That gap was real: the built
 * `/image/heic-to-jpg` output rendered a `footer-branch-network` canvas
 * before `RouteAwareFooter` existed. This file is the guard for the fix,
 * not just the fix.
 */
const CONVERTER_PATHS = [
	"/image/heic-to-jpg",
	"/video/mkv-to-mp4",
	"/audio/wav-to-mp3",
	"/document/jpg-to-pdf",
];

const NON_CONVERTER_PATHS = [
	"/",
	"/tools",
	"/image",
	"/video",
	"/blog",
	"/blog/how-mlw-encryption-works",
	"/groups",
	"/groups/format/avif",
	"/groups/task/compress",
	"/collectives",
	"/collectives/podcast-kit",
	"/about",
	"/how-it-works",
	"/privacy",
	"/legal/terms",
	"/legal/privacy-policy",
	"/legal/licences",
];

describe("isConverterRoute", () => {
	it.each(CONVERTER_PATHS)("%s is a converter route", (path) => {
		expect(isConverterRoute(path)).toBe(true);
	});

	it.each(NON_CONVERTER_PATHS)("%s is not a converter route", (path) => {
		expect(isConverterRoute(path)).toBe(false);
	});

	// `usePathname()` reads a React context that has no provider outside a
	// real app-router tree -- `layout.test.tsx` renders `RootLayout`
	// directly and hits exactly this -- and returns `null` there at
	// runtime regardless of its declared `string` type. Falling back to
	// "not a converter route" keeps the textured footer the default rather
	// than throwing.
	it("treats a null pathname as not a converter route", () => {
		expect(isConverterRoute(null)).toBe(false);
	});

	it("treats an undefined pathname as not a converter route", () => {
		expect(isConverterRoute(undefined)).toBe(false);
	});
});

vi.mock("next/navigation", () => ({
	usePathname: vi.fn(),
}));

const PROPS = {
	bio: "Every conversion runs in your browser.",
	socials: [{ href: "https://example.com", label: "GitHub" }],
	contact: [{ href: "mailto:a@b.c", label: "Email" }],
	credit: "2026",
};

describe("RouteAwareFooter", () => {
	it("renders no canvas on a converter route", async () => {
		const { usePathname } = await import("next/navigation");
		vi.mocked(usePathname).mockReturnValue("/image/heic-to-jpg");
		const { container } = render(<RouteAwareFooter {...PROPS} />);
		expect(container.querySelector("canvas")).toBeNull();
	});

	it("still renders the shader canvas on an ordinary route", async () => {
		const { usePathname } = await import("next/navigation");
		vi.mocked(usePathname).mockReturnValue("/tools");
		const { container } = render(<RouteAwareFooter {...PROPS} />);
		expect(container.querySelector("canvas")).not.toBeNull();
	});
});
