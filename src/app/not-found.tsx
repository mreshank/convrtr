import Link from "next/link";

/**
 * The 404 page exists because Next's built-in one is not neutral on this
 * canvas — it is the previous design system's canvas, served after this
 * branch removed it.
 *
 * Without this file Next renders its default not-found UI, which ships a
 * `<style>` block *inside* `<body>` setting body to black-on-white with no
 * margin, plus a `prefers-color-scheme: dark` counterpart. Same specificity
 * as `tokens.css`'s `body { background: var(--ground) }` and later in
 * document order, so it wins. Before this branch the app tracked
 * `prefers-color-scheme`, so whichever half of that injected pair applied
 * always agreed with the site; v2 has one black canvas and no light
 * counterpart, so under a light OS preference the error page went white
 * while every token stayed pitched for black. Measured on the real export
 * under `colorScheme: "light"`: body painted 255, 255, 255, the layout's
 * Blog link (`--ink-muted`) sat at 2.92:1 — below AA — and
 * `:focus-visible`'s `outline: 1px solid var(--ink)` drew white on white at
 * 1.00:1, which is no focus indicator at all.
 *
 * `output: "export"` plus `vercel.json`'s `outputDirectory: "out"` means the
 * one file this renders, `out/404.html`, is what the host serves for every
 * unmatched path — so that was every wrong URL on the site, not a corner.
 *
 * `--ground` and `--ink` are stated on this page's own root rather than left
 * to `body`. Supplying this file already removes the injected rule, so the
 * inherited ground would be correct today; the point is that the injected
 * rule is what this page exists to override, and a page that depends on
 * inheriting the right ground is one deletion away from the defect again.
 * `flex-1` is part of that: the ground has to reach the bottom of the
 * viewport, not just the height of the text.
 *
 * This root is a `<div>`, not a `<main>`: layout.tsx already wraps every
 * route's children in its own `<main className="flex-1">`, so a second one
 * here nested inside it doubled the page's main landmark -- the same defect
 * `d25385d` fixed for the tool route's `ToolClient`, just missed here since
 * this file isn't a `page.tsx` and so sits outside what `route-purity.test.ts`
 * walks. `flex flex-1 flex-col` still does the layout work; only the tag
 * changed.
 */
export default function NotFound() {
	return (
		<div
			className="flex flex-1 flex-col"
			style={{ background: "var(--ground)", color: "var(--ink)" }}
		>
			<div className="mx-auto flex w-full max-w-4xl flex-col items-start gap-4 p-8">
				<h1 className="text-[32px] tracking-[-0.02em]">404</h1>
				<p className="text-[14px]" style={{ color: "var(--ink-muted)" }}>
					No converter lives at this address.
				</p>
				<Link
					href="/tools"
					className="mono border px-4 py-2 text-[12px]"
					style={{
						color: "var(--ink)",
						borderColor: "var(--rule)",
						borderRadius: "var(--radius)",
					}}
				>
					ALL CONVERTERS
				</Link>
			</div>
		</div>
	);
}
