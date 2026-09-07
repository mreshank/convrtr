import Link from "next/link";
import { Hairline } from "@/design/primitives/Hairline";
import { MonoMeta } from "@/design/primitives/MonoMeta";

type LinkItem = { href: string; label: string };

type Props = {
	bio: string;
	socials: LinkItem[];
	contact: LinkItem[];
	credit: string;
};

/**
 * DESIGN.md's terminal band: four columns, a thin top rule, 14px credits.
 *
 * Inverted by redefining the system's own tokens on this root, exactly as
 * ErrorPanel does — and for the reasons ErrorPanel learned the hard way.
 * Overriding colour on each child instead leaves the page's `--ink` behind
 * the band, so the global `:focus-visible { outline: 1px solid var(--ink) }`
 * draws black on black over every link here; and it puts `--rule` out of
 * reach, so any divider renders at full opacity instead of 10%.
 *
 * Redefining the tokens fixes both for every descendant at once, and means
 * nothing inside this file needs to know it is inverted.
 */
export function SiteFooter({ bio, socials, contact, credit }: Props) {
	return (
		<footer
			style={{
				["--ground" as string]: "var(--terminal)",
				["--ink" as string]: "var(--terminal-ink)",
				["--rule" as string]: "var(--terminal-rule)",
				["--ink-muted" as string]: "var(--terminal-ink)",
				background: "var(--ground)",
				color: "var(--ink)",
				padding: "24px",
			}}
		>
			<div
				style={{
					display: "grid",
					gap: "24px",
					gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
				}}
			>
				<div style={{ gridColumn: "span 2" }}>
					<p
						style={{
							fontSize: "32px",
							fontWeight: 700,
							letterSpacing: "var(--tracking-display)",
						}}
					>
						convrtr
					</p>
					<p style={{ maxWidth: "32ch" }}>{bio}</p>
				</div>

				<nav aria-label="Socials">
					<MonoMeta as="div">Socials</MonoMeta>
					{socials.map((item) => (
						<Link key={item.href} href={item.href} style={{ display: "block" }}>
							{item.label}
						</Link>
					))}
				</nav>

				<nav aria-label="Contact">
					<MonoMeta as="div">Contact</MonoMeta>
					{contact.map((item) => (
						<Link key={item.href} href={item.href} style={{ display: "block" }}>
							{item.label}
						</Link>
					))}
				</nav>
			</div>

			<Hairline />

			<p style={{ fontSize: "14px" }}>{credit}</p>
		</footer>
	);
}
