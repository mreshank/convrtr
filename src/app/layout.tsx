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

// Only routes with a page.tsx belong here. Groups, collectives and the
// marketing pages are later plans; a header link to an unbuilt route is a
// 404 shipped in the chrome of every page.
const NAV = [
	{ href: "/tools", label: "Tools" },
	{ href: "/blog", label: "Blog" },
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
					credit={`© ${new Date().getFullYear()} convrtr`}
				/>
			</body>
		</html>
	);
}
