import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import Link from "next/link";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
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

export const metadata: Metadata = {
	title: "convrtr",
	description: "Convert anything in your browser. Nothing is uploaded.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html
			lang="en"
			className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
		>
			<body className="min-h-full flex flex-col">
				<ServiceWorkerRegistration />
				<DifferenceCursor />
				<div className="flex items-center justify-end gap-4 p-4">
					<Link
						href="/blog"
						className="text-[13px] hover:underline"
						style={{ color: "var(--ink-muted)" }}
					>
						Blog
					</Link>
				</div>
				{children}
			</body>
		</html>
	);
}
