import type { Metadata } from "next";
import { AdminDashboardPage } from "@/design/templates";
import { SITE } from "@/lib/site";

export function generateMetadata(): Metadata {
	const title = "Super Admin Command Center — convrtr";
	const description =
		"Internal telemetry, subscriber management, broadcast alert control, and Chrome extension launch radar for convrtr.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/admin` },
		robots: {
			index: false,
			follow: false,
		},
	};
}

export default function AdminRoute() {
	return <AdminDashboardPage />;
}
