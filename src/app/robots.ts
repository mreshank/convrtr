import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Static export note: same reason `manifest.ts` states one -- this compiles
// to a Route Handler with no request-time input, and `output: "export"`
// refuses to export one unless it is explicitly marked static.
export const dynamic = "force-static";

// The product runs 100% client-side with no server accounts. Every public route
// a crawler should reach is listed in sitemap.ts. Local conversion history (/history)
// contains private client-side audit logs and is disallowed to conserve crawl budget.
export default function robots(): MetadataRoute.Robots {
	return {
		rules: { userAgent: "*", allow: "/", disallow: ["/history"] },
		sitemap: `${SITE}/sitemap.xml`,
	};
}
