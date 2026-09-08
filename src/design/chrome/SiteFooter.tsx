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
 * v2's pale band: four columns, a thin top rule, 14px credits. The site's
 * canvas is black; this footer is the rare inversion, so it alone sits as
 * a pale ground carrying dark ink rather than the reverse.
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
				["--ground" as string]: "var(--surface-alt)",
				["--ink" as string]: "var(--ink-inverse)",
				// `--rule-subtle` is named for its role on the black canvas,
				// where near-black-on-black genuinely is subtle. Here, inside
				// the pale band, the same near-black value sits on
				// `--surface-alt` and reads as a crisp, strong hairline
				// instead — the opposite of "subtle". That inversion of
				// meaning is intended: v2's palette is closed and holds no
				// mid-tone to reach for instead, so a hard rule in this rare
				// pale inversion is the right failure direction.
				["--rule" as string]: "var(--rule-subtle)",
				["--ink-muted" as string]: "var(--ink-inverse)",
				background: "var(--ground)",
				color: "var(--ink)",
				padding: "var(--gap-md)",
			}}
		>
			<div
				style={{
					display: "grid",
					gap: "var(--gap-md)",
					gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
				}}
			>
				<div style={{ gridColumn: "span 2" }}>
					{/*
					 * The footer half of the header's lockup, at the larger
					 * size the band's own column allows.
					 *
					 * Weight 700 for the reason the header's wordmark is 700:
					 * v2's display and headline faces are weight 400, so bold
					 * is not a size cue here but the bold clause of v2's
					 * bold/gray headline pattern, and it is what separates the
					 * mark from the body copy directly beneath it.
					 *
					 * The tracking is scaled, and it has to be.
					 * `--display-tracking` is a PX value — v2 specifies -2.7px
					 * against its own 68px display size
					 * (`DESIGN.v2.md:16-21`), which is -0.0397em. Letter
					 * spacing in px does not scale with the font, so applying
					 * it unchanged at 32px gives -0.0844em: 2.13x tighter than
					 * v2 asks for. Measured on the real export, the word
					 * rendered 96.53px that way against 115.42px untracked —
					 * a 16.4% crush with the letters nearly touching. The
					 * 32/68 factor restores v2's ratio (-1.27px at this size,
					 * 106.53px rendered). The header's wordmark has no such
					 * problem because it takes `--label-tracking` at
					 * `--label-size`, the size that token was specified
					 * against.
					 */}
					<p
						style={{
							fontSize: "32px",
							fontWeight: 700,
							letterSpacing: "calc(var(--display-tracking) * 32 / 68)",
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
