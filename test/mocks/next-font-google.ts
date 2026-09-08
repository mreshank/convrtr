/**
 * `next/font/google`'s real package entry (`node_modules/next/font/google/
 * index.js`) is an empty file — Next's build pipeline rewrites the import
 * specifier to a compiled loader at compile time, and only ever ships that
 * empty stub to bundlers it doesn't recognise. Vitest runs on Vite, not on
 * Next's compiler, so any test that imports a module which imports
 * `next/font/google` gets the empty stub: `Inter` and `Geist_Mono` resolve
 * to `undefined`, and calling either throws "Inter is not a function"
 * before the test body ever runs.
 *
 * `layout.tsx` only reads `.variable` off each font's return value to
 * compose the `<html>` class list, so the mock only needs to shape-match
 * that: a callable that echoes the `variable` option back.
 */
type FontOptions = {
	variable?: string;
	subsets?: string[];
	display?: string;
};

type FontLoaderResult = {
	className: string;
	variable: string;
	style: { fontFamily: string };
};

function mockFontLoader(name: string) {
	return (options: FontOptions = {}): FontLoaderResult => ({
		className: `mock-font-${name}`,
		variable: options.variable ?? "",
		style: { fontFamily: name },
	});
}

export const Inter = mockFontLoader("inter");
export const Geist_Mono = mockFontLoader("geist-mono");
