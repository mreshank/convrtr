"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Props = {
	links: { href: string; label: string }[];
};

/**
 * DESIGN.md's fixed header.
 *
 * `mix-blend-mode: difference` is what lets one header sit over a white
 * page, a photograph and the terminal footer band without ever restating
 * its colour — it inverts whatever is behind it.
 *
 * The overlay nav is real UI, so it behaves like one: the toggle is a
 * button carrying `aria-expanded`, Escape closes the overlay, and focus
 * returns to the toggle when it does. Skipping that would strand a
 * keyboard user inside an overlay they cannot leave.
 */
export function SiteHeader({ links }: Props) {
	const [open, setOpen] = useState(false);
	const wordmarkRef = useRef<HTMLAnchorElement | null>(null);
	const toggleRef = useRef<HTMLButtonElement | null>(null);
	const navRef = useRef<HTMLElement | null>(null);

	// Escape closes the overlay and returns focus to the toggle. Without
	// this a keyboard user who opens the nav is stranded in it.
	useEffect(() => {
		if (!open) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			setOpen(false);
			toggleRef.current?.focus();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [open]);

	// The overlay is opaque and covers the whole viewport, so anything Tab
	// reaches outside this loop — page content behind it, or the browser
	// chrome beyond the last link — is content the user cannot see while
	// the menu is open.
	//
	// The loop is [wordmark, toggle, ...nav links], which is exactly the
	// order the document already puts them in: both the wordmark and the
	// toggle live in the header, and the header is rendered before the nav.
	// Everything the header draws is above the overlay (z-index 100 against
	// its 99), so all of it stays visible and clickable while the menu is
	// open and all of it has to be reachable by keyboard too. So the trap
	// wraps FIRST to LAST — Tab from the last link goes to the wordmark,
	// Shift+Tab from the wordmark goes to the last link — and every step in
	// between is left to native DOM order, which already agrees.
	//
	// This used to hardcode the toggle as the first element and wrap it to
	// the last link, forgetting the wordmark the same component renders
	// below. The wordmark was then visible and mouse-clickable but
	// keyboard-unreachable, and Shift+Tab out of it was not intercepted at
	// all, so it escaped into the content behind the overlay — the exact
	// leak the trap exists to prevent.
	//
	// The loop always holds the wordmark and the toggle, so `links={[]}`
	// keeps a closed two-element cycle rather than turning the trap off.
	// The previous `if (!lastLink) return` made an empty array silently
	// escapable.
	useEffect(() => {
		if (!open) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Tab") return;
			const toggle = toggleRef.current;
			const nav = navRef.current;
			if (!toggle || !nav) return;
			// `anchors`, not `links`: the prop of that name is an array of
			// { href, label }, and this is the rendered DOM.
			const anchors = nav.querySelectorAll<HTMLAnchorElement>("a");
			const loop = [wordmarkRef.current, toggle, ...anchors].filter(
				(element) => element !== null,
			);
			const first = loop[0];
			const last = loop[loop.length - 1];
			// Unreachable: the toggle is always in the loop, so it is never
			// empty. This is here for the indexed-access types, and is not
			// the escape hatch the old `if (!lastLink) return` was.
			if (!first || !last) return;
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [open]);

	// The overlay is opaque and covers the viewport, but without this the
	// page behind it can still be scrolled by wheel or touch — compounding
	// the disorientation of an overlay a keyboard user cannot see past.
	// The prior value is read rather than assumed blank, since something
	// else may set it later, and it is restored on both close and unmount.
	useEffect(() => {
		if (!open) return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [open]);

	// The overlay is a SIBLING of the blended bar, never a child of it.
	// `mix-blend-mode` blends an element and its entire subtree as one group
	// against the page backdrop, and a descendant cannot opt out —
	// `mix-blend-mode: normal` on a child only governs how that child blends
	// with its parent's own content. Nested inside, the overlay's
	// `var(--ground)` would paint as its inverse, and no unit test would
	// notice because happy-dom composites nothing.
	return (
		<>
			<header
				style={{
					position: "fixed",
					top: 0,
					left: 0,
					right: 0,
					zIndex: 100,
					mixBlendMode: "difference",
					color: "#ffffff",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "24px",
				}}
			>
				<Link
					ref={wordmarkRef}
					href="/"
					style={{
						fontSize: "24px",
						fontWeight: 700,
						letterSpacing: "var(--display-tracking)",
					}}
				>
					convrtr
				</Link>

				<button
					ref={toggleRef}
					type="button"
					aria-expanded={open}
					aria-label={open ? "Close menu" : "Open menu"}
					onClick={() => setOpen((wasOpen) => !wasOpen)}
					style={{ background: "transparent", border: "0", padding: "0" }}
				>
					<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
						<path
							d={open ? "M5 5 L19 19 M19 5 L5 19" : "M12 5 V19 M5 12 H19"}
							stroke="currentColor"
							strokeWidth="1"
						/>
					</svg>
				</button>
			</header>

			{open && (
				<nav
					ref={navRef}
					aria-label="Main"
					style={{
						position: "fixed",
						inset: 0,
						zIndex: 99,
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						gap: "24px",
						background: "var(--ground)",
					}}
				>
					{links.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							onClick={() => setOpen(false)}
							style={{
								color: "var(--ink)",
								fontSize: "clamp(32px, 8vw, 96px)",
								fontWeight: 700,
								letterSpacing: "var(--display-tracking)",
								lineHeight: "var(--display-leading)",
							}}
						>
							{link.label}
						</Link>
					))}
				</nav>
			)}
		</>
	);
}
