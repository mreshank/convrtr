import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { ThemeToggle } from "@/components/instrument/ThemeToggle";
import { ThemeScript } from "@/components/ThemeScript";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
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
			className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
			suppressHydrationWarning
		>
			<head>
				<ThemeScript />
			</head>
			<body className="min-h-full flex flex-col">
				<div className="flex justify-end p-4">
					<ThemeToggle />
				</div>
				{children}
			</body>
		</html>
	);
}
