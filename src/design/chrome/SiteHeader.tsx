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
	const toggleRef = useRef<HTMLButtonElement | null>(null);

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
					href="/"
					style={{
						fontSize: "24px",
						fontWeight: 700,
						letterSpacing: "var(--tracking-display)",
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
								letterSpacing: "var(--tracking-display)",
								lineHeight: "var(--leading-display)",
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
