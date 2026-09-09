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

// Only routes with a page.tsx belong here. Groups and collectives are being
// built concurrently by other agents and are not linked yet — a header link
// to an unbuilt route is a 404 shipped in the chrome of every page. The
// marketing and legal pages (about, how-it-works, privacy) are built as of
// this task, so they join the primary nav; the formal documents
// (terms, the privacy policy, licences) go in the footer's Legal column
// below instead, per that split's own reasoning.
const NAV = [
	{ href: "/tools", label: "Tools" },
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
					legal={LEGAL}
					credit={`© ${new Date().getFullYear()} convrtr`}
				/>
			</body>
		</html>
	);
}
