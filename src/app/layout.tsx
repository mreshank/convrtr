import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import Link from "next/link";
import { ThemeToggle } from "@/components/instrument/ThemeToggle";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { ThemeScript } from "@/components/ThemeScript";
import "./globals.css";

const inter = Inter({
	variable: "--font-sans",
	subsets: ["latin"],
	display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
	variable: "--font-mono",
	subsets: ["latin"],
	weight: ["400", "500"],
	display: "swap",
});

export const metadata: Metadata = {
	title: "convrtr",
	description: "Convert anything in your browser. Nothing is uploaded.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html
			lang="en"
			className={`${inter.variable} ${ibmPlexMono.variable} h-full antialiased`}
			suppressHydrationWarning
		>
			<head>
				<ThemeScript />
			</head>
			<body className="min-h-full flex flex-col">
				<ServiceWorkerRegistration />
				<div className="flex items-center justify-end gap-4 p-4">
					<Link
						href="/blog"
						className="text-[13px] hover:underline"
						style={{ color: "var(--ink-muted)" }}
					>
						Blog
					</Link>
					<ThemeToggle />
				</div>
				{children}
			</body>
		</html>
	);
}
