import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { SiteFooter, SiteHeader } from "@/design/primitives";
import { DifferenceCursor } from "@/design/primitives/DifferenceCursor";
import "./globals.css";

const inter = Inter({
	variable: "--font-sans",
	subsets: ["latin"],
	display: "swap",
});

const geistMono = Geist_Mono({
	variable: "--font-mono",
	subsets: ["latin"],
	display: "swap",
});

const TAGLINE = "Convert anything in your browser. Nothing is uploaded.";

export const metadata: Metadata = {
	title: "convrtr",
	description: TAGLINE,
};

// Only routes with a page.tsx belong here — a header link to an unbuilt
// route is a 404 shipped in the chrome of every page. Every route this plan
// set out to build now exists, including groups and collectives, so both
// join the primary nav; the formal documents (terms, the privacy policy,
// licences) go in the footer's Legal column below instead, per that split's
// own reasoning.
const NAV = [
	{ href: "/tools", label: "Tools" },
	{ href: "/groups", label: "Groups" },
	{ href: "/collectives", label: "Collectives" },
	{ href: "/blog", label: "Blog" },
	{ href: "/about", label: "About" },
	{ href: "/how-it-works", label: "How it works" },
	{ href: "/privacy", label: "Privacy" },
];

const CTA = { href: "/tools", label: "Start converting" };

// The real repo, and its issue tracker as the practical way to reach the
// maintainer — convrtr has no social accounts or support inbox to link
// instead, and a fabricated one would be a dead end wearing a live label.
const SOCIALS = [
	{ href: "https://github.com/mreshank/convrtr", label: "GitHub" },
];
const CONTACT = [
	{
		href: "https://github.com/mreshank/convrtr/issues",
		label: "Issues",
	},
];

// The registry-derived hubs, echoed in the footer alongside the header nav
// so they're reachable from every page even when a visitor lands scrolled
// past the bar.
const EXPLORE = [
	{ href: "/groups", label: "Groups" },
	{ href: "/collectives", label: "Collectives" },
];

// The formal documents, grouped separately from the header's visitor-facing
// /privacy: spec §5.4 frames /privacy as the argument a visitor wants and
// /legal/privacy-policy as the conventional document a compliance reviewer
// expects to find at a conventional URL — and a footer's Legal column is
// exactly that conventional location.
const LEGAL = [
	{ href: "/legal/terms", label: "Terms" },
	{ href: "/legal/privacy-policy", label: "Privacy Policy" },
	{ href: "/legal/licences", label: "Licences" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html
			lang="en"
			className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
		>
			<body className="min-h-full flex flex-col">
				<ServiceWorkerRegistration />
				<DifferenceCursor />
				<SiteHeader links={NAV} cta={CTA} />
				<main className="flex-1">{children}</main>
				<SiteFooter
					bio={TAGLINE}
					socials={SOCIALS}
					contact={CONTACT}
					explore={EXPLORE}
					legal={LEGAL}
					credit={`© ${new Date().getFullYear()} convrtr`}
				/>
			</body>
		</html>
	);
}
